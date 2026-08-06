import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../../components/common/PageMeta";
import Badge from "../../../components/ui/badge/Badge";
import Input from "../../../components/form/input/InputField";
// import { Dropdown } from "../../../components/ui/dropdown/Dropdown"; // Table filter dropdowns commented out
// import { DropdownItem } from "../../../components/ui/dropdown/DropdownItem"; // Table filter dropdowns commented out
import { Pagination } from "../../../components/ui/pagination/Pagination";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
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
import { useToast } from "../../../hooks/useToast";
import { formatTime } from "../../../utils/dateFormatter";
import { getStatusLabel, getStatusBadgeColor } from "../../LeadManagement/utils/leadStatus";
import { leadService } from "../../../services/leadService";
import { reportService } from "../../../services/reportService";
import { userService } from "../../../services/userService";
import { connectService } from "../../../services/connectService";

interface Lead {
  id: number;
  sNo?: number;
  company: string;
  contactPerson: string;
  phone: string;
  status: string;
  assignedTo: string;
}

interface ApiLead {
  id: number;
  title?: string;
  company?: string;
  contactPerson?: string;
  phone?: string;
  status?: string;
  assignedTo?: { name: string } | null;
  assignedToId?: number | null;
}

interface CallLead extends Lead {
  sNo: number;
  followUpTime?: string;
}

interface FollowUp {
  id: number;
  leadId: number;
  followUpDate?: string;
  followUpTime?: string;
  status?: string;
  company?: string;
  contactPerson?: string;
}

interface DashboardCharts {
  leadTrend: { categories: string[]; series: number[] };
  conversion: { categories: string[]; won: number[]; lost: number[] };
}

interface DashboardSummary {
  totalLeads: number;
  unassignedLeads: number;
  wonLeads: number;
  scheduledMeetings: number;
  openProposals: number;
  activeClients: number;
  totalWonRevenue: number;
  conversionRate: string;
}

