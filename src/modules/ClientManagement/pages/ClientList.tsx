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
import { FiEye,
  FiDownload,
  FiShield,
  FiCheckCircle,
  FiClock,
  FiUsers,
  FiCalendar,
  FiUser,
} from "react-icons/fi";
import { useToast } from "../../../hooks/useToast";
import { Client, initialClients } from "../data/clientsData";
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

  // ── Onboarding / Handover Toggle ───────────────────────────────────────────

  const toggleOnboardingStatus = (client: Client) => {
    const newStatus = client.handoverStatus === "Onboarded" ? "Pending" : "Onboarded";
    const updated = clients.map((c) =>
      c.id === client.id
        ? {
            ...c,
            handoverStatus: newStatus as "Pending" | "Onboarded",
          }
        : c
    );
    setClients(updated);
    setStorage("saiflow_clients", updated);
    showToast(`Client "${client.company}" status updated to ${newStatus}`, "success");
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
              className={`relative rounded-2xl border bg-white p-5 dark:bg-white/[0.03] transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between ${
                isSelected
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
                  onClick={() => toggleOnboardingStatus(client)}
                  className="p-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10 rounded-lg border border-indigo-200 dark:border-indigo-800/50 transition cursor-pointer"
                  title={client.handoverStatus === "Onboarded" ? "Mark Pending" : "Mark Onboarded"}
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


    </>
  );
}
