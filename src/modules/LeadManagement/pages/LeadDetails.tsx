import { useMemo, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { formatDate } from "../../../utils/dateFormatter";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";

import Button from "../../../components/ui/button/Button";
import { initialLeads, Lead } from "../data/leadsData";
import { getStorage, setStorage } from "../../../utils/storage";
import { Client, initialClients } from "../../ClientManagement/data/clientsData";
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
  const leads = getStorage<Lead[]>("saiflow_leads", initialLeads);
  const lead = leads.find((l) => l.id === Number(id));

  // Activity Timeline pagination
  const TIMELINE_INITIAL_COUNT = 10;
  const TIMELINE_BATCH_SIZE = 10;
  const [timelineVisibleCount, setTimelineVisibleCount] = useState(TIMELINE_INITIAL_COUNT);

  // Reset visible count when lead changes
  const prevLeadIdRef = useRef<number | undefined>(undefined);
  if (prevLeadIdRef.current !== lead?.id) {
    prevLeadIdRef.current = lead?.id;
    if (timelineVisibleCount !== TIMELINE_INITIAL_COUNT) {
      // Will be set in next render, use setTimeout to avoid render-time setState
      setTimeout(() => setTimelineVisibleCount(TIMELINE_INITIAL_COUNT), 0);
    }
  }

  // Convert Lead Modal state
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [paymentTerms, setPaymentTerms] = useState("Net 30");
  const [creditLimit, setCreditLimit] = useState("500000");
  const [relManager, setRelManager] = useState("John Doe");
  const [accManager, setAccManager] = useState("Jane Smith");

  const handleConvertLeadConfirm = () => {
    if (!lead) return;

    const clientsList = getStorage<Client[]>("saiflow_clients", initialClients);
    const exists = clientsList.some((c) => c.company.toLowerCase() === lead.company.toLowerCase());
    if (exists) {
      showToast(`A client with company name "${lead.company}" already exists.`, "error");
      setShowConvertModal(false);
      return;
    }

    const newClientId = clientsList.length > 0 ? Math.max(...clientsList.map((c) => c.id)) + 1 : 1;
    const newClient: Client = {
      id: newClientId,
      company: lead.company,
      name: lead.contactPerson,
      email: lead.email,
      phone: lead.phone,
      projectsCount: 0,
      status: "Active",
      industry: lead.industry,
      gstNumber: lead.gstNumber || "",
      panNumber: "",
      website: lead.website || "",
      companyEmail: lead.email,
      companyPhone: lead.phone,
      address: lead.addressLine1 || lead.address || "",
      city: lead.city || "",
      state: lead.state || "",
      country: lead.country || "India",
      pincode: lead.pincode || "",
      contactName: lead.contactPerson,
      designation: lead.designation || "",
      mobile: lead.phone,
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

    // Update original Lead status to "Won" in storage
    const updatedLeads = leads.map((l) =>
      l.id === lead.id ? { ...l, status: "Won" as const } : l
    );
    setStorage("saiflow_leads", updatedLeads);

    showToast(`Lead converted to Client ${lead.company} successfully!`, "success");
    setShowConvertModal(false);
    navigate(`/clients/${newClientId}`);
  };
  if (!lead) {
    return (
      <>
        <PageBreadcrumb pageTitle="Lead details" />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
            Lead not found
          </p>
          <p className="text-sm text-gray-400 mb-6">
            The lead you're looking for does not exist or has been deleted.
          </p>
          <Button size="sm" onClick={() => navigate("/leads")}>
            Back to lead list
          </Button>
        </div>
      </>
    );
  }

  interface LeadLogEntry {
    id: string;
    leadId: number;
    action: "lead_created" | "lead_updated" | "lead_deleted" | "lead_assigned" | "lead_reassigned";
    description: string;
    timestamp: string;
    operator?: string;
  }

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

    // 1. Lead Created from lead data
    if (lead.createdAt) {
      events.push({
        id: `created-${lead.id}`,
        type: "lead_created",
        title: "Lead created",
        description: `Lead for ${lead.company} was created by ${lead.assignedTo || "the system"}.`,
        timestamp: new Date(lead.createdAt).getTime(),
        icon: <FiActivity className="size-4" />,
        color: "bg-brand-500",
      });
    }

    // 2. Lead Assigned from lead data
    if (lead.assignedTo) {
      const assignedTs = lead.assignedDate
        ? new Date(lead.assignedDate).getTime()
        : new Date(lead.createdAt).getTime() + 1000;
      events.push({
        id: `assigned-${lead.id}`,
        type: "lead_assigned",
        title: "Lead assigned",
        description: `Lead assigned to ${lead.assignedTo}.`,
        timestamp: assignedTs,
        icon: <FiUserCheck className="size-4" />,
        color: "bg-blue-500",
      });
    }

    // 3. Lead activity logs from saiflow_lead_logs
    const leadLogs = getStorage<LeadLogEntry[]>("saiflow_lead_logs", []);
    const relatedLogs = leadLogs.filter((log) => log.leadId === lead.id);
    relatedLogs.forEach((log) => {
      let icon: React.ReactNode = <FiEdit className="size-4" />;
      let color = "bg-warning-500";

      switch (log.action) {
        case "lead_created":
          icon = <FiActivity className="size-4" />;
          color = "bg-success-500";
          break;
        case "lead_updated":
          icon = <FiEdit className="size-4" />;
          color = "bg-orange-500";
          break;
        case "lead_deleted":
          icon = <FiXCircle className="size-4" />;
          color = "bg-error-500";
          break;
        case "lead_assigned":
        case "lead_reassigned":
          icon = <FiUserCheck className="size-4" />;
          color = "bg-blue-500";
          break;
      }

      events.push({
        id: log.id,
        type: log.action,
        title:
          log.action === "lead_created"
            ? "Lead created"
            : log.action === "lead_updated"
            ? "Lead updated"
            : log.action === "lead_deleted"
            ? "Lead deleted"
            : log.action === "lead_reassigned"
            ? "Lead reassigned"
            : "Lead assigned",
        description: log.description,
        timestamp: new Date(log.timestamp).getTime(),
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
      <PageBreadcrumb pageTitle="Lead details" />

      {/* Top action bar */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => navigate("/leads")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-white transition cursor-pointer"
        >
          <FiArrowLeft className="size-4" />
          Back to list
        </button>
        <div className="flex items-center gap-3">
          {lead.status === "Qualified" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/meetings/add?relatedType=Lead&relatedId=${lead.id}`)}
              startIcon={<FiCalendar className="size-4" />}
            >
              Schedule meeting
            </Button>
          )}
          {lead.status === "Won" && (
            <Button
              size="sm"
              onClick={() => setShowConvertModal(true)}
              className="bg-success-600 hover:bg-success-700 text-white"
            >
              Convert to Client
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => navigate(`/leads/${lead.id}/edit`)}
            startIcon={<FiEdit className="size-4" />}
          >
            Edit lead
          </Button>
        </div>
      </div>

      {/* Header Card */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-gray-200 bg-white px-6 py-5 mb-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div>
          <h2 className="text-xl font-semibold text-gray-850 dark:text-white/95">
            {lead.company}
          </h2>
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
            Lead information
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
      </div>
    </>
  );
}
