import type { ButtonInteraction } from "discord.js";

import { buildTicketCreateModal } from "../modals/ticketModal";

export async function handleCreateTicketButton(interaction: ButtonInteraction): Promise<void> {
  await interaction.showModal(buildTicketCreateModal());
}
