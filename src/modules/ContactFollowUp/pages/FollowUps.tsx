import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Badge from "../../../components/ui/badge/Badge";
import Input from "../../../components/form/input/InputField";
import DatePicker from "../../../components/form/date-picker";
import { formatDate, formatTime } from "../../../utils/dateFormatter";
// import { Dropdown } from "../../../components/ui/dropdown/Dropdown"; // Filter dropdowns commented out
// import { DropdownItem } from "../../../components/ui/dropdown/DropdownItem"; // Filter dropdowns commented out
import { Pagination } from "../../../components/ui/pagination/Pagination";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "../../../components/ui/table";
import { ChevronDownIcon, ChevronUpIcon } from "../../../icons";
import { useAuth } from "../../../context/AuthContext";
import { connectService } from "../../../services/connectService";
import {
  getFollowUpStatusColor,
  type FollowUp,
} from "../data/contactData";

// Maps a backend connect row to the FollowUp shape used by this page.
const toFollowUp = (r: any): FollowUp => ({
  id: r.id,
  leadId: r.leadId,
  company: r.company || "",
  contactPerson: r.contactPerson || "",
  phone: r.phone || "",
  assignedTo: r.assignedTo || "Unassigned",
  date: r.followUpDate || "",
  time: r.followUpTime || "",
  reason: r.summary || "",
  status:
    r.status === "COMPLETED"
      ? "Completed"
      : r.status === "MISSED"
        ? "Missed"
        : "Scheduled",
  followUpType: r.followUpType || undefined,
  completedSummary: r.outcome ? r.summary || undefined : undefined,
});
import { useToast } from "../../../hooks/useToast";
import { Modal } from "../../../components/ui/modal";
import Button from "../../../components/ui/button/Button";
import { FiCheckCircle, FiEye, FiXCircle, FiClock } from "react-icons/fi";

/* Status filter commented out (per Task 1)
const FOLLOW_UP_STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "Scheduled", label: "Scheduled" },
  { value: "Completed", label: "Completed" },
  { value: "Missed", label: "Missed" },
];
*/

