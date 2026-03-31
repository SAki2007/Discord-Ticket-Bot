import {
  Events,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Client,
  type ModalSubmitInteraction,
} from "discord.js";
import type { Logger } from "pino";

import { handleTicketCommand } from "../commands/ticket";
import { handleClaimTicketButton } from "../interactions/buttons/claimTicket";
import { handleCloseTicketButton } from "../interactions/buttons/closeTicket";
import { handleCreateTicketButton } from "../interactions/buttons/createTicket";
import { handleCloseTicketModalSubmission } from "../interactions/modals/closeTicketModal";
import { handleTicketModalSubmission } from "../interactions/modals/ticketModal";
import type { TicketService } from "../services/ticketService";
import { CUSTOM_IDS } from "../utils/constants";
import { UserFacingError } from "../utils/errors";

type SupportedInteraction =
  | ChatInputCommandInteraction
  | ButtonInteraction
  | ModalSubmitInteraction;

async function replyWithError(
  interaction: SupportedInteraction,
  message: string,
): Promise<void> {
  if (interaction.deferred) {
    await interaction.editReply({ content: message });
    return;
  }

  if (interaction.replied) {
    await interaction.followUp({ content: message, ephemeral: true });
    return;
  }

  await interaction.reply({ content: message, ephemeral: true });
}

export function registerInteractionCreateHandler(input: {
  client: Client;
  logger: Logger;
  ticketService: TicketService;
}): void {
  input.client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        if (interaction.commandName === "ticket") {
          await handleTicketCommand(interaction);
        }

        return;
      }

      if (interaction.isButton()) {
        switch (interaction.customId) {
          case CUSTOM_IDS.createTicketButton:
            await handleCreateTicketButton(interaction);
            return;
          case CUSTOM_IDS.claimTicketButton:
            await handleClaimTicketButton(interaction, input.ticketService);
            return;
          case CUSTOM_IDS.closeTicketButton:
            await handleCloseTicketButton(interaction);
            return;
          default:
            return;
        }
      }

      if (interaction.isModalSubmit()) {
        switch (interaction.customId) {
          case CUSTOM_IDS.createTicketModal:
            await handleTicketModalSubmission(interaction, input.ticketService);
            return;
          case CUSTOM_IDS.closeTicketModal:
            await handleCloseTicketModalSubmission(interaction, input.ticketService);
            return;
          default:
            return;
        }
      }
    } catch (error) {
      input.logger.error(
        {
          err: error,
          interactionType: interaction.type,
          customId: "customId" in interaction ? interaction.customId : undefined,
          commandName: "commandName" in interaction ? interaction.commandName : undefined,
        },
        "Interaction handling failed",
      );

      const message =
        error instanceof UserFacingError
          ? error.message
          : "The request failed. Check the bot logs for details.";

      await replyWithError(interaction as SupportedInteraction, message).catch((replyError) => {
        input.logger.error({ err: replyError }, "Failed to send interaction error response");
      });
    }
  });
}
