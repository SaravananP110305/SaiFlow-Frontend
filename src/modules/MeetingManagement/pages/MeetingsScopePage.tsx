import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Button from "../../../components/ui/button/Button";
import Badge from "../../../components/ui/badge/Badge";
import Input from "../../../components/form/input/InputField";
import DatePicker from "../../../components/form/date-picker";
import { formatDate, formatTime } from "../../../utils/dateFormatter";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "../../../components/ui/table";
import { Modal } from "../../../components/ui/modal";
import { Pagination } from "../../../components/ui/pagination/Pagination";
import {
  FiEye,
  FiPlus,
  FiCalendar,
  FiUser,
  FiCheckCircle,
  FiXCircle,
  FiRefreshCw,
  FiFileText,
} from "react-icons/fi";
import { useToast } from "../../../hooks/useToast";
import { useAuth } from "../../../context/AuthContext";
import { Meeting, getMeetingStatusColor } from "../data/meetingsData";
import { meetingService } from "../../../services/meetingService";
import { leadService } from "../../../services/leadService";
import { useEffect } from "react";

const getLocalDateString = (isoString: string) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

type StatusTab = "all" | "Scheduled" | "Rescheduled" | "Completed" | "Cancelled";

export default function MeetingsScopePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { hasPermission } = useAuth();

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const data = await meetingService.getMeetings({ limit: 1000 });
      if (data && Array.isArray(data.data)) {
        const mapped = data.data.map((bm: any) => {
          const type = getMeetingType(bm.meetingLink);
          return {
            id: bm.id,
            subject: bm.title || "Meeting",
            company: bm.lead?.company?.name || bm.lead?.title || "Unknown Company",
            contactPerson: bm.lead?.contactPerson || "Unknown Contact",
            date: bm.scheduledAt ? getLocalDateString(bm.scheduledAt) : "",
            time: bm.scheduledAt ? new Date(bm.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : "",
            type,
            linkOrLocation: bm.meetingLink || "",
            status: bm.status === "SCHEDULED" ? "Scheduled" :
                    bm.status === "RESCHEDULED" ? "Rescheduled" :
                    bm.status === "COMPLETED" ? "Completed" :
                    bm.status === "CANCELLED" ? "Cancelled" : bm.status,
            notes: bm.agenda || "",
            relatedToType: "Lead",
            relatedToId: bm.leadId,
            meetingPlatform: type,
            startTime: bm.scheduledAt ? new Date(bm.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : "",
            endTime: "",
            duration: bm.durationMinutes ? bm.durationMinutes.toString() : "30",
            meetingOwner: bm.createdBy ? [bm.createdBy.name] : [],
            clientContactPerson: bm.lead?.contactPerson || "",
            agenda: bm.agenda || "",
            scopeNotes: bm.scopeNotes || "",
            actionSummary: bm.actionSummary || "",
            rescheduledDate: bm.status === "RESCHEDULED" ? (bm.scheduledAt ? getLocalDateString(bm.scheduledAt) : "") : undefined,
            rescheduledTime: bm.status === "RESCHEDULED" ? (bm.scheduledAt ? new Date(bm.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : "") : undefined,
            completedDate: bm.status === "COMPLETED" ? (bm.updatedAt ? getLocalDateString(bm.updatedAt) : "") : undefined,
            cancelledDate: bm.status === "CANCELLED" ? (bm.updatedAt ? getLocalDateString(bm.updatedAt) : "") : undefined
          };
        });
        setMeetings(mapped);
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to fetch meetings.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  // Filters
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Action Modals
  const [rescheduleModal, setRescheduleModal] = useState<{ open: boolean; meeting: Meeting | null }>({ open: false, meeting: null });
  const [completeModal, setCompleteModal] = useState<{ open: boolean; meeting: Meeting | null }>({ open: false, meeting: null });
  const [cancelModal, setCancelModal] = useState<{ open: boolean; meeting: Meeting | null }>({ open: false, meeting: null });
  const [proposalConfirmModal, setProposalConfirmModal] = useState<{ open: boolean; meeting: Meeting | null }>({ open: false, meeting: null });

  // Reschedule form
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleSummary, setRescheduleSummary] = useState("");

  // Complete form
  const [completeSummary, setCompleteSummary] = useState("");

  // Cancel form
  const [cancelSummary, setCancelSummary] = useState("");

  // Stats
  const stats = useMemo(() => ({
    all: meetings.length,
    Scheduled: meetings.filter(m => m.status === "Scheduled").length,
    Rescheduled: meetings.filter(m => m.status === "Rescheduled").length,
    Completed: meetings.filter(m => m.status === "Completed").length,
    Cancelled: meetings.filter(m => m.status === "Cancelled").length,
  }), [meetings]);

  const filteredMeetings = useMemo(() => {
    let result = [...meetings];
    if (activeTab !== "all") {
      result = result.filter(m => m.status === activeTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.subject.toLowerCase().includes(q) ||
          m.company.toLowerCase().includes(q) ||
          m.contactPerson.toLowerCase().includes(q) ||
          m.type?.toLowerCase().includes(q)
      );
    }
    // Default ordering: newest meeting first (sorting UI removed).
    result.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    return result;
  }, [meetings, activeTab, searchQuery]);

  const paginatedMeetings = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredMeetings.slice(start, start + rowsPerPage);
  }, [filteredMeetings, currentPage, rowsPerPage]);

  const totalItems = filteredMeetings.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);

  const openRescheduleModal = (meeting: Meeting) => {
    setRescheduleModal({ open: true, meeting });
    setRescheduleDate(meeting.date || "");
    setRescheduleTime(meeting.time || "");
    setRescheduleSummary(meeting.actionSummary || "");
  };

  const handleReschedule = async () => {
    const { meeting } = rescheduleModal;
    if (!meeting || !rescheduleDate || !rescheduleSummary.trim()) return;

    try {
      // Normalize the picker's 12-hour "h:mm AM/PM" value to 24-hour "HH:MM"
      // so `new Date()` parses it correctly.
      const timeMatch = (rescheduleTime || "09:00").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
      let start24 = "09:00";
      if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const period = timeMatch[3] ? timeMatch[3].toUpperCase() : null;
        if (period === "PM" && hours < 12) hours += 12;
        else if (period === "AM" && hours === 12) hours = 0;
        start24 = `${String(hours).padStart(2, "0")}:${timeMatch[2]}`;
      }
      const scheduledAt = new Date(`${rescheduleDate}T${start24}`);
      await meetingService.updateMeeting(meeting.id, {
        scheduledAt: scheduledAt.toISOString(),
        status: "RESCHEDULED",
        actionSummary: rescheduleSummary
      });

      showToast(`Meeting "${meeting.subject}" rescheduled successfully.`, "success");
      closeRescheduleModal();
      fetchMeetings();
    } catch (err) {
      showToast("Failed to reschedule meeting.", "error");
    }
  };

  const closeRescheduleModal = () => {
    setRescheduleModal({ open: false, meeting: null });
    setRescheduleDate("");
    setRescheduleTime("");
    setRescheduleSummary("");
  };

  // ─── Complete Handlers ──────────────────────────────────────────────
  const openCompleteModal = (meeting: Meeting) => {
    setCompleteModal({ open: true, meeting });
    setCompleteSummary("");
  };

  const handleComplete = async () => {
    const { meeting } = completeModal;
    if (!meeting || !completeSummary.trim()) return;

    try {
      await meetingService.updateMeetingStatus(meeting.id, "COMPLETED", undefined, completeSummary);

      if (meeting.relatedToId) {
        await leadService.updateLead(meeting.relatedToId, {
          status: "Won",
          requirements: completeSummary
        });
      }

      showToast(`Meeting "${meeting.subject}" completed successfully.`, "success");
      closeCompleteModal();
      fetchMeetings();
    } catch (err) {
      showToast("Failed to complete meeting.", "error");
    }
  };

  const closeCompleteModal = () => {
    setCompleteModal({ open: false, meeting: null });
    setCompleteSummary("");
  };

  // ─── Cancel Handlers ────────────────────────────────────────────────
  const openCancelModal = (meeting: Meeting) => {
    setCancelModal({ open: true, meeting });
    setCancelSummary("");
  };

  const handleCancel = async () => {
    const { meeting } = cancelModal;
    if (!meeting || !cancelSummary.trim()) return;

    try {
      await meetingService.updateMeeting(meeting.id, {
        status: "CANCELLED",
        actionSummary: cancelSummary
      });

      if (meeting.relatedToId) {
        await leadService.updateLead(meeting.relatedToId, {
          status: "Lost"
        });
      }

      showToast(`Meeting "${meeting.subject}" cancelled. Lead status updated to Lost.`, "error");
      closeCancelModal();
      fetchMeetings();
    } catch (err) {
      showToast("Failed to cancel meeting.", "error");
    }
  };

  const closeCancelModal = () => {
    setCancelModal({ open: false, meeting: null });
    setCancelSummary("");
  };

  // ─── Business Proposal Navigation ───────────────────────────────────
  const openProposalConfirmModal = (meeting: Meeting) => {
    setProposalConfirmModal({ open: true, meeting });
  };

  const closeProposalConfirmModal = () => {
    setProposalConfirmModal({ open: false, meeting: null });
  };

  const handleConfirmProposal = () => {
    const { meeting } = proposalConfirmModal;
    if (!meeting) return;
    closeProposalConfirmModal();
    navigateToProposal(meeting);
  };

  const navigateToProposal = (meeting: Meeting) => {
    showToast(`Navigating to Business Proposal for "${meeting.company}"...`, "info");
    // Navigate to quotation/business proposal page
    navigate(`/proposals?company=${encodeURIComponent(meeting.company)}&meetingId=${meeting.id}`);
  };

  // ─── Render Action Buttons (icon-only) ──────────────────────────────
  const renderActions = (meeting: Meeting) => {
    switch (meeting.status) {
      case "Scheduled":
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => openRescheduleModal(meeting)}
              className="p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10 rounded-lg transition cursor-pointer"
              title="Reschedule Meeting"
            >
              <FiRefreshCw className="size-4" />
            </button>
            <button
              onClick={() => openCompleteModal(meeting)}
              className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10 rounded-lg transition cursor-pointer"
              title="Complete Meeting"
            >
              <FiCheckCircle className="size-4" />
            </button>
            <button
              onClick={() => openCancelModal(meeting)}
              className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
              title="Cancel Meeting"
            >
              <FiXCircle className="size-4" />
            </button>
          </div>
        );
      case "Rescheduled":
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => openRescheduleModal(meeting)}
              className="p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10 rounded-lg transition cursor-pointer"
              title="Reschedule Meeting"
            >
              <FiRefreshCw className="size-4" />
            </button>
            <button
              onClick={() => openCompleteModal(meeting)}
              className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10 rounded-lg transition cursor-pointer"
              title="Complete Meeting"
            >
              <FiCheckCircle className="size-4" />
            </button>
            <button
              onClick={() => openCancelModal(meeting)}
              className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
              title="Cancel Meeting"
            >
              <FiXCircle className="size-4" />
            </button>
          </div>
        );
      case "Completed":
        return (
          <button
            onClick={() => openProposalConfirmModal(meeting)}
            className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10 rounded-lg transition cursor-pointer"
            title="Create Business Proposal"
          >
            <FiFileText className="size-4" />
          </button>
        );
      case "Cancelled":
        return (
          <span className="inline-flex items-center text-gray-300 dark:text-gray-600" title="Lead Marked as Lost">
            <FiXCircle className="size-4" />
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="py-10 text-center text-gray-500">Loading meetings...</div>;
  }

  return (
    <>
      <PageMeta
        title="Meetings | SaiFlow"
        description="View and manage meetings in SaiFlow CRM."
      />
      <PageBreadcrumb pageTitle="Meetings" />

      {/* ── Search & Actions Bar ── */}
      <div className="flex flex-col gap-4 mb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
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
        </div>
        <div className="flex items-center gap-3">
          {hasPermission('meetings', 'create') && (
            <Button
              size="sm"
              onClick={() => navigate("/meetings/add")}
              startIcon={<FiPlus className="size-4" />}
              className="h-11 px-4"
            >
              Schedule Meeting
            </Button>
          )}
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex border-b border-gray-200 dark:border-white/[0.05] mb-5 overflow-x-auto">
        {(["all", "Scheduled", "Rescheduled", "Completed", "Cancelled"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setSearchQuery(""); setCurrentPage(1); }}
            className={`pb-3 text-sm font-medium px-4 border-b-2 transition-all duration-200 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${activeTab === tab
                ? "border-brand-500 text-brand-500 font-semibold"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
          >
            {tab === "all" ? "All Meetings" : tab}
            <span className="rounded-full px-2 py-0.5 text-xs bg-gray-100 text-gray-600 dark:bg-white/[0.08] dark:text-gray-400">
              {tab === "all" ? meetings.length : stats[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* ── Meetings Table ── */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-gray-900">
              <TableRow>
                <TableCell isHeader className="px-4 py-3.5 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">S.No</TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Meeting ID</TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Company</TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Contact</TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Type</TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Date</TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Time</TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Status</TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {filteredMeetings.length > 0 ? (
                paginatedMeetings.map((meeting, index) => (
                  <TableRow
                    key={meeting.id}
                    className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group"
                  >
                    <TableCell className="px-4 py-4 text-theme-sm text-gray-500 dark:text-gray-400 font-mono text-xs">
                      {(currentPage - 1) * rowsPerPage + index + 1}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-theme-sm text-gray-500 dark:text-gray-400 font-mono text-xs">
                      {`SF-MTG-${String(meeting.id).padStart(4, "0")}`}
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold text-xs">
                          {meeting.company.charAt(0)}
                        </div>
                        <span className="text-sm font-semibold text-gray-800 dark:text-white/90 truncate max-w-[100px]">
                          {meeting.company}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                        <FiUser className="size-3.5 text-gray-400 shrink-0" />
                        <span className="truncate max-w-[120px]">{meeting.contactPerson}</span>
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {meeting.type}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {formatDate(meeting.date)}
                      </span>
                      {meeting.rescheduledDate && (
                        <p className="text-[10px] text-info-500 dark:text-info-400 mt-0.5">
                          Rescheduled: {formatDate(meeting.rescheduledDate)}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {formatTime(meeting.time)}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <Badge size="sm" color={getMeetingStatusColor(meeting.status)}>
                        {meeting.status}
                      </Badge>
                    </TableCell>                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/meetings/${meeting.id}`)}
                          className="p-1.5 text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10 rounded-lg transition cursor-pointer"
                          title="View Details"
                        >
                          <FiEye className="size-4" />
                        </button>
                        {renderActions(meeting)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                        <FiCalendar className="size-5 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {searchQuery ? "No meetings match your search." : "No meetings found."}
                      </p>
                      {!searchQuery && activeTab === "all" && (
                        <Button
                          size="sm"
                          onClick={() => navigate("/meetings/add")}
                          className="mt-3"
                          startIcon={<FiPlus className="size-4" />}
                        >
                          Schedule your first meeting
                        </Button>
                      )}
                    </div>
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
            itemName="meetings"
          />
        )}
      </div>

      {/* ── Reschedule Modal ── */}
      <Modal isOpen={rescheduleModal.open} onClose={closeRescheduleModal} className="max-w-[480px] m-4">
        <div className="relative w-full rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-8">
          <div className="mb-6 space-y-4">
            <div>
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-1">
                Reschedule Meeting
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Update the schedule for <span className="font-semibold text-gray-700 dark:text-gray-300">{rescheduleModal.meeting?.subject}</span> with {rescheduleModal.meeting?.company}.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                Follow-Up Date & Time <span className="text-error-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <DatePicker
                  id="reschedule-date"
                  defaultDate={rescheduleDate}
                  onChange={(_, dateStr) => setRescheduleDate(dateStr)}
                  placeholder="Select Date"
                />
                <DatePicker
                  id="reschedule-time"
                  mode="time"
                  defaultDate={rescheduleTime}
                  onChange={(_, timeStr) => setRescheduleTime(timeStr)}
                  placeholder="Select Time"
                />
              </div>
              {!rescheduleDate && (
                <p className="text-xs text-error-500 mt-1.5">Date is required</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                Summary <span className="text-error-500">*</span>
              </label>
              <textarea
                value={rescheduleSummary}
                onChange={(e) => setRescheduleSummary(e.target.value)}
                placeholder="Reason for rescheduling and any additional notes..."
                rows={3}
                className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
              {!rescheduleSummary.trim() && (
                <p className="text-xs text-error-500 mt-1.5">Summary is required</p>
              )}
            </div>

            <div className="rounded-lg bg-brand-50 dark:bg-brand-500/10 p-3.5 border border-brand-100 dark:border-brand-500/20">
              <p className="text-xs text-brand-700 dark:text-brand-400">
                <span className="font-semibold">Note:</span> Rescheduling will update the meeting date and time. The status will be changed to "Rescheduled" and the lead's meeting history will be updated.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button size="sm" variant="outline" onClick={closeRescheduleModal} className="w-1/2">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleReschedule}
              className="w-1/2"
              disabled={!rescheduleDate || !rescheduleSummary.trim()}
            >
              Confirm Reschedule
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Complete Modal ── */}
      <Modal isOpen={completeModal.open} onClose={closeCompleteModal} className="max-w-[480px] m-4">
        <div className="relative w-full rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-8">
          <div className="mb-6 space-y-4">
            <div>
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-1">
                Complete Meeting
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Mark <span className="font-semibold text-gray-700 dark:text-gray-300">{completeModal.meeting?.subject}</span> as completed and record the outcome.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                Summary <span className="text-error-500">*</span>
              </label>
              <textarea
                value={completeSummary}
                onChange={(e) => setCompleteSummary(e.target.value)}
                placeholder="Describe the meeting outcome, decisions made, and next steps..."
                rows={4}
                className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
              {!completeSummary.trim() && (
                <p className="text-xs text-error-500 mt-1.5">Summary is required</p>
              )}
            </div>

            <div className="rounded-lg bg-success-50 dark:bg-success-500/10 p-3.5 border border-success-100 dark:border-success-500/20">
              <p className="text-xs text-success-700 dark:text-success-400 flex items-center gap-1.5">
                <FiCheckCircle className="size-3.5 shrink-0" />
                <span>After completion, you'll be able to navigate to the <strong>Business Proposal</strong> page to create a formal proposal.</span>
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button size="sm" variant="outline" onClick={closeCompleteModal} className="w-1/2">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleComplete}
              className="w-1/2 bg-success-600 hover:bg-success-700"
              disabled={!completeSummary.trim()}
            >
              Complete Meeting
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Cancel Modal ── */}
      <Modal isOpen={cancelModal.open} onClose={closeCancelModal} className="max-w-[480px] m-4">
        <div className="relative w-full rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-8">
          <div className="mb-6 space-y-4">
            <div>
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-1">
                Cancel Meeting
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Cancel <span className="font-semibold text-gray-700 dark:text-gray-300">{cancelModal.meeting?.subject}</span> with {cancelModal.meeting?.company}. This will update the related Lead status to <strong>Lost</strong>.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                Summary <span className="text-error-500">*</span>
              </label>
              <textarea
                value={cancelSummary}
                onChange={(e) => setCancelSummary(e.target.value)}
                placeholder="Reason for cancellation and any notes..."
                rows={3}
                className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
              {!cancelSummary.trim() && (
                <p className="text-xs text-error-500 mt-1.5">Summary is required</p>
              )}
            </div>

            <div className="rounded-lg bg-error-50 dark:bg-error-500/10 p-3.5 border border-error-100 dark:border-error-500/20">
              <p className="text-xs text-error-700 dark:text-error-400 flex items-center gap-1.5">
                <FiXCircle className="size-3.5 shrink-0" />
                <span>The related Lead will be automatically marked as <strong>Lost</strong>.</span>
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button size="sm" variant="outline" onClick={closeCancelModal} className="w-1/2">
              Keep Scheduled
            </Button>
            <Button
              size="sm"
              onClick={handleCancel}
              className="w-1/2 bg-error-600 hover:bg-error-700"
              disabled={!cancelSummary.trim()}
            >
              Confirm Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Proposal Confirmation Modal ── */}
      <Modal isOpen={proposalConfirmModal.open} onClose={closeProposalConfirmModal} className="max-w-[480px] m-4">
        <div className="relative w-full rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-8">
          <div className="mb-6 space-y-4">
            <div>
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-1">
                Create Business Proposal
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Are you sure you want to generate a new business proposal for{" "}
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {proposalConfirmModal.meeting?.company}
                </span>?
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-white/[0.05] dark:bg-white/[0.03]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 font-bold text-sm">
                  <FiFileText className="size-5" />
                </div>
                <div>
                  <h5 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    {proposalConfirmModal.meeting?.company}
                  </h5>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Contact: {proposalConfirmModal.meeting?.contactPerson} • Subject: {proposalConfirmModal.meeting?.subject}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-brand-50 dark:bg-brand-500/10 p-3.5 border border-brand-100 dark:border-brand-500/20">
              <p className="text-xs text-brand-700 dark:text-brand-400">
                <span className="font-semibold">Note:</span> You will be redirected to the proposal creation form with the client and meeting details pre-filled.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button size="sm" variant="outline" onClick={closeProposalConfirmModal} className="w-1/2">
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirmProposal} className="w-1/2">
              Create Proposal
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
