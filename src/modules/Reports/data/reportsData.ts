export interface LeadReportData {
  id: number;
  company: string;
  contactPerson: string;
  email: string;
  phone: string;
  source: string;
  industry: string;
  status: string;
  assignedTo: string;
  createdAt?: string;
}

export interface MeetingReportData {
  id: number;
  subject: string;
  company: string;
  contactPerson: string;
  date: string;
  time: string;
  type: string;
  status: string;
  createdBy?: string;
}

export interface EmployeeReportData {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: "Active" | "Inactive";
  totalLeads: number;
  wonLeads: number;
  lostLeads: number;
}

export interface FollowUpReportData {
  id: number;
  company: string;
  contactPerson: string;
  date: string;
  time: string;
  reason: string;
  status: string;
  outcome: string;
  assignedTo?: string;
}

export interface ClientReportData {
  id: number;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  industry: string;
  status: "Active" | "Inactive" | "Blacklisted";
  clientSince: string;
  relationshipManager: string;
  accountManager: string;
  projectsCount: number;
  handoverStatus: "Pending" | "Onboarded";
  paymentTerms: string;
  creditLimit: string;
}

export interface ProposalReportData {
  id: number;
  proposalNo: string;
  leadName: string;
  companyName: string;
  leadEmail: string;
  leadPhone: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  totalAmount: number;
  paymentTerms: string;
  deliveryTimeline: string;
}

export const LEAD_REPORT_DATA: LeadReportData[] = [
  { id: 1, company: "Tech solutions", contactPerson: "Alice Smith", email: "alice@techsolutions.com", phone: "+91 98765 43210", source: "Website", industry: "Information Technology", status: "New", assignedTo: "John Doe" },
  { id: 2, company: "Innovate LLC", contactPerson: "Bob Jones", email: "bob@innovatellc.com", phone: "+91 98765 43211", source: "Referral", industry: "Finance", status: "Contacted", assignedTo: "Jane Smith" },
  { id: 3, company: "Apex digital", contactPerson: "Charlie Brown", email: "charlie@apexdigital.com", phone: "+91 98765 43212", source: "LinkedIn", industry: "Healthcare", status: "Qualified", assignedTo: "John Doe" },
  { id: 4, company: "Nextgen software", contactPerson: "Diana Prince", email: "diana@nextgensoftware.com", phone: "+91 98765 43213", source: "Cold Call", industry: "Manufacturing", status: "Proposal sent", assignedTo: "Alice Johnson" },
  { id: 5, company: "Quantum systems", contactPerson: "Evan Wright", email: "evan@quantumsystems.com", phone: "+91 98765 43214", source: "Trade Show", industry: "Information Technology", status: "Won", assignedTo: "Jane Smith" },
  { id: 6, company: "Alpha media", contactPerson: "Fiona Gallagher", email: "fiona@alphamedia.com", phone: "+91 98765 43215", source: "Email Campaign", industry: "Retail", status: "Lost", assignedTo: "John Doe" },
];

export const MEETING_REPORT_DATA: MeetingReportData[] = [
  { id: 1, subject: "Discovery Call & Product Intro", company: "Tech solutions", contactPerson: "Alice Smith", date: "2026-07-09", time: "10:30", type: "Google Meet", status: "Scheduled" },
  { id: 2, subject: "Pricing & License Discussion", company: "Innovate LLC", contactPerson: "Bob Jones", date: "2026-07-09", time: "14:00", type: "Google Meet", status: "Rescheduled" },
  { id: 3, subject: "Detailed Technical Demo", company: "Apex digital", contactPerson: "Charlie Brown", date: "2026-07-10", time: "11:00", type: "Google Meet", status: "Scheduled" },
  { id: 4, subject: "On-site Contract Negotiation", company: "Quantum systems", contactPerson: "Evan Wright", date: "2026-07-15", time: "15:30", type: "Offline", status: "Scheduled" },
  { id: 5, subject: "Initial Discovery Call", company: "Summit labs", contactPerson: "Ian Malcolm", date: "2026-07-05", time: "09:30", type: "Google Meet", status: "Completed" },
];

