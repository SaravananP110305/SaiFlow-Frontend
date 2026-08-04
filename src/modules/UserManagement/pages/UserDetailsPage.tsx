import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  FiArrowLeft,
  FiBriefcase,
  FiCheckCircle,
  FiEdit,
  FiMail,
  FiPhone,
  FiShield,
  FiUser,
  FiXCircle,
} from "react-icons/fi";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Badge from "../../../components/ui/badge/Badge";
import Button from "../../../components/ui/button/Button";
import { userService } from "../../../services/userService";
import { formatDate } from "../../../utils/dateFormatter";

interface UserDetails {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: "Active" | "Inactive" | "Suspended";
  createdAt: string;
}

interface InfoCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

function InfoCard({ icon, label, value }: InfoCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3.5 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-gray-800">
        <span className="text-gray-500 dark:text-gray-400">{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <span className="mb-0.5 block text-xs text-gray-400 dark:text-gray-500">{label}</span>
        <span className="block break-words text-sm font-medium text-gray-800 dark:text-white/90">
          {value || <span className="font-normal text-gray-400">-</span>}
        </span>
      </div>
    </div>
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

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
  for (let index = 0; index < name.length; index += 1) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

function getStatusBadgeColor(status: UserDetails["status"]) {
  if (status === "Active") return "success";
  if (status === "Suspended") return "warning";
  return "error";
}

function getStatusIcon(status: UserDetails["status"]) {
  if (status === "Active") {
    return <FiCheckCircle className="size-4 text-green-500" />;
  }
  if (status === "Suspended") {
    return <FiShield className="size-4 text-orange-500" />;
  }
  return <FiXCircle className="size-4 text-red-500" />;
}

export default function UserDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const userId = Number(id);

    if (!Number.isFinite(userId)) {
      setUser(null);
      setError(null);
      setNotFound(true);
      setLoading(false);
      return;
    }

    const loadUser = async () => {
      setLoading(true);
      setError(null);
      setNotFound(false);

      try {
        const response = await userService.getUserById(userId);
        setUser({
          id: response.id,
          name: `${response.firstName} ${response.lastName}`.trim(),
          email: response.email,
          phone: response.phone || "",
          role: response.role?.name || "Unassigned",
          status:
            response.status === "ACTIVE"
              ? "Active"
              : response.status === "SUSPENDED"
                ? "Suspended"
                : "Inactive",
          createdAt: response.createdAt,
        });
      } catch (requestError: any) {
        if (requestError.response?.status === 404) {
          setNotFound(true);
          setUser(null);
        } else {
          setError(requestError.response?.data?.message || "Failed to load user details.");
        }
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500 dark:border-gray-700 dark:border-t-brand-400" />
      </div>
    );
  }

  if (error) {
    return (
      <>
        <PageMeta
          title="User Details Error | SaiFlow"
          description="There was a problem loading the requested user."
        />
        <PageBreadcrumb pageTitle="User Details" />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/10">
            <FiXCircle className="size-7 text-error-500" />
          </div>
          <p className="mb-2 text-base font-medium text-gray-700 dark:text-gray-300">
            Failed to Load User
          </p>
          <p className="mb-6 text-sm text-gray-400">{error}</p>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" onClick={() => navigate("/users")}>
              Back to User List
            </Button>
            <Button size="sm" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </>
    );
  }

  if (notFound || !user) {
    return (
      <>
        <PageMeta
          title="User Not Found | SaiFlow"
          description="The requested user does not exist."
        />
        <PageBreadcrumb pageTitle="User Details" />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-white/[0.05]">
            <FiUser className="size-7 text-gray-400" />
          </div>
          <p className="mb-2 text-base font-medium text-gray-700 dark:text-gray-300">
            User Not Found
          </p>
          <p className="mb-6 text-sm text-gray-400">
            The user you are looking for does not exist or has been deleted.
          </p>
          <Button size="sm" onClick={() => navigate("/users")}>
            Back to User List
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
      <PageBreadcrumb pageTitle="User Details" />

      <div className="mb-5 flex items-center justify-between">
        <button
          onClick={() => navigate("/users")}
          className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-500 transition hover:text-gray-800 dark:hover:text-white"
        >
          <FiArrowLeft className="size-4" />
          Back to List
        </button>
        <Button
          size="sm"
          onClick={() => navigate(`/users/${user.id}/edit`)}
          startIcon={<FiEdit className="size-4" />}
        >
          Edit User
        </Button>
      </div>

      <div className="mb-5 rounded-xl border border-gray-200 bg-white px-6 py-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-5">
          <div
            className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-xl font-bold ${nameToColor(
              user.name
            )}`}
          >
            {getInitials(user.name)}
          </div>

          <div className="flex flex-col items-center gap-1.5 text-center sm:items-start sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white/95">{user.name}</h2>
              <Badge size="sm" color={getStatusBadgeColor(user.status)}>
                {user.status}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-gray-500 dark:text-gray-400 sm:justify-start">
              <span>{user.role}</span>
              <span className="text-gray-300 dark:text-gray-700">•</span>
              <span>Created {formatDate(user.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <h3 className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-2 text-sm font-semibold text-gray-700 dark:border-white/[0.05] dark:text-gray-300">
            <FiUser className="size-4 text-brand-500" />
            Personal Information
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoCard icon={<FiUser className="size-4" />} label="Full Name" value={user.name} />
            <InfoCard
              icon={<FiMail className="size-4" />}
              label="Email Address"
              value={
                <a
                  href={`mailto:${user.email}`}
                  className="text-gray-800 transition-colors hover:text-gray-500 hover:underline dark:text-white/90 dark:hover:text-gray-400"
                >
                  {user.email}
                </a>
              }
            />
            <InfoCard icon={<FiPhone className="size-4" />} label="Phone Number" value={user.phone || "-"} />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <h3 className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-2 text-sm font-semibold text-gray-700 dark:border-white/[0.05] dark:text-gray-300">
            <FiShield className="size-4 text-brand-500" />
            Role & Status
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoCard icon={<FiBriefcase className="size-4" />} label="User Role" value={user.role} />
            <InfoCard
              icon={<FiShield className="size-4" />}
              label="Created Date"
              value={formatDate(user.createdAt)}
            />
            <InfoCard
              icon={getStatusIcon(user.status)}
              label="Status"
              value={
                <Badge size="sm" color={getStatusBadgeColor(user.status)}>
                  {user.status}
                </Badge>
              }
            />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-2 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <h3 className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-2 text-sm font-semibold text-gray-700 dark:border-white/[0.05] dark:text-gray-300">
            <FiShield className="size-4 text-brand-500" />
            Account Summary
          </h3>
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 dark:text-gray-500">Role:</span>
              <span className="font-medium text-gray-800 dark:text-white/90">{user.role}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 dark:text-gray-500">Created:</span>
              <span className="font-medium text-gray-800 dark:text-white/90">
                {formatDate(user.createdAt)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 dark:text-gray-500">Status:</span>
              <Badge size="sm" color={getStatusBadgeColor(user.status)}>
                {user.status}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
