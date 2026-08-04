import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import { roleService } from "../../../services/roleService";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import Switch from "../../../components/form/switch/Switch";
import { Modal } from "../../../components/ui/modal";
import { useModal } from "../../../hooks/useModal";
// import { Dropdown } from "../../../components/ui/dropdown/Dropdown";
import { useDebounce } from "../../../hooks/useDebounce";
// import { DropdownItem } from "../../../components/ui/dropdown/DropdownItem";
import { Pagination } from "../../../components/ui/pagination/Pagination";
import { useToast } from "../../../hooks/useToast";
import { useAuth } from "../../../context/AuthContext";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "../../../components/ui/table";
import { ChevronDownIcon, ChevronUpIcon } from "../../../icons";
import { FiEye, FiEdit, FiTrash2, FiPlus } from "react-icons/fi";

export const permissionActions = [
  "view",
  "create",
  "edit",
  "delete",
  "assign",
  "approve",
] as const;

export type PermissionAction = (typeof permissionActions)[number];

export interface Permission {
  menu: string;
  key: string;
  parentKey?: string;
  isSubMenu?: boolean;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  assign: boolean;
  approve: boolean;
}

export interface Role {
  id: number;
  roleName: string;
  status: "Active" | "Inactive";
  permissions: Permission[];
}

interface PermissionModuleConfig {
  name: string;
  key: string;
  actions: PermissionAction[];
  subItems?: string[];
}

export const permissionModules: PermissionModuleConfig[] = [
  { name: "Dashboard", key: "dashboard", actions: ["view"] },
  { name: "Manage Users", key: "users", actions: ["view", "create", "edit", "delete"], subItems: ["User Roles", "Users"] },
  { name: "Leads", key: "leads", actions: ["view", "create", "edit", "delete", "assign"] },
  { name: "Connect", key: "connect", actions: ["view", "create", "edit", "delete"], subItems: ["Contacts", "Follow-Ups"] },
  { name: "Meetings", key: "meetings", actions: ["view", "create", "edit", "delete"] },
  { name: "Proposals", key: "proposals", actions: ["view", "create", "edit", "delete", "approve"] },
  { name: "Clients", key: "clients", actions: ["view", "create", "edit", "approve"] },
  {
    name: "Reports",
    key: "reports",
    actions: ["view"],
    subItems: [
      "Lead Report",
      "Meeting Report",
      "Employee Report",
      "Follow-Up Report",
      "Proposal Report",
      "Client Report",
    ],
  },
  { name: "Settings", key: "settings", actions: ["view", "edit"] },
];

export const sidebarStructure = permissionModules.map(({ name, key, subItems }) => ({
  name,
  key,
  subItems,
}));

const createEmptyPermission = (
  menu: string,
  key: string,
  overrides?: Partial<Permission>
): Permission => ({
  menu,
  key,
  view: false,
  create: false,
  edit: false,
  delete: false,
  assign: false,
  approve: false,
  ...overrides,
});

export const buildDefaultPermissions = (): Permission[] => {
  const list: Permission[] = [];

  permissionModules.forEach((item) => {
    list.push(createEmptyPermission(item.name, item.key));
    item.subItems?.forEach((subItem) => {
      list.push(
        createEmptyPermission(
          subItem,
          `${item.key}_${subItem.toLowerCase().replace(/\s+/g, "_")}`,
          {
            parentKey: item.key,
            isSubMenu: true,
          }
        )
      );
    });
  });

  return list;
};

const defaultPermissionsList = buildDefaultPermissions();

export const syncPermissions = (savedPermissions: Permission[]): Permission[] => {
  if (!savedPermissions || !Array.isArray(savedPermissions)) {
    return defaultPermissionsList.map((permission) => ({ ...permission }));
  }

  return defaultPermissionsList.map((defaultPermission) => {
    const savedPermission =
      savedPermissions.find((permission) => permission.key === defaultPermission.key) ??
      savedPermissions.find((permission) => permission.menu === defaultPermission.menu);

    return savedPermission
      ? {
        ...defaultPermission,
        ...savedPermission,
      }
      : { ...defaultPermission };
  });
};

