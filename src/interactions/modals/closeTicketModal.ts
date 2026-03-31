import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ModalSubmitInteraction,
} from "discord.js";

import { env } from "../../config/env";
import type { TicketService } from "../../services/ticketService";
import { CLOSE_TICKET_MODAL_FIELDS, CUSTOM_IDS } from "../../utils/constants";
import { UserFacingError } from "../../utils/errors";
import { hasStaffRole } from "../../utils/permissions";

export function buildCloseTicketModal(): ModalBuilder {
  const reasonInput = new TextInputBuilder()
    .setCustomId(CLOSE_TICKET_MODAL_FIELDS.reason)
    .setLabel("Close reason")
    .setPlaceholder("Optional reason for closing the ticket")
    .setRequired(false)
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000);

  return new ModalBuilder()
    .setCustomId(CUSTOM_IDS.closeTicketModal)
    .setTitle("Close Ticket")
    .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput));
}

export async function handleCloseTicketModalSubmission(
  interaction: ModalSubmitInteraction,
  ticketService: TicketService,
): Promise<void> {
  if (!interaction.guild) {
    throw new UserFacingError("Tickets can only be managed inside a server.");
  }

  await interaction.deferReply({ ephemeral: true });

  const member = await interaction.guild.members.fetch(interaction.user.id);

  if (!hasStaffRole(member, env.STAFF_ROLE_ID)) {
    throw new UserFacingError("Only staff can close tickets.");
  }

  if (!interaction.channelId) {
    throw new UserFacingError("This close action was not triggered inside a ticket channel.");
  }

  const reason = interaction.fields.getTextInputValue(CLOSE_TICKET_MODAL_FIELDS.reason).trim();
  const ticket = await ticketService.getTicketByChannelIdOrThrow(interaction.channelId);
  const result = await ticketService.closeTicket({
    guild: interaction.guild,
    ticket,
    actorUserId: interaction.user.id,
    reason: reason || null,
  });

  const archiveText = result.archived
    ? " The channel was archived."
    : " The database was updated, but the channel could not be archived automatically.";

  await interaction.editReply({
    content: `${result.ticket.ticket_id} closed.${archiveText}`,
  });
}
