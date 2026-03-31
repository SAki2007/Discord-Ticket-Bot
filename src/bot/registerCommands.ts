import { REST, Routes } from "discord.js";

import { env } from "../config/env";
import { ticketCommandData } from "../commands/ticket";

async function main(): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID),
    {
      body: [ticketCommandData.toJSON()],
    },
  );

  console.log(`Registered guild commands for ${env.DISCORD_GUILD_ID}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
