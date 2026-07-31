// Shared types and dummy data for Contact & Follow-up module

import { initialLeads } from "../../LeadManagement/data/leadsData";

export type ContactResult = "Interested" | "Call Later" | "Not Interested";

export interface FollowUp {
  id: number;
  leadId: number;
  company: string;
  contactPerson: string;
  phone: string;
  assignedTo: string;
  date: string;        // ISO date string
  time: string;        // HH:MM
  reason: string;
  status: "Scheduled" | "Completed" | "Missed";
  followUpType?: string;
  completedSummary?: string; // Summary notes when marked as completed
}

// Leads assigned to "John Doe" (logged-in user simulation)
export const CURRENT_USER = "John Doe";

export const myLeads = initialLeads.filter(
  (l) => l.assignedTo === CURRENT_USER
);

export const FOLLOW_UP_REASONS = [
  "Pending decision",
  "Budget review",
  "Technical evaluation",
  "Stakeholder approval",
  "Proposal sent",
  "No response",
  "Requested callback",
];

export const NOT_INTERESTED_REASONS = [
  "Budget constraints",
  "Chose competitor",
  "No decision made",
  "Poor fit",
  "Timeline mismatch",
  "Not the right contact",
];

export const initialFollowUps: FollowUp[] = [
  {
    id: 1,
    leadId: 1,
    company: "Tech solutions",
    contactPerson: "Alice Smith",
    phone: "+91 98765 43210",
    assignedTo: "John Doe",
    date: "2026-07-10",
    time: "10:00",
    reason: "Pending decision",
    status: "Scheduled",
    followUpType: "Call",
  },
  {
    id: 2,
    leadId: 3,
    company: "Apex digital",
    contactPerson: "Charlie Brown",
    phone: "+91 98765 43212",
    assignedTo: "John Doe",
    date: "2026-07-12",
    time: "14:30",
    reason: "Technical evaluation",
    status: "Scheduled",
    followUpType: "Meeting",
  },
  {
    id: 3,
    leadId: 9,
    company: "Summit labs",
    contactPerson: "Ian Malcolm",
    phone: "+91 98765 43218",
    assignedTo: "John Doe",
    date: "2026-07-05",
    time: "11:00",
    reason: "Budget review",
    status: "Completed",
  },
  {
    id: 4,
    leadId: 6,
    company: "Alpha media",
    contactPerson: "Fiona Gallagher",
    phone: "+91 98765 43215",
    assignedTo: "John Doe",
    date: "2026-07-03",
    time: "09:00",
    reason: "No response",
    status: "Missed",
  },
  {
    id: 5,
    leadId: 1,
    company: "Tech solutions",
    contactPerson: "Alice Smith",
    phone: "+91 98765 43210",
    assignedTo: "John Doe",
    date: "2026-07-15",
    time: "15:00",
    reason: "Requested callback",
    status: "Scheduled",
  },
  {
    id: 6,
    leadId: 2,
    company: "Innovate LLC",
    contactPerson: "Bob Jones",
    phone: "+91 98765 43211",
    assignedTo: "Jane Smith",
    date: "2026-07-08",
    time: "09:30",
    reason: "Proposal sent",
    status: "Completed",
  },
  {
    id: 7,
    leadId: 5,
    company: "Quantum systems",
    contactPerson: "Evan Wright",
    phone: "+91 98765 43214",
    assignedTo: "Jane Smith",
    date: "2026-07-11",
    time: "11:00",
    reason: "Stakeholder approval",
    status: "Scheduled",
  },
  {
    id: 8,
    leadId: 8,
    company: "Horizon ventures",
    contactPerson: "Hannah Abbott",
    phone: "+91 98765 43217",
    assignedTo: "Jane Smith",
    date: "2026-07-02",
    time: "14:00",
    reason: "Requested callback",
    status: "Missed",
  },
  {
    id: 9,
    leadId: 4,
    company: "Nextgen software",
    contactPerson: "Diana Prince",
    phone: "+91 98765 43213",
    assignedTo: "Alice Johnson",
    date: "2026-07-09",
    time: "10:30",
    reason: "Technical evaluation",
    status: "Scheduled",
  },
  {
    id: 10,
    leadId: 7,
    company: "Nexus creators",
    contactPerson: "George Clark",
    phone: "+91 98765 43216",
    assignedTo: "Alice Johnson",
    date: "2026-07-04",
    time: "13:00",
    reason: "Pending decision",
    status: "Completed",
  },
  {
    id: 11,
    leadId: 10,
    company: "Vanguard corp",
    contactPerson: "Julia Roberts",
    phone: "+91 98765 43219",
    assignedTo: "Alice Johnson",
    date: "2026-07-14",
    time: "09:00",
    reason: "Budget review",
    status: "Scheduled",
  },
  {
    id: 12,
    leadId: 11,
    company: "Delta networks",
    contactPerson: "Kevin Bacon",
    phone: "+91 98765 43220",
    assignedTo: "Robert Lee",
    date: "2026-07-06",
    time: "15:30",
    reason: "Stakeholder approval",
    status: "Completed",
  },
  {
    id: 13,
    leadId: 12,
    company: "Omega logistics",
    contactPerson: "Laura Croft",
    phone: "+91 98765 43221",
    assignedTo: "Robert Lee",
    date: "2026-07-13",
    time: "11:30",
    reason: "No response",
    status: "Missed",
  },
];

export const getFollowUpStatusColor = (
  status: FollowUp["status"]
): "success" | "warning" | "error" => {
  switch (status) {
    case "Scheduled":
      return "warning";
    case "Completed":
      return "success";
    case "Missed":
      return "error";
  }
};
