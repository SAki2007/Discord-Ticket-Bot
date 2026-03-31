import type { SupabaseClient } from "@supabase/supabase-js";

import type { StaffMember } from "../types/tickets";

export class StaffRepo {
  constructor(private readonly supabase: SupabaseClient) {}

  async listActiveByGuild(guildId: string): Promise<StaffMember[]> {
    const { data, error } = await this.supabase
      .from("staff_members")
      .select("*")
      .eq("guild_id", guildId)
      .eq("is_active", true);

    if (error) {
      throw error;
    }

    return (data as StaffMember[]) ?? [];
  }

  async touchLastAssignedAt(guildId: string, staffUserId: string): Promise<void> {
    const { error } = await this.supabase
      .from("staff_members")
      .update({
        last_assigned_at: new Date().toISOString(),
      })
      .eq("guild_id", guildId)
      .eq("staff_user_id", staffUserId);

    if (error) {
      throw error;
    }
  }
}
