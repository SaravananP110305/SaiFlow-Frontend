import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { useForm, Controller } from "react-hook-form";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import Checkbox from "../../../components/form/input/Checkbox";
import { getStorage, setStorage } from "../../../utils/storage";
import { useToast } from "../../../hooks/useToast";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "../../../components/ui/table";
import {
  Role,
  Permission,
  syncPermissions,
  buildDefaultPermissions,
  sidebarStructure,
} from "./UserRoleManagement";

interface RoleFormValues {
  roleName: string;
  permissions: Permission[];
}

interface AddEditRolePageProps {
  mode: "create" | "edit" | "view";
}

export default function AddEditRolePage({ mode }: AddEditRolePageProps) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role | null>(null);

  const defaultPermissionsList = useMemo(() => buildDefaultPermissions(), []);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<RoleFormValues>({
    defaultValues: {
      roleName: "",
      permissions: defaultPermissionsList,
    },
  });

  const currentPermissions = watch("permissions") || defaultPermissionsList;

  useEffect(() => {
    const roles = getStorage<Role[]>("saiflow_roles", []);
    if (mode !== "create") {
      const found = roles.find((r) => String(r.id) === String(id));
      if (found) {
        setRole(found);
        reset({
          roleName: found.roleName,
          permissions: syncPermissions(found.permissions),
        });
      } else {
        showToast("Role not found.", "error");
        navigate("/roles");
        return;
      }
    } else {
      reset({
        roleName: "",
        permissions: defaultPermissionsList.map((p) => ({ ...p })),
      });
    }
    setLoading(false);
  }, [id, mode, reset, defaultPermissionsList, navigate, showToast]);

  const handlePermissionChange = (
    index: number,
    field: "view" | "create" | "edit" | "delete",
    checked: boolean
  ) => {
    if (mode === "view") return;
    const updated = [...currentPermissions];
    updated[index] = {
      ...updated[index],
      [field]: checked,
    };
    setValue("permissions", updated, { shouldDirty: true });
  };

  const handleSave = (data: RoleFormValues) => {
    if (mode === "view") return;
    const roles = getStorage<Role[]>("saiflow_roles", []);

    if (mode === "create") {
      const nextId = roles.length > 0 ? Math.max(...roles.map((r) => r.id)) + 1 : 1;
      const newRole: Role = {
        id: nextId,
        roleName: data.roleName.trim(),
        status: "Active",
        permissions: data.permissions,
      };
      const updated = [...roles, newRole];
      setStorage("saiflow_roles", updated);
      showToast("Role created successfully.", "success");
    } else if (mode === "edit" && role) {
      const updated = roles.map((r) =>
        r.id === role.id
          ? {
            ...r,
            roleName: data.roleName.trim(),
            permissions: data.permissions,
          }
          : r
      );
      setStorage("saiflow_roles", updated);
      showToast("Role updated successfully.", "success");
    }
    navigate("/roles");
  };

  const handleFormError = () => {
    showToast("Please fill all required fields correctly.", "error");
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-500">Loading details...</div>;
  }

  const pageTitle =
    mode === "create"
      ? "Add role"
      : mode === "edit"
        ? "Edit role"
        : "View role";

  return (
    <>
      <PageMeta
        title={`${pageTitle} | SaiFlow`}
        description="Configure system user roles and module permissions."
      />
      <PageBreadcrumb pageTitle={pageTitle} />

      <div className="space-y-6 w-full">
        <form onSubmit={handleSubmit(handleSave, handleFormError)} className="space-y-6">
          {/* Section 1: Basic Information */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/95 mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05]">
              Role details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Role name <span className="text-error-500">*</span>
                </label>
                <Controller
                  name="roleName"
                  control={control}
                  rules={{ required: "Role name is required" }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="text"
                      placeholder="e.g. Sales Executive"
                      disabled={mode === "view"}
                      className={errors.roleName ? "border-error-500" : ""}
                    />
                  )}
                />
                {errors.roleName && (
                  <span className="mt-1.5 text-xs text-error-600 block">{errors.roleName.message}</span>
                )}
              </div>

            </div>
          </div>

          {/* Section 2: Permissions Matrix */}
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-white/[0.05]">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/95">
                Module permissions
              </h3>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-800/40">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-semibold text-gray-500">
                      Menus
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-center text-theme-xs font-semibold text-gray-500 w-24">
                      View
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-center text-theme-xs font-semibold text-gray-500 w-24">
                      Create
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-center text-theme-xs font-semibold text-gray-500 w-24">
                      Edit
                    </TableCell>
                    <TableCell isHeader className="px-5 py-3 text-center text-theme-xs font-semibold text-gray-500 w-24">
                      Delete
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {currentPermissions.map((perm, index) => {
                    const isParent = !perm.isSubMenu;
                    const hasSub = sidebarStructure.find((item) => item.key === perm.key)?.subItems !== undefined;

                    const isDashboard = perm.key === "dashboard" || perm.parentKey === "dashboard";
                    const isReports = perm.key === "reports" || perm.parentKey === "reports";
                    const isSettings = perm.key === "settings" || perm.parentKey === "settings";

                    const showView = !hasSub;
                    const showCreate = !hasSub && !isDashboard && !isReports && !isSettings;
                    const showEdit = !hasSub && !isDashboard && !isReports;
                    const showDelete = !hasSub && !isDashboard && !isReports && !isSettings;

                    return (
                      <TableRow
                        key={perm.key}
                        className={`${isParent
                            ? "bg-gray-50/50 dark:bg-white/[0.01] font-medium text-gray-850 dark:text-white"
                            : "text-gray-600 dark:text-gray-400 pl-4"
                          }`}
                      >
                        <TableCell className="px-5 py-3 text-theme-sm">
                          <span className={perm.isSubMenu ? "pl-5 inline-block text-gray-500" : ""}>
                            {perm.isSubMenu ? `└─ ${perm.menu}` : perm.menu}
                          </span>
                        </TableCell>
                        <TableCell className="px-5 py-3 text-center">
                          <div className="flex justify-center">
                            {showView ? (
                              <Checkbox
                                checked={perm.view}
                                disabled={mode === "view"}
                                onChange={(checked) => handlePermissionChange(index, "view", checked)}
                              />
                            ) : (
                              <span className="text-gray-400 dark:text-gray-600">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-3 text-center">
                          <div className="flex justify-center">
                            {showCreate ? (
                              <Checkbox
                                checked={perm.create}
                                disabled={mode === "view"}
                                onChange={(checked) => handlePermissionChange(index, "create", checked)}
                              />
                            ) : (
                              <span className="text-gray-400 dark:text-gray-600">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-3 text-center">
                          <div className="flex justify-center">
                            {showEdit ? (
                              <Checkbox
                                checked={perm.edit}
                                disabled={mode === "view"}
                                onChange={(checked) => handlePermissionChange(index, "edit", checked)}
                              />
                            ) : (
                              <span className="text-gray-400 dark:text-gray-600">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-3 text-center">
                          <div className="flex justify-center">
                            {showDelete ? (
                              <Checkbox
                                checked={perm.delete}
                                disabled={mode === "view"}
                                onChange={(checked) => handlePermissionChange(index, "delete", checked)}
                              />
                            ) : (
                              <span className="text-gray-400 dark:text-gray-600">—</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/[0.05]">
            <Button size="sm" type="button" variant="outline" onClick={() => navigate("/roles")}>
              {mode === "view" ? "Back to list" : "Cancel"}
            </Button>
            {mode !== "view" && (
              <Button size="sm" type="submit">
                Save
              </Button>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
