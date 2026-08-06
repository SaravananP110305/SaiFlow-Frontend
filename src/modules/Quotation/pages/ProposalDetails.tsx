import { useState, useEffect } from "react";
import { useParams } from "react-router";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import { proposalService } from "../../../services/proposalService";
import Badge from "../../../components/ui/badge/Badge";
import { formatDate as centFormatDate, formatTime as centFormatTime } from "../../../utils/dateFormatter";
import {
  FiCheckCircle,
  FiXCircle,
  FiFileText,
  FiSend,
  FiClock,
  FiRefreshCw,
  FiTrendingUp,
  FiCalendar,
  FiList,
  FiCreditCard,
  FiInfo,
  FiUser,
  FiActivity,
  FiArrowRight,
} from "react-icons/fi";
import { useToast } from "../../../hooks/useToast";
import {
  Proposal,
  ProposalStatus,
  mapPhaseFromApi,
} from "../data/quotationsData";

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

// ─── Helpers ────────────────────────────────────────────────────────────────

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

export default function ProposalDetails() {
  const { id } = useParams();
  const { showToast } = useToast();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDetailTab, setActiveDetailTab] = useState<"requirement" | "phases" | "quotation" | "workflow">("requirement");

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await proposalService.getProposalById(Number(id));
        if (data) {
          const mapped: Proposal = {
            id: data.id,
            proposalNo: data.proposalNumber,
            companyName: data.lead?.company?.name || data.lead?.title || "Unknown Company",
            leadName: data.lead?.contactPerson || "Unknown Contact",
            leadEmail: data.lead?.email || "",
            leadPhone: data.lead?.phone || "",
            value: Number(data.amount),
            status: data.status,
            requirement: data.requirements || {
              overview: data.lead?.requirements || "",
              objectives: [],
              technicalRequirements: [],
              deliverables: [],
              assumptions: [],
              constraints: []
            },
            estimation: data.estimation || {
              items: [],
              subtotal: Number(data.amount),
              discountPercent: 0,
              discountAmount: 0,
              taxPercent: 18,
              taxAmount: 0,
              total: Number(data.amount)
            },
            quotation: data.quotation || {
              paymentTerms: "",
              validityDays: data.validUntil ? Math.ceil((new Date(data.validUntil).getTime() - new Date(data.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 30,
              deliveryTimeline: "",
              warrantyPeriod: "",
              paymentMilestones: [],
              notes: data.title || "",
              termsAndConditions: ""
            },
            phases: (data.phases || []).map((ph) => mapPhaseFromApi(ph)),
            pricing: data.pricing || undefined,
            createdAt: data.createdAt || "",
            updatedAt: data.updatedAt || "",
            workflowLogs: []
          };
          setProposal(mapped);
        }
      } catch (err) {
        console.error(err);
        showToast("Failed to fetch proposal details.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  if (loading) {
    return <div className="py-10 text-center text-gray-500">Loading proposal details...</div>;
  }

  if (!proposal) {
    return <div className="py-10 text-center text-gray-500">Proposal not found.</div>;
  }

  const status = STATUS_CONFIG[proposal.status];

  const tabs = [
    { key: "requirement" as const, label: "Requirement", icon: <FiList className="size-4" /> },
    { key: "phases" as const, label: "Phases & Pricing", icon: <FiCreditCard className="size-4" /> },
    { key: "quotation" as const, label: "Quotation", icon: <FiFileText className="size-4" /> },
    { key: "workflow" as const, label: "Workflow", icon: <FiActivity className="size-4" /> },
  ];

  return (
    <>
      <PageMeta title="Proposal Details | SaiFlow" description="View requirements, estimation, and terms for this business proposal." />
      <PageBreadcrumb pageTitle="Proposal Details" customName="Proposal Details" />

      <div className="space-y-5">
        {/* Proposal Header Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">{proposal.proposalNo}</h2>
                <Badge size="sm" color={status.color}>
                  <span className="flex items-center gap-1">{status.icon}{status.label}</span>
                </Badge>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {proposal.companyName} &middot; {proposal.leadName} &middot; {proposal.leadEmail}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1"><FiCalendar className="size-3.5" /> Created {formatDate(proposal.createdAt)}</span>
              <span className="flex items-center gap-1"><FiRefreshCw className="size-3.5" /> Updated {getTimeAgo(proposal.updatedAt)}</span>
            </div>
          </div>

          {/* Workflow Steps */}
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-white/[0.05]">
            <div className="flex items-center gap-0 overflow-x-auto pb-1">
              {WORKFLOW_STEPS.map((step, idx) => {
                const stepIdx = WORKFLOW_STEPS.indexOf(proposal.status);
                const rejected = proposal.status === "Rejected";
                const converted = proposal.status === "Converted";
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
              {proposal.status === "Converted" && (
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
          {activeDetailTab === "requirement" && renderRequirementTab(proposal)}
          {activeDetailTab === "phases" && renderPhasesTab(proposal)}
          {activeDetailTab === "quotation" && renderQuotationTab(proposal)}
          {activeDetailTab === "workflow" && renderWorkflowTab(proposal)}
        </div>
      </div>
    </>
  );
}

// ─── Sub-rendering methods ───────────────────────────────────────────────────

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

const renderPhasesTab = (proposal: Proposal) => {
  const phases = proposal.phases || [];
  const pricing = proposal.pricing;

  // Fall back to the legacy single-table estimation for old proposals
  if (phases.length === 0) {
    const est = proposal.estimation;
    return (
      <div className="p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/[0.05]">
                <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase">Category</th>
                <th className="text-left py-3 px-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase">Description</th>
                <th className="text-right py-3 px-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase">Qty</th>
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
                  <td className="py-3 px-3 text-right text-gray-500 dark:text-gray-400 text-xs">{item.quantity ?? 1}</td>
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
  }

  const subtotal = pricing?.subtotal ?? proposal.estimation.subtotal;
  const discountPercent = pricing?.discountPercent ?? proposal.estimation.discountPercent;
  const discountAmount = pricing?.discountAmount ?? proposal.estimation.discountAmount;
  const taxPercent = pricing?.taxPercent ?? proposal.estimation.taxPercent;
  const taxAmount = pricing?.taxAmount ?? proposal.estimation.taxAmount;
  const total = pricing?.grandTotal ?? proposal.estimation.total;

  return (
    <div className="p-5 space-y-6">
      {phases.map((phase, idx) => (
        <div key={phase.id ?? idx} className="border border-gray-100 dark:border-white/[0.05] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gray-50 dark:bg-white/[0.03] border-b border-gray-100 dark:border-white/[0.05]">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white">
              Phase {idx + 1} - {phase.phaseName || "Untitled Phase"}
            </h3>
            <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">{formatCurrency(phase.subtotal)}</span>
          </div>
          <div className="p-4 space-y-5">
            {phase.overview && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1.5">Overview</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{phase.overview}</p>
              </div>
            )}

            <PhaseSectionBlock title="Objectives" items={phase.objectives} />
            <PhaseSectionBlock title="Technical Requirements" items={phase.technicalRequirements} />
            <PhaseSectionBlock title="Deliverables" items={phase.deliverables} />
            <PhaseSectionBlock title="Assumptions" items={phase.assumptions} />
            <PhaseSectionBlock title="Constraints" items={phase.constraints} />

            {phase.estimatedTimeline && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1.5">Estimated Timeline</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{phase.estimatedTimeline}</p>
              </div>
            )}

            {phase.lineItems.length > 0 && (
              <div className="overflow-x-auto border border-gray-100 dark:border-white/[0.05] rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-white/[0.05]">
                      <th className="text-left py-2.5 px-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase">Category</th>
                      <th className="text-left py-2.5 px-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase">Description</th>
                      <th className="text-right py-2.5 px-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase">Qty</th>
                      <th className="text-right py-2.5 px-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase">Unit Price</th>
                      <th className="text-right py-2.5 px-3 font-medium text-gray-500 dark:text-gray-400 text-xs uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-white/[0.03]">
                    {phase.lineItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3">
                          <Badge size="sm" color="primary">{item.category}</Badge>
                        </td>
                        <td className="py-2.5 px-3 text-gray-700 dark:text-gray-300">{item.description}</td>
                        <td className="py-2.5 px-3 text-right text-gray-500 dark:text-gray-400 text-xs">{item.quantity ?? 1}</td>
                        <td className="py-2.5 px-3 text-right text-gray-700 dark:text-gray-300">{formatCurrency(item.unitPrice)}</td>
                        <td className="py-2.5 px-3 text-right font-medium text-gray-800 dark:text-white">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-100 dark:border-white/[0.05]">
                      <td colSpan={4} className="py-2.5 px-3 text-right text-sm text-gray-500 dark:text-gray-400">Phase Total</td>
                      <td className="py-2.5 px-3 text-right text-sm font-semibold text-brand-600 dark:text-brand-400">{formatCurrency(phase.subtotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Overall Pricing Summary */}
      <div className="p-4 rounded-lg border border-brand-200 dark:border-brand-500/20 bg-brand-50/50 dark:bg-brand-500/[0.05]">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3">Overall Pricing Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
            <span>Subtotal (all phases)</span>
            <span className="font-semibold text-gray-800 dark:text-white">{formatCurrency(subtotal)}</span>
          </div>
          {discountPercent > 0 && (
            <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
              <span>Discount ({discountPercent}%)</span>
              <span className="font-semibold text-red-500">-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
            <span>Tax ({taxPercent}%)</span>
            <span className="font-semibold text-gray-800 dark:text-white">{formatCurrency(taxAmount)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-brand-100 dark:border-brand-500/10 pt-3">
            <span className="font-semibold text-gray-800 dark:text-white">Grand Total</span>
            <span className="text-lg font-bold text-brand-600 dark:text-brand-400">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

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

const renderWorkflowTab = (proposal: Proposal) => (
  <div className="p-5">
    <div className="relative pl-8 space-y-4">
      {[...proposal.workflowLogs].reverse().map((log) => (
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
      {proposal.workflowLogs.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">No workflow activity recorded.</p>
      )}
    </div>
  </div>
);

// ─── Shared UI Sub-components ─────────────────────────────────────────────────

function PhaseSectionBlock({ title, items }: { title: string; items: string[] }) {
  const filtered = items.filter((i) => i.trim());
  if (filtered.length === 0) return null;
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1.5">{title}</h4>
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
