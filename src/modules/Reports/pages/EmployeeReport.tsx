import { useState, useMemo, useEffect, useCallback } from "react";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Badge from "../../../components/ui/badge/Badge";
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import { Dropdown } from "../../../components/ui/dropdown/Dropdown";
import { DropdownItem } from "../../../components/ui/dropdown/DropdownItem";
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
import { FiDownload, FiLoader } from "react-icons/fi";
import { useToast } from "../../../hooks/useToast";
import { useDebounce } from "../../../hooks/useDebounce";
import { EmployeeReportData } from "../data/reportsData";
import { exportToCSV } from "../../../utils/export";
import { reportService } from "../../../services/reportService";

const PAGE_SIZE = 100;

const getStatusDisplayLabel = (status: string) => {
  if (status === "ACTIVE") return "Active";
  if (status === "INACTIVE") return "Inactive";
  return status;
};

interface BackendEmployee {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  status?: string;
  role?: { name: string } | null;
  totalLeads?: number;
  wonLeads?: number;
  lostLeads?: number;
}

const toReportRow = (u: BackendEmployee): EmployeeReportData => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone || "",
  role: u.role?.name || "—",
  status: (u.status === "ACTIVE" ? "Active" : u.status === "INACTIVE" ? "Inactive" : u.status || "Active") as EmployeeReportData["status"],
  totalLeads: u.totalLeads ?? 0,
  wonLeads: u.wonLeads ?? 0,
  lostLeads: u.lostLeads ?? 0,
});