export const EMPLOYEE_REPORT_DATA: EmployeeReportData[] = [
  { id: 1, name: "John Doe", email: "john.doe@saiflow.com", phone: "+91 98765 43210", role: "Administrator", status: "Active", totalLeads: 12, wonLeads: 4, lostLeads: 2 },
  { id: 2, name: "Jane Smith", email: "jane.smith@saiflow.com", phone: "+91 98765 43211", role: "Business Development Manager", status: "Active", totalLeads: 15, wonLeads: 6, lostLeads: 3 },
  { id: 3, name: "Alice Johnson", email: "alice.johnson@saiflow.com", phone: "+91 98765 43212", role: "Business Development Executive", status: "Active", totalLeads: 8, wonLeads: 2, lostLeads: 1 },
  { id: 4, name: "Robert Lee", email: "robert.lee@saiflow.com", phone: "+91 98765 43213", role: "Presales Consultant", status: "Active", totalLeads: 4, wonLeads: 1, lostLeads: 0 },
  { id: 5, name: "Emma Watson", email: "emma.watson@saiflow.com", phone: "+91 98765 43214", role: "Guest User", status: "Inactive", totalLeads: 0, wonLeads: 0, lostLeads: 0 }
];

export const FOLLOW_UP_REPORT_DATA: FollowUpReportData[] = [
  { id: 1, company: "Tech solutions", contactPerson: "Alice Smith", date: "2026-07-09", time: "10:00", reason: "Pending decision", status: "Scheduled", outcome: "Awaiting decision maker callback" },
  { id: 2, company: "Apex digital", contactPerson: "Charlie Brown", date: "2026-07-12", time: "14:30", reason: "Technical evaluation", status: "Scheduled", outcome: "Demo environment prepared" },
  { id: 3, company: "Summit labs", contactPerson: "Ian Malcolm", date: "2026-07-05", time: "11:00", reason: "Budget review", status: "Completed", outcome: "Budget confirmed, proceed to proposal" },
  { id: 4, company: "Alpha media", contactPerson: "Fiona Gallagher", date: "2026-07-03", time: "09:00", reason: "No response", status: "Missed", outcome: "Voicemail left" }
];

export const CLIENT_REPORT_DATA: ClientReportData[] = [
  { id: 1, companyName: "Aventis Technologies", contactName: "Arvind Swamy", email: "arvind@aventis.com", phone: "9445212056", industry: "Information Technology", status: "Active", clientSince: "2024-01-10", relationshipManager: "John Doe", accountManager: "Jane Smith", projectsCount: 2, handoverStatus: "Pending", paymentTerms: "Net 30", creditLimit: "500000" },
  { id: 2, companyName: "Cyberdyne Systems", contactName: "Sarah Connor", email: "sarah@cyberdyne.com", phone: "5550192831", industry: "Manufacturing", status: "Active", clientSince: "2024-03-15", relationshipManager: "Alice Johnson", accountManager: "Robert Lee", projectsCount: 1, handoverStatus: "Onboarded", paymentTerms: "Net 15", creditLimit: "1000000" },
  { id: 3, companyName: "Kingfisher Solutions", contactName: "Vijay Mallya", email: "vijay@kingfisher.com", phone: "9884088200", industry: "Retail", status: "Inactive", clientSince: "2023-11-20", relationshipManager: "Robert Lee", accountManager: "John Doe", projectsCount: 0, handoverStatus: "Pending", paymentTerms: "Immediate", creditLimit: "0" },
  { id: 4, companyName: "SpaceX Logistics", contactName: "Diana Prince", email: "diana@spacexlogistics.com", phone: "+91 98765 43213", industry: "Logistics", status: "Active", clientSince: "2026-06-10", relationshipManager: "Bob Smith", accountManager: "Alice Johnson", projectsCount: 1, handoverStatus: "Onboarded", paymentTerms: "Net 30", creditLimit: "750000" },
  { id: 5, companyName: "Nexus Creators", contactName: "George Brown", email: "george@nexuscreators.com", phone: "+91 98765 43216", industry: "Media", status: "Active", clientSince: "2026-07-12", relationshipManager: "Alice Johnson", accountManager: "Jane Smith", projectsCount: 0, handoverStatus: "Pending", paymentTerms: "Net 30", creditLimit: "300000" },
];

