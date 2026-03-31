import { Events, type Client } from "discord.js";
import type { Logger } from "pino";

import type { TicketService } from "../services/ticketService";

export function registerMessageCreateHandler(input: {
  client: Client;
  logger: Logger;
  ticketService: TicketService;
}): void {
  input.client.on(Events.MessageCreate, async (message) => {
    try {
      await input.ticketService.syncMessage(message);
    } catch (error) {
      input.logger.error(
        { err: error, messageId: message.id, channelId: message.channelId },
        "Message sync failed",
      );
    }
  });
}
