import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Badge from "../../../components/ui/badge/Badge";
import Input from "../../../components/form/input/InputField";
import DatePicker from "../../../components/form/date-picker";
import { formatDate, formatTime } from "../../../utils/dateFormatter";
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
import { ChevronDownIcon, ChevronUpIcon } from "../../../icons";
import { getStorage, setStorage } from "../../../utils/storage";
import {
  initialFollowUps,
  getFollowUpStatusColor,
  type FollowUp,
} from "../data/contactData";
import { ASSIGNEES, initialLeads, type Lead } from "../../LeadManagement/data/leadsData";
import { useToast } from "../../../hooks/useToast";
import { Modal } from "../../../components/ui/modal";
import Button from "../../../components/ui/button/Button";
import { FiCheckCircle, FiEye, FiXCircle, FiClock } from "react-icons/fi";

const FOLLOW_UP_STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "Scheduled", label: "Scheduled" },
  { value: "Completed", label: "Completed" },
  { value: "Missed", label: "Missed" },
];

export default function FollowUps() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Get the currently logged-in user
  const loggedInUser = getStorage<any>("saiflow_logged_in_user", {
    name: "John Doe",
    email: "john.doe@saiflow.com",
    role: "Business Development Executive",
  });
  const currentUserName = loggedInUser?.name || "John Doe";
  const isAdmin = loggedInUser?.role === "Administrator";

  const [followupsList, setFollowupsList] = useState<FollowUp[]>(() => {
    const allFollowUps = getStorage<FollowUp[]>("saiflow_followups", initialFollowUps);
    if (isAdmin) return allFollowUps;
    return allFollowUps.filter((f) => f.assignedTo === currentUserName);
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof FollowUp>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);

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
  const [selectedItemForComplete, setSelectedItemForComplete] = useState<FollowUp | null>(null);
  const [completeOutcome, setCompleteOutcome] = useState<"Interested" | "Reschedule" | "Not Interested" | null>(null);
  const [completeSummary, setCompleteSummary] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");

  // Modal state for missed / reschedule
  const [selectedItemForMissed, setSelectedItemForMissed] = useState<FollowUp | null>(null);
  const [missedSummary, setMissedSummary] = useState("");
  const [missedDate, setMissedDate] = useState("");
  const [missedTime, setMissedTime] = useState("");

  const resetCompleteModal = () => {
    setSelectedItemForComplete(null);
    setCompleteOutcome(null);
    setCompleteSummary("");
    setRescheduleDate("");
    setRescheduleTime("");
  };

  const handleOpenCompleteModal = (item: FollowUp) => {
    setSelectedItemForComplete(item);
    setCompleteOutcome("Interested");
    setCompleteSummary("");
    setRescheduleDate("");
    setRescheduleTime("");
  };

  const handleOpenMissedModal = (item: FollowUp) => {
    setSelectedItemForMissed(item);
    setMissedSummary("");
    setMissedDate("");
    setMissedTime("");

    // Per workflow: Missed → Change status to Rescheduled
    const leadsList = getStorage<Lead[]>("saiflow_leads", initialLeads);
    const updatedLeads = leadsList.map((l) =>
      l.id === item.leadId
        ? { ...l, status: "Rescheduled" as const, notes: l.notes ? `${l.notes}\n[Follow-up Missed] Call was missed.` : `[Follow-up Missed] Call was missed.` }
        : l
    );
    setStorage("saiflow_leads", updatedLeads);
  };

  const handleConfirmComplete = () => {
    if (!selectedItemForComplete) return;

    if (completeOutcome === "Interested") {
      const summary = completeSummary.trim() || "Client expressed interest.";

      const updatedList = followupsList.map((f) =>
        f.id === selectedItemForComplete.id
          ? { ...f, status: "Completed" as const, completedSummary: summary }
          : f
      );
      setFollowupsList(updatedList);
      setStorage("saiflow_followups", updatedList);

      // Update the lead's status to Qualified
      const leadsList = getStorage<Lead[]>("saiflow_leads", initialLeads);
      const updatedLeads = leadsList.map((l) =>
        l.id === selectedItemForComplete.leadId
          ? {
              ...l,
              status: "Qualified" as const,
              summary: summary,
              notes: l.notes ? `${l.notes}\n[Follow-up Completed - Interested] ${summary}` : `[Follow-up Completed - Interested] ${summary}`
            }
          : l
      );
      setStorage("saiflow_leads", updatedLeads);

      showToast(`Follow-up completed! Lead moved to Qualified.`, "success");
      resetCompleteModal();
    } else if (completeOutcome === "Reschedule") {
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

      const summary = completeSummary.trim();

      const updatedList = followupsList.map((f) =>
        f.id === selectedItemForComplete.id
          ? {
              ...f,
              status: "Scheduled" as const,
              date: rescheduleDate,
              time: rescheduleTime,
              reason: summary,
            }
          : f
      );
      setFollowupsList(updatedList);
      setStorage("saiflow_followups", updatedList);

      const leadsList = getStorage<Lead[]>("saiflow_leads", initialLeads);
      const updatedLeads = leadsList.map((l) =>
        l.id === selectedItemForComplete.leadId
          ? {
              ...l,
              status: "Scheduled" as const,
              nextFollowUpDate: rescheduleDate,
              followUpTime: rescheduleTime,
              summary: summary,
              notes: l.notes ? `${l.notes}\n[Follow-up Rescheduled] ${summary}` : `[Follow-up Rescheduled] ${summary}`
            }
          : l
      );
      setStorage("saiflow_leads", updatedLeads);

      showToast(`Follow-up rescheduled to ${rescheduleDate} at ${rescheduleTime}.`, "success");
      resetCompleteModal();
    } else if (completeOutcome === "Not Interested") {
      if (!completeSummary.trim()) {
        showToast("Please provide a reason for declining interest.", "error");
        return;
      }

      const summary = completeSummary.trim();

      const updatedList = followupsList.map((f) =>
        f.id === selectedItemForComplete.id
          ? { ...f, status: "Completed" as const, completedSummary: `[Not Interested] ${summary}` }
          : f
      );
      setFollowupsList(updatedList);
      setStorage("saiflow_followups", updatedList);

      const leadsList = getStorage<Lead[]>("saiflow_leads", initialLeads);
      const updatedLeads = leadsList.map((l) =>
        l.id === selectedItemForComplete.leadId
          ? {
              ...l,
              status: "Lost" as const,
              summary: summary,
              notes: l.notes ? `${l.notes}\n[Follow-up - Not Interested] ${summary}` : `[Follow-up - Not Interested] ${summary}`
            }
          : l
      );
      setStorage("saiflow_leads", updatedLeads);

      showToast("Follow-up marked as Not Interested. Lead moved to Lost.", "info");
      resetCompleteModal();
    }
  };

  const handleConfirmMissedReschedule = () => {
    if (!selectedItemForMissed) return;

    if (!missedSummary.trim()) {
      showToast("Please enter a summary for the missed follow-up.", "error");
      return;
    }
    if (!missedDate) {
      showToast("Please select a new follow-up date.", "error");
      return;
    }
    if (!missedTime) {
      showToast("Please select a new follow-up time.", "error");
      return;
    }

    const updatedList = followupsList.map((f) =>
      f.id === selectedItemForMissed.id
        ? {
            ...f,
            status: "Scheduled" as const,
            date: missedDate,
            time: missedTime,
            reason: missedSummary.trim(),
          }
        : f
    );
    setFollowupsList(updatedList);
    setStorage("saiflow_followups", updatedList);

    // Per workflow: Rescheduled → Summary + Date/Time → Return to Scheduled
    const leadsList = getStorage<Lead[]>("saiflow_leads", initialLeads);
    const updatedLeads = leadsList.map((l) =>
      l.id === selectedItemForMissed.leadId
        ? {
            ...l,
            status: "Scheduled" as const,
            nextFollowUpDate: missedDate,
            followUpTime: missedTime,
            summary: missedSummary.trim(),
            notes: l.notes ? `${l.notes}\n[Follow-up Rescheduled] ${missedSummary.trim()}` : `[Follow-up Rescheduled] ${missedSummary.trim()}`,
          }
        : l
    );
    setStorage("saiflow_leads", updatedLeads);

    showToast(`Follow-up rescheduled to ${missedDate} at ${missedTime}.`, "success");
    setSelectedItemForMissed(null);
    setMissedSummary("");
    setMissedDate("");
    setMissedTime("");
  };

  return (
    <>
      <PageMeta
        title="Follow-ups | SaiFlow"
        description="Track and manage follow-up activities in SaiFlow CRM."
      />
      <PageBreadcrumb pageTitle="Follow-ups" />

      {/* Control Panel */}
      <div className="flex flex-col gap-4 mb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full lg:w-auto">
          <div className="w-full sm:w-64">
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>

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
                  {assigneeFilter === "all" ? "All assignees" : assigneeFilter}
                </span>
                <ChevronDownIcon className="w-4 h-4 text-gray-500 shrink-0 ml-1" />
              </button>
              <Dropdown
                isOpen={isAssigneeOpen}
                onClose={() => setIsAssigneeOpen(false)}
                className="left-0 right-auto w-44 p-1 mt-2"
              >
                <ul className="flex flex-col gap-0.5">
                  {[{ value: "all", label: "All assignees" }, ...ASSIGNEES.map((a) => ({ value: a, label: a }))].map((opt) => (
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
                  {renderSortHeader("Contact person", "contactPerson")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Date", "date")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Time", "time")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Assigned to", "assignedTo")}
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
                paginatedItems.map((item) => (
                  <TableRow
                    key={item.id}
                    className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-800 dark:text-white/90">
                      {item.id}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-800 dark:text-white/90 whitespace-nowrap">
                      <span className="font-mono text-xs tracking-wider">
                        SF-LEAD-{String(item.leadId).padStart(4, "0")}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm font-medium whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/contacts/follow-ups/${item.leadId}`)}
                        className="text-gray-800 dark:text-white/90 hover:text-gray-500 dark:hover:text-gray-400 hover:underline transition-colors font-medium cursor-pointer text-left"
                        title="View lead details"
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
                          onClick={() => navigate(`/contacts/follow-ups/${item.leadId}`)}
                          title="View lead details"
                          className="flex items-center justify-center h-8 w-8 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5 transition cursor-pointer"
                        >
                          <FiEye className="size-4" />
                        </button>
                        {item.status === "Scheduled" && (
                          <>
                            <button
                              onClick={() => handleOpenCompleteModal(item)}
                              title="Mark as Completed"
                              className="flex items-center justify-center h-8 w-8 rounded-lg bg-success-500 text-white hover:bg-success-600 transition cursor-pointer"
                            >
                              <FiCheckCircle className="size-4" />
                            </button>
                            <button
                              onClick={() => handleOpenMissedModal(item)}
                              title="Mark as Missed & Reschedule"
                              className="flex items-center justify-center h-8 w-8 rounded-lg bg-error-500 text-white hover:bg-error-600 transition cursor-pointer"
                            >
                              <FiXCircle className="size-4" />
                            </button>
                          </>
                        )}
                        {item.status === "Missed" && (
                          <>
                            <button
                              onClick={() => handleOpenCompleteModal(item)}
                              title="Mark as Completed"
                              className="flex items-center justify-center h-8 w-8 rounded-lg bg-success-500 text-white hover:bg-success-600 transition cursor-pointer"
                            >
                              <FiCheckCircle className="size-4" />
                            </button>
                            <button
                              onClick={() => handleOpenMissedModal(item)}
                              title="Reschedule"
                              className="flex items-center justify-center h-8 w-8 rounded-lg bg-warning-500 text-white hover:bg-warning-600 transition cursor-pointer"
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
            <FiCheckCircle className="size-5 text-brand-500" />
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Update follow-up outcome
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

          {/* 3 Outcome Action Buttons (ALWAYS VISIBLE) */}
          <div className="mb-5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2.5">
              Select Call Outcome <span className="text-error-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {/* Button 1: Interest */}
              <button
                type="button"
                onClick={() => setCompleteOutcome("Interested")}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition cursor-pointer text-center gap-1.5 ${
                  completeOutcome === "Interested"
                    ? "border-success-500 bg-success-50 text-success-700 dark:border-success-500 dark:bg-success-950/40 dark:text-success-400 ring-2 ring-success-500/20 font-semibold"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700/50"
                }`}
              >
                <FiCheckCircle className={`size-5 ${completeOutcome === "Interested" ? "text-success-600 dark:text-success-400" : "text-gray-400"}`} />
                <span>Interest</span>
              </button>

              {/* Button 2: Reschedule */}
              <button
                type="button"
                onClick={() => setCompleteOutcome("Reschedule")}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition cursor-pointer text-center gap-1.5 ${
                  completeOutcome === "Reschedule"
                    ? "border-warning-500 bg-warning-50 text-warning-700 dark:border-warning-500 dark:bg-warning-950/40 dark:text-warning-400 ring-2 ring-warning-500/20 font-semibold"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700/50"
                }`}
              >
                <FiClock className={`size-5 ${completeOutcome === "Reschedule" ? "text-warning-600 dark:text-warning-400" : "text-gray-400"}`} />
                <span>Reschedule</span>
              </button>

              {/* Button 3: Not Interested */}
              <button
                type="button"
                onClick={() => setCompleteOutcome("Not Interested")}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition cursor-pointer text-center gap-1.5 ${
                  completeOutcome === "Not Interested"
                    ? "border-error-500 bg-error-50 text-error-700 dark:border-error-500 dark:bg-error-950/40 dark:text-error-400 ring-2 ring-error-500/20 font-semibold"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700/50"
                }`}
              >
                <FiXCircle className={`size-5 ${completeOutcome === "Not Interested" ? "text-error-600 dark:text-error-400" : "text-gray-400"}`} />
                <span>Not Interested</span>
              </button>
            </div>
          </div>

          {/* Form details section depending on outcome */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {completeOutcome === "Interested" && <>Summary / Notes <span className="text-gray-400 font-normal">(optional)</span></>}
                {completeOutcome === "Reschedule" && <>Reason for rescheduling <span className="text-error-500">*</span></>}
                {completeOutcome === "Not Interested" && <>Reason for declining interest <span className="text-error-500">*</span></>}
              </label>
              <textarea
                value={completeSummary}
                onChange={(e) => setCompleteSummary(e.target.value)}
                placeholder={
                  completeOutcome === "Interested"
                    ? "E.g., Client agreed to schedule a product demo next week..."
                    : completeOutcome === "Reschedule"
                    ? "E.g., Client is in a meeting, requested callback later today..."
                    : "E.g., Client selected another vendor due to price..."
                }
                rows={3}
                className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            {completeOutcome === "Reschedule" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <DatePicker
                    id="modal-reschedule-date"
                    label="New follow-up date"
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
                    label="New follow-up time"
                    required={true}
                    defaultDate={rescheduleTime}
                    onChange={(_, timeStr) => setRescheduleTime(timeStr)}
                  />
                  {!rescheduleTime && (
                    <span className="mt-1 text-xs text-error-500 block">Required</span>
                  )}
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
              className={
                completeOutcome === "Interested"
                  ? "bg-success-600 hover:bg-success-700 text-white"
                  : completeOutcome === "Reschedule"
                  ? "bg-warning-600 hover:bg-warning-700 text-white"
                  : "bg-error-600 hover:bg-error-700 text-white"
              }
            >
              {completeOutcome === "Interested" && "Confirm Interested (Qualify)"}
              {completeOutcome === "Reschedule" && "Confirm Reschedule"}
              {completeOutcome === "Not Interested" && "Confirm Not Interested"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Missed / Reschedule Modal */}
      <Modal
        isOpen={!!selectedItemForMissed}
        onClose={() => { setSelectedItemForMissed(null); setMissedSummary(""); setMissedDate(""); setMissedTime(""); }}
        className="max-w-[500px] m-4"
      >
        <div className="relative w-full rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-8">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <FiXCircle className="size-5 text-error-500" />
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Follow-up missed — Reschedule
              </h4>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Log the reason for the missed follow-up with{' '}
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {selectedItemForMissed?.company}
              </span>
              {selectedItemForMissed?.contactPerson && (
                <> ({selectedItemForMissed.contactPerson})</>
              )}
              , then set a new date and time.
            </p>
            {selectedItemForMissed && (
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                  Previous: {selectedItemForMissed.date} at {selectedItemForMissed.time}
                </span>
                <span className="inline-flex items-center rounded-md bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                  Reason: {selectedItemForMissed.reason}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Summary of missed call <span className="text-error-500">*</span>
              </label>
              <textarea
                value={missedSummary}
                onChange={(e) => setMissedSummary(e.target.value)}
                placeholder="E.g., Client was unavailable, will try again..."
                rows={3}
                className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <DatePicker
                  id="missed-follow-up-date"
                  label="New follow-up date"
                  required={true}
                  defaultDate={missedDate}
                  onChange={(_, dateStr) => setMissedDate(dateStr)}
                />
              </div>
              <div>
                <DatePicker
                  id="missed-follow-up-time"
                  mode="time"
                  label="New follow-up time"
                  required={true}
                  defaultDate={missedTime}
                  onChange={(_, timeStr) => setMissedTime(timeStr)}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 dark:border-white/[0.05]">
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setSelectedItemForMissed(null); setMissedSummary(""); setMissedDate(""); setMissedTime(""); }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmMissedReschedule}
              className="bg-warning-600 hover:bg-warning-700 text-white"
            >
              Reschedule
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
