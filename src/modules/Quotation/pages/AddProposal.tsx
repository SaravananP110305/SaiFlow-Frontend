import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import Select from "../../../components/form/Select";
import { useToast } from "../../../hooks/useToast";
import {
  ProposalStatus,
  RequirementSection,
  EstimationLineItem,
  QuotationSection,
  ProposalPhase,
  PricingSummary,
  mapPhaseFromApi,
} from "../data/quotationsData";
import { Lead } from "../../LeadManagement/data/leadsData";
import { proposalService } from "../../../services/proposalService";
import { leadService } from "../../../services/leadService";
import { masterService } from "../../../services/masterService";
import { meetingService } from "../../../services/meetingService";
import { clientService } from "../../../services/clientService";
import {
  FiPlus, FiTrash2, FiXCircle, FiUser, FiList, FiCreditCard, FiFileText, FiCpu,
  FiChevronDown, FiChevronRight, FiArrowUp, FiArrowDown, FiEdit, FiLayers,
} from "react-icons/fi";

// ─── Constants ──────────────────────────────────────────────────────────────



// ─── Helpers ────────────────────────────────────────────────────────────────

const validateEmail = (email: string) => {
  if (!email.trim()) return "Email is required.";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return "Please enter a valid email address.";
  return "";
};

const validatePhone = (phone: string) => {
  if (!phone.trim()) return "Phone number is required.";
  const phoneRegex = /^(?:\+91|91)?[6-9]\d{9}$/;
  const cleanPhone = phone.replace(/[\s\-()]/g, "");
  if (!phoneRegex.test(cleanPhone)) return "Please enter a valid 10-digit Indian phone number.";
  return "";
};

function formatCurrency(amount: number): string {
  return "₹" + amount.toLocaleString("en-IN");
}

// ─── Empty Templates ────────────────────────────────────────────────────────

const EMPTY_REQUIREMENT: RequirementSection = {
  overview: "",
  objectives: [""],
  technicalRequirements: [""],
  deliverables: [""],
  assumptions: [""],
  constraints: [""],
  techStack: [],
};

const EMPTY_ESTIMATION_ITEM: EstimationLineItem = {
  id: "", category: "", description: "", unit: "Project", unitPrice: 0, quantity: 1, amount: 0,
};

const EMPTY_PHASE: ProposalPhase = {
  phaseName: "Phase 1",
  overview: "",
  objectives: [""],
  technicalRequirements: [""],
  deliverables: [""],
  assumptions: [""],
  constraints: [""],
  lineItems: [],
  subtotal: 0,
  estimatedTimeline: "",
};

const PHASE_LIST_FIELDS = [
  "objectives",
  "technicalRequirements",
  "deliverables",
  "assumptions",
  "constraints",
] as const;