export default function EmployeeReport() {
  const { showToast } = useToast();
  const [employees, setEmployees] = useState<EmployeeReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [sortField, setSortField] = useState<keyof EmployeeReportData>("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [totalItems, setTotalItems] = useState(0);
  const [filterOptions, setFilterOptions] = useState<{ statuses: string[]; roles: string[] }>({
    statuses: [],
    roles: [],
  });

  const debouncedSearch = useDebounce(searchQuery, 400);

  // Dropdown states
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isRoleOpen, setIsRoleOpen] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.getEmployeeReport({
        page: currentPage,
        limit: rowsPerPage,
        search: debouncedSearch.trim() || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        role: roleFilter === "all" ? undefined : roleFilter,
        sortBy: sortField,
        sortOrder,
      });
      setEmployees(Array.isArray(res?.data) ? res.data.map(toReportRow) : []);
      setTotalItems(res?.meta?.total ?? 0);
      setFilterOptions((prev) => ({
        statuses: res?.meta?.filters?.statuses ?? prev.statuses,
        roles: res?.meta?.filters?.roles ?? prev.roles,
      }));
    } catch (err) {
      console.error(err);
      setError("Failed to load employee report data.");
      showToast("Failed to load employee report data.", "error");
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    rowsPerPage,
    debouncedSearch,
    statusFilter,
    roleFilter,
    sortField,
    sortOrder,
    showToast,
  ]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const statusOptions = useMemo(
    () => [
      { value: "all", label: "All Statuses" },
      ...(filterOptions.statuses || []).map((value) => ({ value, label: getStatusDisplayLabel(value) })),
    ],
    [filterOptions.statuses]
  );

  const roleOptions = useMemo(
    () => [
      { value: "all", label: "All Roles" },
      ...(filterOptions.roles || []).map((value) => ({ value, label: value })),
    ],
    [filterOptions.roles]
  );

  const handleSort = (field: keyof EmployeeReportData) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalItems / rowsPerPage);

  const renderSortHeader = (label: string, field: keyof EmployeeReportData) => {
    const isActive = sortField === field;
    return (
      <button
        onClick={() => handleSort(field)}
        className="flex items-center gap-1.5 font-medium hover:text-gray-900 dark:hover:text-white cursor-pointer"
      >
        {label}
        <span className="flex flex-col">
          <ChevronUpIcon
            className={`w-3 h-3 -mb-1 transition-colors ${
              isActive && sortOrder === "asc" ? "text-brand-500" : "text-gray-300 dark:text-gray-600"
            }`}
          />
          <ChevronDownIcon
            className={`w-3 h-3 transition-colors ${
              isActive && sortOrder === "desc" ? "text-brand-500" : "text-gray-300 dark:text-gray-600"
            }`}
          />
        </span>
      </button>
    );
  };

  return (
    <>
      <PageMeta
        title="Employee Report | SaiFlow"
        description="View employee performance reports in SaiFlow CRM."
      />
      <PageBreadcrumb pageTitle="Employee Report" />

      {/* Control Area */}
      <div className="flex flex-col gap-4 mb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full lg:w-auto">
          <div className="w-full sm:w-64">
            <Input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Status Filter */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsStatusOpen(!isStatusOpen);
                  setIsRoleOpen(false);
                }}
                className="flex items-center justify-between h-11 w-40 rounded-lg border border-gray-202 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer dropdown-toggle hover:bg-gray-50 dark:hover:bg-white/5"
              >
                <span className="truncate">
                  {statusOptions.find((o) => o.value === statusFilter)?.label}
                </span>
                <ChevronDownIcon className="w-4 h-4 text-gray-550 shrink-0 ml-1" />
              </button>
              <Dropdown
                isOpen={isStatusOpen}
                onClose={() => setIsStatusOpen(false)}
                className="left-0 right-auto w-40 p-1 mt-2"
              >
                <ul className="flex flex-col gap-0.5">
                  {statusOptions.map((opt) => (
                    <li key={opt.value}>
                      <DropdownItem
                        onItemClick={() => {
                          setStatusFilter(opt.value);
                          setCurrentPage(1);
                          setIsStatusOpen(false);
                        }}
                        className={`cursor-pointer rounded-lg text-left w-full px-3 py-2 text-sm ${
                          statusFilter === opt.value
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

            {/* Role Filter */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsRoleOpen(!isRoleOpen);
                  setIsStatusOpen(false);
                }}
                className="flex items-center justify-between h-11 w-44 rounded-lg border border-gray-202 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer dropdown-toggle hover:bg-gray-50 dark:hover:bg-white/5"
              >
                <span className="truncate">
                  {roleOptions.find((o) => o.value === roleFilter)?.label}
                </span>
                <ChevronDownIcon className="w-4 h-4 text-gray-550 shrink-0 ml-1" />
              </button>
              <Dropdown
                isOpen={isRoleOpen}
                onClose={() => setIsRoleOpen(false)}
                className="left-0 right-auto w-48 p-1 mt-2"
              >
                <ul className="flex flex-col gap-0.5">
                  {roleOptions.map((opt) => (
                    <li key={opt.value}>
                      <DropdownItem
                        onItemClick={() => {
                          setRoleFilter(opt.value);
                          setCurrentPage(1);
                          setIsRoleOpen(false);
                        }}
                        className={`cursor-pointer rounded-lg text-left w-full px-3 py-2 text-sm ${
                          roleFilter === opt.value
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
        </div>

        {/* Export Button */}
        <div>
          <Button
            size="sm"
            variant="outline"
            startIcon={<FiDownload className="size-4" />}
            className="w-full sm:w-auto h-11 px-4 py-2.5"
            onClick={async () => {
              // Fetch every page matching the current filters so the exported
              // file always contains the complete, filtered dataset.
              const allRows: EmployeeReportData[] = [];
              let page = 1;
              let total = Infinity;
              try {
                while (allRows.length < total) {
                  const res = await reportService.getEmployeeReport({
                    page,
                    limit: PAGE_SIZE,
                    search: debouncedSearch.trim() || undefined,
                    status: statusFilter === "all" ? undefined : statusFilter,
                    role: roleFilter === "all" ? undefined : roleFilter,
                    sortBy: sortField,
                    sortOrder,
                  });
                  const rows = (res?.data || []).map(toReportRow);
                  allRows.push(...rows);
                  total = res?.meta?.total ?? allRows.length;
                  if (rows.length === 0) break;
                  page += 1;
                }
                const exportRows = allRows.map((r, idx) => ({
                  sno: idx + 1,
                  name: r.name,
                  email: r.email,
                  role: r.role,
                  status: r.status,
                  totalLeads: r.totalLeads,
                  wonLeads: r.wonLeads,
                  lostLeads: r.lostLeads,
                  conversionRate: r.totalLeads > 0 ? `${((r.wonLeads / r.totalLeads) * 100).toFixed(1)}%` : "0%",
                }));
                exportToCSV(
                  exportRows,
                  ["S.No", "Employee Name", "Email Address", "Designation / Role", "Performance Status", "Leads Managed", "Won Count", "Lost Count", "Conversion Rate"],
                  "Employee_Report"
                );
                showToast("Employee report exported successfully.", "success");
              } catch (err) {
                console.error(err);
                showToast("Failed to export employee report.", "error");
              }
            }}
          >
            Export
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] sticky top-0 bg-white dark:bg-gray-900 z-10">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("S.No", "id")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Employee Name", "name")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Email", "email")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Role", "role")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Leads Assigned", "totalLeads")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Won Leads", "wonLeads")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Lost Leads", "lostLeads")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Status", "status")}
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    <span className="inline-flex items-center gap-2">
                      <FiLoader className="size-4 animate-spin" /> Loading employee report data...
                    </span>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="px-5 py-8 text-center text-sm text-error-500"
                  >
                    {error}
                  </TableCell>
                </TableRow>
              ) : employees.length > 0 ? (
                employees.map((row, index) => (
                  <TableRow
                    key={row.id}
                    className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-800 dark:text-white/90">
                      {(currentPage - 1) * rowsPerPage + index + 1}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm font-medium text-gray-800 dark:text-white/90 whitespace-nowrap">
                      {row.name}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {row.email}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {row.role}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-800 dark:text-white/90 text-center">
                      {row.totalLeads}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-success-600 dark:text-success-400 text-center font-medium">
                      {row.wonLeads}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-error-600 dark:text-error-400 text-center font-medium">
                      {row.lostLeads}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm whitespace-nowrap">
                      <Badge size="sm" color={row.status === "Active" ? "success" : "error"}>
                        {row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No employee records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
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
            itemName="records"
          />
        )}
      </div>
    </>
  );
}
