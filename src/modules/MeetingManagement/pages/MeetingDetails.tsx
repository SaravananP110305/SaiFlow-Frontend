import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { formatDate, formatTime } from "../../../utils/dateFormatter";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Badge from "../../../components/ui/badge/Badge";
import Button from "../../../components/ui/button/Button";
import { initialMeetings, getMeetingStatusColor, Meeting } from "../data/meetingsData";
import { getStorage, setStorage } from "../../../utils/storage";
import { Lead, initialLeads } from "../../LeadManagement/data/leadsData";
import { Client, initialClients } from "../../ClientManagement/data/clientsData";
import { useToast } from "../../../hooks/useToast";
import { Modal } from "../../../components/ui/modal";
import Select from "../../../components/form/Select";
import Input from "../../../components/form/input/InputField";
import {
  FiBriefcase,
  FiUser,
  FiCalendar,
  FiClock,
  FiVideo,
  FiMapPin,
  FiArrowLeft,
  FiEdit,
  FiActivity,
  FiExternalLink,
  FiLink,
  FiRefreshCw,
  FiCheckCircle,
  FiXCircle,
  FiFileText,
} from "react-icons/fi";

interface MeetingActivityLog {
  id: string;
  meetingId: number;
  action: string;
  description: string;
  timestamp: string;
  operator: string;
}

interface SummaryEntry {
  action: string;
  summary: string;
  date: string;
  operator: string;
}

interface InfoCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

function InfoCard({ icon, label, value }: InfoCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3.5 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-gray-800">
        <span className="text-gray-500 dark:text-gray-400">{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <span className="block text-xs text-gray-400 dark:text-gray-500 mb-0.5">
          {label}
        </span>
        <span className="block text-sm font-medium text-gray-800 dark:text-white/90 break-words">
          {value || <span className="text-gray-400 font-normal">—</span>}
        </span>
      </div>
    </div>
  );
}