const newPhaseItem = (): EstimationLineItem => ({
  ...EMPTY_ESTIMATION_ITEM,
  id: `pli-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  amount: 0,
});

const newEmptyPhase = (num: number): ProposalPhase => ({
  ...EMPTY_PHASE,
  phaseName: `Phase ${num}`,
  lineItems: [newPhaseItem()],
});

// ─── Component ──────────────────────────────────────────────────────────────

export default function AddProposal() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const urlClientId = searchParams.get("clientId");
  const [associationType, setAssociationType] = useState<"lead" | "client">("lead");

  // ── Backend API states ──────────────────────────────────────
  const [serviceOptions, setServiceOptions] = useState<{ value: string; label: string }[]>([]);
  const [paymentTypeOptions, setPaymentTypeOptions] = useState<{ value: string; label: string }[]>([]);
  const [techStackOptions, setTechStackOptions] = useState<{ value: string; label: string }[]>([]);
  const [leadsList, setLeadsList] = useState<{ value: string; label: string }[]>([]);
  const [rawLeads, setRawLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [clientsList, setClientsList] = useState<{ value: string; label: string }[]>([]);
  const [rawClients, setRawClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        // Values are stored as names (not IDs) and edit-mode defaults are
        // hardcoded, so fetching only ACTIVE records here is safe and keeps
        // the dropdowns consistent with the rest of the application.
        const [servicesData, paymentTypesData, techStackData, leadsData, meetingsData, clientsData] = await Promise.all([
          masterService.getMasterItems("SERVICE", undefined, { status: "Active" }),
          masterService.getMasterItems("PAYMENT_TYPE", undefined, { status: "Active" }),
          masterService.getMasterItems("TECH_STACK", undefined, { status: "Active" }),
          leadService.getLeads({ limit: 1000 }),
          meetingService.getMeetings({ status: "COMPLETED", limit: 1000 }),
          clientService.getClients({ limit: 1000 })
        ]);
        
        setServiceOptions(servicesData.map((x: any) => ({ value: x.name, label: x.name })));
        setPaymentTypeOptions(paymentTypesData.map((x: any) => ({ value: x.name, label: x.name })));
        setTechStackOptions(techStackData.map((x: any) => ({ value: x.name, label: x.name })));
        if (leadsData && Array.isArray(leadsData.data)) {
          const allMappedLeads = leadsData.data.map((l: any) => ({
            ...l,
            company: l.title || l.company || "",
            contactPerson: l.contactPerson || ""
          }));
          setRawLeads(allMappedLeads);

          const completedLeadIds = new Set(
            meetingsData && Array.isArray(meetingsData.data)
              ? meetingsData.data.map((m: any) => m.leadId)
              : []
          );
          const filtered = allMappedLeads.filter((l: any) => completedLeadIds.has(l.id));
          setLeadsList(filtered.map((l: any) => ({ value: l.id.toString(), label: `${l.contactPerson} (${l.company})` })));
        }
        if (clientsData && Array.isArray(clientsData.data)) {
          setRawClients(clientsData.data);
          setClientsList(clientsData.data.map((c: any) => ({
            value: c.id.toString(),
            label: `${c.lead?.contactPerson || c.name || "Main contact"} (${c.company?.name || c.company || "Client"})`
          })));
        }
      } catch (err) {
        console.error("Failed to load drop-down lists", err);
      }
    };
    loadDropdownData();
  }, []);

  // Auto-select and pre-fill client details if urlClientId is present
  useEffect(() => {
    if (urlClientId && rawClients.length > 0) {
      setAssociationType("client");
      handleClientSelect(urlClientId);
    }
  }, [urlClientId, rawClients]);

  const [formTechStack, setFormTechStack] = useState<string[]>([]);

  const handleAddTechStack = (val: string) => {
    if (val && !formTechStack.includes(val)) {
      setFormTechStack([...formTechStack, val]);
    }
  };

  const handleRemoveTechStack = (tech: string) => {
    setFormTechStack(formTechStack.filter(t => t !== tech));
  };

  // ── Form State ─────────────────────────────────────────────────────────────
  const [formLeadName, setFormLeadName] = useState("");
  const [formCompanyName, setFormCompanyName] = useState("");
  const [formLeadEmail, setFormLeadEmail] = useState("");
  const [formLeadPhone, setFormLeadPhone] = useState("");
  const [formStatus, setFormStatus] = useState<ProposalStatus>("Draft");
  
  // Inline validation errors for required fields
  const [formLeadNameError, setFormLeadNameError] = useState("");
  const [formCompanyNameError, setFormCompanyNameError] = useState("");
  const [formLeadEmailError, setFormLeadEmailError] = useState("");
  const [formLeadPhoneError, setFormLeadPhoneError] = useState("");

  const handleLeadSelect = (val: string) => {
    const leadId = Number(val);
    setSelectedLeadId(leadId);
    const lead = rawLeads.find((l) => l.id === leadId);
    if (lead) {
      setFormLeadName(lead.contactPerson);
      setFormCompanyName(lead.company);
      setFormLeadEmail(lead.email);
      setFormLeadPhone(lead.phone);
      setFormLeadNameError("");
      setFormCompanyNameError("");
      setFormLeadEmailError("");
      setFormLeadPhoneError("");
      showToast(`Auto-filled from lead "${lead.company}"`, "info");
    }
  };

  const handleClientSelect = (val: string) => {
    const clientId = Number(val);
    setSelectedClientId(clientId);
    const client = rawClients.find((c) => c.id === clientId);
    if (client) {
      setFormLeadName(client.lead?.contactPerson || client.name || "Main contact");
      setFormCompanyName(client.company?.name || client.company || "Client");
      setFormLeadEmail(client.lead?.email || client.email || "");
      setFormLeadPhone(client.lead?.phone || client.phone || "");
      setFormLeadNameError("");
      setFormCompanyNameError("");
      setFormLeadEmailError("");
      setFormLeadPhoneError("");
      showToast(`Auto-filled from client "${client.company?.name || client.company}"`, "info");
    }
  };

  const [formRequirement, setFormRequirement] = useState<RequirementSection>(EMPTY_REQUIREMENT);
  const [formPhases, setFormPhases] = useState<ProposalPhase[]>([]);
  const [formDiscountPct, setFormDiscountPct] = useState(0);
  const [formTaxPct, setFormTaxPct] = useState(18);

  // Which phases have their body collapsed / name being edited
  const [collapsedPhases, setCollapsedPhases] = useState<number[]>([]);
  const [editingPhaseName, setEditingPhaseName] = useState<number | null>(null);
  const [phaseErrors, setPhaseErrors] = useState<Record<number, string>>({});

  const [formPaymentTerms, setFormPaymentTerms] = useState("");
  const [formValidityDays, setFormValidityDays] = useState(30);
  const [formDeliveryTimeline, setFormDeliveryTimeline] = useState("");
  const [formWarranty, setFormWarranty] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formTnC, setFormTnC] = useState("");

  useEffect(() => {
    const loadProposal = async () => {
      if (isEditMode && id) {
        setLoading(true);
        try {
          const proposal = await proposalService.getProposalById(Number(id));
          if (proposal) {
            setFormLeadName(proposal.lead?.contactPerson || proposal.client?.lead?.contactPerson || proposal.client?.name || "");
            setFormCompanyName(proposal.lead?.company?.name || proposal.lead?.title || proposal.client?.company?.name || "");
            setFormLeadEmail(proposal.lead?.email || proposal.client?.lead?.email || proposal.client?.email || "");
            setFormLeadPhone(proposal.lead?.phone || proposal.client?.lead?.phone || proposal.client?.phone || "");
            setFormStatus(proposal.status);
            if (proposal.clientId) {
              setAssociationType("client");
              setSelectedClientId(proposal.clientId);
            } else if (proposal.leadId) {
              setAssociationType("lead");
              setSelectedLeadId(proposal.leadId);
            }
            
            if (proposal.requirements) {
              setFormRequirement({
                overview: proposal.requirements.overview || "",
                objectives: proposal.requirements.objectives?.length ? proposal.requirements.objectives : [""],
                technicalRequirements: proposal.requirements.technicalRequirements?.length ? proposal.requirements.technicalRequirements : [""],
                deliverables: proposal.requirements.deliverables?.length ? proposal.requirements.deliverables : [""],
                assumptions: proposal.requirements.assumptions?.length ? proposal.requirements.assumptions : [""],
                constraints: proposal.requirements.constraints?.length ? proposal.requirements.constraints : [""],
                techStack: proposal.requirements.techStack || []
              });
              setFormTechStack(proposal.requirements.techStack || []);
            } else {
              setFormRequirement({
                overview: proposal.lead?.requirements || "",
                objectives: [""],
                technicalRequirements: [""],
                deliverables: [""],
                assumptions: [""],
                constraints: [""],
                techStack: []
              });
            }

            if (proposal.phases && proposal.phases.length > 0) {
              setFormPhases(proposal.phases.map((ph: any) => mapPhaseFromApi(ph)));
            } else if (proposal.estimation && Array.isArray(proposal.estimation.items)) {
              // Legacy single-table estimation → migrate into Phase 1
              const legacyItems = proposal.estimation.items.map((item: any, idx: number) => ({
                id: item.id || `li-${idx + 1}`,
                category: item.category || "",
                description: item.description || "",
                unit: item.unit || "Project",
                quantity: item.quantity || 1,
                unitPrice: Number(item.unitPrice) || 0,
                amount: Number(item.amount) || 0,
              }));
              setFormPhases([{
                phaseName: "Phase 1",
                overview: "",
                objectives: [""],
                technicalRequirements: [""],
                deliverables: [""],
                assumptions: [""],
                constraints: [""],
                lineItems: legacyItems.length ? legacyItems : [newPhaseItem()],
                subtotal: legacyItems.reduce((s: number, i: any) => s + i.amount, 0),
                estimatedTimeline: "",
              }]);
            } else {
              setFormPhases([newEmptyPhase(1)]);
            }

            setFormDiscountPct(proposal.estimation?.discountPercent || 0);
            setFormTaxPct(proposal.estimation?.taxPercent !== undefined ? proposal.estimation.taxPercent : 18);

            if (proposal.quotation) {
              setFormPaymentTerms(proposal.quotation.paymentTerms || "");
              setFormValidityDays(proposal.quotation.validityDays !== undefined ? proposal.quotation.validityDays : 30);
              setFormDeliveryTimeline(proposal.quotation.deliveryTimeline || "");
              setFormWarranty(proposal.quotation.warrantyPeriod || "");
              setFormNotes(proposal.quotation.notes || proposal.title || "");
              setFormTnC(proposal.quotation.termsAndConditions || "");
            } else {
              setFormPaymentTerms("Immediate");
              setFormValidityDays(proposal.validUntil ? Math.ceil((new Date(proposal.validUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 30);
              setFormDeliveryTimeline("60 Days");
              setFormWarranty("12 Months");
              setFormNotes(proposal.title || "");
              setFormTnC("");
            }
          }
        } catch (err) {
          console.error(err);
          showToast("Failed to load proposal details.", "error");
        } finally {
          setLoading(false);
        }
      } else {
        setFormPhases([newEmptyPhase(1)]);
        setLoading(false);
      }
    };
    loadProposal();
  }, [id, isEditMode]);


  // ── Requirement Array Helpers ──────────────────────────────────────────────

  const updateReqArray = (
    field: "objectives" | "technicalRequirements" | "deliverables" | "assumptions" | "constraints",
    index: number, value: string
  ) => {
    setFormRequirement((prev) => ({ ...prev, [field]: prev[field].map((item, i) => (i === index ? value : item)) }));
  };

  const addReqArrayItem = (field: "objectives" | "technicalRequirements" | "deliverables" | "assumptions" | "constraints") => {
    setFormRequirement((prev) => ({ ...prev, [field]: [...prev[field], ""] }));
  };

  const removeReqArrayItem = (field: "objectives" | "technicalRequirements" | "deliverables" | "assumptions" | "constraints", index: number) => {
    setFormRequirement((prev) => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
  };

  // ── Phase Helpers ──────────────────────────────────────────────────────────

  const updatePhase = (pIdx: number, updater: (phase: ProposalPhase) => ProposalPhase) => {
    setFormPhases((prev) => prev.map((p, i) => (i === pIdx ? updater(p) : p)));
  };

  const addPhase = () => {
    setFormPhases((prev) => [...prev, newEmptyPhase(prev.length + 1)]);
  };

  const removePhase = (pIdx: number) => {
    setFormPhases((prev) => prev.filter((_, i) => i !== pIdx));
  };

  const movePhase = (pIdx: number, dir: -1 | 1) => {
    setFormPhases((prev) => {
      const next = [...prev];
      const target = pIdx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[pIdx], next[target]] = [next[target], next[pIdx]];
      return next;
    });
  };

  const toggleCollapsePhase = (pIdx: number) => {
    setCollapsedPhases((prev) => (prev.includes(pIdx) ? prev.filter((x) => x !== pIdx) : [...prev, pIdx]));
  };

  const updatePhaseList = (pIdx: number, field: (typeof PHASE_LIST_FIELDS)[number], index: number, value: string) => {
    updatePhase(pIdx, (p) => ({ ...p, [field]: p[field].map((it, i) => (i === index ? value : it)) }));
  };

  const addPhaseListItem = (pIdx: number, field: (typeof PHASE_LIST_FIELDS)[number]) => {
    updatePhase(pIdx, (p) => ({ ...p, [field]: [...p[field], ""] }));
  };

  const removePhaseListItem = (pIdx: number, field: (typeof PHASE_LIST_FIELDS)[number], index: number) => {
    updatePhase(pIdx, (p) => ({ ...p, [field]: p[field].filter((_, i) => i !== index) }));
  };

  const addPhaseLineItem = (pIdx: number) => {
    updatePhase(pIdx, (p) => ({ ...p, lineItems: [...p.lineItems, newPhaseItem()] }));
  };

  const removePhaseLineItem = (pIdx: number, itemId: string) => {
    updatePhase(pIdx, (p) => ({ ...p, lineItems: p.lineItems.filter((i) => i.id !== itemId) }));
  };

  const updatePhaseLineItem = (pIdx: number, itemId: string, field: keyof EstimationLineItem, value: string | number) => {
    updatePhase(pIdx, (p) => ({
      ...p,
      lineItems: p.lineItems.map((item) => {
        if (item.id !== itemId) return item;
        const updated = { ...item, [field]: value };
        if (field === "unitPrice" || field === "quantity") {
          const unitPrice = field === "unitPrice" ? Number(value) || 0 : item.unitPrice;
          const quantity = field === "quantity" ? Number(value) || 0 : item.quantity || 1;
          updated.amount = Math.round(unitPrice * quantity);
        }
        return updated;
      }),
    }));
  };

  const phaseSubtotal = (phase: ProposalPhase) => phase.lineItems.reduce((s, i) => s + (i.amount || 0), 0);

  // ── Overall Pricing Summary (auto-calculated) ─────────────────────────────

  const pricingSummary: PricingSummary = useMemo(() => {
    const subtotal = formPhases.reduce((s, p) => s + phaseSubtotal(p), 0);
    const discountAmount = Math.round(subtotal * ((formDiscountPct || 0) / 100));
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = Math.round(afterDiscount * ((formTaxPct || 0) / 100));
    const grandTotal = afterDiscount + taxAmount;
    return { subtotal, discountPercent: formDiscountPct, discountAmount, taxPercent: formTaxPct, taxAmount, grandTotal };
  }, [formPhases, formDiscountPct, formTaxPct]);

  // ── Save ───────────────────────────────────────────────────────────────────

  const validateBasicFields = (): boolean => {
    let isValid = true;
    
    if (!formLeadName.trim()) {
      setFormLeadNameError("Lead name is required.");
      isValid = false;
    } else {
      setFormLeadNameError("");
    }
    
    if (!formCompanyName.trim()) {
      setFormCompanyNameError("Company name is required.");
      isValid = false;
    } else {
      setFormCompanyNameError("");
    }
    
    const emailErr = validateEmail(formLeadEmail);
    if (emailErr) {
      setFormLeadEmailError(emailErr);
      isValid = false;
    } else {
      setFormLeadEmailError("");
    }
    
    const phoneErr = validatePhone(formLeadPhone);
    if (phoneErr) {
      setFormLeadPhoneError(phoneErr);
      isValid = false;
    } else {
      setFormLeadPhoneError("");
    }
    
    if (!isValid) {
      showToast("Please fix the validation errors in the form.", "error");
    }
    return isValid;
  };

  const validatePhases = (): boolean => {
    const errors: Record<number, string> = {};
    formPhases.forEach((phase, idx) => {
      if (!phase.phaseName.trim()) {
        errors[idx] = "Phase name is required.";
      } else if (!phase.lineItems.some((li) => li.description.trim())) {
        errors[idx] = "Each phase must have at least one line item.";
      }
    });
    setPhaseErrors(errors);
    if (Object.keys(errors).length > 0) {
      showToast("Please fix the validation errors in the phases.", "error");
      setCollapsedPhases((prev) => prev.filter((x) => !errors[x]));
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateBasicFields()) return;
    if (formPhases.length === 0) {
      showToast("Add at least one project phase.", "error");
      return;
    }
    if (!validatePhases()) return;

    const { subtotal, discountPercent, discountAmount, taxPercent, taxAmount, grandTotal } = pricingSummary;

    const requirements = {
      overview: formRequirement.overview,
      objectives: formRequirement.objectives.filter((o) => o.trim()),
      technicalRequirements: formRequirement.technicalRequirements.filter((t) => t.trim()),
      deliverables: formRequirement.deliverables.filter((d) => d.trim()),
      assumptions: formRequirement.assumptions.filter((a) => a.trim()),
      constraints: formRequirement.constraints.filter((c) => c.trim()),
      techStack: formTechStack,
    };

    const quotation: QuotationSection = {
      paymentTerms: formPaymentTerms, validityDays: formValidityDays,
      deliveryTimeline: formDeliveryTimeline, warrantyPeriod: formWarranty,
      paymentMilestones: [], notes: formNotes, termsAndConditions: formTnC,
    };

    const phasesPayload = formPhases.map((phase) => ({
      id: phase.id || null,
      phaseName: phase.phaseName.trim(),
      overview: phase.overview.trim(),
      estimatedTimeline: (phase.estimatedTimeline || "").trim(),
      objectives: phase.objectives.filter((o) => o.trim()),
      technicalRequirements: phase.technicalRequirements.filter((t) => t.trim()),
      deliverables: phase.deliverables.filter((d) => d.trim()),
      assumptions: phase.assumptions.filter((a) => a.trim()),
      constraints: phase.constraints.filter((c) => c.trim()),
      lineItems: phase.lineItems
        .filter((i) => i.description.trim())
        .map((i) => ({
          category: i.category,
          description: i.description,
          unit: i.unit,
          unitPrice: i.unitPrice,
          quantity: i.quantity || 1,
          amount: i.amount,
        })),
    }));

    console.log(`Saving proposal with ${phasesPayload.length} phase(s).`, { subtotal, discountPercent, discountAmount, taxPercent, taxAmount, grandTotal });

    try {
      let leadId = selectedLeadId;
      if (associationType === "lead" && !leadId) {
        const matched = rawLeads.find(l => l.company.toLowerCase() === formCompanyName.trim().toLowerCase());
        leadId = matched ? matched.id : (rawLeads[0]?.id || 1);
      }

      const generatedNum = `BP-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
      const validUntilDate = new Date(Date.now() + formValidityDays * 24 * 60 * 60 * 1000).toISOString();

      const payload = {
        leadId: associationType === "lead" ? leadId : null,
        clientId: associationType === "client" ? selectedClientId : null,
        proposalNumber: isEditMode ? undefined : generatedNum,
        title: formNotes.trim() || `Proposal for ${formCompanyName.trim()}`,
        amount: grandTotal,
        status: formStatus,
        validUntil: validUntilDate,
        requirements,
        quotation,
        discountPercent,
        taxPercent,
        phases: phasesPayload
      };

      if (isEditMode) {
        await proposalService.updateProposal(Number(id), payload);
        showToast("Proposal updated successfully.", "success");
      } else {
        await proposalService.createProposal(payload);
        showToast("Proposal created successfully.", "success");
      }
      navigate("/proposals");
    } catch {
      showToast("Failed to save proposal.", "error");
    }
  };

  const handleCancel = () => navigate("/proposals");

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="text-center py-10 text-gray-500">Loading...</div>;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <PageMeta
        title={isEditMode ? "Edit Proposal | SaiFlow" : "New Proposal | SaiFlow"}
        description={isEditMode ? "Edit an existing business proposal." : "Create a new business proposal with requirement, estimation, and pricing."}
      />
      <PageBreadcrumb pageTitle={isEditMode ? "Edit Proposal" : "New Proposal"} />

      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-5">
        {/* ── Lead / Client Information ────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05] flex items-center gap-2">
            <FiUser className="size-4 text-brand-500" /> Lead / Client Information
          </h3>
          {!isEditMode && (
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                Proposal association type
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="radio"
                    name="associationType"
                    value="lead"
                    checked={associationType === "lead"}
                    onChange={() => {
                      setAssociationType("lead");
                      setSelectedLeadId(null);
                      setSelectedClientId(null);
                      setFormLeadName("");
                      setFormCompanyName("");
                      setFormLeadEmail("");
                      setFormLeadPhone("");
                    }}
                  />
                  New prospect / lead
                </label>
                <label className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="radio"
                    name="associationType"
                    value="client"
                    checked={associationType === "client"}
                    onChange={() => {
                      setAssociationType("client");
                      setSelectedLeadId(null);
                      setSelectedClientId(null);
                      setFormLeadName("");
                      setFormCompanyName("");
                      setFormLeadEmail("");
                      setFormLeadPhone("");
                    }}
                  />
                  Existing client
                </label>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                {associationType === "lead" ? "Lead name" : "Client contact name"} <span className="text-error-500">*</span>
              </label>
              {isEditMode ? (
                <Input
                  type="text"
                  disabled
                  value={formLeadName}
                  onChange={(e) => setFormLeadName(e.target.value)}
                />
              ) : associationType === "lead" ? (
                <Select
                  options={leadsList}
                  placeholder="Select a lead..."
                  defaultValue={selectedLeadId ? selectedLeadId.toString() : ""}
                  onChange={handleLeadSelect}
                />
              ) : (
                <Select
                  options={clientsList}
                  placeholder="Select a client..."
                  defaultValue={selectedClientId ? selectedClientId.toString() : ""}
                  onChange={handleClientSelect}
                />
              )}
              {formLeadNameError && (
                <span className="mt-1.5 text-xs text-error-600 block">{formLeadNameError}</span>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                Company Name <span className="text-error-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. Acme Corp"
                value={formCompanyName}
                onChange={(e) => { setFormCompanyName(e.target.value); if (e.target.value.trim() && formCompanyNameError) setFormCompanyNameError(""); }}
                onBlur={() => { if (!formCompanyName.trim()) setFormCompanyNameError("Company name is required."); else setFormCompanyNameError(""); }}
                error={!!formCompanyNameError}
                hint={formCompanyNameError || undefined}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                Email <span className="text-error-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. john@acme.com"
                value={formLeadEmail}
                onChange={(e) => {
                  setFormLeadEmail(e.target.value);
                  if (formLeadEmailError) setFormLeadEmailError("");
                }}
                onBlur={() => setFormLeadEmailError(validateEmail(formLeadEmail))}
                error={!!formLeadEmailError}
                hint={formLeadEmailError || undefined}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                Phone <span className="text-error-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. +91 98765 43210"
                value={formLeadPhone}
                onChange={(e) => {
                  setFormLeadPhone(e.target.value);
                  if (formLeadPhoneError) setFormLeadPhoneError("");
                }}
                onBlur={() => setFormLeadPhoneError(validatePhone(formLeadPhone))}
                error={!!formLeadPhoneError}
                hint={formLeadPhoneError || undefined}
              />
            </div>
          </div>
        </div>

        {/* ── Requirement ───────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05] flex items-center gap-2">
            <FiList className="size-4 text-brand-500" /> Requirement
          </h3>
          {/* Tech Stack Selector */}
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <FiCpu className="size-3.5" /> Tech Stack
            </label>
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <Select
                  options={techStackOptions}
                  placeholder="Select Technology..."
                  defaultValue=""
                  onChange={handleAddTechStack}
                />
              </div>
            </div>
            {formTechStack.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {formTechStack.map((tech) => (
                  <span key={tech}
                    className="inline-flex items-center gap-1 rounded-md bg-brand-50 dark:bg-brand-500/10 px-2.5 py-1 text-xs font-medium text-brand-700 dark:text-brand-400 border border-brand-200 dark:border-brand-500/20"
                  >
                    {tech}
                    <button type="button" onClick={() => handleRemoveTechStack(tech)}
                      className="text-brand-400 hover:text-brand-600 cursor-pointer">
                      <FiXCircle className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">Overview</label>
            <textarea value={formRequirement.overview}
              onChange={(e) => setFormRequirement((p) => ({ ...p, overview: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-800 dark:text-white/90 resize-none h-20"
              placeholder="Brief overview of the project..." />
          </div>
          {(["objectives", "technicalRequirements", "deliverables", "assumptions", "constraints"] as const).map((field) => (
            <div key={field} className="mb-3">
              <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400 capitalize">
                {field.replace(/([A-Z])/g, " $1").trim()}
              </label>
              {formRequirement[field].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-1.5">
                  <input value={item}
                    onChange={(e) => updateReqArray(field, idx, e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-800 dark:text-white/90"
                    placeholder={`Add ${field.replace(/([A-Z])/g, " $1").toLowerCase().slice(0, -1)}...`} />
                  {formRequirement[field].length > 1 && (
                    <button type="button" onClick={() => removeReqArrayItem(field, idx)}
                      className="text-red-400 hover:text-red-600 cursor-pointer shrink-0 p-1">
                      <FiXCircle className="size-4" />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => addReqArrayItem(field)}
                className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1 mt-1 cursor-pointer">
                <FiPlus className="size-3" /> Add More
              </button>
            </div>
          ))}
        </div>

        {/* ── Project Phases ────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05] flex items-center gap-2">
            <FiLayers className="size-4 text-brand-500" /> Project Phases
          </h3>

          {formPhases.length === 0 && (
            <p className="text-sm text-gray-400 py-2">No phases yet. Click "Add Phase" to get started.</p>
          )}

          <div className="space-y-4">
            {formPhases.map((phase, pIdx) => {
              const collapsed = collapsedPhases.includes(pIdx);
              const error = phaseErrors[pIdx];
              const subtotal = phaseSubtotal(phase);
              return (
                <div key={`phase-${pIdx}`}
                  className={`rounded-lg border ${error ? "border-red-300 dark:border-red-700" : "border-gray-200 dark:border-gray-800"} overflow-hidden`}>
                  {/* Phase Header */}
                  <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gray-50 dark:bg-white/[0.03] border-b border-gray-200 dark:border-gray-800">
                    <button type="button" onClick={() => toggleCollapsePhase(pIdx)}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer group">
                      {collapsed
                        ? <FiChevronRight className="size-4 text-gray-400 group-hover:text-brand-500 shrink-0" />
                        : <FiChevronDown className="size-4 text-brand-500 shrink-0" />}
                      <span className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                        Phase {pIdx + 1} - {phase.phaseName.trim() || "Untitled Phase"}
                      </span>
                      <span className="ml-1 hidden sm:inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 shrink-0">
                        <FiCreditCard className="size-3" /> {formatCurrency(subtotal)}
                      </span>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button"
                        onClick={() => setEditingPhaseName(editingPhaseName === pIdx ? null : pIdx)}
                        className={`p-1.5 rounded-lg cursor-pointer transition-colors ${editingPhaseName === pIdx ? "text-brand-600 bg-brand-50 dark:bg-brand-500/10" : "text-gray-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10"}`}
                        title="Edit phase name">
                        <FiEdit className="size-3.5" />
                      </button>
                      <button type="button" onClick={() => movePhase(pIdx, -1)} disabled={pIdx === 0}
                        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move phase up">
                        <FiArrowUp className="size-3.5" />
                      </button>
                      <button type="button" onClick={() => movePhase(pIdx, 1)} disabled={pIdx === formPhases.length - 1}
                        className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move phase down">
                        <FiArrowDown className="size-3.5" />
                      </button>
                      <button type="button" onClick={() => removePhase(pIdx)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors"
                        title="Delete phase">
                        <FiTrash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {error && (
                    <p className="px-4 pt-2 text-xs text-error-600">{error}</p>
                  )}

                  {!collapsed && (
                    <div className="p-4 space-y-4">
                      {/* Phase Name */}
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                          Phase Name <span className="text-error-500">*</span>
                        </label>
                        <Input type="text" value={phase.phaseName}
                          onChange={(e) => {
                            updatePhase(pIdx, (p) => ({ ...p, phaseName: e.target.value }));
                            if (phaseErrors[pIdx]) setPhaseErrors((prev) => ({ ...prev, [pIdx]: "" }));
                          }}
                          placeholder="e.g. Discovery" />
                      </div>

                      {/* Overview */}
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">Overview</label>
                        <textarea value={phase.overview}
                          onChange={(e) => updatePhase(pIdx, (p) => ({ ...p, overview: e.target.value }))}
                          className="w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-800 dark:text-white/90 resize-none h-16"
                          placeholder="Brief overview of this phase..." />
                      </div>

                      {/* Phase detail lists */}
                      {PHASE_LIST_FIELDS.map((field) => (
                        <div key={field}>
                          <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400 capitalize">
                            {field.replace(/([A-Z])/g, " $1").trim()}
                          </label>
                          {phase[field].map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2 mb-1.5">
                              <input value={item}
                                onChange={(e) => updatePhaseList(pIdx, field, idx, e.target.value)}
                                className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-800 dark:text-white/90"
                                placeholder={`Add ${field.replace(/([A-Z])/g, " $1").toLowerCase().slice(0, -1)}...`} />
                              {phase[field].length > 1 && (
                                <button type="button" onClick={() => removePhaseListItem(pIdx, field, idx)}
                                  className="text-red-400 hover:text-red-600 cursor-pointer shrink-0 p-1">
                                  <FiXCircle className="size-4" />
                                </button>
                              )}
                            </div>
                          ))}
                          <button type="button" onClick={() => addPhaseListItem(pIdx, field)}
                            className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1 mt-1 cursor-pointer">
                            <FiPlus className="size-3" /> Add More
                          </button>
                        </div>
                      ))}

                      {/* Phase Estimation Table */}
                      <div>
                        <label className="mb-2 block text-xs font-semibold text-gray-500 dark:text-gray-400">Estimation</label>
                        <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-xl">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-gray-800">
                                <th className="w-[170px] text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-800 last:border-r-0">Category</th>
                                <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-800 last:border-r-0">Description</th>
                                <th className="w-[110px] text-right py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-800 last:border-r-0">Unit Price</th>
                                <th className="w-[70px] text-right py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-800 last:border-r-0">Qty</th>
                                <th className="w-[110px] text-right py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-800 last:border-r-0">Amount</th>
                                <th className="w-[40px] py-2.5 px-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 last:border-r-0"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                              {phase.lineItems.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                                  <td className="py-2 px-3 align-middle border-r border-gray-200 dark:border-gray-800 last:border-r-0">
                                    <div className="relative">
                                      <select value={item.category}
                                        onChange={(e) => updatePhaseLineItem(pIdx, item.id, "category", e.target.value)}
                                        className={`w-full appearance-none rounded-lg border border-gray-300 bg-white dark:bg-gray-900 pl-3 pr-8 py-2 text-xs dark:border-gray-700 focus:outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:focus:border-brand-800 cursor-pointer ${item.category ? "text-gray-800 dark:text-white/90" : "text-gray-400 dark:text-gray-400"}`}>
                                        <option value="" disabled className="text-gray-400 dark:bg-gray-900 dark:text-gray-400 bg-white">Select</option>
                                        {serviceOptions.map((c) => (
                                          <option key={c.value} value={c.value} className="text-gray-700 dark:bg-gray-900 dark:text-gray-200 bg-white">{c.label}</option>
                                        ))}
                                      </select>
                                      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-500">
                                        <svg className="w-3 h-3 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                        </svg>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-2 px-3 align-middle border-r border-gray-200 dark:border-gray-800 last:border-r-0">
                                    <input value={item.description}
                                      onChange={(e) => updatePhaseLineItem(pIdx, item.id, "description", e.target.value)}
                                      className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-xs text-gray-800 dark:border-gray-800 dark:text-white/90 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                                      placeholder="Description" />
                                  </td>
                                  <td className="py-2 px-3 align-middle border-r border-gray-200 dark:border-gray-800 last:border-r-0">
                                    <input type="number" value={item.unitPrice}
                                      onChange={(e) => updatePhaseLineItem(pIdx, item.id, "unitPrice", Number(e.target.value))}
                                      className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-xs text-right text-gray-800 dark:border-gray-800 dark:text-white/90 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500" min="0" />
                                  </td>
                                  <td className="py-2 px-3 align-middle border-r border-gray-200 dark:border-gray-800 last:border-r-0">
                                    <input type="number" value={item.quantity ?? 1}
                                      onChange={(e) => updatePhaseLineItem(pIdx, item.id, "quantity", Number(e.target.value))}
                                      className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-xs text-right text-gray-800 dark:border-gray-800 dark:text-white/90 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500" min="1" />
                                  </td>
                                  <td className="py-2 px-3 align-middle text-right text-xs font-semibold text-gray-800 dark:text-white border-r border-gray-200 dark:border-gray-800 last:border-r-0">
                                    {formatCurrency(item.amount)}
                                  </td>
                                  <td className="py-2 px-3 align-middle text-center last:border-r-0">
                                    <button type="button" onClick={() => removePhaseLineItem(pIdx, item.id)}
                                      className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 p-1.5 rounded-lg cursor-pointer transition-colors">
                                      <FiTrash2 className="size-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <button type="button" onClick={() => addPhaseLineItem(pIdx)}
                          className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1 mt-2 cursor-pointer">
                          <FiPlus className="size-3" /> Add Line Item
                        </button>
                      </div>

                      {/* Phase Summary Card */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                        <div className="p-3 rounded-lg border border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.03]">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Phase Total</p>
                          <p className="text-base font-bold text-brand-600 dark:text-brand-400">{formatCurrency(subtotal)}</p>
                        </div>
                        <div className="p-3 rounded-lg border border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.03]">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Number of Line Items</p>
                          <p className="text-base font-bold text-gray-800 dark:text-white">
                            {phase.lineItems.filter((i) => i.description.trim()).length}
                          </p>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">Estimated Timeline</label>
                          <Input type="text" value={phase.estimatedTimeline || ""}
                            onChange={(e) => updatePhase(pIdx, (p) => ({ ...p, estimatedTimeline: e.target.value }))}
                            placeholder="e.g. 3 weeks" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button type="button" onClick={addPhase}
            className="mt-4 text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1 cursor-pointer">
            <FiPlus className="size-3" /> Add Phase
          </button>

          {/* Overall Pricing Summary */}
          <div className="mt-5 p-4 rounded-lg border border-brand-200 dark:border-brand-500/20 bg-brand-50/50 dark:bg-brand-500/[0.05]">
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1.5">
              <FiCreditCard className="size-3.5 text-brand-500" /> Overall Pricing Summary
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">Discount (%)</label>
                <Input type="number" value={String(formDiscountPct)} onChange={(e) => setFormDiscountPct(Number(e.target.value))} min="0" max="100" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">Tax (%)</label>
                <Input type="number" value={String(formTaxPct)} onChange={(e) => setFormTaxPct(Number(e.target.value))} min="0" max="100" />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-brand-100 dark:border-brand-500/10 flex items-center justify-end gap-4 text-sm flex-wrap">
              <span className="text-gray-500 dark:text-gray-400">
                Subtotal: <strong>{formatCurrency(pricingSummary.subtotal)}</strong>
              </span>
              {pricingSummary.discountPercent > 0 && (
                <span className="text-red-500">-{formatCurrency(pricingSummary.discountAmount)}</span>
              )}
              <span className="text-gray-500 dark:text-gray-400">
                Tax: <strong>{formatCurrency(pricingSummary.taxAmount)}</strong>
              </span>
              <span className="text-base font-bold text-brand-600 dark:text-brand-400">
                Grand Total: {formatCurrency(pricingSummary.grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Quotation / Pricing Terms ─────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-white/[0.05] dark:bg-white/[0.03]">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05] flex items-center gap-2">
            <FiFileText className="size-4 text-brand-500" /> Quotation / Pricing Terms
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">Payment Type <span className="text-error-500">*</span></label>
              <Select
                key={isEditMode ? `payment-${formPaymentTerms}` : 'payment-create'}
                options={paymentTypeOptions}
                placeholder="Select Payment Type..."
                defaultValue={formPaymentTerms}
                onChange={(val) => setFormPaymentTerms(val)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">Validity (days)</label>
              <Input type="number" value={String(formValidityDays)} onChange={(e) => setFormValidityDays(Number(e.target.value))} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">Delivery Timeline</label>
              <Input type="text" placeholder="e.g. 12 weeks from kickoff" value={formDeliveryTimeline} onChange={(e) => setFormDeliveryTimeline(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">Warranty Period</label>
              <Input type="text" placeholder="e.g. 6 months post-deployment" value={formWarranty} onChange={(e) => setFormWarranty(e.target.value)} />
            </div>
          </div>
          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">Notes</label>
            <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-800 dark:text-white/90 resize-none h-16"
              placeholder="Additional notes..." />
          </div>
          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">Terms &amp; Conditions</label>
            <textarea value={formTnC} onChange={(e) => setFormTnC(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-800 dark:text-white/90 resize-none h-20"
              placeholder="Enter terms and conditions..." />
          </div>
        </div>

        {/* ── Actions ───────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button size="sm" type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button size="sm" type="submit">
            {isEditMode ? "Update Proposal" : "Create Proposal"}
          </Button>
        </div>
      </form>
    </>
  );
}