export default function Dashboard() {
  const { showToast } = useToast();
  const navigate = useNavigate();

  // ── Backend API states ──────────────────────────────────────
  const [rawLeads, setRawLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<{ id: number; name: string; role?: { name?: string } | null }[]>([]);
  const [connects, setConnects] = useState<FollowUp[]>([]);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary>({
    totalLeads: 0,
    unassignedLeads: 0,
    wonLeads: 0,
    scheduledMeetings: 0,
    openProposals: 0,
    activeClients: 0,
    totalWonRevenue: 0,
    conversionRate: "0%"
  });
  const [dashboardCharts, setDashboardCharts] = useState<DashboardCharts>({
    leadTrend: { categories: [], series: [] },
    conversion: { categories: [], won: [], lost: [] }
  });

  const fetchDashboardData = async () => {
    try {
      const [summary, leadsData, usersData, chartsData, connectsData] = await Promise.all([
        reportService.getDashboardSummary(),
        leadService.getLeads({ limit: 100 }),
        userService.getUsers({ limit: 100 }).catch((err) => {
          console.warn("Failed to fetch users list (likely permission restricted):", err);
          return { data: [] };
        }),
        reportService.getDashboardCharts(),
        connectService.getConnects({ limit: 200 })
      ]);
      if (summary) setDashboardSummary(summary);
      if (chartsData) setDashboardCharts(chartsData);
      if (leadsData && Array.isArray(leadsData.data)) {
        const mapped = leadsData.data.map((l: ApiLead) => ({
          ...l,
          company: l.title || l.company || "",
          contactPerson: l.contactPerson || "",
          phone: l.phone || "",
          status: l.status || "NEW",
          assignedTo: l.assignedTo?.name || "Unassigned",
          assignedToId: l.assignedToId
        }));
        setRawLeads(mapped);
      }
      if (usersData?.data) setUsers(usersData.data);
      if (connectsData?.data) setConnects(connectsData.data);
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    }
  };
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const localLeads = useMemo<Lead[]>(() => {
    return rawLeads.map((l, index) => ({
      id: l.id,
      sNo: index + 1,
      company: l.company,
      contactPerson: l.contactPerson,
      phone: l.phone,
      status: l.status,
      assignedTo: l.assignedTo || "Unassigned",
    }));
  }, [rawLeads]);

  // ── Table state ─────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  // setStatusFilter / setAssigneeFilter removed while the filter dropdowns are commented out
  const [statusFilter] = useState("all");
  const [assigneeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // ── Today's call table state ─────────────────────────────────
  const [callSearchQuery, setCallSearchQuery] = useState("");
  // setCallStatusFilter / setCallAssigneeFilter removed while the filter dropdowns are commented out
  const [callStatusFilter] = useState("all");
  const [callAssigneeFilter] = useState("all");
  const [callCurrentPage, setCallCurrentPage] = useState(1);
  const [callRowsPerPage, setCallRowsPerPage] = useState(5);

  // ── Today Lead Calls & Reassign Action ────────────────────────
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const followUpByLeadId = useMemo(() => {
    const map: Record<number, string> = {};
    const ordered = [...connects].sort((a, b) => {
      const aScore = a.status === "SCHEDULED" ? 0 : 1;
      const bScore = b.status === "SCHEDULED" ? 0 : 1;
      return aScore - bScore;
    });
    for (const c of ordered) {
      if (c.followUpDate === todayStr && c.followUpTime && map[c.leadId] === undefined) {
        map[c.leadId] = c.followUpTime;
      }
    }
    return map;
  }, [connects, todayStr]);

  const todayCalls = useMemo<CallLead[]>(() => {
    const list = rawLeads.filter(
      (l) => l.status === "MEETING_SCHEDULED" || l.status === "CONTACTED" || l.status === "NEW"
    );
    const base = list.length > 0 ? list : rawLeads.slice(0, 5);
    return base.map((l, index) => ({
      ...l,
      sNo: index + 1,
      followUpTime: followUpByLeadId[l.id],
    }));
  }, [rawLeads, followUpByLeadId]);

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

    return result;
  }, [todayCalls, callSearchQuery, callStatusFilter, callAssigneeFilter]);

  const paginatedTodayCalls = useMemo(() => {
    const startIndex = (callCurrentPage - 1) * callRowsPerPage;
    return filteredTodayCalls.slice(startIndex, startIndex + callRowsPerPage);
  }, [filteredTodayCalls, callCurrentPage, callRowsPerPage]);

  const todayCallsTotal = filteredTodayCalls.length;
  const todayCallsTotalPages = Math.ceil(todayCallsTotal / callRowsPerPage);

  const handleReassignCall = async (leadId: number, targetAssignee: string) => {
    if (!targetAssignee) return;

    const foundUser = users.find((u) => u.name === targetAssignee);
    if (!foundUser) {
      showToast(`User "${targetAssignee}" not found for reassignment.`, "error");
      return;
    }

    try {
      await leadService.assignLead(leadId, foundUser.id);
      showToast(`Lead call reassigned to ${targetAssignee} successfully!`, "success");
      fetchDashboardData();
    } catch {
      showToast("Failed to reassign lead call.", "error");
    }
  };

  /* Filter option lists commented out per Task 1 / Task 2
  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "New", label: "New" },
    { value: "Contacted", label: "Contacted" },
    { value: "Qualified", label: "Qualified" },
    { value: "Proposal sent", label: "Proposal Sent" },
    { value: "Won", label: "Won" },
    { value: "Lost", label: "Lost" },
  ];

  const callStatusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "New", label: "New" },
    { value: "Contacted", label: "Contacted" },
    { value: "Scheduled", label: "Scheduled" },
  ];

  const assigneeOptions = [
    { value: "all", label: "All Assignees" },
    ...ASSIGNEES.map((a) => ({ value: a, label: a })),
  ];
  */

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

    return result;
  }, [searchQuery, statusFilter, assigneeFilter, localLeads]);

  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return processedLeads.slice(startIndex, startIndex + rowsPerPage);
  }, [processedLeads, currentPage, rowsPerPage]);

  const totalItems = processedLeads.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);

  // ── 4 KPI METRICS ──────────────────────────────────────────
  const kpiMetrics = useMemo(() => {
    return [
      {
        label: "Total Leads",
        value: dashboardSummary.totalLeads || 0,
        icon: <FiLayers className="text-brand-500 w-5 h-5" />,
      },
      {
        label: "Active Clients",
        value: dashboardSummary.activeClients || 0,
        icon: <FiUsers className="text-info-500 w-5 h-5" />,
      },
      {
        label: "Won Leads",
        value: dashboardSummary.wonLeads || 0,
        icon: <FiCheckCircle className="text-success-500 w-5 h-5" />,
      },
      {
        label: "Potential Revenue",
        value: `₹${Number(dashboardSummary.totalWonRevenue || 0).toLocaleString("en-IN")}`,
        icon: <FiCreditCard className="text-warning-500 w-5 h-5" />,
      },
    ];
  }, [dashboardSummary]);

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
      categories: dashboardCharts.leadTrend.categories,
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
    { name: "Leads generated", data: dashboardCharts.leadTrend.series },
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
      categories: dashboardCharts.conversion.categories,
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
    { name: "Won leads", data: dashboardCharts.conversion.won },
    { name: "Lost leads", data: dashboardCharts.conversion.lost },
  ];

  // ── RENDER ──────────────────────────────────────────────────
  return (
    <>
      <PageMeta
        title="Dashboard | SaiFlow"
        description="SaiFlow CRM dashboard — overview of leads, clients, and pipeline."
      />
      {/* ── PAGE TITLE ─────────────────────────────────────── */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
          Dashboard
        </h2>
      </div>

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
            Lead Generation Trend
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
            Lead Conversion Rate
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
            Today's Lead Calls
          </h3>
        </div>

        {/* Search & filter toolbar */}
        <div className="flex flex-col gap-4 mb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full lg:w-auto">
            <div className="w-full sm:w-64">
              <Input
                type="text"
                placeholder="Search"
                value={callSearchQuery}
                onChange={(e) => {
                  setCallSearchQuery(e.target.value);
                  setCallCurrentPage(1);
                }}
              />
            </div>
            {/* Today's Lead Calls filter dropdowns (Status, Assignee) commented out per Task 1
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
                      "Filter by Status"}
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
                      "Filter by Assignee"}
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
            */}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-white/[0.05]">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-900/50">
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">S.No</th>
                <th className="px-4 py-2.5 text-start text-xs font-semibold text-gray-500 dark:text-gray-400">Lead ID</th>
                <th className="px-4 py-2.5 text-start text-xs font-semibold text-gray-500 dark:text-gray-400">Company</th>
                <th className="px-4 py-2.5 text-start text-xs font-semibold text-gray-500 dark:text-gray-400">Contact Person</th>
                <th className="px-4 py-2.5 text-start text-xs font-semibold text-gray-500 dark:text-gray-400">Scheduled Time</th>
                <th className="px-4 py-2.5 text-start text-xs font-semibold text-gray-500 dark:text-gray-400">Current Assignee</th>
                <th className="px-4 py-2.5 text-end text-xs font-semibold text-gray-500 dark:text-gray-400">Quick Reassign</th>
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
                      {lead.followUpTime ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-medium">
                          <FiClock className="size-3 text-gray-400" />
                          {formatTime(lead.followUpTime)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Not scheduled</span>
                      )}
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
                          Reassign To...
                        </option>
                        {users
                          .filter((u) => u.name !== "System Administrator" && u.role?.name !== "Administrator")
                          .map((u) => u.name)
                          .filter((name: string) => name && name !== lead.assignedTo)
                          .map((name: string) => (
                            <option
                              key={name}
                              value={name}
                              className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 py-1"
                            >
                              {name}
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
              Recent Leads
            </h3>
          </div>

          {/* Search & filter toolbar */}
          <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full lg:w-auto">
              <div className="w-full sm:w-64">
                <Input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                />
              </div>
              {/* Recent Leads filter dropdowns (Status, Assignee) commented out per Task 2
              <div className="flex items-center gap-3">
                <div className="relative">
                  <button
                    onClick={() => { setIsStatusOpen(!isStatusOpen); setIsAssigneeOpen(false); }}
                    className="flex items-center justify-between h-11 w-40 rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer dropdown-toggle hover:bg-gray-55 dark:hover:bg-white/5"
                  >
                    <span>{statusOptions.find((o) => o.value === statusFilter)?.label || "Filter by Status"}</span>
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
                    <span>{assigneeOptions.find((o) => o.value === assigneeFilter)?.label || "Filter by Assignee"}</span>
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
              */}
            </div>
          </div>

          <div className="max-w-full overflow-x-auto px-4">
            <table className="min-w-full">
              <thead className="border-b border-gray-100 dark:border-white/[0.05] sticky top-0 bg-white dark:bg-gray-900 z-10">
                <tr>
                  <th className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    S.No
                  </th>
                  <th className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    Company
                  </th>
                  <th className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    Contact Person
                  </th>
                  <th className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    Phone
                  </th>
                  <th className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    Assigned To
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
                        <Badge size="sm" color={getStatusBadgeColor(lead.status)}>{getStatusLabel(lead.status)}</Badge>
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
