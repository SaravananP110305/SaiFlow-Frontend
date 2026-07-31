import { useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { Link } from "react-router";

interface NotificationItem {
  id: number;
  userName: string;
  message: string;
  targetName: string;
  category: "Lead" | "Meeting" | "Follow-up" | "System";
  time: string;
  unread: boolean;
}

const categoryColors: Record<NotificationItem["category"], string> = {
  Lead: "bg-brand-500",
  Meeting: "bg-blue-500",
  "Follow-up": "bg-amber-500",
  System: "bg-purple-500",
};

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifying, setNotifying] = useState(true);

  const notifications: NotificationItem[] = [
    {
      id: 1,
      userName: "John Doe",
      message: "assigned a new lead",
      targetName: "Adobe Inc.",
      category: "Lead",
      time: "5 min ago",
      unread: true,
    },
    {
      id: 2,
      userName: "Jane Smith",
      message: "scheduled a presales meeting with",
      targetName: "Salesforce CRM",
      category: "Meeting",
      time: "15 min ago",
      unread: true,
    },
    {
      id: 3,
      userName: "Alice Johnson",
      message: "logged a successful follow-up with",
      targetName: "Stripe Payment",
      category: "Follow-up",
      time: "1 hr ago",
      unread: false,
    },
    {
      id: 4,
      userName: "System Auto",
      message: "imported 3 new qualified leads from",
      targetName: "Leads_Q3_Upload.xlsx",
      category: "System",
      time: "2 hrs ago",
      unread: false,
    },
    {
      id: 5,
      userName: "Robert Lee",
      message: "marked lead status as WON for",
      targetName: "Netflix Stream",
      category: "Lead",
      time: "4 hrs ago",
      unread: false,
    },
  ];

  const unreadCount = notifications.filter((n) => n.unread).length;

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleClick = () => {
    toggleDropdown();
    setNotifying(false);
  };

  return (
    <div className="relative">
      <button
        className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full dropdown-toggle hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={handleClick}
      >
        <span
          className={`absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-400 ${
            !notifying ? "hidden" : "flex"
          }`}
        >
          <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping"></span>
        </span>
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="fixed! left-1/2 top-16 z-50 flex h-auto max-h-[calc(100vh-6rem)] w-[calc(100vw-2rem)] max-w-[361px] -translate-x-1/2 flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark mt-0! sm:absolute! sm:left-auto sm:top-auto sm:right-0 sm:mt-[17px]! sm:w-[361px] sm:max-h-[480px] sm:translate-x-0"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-base font-semibold text-gray-800 dark:text-gray-200">
            Notifications
          </h5>
          <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
            {unreadCount} new
          </span>
        </div>
        <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar">
          {notifications.slice(0, 3).map((item) => (
            <li key={item.id}>
              <DropdownItem
                onItemClick={closeDropdown}
                className="flex rounded-lg px-3 py-3 hover:bg-gray-100 dark:hover:bg-white/5"
              >
                <span className="block min-w-0 flex-1">
                  <span className="block text-theme-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium text-gray-800 dark:text-white/90">
                      {item.userName}
                    </span>{" "}
                    {item.message}{" "}
                    <span className="font-medium text-gray-800 dark:text-white/90">
                      {item.targetName}
                    </span>
                  </span>
                  <span className="mt-1 flex items-center gap-1.5 text-theme-xs text-gray-400 dark:text-gray-500">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${categoryColors[item.category]}`}
                    ></span>
                    {item.time}
                  </span>
                </span>
              </DropdownItem>
            </li>
          ))}
        </ul>
        <Link
          to="#"
          onClick={closeDropdown}
          className="block px-4 py-2 mt-3 text-sm font-medium text-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          View All Notifications
        </Link>
      </Dropdown>
    </div>
  );
}
