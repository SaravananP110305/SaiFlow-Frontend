import { useMemo, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router";
import { formatDate, formatTime } from "../../../utils/dateFormatter";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Badge from "../../../components/ui/badge/Badge";
import { initialLeads, getStatusColor, getPriorityColor, Lead } from "../../LeadManagement/data/leadsData";
import { getStorage, setStorage } from "../../../utils/storage";
import { useToast } from "../../../hooks/useToast";
import { getFollowUpStatusColor } from "../data/contactData";
import {
  FiBriefcase,
  FiUser,
  FiMail,
  FiPhone,
  FiGlobe,
  FiUserCheck,
  FiFileText,
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiCalendar,
  FiMessageSquare,
  FiActivity,
  FiEdit,
  FiHash,
  FiAward,
  FiSmartphone,
  FiSend,
  FiLayers,
  FiHome,
  FiFlag,
  FiMap,
  FiCompass,
  FiNavigation,
  FiShare2,
  FiAlertCircle,
} from "react-icons/fi";

// ──────────────────────────────────────────────
// Activity types & helpers
// ──────────────────────────────────────────────

interface Activity {
  id: string;
  type: "contact_outcome" | "follow_up" | "meeting" | "status_change" | "lead_created";
  title: string;
  description: string;
  timestamp: string;
  icon: React.ReactNode;
  color: string;
}

function getActivitiesForLead(leadId: number, lead: Lead): Activity[] {
  const result: Activity[] = [];

  // 1. Lead created
  if (lead.createdAt) {
    result.push({
      id: `created-${lead.id}`,
      type: "lead_created",
      title: "Lead created",
      description: `Lead was created and assigned to ${lead.assignedTo}.`,
      timestamp: lead.createdAt,
      icon: <FiActivity className="size-4" />,
      color: "bg-brand-500",
    });
  }

  // 2. Parse notes for [Contact] entries
  if (lead.notes) {
    const lines = lead.notes.split("\n");
    let noteIdx = 0;
    for (const line of lines) {
      const contactMatch = line.match(/^\[Contact\]\s+(Interested|Call Later|Not Interested)(?::\s*(.*))?$/);
      if (contactMatch) {
        const outcome = contactMatch[1];
        const summary = contactMatch[2] || "No summary provided.";
        result.push({
          id: `contact-${lead.id}-${noteIdx}`,
          type: "contact_outcome",
          title: outcome === "Interested" ? "Contacted — Interested" : outcome === "Call Later" ? "Contacted — Call Later" : "Contacted — Not Interested",
          description: summary,
          timestamp: "",
          icon:
            outcome === "Interested" ? (
              <FiCheckCircle className="size-4" />
            ) : outcome === "Call Later" ? (
              <FiClock className="size-4" />
            ) : (
              <FiXCircle className="size-4" />
            ),
          color:
            outcome === "Interested"
              ? "bg-success-500"
              : outcome === "Call Later"
                ? "bg-warning-500"
                : "bg-error-500",
        });
      }
      noteIdx++;
    }
  }

  // 3. Follow-ups from saiflow_followups
  const followups = getStorage<any[]>("saiflow_followups", []);
  for (const f of followups.filter((f: any) => f.leadId === leadId)) {
    const statusColor =
      f.status === "Completed" ? "bg-success-500" : f.status === "Missed" ? "bg-error-500" : "bg-warning-500";
    result.push({
      id: `followup-${f.id}`,
      type: "follow_up",
      title: `Follow-up ${f.status}`,
      description: `${f.reason || "No reason provided"} — ${f.date} at ${f.time}`,
      timestamp: `${f.date}T${f.time}`,
      icon: <FiMessageSquare className="size-4" />,
      color: statusColor,
    });
  }

  // 4. Meetings from saiflow_meetings
  const meetings = getStorage<any[]>("saiflow_meetings", []);
  for (const m of meetings.filter((m: any) => m.leadId === leadId)) {
    const statusColor =
      m.status === "Completed" ? "bg-success-500" : m.status === "Cancelled" ? "bg-error-500" : "bg-warning-500";
    result.push({
      id: `meeting-${m.id}`,
      type: "meeting",
      title: `${m.subject || "Meeting"} — ${m.status}`,
      description: `${m.type || "Meeting"} on ${m.date} at ${m.time}${m.notes ? ` — ${m.notes}` : ""}`,
      timestamp: `${m.date}T${m.time}`,
      icon: <FiCalendar className="size-4" />,
      color: statusColor,
    });
  }

  // Sort newest first — push items with no timestamp to the end
  result.sort((a, b) => {
    if (!a.timestamp && !b.timestamp) return 0;
    if (!a.timestamp) return 1;
    if (!b.timestamp) return -1;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return result;
}

// ──────────────────────────────────────────────
// Inline card component
// ──────────────────────────────────────────────

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3.5 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-gray-800">
        <span className="text-gray-500 dark:text-gray-400">{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <span className="block text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</span>
        <span className="block text-sm font-medium text-gray-800 dark:text-white/90 break-words">
          {value || <span className="text-gray-400 font-normal">—</span>}
        </span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Activity item component
// ──────────────────────────────────────────────

function ActivityItem({ activity, isLast }: { activity: Activity; isLast?: boolean }) {
  const formattedDate = activity.timestamp
    ? `${formatDate(activity.timestamp)} at ${formatTime(new Date(activity.timestamp).getHours() + ":" + new Date(activity.timestamp).getMinutes())}`
    : null;

  return (
    <div className="relative flex gap-4 pb-6 last:pb-0">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${activity.color}`}
        >
          {activity.icon}
        </div>
        <div
          className="mt-1 w-px flex-1 bg-gray-200 dark:bg-gray-700"
          style={isLast ? { display: "none" } : undefined}
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pt-1">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
            {activity.title}
          </h4>
          {formattedDate && (
            <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
              {formattedDate}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          {activity.description}
        </p>
      </div>
    </div>
  );
}

interface ContactLeadDetailProps {
  isFollowUpView?: boolean;
}

export default function ContactLeadDetail({ isFollowUpView }: ContactLeadDetailProps = {}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const isFromFollowUps = isFollowUpView || location.pathname.startsWith("/contacts/follow-ups");
  const backTarget = isFromFollowUps ? "/contacts/follow-ups" : "/contacts/my-leads";
  const backLabel = isFromFollowUps ? "Back to follow-ups" : "Back to my leads";

  // Get the currently logged-in user
  const loggedInUser = getStorage<any>("saiflow_logged_in_user", {
    name: "John Doe",
    email: "john.doe@saiflow.com",
    role: "Business Development Executive",
  });
  const currentUserName = loggedInUser?.name || "John Doe";
  const isAdmin = loggedInUser?.role === "Administrator";

  // Activity log pagination
  const ACTIVITY_INITIAL_COUNT = 10;
  const ACTIVITY_BATCH_SIZE = 10;
  const [activityVisibleCount, setActivityVisibleCount] = useState(ACTIVITY_INITIAL_COUNT);
  const prevLeadIdRef = useRef<string | undefined>(undefined);
  if (prevLeadIdRef.current !== id) {
    prevLeadIdRef.current = id;
    if (activityVisibleCount !== ACTIVITY_INITIAL_COUNT) {
      setTimeout(() => setActivityVisibleCount(ACTIVITY_INITIAL_COUNT), 0);
    }
  }

  const [leadsList, setLeadsList] = useState<Lead[]>(() => {
    const allLeads = getStorage<Lead[]>("saiflow_leads", initialLeads);
    if (isAdmin) return allLeads;
    return allLeads.filter((l) => l.assignedTo === currentUserName);
  });
  const lead = leadsList.find((l) => l.id === Number(id));

  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [editedSummary, setEditedSummary] = useState("");

  const handleStartEditSummary = () => {
    if (lead) {
      setEditedSummary(lead.summary || "");
      setIsEditingSummary(true);
    }
  };

  const handleSaveSummary = () => {
    if (!lead) return;
    const updatedLeads = leadsList.map((l) =>
      l.id === lead.id ? { ...l, summary: editedSummary } : l
    );
    setLeadsList(updatedLeads);
    setStorage("saiflow_leads", updatedLeads);
    showToast("Summary updated successfully.", "success");
    setIsEditingSummary(false);
  };

  const activities = useMemo(() => {
    if (!lead) return [];
    // Only show My Lead related activities: contact outcomes & follow-ups
    return getActivitiesForLead(lead.id, lead).filter(
      (a) => a.type === "contact_outcome" || a.type === "follow_up"
    );
  }, [lead]);

  const latestFollowUp = useMemo(() => {
    if (!lead) return null;
    const followups = getStorage<any[]>("saiflow_followups", []);
    const leadFollowups = followups.filter((f: any) => f.leadId === lead.id);
    if (leadFollowups.length === 0) return null;
    return [...leadFollowups].sort((a, b) => {
      const dateTimeA = new Date(`${a.date}T${a.time || "00:00"}`).getTime();
      const dateTimeB = new Date(`${b.date}T${b.time || "00:00"}`).getTime();
      return dateTimeB - dateTimeA;
    })[0];
  }, [lead]);

  if (!lead) {
    return (
      <>
        <PageBreadcrumb pageTitle="Lead details" />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
            Lead not found
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => navigate(backTarget)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-white transition cursor-pointer"
            >
              <FiArrowLeft className="size-4" />
              {backLabel}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title="Lead Details | SaiFlow"
        description="View lead details and activity log in SaiFlow CRM."
      />
      <PageBreadcrumb pageTitle="Lead details" />

      {/* Top action bar */}
      <div className="mb-5">
        <button
          onClick={() => navigate(backTarget)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-white transition cursor-pointer"
        >
          <FiArrowLeft className="size-4" />
          {backLabel}
        </button>
      </div>

      {/* Header Card */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-gray-200 bg-white px-6 py-5 mb-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            {lead.leadTitle || `${lead.company} Expansion`}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
            <span className="font-medium text-gray-700 dark:text-gray-300">{lead.company}</span>
            <span className="text-gray-300 dark:text-gray-750">•</span>
            <span>{lead.contactPerson}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center rounded-lg bg-gray-100 dark:bg-white/[0.05] px-3 py-1.5 text-xs font-mono tracking-wider text-gray-600 dark:text-gray-400">
            SF-LEAD-{String(lead.id).padStart(4, "0")}
          </span>
          <Badge size="md" color={getStatusColor(lead.status)}>
            {lead.status}
          </Badge>
          <Badge size="md" color={getPriorityColor(lead.priority)}>
            {lead.priority || "Medium"} Priority
          </Badge>
        </div>
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Card 1: Lead Information */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05]">
            Lead information
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoCard
              icon={<FiHash className="size-4" />}
              label="Lead ID"
              value={`SF-LEAD-${String(lead.id).padStart(4, "0")}`}
            />
            <InfoCard
              icon={<FiFileText className="size-4" />}
              label="Lead Title"
              value={lead.leadTitle || `${lead.company} Expansion`}
            />
            <InfoCard
              icon={<FiBriefcase className="size-4" />}
              label="Company Name"
              value={lead.company}
            />
            <InfoCard
              icon={<FiUser className="size-4" />}
              label="Contact Person"
              value={lead.contactPerson}
            />
            <InfoCard
              icon={<FiAward className="size-4" />}
              label="Designation"
              value={lead.designation}
            />
          </div>
        </div>

        {/* Card 2: Contact Details */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05]">
            Contact details
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoCard
              icon={<FiPhone className="size-4" />}
              label="Mobile Number"
              value={lead.phone}
            />
            <InfoCard
              icon={<FiSmartphone className="size-4" />}
              label="Alternate Mobile"
              value={lead.alternatePhone}
            />
            <InfoCard
              icon={<FiMail className="size-4" />}
              label="Email Address"
              value={
                lead.email ? (
                  <a href={`mailto:${lead.email}`} className="text-gray-800 dark:text-white/90 hover:text-gray-500 dark:hover:text-gray-400 hover:underline transition-colors">
                    {lead.email}
                  </a>
                ) : ""
              }
            />
            <InfoCard
              icon={<FiSend className="size-4" />}
              label="Alternate Email"
              value={
                lead.alternateEmail ? (
                  <a href={`mailto:${lead.alternateEmail}`} className="text-gray-800 dark:text-white/90 hover:text-gray-500 dark:hover:text-gray-400 hover:underline transition-colors">
                    {lead.alternateEmail}
                  </a>
                ) : ""
              }
            />
            <InfoCard
              icon={<FiGlobe className="size-4" />}
              label="Website"
              value={
                lead.website ? (
                  <a
                    href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-800 dark:text-white/90 hover:text-gray-500 dark:hover:text-gray-400 hover:underline transition-colors"
                  >
                    {lead.website}
                  </a>
                ) : ""
              }
            />
          </div>
        </div>

        {/* Card 3: Company Details */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05]">
            Company details
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoCard
              icon={<FiLayers className="size-4" />}
              label="Industry"
              value={lead.industry}
            />
            <InfoCard
              icon={<FiFileText className="size-4" />}
              label="GST Number"
              value={lead.gstNumber}
            />
          </div>
        </div>

        {/* Card 4: Address */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05]">
            Address
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <InfoCard
                icon={<FiHome className="size-4" />}
                label="Address Line 1"
                value={lead.addressLine1 || lead.address}
              />
            </div>
            <InfoCard
              icon={<FiFlag className="size-4" />}
              label="Country"
              value={lead.country}
            />
            <InfoCard
              icon={<FiMap className="size-4" />}
              label="State"
              value={lead.state}
            />
            <InfoCard
              icon={<FiCompass className="size-4" />}
              label="City"
              value={lead.city}
            />
            <InfoCard
              icon={<FiNavigation className="size-4" />}
              label="Pincode"
              value={lead.pincode}
            />
          </div>
        </div>

        {/* Card 5: Lead Details */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05]">
            Lead details
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoCard
              icon={<FiShare2 className="size-4" />}
              label="Lead Source"
              value={lead.source}
            />
            <InfoCard
              icon={<FiAlertCircle className="size-4" />}
              label="Lead Status"
              value={
                <Badge size="sm" color={getStatusColor(lead.status)}>
                  {lead.status}
                </Badge>
              }
            />
            <InfoCard
              icon={<FiFlag className="size-4" />}
              label="Priority"
              value={
                <Badge size="sm" color={getPriorityColor(lead.priority)}>
                  {lead.priority || "Medium"}
                </Badge>
              }
            />
          </div>
        </div>

        {/* Card 6: Assignment */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05]">
            Assignment
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoCard
              icon={<FiUserCheck className="size-4" />}
              label="Lead Owner"
              value={lead.assignedTo}
            />
            <InfoCard
              icon={<FiCalendar className="size-4" />}
              label="Assigned Date"
              value={formatDate(lead.assignedDate)}
            />
          </div>
        </div>

        {/* Card 7: Follow-up Details */}
        {latestFollowUp && (
          <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05]">
              Follow-up details
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InfoCard
                icon={<FiCalendar className="size-4" />}
                label="Follow-up Date & Time"
                value={`${formatDate(latestFollowUp.date)} at ${formatTime(latestFollowUp.time)}`}
              />
              <InfoCard
                icon={<FiClock className="size-4" />}
                label="Status"
                value={
                  <Badge size="sm" color={getFollowUpStatusColor(latestFollowUp.status)}>
                    {latestFollowUp.status}
                  </Badge>
                }
              />
              <div className="sm:col-span-2">
                <InfoCard
                  icon={<FiMessageSquare className="size-4" />}
                  label="Reason"
                  value={latestFollowUp.reason || "No reason provided"}
                />
              </div>
            </div>
          </div>
        )}

        {/* Card 8: Summary Details */}
        {lead.summary !== undefined && lead.summary !== null && (
          <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-5">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05]">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Summary details
              </h3>
              {!isEditingSummary && (
                <button
                  onClick={handleStartEditSummary}
                  className="text-gray-400 hover:text-brand-500 dark:text-gray-500 dark:hover:text-brand-400 transition cursor-pointer"
                  title="Edit summary"
                >
                  <FiEdit className="size-4" />
                </button>
              )}
            </div>
            {isEditingSummary ? (
              <div className="space-y-3">
                <textarea
                  value={editedSummary}
                  onChange={(e) => setEditedSummary(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setIsEditingSummary(false)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveSummary}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div 
                className="max-h-[150px] overflow-y-auto pr-2 custom-visible-scrollbar"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(156, 163, 175, 0.5) transparent'
                }}
              >
                <style>{`
                  .custom-visible-scrollbar::-webkit-scrollbar {
                    width: 5px;
                  }
                  .custom-visible-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                  }
                  .custom-visible-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(156, 163, 175, 0.5);
                    border-radius: 4px;
                  }
                  .custom-visible-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(156, 163, 175, 0.8);
                  }
                `}</style>
                <p className="text-sm text-gray-800 dark:text-white/90 leading-relaxed whitespace-pre-wrap">
                  {lead.summary}
                </p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Activity Log */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-5 pb-2 border-b border-gray-100 dark:border-white/[0.05] flex items-center gap-2">
          <FiActivity className="size-4" />
          Activity log
        </h3>

        {activities.length > 0 ? (
          <>
            <div className="pl-1">
              {activities.slice(0, activityVisibleCount).map((activity, idx) => {
                const isLastInFull = idx === activities.length - 1;
                const isLastVisible = idx === activityVisibleCount - 1;
                const isLast = activityVisibleCount >= activities.length ? isLastInFull : isLastVisible;
                return (
                  <ActivityItem
                    key={activity.id}
                    activity={activity}
                    isLast={isLast}
                  />
                );
              })}
            </div>

            {/* Load More */}
            {activityVisibleCount < activities.length && (
              <div className="flex items-center justify-center mt-6 pt-4 border-t border-gray-100 dark:border-white/[0.05]">
                <button
                  onClick={() => setActivityVisibleCount((p) => Math.min(p + ACTIVITY_BATCH_SIZE, activities.length))}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 border border-brand-200 dark:border-brand-500/30 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-500/10 transition cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                  Load More ({activities.length - activityVisibleCount} remaining)
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <FiActivity className="size-8 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No activities recorded yet.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Activities will appear here when you contact this lead from the My Leads page.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
