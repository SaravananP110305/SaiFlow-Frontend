import { useState, useMemo, useEffect, useCallback } from "react";
import { formatDate, formatTime } from "../../../utils/dateFormatter";
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
import { FiDownload, FiLoader, FiVideo, FiMapPin } from "react-icons/fi";
import { useToast } from "../../../hooks/useToast";
import { useDebounce } from "../../../hooks/useDebounce";
import { MeetingReportData } from "../data/reportsData";
import { exportToCSV } from "../../../utils/export";
import { reportService } from "../../../services/reportService";

const PAGE_SIZE = 100;

interface BackendMeeting {
  id: number;
  title: string | null;
  scheduledAt: string;
  meetingLink?: string | null;
  status: string;
  lead?: { id: number; title: string; contactPerson: string } | null;
  createdBy?: { id: number; name: string } | null;
}

const getLocalDateString = (isoString: string) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getLocalTimeString = (isoString: string) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const getMeetingType = (link: string | null | undefined) => {
  if (!link) return "Offline";
  const trimmed = link.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    if (/meet\.google\.com/i.test(trimmed)) return "Google Meet";
    if (/zoom\.us/i.test(trimmed)) return "Zoom";
    if (/teams\.(microsoft|live)\.com/i.test(trimmed)) return "Microsoft Teams";
    return "Online";
  }
  return "Offline";
};

