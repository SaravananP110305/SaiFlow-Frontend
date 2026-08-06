// ─── Business Proposal - Data Types & Initial Data ─────────────────────────

export type ProposalStatus =
  | "Draft"
  | "Sent"
  | "Under Review"
  | "Negotiation"
  | "Approved"
  | "Rejected"
  | "Converted";

// ─── Section: Requirement ───────────────────────────────────────────────────

export interface RequirementSection {
  overview: string;
  objectives: string[];
  technicalRequirements: string[];
  deliverables: string[];
  assumptions: string[];
  constraints: string[];
  techStack?: string[];
}

// ─── Section: Estimation ─────────────────────────────────────────────────────

export interface EstimationLineItem {
  id: string;
  category: string;
  description: string;
  quantity?: number;
  unit: string;
  unitPrice: number;
  amount: number;
}

export interface EstimationSection {
  items: EstimationLineItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
}

// ─── Section: Project Phases ─────────────────────────────────────────────────

export interface ProposalPhase {
  id?: number;
  phaseName: string;
  overview: string;
  objectives: string[];
  technicalRequirements: string[];
  deliverables: string[];
  assumptions: string[];
  constraints: string[];
  lineItems: EstimationLineItem[];
  subtotal: number;
  estimatedTimeline?: string;
}

export interface PricingSummary {
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  grandTotal: number;
}

// Converts a phase object from the backend API (relation tables, Decimal
// strings) into the frontend ProposalPhase shape.
interface PhaseTextRow {
  text: string;
}

interface PhaseLineItemApi {
  id?: number | string;
  category?: string;
  description?: string;
  unit?: string;
  quantity?: number | string;
  unitPrice?: number | string;
  amount?: number | string;
}

interface PhaseApi {
  id?: number | null;
  phaseName?: string;
  overview?: string;
  estimatedTimeline?: string;
  objectives?: PhaseTextRow[];
  technicalRequirements?: PhaseTextRow[];
  deliverables?: PhaseTextRow[];
  assumptions?: PhaseTextRow[];
  constraints?: PhaseTextRow[];
  lineItems?: PhaseLineItemApi[];
}

export function mapPhaseFromApi(ph: PhaseApi): ProposalPhase {
  const lineItems: EstimationLineItem[] = (ph?.lineItems || []).map((li) => ({
    id: String(li.id),
    category: li.category,
    description: li.description,
    unit: li.unit || "Project",
    quantity: Number(li.quantity) || 1,
    unitPrice: Number(li.unitPrice) || 0,
    amount: Number(li.amount) || 0,
  }));
  return {
    id: ph?.id,
    phaseName: ph?.phaseName || "",
    overview: ph?.overview || "",
    estimatedTimeline: ph?.estimatedTimeline || "",
    objectives: (ph?.objectives || []).map((o) => o.text),
    technicalRequirements: (ph?.technicalRequirements || []).map((t) => t.text),
    deliverables: (ph?.deliverables || []).map((d) => d.text),
    assumptions: (ph?.assumptions || []).map((a) => a.text),
    constraints: (ph?.constraints || []).map((c) => c.text),
    lineItems,
    subtotal: lineItems.reduce((s, i) => s + i.amount, 0),
  };
}

// ─── Section: Quotation / Pricing ────────────────────────────────────────────

export interface QuotationSection {
  paymentTerms: string;
  validityDays: number;
  deliveryTimeline: string;
  warrantyPeriod: string;
  paymentMilestones: { milestone: string; percentage: number; amount: number }[];
  notes: string;
  termsAndConditions: string;
}

// ─── Workflow Log ────────────────────────────────────────────────────────────

export interface WorkflowLog {
  id: number;
  action: string;
  fromStatus: ProposalStatus;
  toStatus: ProposalStatus;
  timestamp: string;
  performedBy: string;
  notes: string;
}

// ─── Main Proposal ───────────────────────────────────────────────────────────

export interface Proposal {
  id: number;
  proposalNo: string;
  leadName: string;
  companyName: string;
  leadEmail: string;
  leadPhone: string;
  status: ProposalStatus;
  createdAt: string;
  updatedAt: string;
  requirement: RequirementSection;
  estimation: EstimationSection;
  quotation: QuotationSection;
  phases?: ProposalPhase[];
  pricing?: PricingSummary;
  workflowLogs: WorkflowLog[];
  value?: number;
}

