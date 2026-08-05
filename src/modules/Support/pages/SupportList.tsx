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
import { initialSupportTickets, SupportTicket } from "../data/supportData";

export default function SupportList() {
  const { showToast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>(initialSupportTickets);

  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof SupportTicket>("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Dropdown states
  const [isPriorityFilterOpen, setIsPriorityFilterOpen] = useState(false);

  // Modal states
  const formModal = useModal();
  const deleteModal = useModal();
  const viewModal = useModal();

  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");

  // Form Fields states
  const [client, setClient] = useState("");
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState<SupportTicket["priority"]>("Medium");
  const [status, setStatus] = useState<SupportTicket["status"]>("Open");
  const [assignee, setAssignee] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleOpenCreate = () => {
    setModalMode("create");
    setSelectedTicket(null);
    setClient("");
    setSubject("");
    setPriority("Medium");
    setStatus("Open");
    setAssignee("");
    setErrors({});
    formModal.openModal();
  };

  const handleOpenEdit = (t: SupportTicket) => {
    setModalMode("edit");
    setSelectedTicket(t);
    setClient(t.client);
    setSubject(t.subject);
    setPriority(t.priority);
    setStatus(t.status);
    setAssignee(t.assignee);
    setErrors({});
    formModal.openModal();
  };

  const handleOpenView = (t: SupportTicket) => {
    setSelectedTicket(t);
    viewModal.openModal();
  };

  const handleOpenDelete = (t: SupportTicket) => {
    setSelectedTicket(t);
    deleteModal.openModal();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!client.trim()) newErrors.client = "Client is required.";
    if (!subject.trim()) newErrors.subject = "Subject is required.";
    if (!assignee.trim()) newErrors.assignee = "Assignee is required.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast("Please fill all required fields correctly.", "error");
      return;
    }

    if (modalMode === "create") {
      const tNo = `TK-${4000 + tickets.length + 30}`;
      const newTicket: SupportTicket = {
        id: tickets.length > 0 ? Math.max(...tickets.map((t) => t.id)) + 1 : 1,
        ticketNo: tNo,
        client: client.trim(),
        subject: subject.trim(),
        priority,
        status,
        assignee: assignee.trim(),
        date: new Date().toISOString().split("T")[0],
      };
      const updated = [...tickets, newTicket];
      setTickets(updated);
      showToast("Ticket created successfully.", "success");
    } else if (modalMode === "edit" && selectedTicket) {
      const updated = tickets.map((t) =>
        t.id === selectedTicket.id
          ? {
              ...t,
              client: client.trim(),
              subject: subject.trim(),
              priority,
              status,
              assignee: assignee.trim(),
            }
          : t
      );
      setTickets(updated);
      showToast("Ticket updated successfully.", "success");
    }
    formModal.closeModal();
  };

  const handleDeleteConfirm = () => {
    if (selectedTicket) {
      const updated = tickets.filter((t) => t.id !== selectedTicket.id);
      setTickets(updated);
      showToast("Ticket deleted successfully.", "success");
    }
    deleteModal.closeModal();
  };

  // Processing
  const processedTickets = useMemo(() => {
    let result = [...tickets];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.ticketNo.toLowerCase().includes(query) ||
          t.client.toLowerCase().includes(query) ||
          t.subject.toLowerCase().includes(query) ||
          t.assignee.toLowerCase().includes(query)
      );
    }

    if (priorityFilter !== "all") {
      result = result.filter((t) => t.priority === priorityFilter);
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
  }, [tickets, searchQuery, priorityFilter, sortField, sortOrder]);

  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return processedTickets.slice(start, start + rowsPerPage);
  }, [processedTickets, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(processedTickets.length / rowsPerPage);

  const getPriorityColor = (p: SupportTicket["priority"]) => {
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

  const getStatusColor = (s: SupportTicket["status"]) => {
    switch (s) {
      case "Open":
        return "error";
      case "In Progress":
        return "warning";
      case "Resolved":
        return "success";
      case "Closed":
        return "light";
      default:
        return "light";
    }
  };

  const handleSort = (field: keyof SupportTicket) => {
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
        title="Support Ticket Management | SaiFlow"
        description="Helpdesk dashboard for resolving corporate client issue tickets and logs in SaiFlow CRM & ERP."
      />
      <PageBreadcrumb pageTitle="Support Tickets" />

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
                {["Critical", "High", "Medium", "Low"].map((pr) => (
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
          New Ticket
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <th className="px-5 py-3 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400">
                  <button onClick={() => handleSort("ticketNo")} className="flex items-center gap-1">
                    Ticket ID {sortField === "ticketNo" && (sortOrder === "asc" ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />)}
                  </button>
                </th>
                <th className="px-5 py-3 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400">Subject</th>
                <th className="px-5 py-3 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400">Client</th>
                <th className="px-5 py-3 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400">Priority</th>
                <th className="px-5 py-3 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400">Assignee</th>
                <th className="px-5 py-3 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-5 py-3 text-end text-theme-xs font-semibold text-gray-500 dark:text-gray-400">Actions</th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTickets.length > 0 ? (
                paginatedTickets.map((t) => (
                  <TableRow key={t.id} className="border-b border-gray-100 dark:border-white/[0.05] hover:bg-gray-55/50 dark:hover:bg-white/[0.01]">
                    <TableCell className="px-5 py-4 text-sm font-bold text-gray-800 dark:text-white/95">{t.ticketNo}</TableCell>
                    <TableCell className="px-5 py-4 text-sm font-semibold text-gray-800 dark:text-white/90">{t.subject}</TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-700 dark:text-gray-400">{t.client}</TableCell>
                    <TableCell className="px-5 py-4 text-sm">
                      <Badge color={getPriorityColor(t.priority)}>{t.priority}</Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-700 dark:text-gray-400">{t.assignee}</TableCell>
                    <TableCell className="px-5 py-4 text-sm">
                      <Badge color={getStatusColor(t.status)} variant="solid">{t.status}</Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-end">
                      <div className="flex justify-end items-center gap-2">
                        <button onClick={() => handleOpenView(t)} className="text-gray-500 hover:text-brand-500 p-1"><FiEye size={16} /></button>
                        <button onClick={() => handleOpenEdit(t)} className="text-gray-500 hover:text-warning-500 p-1"><FiEdit size={16} /></button>
                        <button onClick={() => handleOpenDelete(t)} className="text-gray-500 hover:text-error-500 p-1"><FiTrash2 size={16} /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
                    No tickets found.
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
          itemName="tickets"
        />
      )}

      {/* Form Modal */}
      <Modal isOpen={formModal.isOpen} onClose={formModal.closeModal} className="max-w-lg p-6">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
          {modalMode === "create" ? "Create Ticket" : "Edit Ticket"}
        </h4>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Client Name *</label>
            <Input type="text" placeholder="e.g. Aventis Technologies" value={client} onChange={(e) => setClient(e.target.value)} error={!!errors.client} hint={errors.client} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Subject / Issue Description *</label>
            <Input type="text" placeholder="e.g. API webhook response mismatch" value={subject} onChange={(e) => setSubject(e.target.value)} error={!!errors.subject} hint={errors.subject} />
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
                  { value: "Resolved", label: "Resolved" },
                  { value: "Closed", label: "Closed" },
                ]}
                defaultValue={status}
                onChange={(val) => setStatus(val as any)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Assignee *</label>
            <Input type="text" placeholder="e.g. Emma Watson" value={assignee} onChange={(e) => setAssignee(e.target.value)} error={!!errors.assignee} hint={errors.assignee} />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button onClick={formModal.closeModal} variant="outline" size="sm">Cancel</Button>
            <Button type="submit" variant="primary" size="sm">Save Ticket</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={deleteModal.isOpen} onClose={deleteModal.closeModal} className="max-w-md p-6">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">Delete Ticket</h4>
        <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete ticket "{selectedTicket?.ticketNo}"? This action cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <Button onClick={deleteModal.closeModal} variant="outline" size="sm">Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="primary" className="bg-error-600 hover:bg-error-700 border-error-600 text-white" size="sm">Delete</Button>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={viewModal.isOpen} onClose={viewModal.closeModal} className="max-w-md p-6">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">Ticket Details</h4>
        {selectedTicket && (
          <div className="space-y-3">
            <div className="flex justify-between border-b pb-2 dark:border-white/[0.05]"><span className="text-sm font-medium text-gray-500">Ticket ID</span><span className="text-sm text-gray-800 dark:text-white font-bold">{selectedTicket.ticketNo}</span></div>
            <div className="flex justify-between border-b pb-2 dark:border-white/[0.05]"><span className="text-sm font-medium text-gray-500">Subject</span><span className="text-sm text-gray-800 dark:text-white">{selectedTicket.subject}</span></div>
            <div className="flex justify-between border-b pb-2 dark:border-white/[0.05]"><span className="text-sm font-medium text-gray-500">Client</span><span className="text-sm text-gray-800 dark:text-white">{selectedTicket.client}</span></div>
            <div className="flex justify-between border-b pb-2 dark:border-white/[0.05]"><span className="text-sm font-medium text-gray-500">Priority</span><Badge color={getPriorityColor(selectedTicket.priority)}>{selectedTicket.priority}</Badge></div>
            <div className="flex justify-between border-b pb-2 dark:border-white/[0.05]"><span className="text-sm font-medium text-gray-500">Assignee</span><span className="text-sm text-gray-800 dark:text-white">{selectedTicket.assignee}</span></div>
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
