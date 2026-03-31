import type { ButtonInteraction } from "discord.js";

import { buildCloseTicketModal } from "../modals/closeTicketModal";

export async function handleCloseTicketButton(interaction: ButtonInteraction): Promise<void> {
  await interaction.showModal(buildCloseTicketModal());
}