// ─── Initial Sample Data Helper ──────────────────────────────────────────────

function makeProposal(
  id: number,
  proposalNo: string,
  leadName: string,
  companyName: string,
  leadEmail: string,
  leadPhone: string,
  status: ProposalStatus,
  createdAt: string,
  updatedAt: string,
  overview: string,
  objectives: string[],
  techReqs: string[],
  deliverables: string[],
  assumptions: string[],
  constraints: string[],
  lineItems: EstimationLineItem[],
  paymentTerms: string,
  validityDays: number,
  deliveryTimeline: string,
  warrantyPeriod: string,
  milestones: { milestone: string; percentage: number; amount: number }[],
  notes: string,
  tAndC: string,
  discountPct: number,
  taxPct: number,
  workflowLogs: WorkflowLog[]
): Proposal {
  const subtotal = lineItems.reduce((s, i) => s + i.amount, 0);
  const discountAmount = Math.round(subtotal * (discountPct / 100));
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = Math.round(afterDiscount * (taxPct / 100));
  const total = afterDiscount + taxAmount;

  return {
    id,
    proposalNo,
    leadName,
    companyName,
    leadEmail,
    leadPhone,
    status,
    createdAt,
    updatedAt,
    requirement: {
      overview,
      objectives,
      technicalRequirements: techReqs,
      deliverables,
      assumptions,
      constraints,
    },
    estimation: {
      items: lineItems,
      subtotal,
      discountPercent: discountPct,
      discountAmount,
      taxPercent: taxPct,
      taxAmount,
      total,
    },
    quotation: {
      paymentTerms,
      validityDays,
      deliveryTimeline,
      warrantyPeriod,
      paymentMilestones: milestones,
      notes,
      termsAndConditions: tAndC,
    },
    workflowLogs,
  };
}

const now = new Date();
const today = now.toISOString().split("T")[0];
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString().split("T")[0];

// ---------- Sample Data ----------

