import { useState, useMemo } from "react";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Badge from "../../../components/ui/badge/Badge";
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import Select from "../../../components/form/Select";
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
import { FiEye, FiEdit, FiTrash2, FiPlus } from "react-icons/fi";
import { useToast } from "../../../hooks/useToast";
import { initialRequirements, Requirement } from "../data/requirementsData";

export default function RequirementList() {
  const { showToast } = useToast();
  const [requirements, setRequirements] = useState<Requirement[]>(initialRequirements);

  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof Requirement>("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const handleSort = (field: keyof Requirement) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  // Dropdown filter open states
  const [isPriorityFilterOpen, setIsPriorityFilterOpen] = useState(false);

  // Modal control states
  const formModal = useModal();
  const deleteModal = useModal();
  const viewModal = useModal();

  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");

  // Form Fields states
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [techStack, setTechStack] = useState("");
  const [priority, setPriority] = useState<Requirement["priority"]>("Medium");
  const [status, setStatus] = useState<Requirement["status"]>("In Review");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleOpenCreate = () => {
    setModalMode("create");
    setSelectedRequirement(null);
    setTitle("");
    setClient("");
    setTechStack("");
    setPriority("Medium");
    setStatus("In Review");
    setErrors({});
    formModal.openModal();
  };

  const handleOpenEdit = (req: Requirement) => {
    setModalMode("edit");
    setSelectedRequirement(req);
    setTitle(req.title);
    setClient(req.client);
    setTechStack(req.techStack);
    setPriority(req.priority);
    setStatus(req.status);
    setErrors({});
    formModal.openModal();
  };

  const handleOpenView = (req: Requirement) => {
    setSelectedRequirement(req);
    viewModal.openModal();
  };

  const handleOpenDelete = (req: Requirement) => {
    setSelectedRequirement(req);
    deleteModal.openModal();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Requirement title is required.";
    if (!client.trim()) newErrors.client = "Client name is required.";
    if (!techStack.trim()) newErrors.techStack = "Technology stack is required.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast("Please fill all required fields.", "error");
      return;
    }

    if (modalMode === "create") {
      const newReq: Requirement = {
        id: requirements.length > 0 ? Math.max(...requirements.map((r) => r.id)) + 1 : 1,
        title: title.trim(),
        client: client.trim(),
        techStack: techStack.trim(),
        priority,
        status,
        date: new Date().toISOString().split("T")[0],
      };
      const updated = [...requirements, newReq];
      setRequirements(updated);
      showToast("Requirement logged successfully.", "success");
    } else if (modalMode === "edit" && selectedRequirement) {
      const updated = requirements.map((r) =>
        r.id === selectedRequirement.id
          ? {
              ...r,
              title: title.trim(),
              client: client.trim(),
              techStack: techStack.trim(),
              priority,
              status,
            }
          : r
      );
      setRequirements(updated);
      showToast("Requirement updated.", "success");
    }
    formModal.closeModal();
  };

  const handleDeleteConfirm = () => {
    if (selectedRequirement) {
      const updated = requirements.filter((r) => r.id !== selectedRequirement.id);
      setRequirements(updated);
      showToast("Requirement deleted.", "success");
    }
    deleteModal.closeModal();
  };

  // Processing
  const processedRequirements = useMemo(() => {
    let result = [...requirements];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(query) ||
          r.client.toLowerCase().includes(query) ||
          r.techStack.toLowerCase().includes(query)
      );
    }

    if (priorityFilter !== "all") {
      result = result.filter((r) => r.priority === priorityFilter);
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
  }, [requirements, searchQuery, priorityFilter, sortField, sortOrder]);

  const paginatedRequirements = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return processedRequirements.slice(start, start + rowsPerPage);
  }, [processedRequirements, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(processedRequirements.length / rowsPerPage);

  const getPriorityColor = (p: Requirement["priority"]) => {
    switch (p) {
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

  const getStatusColor = (s: Requirement["status"]) => {
    switch (s) {
      case "In Review":
        return "light";
      case "Approved":
        return "info";
      case "Under Development":
        return "warning";
      case "Implemented":
        return "success";
      default:
        return "light";
    }
  };

  return (
    <>
      <PageMeta
        title="Requirement Management | SaiFlow"
        description="Log and analyze customer/project scope requirements in SaiFlow."
      />
      <PageBreadcrumb pageTitle="Requirement Management" />

      <div className="flex flex-col gap-4 mb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full lg:w-auto">
          <div className="w-full sm:w-64">
            <Input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setIsPriorityFilterOpen(!isPriorityFilterOpen)}
              className="flex items-center justify-between h-11 w-44 rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 cursor-pointer dropdown-toggle hover:bg-gray-50 dark:hover:bg-white/5"
            >
              <span className="truncate text-left flex-1">{priorityFilter === "all" ? "All Priorities" : priorityFilter}</span>
              <ChevronDownIcon className="w-4 h-4 text-gray-500 shrink-0 ml-2" />
            </button>
            <Dropdown
              isOpen={isPriorityFilterOpen}
              onClose={() => setIsPriorityFilterOpen(false)}
              className="left-0 w-40 p-1 mt-2"
            >
              <ul className="flex flex-col gap-0.5">
                <li>
                  <DropdownItem
                    onItemClick={() => {
                      setPriorityFilter("all");
                      setCurrentPage(1);
                      setIsPriorityFilterOpen(false);
                    }}
                    className={`cursor-pointer rounded-lg text-left w-full px-3 py-2 text-sm ${
                      priorityFilter === "all" ? "bg-brand-500 text-white" : "text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                    }`}
                  >
                    All Priorities
                  </DropdownItem>
                </li>
                {["High", "Medium", "Low"].map((pr) => (
                  <li key={pr}>
                    <DropdownItem
                      onItemClick={() => {
                        setPriorityFilter(pr);
                        setCurrentPage(1);
                        setIsPriorityFilterOpen(false);
                      }}
                      className={`cursor-pointer rounded-lg text-left w-full px-3 py-2 text-sm ${
                        priorityFilter === pr ? "bg-brand-500 text-white" : "text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                      }`}
                    >
                      {pr}
                    </DropdownItem>
                  </li>
                ))}
              </ul>
            </Dropdown>
          </div>
        </div>
        <Button onClick={handleOpenCreate} variant="primary" size="sm" startIcon={<FiPlus />}>
          Log Requirement
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05] sticky top-0 bg-white dark:bg-gray-900 z-10">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  <button onClick={() => handleSort("title")} className="flex items-center gap-1.5 font-medium hover:text-gray-900 dark:hover:text-white cursor-pointer">
                    Requirement Details
                    <span className="flex flex-col">
                      <ChevronUpIcon className={`w-3 h-3 -mb-1 transition-colors ${sortField === "title" && sortOrder === "asc" ? "text-brand-500" : "text-gray-300 dark:text-gray-600"}`} />
                      <ChevronDownIcon className={`w-3 h-3 transition-colors ${sortField === "title" && sortOrder === "desc" ? "text-brand-500" : "text-gray-300 dark:text-gray-600"}`} />
                    </span>
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  <button onClick={() => handleSort("client")} className="flex items-center gap-1.5 font-medium hover:text-gray-900 dark:hover:text-white cursor-pointer">
                    Client
                    <span className="flex flex-col">
                      <ChevronUpIcon className={`w-3 h-3 -mb-1 transition-colors ${sortField === "client" && sortOrder === "asc" ? "text-brand-500" : "text-gray-300 dark:text-gray-600"}`} />
                      <ChevronDownIcon className={`w-3 h-3 transition-colors ${sortField === "client" && sortOrder === "desc" ? "text-brand-500" : "text-gray-300 dark:text-gray-600"}`} />
                    </span>
                  </button>
                </TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Tech Stack</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Priority</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Status</TableCell>
                <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Date Logged</TableCell>
                <TableCell isHeader className="px-5 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {paginatedRequirements.length > 0 ? (
                paginatedRequirements.map((req) => (
                  <TableRow key={req.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
                    <TableCell className="px-5 py-4 text-theme-sm font-medium text-gray-800 dark:text-white/90">{req.title}</TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-400">{req.client}</TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-400">{req.techStack}</TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm whitespace-nowrap">
                      <Badge size="sm" color={getPriorityColor(req.priority)}>{req.priority}</Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm whitespace-nowrap">
                      <Badge size="sm" color={getStatusColor(req.status)}>{req.status}</Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-400">{req.date}</TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-end">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenView(req)} className="p-1.5 text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-500/10 rounded-lg transition cursor-pointer" title="View"><FiEye className="size-4" /></button>
                        <button onClick={() => handleOpenEdit(req)} className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10 rounded-lg transition cursor-pointer" title="Edit"><FiEdit className="size-4" /></button>
                        <button onClick={() => handleOpenDelete(req)} className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 rounded-lg transition cursor-pointer" title="Delete"><FiTrash2 className="size-4" /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No requirements found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {processedRequirements.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={processedRequirements.length}
          rowsPerPage={rowsPerPage}
          onPageChange={setCurrentPage}
          onRowsPerPageChange={(rows) => {
            setRowsPerPage(rows);
            setCurrentPage(1);
          }}
          itemName="requirements"
        />
      )}

      {/* Form Modal */}
      <Modal isOpen={formModal.isOpen} onClose={formModal.closeModal} className="max-w-lg p-6">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
          {modalMode === "create" ? "Log Requirement" : "Edit Requirement"}
        </h4>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Requirement Title *</label>
            <Input type="text" placeholder="e.g. Integrate PDF Export Feature" value={title} onChange={(e) => setTitle(e.target.value)} error={!!errors.title} hint={errors.title} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Client Name *</label>
            <Input type="text" placeholder="Aventis Technologies" value={client} onChange={(e) => setClient(e.target.value)} error={!!errors.client} hint={errors.client} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Tech Stack *</label>
            <Input type="text" placeholder="React, Node.js, PostgreSQL" value={techStack} onChange={(e) => setTechStack(e.target.value)} error={!!errors.techStack} hint={errors.techStack} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Priority</label>
              <Select
                options={[
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
                  { value: "In Review", label: "In Review" },
                  { value: "Approved", label: "Approved" },
                  { value: "Under Development", label: "Under Development" },
                  { value: "Implemented", label: "Implemented" },
                ]}
                defaultValue={status}
                onChange={(val) => setStatus(val as any)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button onClick={formModal.closeModal} variant="outline" size="sm">Cancel</Button>
            <Button type="submit" variant="primary" size="sm">Log Entry</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={deleteModal.isOpen} onClose={deleteModal.closeModal} className="max-w-md p-6">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">Delete Requirement</h4>
        <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete requirement "{selectedRequirement?.title}"? This cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <Button onClick={deleteModal.closeModal} variant="outline" size="sm">Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="primary" className="bg-error-600 hover:bg-error-700 border-error-600 text-white" size="sm">Delete</Button>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={viewModal.isOpen} onClose={viewModal.closeModal} className="max-w-md p-6">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">Requirement Log Details</h4>
        {selectedRequirement && (
          <div className="space-y-3">
            <div className="flex justify-between border-b pb-2 dark:border-white/[0.05]"><span className="text-sm font-medium text-gray-500">Requirement</span><span className="text-sm text-gray-800 dark:text-white">{selectedRequirement.title}</span></div>
            <div className="flex justify-between border-b pb-2 dark:border-white/[0.05]"><span className="text-sm font-medium text-gray-500">Client</span><span className="text-sm text-gray-800 dark:text-white">{selectedRequirement.client}</span></div>
            <div className="flex justify-between border-b pb-2 dark:border-white/[0.05]"><span className="text-sm font-medium text-gray-500">Tech Stack</span><span className="text-sm text-gray-800 dark:text-white">{selectedRequirement.techStack}</span></div>
            <div className="flex justify-between border-b pb-2 dark:border-white/[0.05]"><span className="text-sm font-medium text-gray-500">Priority</span><Badge color={getPriorityColor(selectedRequirement.priority)}>{selectedRequirement.priority}</Badge></div>
            <div className="flex justify-between border-b pb-2 dark:border-white/[0.05]"><span className="text-sm font-medium text-gray-500">Status</span><Badge color={getStatusColor(selectedRequirement.status)} variant="solid">{selectedRequirement.status}</Badge></div>
            <div className="flex justify-between pb-2"><span className="text-sm font-medium text-gray-500">Date Logged</span><span className="text-sm text-gray-800 dark:text-white">{selectedRequirement.date}</span></div>
          </div>
        )}
        <div className="flex justify-end mt-6">
          <Button onClick={viewModal.closeModal} variant="outline" size="sm">Close</Button>
        </div>
      </Modal>
    </>
  );
}
