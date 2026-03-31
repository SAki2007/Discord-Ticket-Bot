import { Events, type Client } from "discord.js";
import type { Logger } from "pino";

import { env } from "../config/env";
import { DiscordService } from "../services/discordService";

export function registerReadyHandler(input: {
  client: Client;
  logger: Logger;
  discordService: DiscordService;
}): void {
  input.client.once(Events.ClientReady, async (readyClient) => {
    input.logger.info({ userTag: readyClient.user.tag }, "Discord client ready");

    try {
      const guild = await readyClient.guilds.fetch(env.DISCORD_GUILD_ID).then((value) => value.fetch());
      await input.discordService.ensureSupportPanel(guild);
    } catch (error) {
      input.logger.error({ err: error }, "Failed to ensure the support panel message");
    }
  });
}