export const initialProposals: Proposal[] = [
  makeProposal(
    1, "BP-2026-001", "Arvind Kumar", "Aventis Technologies",
    "arvind@aventis.com", "+91 98765 43210",
    "Negotiation", "2026-07-05", today,
    "Aventis Technologies requires a comprehensive Web ERP Platform. Revised scope based on negotiation feedback to reduce cost while retaining core functionality.",
    [
      "Automate inventory management with real-time tracking",
      "Integrate financial accounting with GST compliance",
      "Centralize HR operations including payroll and attendance",
      "Role-based access control for different departments",
    ],
    [
      "Cloud-hosted solution with 99.9% uptime SLA",
      "Support for 300+ concurrent users (reduced from 500)",
      "REST API integration with existing third-party tools",
      "Mobile-responsive web interface",
    ],
    [
      "Fully functional Web ERP Platform (core modules only)",
      "User documentation and training manuals",
      "Source code and deployment scripts",
      "1 week of on-site training (reduced from 2)",
    ],
    [
      "Client will provide timely feedback and approvals",
      "Client IT team will manage infrastructure provisioning",
      "Third-party API documentation will be provided by client",
    ],
    [
      "Project timeline assumes dedicated team availability",
      "Budget does not include third-party licensing costs",
      "Scope limited to modules listed in the objectives",
    ],
    [
      { id: "li-1", category: "UI/UX Design", description: "ERP Dashboard & Module UI Design", quantity: 1, unit: "Project", unitPrice: 4000, amount: 4000 },
      { id: "li-2", category: "Frontend", description: "React-based responsive frontend for core modules", quantity: 1, unit: "Project", unitPrice: 10000, amount: 10000 },
      { id: "li-3", category: "Backend", description: "Node.js REST API with PostgreSQL database", quantity: 1, unit: "Project", unitPrice: 12000, amount: 12000 },
      { id: "li-4", category: "Integration", description: "Essential third-party API integrations", quantity: 1, unit: "Project", unitPrice: 4000, amount: 4000 },
      { id: "li-5", category: "Testing", description: "QA testing and UAT", quantity: 1, unit: "Project", unitPrice: 3000, amount: 3000 },
      { id: "li-6", category: "Deployment", description: "Cloud deployment and go-live support", quantity: 1, unit: "Project", unitPrice: 3000, amount: 3000 },
    ],
    "40% upfront, 30% on milestone 1, 30% on delivery",
    30,
    "12 weeks from project kickoff",
    "6 months post-deployment",
    [
      { milestone: "Project Kickoff & Requirements Finalization", percentage: 40, amount: 14400 },
      { milestone: "Mid-Project Review & UAT", percentage: 30, amount: 10800 },
      { milestone: "Final Delivery & Go-Live", percentage: 30, amount: 10800 },
    ],
    "Revised pricing based on reduced scope. Valid for 30 days.",
    "1. All intellectual property rights for custom-developed code shall be transferred to the client upon full payment.\n2. Any changes to the scope after sign-off will be handled through a change request process.\n3. Confidentiality of all client data and business information will be maintained.",
    5, 18,
    [
      { id: 1, action: "Proposal created", fromStatus: "Draft", toStatus: "Draft", timestamp: "2026-07-05T10:00:00Z", performedBy: "Alice Johnson", notes: "Initial proposal drafted" },
      { id: 2, action: "Proposal sent to client", fromStatus: "Draft", toStatus: "Sent", timestamp: "2026-07-06T14:30:00Z", performedBy: "Alice Johnson", notes: "Sent via email to arvind@aventis.com" },
      { id: 3, action: "Client acknowledged receipt", fromStatus: "Sent", toStatus: "Under Review", timestamp: "2026-07-08T09:15:00Z", performedBy: "System", notes: "Client confirmed receipt and will review" },
      { id: 4, action: "Client requested revisions", fromStatus: "Under Review", toStatus: "Negotiation", timestamp: daysAgo(4) + "T11:00:00Z", performedBy: "Alice Johnson", notes: "Client requested 10% discount and reduced scope" },
      { id: 5, action: "Proposal revised", fromStatus: "Negotiation", toStatus: "Negotiation", timestamp: daysAgo(3) + "T16:45:00Z", performedBy: "Alice Johnson", notes: "Created v1.1 with 5% discount and reduced scope" },
    ]
  ),

  makeProposal(
    2, "BP-2026-002", "Sarah Connor", "Cyberdyne Systems",
    "sarah@cyberdyne.com", "+91 98765 43211",
    "Approved", "2026-06-20", daysAgo(5),
    "Cyberdyne Systems needs an AI-powered analytics dashboard for real-time business intelligence and predictive insights.",
    [
      "Real-time data visualization dashboard",
      "Predictive analytics using machine learning models",
      "Automated report generation and scheduling",
      "Customizable KPI tracking and alerts",
    ],
    [
      "Real-time data streaming support",
      "Integration with existing SQL databases",
      "Scalable to handle 1M+ data points daily",
      "Role-based access with multi-tenant support",
    ],
    [
      "Interactive analytics dashboard",
      "ML model integration and training pipeline",
      "API documentation and developer guide",
      "Admin training and knowledge transfer sessions",
    ],
    [
      "Client will provide sample data for testing",
      "Client team will assist with ML model training data",
      "Infrastructure for deployment to be provided by client",
    ],
    [
      "ML model accuracy depends on data quality provided",
      "Dashboard design requires client brand guidelines",
      "Third-party data source APIs to be provided",
    ],
    [
      { id: "li-1", category: "Data Engineering", description: "Data pipeline setup and ETL development", quantity: 1, unit: "Project", unitPrice: 15000, amount: 15000 },
      { id: "li-2", category: "Dashboard", description: "Interactive dashboard with real-time charts", quantity: 1, unit: "Project", unitPrice: 20000, amount: 20000 },
      { id: "li-3", category: "ML/AI", description: "Predictive model development and integration", quantity: 1, unit: "Project", unitPrice: 30000, amount: 30000 },
      { id: "li-4", category: "Backend", description: "API development and database optimization", quantity: 1, unit: "Project", unitPrice: 15000, amount: 15000 },
      { id: "li-5", category: "Testing", description: "Quality assurance and performance testing", quantity: 1, unit: "Project", unitPrice: 8000, amount: 8000 },
      { id: "li-6", category: "Deployment", description: "Cloud deployment and CI/CD setup", quantity: 1, unit: "Project", unitPrice: 7000, amount: 7000 },
    ],
    "30% upfront, 40% on milestone 1, 30% on delivery",
    45,
    "16 weeks from project kickoff",
    "12 months post-deployment",
    [
      { milestone: "Project Initiation & Design", percentage: 30, amount: 28500 },
      { milestone: "Development & Integration", percentage: 40, amount: 38000 },
      { milestone: "Final Delivery & Handover", percentage: 30, amount: 28500 },
    ],
    "Premium pricing reflects advanced ML/AI capabilities.",
    "1. All code developed will be the exclusive property of Cyberdyne Systems.\n2. Any third-party ML models used will be subject to their respective licenses.\n3. SLA of 99.9% uptime for the production environment.",
    0, 18,
    [
      { id: 1, action: "Proposal created", fromStatus: "Draft", toStatus: "Draft", timestamp: "2026-06-20T09:00:00Z", performedBy: "Bob Smith", notes: "Initial draft created" },
      { id: 2, action: "Proposal sent", fromStatus: "Draft", toStatus: "Sent", timestamp: "2026-06-21T11:00:00Z", performedBy: "Bob Smith", notes: "Sent to client" },
      { id: 3, action: "Client approved", fromStatus: "Sent", toStatus: "Approved", timestamp: "2026-06-28T15:00:00Z", performedBy: "System", notes: "Client accepted the proposal as-is" },
    ]
  ),

  makeProposal(
    3, "BP-2026-003", "Vijay Kumar", "Kingfisher Solutions",
    "vijay@kingfisher.com", "+91 98765 43212",
    "Draft", "2026-07-14", today,
    "Kingfisher Solutions requires a complete E-Commerce platform upgrade including modern UI/UX, payment gateway integration, and inventory management.",
    [
      "Modernize existing e-commerce platform UI",
      "Integrate multiple payment gateways",
      "Implement real-time inventory management",
      "Add advanced search and product filtering",
    ],
    [
      "Support for 10,000+ products in catalog",
      "PCI-DSS compliant payment processing",
      "Integration with existing ERP for order management",
      "Mobile-first responsive design",
    ],
    [
      "Redesigned e-commerce frontend",
      "Payment gateway integration (Razorpay, Stripe)",
      "Inventory management module",
      "Performance optimization report",
    ],
    [
      "Client will provide access to existing codebase",
      "Design assets and brand guidelines to be provided",
      "Payment gateway accounts to be set up by client",
    ],
    [
      "Legacy database schema may require migration efforts",
      "Third-party API rate limits may affect integration",
      "Timeline assumes existing infrastructure remains stable",
    ],
    [
      { id: "li-1", category: "UI/UX", description: "Frontend redesign and UX improvements", quantity: 1, unit: "Project", unitPrice: 6000, amount: 6000 },
      { id: "li-2", category: "Frontend", description: "React-based storefront development", quantity: 1, unit: "Project", unitPrice: 8000, amount: 8000 },
      { id: "li-3", category: "Backend", description: "API optimization and new endpoint development", quantity: 1, unit: "Project", unitPrice: 6000, amount: 6000 },
      { id: "li-4", category: "Payments", description: "Payment gateway integration and testing", quantity: 1, unit: "Project", unitPrice: 4000, amount: 4000 },
      { id: "li-5", category: "Inventory", description: "Real-time inventory management module", quantity: 1, unit: "Project", unitPrice: 5000, amount: 5000 },
    ],
    "50% upfront, 50% on delivery",
    30,
    "8 weeks from project kickoff",
    "3 months post-deployment",
    [
      { milestone: "Project Kickoff & Design Approval", percentage: 50, amount: 14500 },
      { milestone: "Final Delivery & Go-Live", percentage: 50, amount: 14500 },
    ],
    "Preliminary draft - awaiting client feedback on scope.",
    "1. Code ownership will be transferred upon final payment.\n2. Third-party payment gateway fees are not included.\n3. Additional features beyond scope will require a change order.",
    0, 18,
    [
      { id: 1, action: "Proposal created", fromStatus: "Draft", toStatus: "Draft", timestamp: "2026-07-14T10:30:00Z", performedBy: "Alice Johnson", notes: "Initial draft created based on discovery call" },
    ]
  ),

  makeProposal(
    4, "BP-2026-004", "Diana Prince", "SpaceX Logistics",
    "diana@spacexlogistics.com", "+91 98765 43213",
    "Converted", "2026-06-01", daysAgo(20),
    "SpaceX Logistics requires a mobile fleet tracking application with real-time GPS monitoring, route optimization, and driver management.",
    [
      "Real-time GPS tracking of all fleet vehicles",
      "Route optimization and dispatching",
      "Driver performance monitoring and reporting",
      "Automated maintenance alerts and scheduling",
    ],
    [
      "Support for 200+ vehicles simultaneously",
      "Offline mode for areas with poor connectivity",
      "Battery-efficient GPS tracking",
      "Integration with existing dispatch system",
    ],
    [
      "Mobile app (iOS & Android) for drivers",
      "Web dashboard for fleet managers",
      "Real-time tracking API for third-party integration",
      "Monthly performance analytics reports",
    ],
    [
      "Client will provide GPS hardware specifications",
      "Client dispatch team will participate in UAT",
      "App store accounts for publishing to be provided",
    ],
    [
      "App store review timelines are outside our control",
      "GPS accuracy depends on device hardware capabilities",
      "Cellular data costs are not included in pricing",
    ],
    [
      { id: "li-1", category: "Mobile App", description: "Cross-platform mobile app development", quantity: 1, unit: "Project", unitPrice: 18000, amount: 18000 },
      { id: "li-2", category: "Backend", description: "Real-time tracking backend and APIs", quantity: 1, unit: "Project", unitPrice: 12000, amount: 12000 },
      { id: "li-3", category: "Dashboard", description: "Web-based fleet management dashboard", quantity: 1, unit: "Project", unitPrice: 8000, amount: 8000 },
      { id: "li-4", category: "Integration", description: "Dispatch system integration and testing", quantity: 1, unit: "Project", unitPrice: 5000, amount: 5000 },
      { id: "li-5", category: "Testing", description: "Field testing and quality assurance", quantity: 1, unit: "Project", unitPrice: 5000, amount: 5000 },
      { id: "li-6", category: "Deployment", description: "App store deployment and go-live support", quantity: 1, unit: "Project", unitPrice: 2000, amount: 2000 },
    ],
    "Net 30 from invoice date",
    30,
    "10 weeks from project kickoff",
    "6 months post-deployment",
    [
      { milestone: "Design & Development", percentage: 60, amount: 30000 },
      { milestone: "Testing & Deployment", percentage: 40, amount: 20000 },
    ],
    "Converted to client - project completed successfully.",
    "1. Full IP transfer upon final payment.\n2. App store accounts to be maintained by client post-launch.\n3. Hosting costs are not included.",
    0, 18,
    [
      { id: 1, action: "Proposal created", fromStatus: "Draft", toStatus: "Draft", timestamp: "2026-06-01T08:00:00Z", performedBy: "Bob Smith", notes: "Initial draft" },
      { id: 2, action: "Proposal sent", fromStatus: "Draft", toStatus: "Sent", timestamp: "2026-06-02T10:00:00Z", performedBy: "Bob Smith", notes: "Sent to client" },
      { id: 3, action: "Client approved", fromStatus: "Sent", toStatus: "Approved", timestamp: "2026-06-05T14:00:00Z", performedBy: "System", notes: "Approved by Diana Prince" },
      { id: 4, action: "Lead converted to client", fromStatus: "Approved", toStatus: "Converted", timestamp: "2026-06-10T09:00:00Z", performedBy: "System", notes: "Project initiated - lead converted to client" },
    ]
  ),

  makeProposal(
    5, "BP-2026-005", "Evan Wright", "Quantum Systems",
    "evan@quantumsystems.com", "+91 98765 43214",
    "Rejected", "2026-05-10", daysAgo(30),
    "Quantum Systems requested a proposal for building a custom CRM platform integrated with their proprietary AI engine.",
    [
      "Build custom CRM platform from scratch",
      "Integrate Quantum's proprietary AI engine",
      "Automated lead scoring and prediction",
      "Custom reporting and analytics dashboard",
    ],
    [
      "Support for 1,000+ users",
      "Integration with Quantum's existing IT infrastructure",
      "Customizable workflow automation engine",
      "GDPR and SOC2 compliance readiness",
    ],
    [
      "Custom CRM platform with AI integration",
      "Lead scoring engine documentation",
      "API documentation for future extensions",
      "Administrator training and system handover",
    ],
    [
      "Client will provide AI engine API documentation",
      "Client IT security team will conduct security audit",
      "Client will provide design mockups and brand guidelines",
    ],
    [
      "AI engine limitations may impact feature scope",
      "Security compliance certifications may require additional time",
      "Custom CRM development requires extensive requirements gathering",
    ],
    [
      { id: "li-1", category: "CRM Core", description: "Custom CRM platform development", quantity: 1, unit: "Project", unitPrice: 35000, amount: 35000 },
      { id: "li-2", category: "AI Integration", description: "Proprietary AI engine integration", quantity: 1, unit: "Project", unitPrice: 15000, amount: 15000 },
      { id: "li-3", category: "Workflow", description: "Automated workflow and lead scoring engine", quantity: 1, unit: "Project", unitPrice: 12000, amount: 12000 },
      { id: "li-4", category: "Reporting", description: "Custom analytics and reporting dashboard", quantity: 1, unit: "Project", unitPrice: 8000, amount: 8000 },
      { id: "li-5", category: "Integration", description: "Existing system integration and data migration", quantity: 1, unit: "Project", unitPrice: 10000, amount: 10000 },
    ],
    "Net 45 from invoice",
    30,
    "20 weeks from project kickoff",
    "12 months post-deployment",
    [
      { milestone: "Requirements & Design", percentage: 25, amount: 20000 },
      { milestone: "Development Sprint 1", percentage: 30, amount: 24000 },
      { milestone: "Development Sprint 2", percentage: 30, amount: 24000 },
      { milestone: "Testing & Deployment", percentage: 15, amount: 12000 },
    ],
    "Client decided to build in-house instead.",
    "Standard terms and conditions apply.",
    0, 18,
    [
      { id: 1, action: "Proposal created", fromStatus: "Draft", toStatus: "Draft", timestamp: "2026-05-10T11:00:00Z", performedBy: "Alice Johnson", notes: "Created initial draft" },
      { id: 2, action: "Proposal sent", fromStatus: "Draft", toStatus: "Sent", timestamp: "2026-05-12T09:00:00Z", performedBy: "Alice Johnson", notes: "Sent to Evan Wright" },
      { id: 3, action: "Client declined", fromStatus: "Sent", toStatus: "Rejected", timestamp: "2026-05-20T16:00:00Z", performedBy: "System", notes: "Quantum Systems decided to build CRM in-house" },
    ]
  ),

  makeProposal(
    6, "BP-2026-006", "Fiona George", "Alphabet Web Services",
    "fiona@alphabetwebservices.com", "+91 98765 43215",
    "Under Review", "2026-07-10", daysAgo(1),
    "Alphabet Web Services needs a Big Data processing integration pipeline for their web analytics platform.",
    [
      "Build real-time data ingestion pipeline",
      "Implement data transformation and cleansing",
      "Integrate with existing analytics dashboard",
      "Set up automated reporting and alerts",
    ],
    [
      "Process 5TB+ data daily",
      "Support for streaming and batch processing",
      "Integration with AWS and GCP services",
      "Data retention and archival policies",
    ],
    [
      "Data ingestion pipeline architecture",
      "Transformation and cleansing modules",
      "Integration adapters for analytics dashboard",
      "Operational runbooks and monitoring setup",
    ],
    [
      "Client will provide sample data streams",
      "Cloud infrastructure will be provisioned by client",
      "Security compliance requirements to be shared",
    ],
    [
      "Data volume may require additional optimization",
      "Cloud costs are separate and will be borne by client",
      "Third-party data source availability is assumed stable",
    ],
    [
      { id: "li-1", category: "Data Pipeline", description: "Real-time data ingestion pipeline", quantity: 1, unit: "Project", unitPrice: 20000, amount: 20000 },
      { id: "li-2", category: "Processing", description: "Data transformation and cleansing framework", quantity: 1, unit: "Project", unitPrice: 15000, amount: 15000 },
      { id: "li-3", category: "Integration", description: "Analytics dashboard integration adapters", quantity: 1, unit: "Project", unitPrice: 10000, amount: 10000 },
      { id: "li-4", category: "Automation", description: "Automated reporting and alerting system", quantity: 1, unit: "Project", unitPrice: 5000, amount: 5000 },
      { id: "li-5", category: "Documentation", description: "Technical documentation and runbooks", quantity: 1, unit: "Project", unitPrice: 3000, amount: 3000 },
    ],
    "Net 30, milestone-based invoicing",
    30,
    "12 weeks from project kickoff",
    "6 months post-deployment",
    [
      { milestone: "Architecture & Design", percentage: 30, amount: 15900 },
      { milestone: "Development & Testing", percentage: 50, amount: 26500 },
      { milestone: "Deployment & Handover", percentage: 20, amount: 10600 },
    ],
    "Awaiting client review - follow-up scheduled.",
    "Standard terms apply.",
    0, 18,
    [
      { id: 1, action: "Proposal created", fromStatus: "Draft", toStatus: "Draft", timestamp: "2026-07-10T14:00:00Z", performedBy: "Bob Smith", notes: "Created initial proposal" },
      { id: 2, action: "Proposal sent", fromStatus: "Draft", toStatus: "Sent", timestamp: "2026-07-11T10:00:00Z", performedBy: "Bob Smith", notes: "Sent to Fiona George" },
      { id: 3, action: "Client reviewing", fromStatus: "Sent", toStatus: "Under Review", timestamp: daysAgo(2) + "T09:30:00Z", performedBy: "System", notes: "Client acknowledged and is reviewing the proposal" },
    ]
  ),

  makeProposal(
    7, "BP-2026-007", "George Brown", "Nexus Creators",
    "george@nexuscreators.com", "+91 98765 43216",
    "Sent", daysAgo(2), daysAgo(1),
    "Nexus Creators is looking to build a cross-platform mobile application for their content creation marketplace connecting freelancers with clients.",
    [
      "Build cross-platform mobile app (iOS & Android)",
      "Implement real-time chat and collaboration features",
      "Add payment processing and escrow system",
      "Create portfolio showcase and review system",
    ],
    [
      "Support for 50,000+ concurrent users",
      "Push notification infrastructure",
      "Real-time messaging using WebSockets",
      "Integration with Stripe Connect for payments",
    ],
    [
      "Cross-platform mobile app (React Native)",
      "Admin dashboard and moderation tools",
      "Payment and escrow system integration",
      "API documentation and deployment guide",
    ],
    [
      "Client will provide UI/UX design assets and brand guidelines",
      "App store developer accounts to be set up by client",
      "Third-party API keys (Stripe, Firebase) to be provided",
    ],
    [
      "App store review timelines could affect launch dates",
      "Payment gateway fees are not included in pricing",
      "Ongoing server costs post-deployment are client's responsibility",
    ],
    [
      { id: "li-1", category: "Mobile App", description: "Cross-platform mobile app development (React Native)", quantity: 1, unit: "Project", unitPrice: 25000, amount: 25000 },
      { id: "li-2", category: "Backend", description: "Node.js backend with real-time messaging and APIs", quantity: 1, unit: "Project", unitPrice: 18000, amount: 18000 },
      { id: "li-3", category: "Payments", description: "Stripe Connect integration with escrow system", quantity: 1, unit: "Project", unitPrice: 8000, amount: 8000 },
      { id: "li-4", category: "Admin Panel", description: "Web-based admin dashboard for moderation and analytics", quantity: 1, unit: "Project", unitPrice: 7000, amount: 7000 },
      { id: "li-5", category: "Testing", description: "QA testing, performance testing, and security audit", quantity: 1, unit: "Project", unitPrice: 5000, amount: 5000 },
      { id: "li-6", category: "Deployment", description: "App store deployment, CI/CD, and launch support", quantity: 1, unit: "Project", unitPrice: 3000, amount: 3000 },
    ],
    "50% upfront on agreement, 25% on alpha release, 25% on final delivery",
    30,
    "16 weeks from project kickoff",
    "6 months post-deployment bug fixes",
    [
      { milestone: "Project Kickoff & Agreement", percentage: 50, amount: 33000 },
      { milestone: "Alpha Release & Client Review", percentage: 25, amount: 16500 },
      { milestone: "Final Delivery & Launch", percentage: 25, amount: 16500 },
    ],
    "Awaiting client response. Follow-up call scheduled for next Tuesday.",
    "1. All source code developed shall be the property of Nexus Creators upon final payment.\n2. Any change requests after scope sign-off will be billed separately at $100/hour.\n3. Confidentiality of all platform data and business logic will be maintained.",
    0, 18,
    [
      { id: 1, action: "Proposal created", fromStatus: "Draft", toStatus: "Draft", timestamp: daysAgo(2) + "T14:00:00Z", performedBy: "Alice Johnson", notes: "Created proposal based on discovery call requirements" },
      { id: 2, action: "Proposal sent", fromStatus: "Draft", toStatus: "Sent", timestamp: daysAgo(1) + "T11:00:00Z", performedBy: "Alice Johnson", notes: "Sent to George Brown via email" },
    ]
  ),
];
