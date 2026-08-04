import { useState, useMemo } from "react";
import { getStorage, setStorage } from "../../../utils/storage";
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
import { initialDeployments, Deployment } from "../data/deploymentsData";

export default function DeploymentList() {
  const { showToast } = useToast();
  const [deployments, setDeployments] = useState<Deployment[]>(() =>
    getStorage("saiflow_deployments", initialDeployments)
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [envFilter, setEnvFilter] = useState("all");
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof Deployment>("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Dropdown states
  const [isEnvFilterOpen, setIsEnvFilterOpen] = useState(false);

  // Modal states
  const formModal = useModal();
  const deleteModal = useModal();
  const viewModal = useModal();

  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");

  // Form Fields states
  const [project, setProject] = useState("");
  const [version, setVersion] = useState("");
  const [environment, setEnvironment] = useState<Deployment["environment"]>("Staging");
  const [status, setStatus] = useState<Deployment["status"]>("Success");
  const [deployedBy, setDeployedBy] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleOpenCreate = () => {
    setModalMode("create");
    setSelectedDeployment(null);
    setProject("");
    setVersion("");
    setEnvironment("Staging");
    setStatus("Success");
    setDeployedBy("");
    setErrors({});
    formModal.openModal();
  };

  const handleOpenEdit = (dep: Deployment) => {
    setModalMode("edit");
    setSelectedDeployment(dep);
    setProject(dep.project);
    setVersion(dep.version);
    setEnvironment(dep.environment);
    setStatus(dep.status);
    setDeployedBy(dep.deployedBy);
    setErrors({});
    formModal.openModal();
  };

  const handleOpenView = (dep: Deployment) => {
    setSelectedDeployment(dep);
    viewModal.openModal();
  };

  const handleOpenDelete = (dep: Deployment) => {
    setSelectedDeployment(dep);
    deleteModal.openModal();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!project.trim()) newErrors.project = "Project is required.";
    if (!version.trim()) newErrors.version = "Version is required.";
    if (!deployedBy.trim()) newErrors.deployedBy = "Deployer name is required.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast("Please fill all required fields correctly.", "error");
      return;
    }

    if (modalMode === "create") {
      const depNo = `DEP-0${deployments.length + 89}`;
      const nowStr = new Date().toISOString().replace("T", " ").substring(0, 16);
      const newDep: Deployment = {
        id: deployments.length > 0 ? Math.max(...deployments.map((d) => d.id)) + 1 : 1,
        deploymentNo: depNo,
        project: project.trim(),
        version: version.trim(),
        environment,
        status,
        deployedBy: deployedBy.trim(),
        date: nowStr,
      };
      const updated = [...deployments, newDep];
      setDeployments(updated);
      setStorage("saiflow_deployments", updated);
      showToast("Deployment log registered successfully.", "success");
    } else if (modalMode === "edit" && selectedDeployment) {
      const updated = deployments.map((d) =>
        d.id === selectedDeployment.id
          ? {
              ...d,
              project: project.trim(),
              version: version.trim(),
              environment,
              status,
              deployedBy: deployedBy.trim(),
            }
          : d
      );
      setDeployments(updated);
      setStorage("saiflow_deployments", updated);
      showToast("Deployment log updated successfully.", "success");
    }
    formModal.closeModal();
  };

  const handleDeleteConfirm = () => {
    if (selectedDeployment) {
      const updated = deployments.filter((d) => d.id !== selectedDeployment.id);
      setDeployments(updated);
      setStorage("saiflow_deployments", updated);
      showToast("Deployment log deleted.", "success");
    }
    deleteModal.closeModal();
  };

  // Processing
  const processedDeployments = useMemo(() => {
    let result = [...deployments];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.deploymentNo.toLowerCase().includes(query) ||
          d.project.toLowerCase().includes(query) ||
          d.version.toLowerCase().includes(query) ||
          d.deployedBy.toLowerCase().includes(query)
      );
    }

    if (envFilter !== "all") {
      result = result.filter((d) => d.environment === envFilter);
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
  }, [deployments, searchQuery, envFilter, sortField, sortOrder]);

  const paginatedDeployments = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return processedDeployments.slice(start, start + rowsPerPage);
  }, [processedDeployments, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(processedDeployments.length / rowsPerPage);

  const getStatusColor = (s: Deployment["status"]) => {
    switch (s) {
      case "Success":
        return "success";
      case "Failed":
        return "error";
      case "Deploying":
        return "warning";
      default:
        return "light";
    }
  };

  const getEnvColor = (e: Deployment["environment"]) => {
    switch (e) {
      case "Production":
        return "error";
      case "Staging":
        return "warning";
      case "Development":
        return "info";
      default:
        return "light";
    }
  };

  const handleSort = (field: keyof Deployment) => {
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
        title="Deployment Tracker | SaiFlow"
        description="Monitor staging and production deployment histories, logs, and environments in SaiFlow ERP."
      />
      <PageBreadcrumb pageTitle="Deployment Tracker" />

      <div className="flex flex-col gap-4 mb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full lg:w-auto">
          <div className="w-full sm:w-64">
            <Input
              type="text"
              placeholder="Search Deployments..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setIsEnvFilterOpen(!isEnvFilterOpen)}
              className="flex items-center justify-between h-11 w-48 rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 cursor-pointer dropdown-toggle hover:bg-gray-50 dark:hover:bg-white/5"
            >
              <span className="truncate text-left flex-1">{envFilter === "all" ? "All Environments" : envFilter}</span>
              <ChevronDownIcon className="w-4 h-4 text-gray-500 shrink-0 ml-2" />
            </button>
            <Dropdown
              isOpen={isEnvFilterOpen}
              onClose={() => setIsEnvFilterOpen(false)}
              className="left-0 w-44 p-1 mt-2"
            >
              <ul className="flex flex-col gap-0.5">
                <li>
                  <DropdownItem
                    onItemClick={() => {
                      setEnvFilter("all");
                      setCurrentPage(1);
                      setIsEnvFilterOpen(false);
                    }}
                    className={`cursor-pointer rounded-lg text-left w-full px-3 py-2 text-sm ${
                      envFilter === "all" ? "bg-brand-500 text-white" : "text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                    }`}
                  >
                    All Environments
                  </DropdownItem>
                </li>
                {["Production", "Staging", "Development"].map((env) => (
                  <li key={env}>
                    <DropdownItem
                      onItemClick={() => {
                        setEnvFilter(env);
                        setCurrentPage(1);
                        setIsEnvFilterOpen(false);
                      }}
                      className={`cursor-pointer rounded-lg text-left w-full px-3 py-2 text-sm ${
                        envFilter === env ? "bg-brand-500 text-white" : "text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                      }`}
                    >
                      {env}
                    </DropdownItem>
                  </li>
                ))}
              </ul>
            </Dropdown>
          </div>
        </div>
        <Button onClick={handleOpenCreate} variant="primary" size="sm" startIcon={<FiPlus />}>
          Log Deployment
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <th className="px-5 py-3 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400">
                  <button onClick={() => handleSort("deploymentNo")} className="flex items-center gap-1">
                    ID {sortField === "deploymentNo" && (sortOrder === "asc" ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />)}
                  </button>
                </th>
                <th className="px-5 py-3 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400">Project</th>
                <th className="px-5 py-3 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400">Version</th>
                <th className="px-5 py-3 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400">Environment</th>
                <th className="px-5 py-3 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400">Deployed By</th>
                <th className="px-5 py-3 text-start text-theme-xs font-semibold text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-5 py-3 text-end text-theme-xs font-semibold text-gray-500 dark:text-gray-400">Actions</th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDeployments.length > 0 ? (
                paginatedDeployments.map((dep) => (
                  <TableRow key={dep.id} className="border-b border-gray-100 dark:border-white/[0.05] hover:bg-gray-55/50 dark:hover:bg-white/[0.01]">
                    <TableCell className="px-5 py-4 text-sm font-bold text-gray-800 dark:text-white/95">{dep.deploymentNo}</TableCell>
                    <TableCell className="px-5 py-4 text-sm font-semibold text-gray-800 dark:text-white/90">{dep.project}</TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-700 dark:text-gray-400">{dep.version}</TableCell>
                    <TableCell className="px-5 py-4 text-sm">
                      <Badge color={getEnvColor(dep.environment)} variant="solid">{dep.environment}</Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-gray-700 dark:text-gray-400">{dep.deployedBy}</TableCell>
                    <TableCell className="px-5 py-4 text-sm">
                      <Badge color={getStatusColor(dep.status)} variant="solid">{dep.status}</Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-sm text-end">
                      <div className="flex justify-end items-center gap-2">
                        <button onClick={() => handleOpenView(dep)} className="text-gray-500 hover:text-brand-500 p-1"><FiEye size={16} /></button>
                        <button onClick={() => handleOpenEdit(dep)} className="text-gray-500 hover:text-warning-500 p-1"><FiEdit size={16} /></button>
                        <button onClick={() => handleOpenDelete(dep)} className="text-gray-500 hover:text-error-500 p-1"><FiTrash2 size={16} /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="px-5 py-10 text-center text-gray-500 dark:text-gray-400">
                    No deployment records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {processedDeployments.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={processedDeployments.length}
          rowsPerPage={rowsPerPage}
          onPageChange={setCurrentPage}
          onRowsPerPageChange={(rows) => {
            setRowsPerPage(rows);
            setCurrentPage(1);
          }}
          itemName="deployments"
        />
      )}

      {/* Form Modal */}
      <Modal isOpen={formModal.isOpen} onClose={formModal.closeModal} className="max-w-lg p-6">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
          {modalMode === "create" ? "Log Deployment" : "Edit Deployment Details"}
        </h4>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Project Name *</label>
            <Input type="text" placeholder="e.g. SaiFlow ERP Phase 1" value={project} onChange={(e) => setProject(e.target.value)} error={!!errors.project} hint={errors.project} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Version/Release Tag *</label>
            <Input type="text" placeholder="e.g. v1.2.0-beta" value={version} onChange={(e) => setVersion(e.target.value)} error={!!errors.version} hint={errors.version} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Environment</label>
              <Select
                options={[
                  { value: "Production", label: "Production" },
                  { value: "Staging", label: "Staging" },
                  { value: "Development", label: "Development" },
                ]}
                defaultValue={environment}
                onChange={(val) => setEnvironment(val as any)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Status</label>
              <Select
                options={[
                  { value: "Success", label: "Success" },
                  { value: "Failed", label: "Failed" },
                  { value: "Deploying", label: "Deploying" },
                ]}
                defaultValue={status}
                onChange={(val) => setStatus(val as any)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Deployed By *</label>
            <Input type="text" placeholder="Alice Johnson" value={deployedBy} onChange={(e) => setDeployedBy(e.target.value)} error={!!errors.deployedBy} hint={errors.deployedBy} />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button onClick={formModal.closeModal} variant="outline" size="sm">Cancel</Button>
            <Button type="submit" variant="primary" size="sm">Save Log</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={deleteModal.isOpen} onClose={deleteModal.closeModal} className="max-w-md p-6">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">Delete Deployment Log</h4>
        <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete deployment log "{selectedDeployment?.deploymentNo}"? This action cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <Button onClick={deleteModal.closeModal} variant="outline" size="sm">Cancel</Button>
          <Button onClick={handleDeleteConfirm} variant="primary" className="bg-error-600 hover:bg-error-700 border-error-600 text-white" size="sm">Delete</Button>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={viewModal.isOpen} onClose={viewModal.closeModal} className="max-w-md p-6">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">Deployment Log Details</h4>
        {selectedDeployment && (
          <div className="space-y-3">
            <div className="flex justify-between border-b pb-2 dark:border-white/[0.05]"><span className="text-sm font-medium text-gray-500">Deployment ID</span><span className="text-sm text-gray-800 dark:text-white font-bold">{selectedDeployment.deploymentNo}</span></div>
            <div className="flex justify-between border-b pb-2 dark:border-white/[0.05]"><span className="text-sm font-medium text-gray-500">Project</span><span className="text-sm text-gray-800 dark:text-white">{selectedDeployment.project}</span></div>
            <div className="flex justify-between border-b pb-2 dark:border-white/[0.05]"><span className="text-sm font-medium text-gray-500">Version</span><span className="text-sm text-gray-800 dark:text-white">{selectedDeployment.version}</span></div>
            <div className="flex justify-between border-b pb-2 dark:border-white/[0.05]"><span className="text-sm font-medium text-gray-500">Environment</span><Badge color={getEnvColor(selectedDeployment.environment)} variant="solid">{selectedDeployment.environment}</Badge></div>
            <div className="flex justify-between border-b pb-2 dark:border-white/[0.05]"><span className="text-sm font-medium text-gray-500">Deployed By</span><span className="text-sm text-gray-800 dark:text-white">{selectedDeployment.deployedBy}</span></div>
            <div className="flex justify-between border-b pb-2 dark:border-white/[0.05]"><span className="text-sm font-medium text-gray-500">Status</span><Badge color={getStatusColor(selectedDeployment.status)} variant="solid">{selectedDeployment.status}</Badge></div>
            <div className="flex justify-between pb-2"><span className="text-sm font-medium text-gray-500">Deployment Date</span><span className="text-sm text-gray-800 dark:text-white">{selectedDeployment.date}</span></div>
          </div>
        )}
        <div className="flex justify-end mt-6">
          <Button onClick={viewModal.closeModal} variant="outline" size="sm">Close</Button>
        </div>
      </Modal>
    </>
  );
}
