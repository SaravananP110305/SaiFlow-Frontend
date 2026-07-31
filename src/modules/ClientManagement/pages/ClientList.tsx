import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { formatDate } from "../../../utils/dateFormatter";
import { getStorage, setStorage } from "../../../utils/storage";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Badge from "../../../components/ui/badge/Badge";
import Input from "../../../components/form/input/InputField";
import { Dropdown } from "../../../components/ui/dropdown/Dropdown";
import { DropdownItem } from "../../../components/ui/dropdown/DropdownItem";
import { Pagination } from "../../../components/ui/pagination/Pagination";
import { ChevronDownIcon } from "../../../icons";
import Button from "../../../components/ui/button/Button";
import {
  FiEye,
  FiDownload,
  FiShield,
  FiCheckCircle,
  FiClock,
  FiUsers,
  FiCalendar,
  FiUser,
} from "react-icons/fi";
import { useToast } from "../../../hooks/useToast";
import { Modal } from "../../../components/ui/modal";
import DatePicker from "../../../components/form/date-picker";
import { Client, initialClients, HandoverDetails } from "../data/clientsData";
import { Proposal, initialProposals } from "../../Quotation/data/quotationsData";
import { exportProposalToPDF } from "../../Quotation/pages/QuotationList";

// ─── Constants ──────────────────────────────────────────────────────────────

const HANDOVER_STATUS_COLORS: Record<string, "warning" | "success"> = {
  Pending: "warning",
  Onboarded: "success",
};





// ─── Main Component ─────────────────────────────────────────────────────────

