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
import { initialProjects, Project } from "../data/projectsData";

export default function ProjectList() {
  const { showToast } = useToast();
  const [projects, setProjects] = useState<Project[]>(() =>
    getStorage("saiflow_projects", initialProjects)
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof Project>("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Dropdown states
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);

  // Modal control states
  const formModal = useModal();
  const deleteModal = useModal();
  const viewModal = useModal();

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");

  // Form Fields states
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [category, setCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<Project["status"]>("Planning");
  const [progress, setProgress] = useState("0");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleOpenCreate = () => {
    setModalMode("create");
    setSelectedProject(null);
    setName("");
    setClient("");
    setCategory("");
    setStartDate("");
    setDeadline("");
    setStatus("Planning");
    setProgress("0");
    setErrors({});
    formModal.openModal();
  };

  const handleOpenEdit = (proj: Project) => {
    setModalMode("edit");
    setSelectedProject(proj);
    setName(proj.name);
    setClient(proj.client);
    setCategory(proj.category);
    setStartDate(proj.startDate);
    setDeadline(proj.deadline);
    setStatus(proj.status);
    setProgress(String(proj.progress));
    setErrors({});
    formModal.openModal();
  };

  const handleOpenView = (proj: Project) => {
    setSelectedProject(proj);
    viewModal.openModal();
  };

  const handleOpenDelete = (proj: Project) => {
    setSelectedProject(proj);
    deleteModal.openModal();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Project name is required.";
    if (!client.trim()) newErrors.client = "Client is required.";
    if (!category.trim()) newErrors.category = "Category is required.";
    if (!startDate.trim()) newErrors.startDate = "Start Date is required.";
    if (!deadline.trim()) newErrors.deadline = "Deadline is required.";
    if (isNaN(Number(progress)) || Number(progress) < 0 || Number(progress) > 100) {
      newErrors.progress = "Progress must be a percentage between 0 and 100.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast("Please fill all required fields correctly.", "error");
      return;
    }

    if (modalMode === "create") {
      const newProj: Project = {
        id: projects.length > 0 ? Math.max(...projects.map((p) => p.id)) + 1 : 1,
        name: name.trim(),
        client: client.trim(),
        category: category.trim(),
        startDate,
        deadline,
        status,
        progress: Number(progress),
      };
      const updated = [...projects, newProj];
      setProjects(updated);
      setStorage("saiflow_projects", updated);
      showToast("Project created successfully.", "success");
    } else if (modalMode === "edit" && selectedProject) {
      const updated = projects.map((p) =>
        p.id === selectedProject.id
          ? {
              ...p,
              name: name.trim(),
              client: client.trim(),
              category: category.trim(),
              startDate,
              deadline,
              status,
              progress: Number(progress),
            }
          : p
      );
      setProjects(updated);
      setStorage("saiflow_projects", updated);
      showToast("Project updated successfully.", "success");
    }
    formModal.closeModal();
  };

  const handleDeleteConfirm = () => {
    if (selectedProject) {
      const updated = projects.filter((p) => p.id !== selectedProject.id);
      setProjects(updated);
      setStorage("saiflow_projects", updated);
      showToast("Project deleted successfully.", "success");
    }
    deleteModal.closeModal();
  };

  // Processing
  const processedProjects = useMemo(() => {
    let result = [...projects];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.client.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
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
  }, [projects, searchQuery, statusFilter, sortField, sortOrder]);

  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return processedProjects.slice(start, start + rowsPerPage);
  }, [processedProjects, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(processedProjects.length / rowsPerPage);

  const getStatusColor = (s: Project["status"]) => {
    switch (s) {
      case "Planning":
        return "light";
      case "In Progress":
        return "warning";
      case "On Hold":
        return "error";
      case "Completed":
        return "success";
      default:
        return "light";
    }
  };

  const handleSort = (field: keyof Project) => {
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
        title="Project Management | SaiFlow"
        description="Monitor and track client deliverable projects and schedules in SaiFlow ERP."
      />
      <PageBreadcrumb pageTitle="Project Management" />

      <div className="flex flex-col gap-4 mb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full lg:w-auto">
          <div className="w-full sm:w-64">
            <Input
              type="text"
              placeholder="Search Projects..."
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
                {["Planning", "In Progress", "On Hold", "Completed"].map((st) => (
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
          Create Project
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <th className="px-5 py-3 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400">
                  <button onClick={() => handleSort("name")} className="flex items-center gap-1">
                    Project Name {sortField === "name" && (sortOrder === "asc" ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />)}
                  </button>
                </th>
                <th className="px-5 py-3 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400">Client</th>
                <th className="px-5 py-3 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400">Category</th>
                <th className="px-5 py-3 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400">Timeline</th>
                <th className="px-5 py-3 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400">Progress</th>
                <th className="px-5 py-3 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-5 py-3 text-end text-theme-xs font-semibold text-gray-500 dark:text-gray-400">Actions</th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProjects.length > 0 ? (
                paginatedProjects.map((proj) => (
                  <TableRow key={proj.id} className="border-b border-gray-100 dark:border-white/[0.05] hover:bg-gray-55/50 dark:hover:bg-white/[0.01]">
                    <TableCell className="px-5 py-4 text-sm font-semibold text-gray-800 dark:text-white/90">{proj.name}</TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-700 dark:text-gray-400">{proj.client}</TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-700 dark:text-gray-400">{proj.category}</TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-700 dark:text-gray-400">
                      {formatDate(proj.startDate)} to {formatDate(proj.deadline)}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm w-44">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: `${proj.progress}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-800 dark:text-white">{proj.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm">
                      <Badge color={getStatusColor(proj.status)} variant="solid">{proj.status}</Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-end">
                      <div className="flex justify-end items-center gap-2">
                        <button onClick={() => handleOpenView(proj)} className="text-gray-500 hover:text-brand-500 p-1"><FiEye size={16} /></button>
                        <button onClick={() => handleOpenEdit(proj)} className="text-gray-500 hover:text-warning-500 p-1"><FiEdit size={16} /></button>
                        <button onClick={() => handleOpenDelete(proj)} className="text-gray-500 hover:text-error-500 p-1"><FiTrash2 size={16} /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
                    No projects found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {processedProjects.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={processedProjects.length}
          rowsPerPage={rowsPerPage}
          onPageChange={setCurrentPage}
          onRowsPerPageChange={(rows) => {
            setRowsPerPage(rows);
            setCurrentPage(1);
          }}
          itemName="projects"
        />
      )}

      {/* Form Modal */}
      <Modal isOpen={formModal.isOpen} onClose={formModal.closeModal} className="max-w-lg p-6">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
          {modalMode === "create" ? "Create Project" : "Edit Project"}
        </h4>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Project Name *</label>
            <Input type="text" placeholder="e.g. SaiFlow ERP Phase 1" value={name} onChange={(e) => setName(e.target.value)} error={!!errors.name} hint={errors.name} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Client Name *</label>
              <Input type="text" placeholder="Aventis Technologies" value={client} onChange={(e) => setClient(e.target.value)} error={!!errors.client} hint={errors.client} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Project Category *</label>
              <Input type="text" placeholder="ERP Software Development" value={category} onChange={(e) => setCategory(e.target.value)} error={!!errors.category} hint={errors.category} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <DatePicker
                id="project-start-date"
                label="Start Date"
                required={true}
                defaultDate={startDate}
                onChange={(_, dateStr) => setStartDate(dateStr)}
              />
              {errors.startDate && (
                <span className="mt-1.5 text-xs text-error-600 block">{errors.startDate}</span>
              )}
            </div>
            <div>
              <DatePicker
                id="project-deadline"
                label="Deadline"
                required={true}
                defaultDate={deadline}
                onChange={(_, dateStr) => setDeadline(dateStr)}
              />
              {errors.deadline && (
                <span className="mt-1.5 text-xs text-error-600 block">{errors.deadline}</span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Status</label>
              <Select
                options={[
                  { value: "Planning", label: "Planning" },
                  { value: "In Progress", label: "In Progress" },
                  { value: "On Hold", label: "On Hold" },
                  { value: "Completed", label: "Completed" },
                ]}
                defaultValue={status}
                onChange={(val) => setStatus(val as any)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Progress (%) *</label>
              <Input type="number" placeholder="65" value={progress} onChange={(e) => setProgress(e.target.value)} error={!!errors.progress} hint={errors.progress} />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button onClick={formModal.closeModal} variant="outline" size="sm">Cancel</Button>
            <Button type="submit" variant="primary" size="sm">Save Project</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={deleteModal.isOpen} onClose={deleteModal.closeModal} className="max-w-md p-6">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">Delete Project</h4>
        <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete project "{selectedProject?.name}"? This action cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <Button onClick={deleteModal.closeModal} variant="outline" size="sm">Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="primary" className="bg-error-600 hover:bg-error-700 border-error-600 text-white" size="sm">Delete</Button>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={viewModal.isOpen} onClose={viewModal.closeModal} className="max-w-md p-6">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">Project Details</h4>
        {selectedProject && (
          <div className="space-y-3">
            <div className="flex justify-between border-b pb-2 dark:border-white/[0.05]"><span className="text-sm font-medium text-gray-500">Project Name</span><span className="text-sm text-gray-800 dark:text-white font-semibold">{selectedProject.name}</span></div>
            <div className="flex justify-between border-b pb-2 dark:border-white/[0.05]"><span className="text-sm font-medium text-gray-500">Client</span><span className="text-sm text-gray-800 dark:text-white">{selectedProject.client}</span></div>
            <div className="flex justify-between border-b pb-2 dark:border-white/[0.05]"><span className="text-sm font-medium text-gray-500">Category</span><span className="text-sm text-gray-800 dark:text-white">{selectedProject.category}</span></div>
            <div className="flex justify-between border-b pb-2 dark:border-white/[0.05]"><span className="text-sm font-medium text-gray-500">Timeline</span><span className="text-sm text-gray-800 dark:text-white">{formatDate(selectedProject.startDate)} to {formatDate(selectedProject.deadline)}</span></div>
            <div className="flex justify-between border-b pb-2 dark:border-white/[0.05]"><span className="text-sm font-medium text-gray-500">Progress</span><span className="text-sm text-gray-800 dark:text-white font-semibold">{selectedProject.progress}%</span></div>
            <div className="flex justify-between pb-2"><span className="text-sm font-medium text-gray-500">Status</span><Badge color={getStatusColor(selectedProject.status)} variant="solid">{selectedProject.status}</Badge></div>
          </div>
        )}
        <div className="flex justify-end mt-6">
          <Button onClick={viewModal.closeModal} variant="outline" size="sm">Close</Button>
        </div>
      </Modal>
    </>
  );
}