export const formatRoleId = (id: number): string =>
  `ROL-${String(id).padStart(3, "0")}`;

export default function UserRoleManagement() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { hasPermission } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof Role>("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // const [statusFilter, setStatusFilter] = useState("all");
  // const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);

  const deleteModal = useModal();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const response = await roleService.getRoles({
        paginate: true,
        page: currentPage,
        limit: rowsPerPage,
        search: debouncedSearchQuery || undefined,
      });

      const rawRoles = response.data || [];
      setRoles(
        rawRoles.map((role: any) => ({
          id: role.id,
          roleName: role.name,
          status: role.status === "Inactive" ? "Inactive" : "Active",
          permissions: [],
        }))
      );
      setTotalItems(response.meta?.total || 0);
      setTotalPages(response.meta?.totalPages || 0);
    } catch {
      showToast("Failed to fetch roles from backend.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [currentPage, rowsPerPage, debouncedSearchQuery]);

  const handleOpenView = (role: Role) => {
    navigate(`/roles/${role.id}/view`);
  };

  const handleOpenCreate = () => {
    navigate("/roles/add");
  };

  const handleOpenEdit = (role: Role) => {
    navigate(`/roles/${role.id}/edit`);
  };

  const handleOpenDelete = (role: Role) => {
    setSelectedRole(role);
    deleteModal.openModal();
  };

  const handleDeleteConfirm = async () => {
    if (selectedRole) {
      try {
        await roleService.deleteRole(selectedRole.id);
        setRoles((previousRoles) => previousRoles.filter((role) => role.id !== selectedRole.id));
        showToast("Role deleted successfully.", "success");
      } catch (error: any) {
        showToast(error.response?.data?.message || "Failed to delete role.", "error");
      }
    }
    deleteModal.closeModal();
  };

  const handleToggleStatus = async (role: Role, checked: boolean) => {
    const newStatus: Role["status"] = checked ? "Active" : "Inactive";
    try {
      await roleService.updateRole(role.id, { status: newStatus });
      setRoles((previousRoles) =>
        previousRoles.map((item) => (item.id === role.id ? { ...item, status: newStatus } : item))
      );
      showToast(`"${role.roleName}" marked as ${newStatus}.`, "success");
    } catch (error: any) {
      showToast(error.response?.data?.message || "Failed to update role status.", "error");
    }
  };

  const handleSort = (field: keyof Role) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const processedRoles = useMemo(() => {
    const sortedRoles = [...roles];

    sortedRoles.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      }

      const normalizedA = String(aValue).toLowerCase();
      const normalizedB = String(bValue).toLowerCase();

      if (normalizedA < normalizedB) return sortOrder === "asc" ? -1 : 1;
      if (normalizedA > normalizedB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return sortedRoles;
  }, [roles, sortField, sortOrder]);

  const paginatedRoles = processedRoles;

  const renderSortHeader = (label: string, field: keyof Role, centered = false) => {
    const isActive = sortField === field;

    return (
      <button
        onClick={() => handleSort(field)}
        className={`flex items-center gap-1.5 font-medium hover:text-gray-900 dark:hover:text-white cursor-pointer ${centered ? "mx-auto justify-center" : ""
          }`}
      >
        {label}
        <span className="flex flex-col">
          <ChevronUpIcon
            className={`w-3 h-3 -mb-1 transition-colors ${isActive && sortOrder === "asc"
              ? "text-brand-500"
              : "text-gray-300 dark:text-gray-600"
              }`}
          />
          <ChevronDownIcon
            className={`w-3 h-3 transition-colors ${isActive && sortOrder === "desc"
              ? "text-brand-500"
              : "text-gray-300 dark:text-gray-600"
              }`}
          />
        </span>
      </button>
    );
  };

  return (
    <>
      <PageMeta
        title="User Role Management | SaiFlow"
        description="Manage user roles and permissions in SaiFlow CRM."
      />
      <PageBreadcrumb pageTitle="User Role Management" />

      <div className="flex flex-col gap-4 mb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full lg:w-auto">
          <div className="w-full sm:w-64">
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Status filter (commented out) */}
          {/* <div className="relative">
            <button
              onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
              className="flex items-center justify-between h-11 w-40 rounded-lg border border-gray-205 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer dropdown-toggle hover:bg-gray-50 dark:hover:bg-white/5"
            >
              <span>{statusFilter === "all" ? "All Statuses" : statusFilter}</span>
              <ChevronDownIcon className="w-4 h-4 text-gray-555" />
            </button>
            <Dropdown
              isOpen={isStatusFilterOpen}
              onClose={() => setIsStatusFilterOpen(false)}
              className="left-0 right-auto w-40 p-1 mt-2"
            >
              <ul className="flex flex-col gap-0.5">
                {[
                  { value: "all", label: "All Statuses" },
                  { value: "Active", label: "Active" },
                  { value: "Inactive", label: "Inactive" },
                ].map((option) => (
                  <li key={option.value}>
                    <DropdownItem
                      onItemClick={() => {
                        setStatusFilter(option.value);
                        setCurrentPage(1);
                        setIsStatusFilterOpen(false);
                      }}
                      className={`cursor-pointer rounded-lg text-left w-full px-3 py-2 text-sm ${statusFilter === option.value
                        ? "bg-brand-500 text-white font-medium"
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                        }`}
                    >
                      {option.label}
                    </DropdownItem>
                  </li>
                ))}
              </ul>
            </Dropdown>
          </div> */}
        </div>

        {hasPermission("roles", "create") && (
          <div>
            <Button
              size="sm"
              onClick={handleOpenCreate}
              startIcon={<FiPlus className="size-4" />}
              className="w-full sm:w-auto h-11 px-4 py-2.5"
            >
              Add Role
            </Button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] sticky top-0 bg-white dark:bg-gray-900 z-10">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[100px]"
                >
                  S.No
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[100px]"
                >
                  {renderSortHeader("Role ID", "id", true)}
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  {renderSortHeader("Role Name", "roleName")}
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[180px]"
                >
                  {renderSortHeader("Status", "status", true)}
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[180px]"
                >
                  Action
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="px-5 py-8 text-center text-sm text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-primary border-t-transparent"></div>
                      <span>Loading Roles...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedRoles.length > 0 ? (
                paginatedRoles.map((role, index) => (
                  <TableRow
                    key={role.id}
                    className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400 text-center">
                      {(currentPage - 1) * rowsPerPage + index + 1}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-800 dark:text-white/90 text-center">
                      {formatRoleId(role.id)}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-800 dark:text-white/90 font-medium">
                      {role.roleName}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400 text-center">
                      <div className="flex items-center justify-center">
                        <Switch
                          key={`${role.id}-${role.status}`}
                          label=""
                          checked={role.status === "Active"}
                          color="success"
                          onChange={(checked) => handleToggleStatus(role, checked)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400 text-center">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenView(role)}
                          className="p-1.5 text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10 rounded-lg transition cursor-pointer"
                          title="View"
                        >
                          <FiEye className="size-4" />
                        </button>
                        {hasPermission("roles", "edit") && (
                          <button
                            onClick={() => handleOpenEdit(role)}
                            className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10 rounded-lg transition cursor-pointer"
                            title="Edit"
                          >
                            <FiEdit className="size-4" />
                          </button>
                        )}
                        {hasPermission("roles", "delete") && (
                          <button
                            onClick={() => handleOpenDelete(role)}
                            className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                            title="Delete"
                          >
                            <FiTrash2 className="size-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No roles match your search criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

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
            itemName="roles"
          />
        )}
      </div>

      <Modal isOpen={deleteModal.isOpen} onClose={deleteModal.closeModal} className="max-w-[450px] m-4">
        <div className="relative w-full rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/10 text-error-600 dark:text-error-400 mb-4">
              <FiTrash2 className="size-6" />
            </div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">
              Delete Role
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to delete this role? This action cannot be undone.
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
