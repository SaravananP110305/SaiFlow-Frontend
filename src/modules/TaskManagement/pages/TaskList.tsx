import { useState, useMemo } from "react";
import { getStorage, setStorage } from "../../../utils/storage";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Badge from "../../../components/ui/badge/Badge";
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import Select from "../../../components/form/Select";
import { Modal } from "../../../components/ui/modal";
import DatePicker from "../../../components/form/date-picker";
import { formatDate } from "../../../utils/dateFormatter";
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
import { FiEye, FiEdit, FiTrash2, FiPlus } from "react-icons/fi";
import { useToast } from "../../../hooks/useToast";
import { initialTasks, Task } from "../data/tasksData";

export default function TaskList() {
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>(() =>
    getStorage("saiflow_tasks", initialTasks)
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof Task>("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Dropdown states
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);

  // Modal control states
  const formModal = useModal();
  const deleteModal = useModal();
  const viewModal = useModal();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");

  // Form Fields states
  const [title, setTitle] = useState("");
  const [project, setProject] = useState("");
  const [assignee, setAssignee] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("Medium");
  const [status, setStatus] = useState<Task["status"]>("Todo");
  const [dueDate, setDueDate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleOpenCreate = () => {
    setModalMode("create");
    setSelectedTask(null);
    setTitle("");
    setProject("");
    setAssignee("");
    setPriority("Medium");
    setStatus("Todo");
    setDueDate("");
    setErrors({});
    formModal.openModal();
  };

  const handleOpenEdit = (t: Task) => {
    setModalMode("edit");
    setSelectedTask(t);
    setTitle(t.title);
    setProject(t.project);
    setAssignee(t.assignee);
    setPriority(t.priority);
    setStatus(t.status);
    setDueDate(t.dueDate);
    setErrors({});
    formModal.openModal();
  };

  const handleOpenView = (t: Task) => {
    setSelectedTask(t);
    viewModal.openModal();
  };

  const handleOpenDelete = (t: Task) => {
    setSelectedTask(t);
    deleteModal.openModal();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Task title is required.";
    if (!project.trim()) newErrors.project = "Project is required.";
    if (!assignee.trim()) newErrors.assignee = "Assignee is required.";
    if (!dueDate.trim()) newErrors.dueDate = "Due Date is required.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast("Please fill all required fields correctly.", "error");
      return;
    }

    if (modalMode === "create") {
      const newTask: Task = {
        id: tasks.length > 0 ? Math.max(...tasks.map((t) => t.id)) + 1 : 1,
        title: title.trim(),
        project: project.trim(),
        assignee: assignee.trim(),
        priority,
        status,
        dueDate,
      };
      const updated = [...tasks, newTask];
      setTasks(updated);
      setStorage("saiflow_tasks", updated);
      showToast("Task created successfully.", "success");
    } else if (modalMode === "edit" && selectedTask) {
      const updated = tasks.map((t) =>
        t.id === selectedTask.id
          ? {
              ...t,
              title: title.trim(),
              project: project.trim(),
              assignee: assignee.trim(),
              priority,
              status,
              dueDate,
            }
          : t
      );
      setTasks(updated);
      setStorage("saiflow_tasks", updated);
      showToast("Task details updated.", "success");
    }
    formModal.closeModal();
  };

  const handleDeleteConfirm = () => {
    if (selectedTask) {
      const updated = tasks.filter((t) => t.id !== selectedTask.id);
      setTasks(updated);
      setStorage("saiflow_tasks", updated);
      showToast("Task deleted successfully.", "success");
    }
    deleteModal.closeModal();
  };

  // Processing
  const processedTasks = useMemo(() => {
    let result = [...tasks];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.project.toLowerCase().includes(query) ||
          t.assignee.toLowerCase().includes(query)
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
  }, [tasks, searchQuery, statusFilter, sortField, sortOrder]);

  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return processedTasks.slice(start, start + rowsPerPage);
  }, [processedTasks, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(processedTasks.length / rowsPerPage);

  const getPriorityColor = (p: Task["priority"]) => {
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

  const getStatusColor = (s: Task["status"]) => {
    switch (s) {
      case "Todo":
        return "light";
      case "In Progress":
        return "warning";
      case "QA":
        return "info";
      case "Done":
        return "success";
      default:
        return "light";
    }
  };

  const handleSort = (field: keyof Task) => {
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
        title="Task Management | SaiFlow"
        description="Monitor team sprints, milestones, and individual task checklists in SaiFlow CRM & ERP."
      />
      <PageBreadcrumb pageTitle="Task Management" />

      <div className="flex flex-col gap-4 mb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full lg:w-auto">
          <div className="w-full sm:w-64">
            <Input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
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
                {["Todo", "In Progress", "QA", "Done"].map((st) => (
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
        </div>
        <Button onClick={handleOpenCreate} variant="primary" size="sm" startIcon={<FiPlus />}>
          Create Task
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <th className="px-5 py-3 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400">
                  <button onClick={() => handleSort("title")} className="flex items-center gap-1">
                    Task Title {sortField === "title" && (sortOrder === "asc" ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />)}
                  </button>
                </th>
                <th className="px-5 py-3 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400">Project</th>
                <th className="px-5 py-3 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400">Assignee</th>
                <th className="px-5 py-3 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400">Priority</th>
                <th className="px-5 py-3 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-5 py-3 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400">Due Date</th>
                <th className="px-5 py-3 text-end text-theme-xs font-semibold text-gray-500 dark:text-gray-400">Actions</th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTasks.length > 0 ? (
                paginatedTasks.map((t) => (
                  <TableRow key={t.id} className="border-b border-gray-100 dark:border-white/[0.05] hover:bg-gray-55/50 dark:hover:bg-white/[0.01]">
                    <TableCell className="px-5 py-4 text-sm font-semibold text-gray-800 dark:text-white/90">{t.title}</TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-700 dark:text-gray-400">{t.project}</TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-700 dark:text-gray-400">{t.assignee}</TableCell>
                    <TableCell className="px-5 py-4 text-sm">
                      <Badge color={getPriorityColor(t.priority)}>{t.priority}</Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm">
                      <Badge color={getStatusColor(t.status)} variant="solid">{t.status}</Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-700 dark:text-gray-400">{formatDate(t.dueDate)}</TableCell>
                    <TableCell className="px-5 py-4 text-sm text-end">
                      <div className="flex justify-end items-center gap-2">
                        <button onClick={() => handleOpenView(t)} className="text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10 p-1.5 rounded-lg transition" title="View"><FiEye size={16} /></button>
                        <button onClick={() => handleOpenEdit(t)} className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10 p-1.5 rounded-lg transition" title="Edit"><FiEdit size={16} /></button>
                        <button onClick={() => handleOpenDelete(t)} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 p-1.5 rounded-lg transition" title="Delete"><FiTrash2 size={16} /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
                    No tasks found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {processedTasks.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={processedTasks.length}
          rowsPerPage={rowsPerPage}
          onPageChange={setCurrentPage}
          onRowsPerPageChange={(rows) => {
            setRowsPerPage(rows);
            setCurrentPage(1);
          }}
          itemName="tasks"
        />
      )}

      {/* Form Modal */}
      <Modal isOpen={formModal.isOpen} onClose={formModal.closeModal} className="max-w-lg p-6">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
          {modalMode === "create" ? "Create Task" : "Edit Task"}
        </h4>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Task Title *</label>
            <Input type="text" placeholder="e.g. Design permission matrix grid layout" value={title} onChange={(e) => setTitle(e.target.value)} error={!!errors.title} hint={errors.title} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Project *</label>
              <Input type="text" placeholder="SaiFlow ERP Phase 1" value={project} onChange={(e) => setProject(e.target.value)} error={!!errors.project} hint={errors.project} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Assignee *</label>
              <Input type="text" placeholder="John Doe" value={assignee} onChange={(e) => setAssignee(e.target.value)} error={!!errors.assignee} hint={errors.assignee} />
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
                  { value: "Todo", label: "Todo" },
                  { value: "In Progress", label: "In Progress" },
                  { value: "QA", label: "QA" },
                  { value: "Done", label: "Done" },
                ]}
                defaultValue={status}
                onChange={(val) => setStatus(val as any)}
              />
            </div>
          </div>
           <div>
             <DatePicker
               id="task-due-date"
               label="Due Date"
               required={true}
               defaultDate={dueDate}
               onChange={(_, dateStr) => setDueDate(dateStr)}
             />
             {errors.dueDate && (
               <span className="mt-1.5 text-xs text-error-600 block">{errors.dueDate}</span>
             )}
           </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button onClick={formModal.closeModal} variant="outline" size="sm">Cancel</Button>
            <Button type="submit" variant="primary" size="sm">Save Task</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={deleteModal.isOpen} onClose={deleteModal.closeModal} className="max-w-md p-6">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">Delete Task</h4>
        <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete task "{selectedTask?.title}"? This action cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <Button onClick={deleteModal.closeModal} variant="outline" size="sm">Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="primary" className="bg-error-600 hover:bg-error-700 border-error-600 text-white" size="sm">Delete</Button>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={viewModal.isOpen} onClose={viewModal.closeModal} className="max-w-md p-6">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">Task Details</h4>
        {selectedTask && (
          <div className="space-y-3">
            <div className="flex justify-between border-b pb-2 dark:border-white/[0.05]"><span className="text-sm font-medium text-gray-500">Task Title</span><span className="text-sm text-gray-800 dark:text-white font-semibold">{selectedTask.title}</span></div>
            <div className="flex justify-between border-b pb-2 dark:border-white/[0.05]"><span className="text-sm font-medium text-gray-500">Project</span><span className="text-sm text-gray-800 dark:text-white">{selectedTask.project}</span></div>
            <div className="flex justify-between border-b pb-2 dark:border-white/[0.05]"><span className="text-sm font-medium text-gray-500">Assignee</span><span className="text-sm text-gray-800 dark:text-white">{selectedTask.assignee}</span></div>
            <div className="flex justify-between border-b pb-2 dark:border-white/[0.05]"><span className="text-sm font-medium text-gray-500">Priority</span><Badge color={getPriorityColor(selectedTask.priority)}>{selectedTask.priority}</Badge></div>
            <div className="flex justify-between border-b pb-2 dark:border-white/[0.05]"><span className="text-sm font-medium text-gray-500">Status</span><Badge color={getStatusColor(selectedTask.status)} variant="solid">{selectedTask.status}</Badge></div>
            <div className="flex justify-between pb-2"><span className="text-sm font-medium text-gray-500">Due Date</span><span className="text-sm text-gray-800 dark:text-white">{formatDate(selectedTask.dueDate)}</span></div>
          </div>
        )}
        <div className="flex justify-end mt-6">
          <Button onClick={viewModal.closeModal} variant="outline" size="sm">Close</Button>
        </div>
      </Modal>
    </>
  );
}
