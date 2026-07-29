import { useCallback, useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { useSidebar } from "../context/SidebarContext";
import {
  MdDashboard,
  MdBusinessCenter,
  MdCall,
  MdEvent,
  MdAssessment,
  MdSettings,
  MdPeople,
  MdWork,
  MdAssignment,
  MdBugReport,
  MdCloudUpload,
  MdSupportAgent,
  MdReceiptLong,
  MdBusiness,
  MdDns,
} from "react-icons/md";
import { ChevronDownIcon } from "../icons";
import logo from "/images/logo/Saiflow.png"
import { getStorage } from "../utils/storage";


type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: {
    name: string;
    path: string;
  }[];
};

const navItems: NavItem[] = [
  {
    name: "Dashboard",
    icon: <MdDashboard className="size-5" />,
    path: "/dashboard",
  },
  {
    name: "Master",
    icon: <MdDns className="size-5" />,
    subItems: [
      { name: "Country", path: "/master/countries" },
      { name: "State", path: "/master/states" },
      { name: "City", path: "/master/cities" },
      { name: "Department", path: "/master/departments" },
      { name: "Designation", path: "/master/designations" },
      { name: "Lead source", path: "/master/lead-sources" },
      { name: "Industry", path: "/master/industries" },
      { name: "Tech stack", path: "/master/tech-stack" },
      { name: "Priority", path: "/master/priorities" },
      { name: "Service", path: "/master/services" },
      { name: "Company type", path: "/master/company-types" },
      { name: "Payment type", path: "/master/payment-types" },
    ],
  },
  {
    name: "Manage Users",
    icon: <MdPeople className="size-5" />,
    subItems: [
      { name: "User Roles", path: "/roles" },
      { name: "Users", path: "/users" },
    ],
  },
  {
    name: "Leads",
    icon: <MdBusinessCenter className="size-5" />,
    path: "/leads",
  },
  {
    name: "Connect",
    icon: <MdCall className="size-5" />,
    subItems: [
      { name: "All Leads", path: "/contacts/my-leads" },
      { name: "Follow-ups", path: "/contacts/follow-ups" },
    ],
  },
  {
    name: "Meetings",
    icon: <MdEvent className="size-5" />,
    path: "/meetings",
  },
  {
    name: "Proposals",
    icon: <MdReceiptLong className="size-5" />,
    path: "/proposals",
  },
  {
    name: "Clients",
    icon: <MdBusiness className="size-5" />,
    path: "/clients",
  },
  {
    name: "Projects",
    icon: <MdWork className="size-5" />,
    path: "/projects",
  },
  {
    name: "Tasks",
    icon: <MdAssignment className="size-5" />,
    path: "/tasks",
  },
  {
    name: "QA",
    icon: <MdBugReport className="size-5" />,
    path: "/qa",
  },
  {
    name: "Deployments",
    icon: <MdCloudUpload className="size-5" />,
    path: "/deployments",
  },
  {
    name: "Support",
    icon: <MdSupportAgent className="size-5" />,
    path: "/support",
  },
  {
    name: "Reports",
    icon: <MdAssessment className="size-5" />,
    subItems: [
      { name: "Lead report", path: "/reports/leads" },
      { name: "Meeting report", path: "/reports/meetings" },
      { name: "Employee report", path: "/reports/employees" },
      { name: "Follow-up report", path: "/reports/follow-ups" },
      { name: "Proposal report", path: "/reports/proposals" },
      { name: "Client report", path: "/reports/clients" },
    ],
  },
  {
    name: "Settings",
    icon: <MdSettings className="size-5" />,
    path: "/settings",
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();

  const loggedInUser = getStorage<any>("saiflow_logged_in_user", {
    name: "Admin User",
    email: "admin@gmail.com",
    role: "Administrator",
  });
  const isAdmin = loggedInUser?.role === "Administrator";

  const visibleNavItems = navItems.filter((nav) => {
    // Temporarily hide Projects, Tasks, QA, Deployments, Support
    const hiddenModules = ["Projects", "Tasks", "QA", "Deployments", "Support"];
    if (hiddenModules.includes(nav.name)) {
      return false;
    }

    if (isAdmin) {
      // Administrator: show ALL navigation items (full access)
      return true;
    } else {
      // Non-admin (specific users): hide "Master", "Manage Users", and "Reports"
      return nav.name !== "Master" && nav.name !== "Manage Users" && nav.name !== "Reports";
    }
  });

  const isMasterPath = location.pathname.startsWith("/master/");
  const isUserMgmtPath = location.pathname.startsWith("/users") || location.pathname.startsWith("/roles");
  const isLeadMgmtPath = location.pathname.startsWith("/leads");
  const isConnectPath = location.pathname.startsWith("/contacts");
  const isReportsPath = location.pathname.startsWith("/reports");

  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({
    "Master": isMasterPath,
    "Manage Users": isUserMgmtPath,
    "Leads": isLeadMgmtPath,
    "Connect": isConnectPath,
    "Reports": isReportsPath,
  });

  useEffect(() => {
    if (location.pathname.startsWith("/master/")) {
      setOpenSubMenus({ "Master": true });
    } else if (location.pathname.startsWith("/users") || location.pathname.startsWith("/roles")) {
      setOpenSubMenus({ "Manage Users": true });
    } else if (location.pathname.startsWith("/leads")) {
      setOpenSubMenus({ "Leads": true });
    } else if (location.pathname.startsWith("/contacts")) {
      setOpenSubMenus({ "Connect": true });
    } else if (location.pathname.startsWith("/reports")) {
      setOpenSubMenus({ "Reports": true });
    } else {
      setOpenSubMenus({});
    }
  }, [location.pathname]);

  const isActive = useCallback(
    (path: string) => {
      if (path === "/dashboard") {
        return location.pathname === "/" || location.pathname === "/dashboard";
      }
      return location.pathname.startsWith(path);
    },
    [location.pathname]
  );

  const isSubActive = useCallback(
    (subItems?: { path: string }[]) => {
      if (!subItems) return false;
      return subItems.some((sub) => {
        if (sub.path === "/contacts/my-leads") {
          return location.pathname.startsWith("/contacts") && !location.pathname.startsWith("/contacts/follow-ups");
        }
        if (sub.path === "/contacts/follow-ups") {
          return location.pathname.startsWith("/contacts/follow-ups");
        }
        return location.pathname.startsWith(sub.path);
      });
    },
    [location.pathname]
  );

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${isExpanded || isMobileOpen
          ? "w-[290px]"
          : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo Section */}
      <div className="py-8 flex justify-center">
        <Link to="/" className="flex items-center justify-center gap-2">
          {isExpanded || isHovered || isMobileOpen ? (
            <div className="flex items-center justify-center">
              <img src={logo} alt="Logo" className="w-32 h-auto dark:invert dark:hue-rotate-180" />
            </div>
          ) : (
            <img src={logo} alt="Logo" className="w-15 h-auto dark:invert dark:hue-rotate-180" />
          )}
        </Link>
      </div>

      {/* Navigation List */}
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar grow">
        <nav className="mb-6">
          <ul className="flex flex-col gap-2">
            {visibleNavItems.map((nav) => {
              const subItems = nav.subItems || [];
              const hasSubItems = subItems.length > 0;
              const isSubOpen = openSubMenus[nav.name] || isSubActive(subItems);
              const parentActive = hasSubItems ? isSubActive(subItems) : (nav.path ? isActive(nav.path) : false);

              return (
                <li key={nav.name} className="flex flex-col">
                  {hasSubItems ? (
                    <>
                      <button
                        onClick={() => {
                          setOpenSubMenus((prev) => ({
                            [nav.name]: !prev[nav.name],
                          }));
                        }}
                        className={`menu-item group w-full text-left justify-between cursor-pointer ${parentActive
                          ? "menu-item-active font-semibold"
                          : "menu-item-inactive"
                          } ${!isExpanded && !isHovered
                            ? "lg:justify-center"
                            : "lg:justify-between"
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`menu-item-icon-size ${parentActive
                              ? "menu-item-icon-active"
                              : "menu-item-icon-inactive"
                              }`}
                          >
                            {nav.icon}
                          </span>
                          {(isExpanded || isHovered || isMobileOpen) && (
                            <span className="menu-item-text text-theme-sm">{nav.name}</span>
                          )}
                        </div>
                        {(isExpanded || isHovered || isMobileOpen) && (
                          <ChevronDownIcon
                            className={`w-4 h-4 transition-transform duration-200 ${isSubOpen ? "rotate-180 menu-item-arrow-active" : "menu-item-arrow-inactive"
                              }`}
                          />
                        )}
                      </button>
                      <div
                        className={`transition-all duration-300 ease-in-out overflow-hidden ${isSubOpen && (isExpanded || isHovered || isMobileOpen)
                          ? "max-h-[1000px] opacity-100 mt-1"
                          : "max-h-0 opacity-0 pointer-events-none"
                          }`}
                      >
                        <ul className="pl-9 flex flex-col gap-1 pb-1">
                          {subItems.map((sub) => {
                            const subActive =
                              sub.path === "/contacts/my-leads"
                                ? location.pathname.startsWith("/contacts") && !location.pathname.startsWith("/contacts/follow-ups")
                                : sub.path === "/contacts/follow-ups"
                                  ? location.pathname.startsWith("/contacts/follow-ups")
                                  : location.pathname.startsWith(sub.path);
                            return (
                              <li key={sub.name}>
                                <Link
                                  to={sub.path}
                                  className={`menu-dropdown-item flex items-center gap-2.5 ${subActive
                                    ? "menu-dropdown-item-active font-semibold"
                                    : "menu-dropdown-item-inactive"
                                    }`}
                                >
                                  <span className="relative flex h-2 w-2 shrink-0">
                                    {subActive ? (
                                      <>
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff3951] opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff3951]"></span>
                                      </>
                                    ) : (
                                      <span className="inline-flex rounded-full h-2 w-2 bg-gray-300 dark:bg-gray-700"></span>
                                    )}
                                  </span>
                                  {sub.name === "All Leads" && !isAdmin ? "My Leads" : sub.name}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </>
                  ) : (
                    <Link
                      to={nav.path!}
                      className={`menu-item group ${isActive(nav.path!)
                        ? "menu-item-active font-semibold"
                        : "menu-item-inactive"
                        } ${!isExpanded && !isHovered
                          ? "lg:justify-center"
                          : "lg:justify-start"
                        }`}
                    >
                      <span
                        className={`menu-item-icon-size ${isActive(nav.path!)
                          ? "menu-item-icon-active"
                          : "menu-item-icon-inactive"
                          }`}
                      >
                        {nav.icon}
                      </span>
                      {(isExpanded || isHovered || isMobileOpen) && (
                        <span className="menu-item-text text-theme-sm">{nav.name}</span>
                      )}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
