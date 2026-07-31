import { Link, useLocation } from "react-router";
import { getStorage } from "../../utils/storage";
import { initialLeads } from "../../modules/LeadManagement/data/leadsData";
import { initialClients } from "../../modules/ClientManagement/data/clientsData";
import { initialMeetings } from "../../modules/MeetingManagement/data/meetingsData";
import { initialProposals } from "../../modules/Quotation/data/quotationsData";

interface BreadcrumbProps {
  pageTitle: string;
}

// Helper functions to get entity names from local storage matching route IDs
const getLeadName = (id: string | number): string => {
  const leads = getStorage<any[]>("saiflow_leads", initialLeads);
  const lead = leads.find((l) => String(l.id) === String(id));
  if (!lead) return `Lead #${id}`;
  return lead.company || lead.contactPerson || `Lead #${id}`;
};

const getClientName = (id: string | number): string => {
  const clients = getStorage<any[]>("saiflow_clients", initialClients);
  const client = clients.find((c) => String(c.id) === String(id));
  if (!client) return `Client #${id}`;
  return client.company || client.name || `Client #${id}`;
};

const getMeetingTitle = (id: string | number): string => {
  const meetings = getStorage<any[]>("saiflow_meetings", initialMeetings);
  const meeting = meetings.find((m) => String(m.id) === String(id));
  if (!meeting) return `Meeting #${id}`;
  return meeting.subject || `Meeting #${id}`;
};

const getUserName = (id: string | number): string => {
  const users = getStorage<any[]>("saiflow_users", []);
  const user = users.find((u) => String(u.id) === String(id));
  if (!user) return `User #${id}`;
  return user.name || `User #${id}`;
};

const getProposalNo = (id: string | number): string => {
  const proposals = getStorage<any[]>("saiflow_proposals", initialProposals);
  const proposal = proposals.find((p) => String(p.id) === String(id));
  if (!proposal) return `Proposal #${id}`;
  return proposal.proposalNo || `Proposal #${id}`;
};

const MASTER_LABELS: Record<string, string> = {
  countries: "Country",
  states: "State",
  cities: "City",
  departments: "Department",
  designations: "Designation",
  "lead-sources": "Lead source",
  industries: "Industry",
  "tech-stack": "Tech stack",
  priorities: "Priority",
  services: "Service",
  "company-types": "Company type",
  "payment-types": "Payment type",
};

const MASTER_SINGULARS: Record<string, string> = {
  countries: "country",
  states: "state",
  cities: "city",
  departments: "department",
  designations: "designation",
  "lead-sources": "lead source",
  industries: "industry",
  "tech-stack": "tech",
  priorities: "priority",
  services: "service",
  "company-types": "company type",
  "payment-types": "payment type",
};

const MASTER_KEYS: Record<string, string> = {
  countries: "saiflow_master_countries",
  states: "saiflow_master_states",
  cities: "saiflow_master_cities",
  departments: "saiflow_master_departments",
  designations: "saiflow_master_designations",
  "lead-sources": "saiflow_master_lead_sources",
  industries: "saiflow_master_industries",
  "tech-stack": "saiflow_master_technologies",
  priorities: "saiflow_master_priorities",
  services: "saiflow_master_services",
  "company-types": "saiflow_master_company_types",
  "payment-types": "saiflow_master_payment_types",
};

const getMasterItemName = (tab: string, id: string | number): string => {
  const key = MASTER_KEYS[tab];
  if (!key) return `Item #${id}`;
  const items = getStorage<any[]>(key, []);
  const item = items.find((i) => String(i.id) === String(id));
  return item ? item.name : `Item #${id}`;
};

const REPORT_LABELS: Record<string, string> = {
  leads: "Lead report",
  meetings: "Meeting report",
  employees: "Employee report",
  "follow-ups": "Follow-up report",
};

