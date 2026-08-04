import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import Badge from "../../../components/ui/badge/Badge";
import { Modal } from "../../../components/ui/modal";
import { useModal } from "../../../hooks/useModal";
import { useDebounce } from "../../../hooks/useDebounce";
import { Pagination } from "../../../components/ui/pagination/Pagination";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "../../../components/ui/table";
import {
  FiEye,
  FiEdit,
  FiTrash2,
  FiPlus,
  FiUpload,
  FiDownload,
  FiRefreshCw,
  FiAlertCircle,
} from "react-icons/fi";
import { useToast } from "../../../hooks/useToast";
import { useAuth } from "../../../context/AuthContext";
import * as XLSX from "xlsx";
import {
  leadService,
  type LeadQuery,
  type ImportRow,
} from "../../../services/leadService";
import { userService } from "../../../services/userService";
import { masterService } from "../../../services/masterService";
import {
  LEAD_STATUSES,
  getStatusLabel,
  getStatusBadgeColor,
  getPriorityBadgeColor,
} from "../utils/leadStatus";

interface LeadRow {
  id: number;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  status: string;
  priority: string;
  assignedToId: number | null;
  assignedToName: string;
  sourceName: string;
  createdAt: string;
}

const toLeadRow = (l: any): LeadRow => ({
  id: l.id,
  companyName: l.company?.name || l.title || "—",
  contactPerson: l.contactPerson || "—",
  email: l.email || "—",
  phone: l.phone || "—",
  status: l.status || "NEW",
  priority: l.priority?.name || "",
  assignedToId: l.assignedToId ?? null,
  assignedToName: l.assignedTo?.name || "Unassigned",
  sourceName: l.source?.name || "",
  createdAt: l.createdAt || "",
});

const selectClass =
  "h-11 w-full sm:w-40 appearance-none rounded-lg border border-gray-200 bg-transparent px-3.5 py-2.5 pr-9 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer";

const selectChevron = {
  backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
  backgroundPosition: "right 0.65rem center",
  backgroundSize: "1.1rem",
  backgroundRepeat: "no-repeat",
};

const STATUS_SUMMARY_ORDER = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"];

