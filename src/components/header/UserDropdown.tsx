import { useState } from "react";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { Link, useNavigate } from "react-router";
import { FiUser, FiLogOut, FiLock } from "react-icons/fi";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../context/AuthContext";
import ownerImg from "/images/user/owner.jpg";

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const name = user?.name || "Guest User";
  const email = user?.email || "";
  const displayName = user?.name || "User";

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    let logoutFailed = false;

    try {
      await logout();
    } catch (error) {
      logoutFailed = true;
      showToast("Logout failed.", "error");
    } finally {
      if (!logoutFailed) {
        showToast("You have been logged out successfully.", "success");
      }
      navigate("/signin", { replace: true });
      closeDropdown();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center text-gray-700 dropdown-toggle dark:text-gray-400 cursor-pointer"
      >
        <span className="mr-3 overflow-hidden rounded-full h-11 w-11">
          <img src={ownerImg} alt="User" className="object-cover w-full h-full" />
        </span>

        <span className="hidden mr-1 font-medium text-theme-sm sm:block">{displayName}</span>
        <svg
          className={`stroke-gray-500 dark:stroke-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
            }`}
          width="18"
          height="20"
          viewBox="0 0 18 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.3125 8.65625L9 13.3437L13.6875 8.65625"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-[17px] flex w-[240px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
      >
        <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 pb-3 mb-2">
          <span className="block font-medium text-gray-700 text-theme-sm dark:text-gray-400">
            {name}
          </span>
          <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
            {email}
          </span>
        </div>

        <ul className="flex flex-col gap-1 pb-2 border-b border-gray-200 dark:border-gray-800">
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              to="/profile"
              className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              <FiUser className="w-5 h-5 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300" />
              Profile
            </DropdownItem>
          </li>
          <li>
            <DropdownItem
              onItemClick={closeDropdown}
              tag="a"
              to="/change-password"
              className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              <FiLock className="w-5 h-5 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300" />
              Change Password
            </DropdownItem>
          </li>
        </ul>
        <div className="mt-2">
          <Link
            to="/signin"
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
          >
            <FiLogOut className="w-5 h-5 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300" />
            Logout
          </Link>
        </div>
      </Dropdown>
    </div>
  );
}
