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
import { ClientReportData } from "../data/reportsData";
import { useToast } from "../../../hooks/useToast";
import { useDebounce } from "../../../hooks/useDebounce";
import { exportToCSV } from "../../../utils/export";
import { reportService } from "../../../services/reportService";

const PAGE_SIZE = 100;

interface BackendClient {
  id: number;
  status?: string;
  paymentTerms?: string | null;
  creditLimit?: string | number | null;
  createdAt: string;
  company?: {
    name: string;
    email?: string | null;
    phone?: string | null;
    industry?: { name: string } | null;
  } | null;
  lead?: {
    contactPerson?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  relationshipManager?: { name: string } | null;
  accountManager?: { name: string } | null;
  projects?: unknown[] | null;
}

const toReportRow = (c: BackendClient): ClientReportData => ({
  id: c.id,
  companyName: c.company?.name || "—",
  contactName: c.lead?.contactPerson || "—",
  email: c.lead?.email || c.company?.email || "—",
  phone: c.lead?.phone || c.company?.phone || "—",
  industry: c.company?.industry?.name || "",
  status: (c.status || "Active") as ClientReportData["status"],
  clientSince: c.createdAt ? c.createdAt.split("T")[0] : "",
  relationshipManager: c.relationshipManager?.name || "",
  accountManager: c.accountManager?.name || "",
  projectsCount: c.projects?.length || 0,
  handoverStatus: c.projects && c.projects.length > 0 ? "Onboarded" : "Pending",
  paymentTerms: c.paymentTerms || "",
  creditLimit: c.creditLimit != null ? String(c.creditLimit) : "",
});

export default function ClientReport() {
  const { showToast } = useToast();
  const [clients, setClients] = useState<ClientReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [sortField, setSortField] = useState<keyof ClientReportData>("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [totalItems, setTotalItems] = useState(0);
  const [filterOptions, setFilterOptions] = useState<{ statuses: string[]; industries: string[] }>({
    statuses: [],
    industries: [],
  });

  const debouncedSearch = useDebounce(searchQuery, 400);

  // Dropdown states
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isIndustryOpen, setIsIndustryOpen] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.getClientReport({
        page: currentPage,
        limit: rowsPerPage,
        search: debouncedSearch.trim() || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        industry: industryFilter === "all" ? undefined : industryFilter,
        sortBy: sortField,
        sortOrder,
      });
      setClients(Array.isArray(res?.data) ? res.data.map(toReportRow) : []);
      setTotalItems(res?.meta?.total ?? 0);
      setFilterOptions((prev) => ({
        statuses: res?.meta?.filters?.statuses ?? prev.statuses,
        industries: res?.meta?.filters?.industries ?? prev.industries,
      }));
    } catch (err) {
      console.error(err);
      setError("Failed to load client report data.");
      showToast("Failed to load client report data.", "error");
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    rowsPerPage,
    debouncedSearch,
    statusFilter,
    industryFilter,
    sortField,
    sortOrder,
    showToast,
  ]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const statusOptions = useMemo(
    () => [
      { value: "all", label: "All Statuses" },
      ...(filterOptions.statuses || []).map((value) => ({ value, label: value })),
    ],
    [filterOptions.statuses]
  );

  const industryOptions = useMemo(
    () => [
      { value: "all", label: "All Industries" },
      ...(filterOptions.industries || []).map((value) => ({ value, label: value })),
    ],
    [filterOptions.industries]
  );

