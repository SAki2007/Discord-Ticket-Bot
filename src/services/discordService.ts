import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  type Guild,
  type TextChannel,
} from "discord.js";
import type { Logger } from "pino";

import { env } from "../config/env";
import { CUSTOM_IDS, SUPPORT_PANEL_TITLE } from "../utils/constants";
import { buildTicketPermissionOverwrites } from "../utils/permissions";
import type { Ticket } from "../types/tickets";

function sanitizeChannelSegment(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return cleaned.length > 0 ? cleaned : "requester";
}

function buildTicketChannelName(username: string, ticketReference: string): string {
  const suffix = ticketReference.replace(/^ticket-/, "");
  const usernamePart = sanitizeChannelSegment(username).slice(0, 40);
  return `ticket-${usernamePart}-${suffix}`.slice(0, 100);
}

function buildClosedTicketChannelName(ticketReference: string): string {
  const suffix = ticketReference.replace(/^ticket-/, "");
  return `closed-${suffix}`.slice(0, 100);
}

function buildSupportPanelComponents(): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.createTicketButton)
        .setLabel("Create Ticket")
        .setStyle(ButtonStyle.Primary),
    ),
  ];
}

function buildTicketControlComponents(): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.claimTicketButton)
        .setLabel("Claim")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(CUSTOM_IDS.closeTicketButton)
        .setLabel("Close")
        .setStyle(ButtonStyle.Danger),
    ),
  ];
}

export class DiscordService {
  constructor(private readonly logger: Logger) {}

  async ensureSupportPanel(guild: Guild): Promise<void> {
    if (!env.SUPPORT_CHANNEL_ID) {
      return;
    }

    const fetchedChannel = await guild.channels.fetch(env.SUPPORT_CHANNEL_ID);

    if (!fetchedChannel || fetchedChannel.type !== ChannelType.GuildText) {
      this.logger.warn(
        { guildId: guild.id, supportChannelId: env.SUPPORT_CHANNEL_ID },
        "Support channel is not a guild text channel; skipping panel setup",
      );
      return;
    }

    const recentMessages = await fetchedChannel.messages.fetch({ limit: 25 });
    const hasPanel = recentMessages.some((message) =>
      message.author.id === guild.client.user?.id &&
      message.embeds.some((embed) => embed.title === SUPPORT_PANEL_TITLE),
    );

    if (hasPanel) {
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(SUPPORT_PANEL_TITLE)
      .setDescription(
        "Press the button below to open a private support ticket. A staff member will be assigned automatically.",
      )
      .setColor(0x5865f2);

    await fetchedChannel.send({
      embeds: [embed],
      components: buildSupportPanelComponents(),
    });
  }

  async createTicketChannel(input: {
    guild: Guild;
    creatorUserId: string;
    creatorUsername: string;
    ticketReference: string;
  }): Promise<TextChannel> {
    const botUserId = input.guild.client.user?.id;

    if (!botUserId) {
      throw new Error("Discord client user is unavailable during ticket channel creation.");
    }

    const createdChannel = await input.guild.channels.create({
      name: buildTicketChannelName(input.creatorUsername, input.ticketReference),
      type: ChannelType.GuildText,
      parent: env.TICKET_CATEGORY_ID,
      permissionOverwrites: buildTicketPermissionOverwrites({
        guild: input.guild,
        creatorUserId: input.creatorUserId,
        staffRoleId: env.STAFF_ROLE_ID,
        botUserId,
      }),
      topic: `Ticket reference: ${input.ticketReference}`,
    });

    if (createdChannel.type !== ChannelType.GuildText) {
      throw new Error("Ticket channel was created with an unexpected channel type.");
    }

    return createdChannel;
  }

  async sendTicketIntro(channel: TextChannel, ticket: Ticket): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle(`Ticket ${ticket.ticket_id}`)
      .setDescription(ticket.description)
      .setColor(0x2b8a3e)
      .addFields(
        { name: "Creator", value: `<@${ticket.creator_user_id}>`, inline: true },
        { name: "Status", value: ticket.status, inline: true },
        {
          name: "Assigned Staff",
          value: ticket.assigned_staff_user_id ? `<@${ticket.assigned_staff_user_id}>` : "Unassigned",
          inline: true,
        },
        { name: "Category", value: ticket.category ?? "General", inline: true },
        { name: "Title", value: ticket.title, inline: false },
      )
      .setFooter({ text: ticket.ticket_id });

    await channel.send({
      content: `<@${ticket.creator_user_id}>`,
      embeds: [embed],
      components: buildTicketControlComponents(),
    });
  }

  async sendAssignmentNotice(channel: TextChannel, assignedStaffUserId: string | null): Promise<void> {
    const content = assignedStaffUserId
      ? `<@${assignedStaffUserId}> this ticket has been assigned to you.`
      : "No active staff members were available for automatic assignment.";

    await channel.send({ content });
  }

  async fetchTicketChannel(guild: Guild, channelId: string): Promise<TextChannel | null> {
    const fetchedChannel = await guild.channels.fetch(channelId);

    if (!fetchedChannel || fetchedChannel.type !== ChannelType.GuildText) {
      return null;
    }

    return fetchedChannel;
  }

  async sendTicketClosedNotice(input: {
    channel: TextChannel;
    ticket: Ticket;
    closedByUserId: string;
    reason: string | null;
  }): Promise<void> {
    const embed = new EmbedBuilder()
      .setTitle(`Closed ${input.ticket.ticket_id}`)
      .setDescription(input.reason ?? "No close reason was provided.")
      .addFields(
        { name: "Closed By", value: `<@${input.closedByUserId}>`, inline: true },
        { name: "Status", value: input.ticket.status, inline: true },
      )
      .setColor(0xc92a2a);

    await input.channel.send({ embeds: [embed] });
  }

  async archiveClosedTicketChannel(channel: TextChannel, ticket: Ticket): Promise<void> {
    await channel.permissionOverwrites.edit(ticket.creator_user_id, {
      ViewChannel: false,
      SendMessages: false,
      ReadMessageHistory: false,
    });

    await channel.permissionOverwrites.edit(env.STAFF_ROLE_ID, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      ManageChannels: true,
      ManageMessages: true,
      AttachFiles: true,
      EmbedLinks: true,
    });

    if (env.TICKET_ARCHIVE_CATEGORY_ID) {
      await channel.setParent(env.TICKET_ARCHIVE_CATEGORY_ID, {
        lockPermissions: false,
      });
    }

    await channel.setName(buildClosedTicketChannelName(ticket.ticket_id));

    await channel.permissionOverwrites.edit(channel.guild.members.me!.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      ManageChannels: true,
      ManageMessages: true,
      AttachFiles: true,
      EmbedLinks: true,
      ManageRoles: true,
      UseApplicationCommands: true,
      MentionEveryone: false,
      CreatePublicThreads: false,
      CreatePrivateThreads: false,
      SendMessagesInThreads: true,
      UseExternalEmojis: true,
      UseExternalStickers: true,
    });

    await channel.permissionOverwrites.edit(channel.guild.roles.everyone.id, {
      ViewChannel: false,
    });
  }
}
