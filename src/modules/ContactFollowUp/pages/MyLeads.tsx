import { useState, useEffect } from "react";
import { useDebounce } from "../../../hooks/useDebounce";
import { useNavigate } from "react-router";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Badge from "../../../components/ui/badge/Badge";
import Input from "../../../components/form/input/InputField";
import DatePicker from "../../../components/form/date-picker";
import { Pagination } from "../../../components/ui/pagination/Pagination";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "../../../components/ui/table";
import {
  FiEye,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiPhone,
} from "react-icons/fi";
import { getStatusColor, getPriorityColor, type Lead } from "../../LeadManagement/data/leadsData";
import { getStatusLabel } from "../../LeadManagement/utils/leadStatus";
import { useAuth } from "../../../context/AuthContext";
import { leadService } from "../../../services/leadService";
import { connectService } from "../../../services/connectService";
import { useToast } from "../../../hooks/useToast";
import { Modal } from "../../../components/ui/modal";
import { useModal } from "../../../hooks/useModal";
import Button from "../../../components/ui/button/Button";

export default function MyLeads() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { user } = useAuth();
  // Mirrors the backend's canAccessAllLeads() — these roles see every lead.
  // (The seeded System Administrator account has the "Administrator" role.)
  const isManager = [
    "Administrator",
    "Business Development Manager",
    "System Administrator",
  ].includes(user?.role?.name);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"new" | "contacted">("new");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const data = await leadService.getLeads({
        page: currentPage,
        limit: rowsPerPage,
        status: activeTab === "new" ? "NEW,ASSIGNED" : "CONTACTED",
        search: debouncedSearchQuery || undefined
      });
      if (data && Array.isArray(data.data)) {
        const mapped = data.data.map((l: any) => ({
          ...l,
          company: l.company?.name || l.title || "",
          contactPerson: l.contactPerson || "",
          email: l.email || "",
          phone: l.phone || "",
          priority: l.priority?.name || l.priority || "",
          assignedTo: l.assignedTo?.name || "Unassigned",
          status: l.status,
        }));
        setLeads(mapped);
        setTotalItems(data.meta?.total || 0);
        setTotalPages(data.meta?.totalPages || 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLeads();
    }
  }, [user, currentPage, rowsPerPage, activeTab, debouncedSearchQuery]);

  type ContactResult = "Interested" | "Call Later" | "Not Interested";

  const contactModal = useModal();
  const confirmCallModal = useModal();
  const successModal = useModal();
  const [selectedLeadForContact, setSelectedLeadForContact] = useState<Lead | null>(null);
  const [selectedLeadForCall, setSelectedLeadForCall] = useState<Lead | null>(null);
  const [saving, setSaving] = useState(false);
  const [successRedirect, setSuccessRedirect] = useState<"contacted" | null>(null);
  const [contactResult, setContactResult] = useState<ContactResult | null>(null);
  const [contactSummary, setContactSummary] = useState("");
  const [savedOutcome, setSavedOutcome] = useState<string | null>(null);
  const [callLaterDate, setCallLaterDate] = useState("");
  const [callLaterTime, setCallLaterTime] = useState("");
  const [callLaterType, setCallLaterType] = useState("Call");

  const followUpTypeOptions = ["Call", "Meeting", "Email", "WhatsApp"];

  const handleOpenCallConfirm = (lead: Lead) => {
    setSelectedLeadForCall(lead);
    confirmCallModal.openModal();
  };

  const handleConfirmCallLead = async () => {
    if (!selectedLeadForCall || saving) return;
    setSaving(true);
    try {
      // Creates the CONTACTED connect record; the lead status auto-transitions
      // to CONTACTED server-side in the same transaction.
      await connectService.createConnect({
        leadId: selectedLeadForCall.id,
        outcome: "CONTACTED",
        status: "COMPLETED",
      });
      setSavedOutcome(
        `"${selectedLeadForCall.company}" marked as Contacted — moved to Contacted Leads.`
      );
      setSuccessRedirect("contacted");
      confirmCallModal.closeModal();
      successModal.openModal();
      fetchLeads();
    } catch (err) {
      showToast("Failed to mark lead as contacted.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Closes the shared success modal, shows a toast of the saved outcome and
  // redirects to the Contacted tab only when the lead was marked as contacted
  // (handles backdrop/ESC closes too).
  const handleCloseSuccess = () => {
    if (savedOutcome) {
      showToast(savedOutcome, "success");
    }
    if (successRedirect === "contacted") {
      setActiveTab("contacted");
      setCurrentPage(1);
    }
    setSuccessRedirect(null);
    successModal.closeModal();
  };

  const handleOpenOutcomeModal = (lead: Lead, result: ContactResult) => {
    setSelectedLeadForContact(lead);
    setContactResult(result);
    setContactSummary("");
    setCallLaterDate("");
    setCallLaterTime("");
    setCallLaterType("Call");
    contactModal.openModal();
  };

  const handleSaveContactOutcome = async () => {
    if (!selectedLeadForContact || saving) return;

    if (contactResult === "Call Later") {
      if (!callLaterDate) {
        showToast("Please select a follow-up date.", "error");
        return;
      }
      if (!callLaterTime) {
        showToast("Please select a follow-up time.", "error");
        return;
      }
      if (!callLaterType) {
        showToast("Please select a follow-up type.", "error");
        return;
      }
    }

    let outcomeMessage: string;

    if (contactResult === "Interested") {
      outcomeMessage = "Marked as Interested — lead moved to Qualified";
    } else if (contactResult === "Call Later") {
      outcomeMessage = "Follow-up scheduled — lead moved to Scheduled";
    } else if (contactResult === "Not Interested") {
      outcomeMessage = "Marked as Not Interested — lead moved to Lost";
    } else {
      return;
    }

    setSaving(true);
    try {
      // Save the outcome summary + follow-up details to the connect table;
      // the lead status transition (QUALIFIED / MEETING_SCHEDULED / LOST)
      // happens server-side. leads.requirements is reserved for Notes only.
      await connectService.createConnect({
        leadId: selectedLeadForContact.id,
        outcome:
          contactResult === "Interested"
            ? "INTERESTED"
            : contactResult === "Call Later"
              ? "CALL_LATER"
              : "NOT_INTERESTED",
        summary: contactSummary.trim() || undefined,
        followUpType: contactResult === "Call Later" ? callLaterType : undefined,
        followUpDate: contactResult === "Call Later" ? callLaterDate : undefined,
        followUpTime: contactResult === "Call Later" ? callLaterTime : undefined,
      });

      setSavedOutcome(outcomeMessage);
      showToast("Contact outcome saved successfully.", "success");
      contactModal.closeModal();
      successModal.openModal();
      fetchLeads();
    } catch (err) {
      showToast("Failed to save contact outcome.", "error");
    } finally {
      setSaving(false);
    }
  };

  const paginatedLeads = leads;

  if (loading) {
    return <div className="py-10 text-center text-gray-500">Loading contacts...</div>;
  }

  return (
    <>
      <PageMeta
        title="Contacts | SaiFlow"
        description={isManager ? "View Contacts in SaiFlow CRM." : "View and contact your leads in SaiFlow CRM."}
      />
      <PageBreadcrumb pageTitle="Contacts" />

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-white/[0.05] mb-5">
        <button
          onClick={() => {
            setActiveTab("new");
            setCurrentPage(1);
          }}
          className={`pb-3 text-sm font-semibold border-b-2 px-4 cursor-pointer transition-colors ${activeTab === "new"
            ? "border-brand-500 text-brand-500 dark:border-brand-400 dark:text-brand-400"
            : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
            }`}
        >
          {isManager ? "New Leads" : "My New Leads"}
        </button>
        <button
          onClick={() => {
            setActiveTab("contacted");
            setCurrentPage(1);
          }}
          className={`pb-3 text-sm font-semibold border-b-2 px-4 cursor-pointer transition-colors ${activeTab === "contacted"
            ? "border-brand-500 text-brand-500 dark:border-brand-400 dark:text-brand-400"
            : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
            }`}
        >
          {isManager ? "Contacted Leads" : "My Contacted Leads"}
        </button>
      </div>

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
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] sticky top-0 bg-white dark:bg-gray-900 z-10">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  S.No
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Lead ID
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Company
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Contact Person
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Phone
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Status
                </TableCell>
                {activeTab === "new" && (
                  <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    Priority
                  </TableCell>
                )}
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Assigned To
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Action
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {paginatedLeads.length > 0 ? (
                paginatedLeads.map((lead, index) => (
                  <TableRow
                    key={lead.id}
                    className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400 font-mono text-xs">
                      {(currentPage - 1) * rowsPerPage + index + 1}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-800 dark:text-white/90">
                      <span className="font-mono text-xs tracking-wider">
                        SF-LEAD-{String(lead.id).padStart(4, "0")}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm font-medium text-gray-800 dark:text-white/90 whitespace-nowrap">
                      {lead.company}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {lead.contactPerson}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {lead.phone}
                    </TableCell>
                    <TableCell className="px-5 py-4 whitespace-nowrap">
                      <Badge size="sm" color={getStatusColor(lead.status)}>
                        <span className="font-semibold">{getStatusLabel(lead.status)}</span>
                      </Badge>
                    </TableCell>
                    {activeTab === "new" && (
                      <TableCell className="px-5 py-4 whitespace-nowrap">
                        <Badge size="sm" color={getPriorityColor(lead.priority)}>
                          {lead.priority || "—"}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {lead.assignedTo}
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      {activeTab === "new" ? (
                        <button
                          onClick={() => handleOpenCallConfirm(lead)}
                          title="Call Lead — Mark as Contacted"
                          className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10 rounded-lg transition cursor-pointer"
                        >
                          <FiPhone className="size-4" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => navigate(`/connect/${lead.id}`)}
                            title="View Lead Details"
                            className="p-1.5 text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10 rounded-lg transition cursor-pointer"
                          >
                            <FiEye className="size-4" />
                          </button>
                          <button
                            onClick={() => handleOpenOutcomeModal(lead, "Interested")}
                            title="Mark as Interested"
                            className="p-1.5 text-success-600 hover:text-success-700 hover:bg-success-50 dark:text-success-400 dark:hover:bg-success-500/10 rounded-lg transition cursor-pointer"
                          >
                            <FiCheckCircle className="size-4" />
                          </button>
                          <button
                            onClick={() => handleOpenOutcomeModal(lead, "Call Later")}
                            title="Call Later — Schedule Follow-Up"
                            className="p-1.5 text-warning-600 hover:text-warning-700 hover:bg-warning-50 dark:text-warning-400 dark:hover:bg-warning-500/10 rounded-lg transition cursor-pointer"
                          >
                            <FiClock className="size-4" />
                          </button>
                          <button
                            onClick={() => handleOpenOutcomeModal(lead, "Not Interested")}
                            title="Mark as Not Interested"
                            className="p-1.5 text-error-600 hover:text-error-700 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10 rounded-lg transition cursor-pointer"
                          >
                            <FiXCircle className="size-4" />
                          </button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={activeTab === "new" ? 9 : 8} className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No leads found.
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
            itemName="leads"
          />
        )}
      </div>

      {/* Mark as Contacted Confirmation Modal */}
      <Modal isOpen={confirmCallModal.isOpen} onClose={confirmCallModal.closeModal} className="max-w-[450px] m-4">
        <div className="relative w-full rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-4">
              <FiPhone className="size-6" />
            </div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">
              Mark as Contacted?
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Confirm that you have contacted{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {selectedLeadForCall?.company}
              </span>
              {selectedLeadForCall?.contactPerson && (
                <>
                  {" "}
                  (
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {selectedLeadForCall.contactPerson}
                  </span>
                  )
                </>
              )}
              . The lead will be moved to the Contacted Leads list.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button size="sm" variant="outline" onClick={confirmCallModal.closeModal} className="w-1/2">
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirmCallLead} disabled={saving} className="w-1/2">
              Confirm
            </Button>
          </div>
        </div>
      </Modal>

      {/* Outcome Modal (outcome is preset by the clicked action) */}
      <Modal isOpen={contactModal.isOpen} onClose={contactModal.closeModal} className="max-w-[500px] m-4">
        <div className="relative w-full rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-8">
          {/* Header */}
          <div className="pr-10 border-b border-gray-150 pb-4 mb-6 dark:border-gray-800">
            <div className="flex items-center gap-2">
              {contactResult === "Interested" && <FiCheckCircle className="size-5 text-success-500" />}
              {contactResult === "Call Later" && <FiClock className="size-5 text-warning-500" />}
              {contactResult === "Not Interested" && <FiXCircle className="size-5 text-error-500" />}
              <h4 className="text-xl font-semibold text-gray-800 dark:text-white/90">
                {contactResult === "Interested" && "Mark as Interested"}
                {contactResult === "Call Later" && "Schedule Follow-Up"}
                {contactResult === "Not Interested" && "Mark as Not Interested"}
              </h4>
            </div>
          </div>

          {/* Lead info banner */}
          {selectedLeadForContact && (
            <div className="mb-5 rounded-xl bg-gray-50 dark:bg-gray-800/50 p-3.5 border border-gray-150 dark:border-gray-700/60">
              <div className="text-sm font-semibold text-gray-800 dark:text-white/90">
                {selectedLeadForContact.company}
                {selectedLeadForContact.contactPerson && (
                  <span className="font-normal text-gray-500 dark:text-gray-400"> ({selectedLeadForContact.contactPerson})</span>
                )}
              </div>
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {selectedLeadForContact.phone}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Summary field (optional) */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Summary
              </label>
              <textarea
                value={contactSummary}
                onChange={(e) => setContactSummary(e.target.value)}
                placeholder={
                  contactResult === "Interested"
                    ? "Describe what the client was interested in..."
                    : contactResult === "Call Later"
                      ? "Why does the client need more time?..."
                      : "Provide reason details for declining..."
                }
                className="w-full min-h-[100px] rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            {/* Call Later extra fields */}
            {contactResult === "Call Later" && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Follow-Up Type <span className="text-error-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={callLaterType}
                      onChange={(e) => setCallLaterType(e.target.value)}
                      className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer"
                      style={{
                        backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                        backgroundPosition: "right 0.75rem center",
                        backgroundSize: "1.1rem",
                        backgroundRepeat: "no-repeat",
                      }}
                    >
                      {followUpTypeOptions.map((type) => (
                        <option
                          key={type}
                          value={type}
                          className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 py-1"
                        >
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <DatePicker
                      id="call-later-date"
                      label="Follow-Up Date"
                      required={true}
                      defaultDate={callLaterDate}
                      onChange={(_, dateStr) => setCallLaterDate(dateStr)}
                    />
                    {!callLaterDate && (
                      <span className="mt-1 text-xs text-error-500 block">Required</span>
                    )}
                  </div>
                  <div>
                    <DatePicker
                      id="call-later-time"
                      mode="time"
                      label="Follow-Up Time"
                      required={true}
                      defaultDate={callLaterTime}
                      onChange={(_, timeStr) => setCallLaterTime(timeStr)}
                    />
                    {!callLaterTime && (
                      <span className="mt-1 text-xs text-error-500 block">Required</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-white/[0.05]">
            <Button size="sm" variant="outline" onClick={contactModal.closeModal}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveContactOutcome} disabled={saving}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* Success Confirmation Modal */}
      <Modal isOpen={successModal.isOpen} onClose={handleCloseSuccess} className="max-w-[400px] m-4">
        <div className="relative w-full rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-50 dark:bg-success-500/10 mb-4">
            <FiCheckCircle className="size-7 text-success-600 dark:text-success-400" />
          </div>
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">Result Saved</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{savedOutcome}</p>
          <Button size="sm" onClick={handleCloseSuccess} className="w-full">
            Done
          </Button>
        </div>
      </Modal>
    </>
  );
}
