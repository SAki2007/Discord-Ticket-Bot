import type { SupabaseClient } from "@supabase/supabase-js";

import type { TicketAttachment } from "../types/tickets";

export class MessagesRepo {
  constructor(private readonly supabase: SupabaseClient) {}

  async saveDiscordMessage(input: {
    ticketId: number;
    discordMessageId: string;
    authorUserId: string;
    content: string;
    attachments: TicketAttachment[];
    createdAt: string;
  }): Promise<void> {
    const { error } = await this.supabase.from("ticket_messages").upsert(
      {
        ticket_id: input.ticketId,
        discord_message_id: input.discordMessageId,
        author_user_id: input.authorUserId,
        content: input.content,
        attachments: input.attachments,
        source: "discord",
        created_at: input.createdAt,
      },
      {
        onConflict: "discord_message_id",
        ignoreDuplicates: true,
      },
    );

    if (error) {
      throw error;
    }
  }
}
