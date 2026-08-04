import { useState, useMemo } from "react";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Badge from "../../../components/ui/badge/Badge";
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import Select from "../../../components/form/Select";
import { Modal } from "../../../components/ui/modal";
import { useModal } from "../../../hooks/useModal";
// import { Dropdown } from "../../../components/ui/dropdown/Dropdown"; // Status filter commented out
// import { DropdownItem } from "../../../components/ui/dropdown/DropdownItem"; // Status filter commented out
import { Pagination } from "../../../components/ui/pagination/Pagination";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "../../../components/ui/table";
import { ChevronDownIcon, ChevronUpIcon } from "../../../icons";
import { FiEye, FiEdit, FiTrash2, FiPlus } from "react-icons/fi";
import { useToast } from "../../../hooks/useToast";
import { initialQaTickets, QaTicket } from "../data/qaData";

export default function QaList() {
  const { showToast } = useToast();
  const [qaTickets, setQaTickets] = useState<QaTicket[]>(initialQaTickets);

  const [searchQuery, setSearchQuery] = useState("");
  // setStatusFilter removed while the Status filter dropdown is commented out
  const [statusFilter] = useState("all");
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof QaTicket>("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Dropdown states
  // const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false); // Status filter commented out

  // Modal states
  const formModal = useModal();
  const deleteModal = useModal();
  const viewModal = useModal();

  const [selectedTicket, setSelectedTicket] = useState<QaTicket | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");

  // Form Fields states
  const [title, setTitle] = useState("");
  const [project, setProject] = useState("");
  const [priority, setPriority] = useState<QaTicket["priority"]>("Medium");
  const [status, setStatus] = useState<QaTicket["status"]>("Open");
  const [assignee, setAssignee] = useState("");
  const [reportedBy, setReportedBy] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleOpenCreate = () => {
    setModalMode("create");
    setSelectedTicket(null);
    setTitle("");
    setProject("");
    setPriority("Medium");
    setStatus("Open");
    setAssignee("");
    setReportedBy("");
    setErrors({});
    formModal.openModal();
  };

  const handleOpenEdit = (t: QaTicket) => {
    setModalMode("edit");
    setSelectedTicket(t);
    setTitle(t.title);
    setProject(t.project);
    setPriority(t.priority);
    setStatus(t.status);
    setAssignee(t.assignee);
    setReportedBy(t.reportedBy);
    setErrors({});
    formModal.openModal();
  };

  const handleOpenView = (t: QaTicket) => {
    setSelectedTicket(t);
    viewModal.openModal();
  };

  const handleOpenDelete = (t: QaTicket) => {
    setSelectedTicket(t);
    deleteModal.openModal();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Defect title is required.";
    if (!project.trim()) newErrors.project = "Project is required.";
    if (!assignee.trim()) newErrors.assignee = "Assignee is required.";
    if (!reportedBy.trim()) newErrors.reportedBy = "Reporter name is required.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast("Please fill all required fields correctly.", "error");
      return;
    }

    if (modalMode === "create") {
      const bugNumber = `BUG-0${qaTickets.length + 1}`;
      const newTicket: QaTicket = {
        id: qaTickets.length > 0 ? Math.max(...qaTickets.map((t) => t.id)) + 1 : 1,
        bugNo: bugNumber,
        title: title.trim(),
        project: project.trim(),
        priority,
        status,
        assignee: assignee.trim(),
        reportedBy: reportedBy.trim(),
        date: new Date().toISOString().split("T")[0],
      };
      const updated = [...qaTickets, newTicket];
      setQaTickets(updated);
      showToast("Defect logged successfully.", "success");
    } else if (modalMode === "edit" && selectedTicket) {
      const updated = qaTickets.map((t) =>
        t.id === selectedTicket.id
          ? {
              ...t,
              title: title.trim(),
              project: project.trim(),
              priority,
              status,
              assignee: assignee.trim(),
              reportedBy: reportedBy.trim(),
            }
          : t
      );
      setQaTickets(updated);
      showToast("Defect updated successfully.", "success");
    }
    formModal.closeModal();
  };

  const handleDeleteConfirm = () => {
    if (selectedTicket) {
      const updated = qaTickets.filter((t) => t.id !== selectedTicket.id);
      setQaTickets(updated);
      showToast("Defect deleted successfully.", "success");
    }
    deleteModal.closeModal();
  };

  // Processing
  const processedTickets = useMemo(() => {
    let result = [...qaTickets];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.bugNo.toLowerCase().includes(query) ||
          t.title.toLowerCase().includes(query) ||
          t.project.toLowerCase().includes(query) ||
          t.assignee.toLowerCase().includes(query) ||
          t.reportedBy.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }

    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortOrder === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

    return result;
  }, [qaTickets, searchQuery, statusFilter, sortField, sortOrder]);

  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return processedTickets.slice(start, start + rowsPerPage);
  }, [processedTickets, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(processedTickets.length / rowsPerPage);

  const getPriorityColor = (p: QaTicket["priority"]) => {
    switch (p) {
      case "Critical":
        return "error";
      case "High":
        return "error";
      case "Medium":
        return "warning";
      case "Low":
        return "info";
      default:
        return "light";
    }
  };

  const getStatusColor = (s: QaTicket["status"]) => {
    switch (s) {
      case "Open":
        return "error";
      case "In Progress":
        return "warning";
      case "Retesting":
        return "info";
      case "Closed":
        return "success";
      default:
        return "light";
    }
  };

  const handleSort = (field: keyof QaTicket) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  return (
    <>
      <PageMeta
        title="QA Management | SaiFlow"
        description="Log and resolve project defects, issues, and test cases in SaiFlow CRM & ERP."
      />
      <PageBreadcrumb pageTitle="QA Management" />

      <div className="flex flex-col gap-4 mb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full lg:w-auto">
          <div className="w-full sm:w-64">
            <Input
              type="text"
              placeholder="Search Defects..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          {/* Status filter (commented out per Task 1)
          <div className="relative">
            <button
              onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
              className="flex items-center justify-between h-11 w-44 rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 cursor-pointer dropdown-toggle hover:bg-gray-50 dark:hover:bg-white/5"
            >
              <span className="truncate text-left flex-1">{statusFilter === "all" ? "All Statuses" : statusFilter}</span>
              <ChevronDownIcon className="w-4 h-4 text-gray-500 shrink-0 ml-2" />
            </button>
            <Dropdown
              isOpen={isStatusFilterOpen}
              onClose={() => setIsStatusFilterOpen(false)}
              className="left-0 w-40 p-1 mt-2"
            >
              <ul className="flex flex-col gap-0.5">
                <li>
                  <DropdownItem
                    onItemClick={() => {
                      setStatusFilter("all");
                      setCurrentPage(1);
                      setIsStatusFilterOpen(false);
                    }}
                    className={`cursor-pointer rounded-lg text-left w-full px-3 py-2 text-sm ${
                      statusFilter === "all" ? "bg-brand-500 text-white" : "text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                    }`}
                  >
                    All Statuses
                  </DropdownItem>
                </li>
                {["Open", "In Progress", "Retesting", "Closed"].map((st) => (
                  <li key={st}>
                    <DropdownItem
                      onItemClick={() => {
                        setStatusFilter(st);
                        setCurrentPage(1);
                        setIsStatusFilterOpen(false);
                      }}
                      className={`cursor-pointer rounded-lg text-left w-full px-3 py-2 text-sm ${
                        statusFilter === st ? "bg-brand-500 text-white" : "text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                      }`}
                    >
                      {st}
                    </DropdownItem>
                  </li>
                ))}
              </ul>
            </Dropdown>
          </div>
          */}
        </div>
        <Button onClick={handleOpenCreate} variant="primary" size="sm" startIcon={<FiPlus />}>
          Log Defect
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <th className="px-5 py-3 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400">
                  <button onClick={() => handleSort("bugNo")} className="flex items-center gap-1">
                    ID {sortField === "bugNo" && (sortOrder === "asc" ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />)}
                  </button>
                </th>
                <th className="px-5 py-3 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400">Defect Details</th>
                <th className="px-5 py-3 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400">Project</th>
                <th className="px-5 py-3 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400">Priority</th>
                <th className="px-5 py-3 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400">Assignee</th>
                <th className="px-5 py-3 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-5 py-3 text-end text-theme-xs font-semibold text-gray-500 dark:text-gray-400">Actions</th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTickets.length > 0 ? (
                paginatedTickets.map((ticket) => (
                  <TableRow key={ticket.id} className="border-b border-gray-100 dark:border-white/[0.05] hover:bg-gray-55/50 dark:hover:bg-white/[0.01]">
                    <TableCell className="px-5 py-4 text-sm font-bold text-gray-800 dark:text-white/95">{ticket.bugNo}</TableCell>
                    <TableCell className="px-5 py-4 text-sm font-semibold text-gray-800 dark:text-white/90">{ticket.title}</TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-700 dark:text-gray-400">{ticket.project}</TableCell>
                    <TableCell className="px-5 py-4 text-sm">
                      <Badge color={getPriorityColor(ticket.priority)}>{ticket.priority}</Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-700 dark:text-gray-400">{ticket.assignee}</TableCell>
                    <TableCell className="px-5 py-4 text-sm">
                      <Badge color={getStatusColor(ticket.status)} variant="solid">{ticket.status}</Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-end">
                      <div className="flex justify-end items-center gap-2">
                        <button onClick={() => handleOpenView(ticket)} className="text-gray-500 hover:text-brand-500 p-1"><FiEye size={16} /></button>
                        <button onClick={() => handleOpenEdit(ticket)} className="text-gray-500 hover:text-warning-500 p-1"><FiEdit size={16} /></button>
                        <button onClick={() => handleOpenDelete(ticket)} className="text-gray-500 hover:text-error-500 p-1"><FiTrash2 size={16} /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
                    No defects logged.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {processedTickets.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={processedTickets.length}
          rowsPerPage={rowsPerPage}
          onPageChange={setCurrentPage}
          onRowsPerPageChange={(rows) => {
            setRowsPerPage(rows);
            setCurrentPage(1);
          }}
          itemName="defects"
        />
      )}

      {/* Form Modal */}
      <Modal isOpen={formModal.isOpen} onClose={formModal.closeModal} className="max-w-lg p-6">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
          {modalMode === "create" ? "Log Defect" : "Edit Defect"}
        </h4>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Defect Title / Summary *</label>
            <Input type="text" placeholder="e.g. Login button doesn't trigger oauth authentication" value={title} onChange={(e) => setTitle(e.target.value)} error={!!errors.title} hint={errors.title} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Project *</label>
              <Input type="text" placeholder="SaiFlow ERP Phase 1" value={project} onChange={(e) => setProject(e.target.value)} error={!!errors.project} hint={errors.project} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Assignee *</label>
              <Input type="text" placeholder="e.g. John Doe" value={assignee} onChange={(e) => setAssignee(e.target.value)} error={!!errors.assignee} hint={errors.assignee} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Priority</label>
              <Select
                options={[
                  { value: "Critical", label: "Critical" },
                  { value: "High", label: "High" },
                  { value: "Medium", label: "Medium" },
                  { value: "Low", label: "Low" },
                ]}
                defaultValue={priority}
                onChange={(val) => setPriority(val as any)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Status</label>
              <Select
                options={[
                  { value: "Open", label: "Open" },
                  { value: "In Progress", label: "In Progress" },
                  { value: "Retesting", label: "Retesting" },
                  { value: "Closed", label: "Closed" },
                ]}
                defaultValue={status}
                onChange={(val) => setStatus(val as any)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Reported By *</label>
            <Input type="text" placeholder="e.g. Jane Smith" value={reportedBy} onChange={(e) => setReportedBy(e.target.value)} error={!!errors.reportedBy} hint={errors.reportedBy} />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button onClick={formModal.closeModal} variant="outline" size="sm">Cancel</Button>
            <Button type="submit" variant="primary" size="sm">Save Defect</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={deleteModal.isOpen} onClose={deleteModal.closeModal} className="max-w-md p-6">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">Delete Defect</h4>
        <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete defect "{selectedTicket?.bugNo}"? This action cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <Button onClick={deleteModal.closeModal} variant="outline" size="sm">Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="primary" className="bg-error-600 hover:bg-error-700 border-error-600 text-white" size="sm">Delete</Button>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={viewModal.isOpen} onClose={viewModal.closeModal} className="max-w-md p-6">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">Defect Details</h4>
        {selectedTicket && (
          <div className="space-y-3">
            <div className="flex justify-between border-b pb-2 dark:border-white/[0.05]"><span className="text-sm font-medium text-gray-500">Bug Number</span><span className="text-sm text-gray-800 dark:text-white font-bold">{selectedTicket.bugNo}</span></div>
            <div className="flex justify-between border-b pb-2 dark:border-white/[0.05]"><span className="text-sm font-medium text-gray-500">Summary</span><span className="text-sm text-gray-800 dark:text-white">{selectedTicket.title}</span></div>
            <div className="flex justify-between border-b pb-2 dark:border-white/[0.05]"><span className="text-sm font-medium text-gray-500">Project</span><span className="text-sm text-gray-800 dark:text-white">{selectedTicket.project}</span></div>
            <div className="flex justify-between border-b pb-2 dark:border-white/[0.05]"><span className="text-sm font-medium text-gray-500">Priority</span><Badge color={getPriorityColor(selectedTicket.priority)}>{selectedTicket.priority}</Badge></div>
            <div className="flex justify-between border-b pb-2 dark:border-white/[0.05]"><span className="text-sm font-medium text-gray-500">Assignee</span><span className="text-sm text-gray-800 dark:text-white">{selectedTicket.assignee}</span></div>
            <div className="flex justify-between border-b pb-2 dark:border-white/[0.05]"><span className="text-sm font-medium text-gray-500">Reported By</span><span className="text-sm text-gray-800 dark:text-white">{selectedTicket.reportedBy}</span></div>
            <div className="flex justify-between border-b pb-2 dark:border-white/[0.05]"><span className="text-sm font-medium text-gray-500">Status</span><Badge color={getStatusColor(selectedTicket.status)} variant="solid">{selectedTicket.status}</Badge></div>
            <div className="flex justify-between pb-2"><span className="text-sm font-medium text-gray-500">Date Logged</span><span className="text-sm text-gray-800 dark:text-white">{selectedTicket.date}</span></div>
          </div>
        )}
        <div className="flex justify-end mt-6">
          <Button onClick={viewModal.closeModal} variant="outline" size="sm">Close</Button>
        </div>
      </Modal>
    </>
  );
}
