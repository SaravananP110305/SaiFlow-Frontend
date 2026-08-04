import { useMemo, useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { formatDate } from "../../../utils/dateFormatter";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";

import Button from "../../../components/ui/button/Button";
import Badge from "../../../components/ui/badge/Badge";
import { Lead } from "../data/leadsData";
import { leadService } from "../../../services/leadService";
import { userService } from "../../../services/userService";
import { useAuth } from "../../../context/AuthContext";
import {
  getStatusLabel,
  getStatusBadgeColor,
  getNextStatuses,
} from "../utils/leadStatus";
import Select from "../../../components/form/Select";
import Input from "../../../components/form/input/InputField";
import { Modal } from "../../../components/ui/modal";
import { useToast } from "../../../hooks/useToast";
import {
  FiBriefcase,
  FiUser,
  FiMail,
  FiPhone,
  FiGlobe,
  FiUserCheck,
  FiCalendar,
  FiEdit,
  FiArrowLeft,
  FiActivity,
  FiXCircle,
  FiHash,
  FiAward,
  FiSmartphone,
  FiSend,
  FiLayers,
  FiPieChart,
  FiHome,
  FiFlag,
  FiMap,
  FiCompass,
  FiNavigation,
  FiShare2,
  FiAlertCircle,
} from "react-icons/fi";

interface InfoCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | React.ReactNode;
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

export default function LeadDetails() {
  const { id } = useParams();
  const navigate = useNavigate();



  const { showToast } = useToast();
  const { hasPermission } = useAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  const loadLeadDetails = async () => {
    try {
      const data = await leadService.getLeadById(Number(id));
      if (data) {
        setLead({
          ...data,
          company: data.company?.name || data.title || "",
          contactPerson: data.contactPerson || "",
          designation: data.designation || "",
          phone: data.phone || "",
          alternatePhone: data.alternatePhone || "",
          email: data.email || "",
          alternateEmail: data.alternateEmail || "",
          website: data.company?.website || "",
          industry: data.company?.industry?.name || "",
          companyType: data.company?.companyType || "",
          address: data.company?.address || "",
          addressLine1: data.company?.address || "",
          country: data.company?.country?.name || "",
          state: data.company?.state?.name || "",
          city: data.company?.city?.name || "",
          pincode: data.company?.pincode || "",
          source: data.source?.name || data.source || "",
          priority: data.priority?.name || data.priority || "Medium",
          assignedTo: data.assignedTo?.name || "Unassigned",
          assignedDate: data.assignedAt ? String(data.assignedAt).split("T")[0] : "",
          notes: data.requirements || "",
          createdAt: data.createdAt?.split("T")[0] || ""
        });
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to load lead details.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeadDetails();
  }, [id]);

  // Activity Timeline pagination
  const TIMELINE_INITIAL_COUNT = 10;
  const TIMELINE_BATCH_SIZE = 10;
  const [timelineVisibleCount, setTimelineVisibleCount] = useState(TIMELINE_INITIAL_COUNT);

  // Reset visible count when lead changes
  const prevLeadIdRef = useRef<number | undefined>(undefined);
  if (prevLeadIdRef.current !== lead?.id) {
    prevLeadIdRef.current = lead?.id;
    if (timelineVisibleCount !== TIMELINE_INITIAL_COUNT) {
      setTimeout(() => setTimelineVisibleCount(TIMELINE_INITIAL_COUNT), 0);
    }
  }

  // Convert Lead Modal state
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [paymentTerms, setPaymentTerms] = useState("Net 30");
  const [creditLimit, setCreditLimit] = useState("");
  const [wonAmount, setWonAmount] = useState("");
  const [relManagerId, setRelManagerId] = useState<number | null>(null);
  const [accManagerId, setAccManagerId] = useState<number | null>(null);
  const [users, setUsers] = useState<any[]>([]);

  // Status change modal state
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState("");
  const [lostReason, setLostReason] = useState("");

  useEffect(() => {
    userService
      .getUsers()
      .then((res) => setUsers(res.data || []))
      .catch(() => {
        setUsers([]);
      });
  }, []);

  const handleStatusChange = async (newStatus: string, reason?: string) => {
    if (!lead) return;
    try {
      await leadService.updateLead(lead.id, {
        status: newStatus,
        ...(reason ? { lostReason: reason } : {}),
      });
      showToast(`Lead moved to ${getStatusLabel(newStatus)}.`, "success");
      setStatusModalOpen(false);
      setLostReason("");
      loadLeadDetails();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to update lead status.", "error");
    }
  };

  const openStatusModal = (status: string) => {
    setNextStatus(status);
    setLostReason("");
    setStatusModalOpen(true);
  };

  const handleConvertLeadConfirm = async () => {
    if (!lead) return;

    try {
      await leadService.convertLead(lead.id, {
        gstPan: lead.gstNumber || "",
        paymentTerms,
        creditLimit: creditLimit !== "" ? Number(creditLimit) : null,
        relationshipManagerId: relManagerId,
        accountManagerId: accManagerId,
        wonAmount: wonAmount !== "" ? Number(wonAmount) : null,
      });

      showToast(`Lead converted to Client successfully!`, "success");
      setShowConvertModal(false);
      navigate(`/clients`);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to convert lead to client.", "error");
    }
  };

  if (loading) {
    return <div className="py-10 text-center text-gray-500">Loading details...</div>;
  }

  if (!lead) {
    return (
      <>
        <PageBreadcrumb pageTitle="Lead Details" />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
            Lead Not Found
          </p>
          <p className="text-sm text-gray-400 mb-6">
            The lead you're looking for does not exist or has been deleted.
          </p>
          <Button size="sm" onClick={() => navigate("/leads")}>
            Back to Lead List
          </Button>
        </div>
      </>
    );
  }

  const describeChanges = (changes: any): string => {
    if (!changes) return "";
    if (Array.isArray(changes)) return changes.join("; ");
    if (typeof changes === "object") return JSON.stringify(changes);
    return String(changes);
  };

  const timelineEvents = useMemo(() => {
    if (!lead) return [];
    const events: {
      id: string;
      type: string;
      title: string;
      description: string;
      timestamp: number;
      icon: React.ReactNode;
      color: string;
    }[] = [];

    const auditLogs = lead.auditLogs || [];

    auditLogs.forEach((log: any) => {
      const action = log.action || "lead_updated";
      const actor = log.user?.name || "the system";

      let title = "Lead Updated";
      let description = describeChanges(log.payload?.changes) || `Lead details updated by ${actor}.`;
      let icon: React.ReactNode = <FiEdit className="size-4" />;
      let color = "bg-orange-500";

      switch (action) {
        case "lead_created":
          title = "Lead Created";
          description = `Lead was created by ${actor}.`;
          icon = <FiActivity className="size-4" />;
          color = "bg-success-500";
          break;
        case "lead_assigned":
          title = "Lead Assigned";
          description = `Assigned to ${log.payload?.assignee || "a new owner"} by ${actor}.`;
          icon = <FiUserCheck className="size-4" />;
          color = "bg-blue-500";
          break;
        case "lead_converted":
          title = "Converted to Client";
          description = `Lead was converted to a client by ${actor}.`;
          icon = <FiAward className="size-4" />;
          color = "bg-success-600";
          break;
        case "lead_deleted":
          title = "Lead Deleted";
          description = `Lead was deleted by ${actor}.`;
          icon = <FiXCircle className="size-4" />;
          color = "bg-error-500";
          break;
        case "lead_imported":
          title = "Bulk Import";
          description = `${log.payload?.imported || 0} lead(s) imported (${log.payload?.skipped || 0} skipped, ${log.payload?.failed || 0} failed).`;
          icon = <FiLayers className="size-4" />;
          color = "bg-brand-500";
          break;
        case "lead_bulk_assigned":
          title = "Bulk Assigned";
          description = `${log.payload?.count || 0} lead(s) assigned to ${log.payload?.assignee || "a new owner"} by ${actor}.`;
          icon = <FiUserCheck className="size-4" />;
          color = "bg-blue-500";
          break;
        default:
          title = "Lead Updated";
          description = describeChanges(log.payload?.changes) || `Lead details updated by ${actor}.`;
          break;
      }

      events.push({
        id: `log-${log.id}`,
        type: action,
        title,
        description,
        timestamp: new Date(log.createdAt).getTime(),
        icon,
        color,
      });
    });

    return events.sort((a, b) => b.timestamp - a.timestamp);
  }, [lead]);

  const paginatedTimeline = timelineEvents.slice(
    0,
    timelineVisibleCount
  );

  return (
    <>
      <PageMeta
        title="Lead Details | SaiFlow"
        description="View detailed information about a lead in SaiFlow CRM."
      />
      <PageBreadcrumb pageTitle="Lead Details" />

      {/* Top action bar */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => navigate("/leads")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-white transition cursor-pointer"
        >
          <FiArrowLeft className="size-4" />
          Back to List
        </button>
        <div className="flex items-center gap-3 flex-wrap">
          {hasPermission("leads", "edit") && lead.status === "QUALIFIED" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/meetings/add?relatedType=Lead&relatedId=${lead.id}`)}
              startIcon={<FiCalendar className="size-4" />}
            >
              Schedule Meeting
            </Button>
          )}
          {hasPermission("leads", "edit") &&
            ["QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON"].includes(lead.status) &&
            (!lead.clients || lead.clients.length === 0) && (
              <Button
                size="sm"
                onClick={() => setShowConvertModal(true)}
                className="bg-success-600 hover:bg-success-700 text-white"
              >
                Convert to Client
              </Button>
            )}
          {hasPermission("leads", "edit") && getNextStatuses(lead.status).length > 0 && (
            <select
              value=""
              onChange={(e) => {
                const s = e.target.value;
                if (!s) return;
                if (s === "LOST" || s === "DISQUALIFIED") {
                  openStatusModal(s);
                } else {
                  handleStatusChange(s);
                }
              }}
              className="h-10 appearance-none rounded-lg border border-gray-200 bg-white px-3.5 pr-8 text-sm text-gray-700 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                backgroundPosition: "right 0.6rem center",
                backgroundSize: "1.1rem",
                backgroundRepeat: "no-repeat",
              }}
            >
              <option value="">Change Status...</option>
              {getNextStatuses(lead.status).map((s) => (
                <option key={s} value={s}>
                  {getStatusLabel(s)}
                </option>
              ))}
            </select>
          )}
          <Button
            size="sm"
            onClick={() => navigate(`/leads/${lead.id}/edit`)}
            startIcon={<FiEdit className="size-4" />}
          >
            Edit Lead
          </Button>
        </div>
      </div>

      {/* Header Card */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-gray-200 bg-white px-6 py-5 mb-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-semibold text-gray-850 dark:text-white/95">
              {lead.company}
            </h2>
            <Badge size="sm" color={getStatusBadgeColor(lead.status)}>
              {getStatusLabel(lead.status)}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
            <span className="font-medium text-gray-700 dark:text-gray-300">{lead.contactPerson}</span>
            <span className="text-gray-300 dark:text-gray-750">•</span>
            <span>{lead.designation || "—"}</span>
          </p>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        {/* Card 1: Lead Information */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05]">
            Lead Information
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoCard
              icon={<FiHash className="size-4" />}
              label="Lead ID"
              value={`SF-LEAD-${String(lead.id).padStart(4, "0")}`}
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
            Contact Details
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
            Company Details
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoCard
              icon={<FiLayers className="size-4" />}
              label="Industry"
              value={lead.industry}
            />
            <InfoCard
              icon={<FiPieChart className="size-4" />}
              label="Company Type"
              value={lead.companyType}
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
            Lead Details
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoCard
              icon={<FiShare2 className="size-4" />}
              label="Lead Source"
              value={lead.source}
            />
            <InfoCard
              icon={<FiAlertCircle className="size-4" />}
              label="Priority"
              value={lead.priority}
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

        {/* Activity Timeline */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-5 pb-3 border-b border-gray-100 dark:border-white/[0.05] flex items-center gap-2">
            <FiActivity className="size-4 text-brand-500" />
            Activity Timeline
          </h3>
          {timelineEvents.length > 0 ? (
            <>
            <div className="pl-1">
              {paginatedTimeline.map((event, idx) => (
                <div key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
                  {/* Timeline dot & line */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${event.color}`}
                    >
                      {event.icon}
                    </div>
                    {idx < timelineEvents.length - 1 && (
                      <div className="mt-1 w-px flex-1 bg-gray-200 dark:bg-gray-700" />
                    )}
                  </div>
                  {/* Content */}
                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                        {event.title}
                      </h4>
                      <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                        {formatDate(event.timestamp)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {event.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Show More / Load More */}
            {timelineVisibleCount < timelineEvents.length && (
              <div className="flex items-center justify-center mt-6 pt-4 border-t border-gray-100 dark:border-white/[0.05]">
                <button
                  onClick={() => setTimelineVisibleCount((p) => Math.min(p + TIMELINE_BATCH_SIZE, timelineEvents.length))}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 border border-brand-200 dark:border-brand-500/30 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-500/10 transition cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                  Load More ({timelineEvents.length - timelineVisibleCount} remaining)
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
                Activities will appear as you manage this lead.
              </p>
            </div>
          )}
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
                  Setup relationship profile and credit limits for <span className="font-semibold text-gray-850 dark:text-white/80">{lead.company}</span>.
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
                    placeholder="Select Terms"
                    defaultValue={paymentTerms}
                    onChange={(val) => setPaymentTerms(val)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                    Credit Limit
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
                    Won Amount
                  </label>
                  <Input
                    type="number"
                    value={wonAmount}
                    onChange={(e) => setWonAmount(e.target.value)}
                    placeholder={lead.budget ? String(lead.budget) : "Deal value"}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                    Relationship Manager
                  </label>
                  <select
                    value={relManagerId ?? ""}
                    onChange={(e) => setRelManagerId(e.target.value ? Number(e.target.value) : null)}
                    className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer"
                  >
                    <option value="">Select Manager</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                    Account Manager
                  </label>
                  <select
                    value={accManagerId ?? ""}
                    onChange={(e) => setAccManagerId(e.target.value ? Number(e.target.value) : null)}
                    className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer"
                  >
                    <option value="">Select Manager</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
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

        {/* Lost / Disqualified Reason Modal */}
        <Modal
          isOpen={statusModalOpen}
          onClose={() => setStatusModalOpen(false)}
          className="max-w-[450px] m-4"
        >
          <div className="relative w-full rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-8">
            <div className="mb-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/10 text-error-600 dark:text-error-400 mb-4">
                <FiXCircle className="size-6" />
              </div>
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">
                Mark as {getStatusLabel(nextStatus)}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Provide a reason for moving this lead to {getStatusLabel(nextStatus)}.
              </p>
            </div>
            <div className="mb-6">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Reason <span className="text-error-500">*</span>
              </label>
              <textarea
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                placeholder="E.g., Chose a competitor, budget constraints..."
                rows={3}
                className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
            <div className="flex items-center justify-center gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatusModalOpen(false)}
                className="w-1/2"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!lostReason.trim()}
                onClick={() => handleStatusChange(nextStatus, lostReason.trim())}
                className="w-1/2 bg-error-600 hover:bg-error-700"
              >
                Confirm
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
}
