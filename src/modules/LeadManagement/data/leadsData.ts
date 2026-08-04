// Shared Lead types and dummy data for Leads module
import { LEAD_STATUSES as ENUM_STATUSES, getStatusBadgeColor } from "../utils/leadStatus";

// Backend lead statuses (LeadStatus enum) plus legacy display labels.
export type LeadStatus =
  | "NEW"
  | "ASSIGNED"
  | "CONTACTED"
  | "MEETING_SCHEDULED"
  | "QUALIFIED"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "WON"
  | "LOST"
  | "DISQUALIFIED"
  | "New"
  | "Contacted"
  | "Qualified"
  | "Scheduled"
  | "Completed"
  | "Missed"
  | "Rescheduled"
  | "Proposal sent"
  | "Won"
  | "Lost";

export type LeadPriority = "Low" | "Medium" | "High" | "Urgent";

export interface Lead {
  id: number;
  company: string;
  contactPerson: string;
  email: string;
  phone: string;
  status: string;
  priority?: LeadPriority | string;
  assignedTo: string;
  industry: string;
  source: string;
  website: string;
  address: string;
  notes: string;
  createdAt: string;
  companyId?: number;

  // Backend lifecycle fields
  designation?: string;
  alternatePhone?: string;
  alternateEmail?: string;
  budget?: number | null;
  currency?: string;
  expectedCloseDate?: string | null;
  nextFollowUpDate?: string | null;
  lostReason?: string | null;
  wonAmount?: number | null;
  assignedAt?: string | null;
  assignedToId?: number | null;
  sourceId?: number | null;
  priorityId?: number | null;
  auditLogs?: any[];
  clients?: { id: number; status: string }[];

  // Legacy / UI helper fields
  leadTitle?: string;
  gstNumber?: string;
  companyType?: string;
  addressLine1?: string;
  country?: string;
  state?: string;
  city?: string;
  pincode?: string;
  assignedDate?: string;
  nextFollowUpDateRaw?: string;
  followUpTime?: string;
  followUpType?: string;
  followUpNotes?: string;
  summary?: string;
  remarks?: string;
  lastContactResult?: string;
}

export const LEAD_STATUSES: LeadStatus[] = [
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
];

export const LEAD_PRIORITIES: LeadPriority[] = ["Low", "Medium", "High", "Urgent"];

export const ASSIGNEES = [
  "John Doe",
  "Jane Smith",
  "Alice Johnson",
  "Robert Lee",
];

export const getPriorityColor = (
  priority?: LeadPriority | string
): "error" | "warning" | "success" | "light" => {
  switch (priority) {
    case "High":
    case "Urgent":
      return "error";
    case "Medium":
      return "warning";
    case "Low":
      return "success";
    default:
      return "light";
  }
};

export const getStatusColor = (
  status: LeadStatus | string
): "primary" | "info" | "warning" | "success" | "error" | "light" => {
  // Backend enum values are mapped through the shared util.
  const normalized = (status || "").toUpperCase();
  if ((ENUM_STATUSES as readonly string[]).includes(normalized)) {
    return getStatusBadgeColor(normalized);
  }

  switch (status) {
    case "New":
      return "primary";
    case "Contacted":
      return "info";
    case "Qualified":
      return "warning";
    case "Scheduled":
      return "info";
    case "Completed":
      return "success";
    case "Missed":
      return "error";
    case "Rescheduled":
      return "warning";
    case "Proposal sent":
      return "warning";
    case "Won":
      return "success";
    case "Lost":
      return "error";
    default:
      return "light";
  }
};

