import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { formatDate as centFormatDate, formatTime as centFormatTime } from "../../../utils/dateFormatter";
import { getStorage, setStorage } from "../../../utils/storage";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Badge from "../../../components/ui/badge/Badge";
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import { Modal } from "../../../components/ui/modal";
import { useModal } from "../../../hooks/useModal";
import { Pagination } from "../../../components/ui/pagination/Pagination";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "../../../components/ui/table";
import { ChevronDownIcon, ChevronUpIcon } from "../../../icons";
import {
  FiPlus,
  FiMail,
  FiDownload,
  FiEye,
  FiEdit,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiSend,
  FiRefreshCw,
  FiFileText,
  FiCreditCard,
  FiList,
  FiActivity,
  FiArrowLeft,
  FiArrowRight,
  FiInfo,
  FiUser,
  FiCalendar,
  FiTrendingUp,
} from "react-icons/fi";
import { useToast } from "../../../hooks/useToast";
import { useAuth } from "../../../context/AuthContext";
import {
  Proposal,
  ProposalStatus,
  initialProposals,
} from "../data/quotationsData";
import { initialClients, Client } from "../../ClientManagement/data/clientsData";
import { initialLeads, Lead } from "../../LeadManagement/data/leadsData";
import jsPDF from "jspdf";

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  ProposalStatus,
  { label: string; color: "primary" | "success" | "error" | "warning" | "info" | "light" | "dark"; icon: React.ReactNode }
> = {
  Draft: { label: "Draft", color: "light", icon: <FiFileText className="size-3.5" /> },
  Sent: { label: "Sent", color: "info", icon: <FiSend className="size-3.5" /> },
  "Under Review": { label: "Under Review", color: "warning", icon: <FiClock className="size-3.5" /> },
  Negotiation: { label: "Negotiation", color: "warning", icon: <FiRefreshCw className="size-3.5" /> },
  Approved: { label: "Approved", color: "success", icon: <FiCheckCircle className="size-3.5" /> },
  Rejected: { label: "Rejected", color: "error", icon: <FiXCircle className="size-3.5" /> },
  Converted: { label: "Converted", color: "primary", icon: <FiTrendingUp className="size-3.5" /> },
};

const WORKFLOW_STEPS: ProposalStatus[] = [
  "Draft",
  "Sent",
  "Under Review",
  "Negotiation",
  "Approved",
  "Converted",
];

// ─── Status Transitions (for list-view quick actions) ───────────────────────

interface StatusAction {
  key: string;
  label: string;
  status: ProposalStatus;
  icon: React.ReactNode;
  destructive?: boolean;
  needsConfirm?: boolean;
}

const STATUS_TRANSITIONS: Record<ProposalStatus, StatusAction[]> = {
  Draft: [
    { key: "send", label: "Send to Client", status: "Sent", icon: <FiSend className="size-3.5 text-blue-500" /> },
  ],
  Sent: [
    { key: "review", label: "Mark as Reviewed", status: "Under Review", icon: <FiClock className="size-3.5 text-amber-500" /> },
    { key: "reject", label: "Reject", status: "Rejected", icon: <FiXCircle className="size-3.5 text-rose-500" />, destructive: true, needsConfirm: true },
  ],
  "Under Review": [
    { key: "negotiate", label: "Negotiate", status: "Negotiation", icon: <FiRefreshCw className="size-3.5 text-indigo-500" /> },
    { key: "approved", label: "Approve", status: "Approved", icon: <FiCheckCircle className="size-3.5 text-emerald-500" /> },
    { key: "reject", label: "Reject", status: "Rejected", icon: <FiXCircle className="size-3.5 text-rose-500" />, destructive: true, needsConfirm: true },
  ],
  Negotiation: [
    { key: "approved", label: "Approve", status: "Approved", icon: <FiCheckCircle className="size-3.5 text-emerald-500" /> },
    { key: "reject", label: "Reject", status: "Rejected", icon: <FiXCircle className="size-3.5 text-rose-500" />, destructive: true, needsConfirm: true },
  ],
  Approved: [
    { key: "convert", label: "Convert to Client", status: "Converted", icon: <FiTrendingUp className="size-3.5 text-emerald-600" />, needsConfirm: true },
  ],
  Rejected: [],
  Converted: [],
};



// ─── Helpers ────────────────────────────────────────────────────────────────

function generateId(arr: { id: number }[]): number {
  return arr.length > 0 ? Math.max(...arr.map((x) => x.id)) + 1 : 1;
}

function formatCurrency(amount: number): string {
  return "₹" + amount.toLocaleString("en-IN");
}

