import type { TicketStatus } from "../types/tickets";

export const ACTIVE_TICKET_STATUSES: TicketStatus[] = ["open", "claimed"];

export const CUSTOM_IDS = {
  createTicketButton: "ticket:create",
  claimTicketButton: "ticket:claim",
  closeTicketButton: "ticket:close",
  createTicketModal: "ticket:create-modal",
  closeTicketModal: "ticket:close-modal",
} as const;

export const CREATE_TICKET_MODAL_FIELDS = {
  category: "ticket-category",
  title: "ticket-title",
  description: "ticket-description",
} as const;

export const CLOSE_TICKET_MODAL_FIELDS = {
  reason: "ticket-close-reason",
} as const;

export const TICKET_EVENT_TYPES = {
  created: "created",
  assigned: "assigned",
  claimed: "claimed",
  closed: "closed",
} as const;

export const SUPPORT_PANEL_TITLE = "Need help?";
