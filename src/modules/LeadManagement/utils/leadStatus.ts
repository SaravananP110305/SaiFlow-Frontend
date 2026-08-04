// Shared frontend helpers for lead statuses (mirrors SaiFlow-Backend constants).

export const LEAD_STATUSES = [
  "NEW",
  "ASSIGNED",
  "CONTACTED",
  "MEETING_SCHEDULED",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
  "DISQUALIFIED",
] as const;

export type LeadStatusValue = (typeof LEAD_STATUSES)[number];

export const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  ASSIGNED: "Assigned",
  CONTACTED: "Contacted",
  MEETING_SCHEDULED: "Meeting Scheduled",
  QUALIFIED: "Qualified",
  PROPOSAL: "Proposal Sent",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
  DISQUALIFIED: "Disqualified",
};

export type BadgeColor = "primary" | "info" | "warning" | "success" | "error" | "light";

export const STATUS_BADGE_COLORS: Record<string, BadgeColor> = {
  NEW: "primary",
  ASSIGNED: "primary",
  CONTACTED: "info",
  MEETING_SCHEDULED: "info",
  QUALIFIED: "warning",
  PROPOSAL: "warning",
  NEGOTIATION: "warning",
  WON: "success",
  LOST: "error",
  DISQUALIFIED: "error",
};

export const PRIORITY_BADGE_COLORS: Record<string, BadgeColor> = {
  High: "error",
  Urgent: "error",
  Medium: "warning",
  Low: "success",
};

/** Legal next-status transitions (must stay in sync with the backend). */
export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  NEW: ["ASSIGNED", "CONTACTED", "MEETING_SCHEDULED", "QUALIFIED", "DISQUALIFIED", "LOST"],
  ASSIGNED: ["CONTACTED", "MEETING_SCHEDULED", "QUALIFIED", "DISQUALIFIED", "LOST"],
  CONTACTED: ["MEETING_SCHEDULED", "QUALIFIED", "DISQUALIFIED", "LOST"],
  MEETING_SCHEDULED: ["QUALIFIED", "CONTACTED", "DISQUALIFIED", "LOST"],
  QUALIFIED: ["PROPOSAL", "NEGOTIATION", "MEETING_SCHEDULED", "WON", "DISQUALIFIED", "LOST"],
  PROPOSAL: ["NEGOTIATION", "MEETING_SCHEDULED", "WON", "LOST", "DISQUALIFIED"],
  NEGOTIATION: ["MEETING_SCHEDULED", "WON", "LOST", "DISQUALIFIED"],
  WON: [],
  LOST: ["NEW"],
  DISQUALIFIED: ["NEW"],
};

export const getStatusLabel = (status?: string | null): string =>
  status ? STATUS_LABELS[status] || status : "—";

export const getStatusBadgeColor = (status?: string | null): BadgeColor =>
  status ? STATUS_BADGE_COLORS[status] || "light" : "light";

export const getPriorityBadgeColor = (priority?: string | null): BadgeColor =>
  priority ? PRIORITY_BADGE_COLORS[priority] || "light" : "light";

export const getNextStatuses = (status?: string | null): string[] =>
  status ? ALLOWED_TRANSITIONS[status] || [] : [];
