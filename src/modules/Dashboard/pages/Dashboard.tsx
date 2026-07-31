import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Badge from "../../../components/ui/badge/Badge";
import Input from "../../../components/form/input/InputField";
import { Dropdown } from "../../../components/ui/dropdown/Dropdown";
import { DropdownItem } from "../../../components/ui/dropdown/DropdownItem";
import { Pagination } from "../../../components/ui/pagination/Pagination";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import {
  ChevronDownIcon,
  ChevronUpIcon,
} from "../../../icons";
import {
  FiLayers,
  FiUsers,
  FiCheckCircle,
  FiCreditCard,
  FiPhoneCall,
  FiClock,
  FiUserCheck,
  FiEye,
} from "react-icons/fi";
import { getStorage, setStorage } from "../../../utils/storage";
import { initialLeads as sourceLeads, Lead as SourceLead, ASSIGNEES } from "../../LeadManagement/data/leadsData";
import { initialClients } from "../../ClientManagement/data/clientsData";
import { initialProposals, Proposal } from "../../Quotation/data/quotationsData";
import { initialFollowUps, FollowUp } from "../../ContactFollowUp/data/contactData";
import { useToast } from "../../../hooks/useToast";
import { formatTime } from "../../../utils/dateFormatter";

interface Lead {
  id: number;
  sNo: number;
  company: string;
  contactPerson: string;
  phone: string;
  status: "New" | "Contacted" | "Qualified" | "Scheduled" | "Completed" | "Missed" | "Rescheduled" | "Proposal sent" | "Won" | "Lost";
  assignedTo: string;
}

interface CallLead extends SourceLead {
  sNo: number;
}

