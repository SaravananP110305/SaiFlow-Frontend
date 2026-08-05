import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { formatDate as centFormatDate } from "../../../utils/dateFormatter";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import { proposalService } from "../../../services/proposalService";
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
import { ChevronDownIcon } from "../../../icons";
import {
  FiPlus,
  FiDownload,
  FiEye,
  FiEdit,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiSend,
  FiRefreshCw,
  FiFileText,
  FiTrendingUp,
} from "react-icons/fi";
import { useToast } from "../../../hooks/useToast";
import { useAuth } from "../../../context/AuthContext";
import {
  Proposal,
  ProposalStatus,
} from "../data/quotationsData";
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


function formatCurrency(amount: number): string {
  return "₹" + amount.toLocaleString("en-IN");
}

function formatCurrencyForPDF(amount: number): string {
  return "Rs. " + amount.toLocaleString("en-IN");
}

function formatDate(dateStr: string): string {
  return centFormatDate(dateStr);
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
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProposals = async () => {
    setLoading(true);
    try {
      const data = await proposalService.getProposals();
      if (data && Array.isArray(data.data)) {
        const mapped = data.data.map((bp: any) => ({
          id: bp.id,
          proposalNo: bp.proposalNumber,
          companyName: bp.lead?.company?.name || bp.lead?.title || "Unknown Company",
          leadName: bp.lead?.contactPerson || "Unknown Contact",
          leadEmail: bp.lead?.email || "",
          leadPhone: bp.lead?.phone || "",
          value: Number(bp.amount),
          status: bp.status,
          requirement: bp.requirements || {
            overview: bp.lead?.requirements || "",
            objectives: [],
            technicalRequirements: [],
            deliverables: [],
            assumptions: [],
            constraints: []
          },
          estimation: bp.estimation || {
            items: [],
            subtotal: Number(bp.amount),
            discountPercent: 0,
            discountAmount: 0,
            taxPercent: 18,
            taxAmount: 0,
            total: Number(bp.amount)
          },
          quotation: bp.quotation || {
            paymentTerms: "",
            validityDays: bp.validUntil ? Math.ceil((new Date(bp.validUntil).getTime() - new Date(bp.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 30,
            deliveryTimeline: "",
            warrantyPeriod: "",
            paymentMilestones: [],
            notes: bp.title || "",
            termsAndConditions: ""
          },
          validUntil: bp.validUntil ? bp.validUntil.split("T")[0] : "",
          createdAt: bp.createdAt || "",
          updatedAt: bp.updatedAt || "",
          workflowLogs: []
        }));
        setProposals(mapped);
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to fetch proposals.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  // setStatusFilter removed while the Status filter dropdown is commented out
  const [statusFilter] = useState<string>("all");
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  // Status dropdown (per row in list view)
  const [activeStatusDropdown, setActiveStatusDropdown] = useState<number | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const statusDropdownRef = useRef<HTMLDivElement | null>(null);

  // Close status dropdown on outside click or scroll
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
        setActiveStatusDropdown(null);
        setDropdownPosition(null);
      }
    };
    const handleScroll = () => {
      setActiveStatusDropdown(null);
      setDropdownPosition(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, []);

  // Modals
  const confirmActionModal = useModal();

  // Action confirmation (only for destructive actions)
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const handleExportPDF = (proposal: Proposal) => {
    exportProposalToPDF(proposal, showToast);
  };



  // ── Status Management ──────────────────────────────────────────────────────

  const updateStatus = async (proposalId: number, newStatus: ProposalStatus, notes: string) => {
    try {
      console.log("Status update notes:", notes);
      await proposalService.updateProposal(proposalId, { status: newStatus });
      showToast(`Proposal status updated successfully.`, "success");
      fetchProposals();
    } catch (err) {
      showToast("Failed to update proposal status.", "error");
    }
  };

  const handleStatusAction = (action: string, proposal: Proposal) => {
    switch (action) {
      case "send":
        updateStatus(proposal.id, "Sent", "Proposal sent to client.");
        break;
      case "review":
        updateStatus(proposal.id, "Under Review", "Client reviewing the proposal.");
        break;
      case "convert":
        setConfirmAction({
          title: "Convert to Client",
          message: `Mark proposal ${proposal.proposalNo} as "Converted"?`,
          onConfirm: () => updateStatus(proposal.id, "Converted", "Proposal converted to client status."),
        });
        confirmActionModal.openModal();
        break;
      case "reject":
        setConfirmAction({
          title: "Reject Proposal",
          message: `Mark proposal ${proposal.proposalNo} as "Rejected"? This will close the proposal.`,
          onConfirm: () => updateStatus(proposal.id, "Rejected", "Proposal rejected by client."),
        });
        confirmActionModal.openModal();
        break;
      case "approved":
        updateStatus(proposal.id, "Approved", "Client approved the proposal.");
        break;
      case "negotiate":
        updateStatus(proposal.id, "Negotiation", "Moved to negotiation.");
        break;
    }
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
    // Static sort: newest first
    result.sort((a, b) => b.id - a.id);
    return result;
  }, [proposals, searchQuery, statusFilter]);

  const paginatedProposals = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return processedProposals.slice(start, start + rowsPerPage);
  }, [processedProposals, currentPage, rowsPerPage]);

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
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>
          {/* Status filter (commented out per Task 1)
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
          */}
        </div>
        {hasPermission('proposals', 'create') && (
          <Button onClick={() => navigate("/proposals/add")} variant="primary" size="sm" startIcon={<FiPlus />}>
            New Proposal
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] sticky top-0 bg-white dark:bg-gray-900 z-10">
              <TableRow>
                {[
                  { label: "S.No" },
                  { label: "Proposal No" },
                  { label: "Company" },
                  { label: "Lead Contact" },
                  { label: "Amount" },
                  { label: "Status" },
                  { label: "Created Date" },
                  { label: "Last Updated" },
                  { label: "Actions" },
                ].map((col) => (
                  <TableCell key={col.label} isHeader className={`px-5 py-3 text-${col.label === "Amount" ? "end" : col.label === "Actions" ? "center" : "start"} text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap`}>
                    <span className={col.label === "Amount" ? "flex items-center justify-end" : ""}>{col.label}</span>
                  </TableCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {paginatedProposals.length > 0 ? (
                paginatedProposals.map((proposal, index) => {
                  const totalAmount = proposal.estimation?.total || proposal.value || 0;
                  return (
                    <TableRow key={proposal.id}
                      className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => navigate(`/proposals/${proposal.id}`)}
                    >
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
                      <TableCell className="px-5 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeStatusDropdown === proposal.id) {
                                setActiveStatusDropdown(null);
                                setDropdownPosition(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setDropdownPosition({
                                  top: rect.bottom + window.scrollY,
                                  left: rect.left + window.scrollX,
                                });
                                setActiveStatusDropdown(proposal.id);
                              }
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
                          <button onClick={() => navigate(`/proposals/${proposal.id}`)}
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
                  <TableCell colSpan={9} className="px-5 py-12 text-center">
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

  if (loading) {
    return <div className="py-10 text-center text-gray-500">Loading proposals...</div>;
  }

  return (
    <>
      <PageMeta title="Business Proposal | SaiFlow" description="Create, manage, and track business proposals with full version history and workflow." />
      <PageBreadcrumb pageTitle="Business Proposals" />

      {renderListView()}

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

      {/* Portaled Status Dropdown Menu */}
      {activeStatusDropdown !== null && dropdownPosition && (
        (() => {
          const proposal = proposals.find(p => p.id === activeStatusDropdown);
          if (!proposal) return null;

          if (STATUS_TRANSITIONS[proposal.status].length === 0) {
            return createPortal(
              <div
                ref={statusDropdownRef}
                className="absolute z-[9999] w-44 p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl text-center"
                style={{
                  top: `${dropdownPosition.top}px`,
                  left: `${dropdownPosition.left}px`,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-xs text-gray-450 dark:text-gray-500">No More Transitions</p>
              </div>,
              document.body
            );
          }

          return createPortal(
            <div
              ref={statusDropdownRef}
              className="absolute z-[9999] w-44 p-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl"
              style={{
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-2 py-0.5 text-[9px] font-semibold text-gray-400 dark:text-gray-500 uppercase border-b border-gray-100 dark:border-gray-700 mb-0.5">
                Change Status
              </div>
              {STATUS_TRANSITIONS[proposal.status].map((action) => (
                <button
                  key={action.key}
                  onClick={() => {
                    setActiveStatusDropdown(null);
                    setDropdownPosition(null);
                    handleStatusAction(action.key, proposal);
                  }}
                  className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${action.key === "reject"
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
            </div>,
            document.body
          );
        })()
      )}
    </>
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
      // Thin brand color bar
      pdf.setFillColor(79, 70, 229); // Indigo-600
      pdf.rect(0, 0, pageWidth, 2.5, "F");
      
      pdf.setTextColor(148, 163, 184); // Slate-400
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "normal");
      pdf.text("SAIFLOW CRM", margin, 9);
      pdf.text("Business Proposal", pageWidth / 2, 9, { align: "center" });
      pdf.text(proposal.proposalNo, pageWidth - margin, 9, { align: "right" });
    };

    // ── Helper: Page Footer ─────────────────────────────────────────────────
    const addPageFooter = () => {
      pdf.setDrawColor(226, 232, 240); // Slate-200
      pdf.setLineWidth(0.2);
      pdf.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
      
      pdf.setTextColor(148, 163, 184); // Slate-400
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Generated on ${centFormatDate(new Date())} | Page ${pageNum}`, margin, pageHeight - 6);
      pdf.text("SaiFlow CRM — Confidential", pageWidth - margin, pageHeight - 6, { align: "right" });
    };

    // ── Helper: Check page break ────────────────────────────────────────────
    const checkPageBreak = (needed: number) => {
      if (y + needed > pageHeight - 18) {
        addPageFooter();
        pdf.addPage();
        pageNum++;
        y = margin + 12;
        addPageHeader();
        y += 4;
      }
    };

    // ── Helper: Styled section title ────────────────────────────────────────
    const sectionTitle = (title: string) => {
      checkPageBreak(18);
      y += 4;
      
      // Left accent box
      pdf.setFillColor(79, 70, 229); // Indigo-600
      pdf.rect(margin, y - 4.5, 2.5, 6, "F");
      
      pdf.setTextColor(15, 23, 42); // Slate-900
      pdf.setFontSize(9.5);
      pdf.setFont("helvetica", "bold");
      pdf.text(title, margin + 4.5, y);
      
      y += 2.5;
      pdf.setDrawColor(226, 232, 240); // Slate-200
      pdf.setLineWidth(0.2);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 6.5;
    };

    // ── Helper: Body text ────────────────────────────────────────────────────
    const bodyText = (text: string) => {
      pdf.setFontSize(8.5);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(51, 65, 85); // Slate-700
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
      pdf.setTextColor(51, 65, 85); // Slate-700
      const lines = pdf.splitTextToSize(text, pageWidth - margin * 2 - 8);
      lines.forEach((l: string, idx: number) => {
        checkPageBreak(5);
        if (idx === 0) {
          // Rounded square bullet
          pdf.setFillColor(79, 70, 229); // Indigo-600
          pdf.roundedRect(margin + 2.5, y - 2, 1, 1, 0.2, 0.2, "F");
        }
        pdf.text(l, margin + 6, y);
        y += 4.5;
      });
    };



    // ── First Page: Header ──────────────────────────────────────────────────
    addPageHeader();
    y += 16;

    // Cover Page Title Block
    pdf.setFillColor(79, 70, 229); // Indigo Accent vertical strip
    pdf.rect(margin, y - 4, 3.5, 18, "F");

    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(15, 23, 42); // Slate-900
    pdf.text("BUSINESS PROPOSAL", margin + 6, y + 2);
    
    pdf.setFontSize(8.5);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 116, 139); // Slate-500
    pdf.text(`No: ${proposal.proposalNo}  |  Status: ${proposal.status}  |  Date: ${proposal.createdAt ? formatDate(proposal.createdAt) : ""}`, margin + 6, y + 10);
    y += 22;

    const req = proposal.requirement;
    const est = proposal.estimation;
    const quot = proposal.quotation;

    // ═══════════════════════════════════════════════════════════════════════════
    // 1. CLIENT & PROPOSAL INFORMATION
    // ═══════════════════════════════════════════════════════════════════════════
    sectionTitle("1. PARTICIPANTS INFORMATION");
    
    // Draw a neat side-by-side details card
    checkPageBreak(35);
    pdf.setFillColor(248, 250, 252); // Slate-50 background
    pdf.setDrawColor(226, 232, 240); // Slate-200 border
    pdf.setLineWidth(0.25);
    pdf.roundedRect(margin, y - 2, pageWidth - margin * 2, 32, 2, 2, "FD");

    const leftCol = margin + 6;
    const rightCol = pageWidth / 2 + 6;
    let cardY = y + 4;

    // Left Column: Prepared For
    pdf.setTextColor(100, 116, 139); // Slate-500
    pdf.setFontSize(6.5);
    pdf.setFont("helvetica", "bold");
    pdf.text("PREPARED FOR CLIENT", leftCol, cardY);
    
    pdf.setTextColor(15, 23, 42); // Slate-900
    pdf.setFontSize(8.5);
    pdf.setFont("helvetica", "bold");
    pdf.text(proposal.companyName, leftCol, cardY + 5.5);

    pdf.setFontSize(7.5);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(71, 85, 105); // Slate-600
    pdf.text(`Contact: ${proposal.leadName}`, leftCol, cardY + 11.5);
    pdf.text(`Email: ${proposal.leadEmail}`, leftCol, cardY + 16.5);
    pdf.text(`Phone: ${proposal.leadPhone}`, leftCol, cardY + 21.5);

    // Right Column: Prepared By
    pdf.setTextColor(100, 116, 139); // Slate-500
    pdf.setFontSize(6.5);
    pdf.setFont("helvetica", "bold");
    pdf.text("PREPARED BY PROVIDER", rightCol, cardY);

    pdf.setTextColor(15, 23, 42); // Slate-900
    pdf.setFontSize(8.5);
    pdf.setFont("helvetica", "bold");
    pdf.text("SaiFlow CRM Team", rightCol, cardY + 5.5);

    pdf.setFontSize(7.5);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(71, 85, 105); // Slate-600
    pdf.text("Business Development Unit", rightCol, cardY + 11.5);
    pdf.text(`Document Reference: ${proposal.proposalNo}`, rightCol, cardY + 16.5);
    const validityDate = (() => {
      if (!proposal.createdAt || !quot.validityDays) return "N/A";
      try {
        const d = new Date(proposal.createdAt);
        d.setDate(d.getDate() + quot.validityDays);
        return formatDate(d.toISOString());
      } catch {
        return "N/A";
      }
    })();
    pdf.text(`Valid Until: ${validityDate}`, rightCol, cardY + 21.5);

    y += 38;

    // ═══════════════════════════════════════════════════════════════════════════
    // 2. REQUIREMENT & SCOPE
    // ═══════════════════════════════════════════════════════════════════════════
    sectionTitle("2. PROJECT REQUIREMENT & SCOPE");

    // Overview
    pdf.setFontSize(8.5);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(30, 41, 59); // Slate-800
    checkPageBreak(7);
    pdf.text("Overview & Context", margin + 2, y);
    y += 5.5;
    bodyText(req.overview || "No overview provided.");
    y += 3;

    if (req.objectives && req.objectives.length > 0) {
      checkPageBreak(8);
      pdf.setFontSize(8.5);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 41, 59);
      pdf.text("Objectives", margin + 2, y);
      y += 5.5;
      req.objectives.forEach((o) => bulletItem(o));
      y += 3;
    }
    
    if (req.technicalRequirements && req.technicalRequirements.length > 0) {
      checkPageBreak(8);
      pdf.setFontSize(8.5);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 41, 59);
      pdf.text("Technical Requirements", margin + 2, y);
      y += 5.5;
      req.technicalRequirements.forEach((t) => bulletItem(t));
      y += 3;
    }

    if (req.deliverables && req.deliverables.length > 0) {
      checkPageBreak(8);
      pdf.setFontSize(8.5);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 41, 59);
      pdf.text("Project Deliverables", margin + 2, y);
      y += 5.5;
      req.deliverables.forEach((d) => bulletItem(d));
      y += 3;
    }

    if (req.assumptions && req.assumptions.length > 0) {
      checkPageBreak(8);
      pdf.setFontSize(8.5);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 41, 59);
      pdf.text("Assumptions", margin + 2, y);
      y += 5.5;
      req.assumptions.forEach((a) => bulletItem(a));
      y += 3;
    }

    if (req.constraints && req.constraints.length > 0) {
      checkPageBreak(8);
      pdf.setFontSize(8.5);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 41, 59);
      pdf.text("Constraints", margin + 2, y);
      y += 5.5;
      req.constraints.forEach((c) => bulletItem(c));
      y += 3;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 3. ESTIMATION DETAILS
    // ═══════════════════════════════════════════════════════════════════════════
    sectionTitle("3. FINANCIAL ESTIMATION");

    if (est.items && est.items.length > 0) {
      // Table header row
      const colWidth = pageWidth - margin * 2;
      const cols = [
        margin,
        margin + 42,
        margin + 122,
        pageWidth - margin
      ];

      checkPageBreak(12);
      pdf.setFillColor(79, 70, 229); // Indigo-600 header background
      pdf.roundedRect(margin, y - 3.5, colWidth, 7, 1, 1, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(7.5);
      pdf.setFont("helvetica", "bold");
      pdf.text("CATEGORY", cols[0] + 3, y + 1);
      pdf.text("DESCRIPTION", cols[1] + 3, y + 1);
      pdf.text("RATE", cols[2] - 3, y + 1, { align: "right" });
      pdf.text("TOTAL AMOUNT", cols[3] - 3, y + 1, { align: "right" });
      y += 6.5;

      // Table rows
      pdf.setFont("helvetica", "normal");
      est.items.forEach((item, idx) => {
        checkPageBreak(7.5);
        
        // Alternating row background
        if (idx % 2 === 0) {
          pdf.setFillColor(248, 250, 252); // Slate-50
          pdf.rect(margin, y - 2.5, colWidth, 5.5, "F");
        }
        
        pdf.setTextColor(51, 65, 85); // Slate-700
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "bold");
        pdf.text(item.category.substring(0, 18), cols[0] + 3, y + 1.2);
        
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(71, 85, 105); // Slate-600
        const descLines = pdf.splitTextToSize(item.description, 74);
        pdf.text(descLines[0] || "", cols[1] + 3, y + 1.2);
        
        pdf.setFontSize(7);
        pdf.setTextColor(51, 65, 85);
        pdf.text(formatCurrencyForPDF(item.unitPrice), cols[2] - 3, y + 1.2, { align: "right" });
        
        pdf.setFont("helvetica", "bold");
        pdf.text(formatCurrencyForPDF(item.amount), cols[3] - 3, y + 1.2, { align: "right" });
        pdf.setFont("helvetica", "normal");
        
        y += 5.5;
      });

      // Totals section
      y += 2.5;
      checkPageBreak(25);
      const totalX = pageWidth - margin - 45;
      pdf.setFontSize(8);

      // Subtotal
      pdf.setTextColor(100, 116, 139); // Slate-500
      pdf.setFont("helvetica", "normal");
      pdf.text("Subtotal:", totalX, y);
      pdf.setTextColor(51, 65, 85);
      pdf.text(formatCurrencyForPDF(est.subtotal), pageWidth - margin - 3, y, { align: "right" });
      y += 5;

      // Discount
      if (est.discountPercent > 0) {
        pdf.setTextColor(220, 38, 38); // Red-600
        pdf.setFont("helvetica", "normal");
        pdf.text(`Discount (${est.discountPercent}%):`, totalX, y);
        pdf.text(`-${formatCurrencyForPDF(est.discountAmount)}`, pageWidth - margin - 3, y, { align: "right" });
        y += 5;
      }

      // Tax
      pdf.setTextColor(100, 116, 139); // Slate-500
      pdf.setFont("helvetica", "normal");
      pdf.text(`Tax (${est.taxPercent}%):`, totalX, y);
      pdf.setTextColor(51, 65, 85);
      pdf.text(formatCurrencyForPDF(est.taxAmount), pageWidth - margin - 3, y, { align: "right" });
      y += 5;

      // Total (prominently highlighted)
      pdf.setFillColor(245, 243, 255); // Indigo-50 background
      pdf.roundedRect(totalX - 3, y - 3, pageWidth - margin - totalX + 6, 9, 1, 1, "F");
      pdf.setDrawColor(79, 70, 229); // Indigo border
      pdf.setLineWidth(0.2);
      pdf.roundedRect(totalX - 3, y - 3, pageWidth - margin - totalX + 6, 9, 1, 1, "S");
      
      pdf.setTextColor(79, 70, 229); // Indigo-600
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.text("TOTAL DUE:", totalX, y + 3);
      pdf.text(formatCurrencyForPDF(est.total), pageWidth - margin - 4, y + 3, { align: "right" });
      y += 12;
    } else {
      bodyText("No estimation line items defined.");
      y += 5;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 4. QUOTATION / PRICING TERMS
    // ═══════════════════════════════════════════════════════════════════════════
    sectionTitle("4. QUOTATION & COMMITTED TERMS");

    // Info cards in a grid-like layout
    checkPageBreak(32);
    const cardW = (pageWidth - margin * 2 - 4) / 2;
    const cardH = 12;

    const drawInfoCard = (x: number, label: string, value: string) => {
      pdf.setDrawColor(226, 232, 240); // Slate-200
      pdf.setFillColor(248, 250, 252); // Slate-50
      pdf.setLineWidth(0.25);
      pdf.roundedRect(x, y, cardW, cardH, 1, 1, "FD");
      
      pdf.setTextColor(148, 163, 184); // Slate-400 label
      pdf.setFontSize(5.5);
      pdf.setFont("helvetica", "bold");
      pdf.text(label.toUpperCase(), x + 3.5, y + 3.5);
      
      pdf.setTextColor(51, 65, 85); // Slate-700 value
      pdf.setFontSize(7.5);
      pdf.setFont("helvetica", "bold");
      const val = pdf.splitTextToSize(value || "—", cardW - 7);
      pdf.text(val[0], x + 3.5, y + 8.5);
    };

    drawInfoCard(margin, "Payment Terms", quot.paymentTerms);
    drawInfoCard(margin + cardW + 4, "Validity Period", `${quot.validityDays} days`);
    y += cardH + 3.5;
    drawInfoCard(margin, "Project Delivery Timeline", quot.deliveryTimeline);
    drawInfoCard(margin + cardW + 4, "Warranty Period", quot.warrantyPeriod);
    y += cardH + 6.5;

    // Payment Milestones
    if (quot.paymentMilestones && quot.paymentMilestones.length > 0) {
      checkPageBreak(25);
      pdf.setFontSize(8.5);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 41, 59); // Slate-800
      pdf.text("Committed Payment Milestones", margin + 2, y);
      y += 5.5;
      
      quot.paymentMilestones.forEach((m) => {
        bulletItem(`${m.milestone} — ${m.percentage}% (${formatCurrencyForPDF(m.amount)})`);
      });
      y += 2.5;
    }

    // Notes
    if (quot.notes) {
      checkPageBreak(16);
      pdf.setFontSize(8.5);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 41, 59);
      pdf.text("Special Notes / Instructions", margin + 2, y);
      y += 5.5;
      bodyText(quot.notes);
      y += 2.5;
    }

    // Terms & Conditions
    const tnc = quot.termsAndConditions?.split("\n") || [];
    const hasTnc = tnc.some((t) => t.trim());
    if (hasTnc) {
      checkPageBreak(20);
      pdf.setFontSize(8.5);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 41, 59);
      pdf.text("Terms & Conditions", margin + 2, y);
      y += 5.5;
      
      tnc.forEach((t) => {
        if (t.trim()) bulletItem(t.trim());
      });
      y += 2.5;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 5. AUTHORIZATION & SIGN-OFF
    // ═══════════════════════════════════════════════════════════════════════════
    checkPageBreak(38);
    sectionTitle("5. ACCEPTANCE & SIGN-OFF");
    bodyText("By signing below, the client agrees to the scope of work, technical requirements, delivery timeline, payment terms, and conditions described in this proposal.");
    y += 8.5;

    // Signature lines
    const sigY = y + 12;
    pdf.setDrawColor(148, 163, 184); // Slate-400 signature line
    pdf.setLineWidth(0.3);
    
    // Left Sig: Provider
    pdf.line(margin, sigY, margin + 65, sigY);
    pdf.setFontSize(7.5);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(51, 65, 85);
    pdf.text("Authorized Representative (SaiFlow)", margin, sigY + 4.5);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(148, 163, 184);
    pdf.text("Signature & Seal", margin, sigY + 8.5);

    // Right Sig: Client
    pdf.line(pageWidth - margin - 65, sigY, pageWidth - margin, sigY);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(51, 65, 85);
    pdf.text(`Accepted By (For ${proposal.companyName.substring(0, 30)})`, pageWidth - margin - 65, sigY + 4.5);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(148, 163, 184);
    pdf.text("Signature, Date & Name", pageWidth - margin - 65, sigY + 8.5);
    
    y = sigY + 12;

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
