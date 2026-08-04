import { Link, useLocation } from "react-router";

interface BreadcrumbProps {
  pageTitle: string;
}

// Helper functions to get entity names matching route IDs
const getLeadName = (id: string | number): string => {
  return `Lead #${id}`;
};

const getClientName = (id: string | number): string => {
  return `Client #${id}`;
};

const getMeetingTitle = (id: string | number): string => {
  return `Meeting #${id}`;
};

const getUserName = (): string => {
  return "User Details";
};

const getProposalNo = (id: string | number): string => {
  return `Proposal #${id}`;
};

const MASTER_LABELS: Record<string, string> = {
  countries: "Country",
  states: "State",
  cities: "City",
  departments: "Department",
  designations: "Designation",
  "lead-sources": "Lead Source",
  industries: "Industry",
  "tech-stack": "Tech Stack",
  priorities: "Priority",
  services: "Service",
  "company-types": "Company Type",
  "payment-types": "Payment Type",
  "followup-types": "Follow-Up Type",
};

const MASTER_SINGULARS: Record<string, string> = {
  countries: "Country",
  states: "State",
  cities: "City",
  departments: "Department",
  designations: "Designation",
  "lead-sources": "Lead Source",
  industries: "Industry",
  "tech-stack": "Tech",
  priorities: "Priority",
  services: "Service",
  "company-types": "Company Type",
  "payment-types": "Payment Type",
  "followup-types": "Follow-Up Type",
};

const getMasterItemName = (id: string | number): string => {
  return `Item #${id}`;
};

const REPORT_LABELS: Record<string, string> = {
  leads: "Lead Report",
  meetings: "Meeting Report",
  employees: "Employee Report",
  "follow-ups": "Follow-Up Report",
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
        const itemName = getMasterItemName(id);
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
      breadcrumbs.push({ label: "Add User" });
    } else if (pathname.startsWith("/users/")) {
      const parts = pathname.split("/");
      const userId = parts[2];
      const isEdit = parts[3] === "edit";
      const userName = getUserName();

      breadcrumbs.push({ label: "Manage Users", to: "/users" });
      breadcrumbs.push({ label: "Users", to: "/users" });
      if (isEdit) {
        breadcrumbs.push({ label: userName, to: `/users/${userId}` });
        breadcrumbs.push({ label: "Edit User" });
      } else {
        breadcrumbs.push({ label: userName });
      }
    } else if (pathname === "/roles") {
      breadcrumbs.push({ label: "Manage Users", to: "/users" });
      breadcrumbs.push({ label: "User Roles" });
    } else if (pathname === "/roles/add") {
      breadcrumbs.push({ label: "Manage Users", to: "/users" });
      breadcrumbs.push({ label: "User Roles", to: "/roles" });
      breadcrumbs.push({ label: "Add Role" });
    } else if (pathname.startsWith("/roles/")) {
      const parts = pathname.split("/");
      const id = parts[2];
      const isEdit = parts[3] === "edit";
      const isView = parts[3] === "view";

      const roleLabel = `Role #${id}`;

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
      breadcrumbs.push({ label: "Add Lead" });
    } else if (pathname.startsWith("/leads/")) {
      const parts = pathname.split("/");
      const id = parts[2];
      const isEdit = parts[3] === "edit";
      const leadName = getLeadName(id);

      breadcrumbs.push({ label: "Leads", to: "/leads" });
      if (isEdit) {
        breadcrumbs.push({ label: leadName, to: `/leads/${id}` });
        breadcrumbs.push({ label: "Edit Lead" });
      } else {
        breadcrumbs.push({ label: leadName });
      }
    } else if (pathname === "/connect/contacts") {
      breadcrumbs.push({ label: "Connect", to: "/connect/contacts" });
      breadcrumbs.push({ label: "Contacts" });
    } else if (pathname === "/connect/follow-ups") {
      breadcrumbs.push({ label: "Connect", to: "/connect/contacts" });
      breadcrumbs.push({ label: "Follow-Ups" });
    } else if (pathname.startsWith("/connect/follow-ups/")) {
      const parts = pathname.split("/");
      const id = parts[3];
      const leadName = getLeadName(id);

      breadcrumbs.push({ label: "Connect", to: "/connect/contacts" });
      breadcrumbs.push({ label: "Follow-Ups", to: "/connect/follow-ups" });
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
      breadcrumbs.push({ label: "Schedule Meeting" });
    } else if (pathname.startsWith("/meetings/")) {
      const parts = pathname.split("/");
      const id = parts[2];
      const isEdit = parts[3] === "edit";
      const meetingTitle = getMeetingTitle(id);

      breadcrumbs.push({ label: "Meetings", to: "/meetings" });
      if (isEdit) {
        breadcrumbs.push({ label: meetingTitle, to: `/meetings/${id}` });
        breadcrumbs.push({ label: "Edit Meeting" });
      } else {
        breadcrumbs.push({ label: meetingTitle });
      }
    } else if (pathname === "/clients") {
      breadcrumbs.push({ label: "Clients" });
    } else if (pathname === "/clients/add") {
      breadcrumbs.push({ label: "Clients", to: "/clients" });
      breadcrumbs.push({ label: "Add Client" });
    } else if (pathname.startsWith("/clients/")) {
      const parts = pathname.split("/");
      const id = parts[2];
      const isEdit = parts[3] === "edit";
      const clientName = getClientName(id);

      breadcrumbs.push({ label: "Clients", to: "/clients" });
      if (isEdit) {
        breadcrumbs.push({ label: clientName, to: `/clients/${id}` });
        breadcrumbs.push({ label: "Edit Client" });
      } else {
        breadcrumbs.push({ label: clientName });
      }
    } else if (pathname === "/proposals") {
      breadcrumbs.push({ label: "Proposals" });
    } else if (pathname === "/proposals/add") {
      breadcrumbs.push({ label: "Proposals", to: "/proposals" });
      breadcrumbs.push({ label: "New Proposal" });
    } else if (pathname.startsWith("/proposals/")) {
      const parts = pathname.split("/");
      const id = parts[2];
      const isEdit = parts[3] === "edit";
      const proposalNo = getProposalNo(id);

      breadcrumbs.push({ label: "Proposals", to: "/proposals" });
      if (isEdit) {
        breadcrumbs.push({ label: proposalNo, to: `/proposals` });
        breadcrumbs.push({ label: "Edit Proposal" });
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
