import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { getStorage, setStorage } from "../../../utils/storage";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Badge from "../../../components/ui/badge/Badge";
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import { Modal } from "../../../components/ui/modal";
import { useModal } from "../../../hooks/useModal";
import { Dropdown } from "../../../components/ui/dropdown/Dropdown";
import { DropdownItem } from "../../../components/ui/dropdown/DropdownItem";
import { Pagination } from "../../../components/ui/pagination/Pagination";
import { useToast } from "../../../hooks/useToast";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "../../../components/ui/table";
import {
  ChevronDownIcon,
  ChevronUpIcon,
} from "../../../icons";
import { FiEye, FiEdit, FiTrash2, FiPlus } from "react-icons/fi";

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

const generateEmployeeId = (id: number): string => {
  return `EMP-${String(id).padStart(3, "0")}`;
};

const roleToDepartment: Record<string, string> = {
  Administrator: "",
  "Business Development Manager": "Business Development",
  "Business Development Executive": "Business Development",
  "Presales Consultant": "Presales",
  "Guest User": "",
};

const initialUsers: User[] = [
  { id: 1, employeeId: "EMP-001", name: "John Doe", email: "john.doe@saiflow.com", phone: "+91 98765 43210", role: "Administrator", department: "Sales", status: "Active", password: "Password@123" },
  { id: 2, employeeId: "EMP-002", name: "Jane Smith", email: "jane.smith@saiflow.com", phone: "+91 98765 43211", role: "Business Development Manager", department: "Business Development", status: "Active", password: "Password@123" },
  { id: 3, employeeId: "EMP-003", name: "Alice Johnson", email: "alice.johnson@saiflow.com", phone: "+91 98765 43212", role: "Business Development Executive", department: "Business Development", status: "Active", password: "Password@123" },
  { id: 4, employeeId: "EMP-004", name: "Robert Lee", email: "robert.lee@saiflow.com", phone: "+91 98765 43213", role: "Presales Consultant", department: "Presales", status: "Active", password: "Password@123" },
  { id: 5, employeeId: "EMP-005", name: "Emma Watson", email: "emma.watson@saiflow.com", phone: "+91 98765 43214", role: "Guest User", department: "Sales", status: "Inactive", password: "Password@123" },
];

const availableRoles = [
  "Administrator",
  "Business Development Manager",
  "Business Development Executive",
  "Presales Consultant",
  "Guest User",
];

