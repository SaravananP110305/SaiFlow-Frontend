import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { masterService } from "../../../services/masterService";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import Select from "../../../components/form/Select";
import { useToast } from "../../../hooks/useToast";



const MASTER_CONFIGS: Record<
  string,
  {
    pageTitle: string;
    itemNameSingular: string;
    itemNamePlural: string;
    parentType?: "countries" | "states" | "departments";
  }
> = {
  countries: {
    pageTitle: "Country",
    itemNameSingular: "Country",
    itemNamePlural: "Countries",
  },
  states: {
    pageTitle: "State",
    itemNameSingular: "State",
    itemNamePlural: "States",
    parentType: "countries",
  },
  cities: {
    pageTitle: "City",
    itemNameSingular: "City",
    itemNamePlural: "Cities",
    parentType: "states",
  },
  departments: {
    pageTitle: "Department",
    itemNameSingular: "Department",
    itemNamePlural: "Departments",
  },
  designations: {
    pageTitle: "Designation",
    itemNameSingular: "Designation",
    itemNamePlural: "Designations",
    parentType: "departments",
  },
  "lead-sources": {
    pageTitle: "Lead Source",
    itemNameSingular: "Lead Source",
    itemNamePlural: "Lead Sources",
  },
  industries: {
    pageTitle: "Industry",
    itemNameSingular: "Industry",
    itemNamePlural: "Industries",
  },
  "tech-stack": {
    pageTitle: "Tech Stack",
    itemNameSingular: "Tech",
    itemNamePlural: "Tech Stack",
  },
  priorities: {
    pageTitle: "Priority",
    itemNameSingular: "Priority",
    itemNamePlural: "Priorities",
  },
  services: {
    pageTitle: "Service",
    itemNameSingular: "Service",
    itemNamePlural: "Services",
  },
  "company-types": {
    pageTitle: "Company Type",
    itemNameSingular: "Company Type",
    itemNamePlural: "Company Types",
  },
  "payment-types": {
    pageTitle: "Payment Type",
    itemNameSingular: "Payment Type",
    itemNamePlural: "Payment Types",
  },
  "followup-types": {
    pageTitle: "Follow-Up Type",
    itemNameSingular: "Follow-Up Type",
    itemNamePlural: "Follow-Up Types",
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
  const [parents, setParents] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [parentError, setParentError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const category = useMemo(() => {
    switch (type) {
      case "countries": return "COUNTRY";
      case "states": return "STATE";
      case "cities": return "CITY";
      case "departments": return "DEPARTMENT";
      case "designations": return "DESIGNATION";
      case "lead-sources": return "LEAD_SOURCE";
      case "industries": return "INDUSTRY";
      case "tech-stack": return "TECH_STACK";
      case "priorities": return "PRIORITY";
      case "services": return "SERVICE";
      case "company-types": return "COMPANY_TYPE";
      case "payment-types": return "PAYMENT_TYPE";
      case "followup-types": return "FOLLOWUP_TYPE";
      default: return "";
    }
  }, [type]);

  const parentCategory = useMemo(() => {
    if (!config?.parentType) return "";
    if (config.parentType === "countries") return "COUNTRY";
    if (config.parentType === "states") return "STATE";
    if (config.parentType === "departments") return "DEPARTMENT";
    return "";
  }, [config]);

  const loadDetails = async () => {
    if (!config) {
      showToast("Invalid configuration type.", "error");
      navigate("/dashboard");
      return;
    }
    
    setLoading(true);
    try {
      if (parentCategory) {
        const fetchedParents = await masterService.getMasterItems(parentCategory);
        setParents(fetchedParents);
      }
      
      if (isEditMode && id) {
        const item = await masterService.getMasterItemById(Number(id));
        if (item) {
          setName(item.name);
          if (item.parentId) setParentId(item.parentId);
        } else {
          showToast("Item not found.", "error");
          navigate(`/master/${type}`);
          return;
        }
      }
    } catch (err: any) {
      showToast("Failed to load details.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [type, id, isEditMode]);

  // Show all parents in the dropdown; inactive ones are marked "(Inactive)" and
  // rendered in red to warn the user. They remain selectable.
  const parentOptions = useMemo(() => {
    return parents.map((i) => ({
      value: String(i.id),
      label: i.status === "Active" ? i.name : `${i.name} (Inactive)`,
      optionClassName: i.status === "Active" ? undefined : "text-error-600 dark:text-error-400",
    }));
  }, [parents]);

  const handleSave = async (e: React.FormEvent) => {
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

    try {
      if (isEditMode) {
        await masterService.updateMasterItem(Number(id), {
          name: name.trim(),
          parentId: parentId ? Number(parentId) : null
        });
        showToast(`${config.pageTitle} updated successfully.`, "success");
      } else {
        await masterService.createMasterItem({
          category,
          name: name.trim(),
          parentId: parentId ? Number(parentId) : null
        });
        showToast(`${config.pageTitle} added successfully.`, "success");
      }
      navigate(`/master/${type}`);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to save configuration item.";
      showToast(msg, "error");
    }
  };

  const handleCancel = () => {
    if (type) {
      navigate(`/master/${type}`);
    } else {
      navigate("/dashboard");
    }
  };

  if (loading || !config) {
    return <div className="text-center py-10 text-gray-500">Loading Details...</div>;
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
        description={`Manage ${config.itemNamePlural} in SaiFlow CRM.`}
      />
      <PageBreadcrumb
        pageTitle={resolvedBreadcrumbTitle}
        customName={isEditMode && name ? name : undefined}
      />

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
                  placeholder={`Select Parent ${parentLabel}`}
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
                placeholder="Enter Name"
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
