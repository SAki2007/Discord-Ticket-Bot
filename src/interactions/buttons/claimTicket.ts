import type { ButtonInteraction } from "discord.js";

import { env } from "../../config/env";
import type { TicketService } from "../../services/ticketService";
import { UserFacingError } from "../../utils/errors";
import { hasStaffRole } from "../../utils/permissions";

export async function handleClaimTicketButton(
  interaction: ButtonInteraction,
  ticketService: TicketService,
): Promise<void> {
  if (!interaction.guild) {
    throw new UserFacingError("Tickets can only be managed inside a server.");
  }

  await interaction.deferReply({ ephemeral: true });

  const member = await interaction.guild.members.fetch(interaction.user.id);

  if (!hasStaffRole(member, env.STAFF_ROLE_ID)) {
    throw new UserFacingError("Only staff can claim tickets.");
  }

  const ticket = await ticketService.getTicketByChannelIdOrThrow(interaction.channelId);
  const claimedTicket = await ticketService.claimTicket({
    ticket,
    guildId: interaction.guild.id,
    actorUserId: interaction.user.id,
  });

  if (interaction.channel && "send" in interaction.channel) {
    await interaction.channel.send({
      content: `Ticket ${claimedTicket.ticket_id} claimed by <@${interaction.user.id}>.`,
    });
  }

  await interaction.editReply({
    content: `You claimed ${claimedTicket.ticket_id}.`,
  });
}
