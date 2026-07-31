import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { getStorage, setStorage } from "../../../utils/storage";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import Select from "../../../components/form/Select";
import { useToast } from "../../../hooks/useToast";
import {
  LEAD_SOURCES,
  INDUSTRIES,
  COUNTRIES,
  STATES,
  CITIES,
  DEPARTMENTS,
  DESIGNATIONS,
  TECHNOLOGIES,
  PRIORITIES,
  PROJECT_CATEGORIES,
  COMPANY_TYPES,
  PAYMENT_TYPES,
} from "../data/masterData";

interface MasterItem {
  id: number;
  name: string;
  description?: string;
  status: "Active" | "Inactive";
  countryId?: number;
  stateId?: number;
  departmentId?: number;
}

const MASTER_CONFIGS: Record<
  string,
  {
    pageTitle: string;
    itemNameSingular: string;
    itemNamePlural: string;
    initialData: MasterItem[];
    storageKey: string;
    parentType?: "countries" | "states" | "departments";
  }
> = {
  countries: {
    pageTitle: "Country",
    itemNameSingular: "country",
    itemNamePlural: "countries",
    initialData: COUNTRIES as any,
    storageKey: "saiflow_master_countries",
  },
  states: {
    pageTitle: "State",
    itemNameSingular: "state",
    itemNamePlural: "states",
    initialData: STATES as any,
    storageKey: "saiflow_master_states",
    parentType: "countries",
  },
  cities: {
    pageTitle: "City",
    itemNameSingular: "city",
    itemNamePlural: "cities",
    initialData: CITIES as any,
    storageKey: "saiflow_master_cities",
    parentType: "states",
  },
  departments: {
    pageTitle: "Department",
    itemNameSingular: "department",
    itemNamePlural: "departments",
    initialData: DEPARTMENTS as any,
    storageKey: "saiflow_master_departments",
  },
  designations: {
    pageTitle: "Designation",
    itemNameSingular: "designation",
    itemNamePlural: "designations",
    initialData: DESIGNATIONS as any,
    storageKey: "saiflow_master_designations",
    parentType: "departments",
  },
  "lead-sources": {
    pageTitle: "Lead source",
    itemNameSingular: "lead source",
    itemNamePlural: "lead sources",
    initialData: LEAD_SOURCES as any,
    storageKey: "saiflow_master_lead_sources",
  },
  industries: {
    pageTitle: "Industry",
    itemNameSingular: "industry",
    itemNamePlural: "industries",
    initialData: INDUSTRIES as any,
    storageKey: "saiflow_master_industries",
  },
  "tech-stack": {
    pageTitle: "Tech stack",
    itemNameSingular: "tech",
    itemNamePlural: "tech stack",
    initialData: TECHNOLOGIES as any,
    storageKey: "saiflow_master_technologies",
  },
  priorities: {
    pageTitle: "Priority",
    itemNameSingular: "priority",
    itemNamePlural: "priorities",
    initialData: PRIORITIES as any,
    storageKey: "saiflow_master_priorities",
  },
  services: {
    pageTitle: "Service",
    itemNameSingular: "service",
    itemNamePlural: "services",
    initialData: PROJECT_CATEGORIES as any,
    storageKey: "saiflow_master_services",
  },
  "company-types": {
    pageTitle: "Company type",
    itemNameSingular: "company type",
    itemNamePlural: "company types",
    initialData: COMPANY_TYPES as any,
    storageKey: "saiflow_master_company_types",
  },
  "payment-types": {
    pageTitle: "Payment type",
    itemNameSingular: "payment type",
    itemNamePlural: "payment types",
    initialData: PAYMENT_TYPES as any,
    storageKey: "saiflow_master_payment_types",
  },
};

