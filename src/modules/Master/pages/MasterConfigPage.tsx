import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { masterService } from "../../../services/masterService";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Button from "../../../components/ui/button/Button";
import Switch from "../../../components/form/switch/Switch";
import Input from "../../../components/form/input/InputField";
import { Modal } from "../../../components/ui/modal";
import { useModal } from "../../../hooks/useModal";
// import { Dropdown } from "../../../components/ui/dropdown/Dropdown"; // Status filter commented out
import { useDebounce } from "../../../hooks/useDebounce";
// import { DropdownItem } from "../../../components/ui/dropdown/DropdownItem"; // Status filter commented out
import { Pagination } from "../../../components/ui/pagination/Pagination";
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
import { FiEdit, FiTrash2, FiPlus } from "react-icons/fi";
import { useToast } from "../../../hooks/useToast";
import { useAuth } from "../../../context/AuthContext";

export interface MasterItem {
  id: number;
  name: string;
  description?: string;
  status: "Active" | "Inactive";
}

interface MasterConfigPageProps {
  pageTitle: string;
  itemNameSingular: string; // e.g. "lead source"
  itemNamePlural: string; // e.g. "lead sources"
  initialData: MasterItem[];
  storageKey: string;
}

export default function MasterConfigPage({
  pageTitle,
  itemNameSingular,
  itemNamePlural,
  initialData,
  storageKey,
}: MasterConfigPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const { hasPermission } = useAuth();
  const [items, setItems] = useState<MasterItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Satisfy strict compiler checks for props used in routing wrapper
  if (initialData && storageKey) { /* no-op */ }
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [statusFilter, setStatusFilter] = useState("all");
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof MasterItem>("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Dropdown filter open states
  // const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false); // Status filter commented out

  // Modal control states
  const deleteModal = useModal();

  // Active items mappings
  const [selectedItem, setSelectedItem] = useState<MasterItem | null>(null);

  const type = useMemo(() => location.pathname.split("/").pop() || "", [location.pathname]);

  const category = useMemo(() => {
    switch (type) {
      case "countries": return "COUNTRY";
      case "states": return "STATE";
      case "cities": return "CITY";
      case "departments": return "DEPARTMENT";
      case "designations": return "DESIGNATION";
      case "lead-sources": return "LEAD_SOURCE";
      case "industries": return "INDUSTRY";
      case "tech-stack": return "TECH_STACK";
      case "priorities": return "PRIORITY";
      case "services": return "SERVICE";
      case "company-types": return "COMPANY_TYPE";
      case "payment-types": return "PAYMENT_TYPE";
      case "followup-types": return "FOLLOWUP_TYPE";
      default: return "";
    }
  }, [type]);

  const loadItems = async () => {
    try {
      if (category) {
        const res = await masterService.getMasterItems(category, undefined, {
          paginate: true,
          page: currentPage,
          limit: rowsPerPage,
          search: debouncedSearchQuery || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined
        });
        // Handle both raw lists and paginated response objects
        if (res.data) {
          setItems(res.data);
          setTotalItems(res.meta?.total || 0);
          setTotalPages(res.meta?.totalPages || 0);
        } else {
          setItems(res);
          setTotalItems(res.length || 0);
          setTotalPages(1);
        }
      }
    } catch (err: any) {
      showToast("Failed to load master items.", "error");
    }
  };

  // Reload when query parameters change
  useEffect(() => {
    loadItems();
  }, [category, currentPage, rowsPerPage, debouncedSearchQuery, statusFilter]);

  // Reset page when category changes
  useEffect(() => {
    setSearchQuery("");
    setStatusFilter("all");
    setCurrentPage(1);
    setSortField("id");
    setSortOrder("asc");
  }, [category]);

  // Handlers
  const handleOpenCreate = () => {
    navigate(`/master/${type}/add`);
  };

  const handleOpenEdit = (item: MasterItem) => {
    navigate(`/master/${type}/${item.id}/edit`);
  };

  const handleOpenDelete = (item: MasterItem) => {
    setSelectedItem(item);
    deleteModal.openModal();
  };

  const handleToggleStatus = async (item: MasterItem, checked: boolean) => {
    const newStatus: MasterItem["status"] = checked ? "Active" : "Inactive";
    try {
      await masterService.updateMasterItem(item.id, { status: newStatus });
      const updated = items.map((i) =>
        i.id === item.id ? { ...i, status: newStatus } : i
      );
      setItems(updated);
      showToast(`"${item.name}" marked as ${newStatus}.`, "success");
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to update status.", "error");
    }
  };

  const handleDeleteConfirm = async () => {
    if (selectedItem) {
      try {
        await masterService.deleteMasterItem(selectedItem.id);
        const updated = items.filter((i) => i.id !== selectedItem.id);
        setItems(updated);
        showToast(`"${selectedItem.name}" ${itemNameSingular} deleted successfully.`, "success");
      } catch (err: any) {
        showToast(err.response?.data?.message || `Cannot delete "${selectedItem.name}" because it is currently in use.`, "error");
      }
    }
    deleteModal.closeModal();
  };

  // Sorting columns handler
  const handleSort = (field: keyof MasterItem) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  // Filters & Sorting calculations
  const processedItems = useMemo(() => {
    let result = [...items];

    // Since searching and filtering status are done on the server, we only sort here!
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
  }, [items, sortField, sortOrder]);

  // Paginated items (server already handles pagination, so we render whole list)
  const paginatedItems = processedItems;

  // Sorting header renderer
  const renderSortHeader = (label: string, field: keyof MasterItem, centered = false) => {
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
        title={`${pageTitle} | SaiFlow`}
        description="Manage configuration settings in SaiFlow CRM."
      />
      {/* Page Title & Breadcrumb */}
      <PageBreadcrumb pageTitle={pageTitle} />

      {/* Control Panel Area above Table */}
      <div className="flex flex-col gap-4 mb-4 md:flex-row md:flex-wrap md:items-center md:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full md:w-auto">
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
          {/* Commented out per Task 1: Status filter hidden
          <div className="relative">
            <button
              onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
              className="flex items-center justify-between h-11 w-40 rounded-lg border border-gray-205 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer dropdown-toggle hover:bg-gray-50 dark:hover:bg-white/5"
            >
              <span>
                {statusFilter === "all" ? "All Statuses" : statusFilter}
              </span>
              <ChevronDownIcon className="w-4 h-4 text-gray-505" />
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
          */}
        </div>

        {/* Primary Action Button */}
        {hasPermission('master', 'create') && (
          <div className="shrink-0">
            <Button
              size="sm"
              onClick={handleOpenCreate}
              startIcon={<FiPlus className="size-4" />}
              className="w-full sm:w-auto h-11 px-4 py-2.5"
            >
              Add {itemNameSingular}
            </Button>
          </div>
        )}
      </div>

      {/* Table Container */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          <Table className="w-full">
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] sticky top-0 bg-white dark:bg-gray-900 z-10">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[70px]">
                  {renderSortHeader("S.No", "id", true)}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[45%]">
                  {renderSortHeader("Name", "name")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[180px]">
                  {renderSortHeader("Status", "status", true)}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400 w-[120px]">
                  Action
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {paginatedItems.length > 0 ? (
                paginatedItems.map((item) => (
                  <TableRow
                    key={item.id}
                    className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-800 dark:text-white/90 text-center w-[70px]">
                      {item.id}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-800 dark:text-white/90 font-medium w-[45%]">
                      {item.name}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400 text-center w-[180px]">
                      <div className="flex items-center justify-center">
                        <Switch
                          key={`${item.id}-${item.status}`}
                          label=""
                          defaultChecked={item.status === "Active"}
                          color="success"
                          onChange={(checked) => handleToggleStatus(item, checked)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {hasPermission('master', 'edit') && (
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10 rounded-lg transition cursor-pointer"
                            title="Edit"
                          >
                            <FiEdit className="size-4" />
                          </button>
                        )}
                        {hasPermission('master', 'delete') && (
                          <button
                            onClick={() => handleOpenDelete(item)}
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
                    No items found matching search criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Reusable Global Pagination */}
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
            itemName={itemNamePlural}
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
              Delete {itemNameSingular}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to delete this {itemNameSingular}? This action cannot be undone.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button size="sm" variant="outline" onClick={deleteModal.closeModal} className="w-1/2">
              Cancel
            </Button>
            <Button size="sm" onClick={handleDeleteConfirm} className="w-1/2 bg-error-600 hover:bg-error-750">
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
