import type { Message, Guild, TextChannel, User } from "discord.js";
import type { Logger } from "pino";

import { EventsRepo } from "../db/eventsRepo";
import { MessagesRepo } from "../db/messagesRepo";
import { StaffRepo } from "../db/staffRepo";
import { TicketsRepo } from "../db/ticketsRepo";
import type { Ticket, TicketAssignmentCandidate, TicketAttachment } from "../types/tickets";
import { TICKET_EVENT_TYPES } from "../utils/constants";
import { UserFacingError } from "../utils/errors";
import { DiscordService } from "./discordService";

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  return "code" in error && error.code === "23505";
}

function mapMessageAttachments(message: Message): TicketAttachment[] {
  return [...message.attachments.values()].map((attachment) => ({
    id: attachment.id,
    name: attachment.name,
    url: attachment.url,
    proxy_url: attachment.proxyURL,
    content_type: attachment.contentType,
    size: attachment.size,
  }));
}

export class TicketService {
  constructor(
    private readonly ticketsRepo: TicketsRepo,
    private readonly staffRepo: StaffRepo,
    private readonly messagesRepo: MessagesRepo,
    private readonly eventsRepo: EventsRepo,
    private readonly discordService: DiscordService,
    private readonly logger: Logger,
  ) {}

  async createTicketFromSubmission(input: {
    guild: Guild;
    creatorUser: User;
    category?: string | null;
    title: string;
    description: string;
  }): Promise<{ ticket: Ticket; channel: TextChannel }> {
    const existingTicket = await this.ticketsRepo.findActiveByCreator(
      input.guild.id,
      input.creatorUser.id,
    );

    if (existingTicket) {
      const existingLocation = existingTicket.channel_id
        ? `You already have an active ticket in <#${existingTicket.channel_id}>.`
        : `You already have an active ticket (${existingTicket.ticket_id}).`;

      throw new UserFacingError(existingLocation);
    }

    const assignee = await this.pickLeastLoadedStaff(input.guild.id);

    let ticket: Ticket;

    try {
      ticket = await this.ticketsRepo.createTicket({
        guildId: input.guild.id,
        creatorUserId: input.creatorUser.id,
        assignedStaffUserId: assignee?.staff_user_id ?? null,
        category: input.category ?? null,
        title: input.title,
        description: input.description,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new UserFacingError("You already have an active ticket.");
      }

      throw error;
    }

    let channel: TextChannel | null = null;

    try {
      channel = await this.discordService.createTicketChannel({
        guild: input.guild,
        creatorUserId: input.creatorUser.id,
        creatorUsername: input.creatorUser.username,
        ticketReference: ticket.ticket_id,
      });

      ticket = await this.ticketsRepo.updateChannelId(ticket.id, channel.id);
    } catch (error) {
      if (channel) {
        await channel.delete("Rolling back failed ticket creation").catch(() => undefined);
      }

      await this.ticketsRepo.deleteTicket(ticket.id).catch(() => undefined);
      throw error;
    }

    try {
      await this.discordService.sendTicketIntro(channel, ticket);
      await this.discordService.sendAssignmentNotice(channel, ticket.assigned_staff_user_id);
    } catch (error) {
      this.logger.error(
        { err: error, ticketId: ticket.id, channelId: channel.id },
        "Failed to send ticket intro messages",
      );
    }

    await this.safeLogEvent({
      ticketId: ticket.id,
      eventType: TICKET_EVENT_TYPES.created,
      actorUserId: input.creatorUser.id,
      metadata: {
        channel_id: channel.id,
        category: ticket.category,
      },
    });

    if (assignee) {
      await this.staffRepo.touchLastAssignedAt(input.guild.id, assignee.staff_user_id);
      await this.safeLogEvent({
        ticketId: ticket.id,
        eventType: TICKET_EVENT_TYPES.assigned,
        actorUserId: null,
        metadata: {
          assigned_staff_user_id: assignee.staff_user_id,
          active_ticket_count: assignee.active_ticket_count,
        },
      });
    }

    return { ticket, channel };
  }

  async getTicketByChannelIdOrThrow(channelId: string): Promise<Ticket> {
    const ticket = await this.ticketsRepo.getByChannelId(channelId);

    if (!ticket) {
      throw new UserFacingError("This channel is not linked to a ticket.");
    }

    return ticket;
  }

  async claimTicket(input: {
    ticket: Ticket;
    guildId: string;
    actorUserId: string;
  }): Promise<Ticket> {
    if (input.ticket.status === "closed") {
      throw new UserFacingError("This ticket is already closed.");
    }

    if (
      input.ticket.assigned_staff_user_id &&
      input.ticket.assigned_staff_user_id !== input.actorUserId
    ) {
      throw new UserFacingError(
        `This ticket is assigned to <@${input.ticket.assigned_staff_user_id}>.`,
      );
    }

    if (
      input.ticket.status === "claimed" &&
      input.ticket.assigned_staff_user_id === input.actorUserId
    ) {
      return input.ticket;
    }

    const claimedTicket = await this.ticketsRepo.markClaimed(input.ticket.id, input.actorUserId);
    await this.staffRepo.touchLastAssignedAt(input.guildId, input.actorUserId).catch(() => undefined);

    await this.safeLogEvent({
      ticketId: claimedTicket.id,
      eventType: TICKET_EVENT_TYPES.claimed,
      actorUserId: input.actorUserId,
    });

    return claimedTicket;
  }

  async closeTicket(input: {
    guild: Guild;
    ticket: Ticket;
    actorUserId: string;
    reason: string | null;
  }): Promise<{ ticket: Ticket; archived: boolean }> {
    if (input.ticket.status === "closed") {
      throw new UserFacingError("This ticket is already closed.");
    }

    const closedTicket = await this.ticketsRepo.closeTicket(input.ticket.id, input.reason);

    await this.safeLogEvent({
      ticketId: closedTicket.id,
      eventType: TICKET_EVENT_TYPES.closed,
      actorUserId: input.actorUserId,
      metadata: {
        reason: input.reason,
      },
    });

    if (!closedTicket.channel_id) {
      return { ticket: closedTicket, archived: false };
    }

    try {
      const channel = await this.discordService.fetchTicketChannel(input.guild, closedTicket.channel_id);

      if (!channel) {
        return { ticket: closedTicket, archived: false };
      }

      await this.discordService.sendTicketClosedNotice({
        channel,
        ticket: closedTicket,
        closedByUserId: input.actorUserId,
        reason: input.reason,
      });
      await this.discordService.archiveClosedTicketChannel(channel, closedTicket);

      return { ticket: closedTicket, archived: true };
    } catch (error) {
      this.logger.error(
        { err: error, ticketId: closedTicket.id, channelId: closedTicket.channel_id },
        "Failed to archive closed ticket channel",
      );
      return { ticket: closedTicket, archived: false };
    }
  }

  async syncMessage(message: Message): Promise<void> {
    if (!message.inGuild() || message.system) {
      return;
    }

    const ticket = await this.ticketsRepo.getByChannelId(message.channelId);

    if (!ticket) {
      return;
    }

    await this.messagesRepo.saveDiscordMessage({
      ticketId: ticket.id,
      discordMessageId: message.id,
      authorUserId: message.author.id,
      content: message.content,
      attachments: mapMessageAttachments(message),
      createdAt: message.createdAt.toISOString(),
    });
  }

  private async pickLeastLoadedStaff(guildId: string): Promise<TicketAssignmentCandidate | null> {
    const staffMembers = await this.staffRepo.listActiveByGuild(guildId);

    if (staffMembers.length === 0) {
      return null;
    }

    const counts = await this.ticketsRepo.countActiveByAssignedStaff(
      guildId,
      staffMembers.map((staffMember) => staffMember.staff_user_id),
    );

    const rankedCandidates: TicketAssignmentCandidate[] = staffMembers.map((staffMember) => ({
      ...staffMember,
      active_ticket_count: counts.get(staffMember.staff_user_id) ?? 0,
    }));

    rankedCandidates.sort((left, right) => {
      if (left.active_ticket_count !== right.active_ticket_count) {
        return left.active_ticket_count - right.active_ticket_count;
      }

      const leftAssignedAt = left.last_assigned_at ? Date.parse(left.last_assigned_at) : 0;
      const rightAssignedAt = right.last_assigned_at ? Date.parse(right.last_assigned_at) : 0;

      if (leftAssignedAt !== rightAssignedAt) {
        return leftAssignedAt - rightAssignedAt;
      }

      return left.staff_user_id.localeCompare(right.staff_user_id);
    });

    return rankedCandidates[0] ?? null;
  }

  private async safeLogEvent(input: {
    ticketId: number;
    eventType: string;
    actorUserId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.eventsRepo.logEvent(input);
    } catch (error) {
      this.logger.error(
        { err: error, ticketId: input.ticketId, eventType: input.eventType },
        "Failed to persist ticket event",
      );
    }
  }
}