const getMeetingStatusLabel = (status: string) => {
  switch (status) {
    case "SCHEDULED":
      return "Scheduled";
    case "RESCHEDULED":
      return "Rescheduled";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
};

const toReportRow = (bm: BackendMeeting): MeetingReportData => ({
  id: bm.id,
  subject: bm.title || "—",
  company: bm.lead?.title || "—",
  contactPerson: bm.lead?.contactPerson || "—",
  date: bm.scheduledAt ? getLocalDateString(bm.scheduledAt) : "",
  time: bm.scheduledAt ? getLocalTimeString(bm.scheduledAt) : "",
  type: getMeetingType(bm.meetingLink),
  status: getMeetingStatusLabel(bm.status),
  createdBy: bm.createdBy?.name || "",
});

export default function MeetingReport() {
  const { showToast } = useToast();
  const [meetings, setMeetings] = useState<MeetingReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [sortField, setSortField] = useState<keyof MeetingReportData>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [totalItems, setTotalItems] = useState(0);
  const [filterOptions, setFilterOptions] = useState<{ statuses: string[]; types: string[] }>({
    statuses: [],
    types: [],
  });

  const debouncedSearch = useDebounce(searchQuery, 400);

  // Dropdown states
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.getMeetingReport({
        page: currentPage,
        limit: rowsPerPage,
        search: debouncedSearch.trim() || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        type: typeFilter === "all" ? undefined : typeFilter,
        sortBy: sortField,
        sortOrder,
      });
      setMeetings(Array.isArray(res?.data) ? res.data.map(toReportRow) : []);
      setTotalItems(res?.meta?.total ?? 0);
      setFilterOptions((prev) => ({
        statuses: res?.meta?.filters?.statuses ?? prev.statuses,
        types: res?.meta?.filters?.types ?? prev.types,
      }));
    } catch (err) {
      console.error(err);
      setError("Failed to load meeting report data.");
      showToast("Failed to load meeting report data.", "error");
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    rowsPerPage,
    debouncedSearch,
    statusFilter,
    typeFilter,
    sortField,
    sortOrder,
    showToast,
  ]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const statusOptions = useMemo(
    () => [
      { value: "all", label: "All Statuses" },
      ...(filterOptions.statuses || []).map((value) => ({
        value,
        label: getMeetingStatusLabel(value),
      })),
    ],
    [filterOptions.statuses]
  );

  const typeOptions = useMemo(
    () => [
      { value: "all", label: "All Types" },
      ...(filterOptions.types || []).map((value) => ({ value, label: value })),
    ],
    [filterOptions.types]
  );

  const handleSort = (field: keyof MeetingReportData) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalItems / rowsPerPage);

  const getMeetingStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "success";
      case "Scheduled":
        return "primary";
      case "Rescheduled":
        return "info";
      case "Cancelled":
        return "error";
      default:
        return "light";
    }
  };

  const renderSortHeader = (label: string, field: keyof MeetingReportData) => {
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
        title="Meeting Report | SaiFlow"
        description="View meeting performance reports in SaiFlow CRM."
      />
      <PageBreadcrumb pageTitle="Meeting Report" />

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
                  setIsTypeOpen(false);
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

            {/* Type Filter */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsTypeOpen(!isTypeOpen);
                  setIsStatusOpen(false);
                }}
                className="flex items-center justify-between h-11 w-40 rounded-lg border border-gray-202 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer dropdown-toggle hover:bg-gray-50 dark:hover:bg-white/5"
              >
                <span className="truncate">
                  {typeOptions.find((o) => o.value === typeFilter)?.label}
                </span>
                <ChevronDownIcon className="w-4 h-4 text-gray-550 shrink-0 ml-1" />
              </button>
              <Dropdown
                isOpen={isTypeOpen}
                onClose={() => setIsTypeOpen(false)}
                className="left-0 right-auto w-44 p-1 mt-2"
              >
                <ul className="flex flex-col gap-0.5">
                  {typeOptions.map((opt) => (
                    <li key={opt.value}>
                      <DropdownItem
                        onItemClick={() => {
                          setTypeFilter(opt.value);
                          setCurrentPage(1);
                          setIsTypeOpen(false);
                        }}
                        className={`cursor-pointer rounded-lg text-left w-full px-3 py-2 text-sm ${
                          typeFilter === opt.value
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
              const allRows: MeetingReportData[] = [];
              let page = 1;
              let total = Infinity;
              try {
                while (allRows.length < total) {
                  const res = await reportService.getMeetingReport({
                    page,
                    limit: PAGE_SIZE,
                    search: debouncedSearch.trim() || undefined,
                    status: statusFilter === "all" ? undefined : statusFilter,
                    type: typeFilter === "all" ? undefined : typeFilter,
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
                  subject: r.subject,
                  company: r.company,
                  contactPerson: r.contactPerson,
                  date: r.date,
                  time: r.time,
                  type: r.type,
                  status: r.status,
                  createdBy: r.createdBy || "",
                }));
                exportToCSV(
                  exportRows,
                  ["S.No", "Subject", "Company", "Contact Person", "Meeting Date", "Meeting Time", "Meeting Type", "Meeting Status", "Created By"],
                  "Meeting_Report"
                );
                showToast("Meeting report exported successfully.", "success");
              } catch (err) {
                console.error(err);
                showToast("Failed to export meeting report.", "error");
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
                  {renderSortHeader("Subject", "subject")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Company", "company")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Contact Person", "contactPerson")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Date", "date")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Time", "time")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Meeting Type", "type")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Status", "status")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Created By", "createdBy")}
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    <span className="inline-flex items-center gap-2">
                      <FiLoader className="size-4 animate-spin" /> Loading meeting report data...
                    </span>
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="px-5 py-8 text-center text-sm text-error-500"
                  >
                    {error}
                  </TableCell>
                </TableRow>
              ) : meetings.length > 0 ? (
                meetings.map((row, index) => (
                  <TableRow
                    key={row.id}
                    className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-800 dark:text-white/90">
                      {(currentPage - 1) * rowsPerPage + index + 1}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm font-medium text-gray-800 dark:text-white/90 whitespace-nowrap">
                      {row.subject}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {row.company}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {row.contactPerson}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(row.date)}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {formatTime(row.time)}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {row.type !== "Offline" ? (
                          <>
                            <FiVideo className="size-4 text-brand-500" />
                            <span>{row.type}</span>
                          </>
                        ) : (
                          <>
                            <FiMapPin className="size-4 text-gray-400" />
                            <span>Offline</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm whitespace-nowrap">
                      <Badge size="sm" color={getMeetingStatusColor(row.status)}>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {row.createdBy || "—"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No meeting records found.
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
