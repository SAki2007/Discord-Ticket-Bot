export type TicketStatus = "open" | "claimed" | "closed";
export type TicketMessageSource = "discord" | "dashboard";

export interface TicketAttachment {
  id: string;
  name: string | null;
  url: string;
  proxy_url: string;
  content_type: string | null;
  size: number;
}

export interface Ticket {
  id: number;
  ticket_id: string;
  guild_id: string;
  channel_id: string | null;
  creator_user_id: string;
  assigned_staff_user_id: string | null;
  status: TicketStatus;
  category: string | null;
  title: string;
  description: string;
  priority: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  close_reason: string | null;
}

export interface StaffMember {
  id: number;
  guild_id: string;
  staff_user_id: string;
  is_active: boolean;
  last_assigned_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketEvent {
  id: number;
  ticket_id: number;
  event_type: string;
  actor_user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface TicketMessageRecord {
  id: number;
  ticket_id: number;
  discord_message_id: string;
  author_user_id: string;
  content: string;
  attachments: TicketAttachment[];
  source: TicketMessageSource;
  created_at: string;
}

export interface CreateTicketInput {
  guildId: string;
  creatorUserId: string;
  assignedStaffUserId?: string | null;
  category?: string | null;
  title: string;
  description: string;
  priority?: string | null;
  channelId?: string | null;
}

export interface TicketAssignmentCandidate extends StaffMember {
  active_ticket_count: number;
}
