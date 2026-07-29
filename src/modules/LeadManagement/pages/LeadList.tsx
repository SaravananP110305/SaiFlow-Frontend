import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";

import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import { Modal } from "../../../components/ui/modal";
import { useModal } from "../../../hooks/useModal";
import { Dropdown } from "../../../components/ui/dropdown/Dropdown";
import { DropdownItem } from "../../../components/ui/dropdown/DropdownItem";
import { Pagination } from "../../../components/ui/pagination/Pagination";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "../../../components/ui/table";
import { ChevronDownIcon, ChevronUpIcon } from "../../../icons";
import { FiEye, FiEdit, FiTrash2, FiPlus, FiUpload } from "react-icons/fi";
import { useToast } from "../../../hooks/useToast";
import { getStorage, setStorage } from "../../../utils/storage";
import * as XLSX from "xlsx";
import {
  initialLeads,
  ASSIGNEES,
  type Lead,
  type LeadPriority,
  type LeadStatus,
} from "../data/leadsData";
import { LEAD_SOURCES, INDUSTRIES } from "../../Master/data/masterData";

export default function LeadList() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const uploadModal = useModal();
  const deleteModal = useModal();



  const [leads, setLeads] = useState<Lead[]>(() => {
    const list = getStorage<Lead[]>("saiflow_leads", initialLeads);
    // Auto-clean any corrupt binary rows loaded previously from excel upload attempt
    const cleaned = list.filter(
      (l) =>
        l.company &&
        !l.company.includes("[Content_Types]") &&
        !l.company.includes("xml") &&
        !l.company.includes("xl/") &&
        !l.email.includes("xml")
    );
    if (cleaned.length !== list.length) {
      setStorage("saiflow_leads", cleaned);
    }
    return cleaned;
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof Lead>("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  const [industryFilter, setIndustryFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [isIndustryOpen, setIsIndustryOpen] = useState(false);
  const [isSourceOpen, setIsSourceOpen] = useState(false);

  // Filter dropdown open states
  const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);

  // Upload dialog state
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleOpenDelete = (lead: Lead) => {
    setSelectedLead(lead);
    deleteModal.openModal();
  };

  const handleDeleteConfirm = () => {
    if (selectedLead) {
      const updated = leads.filter((l) => l.id !== selectedLead.id);
      setLeads(updated);
      setStorage("saiflow_leads", updated);
      // Log deletion activity
      const leadLogs = getStorage<any[]>("saiflow_lead_logs", []);
      setStorage("saiflow_lead_logs", [...leadLogs, {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        leadId: selectedLead.id,
        action: "lead_deleted",
        description: `Lead "${selectedLead.company}" was deleted.`,
        timestamp: new Date().toISOString(),
      }]);
      showToast(`Lead "${selectedLead.company}" deleted successfully.`, "success");
    }
    deleteModal.closeModal();
  };

  const handleDirectAssign = (leadId: number, newAssignee: string) => {
    const prevLead = leads.find(l => l.id === leadId);
    const prevAssignee = prevLead?.assignedTo || "Unknown";
    const updated = leads.map((l) =>
      l.id === leadId ? { ...l, assignedTo: newAssignee } : l
    );
    setLeads(updated);
    setStorage("saiflow_leads", updated);
    // Log reassignment activity
    const leadLogs = getStorage<any[]>("saiflow_lead_logs", []);
    setStorage("saiflow_lead_logs", [...leadLogs, {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      leadId,
      action: "lead_reassigned",
      description: `Lead reassigned from ${prevAssignee} to ${newAssignee}.`,
      timestamp: new Date().toISOString(),
      operator: newAssignee,
    }]);
    showToast(`Lead assigned to ${newAssignee} successfully.`, "success");
  };

  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        "Company Name": "Google LLC",
        "Contact Person": "Larry Page",
        "Designation": "Chief Executive Officer",
        "Mobile Number": "9876543210",
        "Alternate Mobile": "9876543219",
        "Email Address": "larry@google.com",
        "Alternate Email": "larry.page@google.com",
        "Website": "https://google.com",
        "Industry": "Information Technology",
        "Company Type": "Private Limited",
        "Address Line 1": "1600 Amphitheatre Parkway",
        "Country": "United States",
        "State": "California",
        "City": "San Francisco",
        "Pincode": "94043",
        "Lead Source": "Website",
        "Priority": "High",
        "Lead Owner": ASSIGNEES[0] || "John Doe"
      },
      {
        "Company Name": "Microsoft Corp",
        "Contact Person": "Satya Nadella",
        "Designation": "CEO",
        "Mobile Number": "9876543211",
        "Alternate Mobile": "",
        "Email Address": "satya@microsoft.com",
        "Alternate Email": "",
        "Website": "https://microsoft.com",
        "Industry": "Information Technology",
        "Company Type": "Public Limited",
        "Address Line 1": "One Microsoft Way",
        "Country": "United States",
        "State": "Washington",
        "City": "Seattle",
        "Pincode": "98052",
        "Lead Source": "Referral",
        "Priority": "Medium",
        "Lead Owner": ASSIGNEES[1] || "Jane Smith"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads Template");
    XLSX.writeFile(workbook, "saiflow_leads_sample_template.xlsx");
    showToast("Sample Excel template downloaded successfully.", "success");
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

  const assigneeOptions = [
    { value: "all", label: "All assignees" },
    ...ASSIGNEES.map((a) => ({ value: a, label: a })),
  ];

  const industryOptions = [
    { value: "all", label: "All industries" },
    ...getStorage("saiflow_master_industries", INDUSTRIES).filter((i: any) => i.status === "Active").map((i: any) => ({ value: i.name, label: i.name }))
  ];

  const sourceOptions = [
    { value: "all", label: "All sources" },
    ...getStorage("saiflow_master_lead_sources", LEAD_SOURCES).filter((s: any) => s.status === "Active").map((s: any) => ({ value: s.name, label: s.name }))
  ];

  const processedLeads = useMemo(() => {
    let result = [...leads];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.company.toLowerCase().includes(q) ||
          l.contactPerson.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          l.phone.toLowerCase().includes(q) ||
          l.assignedTo.toLowerCase().includes(q) ||
          l.status.toLowerCase().includes(q)
      );
    }

    if (assigneeFilter !== "all") {
      result = result.filter((l) => l.assignedTo === assigneeFilter);
    }

    if (industryFilter !== "all") {
      result = result.filter((l) => l.industry === industryFilter);
    }

    if (sourceFilter !== "all") {
      result = result.filter((l) => l.source === sourceFilter);
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
  }, [leads, searchQuery, assigneeFilter, industryFilter, sourceFilter, sortField, sortOrder]);

  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return processedLeads.slice(start, start + rowsPerPage);
  }, [processedLeads, currentPage, rowsPerPage]);

  // Bulk actions
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkAssignee, setBulkAssignee] = useState<string>("");
  const [showBulkAssign, setShowBulkAssign] = useState(false);

  const selectAll = useMemo(() => paginatedLeads.length > 0 && selectedIds.length === paginatedLeads.length, [paginatedLeads, selectedIds]);
  const isIndeterminate = useMemo(() => selectedIds.length > 0 && selectedIds.length < paginatedLeads.length, [paginatedLeads, selectedIds]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedLeads.map(l => l.id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    const updated = leads.filter(l => !selectedIds.includes(l.id));
    setLeads(updated);
    setStorage("saiflow_leads", updated);
    showToast(`${selectedIds.length} lead(s) deleted successfully.`, "success");
    setSelectedIds([]);
  };

  const handleBulkReassign = () => {
    if (selectedIds.length === 0 || !bulkAssignee) return;
    const updated = leads.map(l =>
      selectedIds.includes(l.id) ? { ...l, assignedTo: bulkAssignee } : l
    );
    setLeads(updated);
    setStorage("saiflow_leads", updated);
    showToast(`${selectedIds.length} lead(s) reassigned to ${bulkAssignee}.`, "success");
    setSelectedIds([]);
    setBulkAssignee("");
    setShowBulkAssign(false);
  };

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
            className={`w-3 h-3 -mb-1 transition-colors ${isActive && sortOrder === "asc"
                ? "text-brand-500"
                : "text-gray-300 dark:text-gray-600"
              }`}
          />
          <ChevronDownIcon
            className={`w-3 h-3 transition-colors ${isActive && sortOrder === "desc"
                ? "text-brand-500"
                : "text-gray-300 dark:text-gray-600"
              }`}
          />
        </span>
      </button>
    );
  };

  return (
    <>
      <PageMeta
        title="Leads | SaiFlow"
        description="View and manage all leads in SaiFlow CRM."
      />
      <PageBreadcrumb pageTitle="Leads" />

      {/* Control Panel */}
      <div className="flex flex-col gap-4 mb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full lg:w-auto">
          {/* Search */}
          <div className="w-full sm:w-64">
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Assignee Filter */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsAssigneeOpen(!isAssigneeOpen);
                }}
                className="flex items-center justify-between h-11 w-40 rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer dropdown-toggle hover:bg-gray-50 dark:hover:bg-white/5"
              >
                <span className="truncate">
                  {assigneeOptions.find((o) => o.value === assigneeFilter)?.label}
                </span>
                <ChevronDownIcon className="w-4 h-4 text-gray-500 shrink-0 ml-1" />
              </button>
              <Dropdown
                isOpen={isAssigneeOpen}
                onClose={() => setIsAssigneeOpen(false)}
                className="left-0 right-auto w-44 p-1 mt-2"
              >
                <ul className="flex flex-col gap-0.5">
                  {assigneeOptions.map((opt) => (
                    <li key={opt.value}>
                      <DropdownItem
                        onItemClick={() => {
                          setAssigneeFilter(opt.value);
                          setCurrentPage(1);
                          setIsAssigneeOpen(false);
                        }}
                        className={`cursor-pointer rounded-lg text-left w-full px-3 py-2 text-sm ${assigneeFilter === opt.value
                            ? "bg-brand-500 text-white font-medium"
                            : "text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                          }`}
                      >
                        {opt.label}
                      </DropdownItem>
                    </li>
                  ))}
                </ul>
              </Dropdown>
            </div>

            {/* Industry Filter */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsIndustryOpen(!isIndustryOpen);
                  setIsAssigneeOpen(false);
                  setIsSourceOpen(false);
                }}
                className="flex items-center justify-between h-11 w-40 rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer dropdown-toggle hover:bg-gray-50 dark:hover:bg-white/5"
              >
                <span className="truncate">
                  {industryOptions.find((o) => o.value === industryFilter)?.label}
                </span>
                <ChevronDownIcon className="w-4 h-4 text-gray-500 shrink-0 ml-1" />
              </button>
              <Dropdown
                isOpen={isIndustryOpen}
                onClose={() => setIsIndustryOpen(false)}
                className="left-0 right-auto w-44 p-1 mt-2"
              >
                <ul className="flex flex-col gap-0.5 max-h-60 overflow-y-auto custom-scrollbar">
                  {industryOptions.map((opt) => (
                    <li key={opt.value}>
                      <DropdownItem
                        onItemClick={() => {
                          setIndustryFilter(opt.value);
                          setCurrentPage(1);
                          setIsIndustryOpen(false);
                        }}
                        className={`cursor-pointer rounded-lg text-left w-full px-3 py-2 text-sm ${industryFilter === opt.value
                            ? "bg-brand-500 text-white font-medium"
                            : "text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                          }`}
                      >
                        {opt.label}
                      </DropdownItem>
                    </li>
                  ))}
                </ul>
              </Dropdown>
            </div>

            {/* Source Filter */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsSourceOpen(!isSourceOpen);
                  setIsAssigneeOpen(false);
                  setIsIndustryOpen(false);
                }}
                className="flex items-center justify-between h-11 w-40 rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer dropdown-toggle hover:bg-gray-50 dark:hover:bg-white/5"
              >
                <span className="truncate">
                  {sourceOptions.find((o) => o.value === sourceFilter)?.label}
                </span>
                <ChevronDownIcon className="w-4 h-4 text-gray-500 shrink-0 ml-1" />
              </button>
              <Dropdown
                isOpen={isSourceOpen}
                onClose={() => setIsSourceOpen(false)}
                className="left-0 right-auto w-44 p-1 mt-2"
              >
                <ul className="flex flex-col gap-0.5 max-h-60 overflow-y-auto custom-scrollbar">
                  {sourceOptions.map((opt) => (
                    <li key={opt.value}>
                      <DropdownItem
                        onItemClick={() => {
                          setSourceFilter(opt.value);
                          setCurrentPage(1);
                          setIsSourceOpen(false);
                        }}
                        className={`cursor-pointer rounded-lg text-left w-full px-3 py-2 text-sm ${sourceFilter === opt.value
                            ? "bg-brand-500 text-white font-medium"
                            : "text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                          }`}
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

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={uploadModal.openModal}
            startIcon={<FiUpload className="size-4" />}
            className="h-11 px-4 py-2.5"
          >
            Upload Excel
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/leads/add")}
            startIcon={<FiPlus className="size-4" />}
            className="h-11 px-4 py-2.5"
          >
            Add lead
          </Button>
        </div>
      </div>



      {/* Bulk Actions Toolbar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between gap-3 mb-3 px-4 py-3 rounded-xl border border-brand-200 bg-brand-50 dark:border-brand-500/20 dark:bg-brand-500/10">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-brand-700 dark:text-brand-400">
              {selectedIds.length} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            {showBulkAssign ? (
              <div className="flex items-center gap-2">
                <select
                  value={bulkAssignee}
                  onChange={(e) => setBulkAssignee(e.target.value)}
                  className="h-9 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                >
                  <option value="">Select assignee...</option>
                  {ASSIGNEES.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                <Button size="sm" onClick={handleBulkReassign} disabled={!bulkAssignee}>
                  Confirm
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowBulkAssign(false); setBulkAssignee(""); }}>
                  Cancel
                </Button>
              </div>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => setShowBulkAssign(true)}>
                  Reassign
                </Button>
                <Button size="sm" className="bg-error-600 hover:bg-error-700" onClick={handleBulkDelete}>
                  Delete ({selectedIds.length})
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedIds([])}>
                  Clear
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto custom-scrollbar">
          <Table>
            {/* ═══ DESKTOP TABLE VIEW (md and up) ═══ */}
            <div className="hidden md:block">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] sticky top-0 bg-white dark:bg-gray-900 z-10">
                  <TableRow>
                    <TableCell isHeader className="px-4 py-3 text-start w-10">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        ref={(el) => { if (el) el.indeterminate = isIndeterminate; }}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap w-12">
                      S.No
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {renderSortHeader("Lead ID", "id")}
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {renderSortHeader("Company", "company")}
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {renderSortHeader("Contact person", "contactPerson")}
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {renderSortHeader("Email", "email")}
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {renderSortHeader("Phone", "phone")}
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {renderSortHeader("Assigned to", "assignedTo")}
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
                        <TableCell className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(lead.id)}
                            onChange={() => toggleSelect(lead.id)}
                            className="rounded border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
                          />
                        </TableCell>
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
                          {lead.email}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {lead.phone}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-theme-sm whitespace-nowrap">
                          <select
                            value={lead.assignedTo}
                            onChange={(e) => handleDirectAssign(lead.id, e.target.value)}
                            className="h-9 w-40 appearance-none rounded-lg border border-gray-300 bg-transparent px-3 py-1.5 pr-8 text-xs shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer"
                            style={{
                              backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                              backgroundPosition: 'right 0.5rem center',
                              backgroundSize: '1.25rem',
                              backgroundRepeat: 'no-repeat'
                            }}
                          >
                            {ASSIGNEES.map((assignee) => (
                              <option
                                key={assignee}
                                value={assignee}
                                className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
                              >
                                {assignee}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell className="px-5 py-4 text-theme-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(`/leads/${lead.id}`)}
                              className="p-1.5 text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10 rounded-lg transition cursor-pointer"
                              title="View"
                            >
                              <FiEye className="size-4" />
                            </button>
                            <button
                              onClick={() => navigate(`/leads/${lead.id}/edit`)}
                              className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10 rounded-lg transition cursor-pointer"
                              title="Edit"
                            >
                              <FiEdit className="size-4" />
                            </button>
                            <button
                              onClick={() => handleOpenDelete(lead)}
                              className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                              title="Delete"
                            >
                              <FiTrash2 className="size-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        No leads found matching search criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* ═══ MOBILE / TABLET CARD VIEW (below md) ═══ */}
            <div className="block md:hidden divide-y divide-gray-100 dark:divide-white/[0.05]">
              {paginatedLeads.length > 0 ? (
                paginatedLeads.map((lead, index) => (
                  <div
                    key={lead.id}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(lead.id)}
                          onChange={() => toggleSelect(lead.id)}
                          className="rounded border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-50 dark:bg-brand-500/10 text-theme-xs font-semibold text-brand-600 dark:text-brand-400">
                          {(currentPage - 1) * rowsPerPage + index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 dark:text-white/90 truncate">
                            {lead.company}
                          </p>
                          <span className="font-mono text-[10px] tracking-wider text-gray-400 dark:text-gray-500">
                            SF-LEAD-{String(lead.id).padStart(4, "0")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => navigate(`/leads/${lead.id}`)}
                          className="p-2 text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10 rounded-lg transition cursor-pointer"
                          title="View"
                        >
                          <FiEye className="size-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/leads/${lead.id}/edit`)}
                          className="p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10 rounded-lg transition cursor-pointer"
                          title="Edit"
                        >
                          <FiEdit className="size-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(lead)}
                          className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                          title="Delete"
                        >
                          <FiTrash2 className="size-4" />
                        </button>
                      </div>
                    </div>

                    {/* Card Body - two column grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                      <div>
                        <span className="block text-gray-400 dark:text-gray-500 mb-0.5">Contact</span>
                        <span className="text-gray-700 dark:text-gray-300 truncate block">{lead.contactPerson}</span>
                      </div>
                      <div>
                        <span className="block text-gray-400 dark:text-gray-500 mb-0.5">Email</span>
                        <span className="text-gray-700 dark:text-gray-300 truncate block">{lead.email}</span>
                      </div>
                      <div>
                        <span className="block text-gray-400 dark:text-gray-500 mb-0.5">Phone</span>
                        <span className="text-gray-700 dark:text-gray-300 truncate block">{lead.phone}</span>
                      </div>
                      <div>
                        <span className="block text-gray-400 dark:text-gray-500 mb-0.5">Assigned to</span>
                        <select
                          value={lead.assignedTo}
                          onChange={(e) => handleDirectAssign(lead.id, e.target.value)}
                          className="h-8 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-2.5 py-1 pr-7 text-xs shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer"
                          style={{
                            backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                            backgroundPosition: 'right 0.35rem center',
                            backgroundSize: '1rem',
                            backgroundRepeat: 'no-repeat'
                          }}
                        >
                          {ASSIGNEES.map((assignee) => (
                            <option
                              key={assignee}
                              value={assignee}
                              className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
                            >
                              {assignee}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  No leads found matching search criteria.
                </div>
              )}
            </div>
          </Table>
        </div>

        {totalItems > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            rowsPerPage={rowsPerPage}
            onPageChange={setCurrentPage}
            onRowsPerPageChange={(rows) => {
              setRowsPerPage(rows);
              setCurrentPage(1);
            }}
            itemName="leads"
          />
        )}
      </div>

      {/* Upload Excel Modal */}
      <Modal
        isOpen={uploadModal.isOpen}
        onClose={uploadModal.closeModal}
        className="max-w-[520px] m-4"
      >
        <div className="relative w-full rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-8">
          <div className="pr-10 border-b border-gray-150 pb-4 mb-4 dark:border-gray-800">
            <h4 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              Upload Excel
            </h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Upload a .xlsx or .csv file to import leads in bulk.
            </p>
          </div>

          {/* Template Download Banner */}
          <div className="mb-6 p-4 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Need a template?</span>
              <span className="text-[11px] text-gray-400 mt-0.5">Use our format for a smooth import.</span>
            </div>
            <button
              type="button"
              onClick={downloadSampleTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-750 text-xs font-semibold text-brand-500 hover:text-brand-600 cursor-pointer shadow-theme-xs transition-colors shrink-0"
            >
              Download template
            </button>
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) setUploadedFile(file);
            }}
            className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-10 px-6 text-center transition-colors cursor-pointer ${dragOver
                ? "border-brand-400 bg-brand-50 dark:bg-brand-500/10"
                : "border-gray-200 hover:border-brand-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/5"
              }`}
            onClick={() => document.getElementById("excel-file-input")?.click()}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <FiUpload className="size-6 text-gray-500 dark:text-gray-400" />
            </div>
            {uploadedFile ? (
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {uploadedFile.name}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {(uploadedFile.size / 1024).toFixed(1)} KB — click to change
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Drag & drop your file here
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Supports .xlsx and .csv — max 10 MB
                </p>
              </div>
            )}
            <input
              id="excel-file-input"
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setUploadedFile(file);
              }}
            />
          </div>

          <div className="flex items-center justify-end gap-3 mt-6">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setUploadedFile(null);
                uploadModal.closeModal();
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!uploadedFile}
              onClick={() => {
                const file = uploadedFile;
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (e) => {
                  try {
                    const arrayBuffer = e.target?.result as ArrayBuffer;
                    const data = new Uint8Array(arrayBuffer);
                    const workbook = XLSX.read(data, { type: "array" });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];

                    // Convert sheet rows into JS array of arrays
                    const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
                    if (rows.length <= 1) {
                      showToast("Uploaded file is empty or missing data rows.", "error");
                      return;
                    }

                    // Dynamically scan headers row (row index 0) for lead property mapping
                    const headers = rows[0].map(h => String(h || "").trim().toLowerCase());
                    const leadTitleIdx = headers.findIndex(h => h.includes("lead title") || h.includes("title"));
                    const companyIdx = headers.findIndex(h => h.includes("company") || h.includes("lead"));
                    const contactIdx = headers.findIndex(h => h.includes("contact") || h.includes("person") || h.includes("name"));
                    const designationIdx = headers.findIndex(h => h.includes("designation"));
                    const phoneIdx = headers.findIndex(h => h.includes("mobile") || h.includes("phone") || h.includes("contact"));
                    const altPhoneIdx = headers.findIndex(h => h.includes("alternate mobile") || h.includes("alt mobile") || h.includes("alternate phone"));
                    const emailIdx = headers.findIndex(h => h.includes("email") || h.includes("mail"));
                    const altEmailIdx = headers.findIndex(h => h.includes("alternate email") || h.includes("alt email"));
                    const websiteIdx = headers.findIndex(h => h.includes("website"));
                    const industryIdx = headers.findIndex(h => h.includes("industry"));
                    const companyTypeIdx = headers.findIndex(h => h.includes("company type"));
                    const gstIdx = headers.findIndex(h => h.includes("gst"));
                    const address1Idx = headers.findIndex(h => h.includes("address line 1") || h.includes("street"));
                    const countryIdx = headers.findIndex(h => h.includes("country"));
                    const stateIdx = headers.findIndex(h => h.includes("state"));
                    const cityIdx = headers.findIndex(h => h.includes("city"));
                    const pincodeIdx = headers.findIndex(h => h.includes("pincode") || h.includes("zip"));
                    const sourceIdx = headers.findIndex(h => h.includes("source") || h.includes("lead source"));
                    const statusIdx = headers.findIndex(h => h.includes("status") || h.includes("lead status"));
                    const priorityIdx = headers.findIndex(h => h.includes("priority"));
                    const ownerIdx = headers.findIndex(h => h.includes("owner") || h.includes("assigned to") || h.includes("lead owner"));
                    const assignedDateIdx = headers.findIndex(h => h.includes("assigned date"));

                    if (companyIdx === -1 && contactIdx === -1 && emailIdx === -1) {
                      showToast("Required columns ('Company Name', 'Contact Person', or 'Email Address') not found.", "error");
                      return;
                    }

                    const newLeadsList = [...leads];
                    let addedCount = 0;
                    let duplicateCount = 0;

                    for (let i = 1; i < rows.length; i++) {
                      const row = rows[i];
                      if (!row || row.length === 0) continue;

                      const company = companyIdx !== -1 ? String(row[companyIdx] || "").trim() : "";
                      const contactPerson = contactIdx !== -1 ? String(row[contactIdx] || "").trim() : "";
                      const email = emailIdx !== -1 ? String(row[emailIdx] || "").trim() : "";

                      if (!company && !contactPerson && !email) continue;

                      // Duplicate email verification check
                      const isDuplicate = newLeadsList.some(
                        (l) => l.email && email && l.email.toLowerCase() === email.toLowerCase()
                      );
                      if (isDuplicate) {
                        duplicateCount++;
                        continue;
                      }

                      const nextId = newLeadsList.length > 0 ? Math.max(...newLeadsList.map(l => l.id)) + 1 : 1;

                      newLeadsList.push({
                        id: nextId,
                        leadTitle: leadTitleIdx !== -1 ? String(row[leadTitleIdx] || "").trim() : `${company} Expansion`,
                        company: company || "Unknown Corp",
                        contactPerson: contactPerson || "Jane Doe",
                        designation: designationIdx !== -1 ? String(row[designationIdx] || "").trim() : "",
                        phone: phoneIdx !== -1 ? String(row[phoneIdx] || "").trim() : "+91 98765 00000",
                        alternatePhone: altPhoneIdx !== -1 ? String(row[altPhoneIdx] || "").trim() : "",
                        email: email || `contact@${company.toLowerCase().replace(/\s+/g, "") || "unknown"}.com`,
                        alternateEmail: altEmailIdx !== -1 ? String(row[altEmailIdx] || "").trim() : "",
                        website: websiteIdx !== -1 ? String(row[websiteIdx] || "").trim() : `https://${company.toLowerCase().replace(/\s+/g, "") || "example"}.com`,
                        industry: industryIdx !== -1 ? String(row[industryIdx] || "").trim() : "Information Technology",
                        companyType: companyTypeIdx !== -1 ? String(row[companyTypeIdx] || "").trim() : "",
                        gstNumber: gstIdx !== -1 ? String(row[gstIdx] || "").trim() : "",
                        addressLine1: address1Idx !== -1 ? String(row[address1Idx] || "").trim() : "Imported Address Line 1",
                        address: address1Idx !== -1 ? String(row[address1Idx] || "").trim() : "Imported Address Line 1",
                        country: countryIdx !== -1 ? String(row[countryIdx] || "").trim() : "",
                        state: stateIdx !== -1 ? String(row[stateIdx] || "").trim() : "",
                        city: cityIdx !== -1 ? String(row[cityIdx] || "").trim() : "",
                        pincode: pincodeIdx !== -1 ? String(row[pincodeIdx] || "").trim() : "",
                        source: sourceIdx !== -1 ? String(row[sourceIdx] || "").trim() : "Website",
                        status: statusIdx !== -1 ? String(row[statusIdx] || "").trim() as LeadStatus : "New",
                        priority: priorityIdx !== -1 ? String(row[priorityIdx] || "").trim() as LeadPriority : "Medium",
                        assignedTo: ownerIdx !== -1 ? String(row[ownerIdx] || "").trim() : "John Doe",
                        assignedDate: assignedDateIdx !== -1 ? String(row[assignedDateIdx] || "").trim() : "",
                        notes: "Imported from file template.",
                        createdAt: new Date().toISOString().split("T")[0],
                      });
                      addedCount++;
                    }

                    if (addedCount > 0) {
                      setLeads(newLeadsList);
                      setStorage("saiflow_leads", newLeadsList);
                      if (duplicateCount > 0) {
                        showToast(`Successfully imported ${addedCount} leads. Skipped ${duplicateCount} duplicates.`, "warning");
                      } else {
                        showToast(`Successfully imported ${addedCount} leads from sheet!`, "success");
                      }
                    } else if (duplicateCount > 0) {
                      showToast(`Skipped import: All ${duplicateCount} records already exist.`, "error");
                    } else {
                      showToast("No valid rows found to import.", "error");
                    }
                  } catch (err) {
                    console.error("Excel import failed:", err);
                    showToast("Failed to parse file template.", "error");
                  }
                };
                reader.readAsArrayBuffer(file);

                setUploadedFile(null);
                uploadModal.closeModal();
              }}
            >
              Import leads
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.closeModal}
        className="max-w-[450px] m-4"
      >
        <div className="relative w-full rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-8">
          <div className="mb-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/10 text-error-600 dark:text-error-400 mb-4">
              <FiTrash2 className="size-6" />
            </div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">
              Delete lead
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to delete{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {selectedLead?.company}
              </span>
              ? This action cannot be undone.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={deleteModal.closeModal}
              className="w-1/2"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleDeleteConfirm}
              className="w-1/2 bg-error-600 hover:bg-error-700"
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
