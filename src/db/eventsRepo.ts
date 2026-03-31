import type { SupabaseClient } from "@supabase/supabase-js";

export class EventsRepo {
  constructor(private readonly supabase: SupabaseClient) {}

  async logEvent(input: {
    ticketId: number;
    eventType: string;
    actorUserId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const { error } = await this.supabase.from("ticket_events").insert({
      ticket_id: input.ticketId,
      event_type: input.eventType,
      actor_user_id: input.actorUserId ?? null,
      metadata: input.metadata ?? {},
    });

    if (error) {
      throw error;
    }
  }
}