export default function LeadList() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { hasPermission } = useAuth();

  const uploadModal = useModal();
  const deleteModal = useModal();

  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Server-side filters
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");

  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Master data
  const [users, setUsers] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [priorities, setPriorities] = useState<any[]>([]);
  const [industries, setIndustries] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  // Selection / bulk actions
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkAssignee, setBulkAssignee] = useState("");
  const [showBulkAssign, setShowBulkAssign] = useState(false);

  // Upload modal
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  // Delete modal
  const [selectedLead, setSelectedLead] = useState<LeadRow | null>(null);

  const buildParams = (): LeadQuery => ({
    page: currentPage,
    limit: rowsPerPage,
    ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
    ...(statusFilter !== "all" && { status: statusFilter }),
    ...(sourceFilter !== "all" && { sourceId: Number(sourceFilter) }),
    ...(priorityFilter !== "all" && { priorityId: Number(priorityFilter) }),
    ...(assigneeFilter !== "all" && { assignedToId: Number(assigneeFilter) }),
    sortBy: sortField,
    sortOrder,
  });

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await leadService.getLeads(buildParams());
      setLeads((res.data || []).map(toLeadRow));
      setTotalItems(res.meta?.total || 0);
      setTotalPages(res.meta?.totalPages || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch leads.");
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    rowsPerPage,
    debouncedSearch,
    statusFilter,
    sourceFilter,
    priorityFilter,
    assigneeFilter,
    sortField,
    sortOrder,
  ]);

  const loadFiltersAndStats = useCallback(async () => {
    try {
      const [usersRes, sourcesRes, prioritiesRes, industriesRes, countriesRes, statsRes] =
        await Promise.all([
          userService.getAssignees(),
          masterService.getMasterItems("LEAD_SOURCE", undefined, { status: "Active" }),
          masterService.getMasterItems("PRIORITY", undefined, { status: "Active" }),
          masterService.getMasterItems("INDUSTRY", undefined, { status: "Active" }),
          masterService.getMasterItems("COUNTRY", undefined, { status: "Active" }),
          leadService.getStatusCounts(),
        ]);
      setUsers(usersRes.data || []);
      setSources(sourcesRes || []);
      setPriorities(prioritiesRes || []);
      setIndustries(industriesRes || []);
      setCountries(countriesRes || []);
      setStats(statsRes || null);
    } catch (err) {
      console.error("Failed to load filter/master data", err);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    loadFiltersAndStats();
  }, [loadFiltersAndStats]);

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSourceFilter("all");
    setPriorityFilter("all");
    setAssigneeFilter("all");
    setCurrentPage(1);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const selectAll = useMemo(
    () => leads.length > 0 && selectedIds.length === leads.length,
    [leads, selectedIds]
  );
  const isIndeterminate = useMemo(
    () => selectedIds.length > 0 && selectedIds.length < leads.length,
    [leads, selectedIds]
  );

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(leads.map((l) => l.id));
    }
  };

  const handleDirectAssign = async (leadId: number, userIdStr: string) => {
    if (!userIdStr) return;
    try {
      await leadService.assignLead(leadId, Number(userIdStr));
      showToast("Lead assigned successfully.", "success");
      fetchLeads();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to assign lead.", "error");
    }
  };

  const handleOpenDelete = (lead: LeadRow) => {
    setSelectedLead(lead);
    deleteModal.openModal();
  };

  const handleDeleteConfirm = async () => {
    if (!selectedLead) return;
    try {
      await leadService.deleteLead(selectedLead.id);
      showToast(`Lead "${selectedLead.companyName}" deleted successfully.`, "success");
      fetchLeads();
      setSelectedIds((prev) => prev.filter((id) => id !== selectedLead.id));
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to delete lead.", "error");
    }
    deleteModal.closeModal();
  };

  const handleBulkReassign = async () => {
    if (selectedIds.length === 0 || !bulkAssignee) return;
    try {
      const result = await leadService.bulkAssign(selectedIds, Number(bulkAssignee));
      showToast(`${result?.processed || selectedIds.length} lead(s) reassigned successfully.`, "success");
      setSelectedIds([]);
      setBulkAssignee("");
      setShowBulkAssign(false);
      fetchLeads();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to bulk reassign leads.", "error");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      const result = await leadService.bulkDelete(selectedIds);
      showToast(`${result?.processed || selectedIds.length} lead(s) deleted successfully.`, "success");
      setSelectedIds([]);
      fetchLeads();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to bulk delete leads.", "error");
    }
  };

  const handleExport = async () => {
    try {
      const params: LeadQuery = {
        ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(sourceFilter !== "all" && { sourceId: Number(sourceFilter) }),
        ...(priorityFilter !== "all" && { priorityId: Number(priorityFilter) }),
        ...(assigneeFilter !== "all" && { assignedToId: Number(assigneeFilter) }),
        sortBy: sortField,
        sortOrder,
      };
      const blob = await leadService.exportLeads(params);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `saiflow_leads_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast("Leads exported to CSV.", "success");
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to export leads.", "error");
    }
  };

  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        "Company Name": "Google LLC",
        "Contact Person": "Larry Page",
        "Designation": "Chief Executive Officer",
        "Mobile Number": "9876543210",
        "Alternate Mobile": "9876543219",
        "Email Address": "larry@google.com",
        "Alternate Email": "larry.page@google.com",
        "Website": "https://google.com",
        "Industry": "Information Technology",
        "Country": "United States",
        "Address Line 1": "1600 Amphitheatre Parkway",
        "Pincode": "94043",
        "Lead Source": "Website",
        "Priority": "High",
        "Lead Owner": "Jane Smith",
        "Budget": "50000",
      },
    ];
    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads Template");
    XLSX.writeFile(workbook, "saiflow_leads_sample_template.xlsx");
    showToast("Sample Excel template downloaded successfully.", "success");
  };

  const resolveByName = (list: any[], name?: string): number | null => {
    const value = (name || "").trim().toLowerCase();
    if (!value) return null;
    const match = (list || []).find((x: any) => String(x.name || "").toLowerCase() === value);
    return match ? match.id : null;
  };

  const handleImport = async () => {
    if (!uploadedFile) return;
    setImporting(true);
    try {
      const arrayBuffer = await uploadedFile.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

      const rows: ImportRow[] = [];
      for (const r of jsonRows) {
        const companyName = String(r["Company Name"] || r["company"] || "").trim();
        const contactPerson = String(r["Contact Person"] || "").trim();
        const email = String(r["Email Address"] || "").trim();
        if (!companyName && !contactPerson && !email) continue;

        const priorityName = String(r["Priority"] || "").trim();
        rows.push({
          title: companyName || contactPerson || "Untitled Lead",
          companyName: companyName || null,
          contactPerson: contactPerson || null,
          designation: String(r["Designation"] || "").trim() || null,
          phone: String(r["Mobile Number"] || "").trim() || null,
          alternatePhone: String(r["Alternate Mobile"] || "").trim() || null,
          email: email || null,
          alternateEmail: String(r["Alternate Email"] || "").trim() || null,
          website: String(r["Website"] || "").trim() || null,
          address: String(r["Address Line 1"] || "").trim() || null,
          pincode: String(r["Pincode"] || "").trim() || null,
          industryId: resolveByName(industries, String(r["Industry"] || "")),
          countryId: resolveByName(countries, String(r["Country"] || "")),
          sourceId: resolveByName(sources, String(r["Lead Source"] || "")),
          priorityId:
            resolveByName(priorities, priorityName) ||
            resolveByName(priorities, "Medium"),
          assignedToId: resolveByName(users, String(r["Lead Owner"] || "")),
          budget: r["Budget"] ? Number(r["Budget"]) || null : null,
          status: "NEW",
        });
      }

      if (rows.length === 0) {
        showToast("No valid rows found to import.", "error");
        return;
      }

      const result = await leadService.importLeads(rows);
      showToast(
        `Import completed: ${result.imported} imported, ${result.skipped} skipped, ${result.failed} failed.`,
        result.failed > 0 ? "warning" : "success"
      );
      setUploadedFile(null);
      uploadModal.closeModal();
      fetchLeads();
      loadFiltersAndStats();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Import failed.", "error");
    } finally {
      setImporting(false);
    }
  };

  const renderSortHeader = (label: string, field: string) => {
    return (
      <button
        onClick={() => handleSort(field)}
        className="flex items-center gap-1 font-medium hover:text-gray-900 dark:hover:text-white cursor-pointer"
      >
        {label}
        <span className="text-[9px] text-gray-400">{sortOrder === "asc" ? "▲" : "▼"}</span>
      </button>
    );
  };

  return (
    <>
      <PageMeta title="Leads | SaiFlow" description="View and manage leads in SaiFlow CRM." />
      <PageBreadcrumb pageTitle="Leads" />

      {/* Status summary strip */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 mb-5 sm:grid-cols-3 lg:grid-cols-6">
          {STATUS_SUMMARY_ORDER.map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(statusFilter === s ? "all" : s);
                setCurrentPage(1);
              }}
              className={`rounded-xl border px-4 py-3 text-left transition cursor-pointer ${
                statusFilter === s
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                  : "border-gray-200 bg-white hover:border-brand-300 dark:border-white/[0.05] dark:bg-white/[0.03]"
              }`}
            >
              <span className="block text-lg font-bold text-gray-800 dark:text-white/95">
                {stats.counts?.[s] || 0}
              </span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                {getStatusLabel(s)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Control Panel */}
      <div className="flex flex-col gap-4 mb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full lg:w-auto flex-wrap">
          <div className="w-full sm:w-56">
            <Input
              type="text"
              placeholder="Search company, contact, email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <select
            className={selectClass}
            style={selectChevron}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Statuses</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {getStatusLabel(s)}
              </option>
            ))}
          </select>
          <select
            className={selectClass}
            style={selectChevron}
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Sources</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            className={selectClass}
            style={selectChevron}
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Priorities</option>
            {priorities.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            className={selectClass}
            style={selectChevron}
            value={assigneeFilter}
            onChange={(e) => {
              setAssigneeFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Assignees</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          {(searchQuery ||
            statusFilter !== "all" ||
            sourceFilter !== "all" ||
            priorityFilter !== "all" ||
            assigneeFilter !== "all") && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 h-11 px-3.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/5 transition cursor-pointer"
            >
              <FiRefreshCw className="size-4" />
              Reset
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            startIcon={<FiDownload className="size-4" />}
            className="h-11 px-4 py-2.5"
          >
            Export
          </Button>
          {hasPermission("leads", "create") && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={uploadModal.openModal}
                startIcon={<FiUpload className="size-4" />}
                className="h-11 px-4 py-2.5"
              >
                Upload Excel
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/leads/add")}
                startIcon={<FiPlus className="size-4" />}
                className="h-11 px-4 py-2.5"
              >
                Add Lead
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between gap-3 mb-3 px-4 py-3 rounded-xl border border-brand-200 bg-brand-50 dark:border-brand-500/20 dark:bg-brand-500/10">
          <span className="text-sm font-medium text-brand-700 dark:text-brand-400">
            {selectedIds.length} Selected
          </span>
          <div className="flex items-center gap-2">
            {showBulkAssign && hasPermission("leads", "assign") ? (
              <div className="flex items-center gap-2">
                <select
                  value={bulkAssignee}
                  onChange={(e) => setBulkAssignee(e.target.value)}
                  className="h-9 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs shadow-theme-xs focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                >
                  <option value="">Select Assignee...</option>
                  {users.map((u) => (
                    <option key={u.id} value={String(u.id)}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <Button size="sm" onClick={handleBulkReassign} disabled={!bulkAssignee}>
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowBulkAssign(false);
                    setBulkAssignee("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <>
                {hasPermission("leads", "assign") && (
                  <Button size="sm" variant="outline" onClick={() => setShowBulkAssign(true)}>
                    Reassign
                  </Button>
                )}
                {hasPermission("leads", "delete") && (
                  <Button size="sm" className="bg-error-600 hover:bg-error-700" onClick={handleBulkDelete}>
                    Delete ({selectedIds.length})
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setSelectedIds([])}>
                  Clear
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          <Table>
            {/* ═══ DESKTOP VIEW ═══ */}
            <div className="hidden md:block">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] sticky top-0 bg-white dark:bg-gray-900 z-10">
                  <TableRow>
                    <TableCell isHeader className="px-4 py-3 text-start w-10">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        ref={(el) => {
                          if (el) el.indeterminate = isIndeterminate;
                        }}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      S.No
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      Lead ID
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {renderSortHeader("Company", "title")}
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {renderSortHeader("Contact", "contactPerson")}
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      Email
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      Phone
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {renderSortHeader("Status", "status")}
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      Priority
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      Assigned To
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      Action
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={11} className="px-5 py-8 text-center text-sm text-gray-500">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-primary border-t-transparent"></div>
                          <span>Loading Leads...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={11} className="px-5 py-10 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <FiAlertCircle className="size-8 text-error-500" />
                          <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
                          <Button size="sm" variant="outline" onClick={fetchLeads}>
                            Retry
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : leads.length > 0 ? (
                    leads.map((lead, index) => (
                      <TableRow
                        key={lead.id}
                        className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                      >
                        <TableCell className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(lead.id)}
                            onChange={() => toggleSelect(lead.id)}
                            className="rounded border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
                          />
                        </TableCell>
                        <TableCell className="px-4 py-4 text-theme-sm text-gray-500 dark:text-gray-400 font-mono text-xs">
                          {(currentPage - 1) * rowsPerPage + index + 1}
                        </TableCell>
                        <TableCell className="px-4 py-4 text-theme-sm">
                          <span className="font-mono text-xs tracking-wider text-gray-500 dark:text-gray-400">
                            SF-LEAD-{String(lead.id).padStart(4, "0")}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-theme-sm font-medium text-gray-800 dark:text-white/90 whitespace-nowrap">
                          <button
                            onClick={() => navigate(`/leads/${lead.id}`)}
                            className="hover:text-brand-500 transition-colors cursor-pointer"
                          >
                            {lead.companyName}
                          </button>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-theme-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {lead.contactPerson}
                        </TableCell>
                        <TableCell className="px-4 py-4 text-theme-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {lead.email}
                        </TableCell>
                        <TableCell className="px-4 py-4 text-theme-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {lead.phone}
                        </TableCell>
                        <TableCell className="px-4 py-4 whitespace-nowrap">
                          <Badge size="sm" color={getStatusBadgeColor(lead.status)}>
                            {getStatusLabel(lead.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-4 whitespace-nowrap">
                          {lead.priority ? (
                            <Badge size="sm" color={getPriorityBadgeColor(lead.priority)}>
                              {lead.priority}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-4 text-theme-sm whitespace-nowrap">
                          {hasPermission("leads", "assign") ? (
                            <select
                              value={users.find((u) => u.id === lead.assignedToId)?.id || ""}
                              onChange={(e) => handleDirectAssign(lead.id, e.target.value)}
                              className="h-9 w-40 appearance-none rounded-lg border border-gray-300 bg-transparent px-3 py-1.5 pr-8 text-xs shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer"
                              style={selectChevron}
                            >
                              <option value="">Unassigned</option>
                              {users.map((u) => (
                                <option key={u.id} value={String(u.id)}>
                                  {u.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-gray-600 dark:text-gray-400">
                              {lead.assignedToName}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-4 text-theme-sm">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => navigate(`/leads/${lead.id}`)}
                              className="p-1.5 text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10 rounded-lg transition cursor-pointer"
                              title="View"
                            >
                              <FiEye className="size-4" />
                            </button>
                            {hasPermission("leads", "edit") && (
                              <button
                                onClick={() => navigate(`/leads/${lead.id}/edit`)}
                                className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10 rounded-lg transition cursor-pointer"
                                title="Edit"
                              >
                                <FiEdit className="size-4" />
                              </button>
                            )}
                            {hasPermission("leads", "delete") && (
                              <button
                                onClick={() => handleOpenDelete(lead)}
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
                      <TableCell colSpan={11} className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                        No leads found matching your criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* ═══ MOBILE CARD VIEW ═══ */}
            <div className="block md:hidden divide-y divide-gray-100 dark:divide-white/[0.05]">
              {loading ? (
                <div className="px-5 py-8 text-center text-sm text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-primary border-t-transparent"></div>
                    <span>Loading Leads...</span>
                  </div>
                </div>
              ) : error ? (
                <div className="px-5 py-10 text-center">
                  <FiAlertCircle className="size-8 text-error-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{error}</p>
                  <Button size="sm" variant="outline" onClick={fetchLeads}>
                    Retry
                  </Button>
                </div>
              ) : leads.length > 0 ? (
                leads.map((lead, index) => (
                  <div key={lead.id} className="p-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(lead.id)}
                          onChange={() => toggleSelect(lead.id)}
                          className="rounded border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer shrink-0"
                        />
                        <span className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-50 dark:bg-brand-500/10 text-theme-xs font-semibold text-brand-600 dark:text-brand-400">
                          {(currentPage - 1) * rowsPerPage + index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 dark:text-white/90 truncate">
                            {lead.companyName}
                          </p>
                          <span className="font-mono text-[10px] tracking-wider text-gray-400 dark:text-gray-500">
                            SF-LEAD-{String(lead.id).padStart(4, "0")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Badge size="sm" color={getStatusBadgeColor(lead.status)}>
                          {getStatusLabel(lead.status)}
                        </Badge>
                        <button
                          onClick={() => navigate(`/leads/${lead.id}`)}
                          className="p-2 text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10 rounded-lg transition cursor-pointer"
                          title="View"
                        >
                          <FiEye className="size-4" />
                        </button>
                        {hasPermission("leads", "edit") && (
                          <button
                            onClick={() => navigate(`/leads/${lead.id}/edit`)}
                            className="p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10 rounded-lg transition cursor-pointer"
                            title="Edit"
                          >
                            <FiEdit className="size-4" />
                          </button>
                        )}
                        {hasPermission("leads", "delete") && (
                          <button
                            onClick={() => handleOpenDelete(lead)}
                            className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                            title="Delete"
                          >
                            <FiTrash2 className="size-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                      <div>
                        <span className="block text-gray-400 dark:text-gray-500 mb-0.5">Contact</span>
                        <span className="text-gray-700 dark:text-gray-300 truncate block">{lead.contactPerson}</span>
                      </div>
                      <div>
                        <span className="block text-gray-400 dark:text-gray-500 mb-0.5">Email</span>
                        <span className="text-gray-700 dark:text-gray-300 truncate block">{lead.email}</span>
                      </div>
                      <div>
                        <span className="block text-gray-400 dark:text-gray-500 mb-0.5">Phone</span>
                        <span className="text-gray-700 dark:text-gray-300 truncate block">{lead.phone}</span>
                      </div>
                      <div>
                        <span className="block text-gray-400 dark:text-gray-500 mb-0.5">Priority</span>
                        <span className="text-gray-700 dark:text-gray-300 truncate block">
                          {lead.priority || "—"}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="block text-gray-400 dark:text-gray-500 mb-0.5">Assigned To</span>
                        <span className="text-gray-700 dark:text-gray-300 truncate block">
                          {lead.assignedToName}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-5 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                  No leads found matching your criteria.
                </div>
              )}
            </div>
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
            itemName="leads"
          />
        )}
      </div>

      {/* Upload Excel Modal */}
      <Modal isOpen={uploadModal.isOpen} onClose={uploadModal.closeModal} className="max-w-[520px] m-4">
        <div className="relative w-full rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-8">
          <div className="pr-10 border-b border-gray-150 pb-4 mb-4 dark:border-gray-800">
            <h4 className="text-xl font-semibold text-gray-800 dark:text-white/90">Upload Excel</h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Upload a .xlsx or .csv file to import leads in bulk (max 500 rows).
            </p>
          </div>

          <div className="mb-6 p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] flex items-center justify-between gap-4">
            <div>
              <span className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Need a Template?</span>
              <span className="block text-[11px] text-gray-400 mt-0.5">Use our format for a smooth import.</span>
            </div>
            <button
              type="button"
              onClick={downloadSampleTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-750 text-xs font-semibold text-brand-500 hover:text-brand-600 cursor-pointer shadow-theme-xs transition-colors shrink-0"
            >
              Download Template
            </button>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) setUploadedFile(file);
            }}
            className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-10 px-6 text-center transition-colors cursor-pointer ${
              dragOver
                ? "border-brand-400 bg-brand-50 dark:bg-brand-500/10"
                : "border-gray-200 hover:border-brand-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/5"
            }`}
            onClick={() => document.getElementById("excel-file-input")?.click()}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <FiUpload className="size-6 text-gray-500 dark:text-gray-400" />
            </div>
            {uploadedFile ? (
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">{uploadedFile.name}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {(uploadedFile.size / 1024).toFixed(1)} KB — click to change
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Drag & drop your file here</p>
                <p className="text-xs text-gray-400 mt-1">Supports .xlsx and .csv — max 10 MB</p>
              </div>
            )}
            <input
              id="excel-file-input"
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setUploadedFile(file);
              }}
            />
          </div>

          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              size="sm"
              variant="outline"
              disabled={importing}
              onClick={() => {
                setUploadedFile(null);
                uploadModal.closeModal();
              }}
            >
              Cancel
            </Button>
            <Button size="sm" disabled={!uploadedFile || importing} onClick={handleImport}>
              {importing ? "Importing..." : "Import Leads"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteModal.isOpen} onClose={deleteModal.closeModal} className="max-w-[450px] m-4">
        <div className="relative w-full rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/10 text-error-600 dark:text-error-400 mb-4">
              <FiTrash2 className="size-6" />
            </div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">Delete Lead</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to delete{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">{selectedLead?.companyName}</span>? This
              action cannot be undone.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button size="sm" variant="outline" onClick={deleteModal.closeModal} className="w-1/2">
              Cancel
            </Button>
            <Button size="sm" onClick={handleDeleteConfirm} className="w-1/2 bg-error-600 hover:bg-error-700">
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

