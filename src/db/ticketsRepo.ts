import type { SupabaseClient } from "@supabase/supabase-js";

import { ACTIVE_TICKET_STATUSES } from "../utils/constants";
import type { CreateTicketInput, Ticket } from "../types/tickets";

export class TicketsRepo {
  constructor(private readonly supabase: SupabaseClient) {}

  async findActiveByCreator(guildId: string, creatorUserId: string): Promise<Ticket | null> {
    const { data, error } = await this.supabase
      .from("tickets")
      .select("*")
      .eq("guild_id", guildId)
      .eq("creator_user_id", creatorUserId)
      .in("status", ACTIVE_TICKET_STATUSES)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data as Ticket | null) ?? null;
  }

  async createTicket(input: CreateTicketInput): Promise<Ticket> {
    const { data, error } = await this.supabase
      .from("tickets")
      .insert({
        guild_id: input.guildId,
        channel_id: input.channelId ?? null,
        creator_user_id: input.creatorUserId,
        assigned_staff_user_id: input.assignedStaffUserId ?? null,
        status: "open",
        category: input.category ?? null,
        title: input.title,
        description: input.description,
        priority: input.priority ?? null,
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data as Ticket;
  }

  async deleteTicket(ticketId: number): Promise<void> {
    const { error } = await this.supabase.from("tickets").delete().eq("id", ticketId);

    if (error) {
      throw error;
    }
  }

  async updateChannelId(ticketId: number, channelId: string): Promise<Ticket> {
    const { data, error } = await this.supabase
      .from("tickets")
      .update({
        channel_id: channelId,
      })
      .eq("id", ticketId)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data as Ticket;
  }

  async getByChannelId(channelId: string): Promise<Ticket | null> {
    const { data, error } = await this.supabase
      .from("tickets")
      .select("*")
      .eq("channel_id", channelId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data as Ticket | null) ?? null;
  }

  async markClaimed(ticketId: number, staffUserId: string): Promise<Ticket> {
    const { data, error } = await this.supabase
      .from("tickets")
      .update({
        status: "claimed",
        assigned_staff_user_id: staffUserId,
      })
      .eq("id", ticketId)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data as Ticket;
  }

  async closeTicket(ticketId: number, reason: string | null): Promise<Ticket> {
    const { data, error } = await this.supabase
      .from("tickets")
      .update({
        status: "closed",
        close_reason: reason,
        closed_at: new Date().toISOString(),
      })
      .eq("id", ticketId)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data as Ticket;
  }

  async countActiveByAssignedStaff(
    guildId: string,
    staffUserIds: string[],
  ): Promise<Map<string, number>> {
    const counts = new Map<string, number>();

    if (staffUserIds.length === 0) {
      return counts;
    }

    const { data, error } = await this.supabase
      .from("tickets")
      .select("assigned_staff_user_id")
      .eq("guild_id", guildId)
      .in("status", ACTIVE_TICKET_STATUSES)
      .in("assigned_staff_user_id", staffUserIds);

    if (error) {
      throw error;
    }

    for (const row of data ?? []) {
      const staffUserId = row.assigned_staff_user_id as string | null;

      if (!staffUserId) {
        continue;
      }

      counts.set(staffUserId, (counts.get(staffUserId) ?? 0) + 1);
    }

    return counts;
  }
}