export default function AddEditMasterPage() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isEditMode = !!id;

  const config = type ? MASTER_CONFIGS[type] : null;

  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parentError, setParentError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!config) {
      showToast("Invalid configuration type.", "error");
      navigate("/dashboard");
      return;
    }

    const items = getStorage<MasterItem[]>(config.storageKey, config.initialData);
    if (isEditMode) {
      const item = items.find((i) => String(i.id) === String(id));
      if (item) {
        setName(item.name);
        if (item.countryId) setParentId(item.countryId);
        else if (item.stateId) setParentId(item.stateId);
        else if (item.departmentId) setParentId(item.departmentId);
      } else {
        showToast("Item not found.", "error");
        navigate(`/master/${type}`);
        return;
      }
    }
    setLoading(false);
  }, [type, id, isEditMode, config, navigate, showToast]);

  const parentOptions = useMemo(() => {
    if (!config?.parentType) return [];
    const parentConf = MASTER_CONFIGS[config.parentType];
    if (!parentConf) return [];
    const parentItems = getStorage<any[]>(parentConf.storageKey, parentConf.initialData);
    return parentItems
      .filter((i) => i.status === "Active")
      .map((i) => ({ value: String(i.id), label: i.name }));
  }, [config]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    let hasError = false;
    if (!name.trim()) {
      setError("Name is required");
      hasError = true;
    }

    if (config.parentType && !parentId) {
      setParentError("This field is required");
      hasError = true;
    }

    if (hasError) return;

    const items = getStorage<MasterItem[]>(config.storageKey, config.initialData);
    const updated = [...items];

    const parentKey =
      config.parentType === "countries"
        ? "countryId"
        : config.parentType === "states"
        ? "stateId"
        : "departmentId";

    if (isEditMode) {
      const idx = items.findIndex((i) => String(i.id) === String(id));
      if (idx !== -1) {
        const updatedItem: any = {
          ...updated[idx],
          name: name.trim(),
        };
        if (config.parentType) {
          updatedItem[parentKey] = Number(parentId);
        }
        updated[idx] = updatedItem;
      }
      showToast(`${config.pageTitle} updated successfully.`, "success");
    } else {
      const nextId = items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;
      const newItem: any = {
        id: nextId,
        name: name.trim(),
        status: "Active",
      };
      if (config.parentType) {
        newItem[parentKey] = Number(parentId);
      }
      updated.push(newItem);
      showToast(`${config.pageTitle} added successfully.`, "success");
    }

    setStorage(config.storageKey, updated);
    navigate(`/master/${type}`);
  };

  const handleCancel = () => {
    if (type) {
      navigate(`/master/${type}`);
    } else {
      navigate("/dashboard");
    }
  };

  if (loading || !config) {
    return <div className="text-center py-10 text-gray-500">Loading details...</div>;
  }

  const resolvedBreadcrumbTitle = isEditMode
    ? `Edit ${config.itemNameSingular}`
    : `Add ${config.itemNameSingular}`;

  const parentLabel =
    config.parentType === "countries"
      ? "Country"
      : config.parentType === "states"
      ? "State"
      : config.parentType === "departments"
      ? "Department"
      : "";

  return (
    <>
      <PageMeta
        title={`${resolvedBreadcrumbTitle} | SaiFlow`}
        description={`Manage ${config.itemNamePlural} details in SaiFlow CRM.`}
      />
      <PageBreadcrumb pageTitle={resolvedBreadcrumbTitle} />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] w-full">
        <form onSubmit={handleSave} className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-850 dark:text-white pb-3 border-b border-gray-100 dark:border-white/[0.05]">
            {resolvedBreadcrumbTitle}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {config.parentType && (
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {parentLabel} <span className="text-error-500">*</span>
                </label>
                <Select
                  options={parentOptions}
                  placeholder={`Select parent ${parentLabel.toLowerCase()}`}
                  defaultValue={parentId ? String(parentId) : ""}
                  onChange={(val) => {
                    setParentId(Number(val));
                    if (parentError) setParentError(null);
                  }}
                />
                {parentError && (
                  <span className="mt-1.5 text-xs text-error-600 block font-normal">
                    {parentError}
                  </span>
                )}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Name <span className="text-error-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="Enter name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                className={error ? "border-error-500" : ""}
              />
              {error && (
                <span className="mt-1.5 text-xs text-error-600 block font-normal">
                  {error}
                </span>
              )}
            </div>

          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/[0.05]">
            <Button size="sm" type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button size="sm" type="submit">
              Save
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
