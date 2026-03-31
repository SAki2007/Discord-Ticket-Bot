import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";

import { buildTicketCreateModal } from "../interactions/modals/ticketModal";

export const ticketCommandData = new SlashCommandBuilder()
  .setName("ticket")
  .setDescription("Support ticket commands")
  .setDMPermission(false)
  .addSubcommand((subcommand) =>
    subcommand.setName("create").setDescription("Create a new support ticket"),
  );

export async function handleTicketCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "create") {
    await interaction.showModal(buildTicketCreateModal());
  }
}