export default function MeetingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [matchingLead, setMatchingLead] = useState<Lead | null>(null);
  
  // Modals state
  const [showConvertModal, setShowConvertModal] = useState(false);

  // Conversion Form Entries
  const [paymentTerms, setPaymentTerms] = useState("Net 30");
  const [creditLimit, setCreditLimit] = useState("500000");
  const [relManager, setRelManager] = useState("John Doe");
  const [accManager, setAccManager] = useState("Jane Smith");

  const [activityLogs, setActivityLogs] = useState<MeetingActivityLog[]>([]);
  const [summaryEntries, setSummaryEntries] = useState<SummaryEntry[]>([]);

  // Activity log pagination
  const ACTIVITY_INITIAL_COUNT = 10;
  const ACTIVITY_BATCH_SIZE = 10;
  const [activityVisibleCount, setActivityVisibleCount] = useState(ACTIVITY_INITIAL_COUNT);
  const prevMeetingIdRef = useRef<number | undefined>(undefined);
  if (prevMeetingIdRef.current !== meeting?.id) {
    prevMeetingIdRef.current = meeting?.id;
    if (activityVisibleCount !== ACTIVITY_INITIAL_COUNT) {
      setTimeout(() => setActivityVisibleCount(ACTIVITY_INITIAL_COUNT), 0);
    }
  }

  // Edit Summary Modal
  const [editSummaryModal, setEditSummaryModal] = useState(false);
  const [editSummaryText, setEditSummaryText] = useState("");

  const loggedInUser = getStorage<any>("saiflow_logged_in_user", {
    name: "Admin User",
    email: "admin@gmail.com",
    role: "Administrator",
  });

  const logActivity = (action: string, description: string) => {
    if (!meeting) return;
    const logs = getStorage<MeetingActivityLog[]>("saiflow_meeting_logs", []);
    const newLog: MeetingActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      meetingId: meeting.id,
      action,
      description,
      timestamp: new Date().toISOString(),
      operator: loggedInUser?.name || "Admin User",
    };
    const updatedLogs = [newLog, ...logs];
    setStorage("saiflow_meeting_logs", updatedLogs);
    setActivityLogs(updatedLogs.filter(l => l.meetingId === meeting.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  };

  const loadData = () => {
    const meetings = getStorage<Meeting[]>("saiflow_meetings", initialMeetings);
    const foundMeeting = meetings.find((m) => m.id === Number(id));
    if (foundMeeting) {
      setMeeting(foundMeeting);
      const leads = getStorage<Lead[]>("saiflow_leads", initialLeads);
      
      // Attempt to search matching lead by relatedToId or by company name
      let lead: Lead | undefined;
      if (foundMeeting.relatedToType === "Lead" && foundMeeting.relatedToId) {
        lead = leads.find((l) => l.id === foundMeeting.relatedToId);
      } else {
        lead = leads.find((l) => l.company.toLowerCase() === foundMeeting.company.toLowerCase());
      }
      setMatchingLead(lead || null);
    }
  };

  // Extract summary text from activity log descriptions
  const extractSummaryFromLog = (log: MeetingActivityLog): string | null => {
    const action = log.action.toLowerCase();
    const desc = log.description;
    if (action.includes('completed')) {
      // "Meeting completed. Summary: <text>"
      const match = desc.match(/Summary:\s*(.+)/is);
      return match ? match[1].trim() : desc.replace(/^Meeting completed\.\s*/i, '').trim();
    }
    if (action.includes('rescheduled')) {
      // "Meeting rescheduled to <date> at <time>. Summary: <text>"
      const match = desc.match(/Summary:\s*(.+)/is);
      return match ? match[1].trim() : null;
    }
    if (action.includes('cancelled')) {
      // "Meeting cancelled. Reason: <summary> (Lost reason: <reason>)"
      const match = desc.match(/Reason:\s*([^(\.]+)/is);
      return match ? match[1].trim() : desc.replace(/^Meeting cancelled\.\s*/i, '').trim();
    }
    return null;
  };

  // Derive status-wise summary entries
  const buildSummaryEntries = (logs: MeetingActivityLog[]): SummaryEntry[] => {
    return logs
      .filter((l) => {
        const action = l.action.toLowerCase();
        return action.includes('completed') || action.includes('cancelled') || action.includes('rescheduled');
      })
      .map((l) => ({
        action: l.action,
        summary: extractSummaryFromLog(l) || l.description,
        date: l.timestamp,
        operator: l.operator,
      }));
  };

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (meeting) {
      const allLogs = getStorage<MeetingActivityLog[]>("saiflow_meeting_logs", []);
      let meetingLogs = allLogs.filter((l) => l.meetingId === meeting.id);
      
      if (meetingLogs.length === 0) {
        const initialLog: MeetingActivityLog = {
          id: `log-init-${meeting.id}`,
          meetingId: meeting.id,
          action: "Meeting Scheduled",
          description: `Meeting scheduled with ${meeting.contactPerson} from ${meeting.company}.`,
          timestamp: new Date(meeting.date + (meeting.time ? "T" + meeting.time : "")).toISOString(),
          operator: "System",
        };
        const updatedLogs = [initialLog, ...allLogs];
        setStorage("saiflow_meeting_logs", updatedLogs);
        meetingLogs = [initialLog];
      }
      
      meetingLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivityLogs(meetingLogs);
      setSummaryEntries(buildSummaryEntries(meetingLogs));
    }
  }, [meeting]);

  // ─── Edit Summary Handlers ─────────────────────────────────────────────
  const openEditSummary = () => {
    if (!meeting) return;
    setEditSummaryText(meeting.summary || "");
    setEditSummaryModal(true);
  };

  const handleSaveEditSummary = () => {
    if (!meeting || !editSummaryText.trim()) return;

    const meetings = getStorage<Meeting[]>("saiflow_meetings", initialMeetings);
    const updated = meetings.map((m) =>
      m.id === meeting.id ? { ...m, summary: editSummaryText.trim() } : m
    );
    setStorage("saiflow_meetings", updated);
    setMeeting({ ...meeting, summary: editSummaryText.trim() });

    logActivity("Summary Updated", `Meeting summary was updated: ${editSummaryText.trim()}`);
    showToast("Summary updated successfully.", "success");
    setEditSummaryModal(false);
  };

  const handleConvertLeadConfirm = () => {
    if (!meeting || !matchingLead) return;

    const clientsList = getStorage<Client[]>("saiflow_clients", initialClients);
    
    // Check if client company already exists
    const exists = clientsList.some((c) => c.company.toLowerCase() === matchingLead.company.toLowerCase());
    if (exists) {
      showToast(`A client with company name "${matchingLead.company}" already exists.`, "error");
      setShowConvertModal(false);
      return;
    }

    const newClientId = clientsList.length > 0 ? Math.max(...clientsList.map((c) => c.id)) + 1 : 1;
    const newClient: Client = {
      id: newClientId,
      company: matchingLead.company,
      name: matchingLead.contactPerson,
      email: matchingLead.email,
      phone: matchingLead.phone,
      projectsCount: 0,
      status: "Active",
      industry: matchingLead.industry,
      gstNumber: matchingLead.gstNumber || "",
      panNumber: "",
      website: matchingLead.website || "",
      companyEmail: matchingLead.email,
      companyPhone: matchingLead.phone,
      address: matchingLead.addressLine1 || matchingLead.address || "",
      city: matchingLead.city || "",
      state: matchingLead.state || "",
      country: matchingLead.country || "India",
      pincode: matchingLead.pincode || "",
      contactName: matchingLead.contactPerson,
      designation: matchingLead.designation || "",
      mobile: matchingLead.phone,
      relationshipManager: relManager,
      accountManager: accManager,
      clientSince: new Date().toISOString().split("T")[0],
      paymentTerms: paymentTerms,
      preferredCommunication: "Email",
      creditLimit: creditLimit,
      handoverStatus: "Pending",
    };

    const updatedClients = [...clientsList, newClient];
    setStorage("saiflow_clients", updatedClients);

    // Update Meeting relation to type Client (lead is already Won)
    const meetings = getStorage<Meeting[]>("saiflow_meetings", initialMeetings);
    const updatedMeetings = meetings.map((m) =>
      m.id === meeting.id ? { ...m, relatedToType: "Client" as const, relatedToId: newClientId } : m
    );
    setStorage("saiflow_meetings", updatedMeetings);

    logActivity("Converted Lead", `Lead ${matchingLead.company} successfully converted to Client.`);
    showToast(`Lead converted to Client ${matchingLead.company} successfully!`, "success");
    setShowConvertModal(false);
    
    // Redirect directly to the Client Details View
    navigate(`/clients/${newClientId}`);
  };

  if (!meeting) {
    return (
      <>
        <PageBreadcrumb pageTitle="Meeting details" />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
            Meeting not found
          </p>
          <p className="text-sm text-gray-400 mb-6">
            The meeting you're looking for does not exist or has been deleted.
          </p>
          <Button size="sm" onClick={() => navigate("/meetings")}>
            Back to meeting list
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title="Meeting Details | SaiFlow"
        description="View details and manage scheduled meeting outcome."
      />
      <PageBreadcrumb pageTitle="Meeting details" />

      {/* Top action bar */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => navigate("/meetings")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-white transition cursor-pointer"
        >
          <FiArrowLeft className="size-4" />
          Back to list
        </button>
        <Button
          size="sm"
          onClick={() => navigate(`/meetings/${meeting.id}/edit`)}
          startIcon={<FiEdit className="size-4" />}
        >
          Edit meeting
        </Button>
      </div>

      {/* Header Card */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-gray-200 bg-white px-6 py-5 mb-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            {meeting.subject}
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
            <span>Meeting ID: SF-MTG-{String(meeting.id).padStart(4, "0")}</span>
            <span>•</span>
            <span>{meeting.meetingPlatform || meeting.type || "Online"}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge size="md" color={getMeetingStatusColor(meeting.status)}>
            {meeting.status}
          </Badge>
        </div>
      </div>

      {/* Convert Lead Alert Panel if Won but not yet converted */}
      {meeting.relatedToType === "Lead" && matchingLead && matchingLead.status === "Won" && (
        <div className="rounded-xl border border-success-200 bg-success-50/50 p-5 mb-5 dark:border-success-500/20 dark:bg-success-500/5 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-success-850 dark:text-success-400">
              Lead is Won! Ready to convert?
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              This lead has been successfully won. Convert it to Client Management to start projects.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowConvertModal(true)}
            className="bg-success-600 hover:bg-success-700 text-white"
          >
            Convert to Client
          </Button>
        </div>
      )}

      {/* Information Cards Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Core Schedule Details */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05]">
            Schedule Details
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoCard
              icon={<FiCalendar className="size-4" />}
              label="Meeting Date"
              value={formatDate(meeting.date)}
            />
            <InfoCard
              icon={<FiClock className="size-4" />}
              label="Start time"
              value={formatTime(meeting.startTime || meeting.time)}
            />
            <InfoCard
              icon={<FiClock className="size-4" />}
              label="End time"
              value={formatTime(meeting.endTime || "")}
            />
            <InfoCard
              icon={<FiClock className="size-4" />}
              label="Duration"
              value={meeting.duration || "—"}
            />
            <InfoCard
              icon={<FiBriefcase className="size-4" />}
              label={`Related ${meeting.relatedToType || "Lead"}`}
              value={
                meeting.relatedToId ? (
                  <button
                    onClick={() =>
                      navigate(meeting.relatedToType === "Client" ? `/clients/${meeting.relatedToId}` : `/leads/${meeting.relatedToId}`)
                    }
                    className="text-gray-800 dark:text-white/90 hover:text-gray-500 dark:hover:text-gray-400 hover:underline transition-colors flex items-center gap-1 text-left font-medium cursor-pointer"
                  >
                    {meeting.company}
                    <FiExternalLink className="size-3" />
                  </button>
                ) : (
                  meeting.company
                )
              }
            />
            <InfoCard
              icon={<FiUser className="size-4" />}
              label="Contact person"
              value={meeting.contactPerson}
            />
          </div>
        </div>

        {/* Location & Link Info */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05]">
            Platform / Location
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoCard
              icon={<FiVideo className="size-4" />}
              label="Meeting Platform"
              value={meeting.meetingPlatform || meeting.type}
            />
            <div className="sm:col-span-2">
              <InfoCard
                icon={
                  ["Google Meet", "Zoom", "Microsoft Teams"].includes(meeting.meetingPlatform || meeting.type) ? (
                    <FiLink className="size-4 text-brand-500" />
                  ) : (
                    <FiMapPin className="size-4" />
                  )
                }
                label={
                  ["Google Meet", "Zoom", "Microsoft Teams"].includes(meeting.meetingPlatform || meeting.type)
                    ? "Meeting URL Link"
                    : "Venue / Physical Address"
                }
                value={
                  ["Google Meet", "Zoom", "Microsoft Teams"].includes(meeting.meetingPlatform || meeting.type) ? (
                    <a
                      href={meeting.linkOrLocation}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-800 dark:text-white/90 hover:text-gray-500 dark:hover:text-gray-400 hover:underline transition-colors break-all flex items-center gap-1 font-medium"
                    >
                      {meeting.linkOrLocation}
                      <FiExternalLink className="size-3 shrink-0" />
                    </a>
                  ) : (
                    meeting.linkOrLocation
                  )
                }
              />
            </div>
          </div>
        </div>

        {/* Participants Panel */}
        <div className="sm:col-span-2 rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05]">
            Participants
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <span className="block text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2">
                Meeting owner
              </span>
              <div className="flex flex-wrap gap-1.5">
                {meeting.meetingOwner && meeting.meetingOwner.length > 0 ? (
                  meeting.meetingOwner.map((owner) => (
                    <span
                      key={owner}
                      className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                      {owner}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-400">—</span>
                )}
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2">
                Client contact person
              </span>
              <span className="text-sm font-medium text-gray-800 dark:text-white/95">
                {meeting.clientContactPerson || meeting.contactPerson || "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Status-Wise Summary Section */}
        <div className="sm:col-span-2 rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05] flex items-center gap-2">
            <FiFileText className="size-4 text-brand-500" />
            Status-wise Summary
          </h3>

          <div className="space-y-4">
            {/* Current status summary */}
            {meeting.summary ? (
              <div className={`rounded-xl border p-4 ${
                meeting.status === "Completed"
                  ? "border-success-200 bg-success-50/40 dark:border-success-500/20 dark:bg-success-500/5"
                  : meeting.status === "Cancelled"
                  ? "border-error-200 bg-error-50/40 dark:border-error-500/20 dark:bg-error-500/5"
                  : meeting.status === "Rescheduled"
                  ? "border-blue-200 bg-blue-50/40 dark:border-blue-500/20 dark:bg-blue-500/5"
                  : "border-gray-200 bg-gray-50/40 dark:border-gray-600/20 dark:bg-gray-500/5"
              }`}>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    {meeting.status === "Completed" && <FiCheckCircle className="size-4 text-success-500" />}
                    {meeting.status === "Cancelled" && <FiXCircle className="size-4 text-error-500" />}
                    {meeting.status === "Rescheduled" && <FiRefreshCw className="size-4 text-blue-500" />}
                    {meeting.status === "Scheduled" && <FiCalendar className="size-4 text-gray-400" />}
                    <span className={`text-xs font-semibold ${
                      meeting.status === "Completed"
                        ? "text-success-700 dark:text-success-400"
                        : meeting.status === "Cancelled"
                        ? "text-error-700 dark:text-error-400"
                        : meeting.status === "Rescheduled"
                        ? "text-blue-700 dark:text-blue-400"
                        : "text-gray-500 dark:text-gray-400"
                    }`}>
                      {meeting.status === "Scheduled" ? "Notes / Agenda" : `${meeting.status} Summary`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={openEditSummary}
                      className="p-1 text-gray-400 hover:text-brand-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md transition cursor-pointer"
                      title="Edit summary"
                    >
                      <FiEdit className="size-3.5" />
                    </button>
                    <Badge size="sm" color={getMeetingStatusColor(meeting.status)}>
                      {meeting.status}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                  {meeting.summary}
                </p>
              </div>
            ) : meeting.notes ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50/40 dark:border-gray-600/20 dark:bg-gray-500/5 p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <FiCalendar className="size-4 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Notes</span>
                  </div>
                  <button
                    onClick={openEditSummary}
                    className="p-1 text-gray-400 hover:text-brand-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1"
                    title="Add summary"
                  >
                    <FiEdit className="size-3" />
                    Add Summary
                  </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                  {meeting.notes}
                </p>
              </div>
            ) : null}

            {/* Historical summary entries from activity logs (filter out current summary to avoid duplication) */}
            {(() => {
              const historicalEntries = summaryEntries.filter(
                (entry) => entry.summary !== meeting.summary
              );
              if (historicalEntries.length === 0) return null;
              return (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-100 dark:border-white/[0.05]"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white dark:bg-gray-900 px-3 text-xs text-gray-400 dark:text-gray-500">
                      History
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {historicalEntries.map((entry, idx) => {
                    const isCompleted = entry.action.toLowerCase().includes('completed');
                    const isCancelled = entry.action.toLowerCase().includes('cancelled');
                    
                    let borderColor, bgColor, icon, labelColor;
                    if (isCompleted) {
                      borderColor = 'border-success-200 dark:border-success-500/20';
                      bgColor = 'bg-success-50/30 dark:bg-success-500/[0.04]';
                      icon = <FiCheckCircle className="size-3.5 text-success-500" />;
                      labelColor = 'text-success-700 dark:text-success-400';
                    } else if (isCancelled) {
                      borderColor = 'border-error-200 dark:border-error-500/20';
                      bgColor = 'bg-error-50/30 dark:bg-error-500/[0.04]';
                      icon = <FiXCircle className="size-3.5 text-error-500" />;
                      labelColor = 'text-error-700 dark:text-error-400';
                    } else {
                      borderColor = 'border-blue-200 dark:border-blue-500/20';
                      bgColor = 'bg-blue-50/30 dark:bg-blue-500/[0.04]';
                      icon = <FiRefreshCw className="size-3.5 text-blue-500" />;
                      labelColor = 'text-blue-700 dark:text-blue-400';
                    }

                    return (
                      <div key={idx} className={`rounded-lg border ${borderColor} ${bgColor} p-3.5`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            {icon}
                            <span className={`text-xs font-semibold ${labelColor}`}>
                              {entry.action.replace('Meeting ', '')}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">
                            {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            {' • '}{entry.operator}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                          {entry.summary}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </>
              );
            })()}

            {/* Empty state */}
            {!meeting.summary && !meeting.notes && summaryEntries.length === 0 && (
              <div className="text-center py-6">
                <div className="mb-2 flex justify-center">
                  <FiCalendar className="size-8 text-gray-200 dark:text-gray-700" />
                </div>
                <p className="text-sm text-gray-400 mb-3">No summary recorded yet.</p>
                <button
                  onClick={openEditSummary}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10 px-3 py-1.5 rounded-lg transition cursor-pointer"
                >
                  <FiEdit className="size-3" />
                  Add Summary
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Edit Summary Modal */}
        <Modal
          isOpen={editSummaryModal}
          onClose={() => setEditSummaryModal(false)}
          className="max-w-[500px] m-4"
        >
          <div className="relative w-full rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-8">
            <div className="mb-6 space-y-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-1">
                  {meeting.summary ? "Edit Summary" : "Add Summary"}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Update the meeting summary for <span className="font-semibold text-gray-700 dark:text-gray-300">{meeting.subject}</span>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                  Summary <span className="text-error-500">*</span>
                </label>
                <textarea
                  value={editSummaryText}
                  onChange={(e) => setEditSummaryText(e.target.value)}
                  placeholder="Describe the meeting outcome, decisions made, and next steps..."
                  rows={5}
                  className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
                {!editSummaryText.trim() && (
                  <p className="text-xs text-error-500 mt-1.5">Summary is required</p>
                )}
              </div>

              <div className="rounded-lg bg-gray-50 dark:bg-white/[0.03] p-3.5 border border-gray-100 dark:border-white/[0.05]">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-semibold">Note:</span> Updating the summary will also log this change in the Activity Log.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditSummaryModal(false)}
                className="w-1/2"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEditSummary}
                className="w-1/2"
                disabled={!editSummaryText.trim()}
              >
                {meeting.summary ? "Save Changes" : "Add Summary"}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Workflow Status */}
        {(meeting.rescheduledDate || meeting.completedDate || meeting.cancelledDate) && (
          <div className="sm:col-span-2 rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05]">
              Workflow Status
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Rescheduled Details */}
              {meeting.rescheduledDate && (
                <InfoCard
                  icon={<FiRefreshCw className="size-4 text-blue-500" />}
                  label="Rescheduled To"
                  value={
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">
                      {formatDate(meeting.rescheduledDate)}{meeting.rescheduledTime ? ` at ${formatTime(meeting.rescheduledTime)}` : ""}
                    </span>
                  }
                />
              )}

              {/* Original Meeting Info (shown when rescheduled) */}
              {meeting.rescheduledDate && (
                <InfoCard
                  icon={<FiCalendar className="size-4 text-gray-400" />}
                  label="Originally Scheduled"
                  value={`${formatDate(meeting.date)} at ${formatTime(meeting.time)}`}
                />
              )}

              {/* Completed Date */}
              {meeting.completedDate && (
                <InfoCard
                  icon={<FiCheckCircle className="size-4 text-success-500" />}
                  label="Completed On"
                  value={<span className="text-success-600 dark:text-success-400 font-semibold">{formatDate(meeting.completedDate)}</span>}
                />
              )}

              {/* Cancelled Date */}
              {meeting.cancelledDate && (
                <InfoCard
                  icon={<FiXCircle className="size-4 text-error-500" />}
                  label="Cancelled On"
                  value={<span className="text-error-600 dark:text-error-400 font-semibold">{formatDate(meeting.cancelledDate)}</span>}
                />
              )}
            </div>
          </div>
        )}

        {/* Activity Log */}
        <div className="sm:col-span-2 rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05] flex items-center gap-2">
            <FiActivity className="size-4 text-brand-500" />
            Activity Log
            {activityLogs.length > 0 && (
              <span className="ml-auto text-xs font-normal text-gray-400 dark:text-gray-500">
                {activityLogs.length} event{activityLogs.length !== 1 ? "s" : ""}
              </span>
            )}
          </h3>
          {activityLogs.length > 0 ? (
            <>
            <div className="relative border-l-2 border-gray-100 dark:border-gray-700 ml-4 pl-6 space-y-6">
              {activityLogs.slice(0, activityVisibleCount).map((log) => {
                // Determine color theme per action type
                const actionTheme = (() => {
                  const action = log.action.toLowerCase();
                  if (action.includes("rescheduled")) return { dot: "bg-blue-500", ring: "ring-blue-100 dark:ring-gray-800", text: "text-blue-700 dark:text-blue-400" };
                  if (action.includes("completed")) return { dot: "bg-success-500", ring: "ring-success-100 dark:ring-gray-800", text: "text-success-700 dark:text-success-400" };
                  if (action.includes("cancelled")) return { dot: "bg-error-500", ring: "ring-error-100 dark:ring-gray-800", text: "text-error-700 dark:text-error-400" };
                  if (action.includes("converted")) return { dot: "bg-purple-500", ring: "ring-purple-100 dark:ring-gray-800", text: "text-purple-700 dark:text-purple-400" };
                  return { dot: "bg-brand-500", ring: "ring-brand-100 dark:ring-gray-800", text: "text-brand-700 dark:text-brand-400" };
                })();

                return (
                  <div key={log.id} className="relative group">
                    <span className={`absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full ${actionTheme.dot} ${actionTheme.ring} ring-4`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-white"></span>
                    </span>
                    <div className="transition-all duration-200 group-hover:translate-x-0.5">
                      <span className="text-xs text-gray-400 dark:text-gray-500 block mb-0.5">
                        {new Date(log.timestamp).toLocaleString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        • by {log.operator}
                      </span>
                      <p className={`text-sm font-semibold ${actionTheme.text}`}>
                        {log.action}
                      </p>
                      {log.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                          {log.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load More */}
            {activityVisibleCount < activityLogs.length && (
              <div className="flex items-center justify-center mt-6 pt-4 border-t border-gray-100 dark:border-white/[0.05]">
                <button
                  onClick={() => setActivityVisibleCount((p) => Math.min(p + ACTIVITY_BATCH_SIZE, activityLogs.length))}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 border border-brand-200 dark:border-brand-500/30 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-500/10 transition cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                  Load More ({activityLogs.length - activityVisibleCount} remaining)
                </button>
              </div>
            )}
            </>
          ) : (
            <div className="text-center py-6">
              <div className="mb-2 flex justify-center">
                <FiActivity className="size-8 text-gray-200 dark:text-gray-700" />
              </div>
              <p className="text-sm text-gray-400">No activity recorded yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Convert Lead to Client Modal */}
      <Modal
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        className="max-w-[500px] m-4"
      >
        <div className="relative w-full rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-8">
          <div className="mb-6 space-y-4">
            <div>
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-1">
                Convert Lead to Client
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Setup relationship profile and credit limits for <span className="font-semibold text-gray-850 dark:text-white/80">{matchingLead?.company}</span>.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  Payment Terms
                </label>
                <Select
                  options={[
                    { value: "Net 15", label: "Net 15" },
                    { value: "Net 30", label: "Net 30" },
                    { value: "Net 45", label: "Net 45" },
                    { value: "Immediate", label: "Immediate" }
                  ]}
                  placeholder="Select terms"
                  defaultValue={paymentTerms}
                  onChange={(val) => setPaymentTerms(val)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  Credit Limit (INR)
                </label>
                <Input
                  type="number"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  placeholder="E.g., 500000"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  Relationship Manager
                </label>
                <Select
                  options={[
                    { value: "John Doe", label: "John Doe" },
                    { value: "Jane Smith", label: "Jane Smith" },
                    { value: "Alice Johnson", label: "Alice Johnson" },
                    { value: "Robert Lee", label: "Robert Lee" }
                  ]}
                  placeholder="Select manager"
                  defaultValue={relManager}
                  onChange={(val) => setRelManager(val)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  Account Manager
                </label>
                <Select
                  options={[
                    { value: "John Doe", label: "John Doe" },
                    { value: "Jane Smith", label: "Jane Smith" },
                    { value: "Alice Johnson", label: "Alice Johnson" },
                    { value: "Robert Lee", label: "Robert Lee" }
                  ]}
                  placeholder="Select manager"
                  defaultValue={accManager}
                  onChange={(val) => setAccManager(val)}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowConvertModal(false)}
              className="w-1/2"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConvertLeadConfirm}
              className="w-1/2 bg-success-600 hover:bg-success-700 text-white"
            >
              Convert to Client
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