export const PROPOSAL_REPORT_DATA: ProposalReportData[] = [
  { id: 1, proposalNo: "BP-2026-001", leadName: "Arvind Kumar", companyName: "Aventis Technologies", leadEmail: "arvind@aventis.com", leadPhone: "+91 98765 43210", status: "Negotiation", createdAt: "2026-07-05", updatedAt: "2026-07-14", totalAmount: 36000, paymentTerms: "40% upfront, 30% on milestone 1, 30% on delivery", deliveryTimeline: "12 weeks from project kickoff" },
  { id: 2, proposalNo: "BP-2026-002", leadName: "Sarah Connor", companyName: "Cyberdyne Systems", leadEmail: "sarah@cyberdyne.com", leadPhone: "+91 98765 43211", status: "Approved", createdAt: "2026-06-20", updatedAt: "2026-07-12", totalAmount: 95000, paymentTerms: "30% upfront, 40% on milestone 1, 30% on delivery", deliveryTimeline: "16 weeks from project kickoff" },
  { id: 3, proposalNo: "BP-2026-003", leadName: "Vijay Kumar", companyName: "Kingfisher Solutions", leadEmail: "vijay@kingfisher.com", leadPhone: "+91 98765 43212", status: "Draft", createdAt: "2026-07-14", updatedAt: "2026-07-17", totalAmount: 29000, paymentTerms: "50% upfront, 50% on delivery", deliveryTimeline: "8 weeks from project kickoff" },
  { id: 4, proposalNo: "BP-2026-004", leadName: "Diana Prince", companyName: "SpaceX Logistics", leadEmail: "diana@spacexlogistics.com", leadPhone: "+91 98765 43213", status: "Converted", createdAt: "2026-06-01", updatedAt: "2026-06-10", totalAmount: 50000, paymentTerms: "Net 30 from invoice date", deliveryTimeline: "10 weeks from project kickoff" },
  { id: 5, proposalNo: "BP-2026-005", leadName: "Evan Wright", companyName: "Quantum Systems", leadEmail: "evan@quantumsystems.com", leadPhone: "+91 98765 43214", status: "Rejected", createdAt: "2026-05-10", updatedAt: "2026-05-20", totalAmount: 80000, paymentTerms: "Net 45 from invoice", deliveryTimeline: "20 weeks from project kickoff" },
  { id: 6, proposalNo: "BP-2026-006", leadName: "Fiona George", companyName: "Alphabet Web Services", leadEmail: "fiona@alphabetwebservices.com", leadPhone: "+91 98765 43215", status: "Under Review", createdAt: "2026-07-10", updatedAt: "2026-07-16", totalAmount: 53000, paymentTerms: "Net 30, milestone-based invoicing", deliveryTimeline: "12 weeks from project kickoff" },
  { id: 7, proposalNo: "BP-2026-007", leadName: "George Brown", companyName: "Nexus Creators", leadEmail: "george@nexuscreators.com", leadPhone: "+91 98765 43216", status: "Sent", createdAt: "2026-07-15", updatedAt: "2026-07-16", totalAmount: 66000, paymentTerms: "50% upfront, 25% on alpha release, 25% on final delivery", deliveryTimeline: "16 weeks from project kickoff" },
];
