import { useState, useMemo, useEffect, useCallback } from "react";
import { formatDate } from "../../../utils/dateFormatter";
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
import { ProposalReportData } from "../data/reportsData";
import { useToast } from "../../../hooks/useToast";
import { useDebounce } from "../../../hooks/useDebounce";
import { exportToCSV } from "../../../utils/export";
import { reportService } from "../../../services/reportService";

const PAGE_SIZE = 100;

interface BackendProposal {
  id: number;
  proposalNumber: string;
  amount: number | string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lead?: {
    id: number;
    title: string;
    contactPerson: string;
    email: string;
    phone?: string | null;
  } | null;
  quotation?: {
    paymentTerms?: string;
    deliveryTimeline?: string;
  } | null;
}

const toReportRow = (p: BackendProposal): ProposalReportData => ({
  id: p.id,
  proposalNo: p.proposalNumber || "—",
  leadName: p.lead?.contactPerson || "—",
  companyName: p.lead?.title || "—",
  leadEmail: p.lead?.email || "—",
  leadPhone: p.lead?.phone || "—",
  status: p.status || "Draft",
  createdAt: p.createdAt || "",
  updatedAt: p.updatedAt || "",
  totalAmount: Number(p.amount) || 0,
  paymentTerms: p.quotation?.paymentTerms || "—",
  deliveryTimeline: p.quotation?.deliveryTimeline || "—",
});

export default function ProposalReport() {
  const { showToast } = useToast();
  const [proposals, setProposals] = useState<ProposalReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [sortField, setSortField] = useState<keyof ProposalReportData>("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [totalItems, setTotalItems] = useState(0);
  const [filterOptions, setFilterOptions] = useState<{ statuses: string[] }>({ statuses: [] });

  const debouncedSearch = useDebounce(searchQuery, 400);

  // Dropdown states
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.getProposalReport({
        page: currentPage,
        limit: rowsPerPage,
        search: debouncedSearch.trim() || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        sortBy: sortField,
        sortOrder,
      });
      setProposals(Array.isArray(res?.data) ? res.data.map(toReportRow) : []);
      setTotalItems(res?.meta?.total ?? 0);
      setFilterOptions((prev) => ({
        statuses: res?.meta?.filters?.statuses ?? prev.statuses,
      }));
    } catch (err) {
      console.error(err);
      setError("Failed to load proposal report data.");
      showToast("Failed to load proposal report data.", "error");
    } finally {
      setLoading(false);
    }
  }, [currentPage, rowsPerPage, debouncedSearch, statusFilter, sortField, sortOrder, showToast]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const statusOptions = useMemo(
    () => [
      { value: "all", label: "All Statuses" },
      ...(filterOptions.statuses || []).map((value) => ({ value, label: value })),
    ],
    [filterOptions.statuses]
  );

  const handleSort = (field: keyof ProposalReportData) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalItems / rowsPerPage);

  const getProposalStatusColor = (status: string) => {
    switch (status) {
      case "Draft":
        return "light";
      case "Sent":
        return "info";
      case "Under Review":
        return "info";
      case "Negotiation":
        return "warning";
      case "Approved":
        return "success";
      case "Rejected":
        return "error";
      case "Converted":
        return "success";
      default:
        return "light";
    }
  };

  const renderSortHeader = (label: string, field: keyof ProposalReportData) => {
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
        title="Proposal Report | SaiFlow"
        description="View proposal performance reports in SaiFlow CRM."
      />
      <PageBreadcrumb pageTitle="Proposal Report" />

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
                }}
                className="flex items-center justify-between h-11 w-44 rounded-lg border border-gray-202 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer dropdown-toggle hover:bg-gray-50 dark:hover:bg-white/5"
              >
                <span className="truncate">
                  {statusOptions.find((o) => o.value === statusFilter)?.label}
                </span>
                <ChevronDownIcon className="w-4 h-4 text-gray-550 shrink-0 ml-1" />
              </button>
              <Dropdown
                isOpen={isStatusOpen}
                onClose={() => setIsStatusOpen(false)}
                className="left-0 right-auto w-48 p-1 mt-2"
              >
                <ul className="flex flex-col gap-0.5 max-h-60 overflow-y-auto custom-scrollbar">
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
              const allRows: ProposalReportData[] = [];
              let page = 1;
              let total = Infinity;
              try {
                while (allRows.length < total) {
                  const res = await reportService.getProposalReport({
                    page,
                    limit: PAGE_SIZE,
                    search: debouncedSearch.trim() || undefined,
                    status: statusFilter === "all" ? undefined : statusFilter,
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
                  proposalNo: r.proposalNo,
                  leadName: r.leadName,
                  companyName: r.companyName,
                  leadEmail: r.leadEmail,
                  leadPhone: r.leadPhone,
                  status: r.status,
                  createdAt: r.createdAt ? r.createdAt.split("T")[0] : "",
                  updatedAt: r.updatedAt ? r.updatedAt.split("T")[0] : "",
                  totalAmount: r.totalAmount,
                  paymentTerms: r.paymentTerms,
                  deliveryTimeline: r.deliveryTimeline,
                }));
                exportToCSV(
                  exportRows,
                  ["S.No", "Proposal No", "Lead Name", "Company", "Email", "Phone", "Status", "Created At", "Updated At", "Total Amount", "Payment Terms", "Delivery Timeline"],
                  "Proposal_Report"
                );
                showToast("Proposal report exported successfully.", "success");
              } catch (err) {
                console.error(err);
                showToast("Failed to export proposal report.", "error");
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
                  {renderSortHeader("Proposal No", "proposalNo")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Lead Name", "leadName")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Company", "companyName")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Email", "leadEmail")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Phone", "leadPhone")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Status", "status")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Created", "createdAt")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Updated", "updatedAt")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Amount", "totalAmount")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Payment Terms", "paymentTerms")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Timeline", "deliveryTimeline")}
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
                      <FiLoader className="size-4 animate-spin" /> Loading proposal report data...
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
              ) : proposals.length > 0 ? (
                proposals.map((row, index) => (
                  <TableRow
                    key={row.id}
                    className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-800 dark:text-white/90">
                      {(currentPage - 1) * rowsPerPage + index + 1}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm font-medium text-gray-800 dark:text-white/90 whitespace-nowrap">
                      {row.proposalNo}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {row.leadName}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {row.companyName}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {row.leadEmail}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {row.leadPhone}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm whitespace-nowrap">
                      <Badge size="sm" color={getProposalStatusColor(row.status)}>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(row.createdAt)}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(row.updatedAt)}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-800 dark:text-white/90 whitespace-nowrap font-medium">
                      ${row.totalAmount.toLocaleString()}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-400 whitespace-nowrap max-w-[180px] truncate" title={row.paymentTerms}>
                      {row.paymentTerms}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-400 whitespace-nowrap max-w-[180px] truncate" title={row.deliveryTimeline}>
                      {row.deliveryTimeline}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={12}
                    className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No proposal records found.
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