export default function Dashboard() {
  const { showToast } = useToast();
  const navigate = useNavigate();

  // ── Dynamic lists from storage ──────────────────────────────
  const rawLeads = getStorage<SourceLead[]>("saiflow_leads", sourceLeads);
  const localLeads = useMemo<Lead[]>(() => {
    return rawLeads.map((l, index) => ({
      id: l.id,
      sNo: index + 1,
      company: l.company,
      contactPerson: l.contactPerson,
      phone: l.phone,
      status: l.status as any,
      assignedTo: l.assignedTo,
    }));
  }, [rawLeads]);

  const clients = getStorage("saiflow_clients", initialClients);
  const proposals = getStorage<Proposal[]>("saiflow_proposals", initialProposals);

  // ── Dropdown states ─────────────────────────────────────────
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);

  // ── Table state ─────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [sortField, setSortField] = useState<keyof Lead>("sNo");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // ── Today's call table state ─────────────────────────────────
  const [callSearchQuery, setCallSearchQuery] = useState("");
  const [callStatusFilter, setCallStatusFilter] = useState("all");
  const [callAssigneeFilter, setCallAssigneeFilter] = useState("all");
  const [callCurrentPage, setCallCurrentPage] = useState(1);
  const [callRowsPerPage, setCallRowsPerPage] = useState(5);
  const [callSortField, setCallSortField] = useState<keyof CallLead>("sNo");
  const [callSortOrder, setCallSortOrder] = useState<"asc" | "desc">("asc");
  const [isCallStatusOpen, setIsCallStatusOpen] = useState(false);
  const [isCallAssigneeOpen, setIsCallAssigneeOpen] = useState(false);

  // ── Today Lead Calls & Reassign Action ────────────────────────
  const todayCalls = useMemo<CallLead[]>(() => {
    const list = rawLeads.filter(
      (l) => l.status === "Scheduled" || l.status === "Contacted" || l.status === "New"
    );
    const base = list.length > 0 ? list : rawLeads.slice(0, 5);
    return base.map((l, index) => ({ ...l, sNo: index + 1 }));
  }, [rawLeads]);

  const filteredTodayCalls = useMemo(() => {
    let result = [...todayCalls];

    if (callSearchQuery.trim()) {
      const query = callSearchQuery.toLowerCase();
      result = result.filter(
        (lead) =>
          lead.company.toLowerCase().includes(query) ||
          lead.contactPerson.toLowerCase().includes(query) ||
          lead.phone.toLowerCase().includes(query) ||
          lead.assignedTo.toLowerCase().includes(query) ||
          `sf-lead-${String(lead.id).padStart(4, "0")}`
            .toLowerCase()
            .includes(query)
      );
    }

    if (callStatusFilter !== "all") {
      result = result.filter((lead) => lead.status === callStatusFilter);
    }

    if (callAssigneeFilter !== "all") {
      result = result.filter((lead) => lead.assignedTo === callAssigneeFilter);
    }

    result.sort((a, b) => {
      const aVal = a[callSortField];
      const bVal = b[callSortField];

      if (typeof aVal === "number" && typeof bVal === "number") {
        return callSortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }

      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();

      if (strA < strB) return callSortOrder === "asc" ? -1 : 1;
      if (strA > strB) return callSortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [todayCalls, callSearchQuery, callStatusFilter, callAssigneeFilter, callSortField, callSortOrder]);

  const paginatedTodayCalls = useMemo(() => {
    const startIndex = (callCurrentPage - 1) * callRowsPerPage;
    return filteredTodayCalls.slice(startIndex, startIndex + callRowsPerPage);
  }, [filteredTodayCalls, callCurrentPage, callRowsPerPage]);

  const todayCallsTotal = filteredTodayCalls.length;
  const todayCallsTotalPages = Math.ceil(todayCallsTotal / callRowsPerPage);

  const handleReassignCall = (leadId: number, targetAssignee: string) => {
    if (!targetAssignee) return;

    // 1. Update leads in storage
    const updatedLeads = rawLeads.map((l) =>
      l.id === leadId ? { ...l, assignedTo: targetAssignee } : l
    );
    setStorage("saiflow_leads", updatedLeads);

    // 2. Update follow-ups in storage if matching
    const currentFollowups = getStorage<FollowUp[]>("saiflow_followups", initialFollowUps);
    const updatedFollowups = currentFollowups.map((f) =>
      f.leadId === leadId ? { ...f, assignedTo: targetAssignee } : f
    );
    setStorage("saiflow_followups", updatedFollowups);

    showToast(`Lead call reassigned to ${targetAssignee} successfully!`, "success");
  };

  const getStatusColor = (status: Lead["status"]) => {
    switch (status) {
      case "New": return "primary";
      case "Contacted": return "info";
      case "Qualified": return "warning";
      case "Scheduled": return "primary";
      case "Completed": return "success";
      case "Missed": return "error";
      case "Rescheduled": return "warning";
      case "Proposal sent": return "warning";
      case "Won": return "success";
      case "Lost": return "error";
      default: return "light";
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

  const handleCallSort = (field: keyof CallLead) => {
    if (callSortField === field) {
      setCallSortOrder(callSortOrder === "asc" ? "desc" : "asc");
    } else {
      setCallSortField(field);
      setCallSortOrder("asc");
    }
    setCallCurrentPage(1);
  };

  const statusOptions = [
    { value: "all", label: "All statuses" },
    { value: "New", label: "New" },
    { value: "Contacted", label: "Contacted" },
    { value: "Qualified", label: "Qualified" },
    { value: "Proposal sent", label: "Proposal sent" },
    { value: "Won", label: "Won" },
    { value: "Lost", label: "Lost" },
  ];

  const callStatusOptions = [
    { value: "all", label: "All statuses" },
    { value: "New", label: "New" },
    { value: "Contacted", label: "Contacted" },
    { value: "Scheduled", label: "Scheduled" },
  ];

  const assigneeOptions = [
    { value: "all", label: "All assignees" },
    ...ASSIGNEES.map((a) => ({ value: a, label: a })),
  ];

  const processedLeads = useMemo(() => {
    let result = [...localLeads];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (lead) =>
          lead.company.toLowerCase().includes(query) ||
          lead.contactPerson.toLowerCase().includes(query) ||
          lead.phone.toLowerCase().includes(query) ||
          lead.assignedTo.toLowerCase().includes(query) ||
          lead.status.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((lead) => lead.status === statusFilter);
    }

    if (assigneeFilter !== "all") {
      result = result.filter((lead) => lead.assignedTo === assigneeFilter);
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
  }, [searchQuery, statusFilter, assigneeFilter, sortField, sortOrder, localLeads]);

  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return processedLeads.slice(startIndex, startIndex + rowsPerPage);
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

  const renderCallSortHeader = (label: string, field: keyof CallLead) => {
    const isActive = callSortField === field;
    return (
      <button
        onClick={() => handleCallSort(field)}
        className="flex items-center gap-1.5 font-medium hover:text-gray-900 dark:hover:text-white cursor-pointer"
      >
        {label}
        <span className="flex flex-col">
          <ChevronUpIcon
            className={`w-3 h-3 -mb-1 transition-colors ${isActive && callSortOrder === "asc"
              ? "text-brand-500"
              : "text-gray-300 dark:text-gray-600"
              }`}
          />
          <ChevronDownIcon
            className={`w-3 h-3 transition-colors ${isActive && callSortOrder === "desc"
              ? "text-brand-500"
              : "text-gray-300 dark:text-gray-600"
              }`}
          />
        </span>
      </button>
    );
  };

  // ── 4 KPI METRICS ──────────────────────────────────────────
  const kpiMetrics = useMemo(() => {
    const pipelineValue = proposals
      .filter((p) => p.status === "Sent" || p.status === "Approved" || p.status === "Under Review")
      .reduce((sum, p) => {
        return sum + (p.estimation.total || 0);
      }, 0);

    return [
      {
        label: "Total leads",
        value: rawLeads.length,
        icon: <FiLayers className="text-brand-500 w-5 h-5" />,
      },
      {
        label: "Active clients",
        value: clients.filter((c: any) => c.status === "Active").length,
        icon: <FiUsers className="text-info-500 w-5 h-5" />,
      },
      {
        label: "Won leads",
        value: rawLeads.filter((l) => l.status === "Won").length,
        icon: <FiCheckCircle className="text-success-500 w-5 h-5" />,
      },
      {
        label: "Potential Revenue",
        value: `₹${pipelineValue.toLocaleString("en-IN")}`,
        icon: <FiCreditCard className="text-warning-500 w-5 h-5" />,
      },
    ];
  }, [rawLeads, clients, proposals]);

  // ── CHARTS ──────────────────────────────────────────────────
  const leadTrendOptions: ApexOptions = {
    colors: ["#ff3951"],
    chart: {
      fontFamily: "Poppins, sans-serif",
      toolbar: { show: false },
      type: "area",
    },
    stroke: { curve: "smooth", width: 2 },
    fill: {
      type: "gradient",
      gradient: { opacityFrom: 0.4, opacityTo: 0 },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { style: { colors: ["#6B7280"] } },
    },
    grid: {
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
  };

  const leadTrendSeries = [
    { name: "Leads generated", data: [45, 60, 55, 75, 90, 80, 95, 110, 105, 130, 120, 150] },
  ];

  // ── Conversion Rate ─────────────────────────────────────────
  const conversionOptions: ApexOptions = {
    colors: ["#10B981", "#EF4444"],
    chart: {
      fontFamily: "Poppins, sans-serif",
      toolbar: { show: false },
      type: "bar",
    },
    plotOptions: {
      bar: { horizontal: false, columnWidth: "35%", borderRadius: 4 },
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ["transparent"] },
    xaxis: {
      categories: ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { style: { colors: ["#6B7280"] } },
    },
    grid: {
      yaxis: { lines: { show: true } },
    },
    legend: {
      position: "top",
      horizontalAlign: "left",
    },
  };

  const conversionSeries = [
    { name: "Won leads", data: [12, 18, 15, 22, 30, 28] },
    { name: "Lost leads", data: [4, 6, 5, 8, 10, 9] },
  ];

  // ── RENDER ──────────────────────────────────────────────────
  return (
    <>
      <PageMeta
        title="Dashboard | SaiFlow"
        description="SaiFlow CRM dashboard — overview of leads, clients, and pipeline."
      />
      <PageBreadcrumb pageTitle="Dashboard" />

      {/* ── 4 KPI METRICS ──────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
        {kpiMetrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {metric.label}
                </span>
                <h4 className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                  {metric.value}
                </h4>
              </div>
              <div className="flex items-center justify-center rounded-xl bg-gray-50 p-2.5 dark:bg-gray-800">
                {metric.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── CHARTS ROW: Lead Generation Trend & Lead Conversion Rate ── */}
      <div className="grid grid-cols-1 gap-4 mb-6 lg:grid-cols-2 md:gap-6">
        {/* Task 1: Placed Lead generation trend in place of Lead status breakdown */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="mb-4 text-base font-semibold text-gray-850 dark:text-white">
            Lead generation trend
          </h3>
          <div className="max-w-full overflow-hidden">
            <Chart
              options={leadTrendOptions}
              series={leadTrendSeries}
              type="area"
              height={265}
            />
          </div>
        </div>

        {/* Lead conversion rate */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="mb-4 text-base font-semibold text-gray-850 dark:text-white">
            Lead conversion rate
          </h3>
          <div className="max-w-full overflow-hidden">
            <Chart
              options={conversionOptions}
              series={conversionSeries}
              type="bar"
              height={265}
            />
          </div>
        </div>
      </div>

      {/* ── TASK 2: TODAY LEAD CALL REASSIGNING FEATURE ─────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 mb-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            <FiPhoneCall className="text-brand-500 size-5" />
            Today's lead calls
          </h3>
        </div>

        {/* Search & filter toolbar */}
        <div className="flex flex-col gap-4 mb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full lg:w-auto">
            <div className="w-full sm:w-64">
              <Input
                type="text"
                placeholder="Search calls..."
                value={callSearchQuery}
                onChange={(e) => {
                  setCallSearchQuery(e.target.value);
                  setCallCurrentPage(1);
                }}
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => {
                    setIsCallStatusOpen(!isCallStatusOpen);
                    setIsCallAssigneeOpen(false);
                  }}
                  className="flex items-center justify-between h-11 w-40 rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer dropdown-toggle hover:bg-gray-55 dark:hover:bg-white/5"
                >
                  <span>
                    {callStatusOptions.find((o) => o.value === callStatusFilter)?.label ||
                      "Filter by status"}
                  </span>
                  <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                </button>
                <Dropdown
                  isOpen={isCallStatusOpen}
                  onClose={() => setIsCallStatusOpen(false)}
                  className="left-0 right-auto w-40 p-1 mt-2"
                >
                  <ul className="flex flex-col gap-0.5">
                    {callStatusOptions.map((opt) => (
                      <li key={opt.value}>
                        <DropdownItem
                          onItemClick={() => {
                            setCallStatusFilter(opt.value);
                            setCallCurrentPage(1);
                            setIsCallStatusOpen(false);
                          }}
                          className={`cursor-pointer rounded-lg text-left w-full px-3 py-2 text-sm ${callStatusFilter === opt.value
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

              <div className="relative">
                <button
                  onClick={() => {
                    setIsCallAssigneeOpen(!isCallAssigneeOpen);
                    setIsCallStatusOpen(false);
                  }}
                  className="flex items-center justify-between h-11 w-40 rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer dropdown-toggle hover:bg-gray-55 dark:hover:bg-white/5"
                >
                  <span>
                    {assigneeOptions.find((o) => o.value === callAssigneeFilter)?.label ||
                      "Filter by assignee"}
                  </span>
                  <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                </button>
                <Dropdown
                  isOpen={isCallAssigneeOpen}
                  onClose={() => setIsCallAssigneeOpen(false)}
                  className="left-0 right-auto w-44 p-1 mt-2"
                >
                  <ul className="flex flex-col gap-0.5">
                    {assigneeOptions.map((opt) => (
                      <li key={opt.value}>
                        <DropdownItem
                          onItemClick={() => {
                            setCallAssigneeFilter(opt.value);
                            setCallCurrentPage(1);
                            setIsCallAssigneeOpen(false);
                          }}
                          className={`cursor-pointer rounded-lg text-left w-full px-3 py-2 text-sm ${callAssigneeFilter === opt.value
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
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-white/[0.05]">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-900/50">
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">{renderCallSortHeader("S.No", "sNo")}</th>
                <th className="px-4 py-2.5 text-start text-xs font-semibold text-gray-500 dark:text-gray-400">{renderCallSortHeader("Lead ID", "id")}</th>
                <th className="px-4 py-2.5 text-start text-xs font-semibold text-gray-500 dark:text-gray-400">{renderCallSortHeader("Company", "company")}</th>
                <th className="px-4 py-2.5 text-start text-xs font-semibold text-gray-500 dark:text-gray-400">{renderCallSortHeader("Contact person", "contactPerson")}</th>
                <th className="px-4 py-2.5 text-start text-xs font-semibold text-gray-500 dark:text-gray-400">{renderCallSortHeader("Scheduled time", "followUpTime")}</th>
                <th className="px-4 py-2.5 text-start text-xs font-semibold text-gray-500 dark:text-gray-400">{renderCallSortHeader("Current assignee", "assignedTo")}</th>
                <th className="px-4 py-2.5 text-end text-xs font-semibold text-gray-500 dark:text-gray-400">Quick reassign</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {paginatedTodayCalls.length > 0 ? (
                paginatedTodayCalls.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-start text-xs text-gray-500 dark:text-gray-400">
                      {lead.sNo}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500 dark:text-gray-400">
                      SF-LEAD-{String(lead.id).padStart(4, "0")}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-800 dark:text-white/90">
                      {lead.company}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                      {lead.contactPerson}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-medium">
                        <FiClock className="size-3 text-gray-400" />
                        {formatTime(lead.followUpTime || "10:00 AM")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <Badge size="sm" color="light">
                        <FiUserCheck className="size-3 mr-1 inline" />
                        {lead.assignedTo}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-end">
                      <select
                        value=""
                        onChange={(e) => handleReassignCall(lead.id, e.target.value)}
                        className="h-8.5 w-36 appearance-none rounded-lg border border-gray-200 bg-white px-2.5 py-1 pr-7 text-xs font-medium text-gray-700 shadow-theme-xs transition-all hover:border-brand-300 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 cursor-pointer"
                        style={{
                          backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                          backgroundPosition: 'right 0.4rem center',
                          backgroundSize: '1.1rem',
                          backgroundRepeat: 'no-repeat'
                        }}
                      >
                        <option value="" disabled className="text-gray-400 dark:bg-gray-900 dark:text-gray-500">
                          Reassign to...
                        </option>
                        {ASSIGNEES.filter((a) => a !== lead.assignedTo).map((assignee) => (
                          <option
                            key={assignee}
                            value={assignee}
                            className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 py-1"
                          >
                            {assignee}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No calls match your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {todayCallsTotal > 0 && (
          <Pagination
            currentPage={callCurrentPage}
            totalPages={todayCallsTotalPages}
            totalItems={todayCallsTotal}
            rowsPerPage={callRowsPerPage}
            onPageChange={setCallCurrentPage}
            onRowsPerPageChange={(rows) => {
              setCallRowsPerPage(rows);
              setCallCurrentPage(1);
            }}
            itemName="calls"
          />
        )}
      </div>

      {/* ── RECENT LEADS TABLE ─────────────────────────────── */}
      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          {/* Section header */}
          <div className="flex items-center gap-2 p-4 pb-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-base font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <FiLayers className="text-brand-500 size-5" />
              Recent leads
            </h3>
          </div>

          {/* Search & filter toolbar */}
          <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full lg:w-auto">
              <div className="w-full sm:w-64">
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <button
                    onClick={() => { setIsStatusOpen(!isStatusOpen); setIsAssigneeOpen(false); }}
                    className="flex items-center justify-between h-11 w-40 rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer dropdown-toggle hover:bg-gray-55 dark:hover:bg-white/5"
                  >
                    <span>{statusOptions.find((o) => o.value === statusFilter)?.label || "Filter by status"}</span>
                    <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                  </button>
                  <Dropdown
                    isOpen={isStatusOpen}
                    onClose={() => setIsStatusOpen(false)}
                    className="left-0 right-auto w-40 p-1 mt-2"
                  >
                    <ul className="flex flex-col gap-0.5">
                      {statusOptions.map((opt) => (
                        <li key={opt.value}>
                          <DropdownItem
                            onItemClick={() => { setStatusFilter(opt.value); setCurrentPage(1); setIsStatusOpen(false); }}
                            className={`cursor-pointer rounded-lg text-left w-full px-3 py-2 text-sm ${statusFilter === opt.value
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

                <div className="relative">
                  <button
                    onClick={() => { setIsAssigneeOpen(!isAssigneeOpen); setIsStatusOpen(false); }}
                    className="flex items-center justify-between h-11 w-40 rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer dropdown-toggle hover:bg-gray-55 dark:hover:bg-white/5"
                  >
                    <span>{assigneeOptions.find((o) => o.value === assigneeFilter)?.label || "Filter by assignee"}</span>
                    <ChevronDownIcon className="w-4 h-4 text-gray-500" />
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
                            onItemClick={() => { setAssigneeFilter(opt.value); setCurrentPage(1); setIsAssigneeOpen(false); }}
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
              </div>
            </div>
          </div>

          <div className="max-w-full overflow-x-auto px-4">
            <table className="min-w-full">
              <thead className="border-b border-gray-100 dark:border-white/[0.05] sticky top-0 bg-white dark:bg-gray-900 z-10">
                <tr>
                  <th className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    {renderSortHeader("S.No", "sNo")}
                  </th>
                  <th className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    {renderSortHeader("Company", "company")}
                  </th>
                  <th className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    {renderSortHeader("Contact person", "contactPerson")}
                  </th>
                  <th className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    Phone
                  </th>
                  <th className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    {renderSortHeader("Status", "status")}
                  </th>
                  <th className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    {renderSortHeader("Assigned to", "assignedTo")}
                  </th>
                  <th className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {paginatedLeads.length > 0 ? (
                  paginatedLeads.map((lead) => (
                    <tr key={lead.sNo} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4 text-theme-sm text-gray-800 dark:text-white/90">{lead.sNo}</td>
                      <td className="px-5 py-4 text-theme-sm text-gray-800 dark:text-white/90 font-medium">{lead.company}</td>
                      <td className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">{lead.contactPerson}</td>
                      <td className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">{lead.phone}</td>
                      <td className="px-5 py-4 text-theme-sm">
                        <Badge size="sm" color={getStatusColor(lead.status)}>{lead.status}</Badge>
                      </td>
                      <td className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">{lead.assignedTo}</td>
                      <td className="px-5 py-4 text-theme-sm">
                        <button
                          onClick={() => navigate(`/leads/${lead.id}`)}
                          className="p-1.5 text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10 rounded-lg transition cursor-pointer"
                          title="View"
                        >
                          <FiEye className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      No leads match your search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
      </div>

    </>
  );
}