export default function ClientList() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // ── State ──────────────────────────────────────────────────────────────────
  const [clients, setClients] = useState<Client[]>(() => {
    const raw = getStorage<Client[]>("saiflow_clients", initialClients);
    if (raw.length > 0 && raw.some((c) => c.handoverStatus !== "Pending" && c.handoverStatus !== "Onboarded")) {
      setStorage("saiflow_clients", initialClients);
      return initialClients;
    }
    return raw;
  });

  const [proposals] = useState<Proposal[]>(() => {
    const raw = getStorage<Proposal[]>("saiflow_proposals", initialProposals);
    if (raw.length > 0 && (!raw[0].requirement || !raw[0].proposalNo)) {
      setStorage("saiflow_proposals", initialProposals);
      return initialProposals;
    }
    return raw;
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [handoverFilter, setHandoverFilter] = useState<string>("all");
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof Client>("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // ── Employees / Project Managers ───────────────────────────────────────────
  const employeesList = useMemo(() => {
    const storedUsers = getStorage<any[]>("saiflow_users", []);
    if (storedUsers && storedUsers.length > 0) {
      return storedUsers.filter((u) => u.status === "Active" || u.status === undefined);
    }
    return [
      { id: 1, name: "Jane Smith", role: "Business Development Manager" },
      { id: 2, name: "John Doe", role: "Administrator" },
      { id: 3, name: "Alice Johnson", role: "Business Development Executive" },
      { id: 4, name: "Robert Lee", role: "Presales Consultant" },
    ];
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getProposalForClient = (client: Client): Proposal | undefined => {
    if (client.latestProposalId) {
      return proposals.find((p) => p.id === client.latestProposalId);
    }
    return proposals.find((p) =>
      p.companyName.toLowerCase() === client.company.toLowerCase()
    );
  };

  const exportClientProposalPDF = (client: Client) => {
    const proposal = getProposalForClient(client);
    if (!proposal) {
      showToast("No proposal found for this client.", "error");
      return;
    }
    exportProposalToPDF(proposal, showToast);
  };

  // ── Project Handover Modal State ─────────────────────────────────────────
  const [handoverModal, setHandoverModal] = useState<{ open: boolean; client: Client | null }>({
    open: false,
    client: null,
  });
  const [handoverPM, setHandoverPM] = useState("");
  const [handoverStartDate, setHandoverStartDate] = useState("");
  const [handoverTargetDate, setHandoverTargetDate] = useState("");
  const [handoverNotes, setHandoverNotes] = useState("");
  const [handoverKickoffDate, setHandoverKickoffDate] = useState("");
  const [handoverError, setHandoverError] = useState("");

  const [showHandoverConfirm, setShowHandoverConfirm] = useState(false);

  const openHandoverModal = (client: Client) => {
    setHandoverModal({ open: true, client });
    setHandoverPM(
      client.handoverDetails?.projectManager || client.relationshipManager || client.assignedEmployee || ""
    );
    setHandoverStartDate(
      client.handoverDetails?.startDate || new Date().toISOString().split("T")[0]
    );
    setHandoverTargetDate(client.handoverDetails?.targetDate || "");
    setHandoverNotes(client.handoverDetails?.notes || "");
    setHandoverKickoffDate(client.handoverDetails?.kickoffDate || "");
    setHandoverError("");
    setShowHandoverConfirm(false);
  };

  const closeHandoverModal = () => {
    setHandoverModal({ open: false, client: null });
    setShowHandoverConfirm(false);
  };

  const handleSaveHandover = () => {
    const { client } = handoverModal;
    if (!client) return;

    if (!handoverPM.trim() || !handoverNotes.trim() || !handoverStartDate) {
      setHandoverError("Project Manager, Start Date, and Handover Notes are required.");
      return;
    }

    setShowHandoverConfirm(true);
  };

  const executeSaveHandover = () => {
    const { client } = handoverModal;
    if (!client) return;

    const updatedDetails: HandoverDetails = {
      projectManager: handoverPM.trim(),
      startDate: handoverStartDate,
      targetDate: handoverTargetDate || undefined,
      notes: handoverNotes.trim(),
      kickoffDate: handoverKickoffDate || undefined,
      completedAt: new Date().toISOString(),
    };

    const updated = clients.map((c) =>
      c.id === client.id
        ? {
          ...c,
          handoverStatus: "Onboarded" as const,
          handoverDetails: updatedDetails,
        }
        : c
    );
    setClients(updated);
    setStorage("saiflow_clients", updated);
    showToast(`Project handover details for "${client.company}" saved successfully.`, "success");
    closeHandoverModal();
  };


  const processedClients = useMemo(() => {
    let result = [...clients];

    // Only show converted clients (those with a conversionDate)
    result = result.filter((c) => c.conversionDate);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.company.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query) ||
          c.phone.includes(query)
      );
    }

    if (handoverFilter !== "all") {
      result = result.filter((c) => c.handoverStatus === handoverFilter);
    }

    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
      const strA = String(aVal ?? "").toLowerCase();
      const strB = String(bVal ?? "").toLowerCase();
      if (strA < strB) return sortOrder === "asc" ? -1 : 1;
      if (strA > strB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [clients, searchQuery, handoverFilter, sortField, sortOrder]);

  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return processedClients.slice(start, start + rowsPerPage);
  }, [processedClients, currentPage, rowsPerPage]);

  // Bulk actions
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const selectAll = useMemo(() => paginatedClients.length > 0 && selectedIds.length === paginatedClients.length, [paginatedClients, selectedIds]);
  const isIndeterminate = useMemo(() => selectedIds.length > 0 && selectedIds.length < paginatedClients.length, [paginatedClients, selectedIds]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedClients.map(c => c.id));
    }
  };

  const handleBulkOnboard = () => {
    const updated = clients.map(c =>
      selectedIds.includes(c.id) ? { ...c, handoverStatus: "Onboarded" as const } : c
    );
    setClients(updated);
    setStorage("saiflow_clients", updated);
    showToast(`${selectedIds.length} client(s) marked as Onboarded.`, "success");
    setSelectedIds([]);
  };

  const totalPages = Math.ceil(processedClients.length / rowsPerPage);

  // ── Render ─────────────────────────────────────────────────────────────────

  const renderHandoverStatusIcon = (status: string) => {
    switch (status) {
      case "Onboarded": return <FiCheckCircle className="size-3.5" />;
      default: return <FiClock className="size-3.5" />;
    }
  };

  return (
    <>
      <PageMeta
        title="Client Management | SaiFlow"
        description="View and manage all converted clients with proposal handover tracking."
      />
      <PageBreadcrumb pageTitle="Client Management" />

      {/* Filters & Actions */}
      <div className="flex flex-col gap-3 mb-4 lg:flex-row lg:items-center lg:justify-between">
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
              onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
              className="flex items-center justify-between h-11 w-48 rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5"
            >
              <span className="truncate">Onboarding: {handoverFilter === "all" ? "All" : handoverFilter}</span>
              <ChevronDownIcon className="w-4 h-4 text-gray-500 shrink-0 ml-2" />
            </button>
            <Dropdown
              isOpen={isStatusFilterOpen}
              onClose={() => setIsStatusFilterOpen(false)}
              className="left-0 w-44 p-1 mt-2"
            >
              <ul className="flex flex-col gap-0.5">
                <li>
                  <DropdownItem
                    onItemClick={() => { setHandoverFilter("all"); setCurrentPage(1); setIsStatusFilterOpen(false); }}
                    className={`cursor-pointer rounded-lg text-left w-full px-3 py-2 text-sm ${handoverFilter === "all" ? "bg-brand-500 text-white font-medium" : "text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"}`}
                  >
                    All
                  </DropdownItem>
                </li>
                {(["Pending", "Onboarded"] as const).map((st) => (
                  <li key={st}>
                    <DropdownItem
                      onItemClick={() => { setHandoverFilter(st); setCurrentPage(1); setIsStatusFilterOpen(false); }}
                      className={`cursor-pointer rounded-lg text-left w-full px-3 py-2 text-sm ${handoverFilter === st ? "bg-brand-500 text-white font-medium" : "text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"}`}
                    >
                      {st}
                    </DropdownItem>
                  </li>
                ))}
              </ul>
            </Dropdown>
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
              className="flex items-center justify-between h-11 w-52 rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5"
            >
              <span className="truncate text-left flex-1">Sort by: {sortField === "id" ? "Client ID" : sortField === "name" ? "Client Name" : sortField === "company" ? "Company" : sortField === "conversionDate" ? "Conversion Date" : "Default"} ({sortOrder === "asc" ? "Asc" : "Desc"})</span>
              <ChevronDownIcon className="w-4 h-4 text-gray-500 shrink-0 ml-2" />
            </button>
            <Dropdown
              isOpen={isSortDropdownOpen}
              onClose={() => setIsSortDropdownOpen(false)}
              className="left-0 w-52 p-1 mt-2"
            >
              <ul className="flex flex-col gap-0.5 max-h-60 overflow-y-auto custom-scrollbar">
                {[
                  { field: "id", order: "asc", label: "Client ID (Asc)" },
                  { field: "id", order: "desc", label: "Client ID (Desc)" },
                  { field: "name", order: "asc", label: "Client Name (Asc)" },
                  { field: "name", order: "desc", label: "Client Name (Desc)" },
                  { field: "company", order: "asc", label: "Company (Asc)" },
                  { field: "company", order: "desc", label: "Company (Desc)" },
                  { field: "conversionDate", order: "asc", label: "Conversion Date (Asc)" },
                  { field: "conversionDate", order: "desc", label: "Conversion Date (Desc)" },
                ].map((opt) => (
                  <li key={`${opt.field}-${opt.order}`}>
                    <DropdownItem
                      onItemClick={() => {
                        setSortField(opt.field as keyof Client);
                        setSortOrder(opt.order as "asc" | "desc");
                        setCurrentPage(1);
                        setIsSortDropdownOpen(false);
                      }}
                      className={`cursor-pointer rounded-lg text-left w-full px-3 py-2 text-sm ${sortField === opt.field && sortOrder === opt.order ? "bg-brand-500 text-white font-medium" : "text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"}`}
                    >
                      {opt.label}
                    </DropdownItem>
                  </li>
                ))}
              </ul>
            </Dropdown>
          </div>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between gap-3 mb-3 px-4 py-3 rounded-xl border border-brand-200 bg-brand-50 dark:border-brand-500/20 dark:bg-brand-500/10">
          <span className="text-sm font-medium text-brand-700 dark:text-brand-400">
            {selectedIds.length} selected
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="primary" onClick={handleBulkOnboard}>
              Mark Onboarded
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelectedIds([])}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Select All Bar for Cards */}
      {paginatedClients.length > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-2 bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.05] rounded-lg">
          <input
            type="checkbox"
            checked={selectAll}
            ref={(el) => { if (el) el.indeterminate = isIndeterminate; }}
            onChange={toggleSelectAll}
            className="rounded border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
            id="select-all-clients"
          />
          <label htmlFor="select-all-clients" className="text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer">
            Select All Clients
          </label>
        </div>
      )}

      {/* Clients Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {paginatedClients.map((client) => {
          const isSelected = selectedIds.includes(client.id);
          return (
            <div
              key={client.id}
              className={`relative rounded-2xl border bg-white p-5 dark:bg-white/[0.03] transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between ${isSelected
                ? "border-brand-500 dark:border-brand-500/50 ring-1 ring-brand-500/20"
                : "border-gray-200 dark:border-white/[0.05]"
                }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Select Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(client.id)}
                    className="rounded border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer shrink-0"
                  />
                  {/* Avatar / Initial */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold text-sm">
                    {client.company.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-850 dark:text-white/95 truncate" title={client.company}>
                      {client.company}
                    </h3>
                    <span className="text-xs text-gray-400 truncate block">
                      {client.industry || "Information Technology"}
                    </span>
                  </div>
                </div>

                {/* Handover Status Badge */}
                <div className="shrink-0">
                  <Badge size="sm" color={HANDOVER_STATUS_COLORS[client.handoverStatus] || "warning"}>
                    <span className="flex items-center gap-1 font-medium">
                      {renderHandoverStatusIcon(client.handoverStatus)}
                      {client.handoverStatus}
                    </span>
                  </Badge>
                </div>
              </div>

              {/* Card Content / Details */}
              <div className="space-y-3 mb-5 flex-1">
                {/* Client ID */}
                <div className="flex justify-between items-center text-xs border-b border-gray-50 dark:border-white/[0.02] pb-1.5">
                  <span className="text-gray-400">Client ID</span>
                  <span className="font-mono text-gray-650 dark:text-gray-300 font-medium">
                    {`SF-CLI-${String(client.id).padStart(4, "0")}`}
                  </span>
                </div>

                {/* Primary Contact */}
                <div className="flex justify-between items-center text-xs border-b border-gray-50 dark:border-white/[0.02] pb-1.5">
                  <span className="text-gray-400">Contact Person</span>
                  <span className="text-gray-650 dark:text-gray-300 font-medium text-right truncate max-w-[150px]">
                    {client.name} <span className="text-[10px] text-gray-400 font-normal">({client.designation || "—"})</span>
                  </span>
                </div>

                {/* Contact Phone */}
                <div className="flex justify-between items-center text-xs border-b border-gray-50 dark:border-white/[0.02] pb-1.5">
                  <span className="text-gray-400">Contact Number</span>
                  <span className="text-gray-650 dark:text-gray-300 font-medium font-mono">
                    {client.phone}
                  </span>
                </div>

                {/* Contact Email */}
                <div className="flex justify-between items-center text-xs border-b border-gray-50 dark:border-white/[0.02] pb-1.5">
                  <span className="text-gray-400">Email Address</span>
                  <span className="text-gray-650 dark:text-gray-300 font-medium truncate max-w-[170px]" title={client.email}>
                    {client.email}
                  </span>
                </div>

                {/* Conversion Date */}
                <div className="flex justify-between items-center text-xs border-b border-gray-50 dark:border-white/[0.02] pb-1.5">
                  <span className="text-gray-400">Conversion Date</span>
                  <span className="text-gray-650 dark:text-gray-300 font-medium flex items-center gap-1">
                    <FiCalendar className="size-3 text-gray-400" />
                    {client.conversionDate ? formatDate(client.conversionDate) : "—"}
                  </span>
                </div>

                {/* Assigned Employee */}
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400">Assigned To</span>
                  <span className="text-gray-650 dark:text-gray-300 font-medium flex items-center gap-1.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                      <FiUser className="size-2.5" />
                    </span>
                    {client.assignedEmployee || client.relationshipManager || "—"}
                  </span>
                </div>
              </div>

              {/* Card Actions Footer */}
              <div className="flex items-center justify-end gap-2 pt-3.5 border-t border-gray-105 dark:border-white/[0.05]">
                <button
                  onClick={() => navigate(`/clients/${client.id}`)}
                  className="p-2 text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10 rounded-lg border border-sky-200 dark:border-sky-800/50 transition cursor-pointer"
                  title="View Details"
                >
                  <FiEye className="size-4" />
                </button>
                <button
                  onClick={() => exportClientProposalPDF(client)}
                  className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10 rounded-lg border border-emerald-200 dark:border-emerald-800/50 transition cursor-pointer"
                  title="Download Proposal PDF"
                >
                  <FiDownload className="size-4" />
                </button>
                <button
                  onClick={() => openHandoverModal(client)}
                  className="p-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10 rounded-lg border border-indigo-200 dark:border-indigo-800/50 transition cursor-pointer"
                  title="Handover project details"
                >
                  <FiShield className="size-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {paginatedClients.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-12 text-center">
          <div className="flex flex-col items-center gap-2">
            <FiUsers className="size-10 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No clients found.</p>
          </div>
        </div>
      )}

      {processedClients.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={processedClients.length}
          rowsPerPage={rowsPerPage}
          onPageChange={setCurrentPage}
          onRowsPerPageChange={(rows) => { setRowsPerPage(rows); setCurrentPage(1); }}
          itemName="clients"
        />
      )}

      {/* ── Project Handover Details Modal ── */}
      <Modal isOpen={handoverModal.open} onClose={closeHandoverModal} className="max-w-[540px] m-4">
        <div className="relative w-full rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-8">
          <div className="mb-6 space-y-4">
            <div>
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-1 flex items-center gap-2">
                <FiShield className="size-5 text-brand-500" /> Project handover details
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enter project management and scope handover details for{" "}
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {handoverModal.client?.company}
                </span>.
              </p>
            </div>

            {/* Client summary box */}
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3.5 dark:border-white/[0.05] dark:bg-white/[0.03]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium">Contact: <strong className="text-gray-700 dark:text-gray-300">{handoverModal.client?.name}</strong></span>
                <span className="text-gray-500 font-mono">{handoverModal.client?.phone}</span>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Assigned Project Manager / Team Lead <span className="text-error-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={handoverPM}
                    onChange={(e) => {
                      setHandoverPM(e.target.value);
                      if (handoverError) setHandoverError("");
                    }}
                    className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                      backgroundPosition: "right 0.75rem center",
                      backgroundSize: "1.1rem",
                      backgroundRepeat: "no-repeat",
                    }}
                  >
                    <option value="" disabled className="text-gray-400 dark:bg-gray-900 dark:text-gray-500">
                      Select Project Manager...
                    </option>
                    {employeesList.map((emp) => (
                      <option
                        key={emp.id}
                        value={emp.name}
                        className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 py-1"
                      >
                        {emp.name} {emp.role ? `(${emp.role})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Project Start Date <span className="text-error-500">*</span>
                  </label>
                  <DatePicker
                    id="handover-start-date"
                    defaultDate={handoverStartDate}
                    onChange={(_: Date[], dateStr: string) => {
                      setHandoverStartDate(dateStr);
                      if (handoverError) setHandoverError("");
                    }}
                    placeholder="Select start date"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Target Delivery Date
                  </label>
                  <DatePicker
                    id="handover-target-date"
                    defaultDate={handoverTargetDate}
                    onChange={(_: Date[], dateStr: string) => setHandoverTargetDate(dateStr)}
                    placeholder="Select delivery date"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Handover Notes & Scope Summary <span className="text-error-500">*</span>
                </label>
                <textarea
                  value={handoverNotes}
                  onChange={(e) => {
                    setHandoverNotes(e.target.value);
                    if (handoverError) setHandoverError("");
                  }}
                  placeholder="Enter key deliverables, repository link, client expectations, or handover instructions..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Kickoff Meeting Date (Optional)
                </label>
                <DatePicker
                  id="handover-kickoff-date"
                  defaultDate={handoverKickoffDate}
                  onChange={(_: Date[], dateStr: string) => setHandoverKickoffDate(dateStr)}
                  placeholder="Select kickoff date"
                />
              </div>

              {handoverError && (
                <p className="text-xs text-error-500 font-medium">{handoverError}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 dark:border-white/[0.05]">
            <Button size="sm" variant="outline" onClick={closeHandoverModal} className="w-1/2">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveHandover} className="w-1/2">
              Complete handover
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Handover Confirmation Modal ── */}
      <Modal isOpen={showHandoverConfirm} onClose={() => setShowHandoverConfirm(false)} className="max-w-[460px] m-4">
        <div className="relative w-full rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-8">
          <div className="mb-6 space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              <FiShield className="size-6" />
            </div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Confirm project handover
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to complete project handover for{" "}
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {handoverModal.client?.company}
              </span>? Assigned project lead:{" "}
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {handoverPM}
              </span>.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 dark:border-white/[0.05]">
            <Button size="sm" variant="outline" onClick={() => setShowHandoverConfirm(false)} className="w-1/2">
              Cancel
            </Button>
            <Button size="sm" onClick={executeSaveHandover} className="w-1/2">
              Confirm handover
            </Button>
          </div>
        </div>
      </Modal>

    </>
  );
}
