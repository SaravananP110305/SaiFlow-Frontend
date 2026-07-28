import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Badge from "../../../components/ui/badge/Badge";
import Button from "../../../components/ui/button/Button";
import { getStorage } from "../../../utils/storage";

import {
  FiUser,
  FiMail,
  FiPhone,
  FiBriefcase,
  FiShield,
  FiEdit,
  FiArrowLeft,
  FiHash,
  FiCheckCircle,
  FiXCircle,
} from "react-icons/fi";

interface User {
  id: number;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  status: "Active" | "Inactive";
  password?: string;
}

interface InfoCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | React.ReactNode;
}

function InfoCard({ icon, label, value }: InfoCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3.5 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-gray-800">
        <span className="text-gray-500 dark:text-gray-400">{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <span className="block text-xs text-gray-400 dark:text-gray-500 mb-0.5">
          {label}
        </span>
        <span className="block text-sm font-medium text-gray-800 dark:text-white/90 break-words">
          {value || <span className="text-gray-400 font-normal">—</span>}
        </span>
      </div>
    </div>
  );
}

/** Generate a 2-letter initials from a name string */
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** Map a name to a deterministic pastel background colour */
function nameToColor(name: string): string {
  const colors = [
    "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
    "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
    "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
    "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function UserDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const users = getStorage<User[]>("saiflow_users", []);
    const found = users.find((u) => String(u.id) === String(id));
    if (found) {
      setUser(found);
    }
    setLoading(false);
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <PageMeta
          title="User not found | SaiFlow"
          description="The requested user does not exist."
        />
        <PageBreadcrumb pageTitle="User details" />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-white/[0.05] mb-4">
            <FiUser className="size-7 text-gray-400" />
          </div>
          <p className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
            User not found
          </p>
          <p className="text-sm text-gray-400 mb-6">
            The user you are looking for does not exist or has been deleted.
          </p>
          <Button size="sm" onClick={() => navigate("/users")}>
            Back to user list
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title="User Details | SaiFlow"
        description="View detailed employee information in SaiFlow CRM."
      />
      <PageBreadcrumb pageTitle="User details" />

      {/* Top action bar */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => navigate("/users")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-white transition cursor-pointer"
        >
          <FiArrowLeft className="size-4" />
          Back to list
        </button>
        <Button
          size="sm"
          onClick={() => navigate(`/users/${user.id}/edit`)}
          startIcon={<FiEdit className="size-4" />}
        >
          Edit user
        </Button>
      </div>

      {/* ═══════════ Profile Header Card ═══════════ */}
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-6 mb-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-5">
          {/* Avatar with initials */}
          <div
            className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-xl font-bold ${nameToColor(
              user.name
            )}`}
          >
            {getInitials(user.name)}
          </div>

          <div className="flex flex-col items-center sm:items-start gap-1.5 text-center sm:text-left">
            <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white/95">
                {user.name}
              </h2>
              <Badge
                size="sm"
                color={user.status === "Active" ? "success" : "error"}
              >
                {user.status}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500 dark:text-gray-400 justify-center sm:justify-start">
              <span className="font-mono text-xs tracking-wider text-gray-400 dark:text-gray-500">
                {user.employeeId}
              </span>
              <span className="hidden sm:inline text-gray-300 dark:text-gray-700">•</span>
              <span>{user.role}</span>
              {user.department && (
                <>
                  <span className="text-gray-300 dark:text-gray-700">•</span>
                  <span>{user.department}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ Content Cards Grid ═══════════ */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Card 1: Personal Information */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05] flex items-center gap-2">
            <FiUser className="size-4 text-brand-500" />
            Personal Information
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoCard
              icon={<FiHash className="size-4" />}
              label="Employee ID"
              value={user.employeeId}
            />
            <InfoCard
              icon={<FiUser className="size-4" />}
              label="Full Name"
              value={user.name}
            />
            <InfoCard
              icon={<FiMail className="size-4" />}
              label="Email Address"
              value={
                <a
                  href={`mailto:${user.email}`}
                  className="text-gray-800 dark:text-white/90 hover:text-gray-500 dark:hover:text-gray-400 hover:underline transition-colors"
                >
                  {user.email}
                </a>
              }
            />
            <InfoCard
              icon={<FiPhone className="size-4" />}
              label="Phone Number"
              value={user.phone}
            />
          </div>
        </div>

        {/* Card 2: Role & Department */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05] flex items-center gap-2">
            <FiShield className="size-4 text-brand-500" />
            Role & Department
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoCard
              icon={<FiBriefcase className="size-4" />}
              label="User Role"
              value={user.role}
            />
            <InfoCard
              icon={<FiBriefcase className="size-4" />}
              label="Department"
              value={user.department || <span className="text-gray-400 font-normal">—</span>}
            />
            <InfoCard
              icon={
                user.status === "Active" ? (
                  <FiCheckCircle className="size-4 text-green-500" />
                ) : (
                  <FiXCircle className="size-4 text-red-500" />
                )
              }
              label="Status"
              value={
                <Badge
                  size="sm"
                  color={user.status === "Active" ? "success" : "error"}
                >
                  {user.status}
                </Badge>
              }
            />
          </div>
        </div>

        {/* Card 3: Account Meta */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05] flex items-center gap-2">
            <FiShield className="size-4 text-brand-500" />
            Account Summary
          </h3>
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 dark:text-gray-500">Employee ID:</span>
              <span className="font-mono text-xs font-medium text-gray-800 dark:text-white/90 tracking-wider">
                {user.employeeId}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 dark:text-gray-500">Role:</span>
              <span className="font-medium text-gray-800 dark:text-white/90">
                {user.role}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 dark:text-gray-500">Department:</span>
              <span className="font-medium text-gray-800 dark:text-white/90">
                {user.department || "—"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 dark:text-gray-500">Status:</span>
              <Badge
                size="sm"
                color={user.status === "Active" ? "success" : "error"}
              >
                {user.status}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
