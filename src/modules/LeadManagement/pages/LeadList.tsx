import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";

import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import { Modal } from "../../../components/ui/modal";
import { useModal } from "../../../hooks/useModal";
// import { Dropdown } from "../../../components/ui/dropdown/Dropdown"; // Filter dropdowns commented out
// import { DropdownItem } from "../../../components/ui/dropdown/DropdownItem"; // Filter dropdowns commented out
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
import { useAuth } from "../../../context/AuthContext";
import api from "../../../services/api";
import * as XLSX from "xlsx";
import {
  type Lead,
} from "../data/leadsData";
import { leadService } from "../../../services/leadService";
import { userService } from "../../../services/userService";
import { masterService } from "../../../services/masterService";

const mapStatusToFrontend = (status: string): string => {
  switch (status) {
    case "NEW": return "New";
    case "ASSIGNED": return "New";
    case "CONTACTED": return "Contacted";
    case "MEETING_SCHEDULED": return "Scheduled";
    case "QUALIFIED": return "Qualified";
    case "PROPOSAL": return "Proposal sent";
    case "NEGOTIATION": return "Proposal sent";
    case "WON": return "Won";
    case "LOST": return "Lost";
    case "DISQUALIFIED": return "Lost";
    default: return "New";
  }
};

const adaptLeadToFrontend = (backendLead: any): Lead => {
  return {
    id: backendLead.id,
    company: backendLead.company?.name || "No Company",
    contactPerson: backendLead.contactName || "",
    email: backendLead.contactEmail || "",
    phone: backendLead.contactPhone || "",
    status: mapStatusToFrontend(backendLead.status) as any,
    priority: (backendLead.priority?.name || "Medium") as any,
    assignedTo: backendLead.assignedTo
      ? backendLead.assignedTo.name
      : "Unassigned",
    source: backendLead.source?.name || "",
    industry: backendLead.company?.industry?.name || "",
    website: backendLead.company?.website || "",
    address: backendLead.company?.address || "",
    notes: backendLead.requirements || "",
    createdAt: backendLead.createdAt
  };
};

