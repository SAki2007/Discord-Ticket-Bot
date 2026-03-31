import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ModalSubmitInteraction,
} from "discord.js";

import type { TicketService } from "../../services/ticketService";
import { CREATE_TICKET_MODAL_FIELDS, CUSTOM_IDS } from "../../utils/constants";

export function buildTicketCreateModal(): ModalBuilder {
  const categoryInput = new TextInputBuilder()
    .setCustomId(CREATE_TICKET_MODAL_FIELDS.category)
    .setLabel("Category")
    .setPlaceholder("Billing, technical issue, moderation, ...")
    .setRequired(false)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100);

  const titleInput = new TextInputBuilder()
    .setCustomId(CREATE_TICKET_MODAL_FIELDS.title)
    .setLabel("Title")
    .setPlaceholder("Short summary of the issue")
    .setRequired(true)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(100);

  const descriptionInput = new TextInputBuilder()
    .setCustomId(CREATE_TICKET_MODAL_FIELDS.description)
    .setLabel("Description")
    .setPlaceholder("Describe the issue in enough detail for staff to help.")
    .setRequired(true)
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(1000);

  return new ModalBuilder()
    .setCustomId(CUSTOM_IDS.createTicketModal)
    .setTitle("Create Ticket")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(categoryInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput),
    );
}

export async function handleTicketModalSubmission(
  interaction: ModalSubmitInteraction,
  ticketService: TicketService,
): Promise<void> {
  const category = interaction.fields.getTextInputValue(CREATE_TICKET_MODAL_FIELDS.category).trim();
  const title = interaction.fields.getTextInputValue(CREATE_TICKET_MODAL_FIELDS.title).trim();
  const description = interaction.fields
    .getTextInputValue(CREATE_TICKET_MODAL_FIELDS.description)
    .trim();

  await interaction.deferReply({ ephemeral: true });

  const { ticket, channel } = await ticketService.createTicketFromSubmission({
    guild: interaction.guild!,
    creatorUser: interaction.user,
    category: category || null,
    title,
    description,
  });

  const assignmentText = ticket.assigned_staff_user_id
    ? ` Assigned to <@${ticket.assigned_staff_user_id}>.`
    : " No staff member was available for automatic assignment.";

  await interaction.editReply({
    content: `Created ${ticket.ticket_id} in <#${channel.id}>.${assignmentText}`,
  });
}
