import { createBotClient } from "./bot/client";
import { supabase } from "./db/supabase";
import { EventsRepo } from "./db/eventsRepo";
import { MessagesRepo } from "./db/messagesRepo";
import { StaffRepo } from "./db/staffRepo";
import { TicketsRepo } from "./db/ticketsRepo";
import { registerInteractionCreateHandler } from "./events/interactionCreate";
import { registerMessageCreateHandler } from "./events/messageCreate";
import { registerReadyHandler } from "./events/ready";
import { DiscordService } from "./services/discordService";
import { TicketService } from "./services/ticketService";
import { env } from "./config/env";
import { logger } from "./utils/logger";

async function main(): Promise<void> {
  const client = createBotClient();
  const ticketsRepo = new TicketsRepo(supabase);
  const staffRepo = new StaffRepo(supabase);
  const messagesRepo = new MessagesRepo(supabase);
  const eventsRepo = new EventsRepo(supabase);
  const discordService = new DiscordService(logger);
  const ticketService = new TicketService(
    ticketsRepo,
    staffRepo,
    messagesRepo,
    eventsRepo,
    discordService,
    logger,
  );

  registerReadyHandler({
    client,
    logger,
    discordService,
  });

  registerInteractionCreateHandler({
    client,
    logger,
    ticketService,
  });

  registerMessageCreateHandler({
    client,
    logger,
    ticketService,
  });

  process.on("unhandledRejection", (error) => {
    logger.error({ err: error }, "Unhandled promise rejection");
  });

  process.on("uncaughtException", (error) => {
    logger.fatal({ err: error }, "Uncaught exception");
  });

  await client.login(env.DISCORD_TOKEN);
}

main().catch((error) => {
  logger.fatal({ err: error }, "Bot startup failed");
  process.exitCode = 1;
});