export const initialLeads: Lead[] = [
  {
    id: 1,
    company: "Tech solutions",
    contactPerson: "Alice Smith",
    email: "alice@techsolutions.com",
    phone: "+91 98765 43210",
    status: "New",
    priority: "High",
    assignedTo: "John Doe",
    industry: "Information Technology",
    source: "Website",
    website: "https://techsolutions.com",
    address: "123 Tech Park, San Francisco, CA 94105",
    notes: "Interested in enterprise CRM solution. Follow up next week.",
    createdAt: "2024-01-10",
  },
  {
    id: 2,
    company: "Innovate LLC",
    contactPerson: "Bob Jones",
    email: "bob@innovatellc.com",
    phone: "+91 98765 43211",
    status: "Contacted",
    priority: "Medium",
    assignedTo: "Jane Smith",
    industry: "Finance",
    source: "Referral",
    website: "https://innovatellc.com",
    address: "456 Finance Ave, New York, NY 10001",
    notes: "Had an initial call. They need a demo by end of month.",
    createdAt: "2024-01-15",
  },
  {
    id: 3,
    company: "Apex digital",
    contactPerson: "Charlie Brown",
    email: "charlie@apexdigital.com",
    phone: "+91 98765 43212",
    status: "Qualified",
    priority: "High",
    assignedTo: "John Doe",
    industry: "Healthcare",
    source: "LinkedIn",
    website: "https://apexdigital.com",
    address: "789 Health Blvd, Boston, MA 02101",
    notes: "Budget approved. Proposal to be sent by Friday.",
    createdAt: "2024-01-18",
  },
  {
    id: 4,
    company: "Nextgen software",
    contactPerson: "Diana Prince",
    email: "diana@nextgensoftware.com",
    phone: "+91 98765 43213",
    status: "Proposal sent",
    priority: "Medium",
    assignedTo: "Alice Johnson",
    industry: "Manufacturing",
    source: "Cold Call",
    website: "https://nextgensoftware.com",
    address: "321 Industrial Rd, Detroit, MI 48201",
    notes: "Proposal sent on Jan 20. Awaiting feedback from management.",
    createdAt: "2024-01-20",
  },
  {
    id: 5,
    company: "Quantum systems",
    contactPerson: "Evan Wright",
    email: "evan@quantumsystems.com",
    phone: "+91 98765 43214",
    status: "Won",
    priority: "High",
    assignedTo: "Jane Smith",
    industry: "Information Technology",
    source: "Trade Show",
    website: "https://quantumsystems.com",
    address: "654 Innovation Dr, Austin, TX 73301",
    notes: "Deal closed on Jan 25. Contract signed for 12-month term.",
    createdAt: "2024-01-08",
  },
  {
    id: 6,
    company: "Alpha media",
    contactPerson: "Fiona Gallagher",
    email: "fiona@alphamedia.com",
    phone: "+91 98765 43215",
    status: "Lost",
    priority: "Low",
    assignedTo: "John Doe",
    industry: "Retail",
    source: "Email Campaign",
    website: "https://alphamedia.com",
    address: "987 Media Plaza, Los Angeles, CA 90001",
    notes: "Lost to competitor. Budget constraint was the main issue.",
    createdAt: "2024-01-05",
  },
  {
    id: 7,
    company: "Nexus creators",
    contactPerson: "George Clark",
    email: "george@nexuscreators.com",
    phone: "+91 98765 43216",
    status: "New",
    priority: "Low",
    assignedTo: "Alice Johnson",
    industry: "Education",
    source: "Website",
    website: "https://nexuscreators.com",
    address: "159 Creative Hub, Chicago, IL 60601",
    notes: "Submitted inquiry via website. Initial contact not yet made.",
    createdAt: "2024-01-28",
  },
  {
    id: 8,
    company: "Horizon ventures",
    contactPerson: "Hannah Abbott",
    email: "hannah@horizonventures.com",
    phone: "+91 98765 43217",
    status: "Contacted",
    priority: "Medium",
    assignedTo: "Jane Smith",
    industry: "Finance",
    source: "Referral",
    website: "https://horizonventures.com",
    address: "753 Venture Blvd, Seattle, WA 98101",
    notes: "Referred by existing client. Initial call completed.",
    createdAt: "2024-01-22",
  },
  {
    id: 9,
    company: "Summit labs",
    contactPerson: "Ian Malcolm",
    email: "ian@summitlabs.com",
    phone: "+91 98765 43218",
    status: "Qualified",
    priority: "High",
    assignedTo: "John Doe",
    industry: "Healthcare",
    source: "LinkedIn",
    website: "https://summitlabs.com",
    address: "246 Research Pkwy, San Diego, CA 92101",
    notes: "Decision-maker identified. Ready for proposal stage.",
    createdAt: "2024-01-12",
  },
  {
    id: 10,
    company: "Vanguard corp",
    contactPerson: "Julia Roberts",
    email: "julia@vanguardcorp.com",
    phone: "+91 98765 43219",
    status: "Proposal sent",
    priority: "Medium",
    assignedTo: "Alice Johnson",
    industry: "Manufacturing",
    source: "Cold Call",
    website: "https://vanguardcorp.com",
    address: "864 Corporate Way, Phoenix, AZ 85001",
    notes: "Proposal reviewed. Follow-up call scheduled for Feb 5.",
    createdAt: "2024-01-25",
  },
  {
    id: 11,
    company: "Delta networks",
    contactPerson: "Kevin Bacon",
    email: "kevin@deltanetworks.com",
    phone: "+91 98765 43220",
    status: "Won",
    priority: "High",
    assignedTo: "Jane Smith",
    industry: "Information Technology",
    source: "Trade Show",
    website: "https://deltanetworks.com",
    address: "531 Network Ave, Dallas, TX 75201",
    notes: "Won deal after 3-month negotiation. Start date Feb 1.",
    createdAt: "2024-01-03",
  },
  {
    id: 12,
    company: "Omega logistics",
    contactPerson: "Laura Croft",
    email: "laura@omegatlogistics.com",
    phone: "+91 98765 43221",
    status: "Lost",
    priority: "Low",
    assignedTo: "John Doe",
    industry: "Retail",
    source: "Email Campaign",
    website: "https://omegatlogistics.com",
    address: "975 Logistics Park, Atlanta, GA 30301",
    notes: "Chose a competitor with lower pricing. May revisit next quarter.",
    createdAt: "2024-01-02",
  },
];