const PageBreadcrumb: React.FC<BreadcrumbProps> = ({ pageTitle }) => {
  const location = useLocation();
  const pathname = location.pathname;

  // Hide breadcrumbs on Login, Register, Forgot Password, Reset Password, etc.
  const isAuthPage = ["/signin", "/signup", "/forgot-password", "/reset-password"].some((p) =>
    pathname.startsWith(p)
  );
  if (isAuthPage) return null;

  // Generate breadcrumb trail
  const breadcrumbs: { label: string; to?: string }[] = [];

  // Check if current route is the main dashboard or root path
  const isDashboard = pathname === "/" || pathname === "/dashboard" || pathname === "";

  if (isDashboard) {
    breadcrumbs.push({ label: "Dashboard" });
  } else {
    // Every route starts with Dashboard as a clickable intermediate path
    breadcrumbs.push({ label: "Dashboard", to: "/dashboard" });

    if (pathname.startsWith("/master/")) {
      const parts = pathname.split("/").filter(Boolean); // ['master', 'countries', 'add'] or ['master', 'countries', '1', 'edit']
      const tab = parts[1];
      const actionOrId = parts[2];
      const isAdd = actionOrId === "add";
      const id = isAdd ? null : actionOrId;
      const isEdit = parts[3] === "edit";

      const pluralLabel = MASTER_LABELS[tab] || tab;
      const singularLabel = MASTER_SINGULARS[tab] || "item";

      breadcrumbs.push({ label: "Master", to: `/master/${tab}` });

      if (isAdd) {
        breadcrumbs.push({ label: pluralLabel, to: `/master/${tab}` });
        breadcrumbs.push({ label: `Add ${singularLabel}` });
      } else if (id && isEdit) {
        const itemName = getMasterItemName(tab, id);
        breadcrumbs.push({ label: pluralLabel, to: `/master/${tab}` });
        breadcrumbs.push({ label: `Edit ${itemName}` });
      } else {
        breadcrumbs.push({ label: pluralLabel });
      }
    } else if (pathname === "/users") {
      breadcrumbs.push({ label: "Manage Users", to: "/users" });
      breadcrumbs.push({ label: "Users" });
    } else if (pathname === "/users/add") {
      breadcrumbs.push({ label: "Manage Users", to: "/users" });
      breadcrumbs.push({ label: "Users", to: "/users" });
      breadcrumbs.push({ label: "Add user" });
    } else if (pathname.startsWith("/users/")) {
      const parts = pathname.split("/");
      const userId = parts[2];
      const isEdit = parts[3] === "edit";
      const userName = getUserName(userId);

      breadcrumbs.push({ label: "Manage Users", to: "/users" });
      breadcrumbs.push({ label: "Users", to: "/users" });
      if (isEdit) {
        breadcrumbs.push({ label: userName, to: `/users/${userId}` });
        breadcrumbs.push({ label: "Edit user" });
      } else {
        breadcrumbs.push({ label: userName });
      }
    } else if (pathname === "/roles") {
      breadcrumbs.push({ label: "Manage Users", to: "/users" });
      breadcrumbs.push({ label: "User Roles" });
    } else if (pathname === "/roles/add") {
      breadcrumbs.push({ label: "Manage Users", to: "/users" });
      breadcrumbs.push({ label: "User Roles", to: "/roles" });
      breadcrumbs.push({ label: "Add role" });
    } else if (pathname.startsWith("/roles/")) {
      const parts = pathname.split("/");
      const id = parts[2];
      const isEdit = parts[3] === "edit";
      const isView = parts[3] === "view";

      const roles = getStorage<any[]>("saiflow_roles", []);
      const role = roles.find((r) => String(r.id) === String(id));
      const roleLabel = role ? role.roleName : `Role #${id}`;

      breadcrumbs.push({ label: "Manage Users", to: "/users" });
      breadcrumbs.push({ label: "User Roles", to: "/roles" });
      if (isEdit) {
        breadcrumbs.push({ label: `Edit ${roleLabel}` });
      } else if (isView) {
        breadcrumbs.push({ label: `View ${roleLabel}` });
      } else {
        breadcrumbs.push({ label: roleLabel });
      }
    } else if (pathname === "/leads") {
      breadcrumbs.push({ label: "Leads" });
    } else if (pathname === "/leads/add") {
      breadcrumbs.push({ label: "Leads", to: "/leads" });
      breadcrumbs.push({ label: "Add lead" });
    } else if (pathname.startsWith("/leads/")) {
      const parts = pathname.split("/");
      const id = parts[2];
      const isEdit = parts[3] === "edit";
      const leadName = getLeadName(id);

      breadcrumbs.push({ label: "Leads", to: "/leads" });
      if (isEdit) {
        breadcrumbs.push({ label: leadName, to: `/leads/${id}` });
        breadcrumbs.push({ label: "Edit lead" });
      } else {
        breadcrumbs.push({ label: leadName });
      }
    } else if (pathname === "/connect/contacts") {
      breadcrumbs.push({ label: "Connect", to: "/connect/contacts" });
      breadcrumbs.push({ label: "Contacts" });
    } else if (pathname === "/connect/follow-ups") {
      breadcrumbs.push({ label: "Connect", to: "/connect/contacts" });
      breadcrumbs.push({ label: "Follow-ups" });
    } else if (pathname.startsWith("/connect/follow-ups/")) {
      const parts = pathname.split("/");
      const id = parts[3];
      const leadName = getLeadName(id);

      breadcrumbs.push({ label: "Connect", to: "/connect/contacts" });
      breadcrumbs.push({ label: "Follow-ups", to: "/connect/follow-ups" });
      breadcrumbs.push({ label: leadName });
    } else if (pathname.startsWith("/connect/")) {
      const parts = pathname.split("/");
      const id = parts[2];
      const leadName = getLeadName(id);

      breadcrumbs.push({ label: "Connect", to: "/connect/contacts" });
      breadcrumbs.push({ label: "Contacts", to: "/connect/contacts" });
      breadcrumbs.push({ label: leadName });
    } else if (pathname === "/meetings") {
      breadcrumbs.push({ label: "Meetings" });
    } else if (pathname === "/meetings/add") {
      breadcrumbs.push({ label: "Meetings", to: "/meetings" });
      breadcrumbs.push({ label: "Schedule meeting" });
    } else if (pathname.startsWith("/meetings/")) {
      const parts = pathname.split("/");
      const id = parts[2];
      const isEdit = parts[3] === "edit";
      const meetingTitle = getMeetingTitle(id);

      breadcrumbs.push({ label: "Meetings", to: "/meetings" });
      if (isEdit) {
        breadcrumbs.push({ label: meetingTitle, to: `/meetings/${id}` });
        breadcrumbs.push({ label: "Edit meeting" });
      } else {
        breadcrumbs.push({ label: meetingTitle });
      }
    } else if (pathname === "/clients") {
      breadcrumbs.push({ label: "Clients" });
    } else if (pathname === "/clients/add") {
      breadcrumbs.push({ label: "Clients", to: "/clients" });
      breadcrumbs.push({ label: "Add client" });
    } else if (pathname.startsWith("/clients/")) {
      const parts = pathname.split("/");
      const id = parts[2];
      const isEdit = parts[3] === "edit";
      const clientName = getClientName(id);

      breadcrumbs.push({ label: "Clients", to: "/clients" });
      if (isEdit) {
        breadcrumbs.push({ label: clientName, to: `/clients/${id}` });
        breadcrumbs.push({ label: "Edit client" });
      } else {
        breadcrumbs.push({ label: clientName });
      }
    } else if (pathname === "/proposals") {
      breadcrumbs.push({ label: "Proposals" });
    } else if (pathname === "/proposals/add") {
      breadcrumbs.push({ label: "Proposals", to: "/proposals" });
      breadcrumbs.push({ label: "New proposal" });
    } else if (pathname.startsWith("/proposals/")) {
      const parts = pathname.split("/");
      const id = parts[2];
      const isEdit = parts[3] === "edit";
      const proposalNo = getProposalNo(id);

      breadcrumbs.push({ label: "Proposals", to: "/proposals" });
      if (isEdit) {
        breadcrumbs.push({ label: proposalNo, to: `/proposals` });
        breadcrumbs.push({ label: "Edit proposal" });
      } else {
        breadcrumbs.push({ label: proposalNo });
      }
    } else if (pathname.startsWith("/reports/")) {
      const sub = pathname.replace("/reports/", "");
      breadcrumbs.push({ label: "Reports", to: "/reports/leads" });
      breadcrumbs.push({ label: REPORT_LABELS[sub] || sub });
    } else if (pathname === "/settings") {
      breadcrumbs.push({ label: "Settings" });
    } else if (pathname === "/profile") {
      breadcrumbs.push({ label: "Profile" });
    } else if (pathname === "/change-password") {
      breadcrumbs.push({ label: "Change Password" });
    } else {
      breadcrumbs.push({ label: pageTitle });
    }
  }

  // The title on the left is the label of the current page (last item in breadcrumbs)
  const resolvedTitle = breadcrumbs[breadcrumbs.length - 1]?.label || pageTitle;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
        {resolvedTitle}
      </h2>
      <nav>
        <ol className="flex flex-wrap items-center gap-1.5">
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <li key={index} className="flex items-center gap-1.5">
                {item.to ? (
                  <Link
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors animate-fade-in"
                    to={item.to}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {item.label}
                  </span>
                )}
                {!isLast && (
                  <svg
                    className="stroke-current text-gray-400 dark:text-gray-600"
                    width="17"
                    height="16"
                    viewBox="0 0 17 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
};

export default PageBreadcrumb;