function formatDate(dateStr: string): string {
  return centFormatDate(dateStr);
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${centFormatDate(d)} at ${centFormatTime(timeStr)}`;
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function QuotationList() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { hasPermission } = useAuth();

  // ── State ──────────────────────────────────────────────────────────────────
  const [proposals, setProposals] = useState<Proposal[]>(() => {
    const raw = getStorage<Proposal[]>("saiflow_proposals", initialProposals);
    // Validate stored data: if items lack the nested structure, it's stale — fall back to sample data
    if (raw.length > 0 && (!raw[0].requirement || !raw[0].proposalNo)) {
      setStorage("saiflow_proposals", initialProposals);
      return initialProposals;
    }
    return raw;
  });

  const [view, setView] = useState<"list" | "detail">("list");
  const [selectedProposalId, setSelectedProposalId] = useState<number | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<"requirement" | "estimation" | "quotation" | "workflow">("requirement");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof Proposal>("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);

  // Status dropdown (per row in list view)
  const [activeStatusDropdown, setActiveStatusDropdown] = useState<number | null>(null);
  const statusDropdownRef = useRef<HTMLDivElement | null>(null);

  // Close status dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setActiveStatusDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Modals
  const deleteModal = useModal();
  const confirmActionModal = useModal();

  // Action confirmation (only for destructive actions)
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  // ── Derived - Selected Proposal ────────────────────────────────────────────

  const selectedProposal = useMemo(
    () => proposals.find((p) => p.id === selectedProposalId) || null,
    [proposals, selectedProposalId]
  );

  const handleExportPDF = (proposal: Proposal) => {
    exportProposalToPDF(proposal, showToast);
  };

  const handleSort = (field: keyof Proposal) => {
    const isAsc = sortField === field && sortOrder === "asc";
    setSortOrder(isAsc ? "desc" : "asc");
    setSortField(field);
  };



  // ── Status Management ──────────────────────────────────────────────────────

  const updateStatus = (proposalId: number, newStatus: ProposalStatus, notes: string) => {
    const proposal = proposals.find((p) => p.id === proposalId);
    if (!proposal) return;
    const updated = proposals.map((p) =>
      p.id === proposalId
        ? {
          ...p,
          status: newStatus,
          updatedAt: new Date().toISOString().split("T")[0],
          workflowLogs: [
            ...p.workflowLogs,
            {
              id: generateId(p.workflowLogs),
              action: `Status changed to ${newStatus}`,
              fromStatus: p.status,
              toStatus: newStatus,
              timestamp: new Date().toISOString(),
              performedBy: "Current User",
              notes,
            },
          ],
        }
        : p
    );
    setProposals(updated);
    setStorage("saiflow_proposals", updated);
    showToast(`Proposal ${proposal.proposalNo} moved to "${STATUS_CONFIG[newStatus].label}"`, "success");
  };

  const handleStatusAction = (action: string, proposal: Proposal) => {
    setSelectedProposalId(proposal.id);
    switch (action) {
      case "send":
        // Non-destructive: one-click
        updateStatus(proposal.id, "Sent", "Proposal sent to client for review.");
        break;
      case "review":
        // Non-destructive: one-click
        updateStatus(proposal.id, "Under Review", "Client acknowledged receipt and is reviewing the proposal.");
        break;
      case "convert":
        // Significant action: keep confirmation
        setConfirmAction({
          title: "Convert to Client",
          message: `Mark proposal ${proposal.proposalNo} as "Converted" and create a client record for ${proposal.companyName}? You'll be redirected to the Clients page.`,
          onConfirm: () => {
            updateStatus(proposal.id, "Converted", "Lead converted to client. Project initiated.");
            const leads = getStorage<Lead[]>("saiflow_leads", initialLeads);
            const updatedLeads = leads.map((l) => {
              const isMatch =
                (l.company && l.company.toLowerCase() === proposal.companyName.toLowerCase()) ||
                (l.email && l.email.toLowerCase() === proposal.leadEmail.toLowerCase()) ||
                (l.phone && l.phone === proposal.leadPhone);
              return isMatch ? { ...l, status: "Won" as const } : l;
            });
            setStorage("saiflow_leads", updatedLeads);
            const currentClients = getStorage<Client[]>("saiflow_clients", initialClients);
            const newClientId = currentClients.length > 0 ? Math.max(...currentClients.map((c) => c.id)) + 1 : 1;
            const newClient: Client = {
              id: newClientId,
              name: proposal.leadName,
              company: proposal.companyName,
              email: proposal.leadEmail,
              phone: proposal.leadPhone,
              projectsCount: 1,
              status: "Active",
              clientSince: new Date().toISOString().split("T")[0],
              conversionDate: new Date().toISOString().split("T")[0],
              latestProposalId: proposal.id,
              latestProposalNo: proposal.proposalNo,
              proposalStatus: proposal.status,
              handoverStatus: "Pending",
            };
            setStorage("saiflow_clients", [...currentClients, newClient]);
            showToast(`Client "${proposal.companyName}" created successfully!`, "success");
            navigate("/clients");
          },
        });
        confirmActionModal.openModal();
        break;
      case "reject":
        // Destructive-ish: keep confirmation
        setConfirmAction({
          title: "Reject Proposal",
          message: `Mark proposal ${proposal.proposalNo} as "Rejected"? This will close the proposal.`,
          onConfirm: () => updateStatus(proposal.id, "Rejected", "Proposal rejected by client."),
        });
        confirmActionModal.openModal();
        break;
      case "approved":
        // Non-destructive: one-click
        updateStatus(proposal.id, "Approved", "Client approved the proposal.");
        break;
      case "negotiate":
        // Non-destructive: one-click
        updateStatus(proposal.id, "Negotiation", "Client requested revisions - moved to negotiation.");
        break;
    }
  };

  // ── Revise (Navigate to edit page in negotiation mode) ──────────────────────

  const handleRevise = (proposal: Proposal) => {
    // Update status to Negotiation and log the action, then navigate to edit
    updateStatus(proposal.id, "Negotiation", "Client requested revisions - moved to negotiation.");
    navigate(`/proposals/${proposal.id}/edit`);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDeleteConfirm = () => {
    if (!selectedProposal) return;
    const updated = proposals.filter((p) => p.id !== selectedProposal.id);
    setProposals(updated);
    setStorage("saiflow_proposals", updated);
    showToast(`Proposal ${selectedProposal.proposalNo} deleted.`, "success");
    deleteModal.closeModal();
    if (view === "detail") setView("list");
  };

  // ── List View Processing ───────────────────────────────────────────────────

  const processedProposals = useMemo(() => {
    // Converted leads have already become clients, so their proposals no longer
    // belong in the active quotation list.
    let result = proposals.filter((proposal) => proposal.status !== "Converted");
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.proposalNo.toLowerCase().includes(q) ||
          p.companyName.toLowerCase().includes(q) ||
          p.leadName.toLowerCase().includes(q) ||
          p.leadEmail.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }
    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortOrder === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
    return result;
  }, [proposals, searchQuery, statusFilter, sortField, sortOrder]);

  const paginatedProposals = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return processedProposals.slice(start, start + rowsPerPage);
  }, [processedProposals, currentPage, rowsPerPage]);

  // Bulk actions
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const selectAll = useMemo(() => paginatedProposals.length > 0 && selectedIds.length === paginatedProposals.length, [paginatedProposals, selectedIds]);
  const isIndeterminate = useMemo(() => selectedIds.length > 0 && selectedIds.length < paginatedProposals.length, [paginatedProposals, selectedIds]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedProposals.map(p => p.id));
    }
  };

  const handleBulkSend = () => {
    const now = new Date().toISOString();
    const updated = proposals.map(p =>
      selectedIds.includes(p.id) && p.status === "Draft"
        ? { ...p, status: "Sent" as ProposalStatus, updatedAt: now.split("T")[0], workflowLogs: [...p.workflowLogs, { id: generateId(p.workflowLogs), action: "Status changed to Sent", fromStatus: p.status, toStatus: "Sent" as ProposalStatus, timestamp: now, performedBy: "Current User", notes: "Bulk sent." }] }
        : p
    );
    setProposals(updated);
    setStorage("saiflow_proposals", updated);
    showToast(`${selectedIds.filter(id => proposals.find(p => p.id === id)?.status === "Draft").length} proposal(s) sent.`, "success");
    setSelectedIds([]);
  };

  const handleBulkApprove = () => {
    const now = new Date().toISOString();
    const updated = proposals.map(p =>
      selectedIds.includes(p.id) && (p.status === "Sent" || p.status === "Under Review" || p.status === "Negotiation")
        ? { ...p, status: "Approved" as ProposalStatus, updatedAt: now.split("T")[0], workflowLogs: [...p.workflowLogs, { id: generateId(p.workflowLogs), action: "Status changed to Approved", fromStatus: p.status, toStatus: "Approved" as ProposalStatus, timestamp: now, performedBy: "Current User", notes: "Bulk approved." }] }
        : p
    );
    setProposals(updated);
    setStorage("saiflow_proposals", updated);
    showToast(`${selectedIds.length} proposal(s) approved.`, "success");
    setSelectedIds([]);
  };

  const totalPages = Math.ceil(processedProposals.length / rowsPerPage);



  // ── Render: List View ──────────────────────────────────────────────────────

  const renderListView = () => (
    <>
      {/* Filters & Actions */}
      <div className="flex flex-col gap-3 mb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full lg:w-auto">
          <div className="w-full sm:w-64">
            <Input
              type="text"
              placeholder="Search proposals..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
              className="flex items-center justify-between h-11 w-44 rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5"
            >
              <span className="truncate text-left flex-1">
                {statusFilter === "all" ? "All Statuses" : STATUS_CONFIG[statusFilter as ProposalStatus]?.label || statusFilter}
              </span>
              <ChevronDownIcon className="w-4 h-4 text-gray-500 shrink-0 ml-2" />
            </button>
            <div className={`absolute left-0 w-44 p-1 mt-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg z-50 ${isStatusFilterOpen ? "block" : "hidden"}`}>
              <ul className="flex flex-col gap-0.5">
                <li>
                  <button onClick={() => { setStatusFilter("all"); setCurrentPage(1); setIsStatusFilterOpen(false); }}
                    className={`cursor-pointer rounded-lg text-left w-full px-3 py-2 text-sm ${statusFilter === "all" ? "bg-brand-500 text-white" : "text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"}`}>
                    All Statuses
                  </button>
                </li>
                {(Object.keys(STATUS_CONFIG) as ProposalStatus[])
                  .filter((st) => st !== "Converted")
                  .map((st) => (
                    <li key={st}>
                      <button onClick={() => { setStatusFilter(st); setCurrentPage(1); setIsStatusFilterOpen(false); }}
                        className={`cursor-pointer rounded-lg text-left w-full px-3 py-2 text-sm ${statusFilter === st ? "bg-brand-500 text-white" : "text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"}`}>
                        {STATUS_CONFIG[st].label}
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
        {hasPermission('proposals', 'create') && (
          <Button onClick={() => navigate("/proposals/add")} variant="primary" size="sm" startIcon={<FiPlus />}>
            New Proposal
          </Button>
        )}
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between gap-3 mb-3 px-4 py-3 rounded-xl border border-brand-200 bg-brand-50 dark:border-brand-500/20 dark:bg-brand-500/10">
          <span className="text-sm font-medium text-brand-700 dark:text-brand-400">
            {selectedIds.length} selected
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleBulkSend}>
              Send
            </Button>
            <Button size="sm" variant="primary" onClick={handleBulkApprove}>
              Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelectedIds([])}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] sticky top-0 bg-white dark:bg-gray-900 z-10">
              <TableRow>
                <TableCell isHeader className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    ref={(el) => { if (el) el.indeterminate = isIndeterminate; }}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
                  />
                </TableCell>
                {[
                  { key: "id", label: "S.No" },
                  { key: "proposalNo", label: "Proposal No" },
                  { key: "companyName", label: "Company" },
                  { key: "leadName", label: "Lead Contact" },
                  { key: null, label: "Amount" },
                  { key: "status", label: "Status" },
                  { key: "createdAt", label: "Created Date" },
                  { key: "updatedAt", label: "Last Updated" },
                  { key: null, label: "Actions" },
                ].map((col) => (
                  <TableCell key={col.label || "actions"} isHeader className={`px-5 py-3 text-${col.label === "Amount" ? "end" : col.label === "Actions" ? "center" : "start"} text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap`}>
                    {col.key ? (
                      <button onClick={() => { if (col.key) handleSort(col.key as keyof Proposal); }}
                        className="flex items-center gap-1.5 font-medium hover:text-gray-900 dark:hover:text-white cursor-pointer">
                        {col.label}
                        <span className="flex flex-col">
                          <ChevronUpIcon className={`w-3 h-3 -mb-1 transition-colors ${sortField === col.key && sortOrder === "asc" ? "text-brand-500" : "text-gray-300 dark:text-gray-600"}`} />
                          <ChevronDownIcon className={`w-3 h-3 transition-colors ${sortField === col.key && sortOrder === "desc" ? "text-brand-500" : "text-gray-300 dark:text-gray-600"}`} />
                        </span>
                      </button>
                    ) : col.label === "Amount" ? (
                      <span className="flex items-center justify-end">Amount</span>
                    ) : (
                      <span>{col.label}</span>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {paginatedProposals.length > 0 ? (
                paginatedProposals.map((proposal, index) => {
                  const totalAmount = proposal.estimation.total || 0;
                  return (
                    <TableRow key={proposal.id}
                      className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => { setSelectedProposalId(proposal.id); setView("detail"); setActiveDetailTab("requirement"); }}
                    >
                      <TableCell className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(proposal.id)}
                          onChange={() => toggleSelect(proposal.id)}
                          className="rounded border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
                        />
                      </TableCell>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400 font-mono text-xs">
                        {(currentPage - 1) * rowsPerPage + index + 1}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-theme-sm font-medium text-gray-800 dark:text-white/90">
                        {proposal.proposalNo}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-theme-sm font-medium text-gray-800 dark:text-white/90">
                        {proposal.companyName}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <div className="text-theme-sm font-medium text-gray-800 dark:text-white/90">{proposal.leadName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{proposal.leadEmail}</div>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-theme-sm text-end font-semibold text-gray-800 dark:text-white/90">
                        {formatCurrency(totalAmount)}
                      </TableCell>
                      <TableCell className="px-5 py-4 whitespace-nowrap relative" onClick={(e) => e.stopPropagation()}>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveStatusDropdown(activeStatusDropdown === proposal.id ? null : proposal.id);
                            }}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer
                              ${STATUS_CONFIG[proposal.status].color === "light" ? "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300" : ""}
                              ${STATUS_CONFIG[proposal.status].color === "info" ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400" : ""}
                              ${STATUS_CONFIG[proposal.status].color === "warning" ? "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400" : ""}
                              ${STATUS_CONFIG[proposal.status].color === "success" ? "border-green-200 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-400" : ""}
                              ${STATUS_CONFIG[proposal.status].color === "error" ? "border-red-200 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400" : ""}
                              ${STATUS_CONFIG[proposal.status].color === "primary" ? "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-700 dark:bg-purple-900/20 dark:text-purple-400" : ""}
                              ${STATUS_CONFIG[proposal.status].color === "dark" ? "border-gray-300 bg-gray-100 text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200" : ""}
                              hover:ring-2 hover:ring-offset-1
                              ${STATUS_CONFIG[proposal.status].color === "light" ? "hover:ring-gray-300" : ""}
                              ${STATUS_CONFIG[proposal.status].color === "info" ? "hover:ring-blue-300" : ""}
                              ${STATUS_CONFIG[proposal.status].color === "warning" ? "hover:ring-yellow-300" : ""}
                              ${STATUS_CONFIG[proposal.status].color === "success" ? "hover:ring-green-300" : ""}
                              ${STATUS_CONFIG[proposal.status].color === "error" ? "hover:ring-red-300" : ""}
                              ${STATUS_CONFIG[proposal.status].color === "primary" ? "hover:ring-purple-300" : ""}
                              ${STATUS_CONFIG[proposal.status].color === "dark" ? "hover:ring-gray-300" : ""}
                              ${activeStatusDropdown === proposal.id ? "ring-2 ring-offset-1" : ""}
                            `}
                          >
                            {STATUS_CONFIG[proposal.status].icon}
                            {STATUS_CONFIG[proposal.status].label}
                            <ChevronDownIcon className={`w-3 h-3 transition-transform ${activeStatusDropdown === proposal.id ? "rotate-180" : ""}`} />
                          </button>

                          {/* Status Dropdown Menu */}
                          {activeStatusDropdown === proposal.id && STATUS_TRANSITIONS[proposal.status].length > 0 && (
                            <div
                              ref={statusDropdownRef}
                              className={`absolute left-0 z-[100] w-52 p-1.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl ${index >= paginatedProposals.length - 2 && paginatedProposals.length > 2
                                ? "bottom-full mb-1"
                                : "top-full mt-1"
                                }`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="px-2 py-1.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase border-b border-gray-100 dark:border-gray-700 mb-1">
                                Change Status
                              </div>
                              {STATUS_TRANSITIONS[proposal.status].map((action) => (
                                <button
                                  key={action.key}
                                  onClick={() => {
                                    setActiveStatusDropdown(null);
                                    handleStatusAction(action.key, proposal);
                                  }}
                                  className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${action.key === "reject"
                                    ? "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 font-medium"
                                    : action.key === "approved" || action.key === "convert"
                                      ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 font-medium"
                                      : action.key === "negotiate"
                                        ? "text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 font-medium"
                                        : action.key === "review"
                                          ? "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 font-medium"
                                          : "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium"
                                    }`}
                                >
                                  <span className="shrink-0">{action.icon}</span>
                                  <span className="flex-1 text-left">{action.label}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* No transitions available badge */}
                          {activeStatusDropdown === proposal.id && STATUS_TRANSITIONS[proposal.status].length === 0 && (
                            <div
                              className={`absolute left-0 z-[100] w-48 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl text-center ${index >= paginatedProposals.length - 2 && paginatedProposals.length > 2
                                ? "bottom-full mb-1"
                                : "top-full mt-1"
                                }`}
                            >
                              <p className="text-xs text-gray-400 dark:text-gray-500">No More Transitions</p>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {formatDate(proposal.createdAt || proposal.updatedAt)}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{getTimeAgo(proposal.updatedAt)}</span>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-theme-sm text-center">
                        <div className="flex items-center justify-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => { setSelectedProposalId(proposal.id); setView("detail"); setActiveDetailTab("requirement"); }}
                            className="p-1.5 text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10 rounded-lg transition cursor-pointer" title="View">
                            <FiEye className="size-4" />
                          </button>
                          {hasPermission('proposals', 'edit') && (
                            <button onClick={() => navigate(`/proposals/${proposal.id}/edit`)}
                              className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10 rounded-lg transition cursor-pointer" title="Edit">
                              <FiEdit className="size-4" />
                            </button>
                          )}
                          <button onClick={() => handleExportPDF(proposal)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10 rounded-lg transition cursor-pointer" title="Export PDF">
                            <FiDownload className="size-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FiFileText className="size-10 text-gray-300 dark:text-gray-600" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">No proposals found.</p>
                      <Button onClick={() => navigate("/proposals/add")} variant="outline" size="sm" startIcon={<FiPlus />}>
                        Create First Proposal
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {processedProposals.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={processedProposals.length}
          rowsPerPage={rowsPerPage}
          onPageChange={setCurrentPage}
          onRowsPerPageChange={(rows) => { setRowsPerPage(rows); setCurrentPage(1); }}
          itemName="proposals"
        />
      )}
    </>
  );

  const renderDetailView = () => {
    if (!selectedProposal) return null;

    const status = STATUS_CONFIG[selectedProposal.status];

    const tabs = [
      { key: "requirement" as const, label: "Requirement", icon: <FiList className="size-4" /> },
      { key: "estimation" as const, label: "Estimation", icon: <FiCreditCard className="size-4" /> },
      { key: "quotation" as const, label: "Quotation", icon: <FiFileText className="size-4" /> },
      { key: "workflow" as const, label: "Workflow", icon: <FiActivity className="size-4" /> },
    ];

    return (
      <div className="space-y-5">
        {/* Back & Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button onClick={() => setView("list")}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition cursor-pointer">
            <FiArrowLeft className="size-4" />
            Back to Proposals
          </button>
          <div className="flex flex-wrap gap-2">
            {selectedProposal.status === "Draft" && (
              <Button onClick={() => handleStatusAction("send", selectedProposal)} size="sm" variant="primary" startIcon={<FiSend />}>
                Send Proposal
              </Button>
            )}
            {selectedProposal.status === "Sent" && (
              <>
                <Button onClick={() => handleStatusAction("review", selectedProposal)} size="sm" variant="outline" startIcon={<FiClock />}>
                  Mark as Reviewed
                </Button>
                <Button onClick={() => handleStatusAction("reject", selectedProposal)} size="sm" variant="outline" startIcon={<FiXCircle />}>
                  Reject
                </Button>
              </>
            )}
            {selectedProposal.status === "Under Review" && (
              <>
                <Button onClick={() => handleStatusAction("negotiate", selectedProposal)} size="sm" variant="outline" startIcon={<FiRefreshCw />}>
                  Negotiate
                </Button>
                <Button onClick={() => handleStatusAction("approved", selectedProposal)} size="sm" variant="primary" startIcon={<FiCheckCircle />}>
                  Approve
                </Button>
                <Button onClick={() => handleStatusAction("reject", selectedProposal)} size="sm" variant="outline" startIcon={<FiXCircle />}>
                  Reject
                </Button>
              </>
            )}
            {selectedProposal.status === "Negotiation" && (
              <Button onClick={() => handleRevise(selectedProposal)} size="sm" variant="primary" startIcon={<FiRefreshCw />}>
                Revise Proposal
              </Button>
            )}
            {selectedProposal.status === "Approved" && (
              <Button onClick={() => handleStatusAction("convert", selectedProposal)} size="sm" variant="primary" startIcon={<FiTrendingUp />}>
                Convert to Client
              </Button>
            )}
            <Button onClick={() => navigate(`/proposals/${selectedProposal.id}/edit`)} size="sm" variant="outline" startIcon={<FiEdit />}>
              Edit
            </Button>
            <Button onClick={() => handleExportPDF(selectedProposal)} size="sm" variant="outline" startIcon={<FiDownload />}>
              PDF
            </Button>
            <a href={`mailto:${selectedProposal.leadEmail}?subject=Business Proposal ${selectedProposal.proposalNo} - ${selectedProposal.companyName}`}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/5 transition"
            >
              <FiMail className="size-4" />
              Email
            </a>
          </div>
        </div>

        {/* Proposal Header Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">{selectedProposal.proposalNo}</h2>
                <Badge size="sm" color={status.color}>
                  <span className="flex items-center gap-1">{status.icon}{status.label}</span>
                </Badge>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedProposal.companyName} &middot; {selectedProposal.leadName} &middot; {selectedProposal.leadEmail}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1"><FiCalendar className="size-3.5" /> Created {formatDate(selectedProposal.createdAt)}</span>
              <span className="flex items-center gap-1"><FiRefreshCw className="size-3.5" /> Updated {getTimeAgo(selectedProposal.updatedAt)}</span>
            </div>
          </div>

          {/* Workflow Steps */}
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-white/[0.05]">
            <div className="flex items-center gap-0 overflow-x-auto pb-1">
              {WORKFLOW_STEPS.map((step, idx) => {
                const stepIdx = WORKFLOW_STEPS.indexOf(selectedProposal.status);
                const rejected = selectedProposal.status === "Rejected";
                const converted = selectedProposal.status === "Converted";
                const isCompleted = idx < stepIdx;
                const isCurrent = idx === stepIdx;

                let stepStatus: "completed" | "current" | "incomplete" | "rejected" = "incomplete";
                if (rejected && idx === stepIdx) stepStatus = "rejected";
                else if (converted && isCompleted) stepStatus = "completed";
                else if (isCompleted) stepStatus = "completed";
                else if (isCurrent) stepStatus = rejected ? "rejected" : "current";
                else stepStatus = "incomplete";

                const stepColors = {
                  completed: "bg-emerald-500 text-white border-emerald-500",
                  current: "bg-brand-500 text-white border-brand-500 ring-2 ring-brand-200 dark:ring-brand-700",
                  incomplete: "bg-gray-100 text-gray-400 border-gray-200 dark:bg-gray-800 dark:border-gray-700",
                  rejected: "bg-red-500 text-white border-red-500",
                };

                return (
                  <div key={step} className="flex items-center gap-0">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs font-bold shrink-0 transition-all ${stepColors[stepStatus]}`}>
                      {stepStatus === "completed" || (converted && idx < stepIdx) ? (
                        <FiCheckCircle className="size-4" />
                      ) : stepStatus === "rejected" ? (
                        <FiXCircle className="size-4" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <div className={`text-xs font-medium px-2 whitespace-nowrap ${stepStatus === "incomplete" ? "text-gray-400" : "text-gray-700 dark:text-gray-300"}`}>
                      {STATUS_CONFIG[step]?.label || step}
                    </div>
                    {idx < WORKFLOW_STEPS.length - 1 && (
                      <div className={`w-6 sm:w-10 h-0.5 mx-0.5 ${idx < stepIdx || (converted && idx < stepIdx) ? "bg-emerald-400" : idx === stepIdx && !rejected ? "bg-brand-300" : "bg-gray-200 dark:bg-gray-700"}`} />
                    )}
                  </div>
                );
              })}
              {selectedProposal.status === "Converted" && (
                <div className="flex items-center gap-0 ml-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 text-xs font-bold bg-purple-500 text-white border-purple-500">
                    <FiTrendingUp className="size-4" />
                  </div>
                  <span className="text-xs font-medium px-2 text-purple-600 dark:text-purple-400">Client</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-white/[0.05]">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveDetailTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition cursor-pointer ${activeDetailTab === tab.key
                ? "text-brand-600 border-brand-500 dark:text-brand-400 dark:border-brand-400"
                : "text-gray-500 border-transparent hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}>
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          {activeDetailTab === "requirement" && renderRequirementTab(selectedProposal)}
          {activeDetailTab === "estimation" && renderEstimationTab(selectedProposal)}
          {activeDetailTab === "quotation" && renderQuotationTab(selectedProposal)}
          {activeDetailTab === "workflow" && renderWorkflowTab()}
        </div>
      </div>
    );
  };

  // ── Render: Requirement Tab ────────────────────────────────────────────────

  // ── Render: Requirement Tab ────────────────────────────────────────────────

  const renderRequirementTab = (proposal: Proposal) => (
    <div className="p-5 space-y-6">
      <div>
        <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
          <FiInfo className="size-4 text-brand-500" /> Overview
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{proposal.requirement.overview || "No overview provided."}</p>
      </div>

      <SectionBlock title="Objectives" items={proposal.requirement.objectives} emptyText="No objectives defined." />
      <SectionBlock title="Technical Requirements" items={proposal.requirement.technicalRequirements} emptyText="No technical requirements defined." />
      <SectionBlock title="Deliverables" items={proposal.requirement.deliverables} emptyText="No deliverables defined." />
      <SectionBlock title="Assumptions" items={proposal.requirement.assumptions} emptyText="No assumptions defined." />
      <SectionBlock title="Constraints" items={proposal.requirement.constraints} emptyText="No constraints defined." />
    </div>
  );

  // ── Render: Estimation Tab ─────────────────────────────────────────────────

  const renderEstimationTab = (proposal: Proposal) => {
    const est = proposal.estimation;
    return (
      <div className="p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/[0.05]">
                <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase">Category</th>
                <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase">Description</th>
                <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase">Unit</th>
                <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase">Unit Price</th>
                <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/[0.03]">
              {est.items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <td className="py-3 px-3">
                    <Badge size="sm" color="primary">{item.category}</Badge>
                  </td>
                  <td className="py-3 px-3 text-gray-700 dark:text-gray-300">{item.description}</td>
                  <td className="py-3 px-3 text-right text-gray-500 dark:text-gray-400 text-xs">{item.unit}</td>
                  <td className="py-3 px-3 text-right text-gray-700 dark:text-gray-300">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-3 px-3 text-right font-medium text-gray-800 dark:text-white">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-100 dark:border-white/[0.05]">
                <td colSpan={4} className="py-3 px-3 text-right text-sm text-gray-500 dark:text-gray-400">Subtotal</td>
                <td className="py-3 px-3 text-right text-sm text-gray-800 dark:text-white">{formatCurrency(est.subtotal)}</td>
              </tr>
              {est.discountPercent > 0 && (
                <tr>
                  <td colSpan={4} className="py-1 px-3 text-right text-sm text-gray-500 dark:text-gray-400">Discount ({est.discountPercent}%)</td>
                  <td className="py-1 px-3 text-right text-sm text-red-500">-{formatCurrency(est.discountAmount)}</td>
                </tr>
              )}
              <tr>
                <td colSpan={4} className="py-1 px-3 text-right text-sm text-gray-500 dark:text-gray-400">Tax ({est.taxPercent}%)</td>
                <td className="py-1 px-3 text-right text-sm text-gray-800 dark:text-white">{formatCurrency(est.taxAmount)}</td>
              </tr>
              <tr className="border-t-2 border-gray-200 dark:border-white/[0.1]">
                <td colSpan={4} className="py-3 px-3 text-right text-base font-bold text-gray-800 dark:text-white">Total</td>
                <td className="py-3 px-3 text-right text-base font-bold text-brand-600 dark:text-brand-400">{formatCurrency(est.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  // ── Render: Quotation Tab ──────────────────────────────────────────────────

  const renderQuotationTab = (proposal: Proposal) => {
    const quote = proposal.quotation;
    return (
      <div className="p-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <InfoCard label="Payment Terms" value={quote.paymentTerms} />
          <InfoCard label="Validity" value={`${quote.validityDays} days`} />
          <InfoCard label="Delivery Timeline" value={quote.deliveryTimeline} />
          <InfoCard label="Warranty Period" value={quote.warrantyPeriod} />
        </div>

        {quote.paymentMilestones.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">Payment Milestones</h3>
            <div className="space-y-2">
              {quote.paymentMilestones.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/[0.03] rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{m.milestone}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-brand-600 dark:text-brand-400">{m.percentage}%</span>
                    <span className="text-sm font-semibold text-gray-800 dark:text-white">{formatCurrency(m.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-2">Notes</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{quote.notes || "No additional notes."}</p>
        </div>

        {quote.termsAndConditions && (
          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-2">Terms &amp; Conditions</h3>
            <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">{quote.termsAndConditions}</div>
          </div>
        )}
      </div>
    );
  };

  // ── Render: Workflow Tab ───────────────────────────────────────────────────

  const renderWorkflowTab = () => {
    if (!selectedProposal) return null;
    return (
      <div className="p-5">
        <div className="relative pl-8 space-y-4">
          {[...selectedProposal.workflowLogs].reverse().map((log) => (
            <div key={log.id} className="relative">
              <div className="absolute left-[-20px] top-4 bottom-0 w-0.5 bg-gray-100 dark:bg-gray-800" />
              <div className="absolute left-[-25px] top-1 w-2.5 h-2.5 rounded-full bg-brand-400 dark:bg-brand-600" />
              <div className="p-3 rounded-lg border border-gray-100 dark:border-white/[0.05] hover:bg-gray-50 dark:hover:bg-white/[0.02] transition">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800 dark:text-white">{log.action}</span>
                    {log.fromStatus !== log.toStatus && (
                      <div className="flex items-center gap-1.5">
                        <Badge size="sm" color={STATUS_CONFIG[log.fromStatus]?.color || "light"}>{log.fromStatus}</Badge>
                        <FiArrowRight className="size-3 text-gray-400" />
                        <Badge size="sm" color={STATUS_CONFIG[log.toStatus]?.color || "primary"}>{log.toStatus}</Badge>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{formatDateTime(log.timestamp)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <FiUser className="size-3" />
                  {log.performedBy}
                </div>
                {log.notes && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">"{log.notes}"</p>
                )}
              </div>
            </div>
          ))}
          {selectedProposal.workflowLogs.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">No workflow activity recorded.</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <PageMeta title="Business Proposal | SaiFlow" description="Create, manage, and track business proposals with full version history and workflow." />
      <PageBreadcrumb pageTitle="Business Proposals" />

      {view === "list" ? renderListView() : renderDetailView()}
      <Modal isOpen={deleteModal.isOpen} onClose={deleteModal.closeModal} className="max-w-md p-6">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">Delete Proposal</h4>
        <p className="text-sm text-gray-500 mb-6">
          Are you sure you want to delete proposal "{selectedProposal?.proposalNo}"? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button onClick={deleteModal.closeModal} variant="outline" size="sm">Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="primary" className="bg-error-600 hover:bg-error-700 border-error-600 text-white" size="sm">Delete</Button>
        </div>
      </Modal>

      {/* Action Confirmation Modal */}
      <Modal isOpen={confirmActionModal.isOpen} onClose={confirmActionModal.closeModal} className="max-w-md p-6">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">{confirmAction?.title}</h4>
        <p className="text-sm text-gray-500 mb-6">{confirmAction?.message}</p>
        <div className="flex justify-end gap-3">
          <Button onClick={confirmActionModal.closeModal} variant="outline" size="sm">Cancel</Button>
          <Button onClick={() => { confirmAction?.onConfirm(); confirmActionModal.closeModal(); }} variant="primary" size="sm">
            Confirm
          </Button>
        </div>
      </Modal>


    </>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SectionBlock({ title, items, emptyText }: { title: string; items: string[]; emptyText: string }) {
  const filtered = items.filter((i) => i.trim());
  if (filtered.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-2">{title}</h3>
        <p className="text-xs text-gray-400 italic">{emptyText}</p>
      </div>
    );
  }
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-2">{title}</h3>
      <ul className="space-y-1.5">
        {filtered.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-lg border border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02]">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-medium text-gray-800 dark:text-white">{value || "—"}</p>
    </div>
  );
}

export function exportProposalToPDF(proposal: Proposal, showToast: (msg: string, type: "info" | "success" | "error") => void) {
  try {
    showToast("Generating PDF...", "info");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 18;
    let y = margin;
    let pageNum = 1;

    // ── Helper: Page Header (brand bar) ─────────────────────────────────────
    const addPageHeader = () => {
      // Brand color bar
      pdf.setFillColor(255, 57, 81);
      pdf.rect(0, 0, pageWidth, 12, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "bold");
      pdf.text("SAIFLOW CRM", margin, 8);
      pdf.text("Business Proposal", pageWidth / 2, 8, { align: "center" });
      pdf.text(proposal.proposalNo, pageWidth - 14, 8, { align: "right" });
    };

    // ── Helper: Page Footer ─────────────────────────────────────────────────
    const addPageFooter = () => {
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
      pdf.setTextColor(150, 150, 150);
      pdf.setFontSize(6.5);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Generated on ${centFormatDate(new Date())} | Page ${pageNum}`, margin, pageHeight - 5);
      pdf.text("SaiFlow CRM — Confidential", pageWidth - margin, pageHeight - 5, { align: "right" });
    };

    // ── Helper: Check page break ────────────────────────────────────────────
    const checkPageBreak = (needed: number) => {
      if (y + needed > pageHeight - 18) {
        addPageFooter();
        pdf.addPage();
        pageNum++;
        y = margin + 14;
        addPageHeader();
        y += 4;
      }
    };

    // ── First Page: Header ──────────────────────────────────────────────────
    addPageHeader();
    y += 18;

    // Title section with background
    pdf.setFillColor(249, 250, 251);
    pdf.rect(margin, y - 3, pageWidth - margin * 2, 30, "F");
    pdf.setDrawColor(255, 57, 81);
    pdf.setLineWidth(0.3);
    pdf.rect(margin, y - 3, pageWidth - margin * 2, 30, "S");

    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(30, 30, 30);
    pdf.text(`BUSINESS PROPOSAL`, pageWidth / 2, y + 6, { align: "center" });

    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 100, 100);
    pdf.text(`${proposal.proposalNo}`, pageWidth / 2, y + 14, { align: "center" });
    pdf.text(`Status: ${proposal.status}  |  Date: ${proposal.createdAt ? formatDate(proposal.createdAt) : ""}`, pageWidth / 2, y + 21, { align: "center" });
    y += 32;

    const req = proposal.requirement;
    const est = proposal.estimation;
    const quot = proposal.quotation;

    // ── Helper: Styled section title ────────────────────────────────────────
    const sectionTitle = (title: string) => {
      checkPageBreak(14);
      pdf.setFillColor(255, 57, 81);
      pdf.rect(margin, y - 2, pageWidth - margin * 2, 8, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.text(title, margin + 3, y + 4);
      y += 12;
    };

    // ── Helper: Body text ────────────────────────────────────────────────────
    const bodyText = (text: string) => {
      pdf.setFontSize(8.5);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(60, 60, 60);
      const lines = pdf.splitTextToSize(text || "", pageWidth - margin * 2 - 4);
      lines.forEach((l: string) => {
        checkPageBreak(5);
        pdf.text(l, margin + 2, y);
        y += 4.5;
      });
    };

    // ── Helper: Bullet item ──────────────────────────────────────────────────
    const bulletItem = (text: string) => {
      pdf.setFontSize(8.5);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(60, 60, 60);
      const lines = pdf.splitTextToSize(`• ${text}`, pageWidth - margin * 2 - 10);
      lines.forEach((l: string) => {
        checkPageBreak(4.5);
        pdf.text(l, margin + 6, y);
        y += 4;
      });
    };

    // ── Helper: Separator line ───────────────────────────────────────────────
    const separator = () => {
      checkPageBreak(8);
      y += 2;
      pdf.setDrawColor(220, 220, 220);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 5;
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. CLIENT INFORMATION
    // ═══════════════════════════════════════════════════════════════════════════
    sectionTitle("1. CLIENT INFORMATION");
    bodyText(`Company: ${proposal.companyName}`);
    bodyText(`Contact: ${proposal.leadName}`);
    bodyText(`Email: ${proposal.leadEmail}`);
    bodyText(`Phone: ${proposal.leadPhone}`);
    separator();

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. REQUIREMENT
    // ═══════════════════════════════════════════════════════════════════════════
    sectionTitle("2. REQUIREMENT");

    // Overview
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(80, 80, 80);
    checkPageBreak(7);
    pdf.text("Overview", margin + 2, y);
    y += 6;
    bodyText(req.overview || "—");
    y += 2;

    if (req.objectives && req.objectives.length > 0) {
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(80, 80, 80);
      checkPageBreak(7);
      pdf.text("Objectives", margin + 2, y);
      y += 6;
      req.objectives.forEach((o) => bulletItem(o));
      y += 1;
    }
    if (req.technicalRequirements && req.technicalRequirements.length > 0) {
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(80, 80, 80);
      checkPageBreak(7);
      pdf.text("Technical Requirements", margin + 2, y);
      y += 6;
      req.technicalRequirements.forEach((t) => bulletItem(t));
      y += 1;
    }
    if (req.deliverables && req.deliverables.length > 0) {
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(80, 80, 80);
      checkPageBreak(7);
      pdf.text("Deliverables", margin + 2, y);
      y += 6;
      req.deliverables.forEach((d) => bulletItem(d));
      y += 1;
    }
    separator();

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. ESTIMATION
    // ═══════════════════════════════════════════════════════════════════════════
    sectionTitle("3. ESTIMATION");

    if (est.items && est.items.length > 0) {
      // Table header row
      const cols = [margin, 60, 140, 165, pageWidth - margin];
      const colWidth = pageWidth - margin * 2;

      checkPageBreak(24);
      pdf.setFillColor(255, 57, 81);
      pdf.rect(margin, y - 3, colWidth, 6, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "bold");
      pdf.text("CATEGORY", cols[0] + 2, y + 1);
      pdf.text("DESCRIPTION", cols[1] + 2, y + 1);
      pdf.text("RATE", cols[2] + 2, y + 1);
      pdf.text("AMOUNT", cols[3] + 2, y + 1);
      y += 5;

      // Table rows
      pdf.setFont("helvetica", "normal");
      est.items.forEach((item, idx) => {
        checkPageBreak(6);
        // Alternating row background
        if (idx % 2 === 0) {
          pdf.setFillColor(248, 250, 252);
          pdf.rect(margin, y - 2.5, colWidth, 5, "F");
        }
        pdf.setTextColor(60, 60, 60);
        pdf.setFontSize(7);
        const desc = pdf.splitTextToSize(item.description, 75)[0] || "";
        pdf.text(item.category.substring(0, 14), cols[0] + 2, y + 1);
        pdf.setFontSize(6.5);
        pdf.text(String(desc).substring(0, 50), cols[1] + 2, y + 1);
        pdf.setFontSize(7);
        pdf.text(formatCurrency(item.unitPrice), cols[2] + 2, y + 1);
        pdf.setFont("helvetica", "bold");
        pdf.text(formatCurrency(item.amount), cols[3] + 2, y + 1);
        pdf.setFont("helvetica", "normal");
        y += 5;
      });

      // Totals section
      y += 1;
      checkPageBreak(20);
      const totalX = pageWidth - margin - 40;
      pdf.setFontSize(8);

      // Subtotal
      pdf.setTextColor(80, 80, 80);
      pdf.text("Subtotal:", totalX, y);
      pdf.text(formatCurrency(est.subtotal), pageWidth - margin, y, { align: "right" });
      y += 5;

      // Discount
      if (est.discountPercent > 0) {
        pdf.setTextColor(220, 60, 60);
        pdf.text(`Discount (${est.discountPercent}%):`, totalX, y);
        pdf.text(`-${formatCurrency(est.discountAmount)}`, pageWidth - margin, y, { align: "right" });
        y += 5;
      }

      // Tax
      pdf.setTextColor(80, 80, 80);
      pdf.text(`Tax (${est.taxPercent}%):`, totalX, y);
      pdf.text(formatCurrency(est.taxAmount), pageWidth - margin, y, { align: "right" });
      y += 5;

      // Total (highlighted)
      pdf.setFillColor(254, 242, 242);
      pdf.rect(totalX - 3, y - 2.5, pageWidth - margin - totalX + 6, 8, "F");
      pdf.setTextColor(255, 57, 81);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text("TOTAL:", totalX, y + 2);
      pdf.text(formatCurrency(est.total), pageWidth - margin, y + 2, { align: "right" });
      y += 10;
    }
    separator();

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. QUOTATION / PRICING TERMS
    // ═══════════════════════════════════════════════════════════════════════════
    sectionTitle("4. QUOTATION / PRICING TERMS");

    // Info cards in a grid-like layout
    checkPageBreak(30);
    const cardW = (pageWidth - margin * 2 - 4) / 2;
    const cardH = 14;

    const drawInfoCard = (x: number, label: string, value: string) => {
      pdf.setDrawColor(220, 220, 220);
      pdf.setFillColor(249, 250, 251);
      pdf.roundedRect(x, y, cardW, cardH, 1.5, 1.5, "FD");
      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(6);
      pdf.setFont("helvetica", "normal");
      pdf.text(label.toUpperCase(), x + 3, y + 4);
      pdf.setTextColor(30, 30, 30);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      const val = pdf.splitTextToSize(value || "—", cardW - 6);
      pdf.text(val[0], x + 3, y + 10);
    };

    drawInfoCard(margin, "Payment Terms", quot.paymentTerms);
    drawInfoCard(margin + cardW + 4, "Validity", `${quot.validityDays} days`);
    y += cardH + 3;
    drawInfoCard(margin, "Delivery Timeline", quot.deliveryTimeline);
    drawInfoCard(margin + cardW + 4, "Warranty", quot.warrantyPeriod);
    y += cardH + 6;

    // Payment Milestones
    if (quot.paymentMilestones && quot.paymentMilestones.length > 0) {
      sectionTitle("Payment Milestones");
      quot.paymentMilestones.forEach((m) => {
        bulletItem(`${m.milestone} — ${m.percentage}% (${formatCurrency(m.amount)})`);
      });
      y += 2;
    }

    // Notes
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(80, 80, 80);
    checkPageBreak(10);
    pdf.text("Notes", margin + 2, y);
    y += 6;
    bodyText(quot.notes || "No additional notes.");
    y += 2;

    // Terms & Conditions
    const tnc = quot.termsAndConditions?.split("\n") || [];
    if (tnc.length > 0) {
      sectionTitle("Terms & Conditions");
      tnc.forEach((t) => {
        if (t.trim()) bulletItem(t.trim());
      });
      separator();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 5. AUTHORIZATION
    // ═══════════════════════════════════════════════════════════════════════════
    checkPageBreak(30);
    sectionTitle("5. AUTHORIZATION");
    bodyText("This proposal has been prepared for the above-mentioned client. By signing below, you agree to the terms and conditions outlined in this proposal.");
    y += 4;

    // Signature lines
    pdf.setDrawColor(180, 180, 180);
    const sigY = y + 6;
    pdf.line(margin, sigY, margin + 60, sigY);
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(120, 120, 120);
    pdf.text("Authorized Signature", margin, sigY + 4);

    pdf.line(pageWidth - margin - 60, sigY, pageWidth - margin, sigY);
    pdf.text("Date", pageWidth - margin - 60, sigY + 4);
    y = sigY + 10;

    // ── Final Footer ─────────────────────────────────────────────────────────
    addPageFooter();

    // Save PDF
    const safeName = proposal.proposalNo.replace(/[/\\?%*:|"<>]/g, "-");
    pdf.save(`${safeName}.pdf`);
    showToast("PDF exported successfully!", "success");
  } catch (err) {
    console.error("PDF export error:", err);
    showToast("Failed to generate PDF.", "error");
  }
}
