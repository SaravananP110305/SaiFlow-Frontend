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
import { Dropdown } from "../../../components/ui/dropdown/Dropdown";
import { useDebounce } from "../../../hooks/useDebounce";
import { DropdownItem } from "../../../components/ui/dropdown/DropdownItem";
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
import {
  ChevronDownIcon,
  ChevronUpIcon,
} from "../../../icons";
import { FiEye, FiEdit, FiTrash2, FiPlus } from "react-icons/fi";

export interface Permission {
  menu: string;
  key: string;
  parentKey?: string;
  isSubMenu?: boolean;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export interface Role {
  id: number;
  roleName: string;
  description?: string;
  status: "Active" | "Inactive";
  permissions: Permission[];
}

export const sidebarStructure = [
  { name: "Dashboard", key: "dashboard" },
  { name: "Manage Users", key: "users", subItems: ["User Roles", "Users"] },
  { name: "Leads", key: "leads" },
  { name: "Connect", key: "connect", subItems: ["Contacts", "Follow-ups"] },
  { name: "Meetings", key: "meetings" },
  { name: "Proposals", key: "proposals" },
  { name: "Clients", key: "clients" },
  { name: "Reports", key: "reports", subItems: ["Lead report", "Meeting report", "Employee report", "Follow-up report", "Proposal report", "Client report"] },
  { name: "Settings", key: "settings" }
];

export const buildDefaultPermissions = (): Permission[] => {
  const list: Permission[] = [];
  sidebarStructure.forEach(item => {
    list.push({
      menu: item.name,
      key: item.key,
      view: false,
      create: false,
      edit: false,
      delete: false
    });
    if (item.subItems) {
      item.subItems.forEach(sub => {
        list.push({
          menu: sub,
          key: `${item.key}_${sub.toLowerCase().replace(/\s+/g, "_")}`,
          parentKey: item.key,
          isSubMenu: true,
          view: false,
          create: false,
          edit: false,
          delete: false
        });
      });
    }
  });
  return list;
};

const defaultPermissionsList = buildDefaultPermissions();



export const syncPermissions = (savedPermissions: Permission[]): Permission[] => {
  if (!savedPermissions || !Array.isArray(savedPermissions)) {
    return defaultPermissionsList.map(p => ({ ...p }));
  }

  return defaultPermissionsList.map(defaultPerm => {
    const saved = savedPermissions.find(p => p.key === defaultPerm.key) || savedPermissions.find(p => p.menu === defaultPerm.menu);
    if (saved) {
      return {
        ...defaultPerm,
        view: saved.view,
        create: saved.create,
        edit: saved.edit,
        delete: saved.delete
      };
    }
    return { ...defaultPerm };
  });
};



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

  // Dropdown states
  const [statusFilter, setStatusFilter] = useState("all");
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);

  // Modal states
  const deleteModal = useModal();

  // Active items mapping
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await roleService.getRoles({
        paginate: true,
        page: currentPage,
        limit: rowsPerPage,
        search: debouncedSearchQuery || undefined
      });

      const rawRoles = res.data || [];
      const adapted = rawRoles.map((role: any) => ({
        id: role.id,
        roleName: role.name,
        description: role.description || "",
        status: "Active",
        permissions: []
      }));
      setRoles(adapted);
      setTotalItems(res.meta?.total || 0);
      setTotalPages(res.meta?.totalPages || 0);
    } catch (err) {
      showToast("Failed to fetch roles from backend.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [currentPage, rowsPerPage, debouncedSearchQuery]);

  // Handlers
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
        setRoles((prev) => prev.filter((r) => r.id !== selectedRole.id));
        showToast("Role deleted successfully.", "success");
      } catch (err: any) {
        showToast(err.response?.data?.message || "Failed to delete role.", "error");
      }
    }
    deleteModal.closeModal();
  };

  const handleToggleStatus = (role: Role, checked: boolean) => {
    const newStatus: Role["status"] = checked ? "Active" : "Inactive";
    const updated = roles.map((r) =>
      r.id === role.id ? { ...r, status: newStatus } : r
    );
    setRoles(updated);
    showToast(`Role status toggle is simulated locally.`, "warning");
  };

  // Sorting columns
  const handleSort = (field: keyof Role) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  // Filters & Sorting calculations
  const processedRoles = useMemo(() => {
    let result = [...roles];

    // 3. Sort column values
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
  }, [roles, sortField, sortOrder]);

  // Paginated elements calculation (delegated to server)
  const paginatedRoles = processedRoles;

  // Sorting header icons indicator renderer
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
        title="User Role Management | SaiFlow"
        description="Manage user roles and permissions in SaiFlow CRM."
      />
      {/* Page Title & Breadcrumb */}
      <PageBreadcrumb pageTitle="User Role Management" />

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
        {hasPermission('roles', 'create') && (
          <div>
            <Button
              size="sm"
              onClick={handleOpenCreate}
              startIcon={<FiPlus className="size-4" />}
              className="w-full sm:w-auto h-11 px-4 py-2.5"
            >
              Add role
            </Button>
          </div>
        )}
      </div>

      {/* Table Container */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] sticky top-0 bg-white dark:bg-gray-900 z-10">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[100px]"
                >
                  {renderSortHeader("S.No", "id", true)}
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  {renderSortHeader("Role name", "roleName")}
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
                  <TableCell colSpan={4} className="px-5 py-8 text-center text-sm text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-primary border-t-transparent"></div>
                      <span>Loading roles...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedRoles.length > 0 ? (
                paginatedRoles.map((role) => (
                  <TableRow
                    key={role.id}
                    className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-800 dark:text-white/90 text-center">
                      {role.id}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-800 dark:text-white/90 font-medium">
                      {role.roleName}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400 text-center">
                      <div className="flex items-center justify-center">
                        <Switch
                          key={`${role.id}-${role.status}`}
                          label=""
                          defaultChecked={role.status === "Active"}
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
                        {hasPermission('roles', 'edit') && (
                          <button
                            onClick={() => handleOpenEdit(role)}
                            className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10 rounded-lg transition cursor-pointer"
                            title="Edit"
                          >
                            <FiEdit className="size-4" />
                          </button>
                        )}
                        {hasPermission('roles', 'delete') && (
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
                    colSpan={4}
                    className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No roles match your search criteria.
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
            itemName="roles"
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
              Delete role
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