export default function LeadList() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { hasPermission } = useAuth();
  const uploadModal = useModal();
  const deleteModal = useModal();



  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  // industries/sources getters removed while the filter dropdowns are commented out
  const [, setIndustries] = useState<any[]>([]);
  const [, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  // setAssigneeFilter removed while the Assignee filter dropdown is commented out
  const [assigneeFilter] = useState("all");
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof Lead>("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // setIndustryFilter / setSourceFilter removed while the filter dropdowns are commented out
  const [industryFilter] = useState("all");
  const [sourceFilter] = useState("all");
  // isIndustryOpen / isSourceOpen / isAssigneeOpen states removed while the filter dropdowns are commented out

  // Upload dialog state
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await leadService.getLeads({ limit: 100 });
      const rawLeads = res.data || [];
      setLeads(rawLeads.map(adaptLeadToFrontend));
    } catch (err) {
      showToast("Failed to fetch leads from backend.", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadFilterAndUserData = async () => {
    try {
      const [resUsers, indData, srcData] = await Promise.all([
        userService.getAssignees(),
        masterService.getMasterItems("INDUSTRY", undefined, { status: "Active" }),
        masterService.getMasterItems("LEAD_SOURCE", undefined, { status: "Active" })
      ]);
      setUsers(resUsers.data || []);
      setIndustries(indData || []);
      setSources(srcData || []);
    } catch (err) {
      console.error("Failed to load initial filters and users:", err);
    }
  };

  useEffect(() => {
    fetchLeads();
    loadFilterAndUserData();
  }, []);

  const handleOpenDelete = (lead: Lead) => {
    setSelectedLead(lead);
    deleteModal.openModal();
  };

  const handleDeleteConfirm = async () => {
    if (selectedLead) {
      try {
        await leadService.deleteLead(selectedLead.id);
        setLeads((prev) => prev.filter((l) => l.id !== selectedLead.id));
        showToast(`Lead "${selectedLead.company}" deleted successfully.`, "success");
      } catch (err: any) {
        showToast(err.response?.data?.message || "Failed to delete lead.", "error");
      }
    }
    deleteModal.closeModal();
  };

  const handleDirectAssign = async (leadId: number, userIdStr: string) => {
    if (!userIdStr) return;
    try {
      const userId = Number(userIdStr);
      await leadService.assignLead(leadId, userId);
      showToast("Lead assigned successfully.", "success");
      fetchLeads();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to assign lead.", "error");
    }
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
        "Lead Owner": "Jane Smith"
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
        "Lead Owner": "Alice Johnson"
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

  /* Filter option lists commented out per Task 1
  const assigneeOptions = useMemo(() => [
    { value: "all", label: "All Assignees" },
    ...users.map((u) => ({ value: u.name, label: u.name })),
  ], [users]);

  const industryOptions = useMemo(() => [
    { value: "all", label: "All Industries" },
    ...industries.filter((i: any) => i.status === "Active").map((i: any) => ({ value: i.name, label: i.name }))
  ], [industries]);

  const sourceOptions = useMemo(() => [
    { value: "all", label: "All Sources" },
    ...sources.filter((s: any) => s.status === "Active").map((s: any) => ({ value: s.name, label: s.name }))
  ], [sources]);
  */

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

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(selectedIds.map((leadId) => leadService.deleteLead(leadId)));
      showToast(`${selectedIds.length} lead(s) deleted successfully.`, "success");
      fetchLeads();
      setSelectedIds([]);
    } catch (err: any) {
      showToast("Failed to bulk delete leads.", "error");
    }
  };

  const handleBulkReassign = async () => {
    if (selectedIds.length === 0 || !bulkAssignee) return;
    try {
      const userId = Number(bulkAssignee);
      await Promise.all(selectedIds.map((leadId) => leadService.assignLead(leadId, userId)));
      showToast(`${selectedIds.length} lead(s) reassigned successfully.`, "success");
      fetchLeads();
      setSelectedIds([]);
      setBulkAssignee("");
      setShowBulkAssign(false);
    } catch (err: any) {
      showToast("Failed to bulk reassign leads.", "error");
    }
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
        description="View and manage Contact in SaiFlow CRM."
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

          {/* Filter dropdowns (Assignee, Industry, Source) commented out per Task 1
          <div className="flex items-center gap-3">
            // Assignee Filter
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

            // Industry Filter
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

            // Source Filter
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
          */}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {hasPermission('leads', 'create') && (
            <>
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
                Add Lead
              </Button>
            </>
          )}
        </div>
      </div>



      {/* Bulk Actions Toolbar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between gap-3 mb-3 px-4 py-3 rounded-xl border border-brand-200 bg-brand-50 dark:border-brand-500/20 dark:bg-brand-500/10">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-brand-700 dark:text-brand-400">
              {selectedIds.length} Selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            {showBulkAssign && hasPermission('leads', 'assign') ? (
              <div className="flex items-center gap-2">
                <select
                  value={bulkAssignee}
                  onChange={(e) => setBulkAssignee(e.target.value)}
                  className="h-9 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                >
                  <option value="">Select Assignee...</option>
                  {users.map((u) => (
                    <option key={u.id} value={String(u.id)}>{u.name}</option>
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
                {hasPermission('leads', 'assign') && (
                  <Button size="sm" variant="outline" onClick={() => setShowBulkAssign(true)}>
                    Reassign
                  </Button>
                )}
                {hasPermission('leads', 'delete') && (
                  <Button size="sm" className="bg-error-600 hover:bg-error-700" onClick={handleBulkDelete}>
                    Delete ({selectedIds.length})
                  </Button>
                )}
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
                      {renderSortHeader("Contact Person", "contactPerson")}
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {renderSortHeader("Email", "email")}
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {renderSortHeader("Phone", "phone")}
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {renderSortHeader("Assigned To", "assignedTo")}
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      Action
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="px-5 py-8 text-center text-sm text-gray-500">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-primary border-t-transparent"></div>
                          <span>Loading Leads...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : paginatedLeads.length > 0 ? (
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
                            value={users.find(u => u.name === lead.assignedTo)?.id || ""}
                            onChange={(e) => handleDirectAssign(lead.id, e.target.value)}
                            className="h-9 w-40 appearance-none rounded-lg border border-gray-300 bg-transparent px-3 py-1.5 pr-8 text-xs shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer"
                            style={{
                              backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                              backgroundPosition: 'right 0.5rem center',
                              backgroundSize: '1.25rem',
                              backgroundRepeat: 'no-repeat'
                            }}
                          >
                            <option value="" className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100">
                              Unassigned
                            </option>
                            {users.map((u) => (
                              <option
                                key={u.id}
                                value={String(u.id)}
                                className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
                              >
                                {u.name}
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
                            {hasPermission('leads', 'edit') && (
                              <button
                                onClick={() => navigate(`/leads/${lead.id}/edit`)}
                                className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10 rounded-lg transition cursor-pointer"
                                title="Edit"
                              >
                                <FiEdit className="size-4" />
                              </button>
                            )}
                            {hasPermission('leads', 'delete') && (
                              <button
                                onClick={() => handleOpenDelete(lead)}
                                className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                                title="Delete"
                              >
                                <FiTrash2 className="size-4" />
                              </button>
                            )}
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
              {loading ? (
                <div className="px-5 py-8 text-center text-sm text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-primary border-t-transparent"></div>
                    <span>Loading Leads...</span>
                  </div>
                </div>
              ) : paginatedLeads.length > 0 ? (
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
                        {hasPermission('leads', 'edit') && (
                          <button
                            onClick={() => navigate(`/leads/${lead.id}/edit`)}
                            className="p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10 rounded-lg transition cursor-pointer"
                            title="Edit"
                          >
                            <FiEdit className="size-4" />
                          </button>
                        )}
                        {hasPermission('leads', 'delete') && (
                          <button
                            onClick={() => handleOpenDelete(lead)}
                            className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                            title="Delete"
                          >
                            <FiTrash2 className="size-4" />
                          </button>
                        )}
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
                        <span className="block text-gray-400 dark:text-gray-500 mb-0.5">Assigned To</span>
                        <select
                          value={users.find(u => u.name === lead.assignedTo)?.id || ""}
                          onChange={(e) => handleDirectAssign(lead.id, e.target.value)}
                          className="h-8 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-2.5 py-1 pr-7 text-xs shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer"
                          style={{
                            backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                            backgroundPosition: 'right 0.35rem center',
                            backgroundSize: '1rem',
                            backgroundRepeat: 'no-repeat'
                          }}
                        >
                          <option value="" className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100">
                            Unassigned
                          </option>
                          {users.map((u) => (
                            <option
                              key={u.id}
                              value={String(u.id)}
                              className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
                            >
                              {u.name}
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
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Need a Template?</span>
              <span className="text-[11px] text-gray-400 mt-0.5">Use our format for a smooth import.</span>
            </div>
            <button
              type="button"
              onClick={downloadSampleTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-750 text-xs font-semibold text-brand-500 hover:text-brand-600 cursor-pointer shadow-theme-xs transition-colors shrink-0"
            >
              Download Template
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
                reader.onload = async (e) => {
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
                    const emailIdx = headers.findIndex(h => h.includes("email") || h.includes("mail"));
                    const websiteIdx = headers.findIndex(h => h.includes("website"));
                    const industryIdx = headers.findIndex(h => h.includes("industry"));
                    const sourceIdx = headers.findIndex(h => h.includes("source") || h.includes("lead source"));

                    if (companyIdx === -1 && contactIdx === -1 && emailIdx === -1) {
                      showToast("Required columns ('Company Name', 'Contact Person', or 'Email Address') not found.", "error");
                      return;
                    }

                    let addedCount = 0;
                    let duplicateCount = 0;

                    for (let i = 1; i < rows.length; i++) {
                      const row = rows[i];
                      if (!row || row.length === 0) continue;

                      const company = companyIdx !== -1 ? String(row[companyIdx] || "").trim() : "";
                      const contactPerson = contactIdx !== -1 ? String(row[contactIdx] || "").trim() : "";
                      const email = emailIdx !== -1 ? String(row[emailIdx] || "").trim() : "";

                      if (!company && !contactPerson && !email) continue;

                      const isDuplicate = leads.some(
                        (l) => l.email && email && l.email.toLowerCase() === email.toLowerCase()
                      );
                      if (isDuplicate) {
                        duplicateCount++;
                        continue;
                      }

                      try {
                        let companyId;
                        const searchRes = await api.get('/companies', { params: { search: company } });
                        const existingCompany = searchRes.data?.data?.find(
                          (c: any) => c.name.toLowerCase() === company.toLowerCase()
                        );
                        if (existingCompany) {
                          companyId = existingCompany.id;
                        } else {
                          const newComp = await api.post('/companies', { name: company });
                          companyId = newComp.data?.data?.id;
                        }

                        await leadService.createLead({
                          title: leadTitleIdx !== -1 ? String(row[leadTitleIdx] || "").trim() : `${company} Expansion`,
                          companyId,
                          contactPerson: contactPerson || "Jane Doe",
                          designation: designationIdx !== -1 ? String(row[designationIdx] || "").trim() : "",
                          phone: phoneIdx !== -1 ? String(row[phoneIdx] || "").trim() : "+91 98765 00000",
                          email: email || `contact@${company.toLowerCase().replace(/\s+/g, "") || "unknown"}.com`,
                          website: websiteIdx !== -1 ? String(row[websiteIdx] || "").trim() : `https://${company.toLowerCase().replace(/\s+/g, "") || "example"}.com`,
                          industry: industryIdx !== -1 ? String(row[industryIdx] || "").trim() : "Information Technology",
                          source: sourceIdx !== -1 ? String(row[sourceIdx] || "").trim() : "Website",
                          status: "NEW",
                          priority: "MEDIUM"
                        });
                        addedCount++;
                      } catch (err) {
                        console.error(err);
                      }
                    }

                    if (addedCount > 0) {
                      fetchLeads();
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
              Import Leads
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
              Delete Lead
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