export default function UserManagement() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>(() => {
    const stored = getStorage<User[]>("saiflow_users", initialUsers);
    // Migrate old data: add employeeId and department if missing
    const needsMigration = stored.some((u) => !u.employeeId || u.department === undefined);
    if (needsMigration) {
      const migrated = stored.map((u) => ({
        ...u,
        employeeId: u.employeeId || generateEmployeeId(u.id),
        department: u.department ?? roleToDepartment[u.role] ?? "",
      }));
      setStorage("saiflow_users", migrated);
      return migrated;
    }
    return stored;
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof User>("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Dropdown states
  const [isRoleFilterOpen, setIsRoleFilterOpen] = useState(false);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);

  // Delete modal
  const deleteModal = useModal();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Handlers
  const handleOpenView = (user: User) => {
    navigate(`/users/${user.id}`);
  };

  const handleOpenCreate = () => {
    navigate("/users/add");
  };

  const handleOpenEdit = (user: User) => {
    navigate(`/users/${user.id}/edit`);
  };

  const handleOpenDelete = (user: User) => {
    setSelectedUser(user);
    deleteModal.openModal();
  };

  const handleDeleteConfirm = () => {
    if (selectedUser) {
      const updated = users.filter((u) => u.id !== selectedUser.id);
      setUsers(updated);
      setStorage("saiflow_users", updated);
      showToast("User deleted successfully.", "success");
    }
    deleteModal.closeModal();
  };

  // Sorting columns
  const handleSort = (field: keyof User) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  // Filters & Sorting calculations
  const processedUsers = useMemo(() => {
    let result = [...users];

    // 1. Search Query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.phone.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q) ||
          u.status.toLowerCase().includes(q)
      );
    }

    // 2. Role filter
    if (roleFilter !== "all") {
      result = result.filter((u) => u.role === roleFilter);
    }

    // 3. Status filter
    if (statusFilter !== "all") {
      result = result.filter((u) => u.status === statusFilter);
    }

    // 4. Sort column values
    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }

      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();

      if (strA < strB) return sortOrder === "asc" ? -1 : 1;
      if (strA > strB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [users, searchQuery, roleFilter, statusFilter, sortField, sortOrder]);

  // Paginated elements calculation
  const paginatedUsers = useMemo(() => {
    const startIdx = (currentPage - 1) * rowsPerPage;
    return processedUsers.slice(startIdx, startIdx + rowsPerPage);
  }, [processedUsers, currentPage, rowsPerPage]);

  const totalItems = processedUsers.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);

  // Sorting header icons indicator renderer
  const renderSortHeader = (label: string, field: keyof User) => {
    const isActive = sortField === field;
    return (
      <button
        onClick={() => handleSort(field)}
        className="flex items-center gap-1.5 font-medium hover:text-gray-900 dark:hover:text-white cursor-pointer"
      >
        {label}
        <span className="flex flex-col">
          <ChevronUpIcon
            className={`w-3 h-3 -mb-1 transition-colors ${isActive && sortOrder === "asc" ? "text-brand-500" : "text-gray-300 dark:text-gray-600"
              }`}
          />
          <ChevronDownIcon
            className={`w-3 h-3 transition-colors ${isActive && sortOrder === "desc" ? "text-brand-500" : "text-gray-300 dark:text-gray-600"
              }`}
          />
        </span>
      </button>
    );
  };

  return (
    <>
      <PageMeta
        title="Manage Users | SaiFlow"
        description="Manage employee accounts and roles in SaiFlow CRM."
      />
      {/* Page Title & Breadcrumb */}
      <PageBreadcrumb pageTitle="Manage Users" />

      {/* Control Area above Table */}
      <div className="flex flex-col gap-4 mb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full lg:w-auto">
          <div className="w-full sm:w-64">
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Custom Dropdown Filter for Role */}
          <div className="relative">
            <button
              onClick={() => setIsRoleFilterOpen(!isRoleFilterOpen)}
              className="flex items-center justify-between h-11 w-48 rounded-lg border border-gray-205 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer dropdown-toggle hover:bg-gray-50 dark:hover:bg-white/5"
            >
              <span>{roleFilter === "all" ? "All roles" : roleFilter}</span>
              <ChevronDownIcon className="w-4 h-4 text-gray-555" />
            </button>
            <Dropdown
              isOpen={isRoleFilterOpen}
              onClose={() => setIsRoleFilterOpen(false)}
              className="left-0 right-auto w-48 p-1 mt-2"
            >
              <ul className="flex flex-col gap-0.5">
                <li>
                  <DropdownItem
                    onItemClick={() => {
                      setRoleFilter("all");
                      setCurrentPage(1);
                      setIsRoleFilterOpen(false);
                    }}
                    className={`cursor-pointer rounded-lg text-left w-full px-3 py-2 text-sm ${roleFilter === "all"
                        ? "bg-brand-500 text-white font-medium"
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                      }`}
                  >
                    All roles
                  </DropdownItem>
                </li>
                {availableRoles.map((roleOpt) => (
                  <li key={roleOpt}>
                    <DropdownItem
                      onItemClick={() => {
                        setRoleFilter(roleOpt);
                        setCurrentPage(1);
                        setIsRoleFilterOpen(false);
                      }}
                      className={`cursor-pointer rounded-lg text-left w-full px-3 py-2 text-sm ${roleFilter === roleOpt
                          ? "bg-brand-500 text-white font-medium"
                          : "text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                        }`}
                    >
                      {roleOpt}
                    </DropdownItem>
                  </li>
                ))}
              </ul>
            </Dropdown>
          </div>

          {/* Custom Dropdown Filter for Status */}
          <div className="relative">
            <button
              onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
              className="flex items-center justify-between h-11 w-40 rounded-lg border border-gray-205 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer dropdown-toggle hover:bg-gray-50 dark:hover:bg-white/5"
            >
              <span>{statusFilter === "all" ? "All statuses" : statusFilter}</span>
              <ChevronDownIcon className="w-4 h-4 text-gray-555" />
            </button>
            <Dropdown
              isOpen={isStatusFilterOpen}
              onClose={() => setIsStatusFilterOpen(false)}
              className="left-0 right-auto w-40 p-1 mt-2"
            >
              <ul className="flex flex-col gap-0.5">
                {[
                  { value: "all", label: "All statuses" },
                  { value: "Active", label: "Active" },
                  { value: "Inactive", label: "Inactive" },
                ].map((opt) => (
                  <li key={opt.value}>
                    <DropdownItem
                      onItemClick={() => {
                        setStatusFilter(opt.value);
                        setCurrentPage(1);
                        setIsStatusFilterOpen(false);
                      }}
                      className={`cursor-pointer rounded-lg text-left w-full px-3 py-2 text-sm ${statusFilter === opt.value
                          ? "bg-brand-500 text-white font-medium"
                          : "text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                        }`}
                    >
                      {opt.label}
                    </DropdownItem>
                  </li>
                ))}
              </ul>
            </Dropdown>
          </div>
        </div>

        {/* Primary Action Button */}
        <div>
          <Button
            size="sm"
            onClick={handleOpenCreate}
            startIcon={<FiPlus className="size-4" />}
            className="w-full sm:w-auto h-11 px-4 py-2.5"
          >
            Add user
          </Button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] sticky top-0 bg-white dark:bg-gray-900 z-10">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  {renderSortHeader("S.No", "id")}
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  {renderSortHeader("Employee ID", "employeeId")}
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  {renderSortHeader("Employee name", "name")}
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  {renderSortHeader("Email address", "email")}
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  {renderSortHeader("Phone", "phone")}
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  {renderSortHeader("User role", "role")}
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  {renderSortHeader("Department", "department")}
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  {renderSortHeader("Status", "status")}
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Action
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => (
                  <TableRow
                    key={user.id}
                    className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400 font-mono text-xs">
                      {user.id}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-800 dark:text-white/90 font-mono text-xs tracking-wider">
                      {user.employeeId}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-800 dark:text-white/90 font-medium">
                      {user.name}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">
                      {user.email}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">
                      {user.phone}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">
                      {user.role}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">
                      {user.department}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">
                      <Badge size="sm" color={user.status === "Active" ? "success" : "error"}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenView(user)}
                          className="p-1.5 text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10 rounded-lg transition cursor-pointer"
                          title="View"
                        >
                          <FiEye className="size-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(user)}
                          className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10 rounded-lg transition cursor-pointer"
                          title="Edit"
                        >
                          <FiEdit className="size-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(user)}
                          className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                          title="Delete"
                        >
                          <FiTrash2 className="size-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No users match your search criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Block */}
        {totalItems > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            rowsPerPage={rowsPerPage}
            onPageChange={setCurrentPage}
            onRowsPerPageChange={(rows) => {
              setRowsPerPage(rows);
              setCurrentPage(1);
            }}
            itemName="users"
          />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModal.isOpen} onClose={deleteModal.closeModal} className="max-w-[450px] m-4">
        <div className="relative w-full rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/10 text-error-600 dark:text-error-400 mb-4">
              <FiTrash2 className="size-6" />
            </div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">
              Delete user
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to delete this user? This action cannot be undone.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button size="sm" variant="outline" onClick={deleteModal.closeModal} className="w-1/2">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleDeleteConfirm}
              className="w-1/2 bg-error-600 hover:bg-error-750"
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