  const handleSort = (field: keyof ClientReportData) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalItems / rowsPerPage);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "success";
      case "Inactive":
        return "warning";
      case "Blacklisted":
        return "error";
      default:
        return "light";
    }
  };

  const getHandoverColor = (status: string) => {
    switch (status) {
      case "Onboarded":
        return "success";
      case "Pending":
        return "warning";
      default:
        return "light";
    }
  };

  const renderSortHeader = (label: string, field: keyof ClientReportData) => {
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
        title="Client Report | SaiFlow"
        description="View client performance reports in SaiFlow CRM."
      />
      <PageBreadcrumb pageTitle="Client Report" />

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
                  setIsIndustryOpen(false);
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

            {/* Industry Filter */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsIndustryOpen(!isIndustryOpen);
                  setIsStatusOpen(false);
                }}
                className="flex items-center justify-between h-11 w-48 rounded-lg border border-gray-202 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer dropdown-toggle hover:bg-gray-50 dark:hover:bg-white/5"
              >
                <span className="truncate">
                  {industryOptions.find((o) => o.value === industryFilter)?.label}
                </span>
                <ChevronDownIcon className="w-4 h-4 text-gray-550 shrink-0 ml-1" />
              </button>
              <Dropdown
                isOpen={isIndustryOpen}
                onClose={() => setIsIndustryOpen(false)}
                className="left-0 right-auto w-52 p-1 mt-2"
              >
                <ul className="flex flex-col gap-0.5 max-h-60 overflow-y-auto custom-scrollbar">
                  {industryOptions.map((opt) => (
                    <li key={opt.value}>
                      <DropdownItem
                        onItemClick={() => {
                          setIndustryFilter(opt.value);
                          setCurrentPage(1);
                          setIsIndustryOpen(false);
                        }}
                        className={`cursor-pointer rounded-lg text-left w-full px-3 py-2 text-sm ${
                          industryFilter === opt.value
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
              const allRows: ClientReportData[] = [];
              let page = 1;
              let total = Infinity;
              try {
                while (allRows.length < total) {
                  const res = await reportService.getClientReport({
                    page,
                    limit: PAGE_SIZE,
                    search: debouncedSearch.trim() || undefined,
                    status: statusFilter === "all" ? undefined : statusFilter,
                    industry: industryFilter === "all" ? undefined : industryFilter,
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
                  companyName: r.companyName,
                  contactName: r.contactName,
                  email: r.email,
                  phone: r.phone,
                  industry: r.industry,
                  status: r.status,
                  clientSince: r.clientSince,
                  projectsCount: r.projectsCount,
                  handoverStatus: r.handoverStatus,
                  paymentTerms: r.paymentTerms,
                  creditLimit: r.creditLimit,
                }));
                exportToCSV(
                  exportRows,
                  ["S.No", "Company Name", "Contact Person", "Email", "Phone", "Industry", "Status", "Client Since", "Projects", "Handover Status", "Payment Terms", "Credit Limit"],
                  "Client_Report"
                );
                showToast("Client report exported successfully.", "success");
              } catch (err) {
                console.error(err);
                showToast("Failed to export client report.", "error");
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
                  {renderSortHeader("Company", "companyName")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Contact Person", "contactName")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Email", "email")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Phone", "phone")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Industry", "industry")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Status", "status")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Client Since", "clientSince")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Projects", "projectsCount")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Handover", "handoverStatus")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Payment Terms", "paymentTerms")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Credit Limit", "creditLimit")}
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={12}
                    className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    <span className="inline-flex items-center gap-2">
                      <FiLoader className="size-4 animate-spin" /> Loading client report data...
                    </span>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={12}
                    className="px-5 py-8 text-center text-sm text-error-500"
                  >
                    {error}
                  </TableCell>
                </TableRow>
              ) : clients.length > 0 ? (
                clients.map((row, index) => (
                  <TableRow
                    key={row.id}
                    className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-800 dark:text-white/90">
                      {(currentPage - 1) * rowsPerPage + index + 1}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm font-medium text-gray-800 dark:text-white/90 whitespace-nowrap">
                      {row.companyName}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {row.contactName}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {row.email}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {row.phone}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {row.industry || "—"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm whitespace-nowrap">
                      <Badge size="sm" color={getStatusColor(row.status)}>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {row.clientSince}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-800 dark:text-white/90 text-center">
                      {row.projectsCount}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm whitespace-nowrap">
                      <Badge size="sm" color={getHandoverColor(row.handoverStatus)}>
                        {row.handoverStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {row.paymentTerms || "—"}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-800 dark:text-white/90 whitespace-nowrap">
                      {row.creditLimit && Number(row.creditLimit) > 0
                        ? `₹${Number(row.creditLimit).toLocaleString()}`
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={12}
                    className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No client records found.
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
