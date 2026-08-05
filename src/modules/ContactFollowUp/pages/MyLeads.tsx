import { useState, useMemo, useEffect } from "react";
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
import { ChevronDownIcon, ChevronUpIcon } from "../../../icons";
import {
  FiEye,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiPhone,
} from "react-icons/fi";
import { getStatusColor, getPriorityColor, type Lead } from "../../LeadManagement/data/leadsData";
import { useAuth } from "../../../context/AuthContext";
import { leadService } from "../../../services/leadService";
import { useToast } from "../../../hooks/useToast";
import { Modal } from "../../../components/ui/modal";
import { useModal } from "../../../hooks/useModal";
import Button from "../../../components/ui/button/Button";

export default function MyLeads() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { user } = useAuth();
  const isAdmin = user?.role?.name === "Administrator";

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const data = await leadService.getLeads({ limit: 100 });
      if (data && Array.isArray(data.data)) {
        const mapped = data.data.map((l: any) => ({
          ...l,
          company: l.company?.name || l.title || "",
          contactPerson: l.contactPerson || "",
          assignedTo: l.assignedTo?.name || "Unassigned",
          status: l.status,
        }));
        
        if (user?.role?.name === "Administrator") {
          setLeads(mapped);
        } else {
          setLeads(mapped.filter((l: any) => l.assignedTo === user?.name));
        }
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
  }, [user]);

  const [searchQuery, setSearchQuery] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof Lead>("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [activeTab, setActiveTab] = useState<"new" | "contacted">("new");

  type ContactResult = "Interested" | "Call Later" | "Not Interested";

  const contactModal = useModal();
  const successModal = useModal();
  const [selectedLeadForContact, setSelectedLeadForContact] = useState<Lead | null>(null);
  const [contactResult, setContactResult] = useState<ContactResult | null>(null);
  const [contactSummary, setContactSummary] = useState("");
  const [savedOutcome, setSavedOutcome] = useState<string | null>(null);
  const [callLaterDate, setCallLaterDate] = useState("");
  const [callLaterTime, setCallLaterTime] = useState("");
  const [callLaterType, setCallLaterType] = useState("Call");

  const followUpTypeOptions = ["Call", "Meeting", "Email", "WhatsApp"];

  const handleCallLead = async (lead: Lead) => {
    try {
      await leadService.updateLead(lead.id, { status: "Contacted" });
      showToast(`${lead.company} marked as Contacted — moved to Contacted Leads.`, "success");
      setActiveTab("contacted");
      setCurrentPage(1);
      fetchLeads();
    } catch (err) {
      showToast("Failed to mark lead as contacted.", "error");
    }
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
    if (!selectedLeadForContact) return;

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

    let newStatus: string;
    let outcomeMessage: string;

    if (contactResult === "Interested") {
      newStatus = "Qualified";
      outcomeMessage = "Marked as Interested — lead moved to Qualified";
    } else if (contactResult === "Call Later") {
      newStatus = "Scheduled";
      outcomeMessage = "Follow-up scheduled — lead moved to Scheduled";
    } else if (contactResult === "Not Interested") {
      newStatus = "Lost";
      outcomeMessage = "Marked as Not Interested — lead moved to Lost";
    } else {
      return;
    }

    try {
      await leadService.updateLead(selectedLeadForContact.id, {
        status: newStatus as any,
        requirements: contactSummary.trim() || undefined
      });

      setSavedOutcome(outcomeMessage);
      showToast("Contact outcome saved successfully.", "success");
      contactModal.closeModal();
      successModal.openModal();
      fetchLeads();
    } catch (err) {
      showToast("Failed to save contact outcome.", "error");
    }
  };

  const handleSort = (field: keyof Lead) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const processedLeads = useMemo(() => {
    let result = leads;
    if (activeTab === "new") {
      result = result.filter((l) => l.status === "New");
    } else {
      result = result.filter((l) => l.status === "Contacted");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.company.toLowerCase().includes(q) ||
          l.contactPerson.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          l.phone.toLowerCase().includes(q) ||
          l.status.toLowerCase().includes(q)
      );
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
  }, [leads, activeTab, searchQuery, sortField, sortOrder]);

  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return processedLeads.slice(start, start + rowsPerPage);
  }, [processedLeads, currentPage, rowsPerPage]);

  const totalItems = processedLeads.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);

  const renderSortHeader = (label: string, field: keyof Lead) => {
    const isActive = sortField === field;
    return (
      <button
        onClick={() => handleSort(field)}
        className="flex items-center gap-1.5 font-medium hover:text-gray-900 dark:hover:text-white cursor-pointer"
      >
        {label}
        <span className="flex flex-col">
          <ChevronUpIcon
            className={`w-3 h-3 -mb-1 transition-colors ${isActive && sortOrder === "asc" ? "text-brand-500" : "text-gray-300 dark:text-gray-600"
              }`}
          />
          <ChevronDownIcon
            className={`w-3 h-3 transition-colors ${isActive && sortOrder === "desc" ? "text-brand-500" : "text-gray-300 dark:text-gray-600"
              }`}
          />
        </span>
      </button>
    );
  };

  if (loading) {
    return <div className="py-10 text-center text-gray-500">Loading contacts...</div>;
  }

  return (
    <>
      <PageMeta
        title={isAdmin ? "Contacts | SaiFlow" : "Contacts | SaiFlow"}
        description={isAdmin ? "View Contacts in SaiFlow CRM." : "View and contact your leads in SaiFlow CRM."}
      />
      <PageBreadcrumb pageTitle={isAdmin ? "Contacts" : "Contacts"} />

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
          {isAdmin ? "New Leads" : "My New Leads"}
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
          {isAdmin ? "Contacted Leads" : "My Contacted Leads"}
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
                  {renderSortHeader("Phone", "phone")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Status", "status")}
                </TableCell>
                {activeTab === "new" && (
                  <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {renderSortHeader("Priority", "priority")}
                  </TableCell>
                )}
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {renderSortHeader("Assigned To", "assignedTo")}
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  Action
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {paginatedLeads.length > 0 ? (
                paginatedLeads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400 font-mono text-xs">
                      {lead.id}
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
                        <span className="font-semibold">{lead.status}</span>
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
                          onClick={() => handleCallLead(lead)}
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
            <Button size="sm" onClick={handleSaveContactOutcome}>
              Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* Success Confirmation Modal */}
      <Modal isOpen={successModal.isOpen} onClose={successModal.closeModal} className="max-w-[400px] m-4">
        <div className="relative w-full rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-50 dark:bg-success-500/10 mb-4">
            <FiCheckCircle className="size-7 text-success-600 dark:text-success-400" />
          </div>
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">Result Saved</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{savedOutcome}</p>
          <Button size="sm" onClick={successModal.closeModal} className="w-full">
            Done
          </Button>
        </div>
      </Modal>
    </>
  );
}