export default function FollowUps() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { user } = useAuth();

  const [followupsList, setFollowupsList] = useState<FollowUp[]>([]);

  const fetchFollowUps = async () => {
    try {
      const data = await connectService.getConnects({ limit: 200 });
      if (data && Array.isArray(data.data)) {
        // Only active follow-ups (rows with a follow-up date) belong on this
        // page; outcome-only records from the Contact page and completed
        // follow-ups are not shown here.
        setFollowupsList(
          data.data
            .filter((r: any) => r.followUpDate && r.status !== "COMPLETED")
            .map(toFollowUp)
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchFollowUps();
    }
  }, [user]);

  const [searchQuery, setSearchQuery] = useState("");
  // setStatusFilter removed while the Status filter dropdown is commented out
  const [statusFilter] = useState("all");
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof FollowUp>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  // setIsStatusOpen / isAssigneeOpen states removed while the filter dropdowns are commented out
  // setAssigneeFilter removed while the Assignee filter dropdown is commented out
  const [assigneeFilter] = useState("all");

  const handleSort = (field: keyof FollowUp) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const processedItems = useMemo(() => {
    let result = [...followupsList];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.company.toLowerCase().includes(q) ||
          f.contactPerson.toLowerCase().includes(q) ||
          f.reason.toLowerCase().includes(q) ||
          f.assignedTo.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((f) => f.status === statusFilter);
    }

    if (assigneeFilter !== "all") {
      result = result.filter((f) => f.assignedTo === assigneeFilter);
    }

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
  }, [followupsList, searchQuery, statusFilter, assigneeFilter, sortField, sortOrder]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return processedItems.slice(start, start + rowsPerPage);
  }, [processedItems, currentPage, rowsPerPage]);

  const totalItems = processedItems.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);

  const renderSortHeader = (label: string, field: keyof FollowUp) => {
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


  // Modal state for completing follow-ups
  const [saving, setSaving] = useState(false);
  const [selectedItemForComplete, setSelectedItemForComplete] = useState<FollowUp | null>(null);
  const [completeOutcome, setCompleteOutcome] = useState<"Interested" | "Call Later" | "Not Interested" | null>(null);
  const [completeSummary, setCompleteSummary] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleType, setRescheduleType] = useState("Call");

  const followUpTypeOptions = useMemo<string[]>(() => {
    return ["Call", "Meeting", "Email", "WhatsApp"];
  }, []);

  const handleOpenCompleteModal = (
    item: FollowUp,
    preset?: "Interested" | "Call Later" | "Not Interested"
  ) => {
    setSelectedItemForComplete(item);
    setCompleteOutcome(preset || null);
    setCompleteSummary("");
    setRescheduleDate("");
    setRescheduleTime("");
    setRescheduleType(item.followUpType || "Call");
  };

  const resetCompleteModal = () => {
    setSelectedItemForComplete(null);
    setCompleteOutcome(null);
    setCompleteSummary("");
    setRescheduleDate("");
    setRescheduleTime("");
  };

  const handleConfirmComplete = async () => {
    if (!selectedItemForComplete || saving) return;

    // Validate before locking the buttons so a failed validation never leaves
    // the saving flag stuck.
    if (completeOutcome === "Call Later") {
      if (!completeSummary.trim()) {
        showToast("Please enter a summary/reason for rescheduling.", "error");
        return;
      }
      if (!rescheduleDate) {
        showToast("Please select a new follow-up date.", "error");
        return;
      }
      if (!rescheduleTime) {
        showToast("Please select a new follow-up time.", "error");
        return;
      }
    } else if (completeOutcome === "Not Interested") {
      if (!completeSummary.trim()) {
        showToast("Please provide a reason for declining interest.", "error");
        return;
      }
    }

    setSaving(true);
    try {
      if (completeOutcome === "Interested") {
        const summary = completeSummary.trim() || "Client expressed interest.";
        await connectService.updateConnect(selectedItemForComplete.id, {
          status: "COMPLETED",
          outcome: "INTERESTED",
          summary
        });
        showToast(`Follow-up completed! Lead moved to Qualified.`, "success");
      } else if (completeOutcome === "Call Later") {
        const summary = completeSummary.trim();
        await connectService.updateConnect(selectedItemForComplete.id, {
          status: "SCHEDULED",
          outcome: "CALL_LATER",
          summary,
          followUpType: rescheduleType,
          followUpDate: rescheduleDate,
          followUpTime: rescheduleTime
        });
        showToast(`Follow-up rescheduled to ${rescheduleDate} at ${rescheduleTime}.`, "success");
      } else if (completeOutcome === "Not Interested") {
        const summary = completeSummary.trim();
        await connectService.updateConnect(selectedItemForComplete.id, {
          status: "COMPLETED",
          outcome: "NOT_INTERESTED",
          summary
        });
        showToast("Follow-up marked as Not Interested. Lead moved to Lost.", "info");
      }
    } catch (err) {
      showToast("Failed to update lead status.", "error");
    } finally {
      setSaving(false);
    }

    resetCompleteModal();
    fetchFollowUps();
  };

  return (
    <>
      <PageMeta
        title="Follow-Ups | SaiFlow"
        description="Track and manage follow-up activities in SaiFlow CRM."
      />
      <PageBreadcrumb pageTitle="Follow-Ups" />

      {/* Control Panel */}
      <div className="flex flex-col gap-4 mb-4 lg:flex-row lg:items-center lg:justify-between">
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
              onClick={() => {
                setIsStatusOpen(!isStatusOpen);
                setIsAssigneeOpen(false);
              }}
              className="flex items-center justify-between h-11 w-40 rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer dropdown-toggle hover:bg-gray-50 dark:hover:bg-white/5"
            >
              <span className="truncate">
                {FOLLOW_UP_STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label}
              </span>
              <ChevronDownIcon className="w-4 h-4 text-gray-500 shrink-0 ml-1" />
            </button>
            <Dropdown
              isOpen={isStatusOpen}
              onClose={() => setIsStatusOpen(false)}
              className="left-0 right-auto w-40 p-1 mt-2"
            >
              <ul className="flex flex-col gap-0.5">
                {FOLLOW_UP_STATUS_OPTIONS.map((opt) => (
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
          */}

          {/* Assignee filter (commented out per Task 1)
          {isAdmin && (
            <div className="relative">
              <button
                onClick={() => {
                  setIsAssigneeOpen(!isAssigneeOpen);
                  setIsStatusOpen(false);
                }}
                className="flex items-center justify-between h-11 w-40 rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer dropdown-toggle hover:bg-gray-50 dark:hover:bg-white/5"
              >
                <span className="truncate">
                  {assigneeFilter === "all" ? "All Assignees" : assigneeFilter}
                </span>
                <ChevronDownIcon className="w-4 h-4 text-gray-500 shrink-0 ml-1" />
              </button>
              <Dropdown
                isOpen={isAssigneeOpen}
                onClose={() => setIsAssigneeOpen(false)}
                className="left-0 right-auto w-44 p-1 mt-2"
              >
                <ul className="flex flex-col gap-0.5">
                  {[{ value: "all", label: "All Assignees" }, ...ASSIGNEES.map((a) => ({ value: a, label: a }))].map((opt) => (
                    <li key={opt.value}>
                      <DropdownItem
                        onItemClick={() => {
                          setAssigneeFilter(opt.value);
                          setCurrentPage(1);
                          setIsAssigneeOpen(false);
                        }}
                        className={`cursor-pointer rounded-lg text-left w-full px-3 py-2 text-sm ${
                          assigneeFilter === opt.value
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
          )}
          */}
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
                  Lead ID
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
                  {renderSortHeader("Type", "followUpType" as any)}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Assigned To", "assignedTo")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Status", "status")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Action
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {paginatedItems.length > 0 ? (
                paginatedItems.map((item, index) => (
                  <TableRow
                    key={item.id}
                    className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400 font-mono text-xs">
                      {(currentPage - 1) * rowsPerPage + index + 1}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-800 dark:text-white/90 whitespace-nowrap">
                      <span className="font-mono text-xs tracking-wider">
                        SF-LEAD-{String(item.leadId).padStart(4, "0")}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm font-medium whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/connect/follow-ups/${item.leadId}`)}
                        className="text-gray-800 dark:text-white/90 hover:text-gray-500 dark:hover:text-gray-400 hover:underline transition-colors font-medium cursor-pointer text-left"
                        title="View Lead Details"
                      >
                        {item.company}
                      </button>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {item.contactPerson}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {formatDate(item.date)}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {formatTime(item.time)}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {item.followUpType ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-50 text-gray-700 dark:bg-white/[0.04] dark:text-gray-300 border border-gray-150 dark:border-white/[0.05]">
                          {item.followUpType}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {item.assignedTo}
                    </TableCell>
                    <TableCell className="px-5 py-4 whitespace-nowrap">
                      <Badge size="sm" color={getFollowUpStatusColor(item.status)}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-end whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/connect/follow-ups/${item.leadId}`)}
                          title="View Lead Details"
                          className="p-1.5 text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10 rounded-lg transition cursor-pointer"
                        >
                          <FiEye className="size-4" />
                        </button>
                        {(item.status === "Scheduled" || item.status === "Missed") && (
                          <>
                            <button
                              onClick={() => handleOpenCompleteModal(item, "Interested")}
                              title="Mark as Interested"
                              className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10 rounded-lg transition cursor-pointer"
                            >
                              <FiCheckCircle className="size-4" />
                            </button>
                            <button
                              onClick={() => handleOpenCompleteModal(item, "Call Later")}
                              title="Call Later — Reschedule Follow-Up"
                              className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10 rounded-lg transition cursor-pointer"
                            >
                              <FiClock className="size-4" />
                            </button>
                            <button
                              onClick={() => handleOpenCompleteModal(item, "Not Interested")}
                              title="Mark as Not Interested"
                              className="p-1.5 text-error-600 hover:text-error-700 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10 rounded-lg transition cursor-pointer"
                            >
                              <FiXCircle className="size-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No follow-ups found.
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
            onRowsPerPageChange={(rows) => { setRowsPerPage(rows); setCurrentPage(1); }}
            itemName="follow-ups"
          />
        )}
      </div>

      {/* Mark as Completed / Outcome Modal */}
      <Modal
        isOpen={!!selectedItemForComplete}
        onClose={resetCompleteModal}
        className="max-w-[520px] m-4"
      >
        <div className="relative w-full rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-8">
          {/* Header */}
          <div className="mb-5 flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
            {completeOutcome === "Interested" && <FiCheckCircle className="size-5 text-success-500" />}
            {completeOutcome === "Call Later" && <FiClock className="size-5 text-warning-500" />}
            {completeOutcome === "Not Interested" && <FiXCircle className="size-5 text-error-500" />}
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {completeOutcome === "Interested" && "Mark as Interested"}
              {completeOutcome === "Call Later" && "Reschedule Follow-Up"}
              {completeOutcome === "Not Interested" && "Mark as Not Interested"}
            </h4>
          </div>

          {/* Lead info banner */}
          {selectedItemForComplete && (
            <div className="mb-5 rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3.5 border border-gray-150 dark:border-gray-700/60">
              <div className="text-sm font-semibold text-gray-800 dark:text-white/90">
                {selectedItemForComplete.company}
                {selectedItemForComplete.contactPerson && (
                  <span className="font-normal text-gray-500 dark:text-gray-400"> ({selectedItemForComplete.contactPerson})</span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>Scheduled: {formatDate(selectedItemForComplete.date)} at {formatTime(selectedItemForComplete.time)}</span>
                {selectedItemForComplete.reason && (
                  <span>• Reason: {selectedItemForComplete.reason}</span>
                )}
              </div>
            </div>
          )}

          {/* Form details section depending on outcome */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {completeOutcome === "Interested" && <>Summary / Notes <span className="text-gray-400 font-normal">(Optional)</span></>}
                {completeOutcome === "Call Later" && <>Reason for Follow-Up <span className="text-error-500">*</span></>}
                {completeOutcome === "Not Interested" && <>Reason for Declining Interest <span className="text-error-500">*</span></>}
              </label>
              <textarea
                value={completeSummary}
                onChange={(e) => setCompleteSummary(e.target.value)}
                placeholder={
                  completeOutcome === "Interested"
                    ? "E.g., Client agreed to schedule a product demo next week..."
                    : completeOutcome === "Call Later"
                    ? "E.g., Client is in a meeting, requested callback later today..."
                    : "E.g., Client selected another vendor due to price..."
                }
                rows={3}
                className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            {completeOutcome === "Call Later" && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Follow-Up Type <span className="text-error-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={rescheduleType}
                      onChange={(e) => setRescheduleType(e.target.value)}
                      className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer"
                      style={{
                        backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                        backgroundPosition: "right 0.75rem center",
                        backgroundSize: "1.1rem",
                        backgroundRepeat: "no-repeat",
                      }}
                    >
                      {followUpTypeOptions.map((type) => (
                        <option key={type} value={type} className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 py-1">
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <DatePicker
                      id="modal-reschedule-date"
                      label="New Follow-Up Date"
                      required={true}
                      defaultDate={rescheduleDate}
                      onChange={(_, dateStr) => setRescheduleDate(dateStr)}
                    />
                    {!rescheduleDate && (
                      <span className="mt-1 text-xs text-error-500 block">Required</span>
                    )}
                  </div>
                  <div>
                    <DatePicker
                      id="modal-reschedule-time"
                      mode="time"
                      label="New Follow-Up Time"
                      required={true}
                      defaultDate={rescheduleTime}
                      onChange={(_, timeStr) => setRescheduleTime(timeStr)}
                    />
                    {!rescheduleTime && (
                      <span className="mt-1 text-xs text-error-500 block">Required</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-white/[0.05]">
            <Button
              size="sm"
              variant="outline"
              onClick={resetCompleteModal}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmComplete}
              disabled={saving}
              className={
                completeOutcome === "Interested"
                  ? "bg-success-600 hover:bg-success-700 text-white"
                  : completeOutcome === "Call Later"
                  ? "bg-warning-600 hover:bg-warning-700 text-white"
                  : "bg-error-600 hover:bg-error-700 text-white"
              }
            >
              {completeOutcome === "Interested" && "Confirm Interested (Qualify)"}
              {completeOutcome === "Call Later" && "Confirm Call Later"}
              {completeOutcome === "Not Interested" && "Confirm Not Interested"}
            </Button>
          </div>
        </div>
      </Modal>

    </>
  );
}
