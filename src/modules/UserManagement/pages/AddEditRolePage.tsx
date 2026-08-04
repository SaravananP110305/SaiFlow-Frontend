import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import Checkbox from "../../../components/form/input/Checkbox";
import { useToast } from "../../../hooks/useToast";
import { useAuth } from "../../../context/AuthContext";
import { roleService } from "../../../services/roleService";
import { permissionsToBackend, permissionsToFrontend } from "../../../utils/permissionUtils";
import {
  Permission,
  PermissionAction,
  Role,
  buildDefaultPermissions,
  formatRoleId,
  permissionActions,
  permissionModules,
} from "./UserRoleManagement";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";

interface RoleFormValues {
  roleName: string;
  permissions: Permission[];
}

interface AddEditRolePageProps {
  mode: "create" | "edit" | "view";
}

const actionLabels: Record<PermissionAction, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  assign: "Assign",
  approve: "Approve",
};

export default function AddEditRolePage({ mode }: AddEditRolePageProps) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showToast } = useToast();
  const { user: currentUser, refetchUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role | null>(null);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);

  const defaultPermissionsList = useMemo(() => buildDefaultPermissions(), []);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RoleFormValues>({
    defaultValues: {
      roleName: "",
      permissions: defaultPermissionsList,
    },
  });

  const currentPermissions = watch("permissions") || defaultPermissionsList;

  useEffect(() => {
    const loadRole = async () => {
      setLoading(true);
      try {
        if (mode !== "create" && id) {
          const foundRole = await roleService.getRoleById(Number(id));
          if (!foundRole) {
            showToast("Role not found.", "error");
            navigate("/roles");
            return;
          }

          setRole(foundRole);
          reset({
            roleName: foundRole.name,
            permissions: permissionsToFrontend(foundRole.permissions),
          });
          return;
        }

        reset({
          roleName: "",
          permissions: defaultPermissionsList.map((permission) => ({ ...permission })),
        });
      } catch {
        showToast("Failed to load role data.", "error");
      } finally {
        setLoading(false);
      }
    };

    loadRole();
  }, [defaultPermissionsList, id, mode, navigate, reset, showToast]);

  const getPermissionIndexesForModule = (moduleKey: string) =>
    currentPermissions.reduce<number[]>((indexes, permission, index) => {
      if (permission.key === moduleKey || permission.parentKey === moduleKey) {
        indexes.push(index);
      }
      return indexes;
    }, []);

  const isActionSupported = (permission: Permission, action: PermissionAction) => {
    const moduleKey = permission.parentKey || permission.key;
    return permissionModules.find((module) => module.key === moduleKey)?.actions.includes(action) ?? false;
  };

  const getParentActionState = (permission: Permission, action: PermissionAction) => {
    if (permission.isSubMenu) {
      return { checked: permission[action], indeterminate: false };
    }

    const childIndexes = currentPermissions.reduce<number[]>((indexes, currentPermission, index) => {
      if (currentPermission.parentKey === permission.key) {
        indexes.push(index);
      }
      return indexes;
    }, []);

    if (childIndexes.length === 0) {
      return { checked: permission[action], indeterminate: false };
    }

    const checkedChildren = childIndexes.filter((index) => currentPermissions[index][action]).length;

    return {
      checked: checkedChildren === childIndexes.length,
      indeterminate: checkedChildren > 0 && checkedChildren < childIndexes.length,
    };
  };

  const handlePermissionChange = (
    index: number,
    action: PermissionAction,
    checked: boolean
  ) => {
    if (mode === "view") {
      return;
    }

    const updatedPermissions = currentPermissions.map((permission) => ({ ...permission }));
    const changedPermission = updatedPermissions[index];
    changedPermission[action] = checked;

    if (!changedPermission.isSubMenu) {
      updatedPermissions.forEach((permission) => {
        if (permission.parentKey === changedPermission.key) {
          permission[action] = checked;
        }
      });
    } else if (changedPermission.parentKey) {
      const relatedIndexes = getPermissionIndexesForModule(changedPermission.parentKey).filter(
        (permissionIndex) => updatedPermissions[permissionIndex].parentKey === changedPermission.parentKey
      );
      const parentIndex = updatedPermissions.findIndex(
        (permission) => permission.key === changedPermission.parentKey
      );

      if (parentIndex >= 0) {
        updatedPermissions[parentIndex][action] = relatedIndexes.every(
          (permissionIndex) => updatedPermissions[permissionIndex][action]
        );
      }
    }

    setValue("permissions", updatedPermissions, { shouldDirty: true });
    setPermissionsError(null);
  };

  const handleSave = async (data: RoleFormValues) => {
    if (mode === "view") {
      return;
    }

    const hasAnyPermission = data.permissions.some((permission) =>
      permissionActions.some((action) => permission[action])
    );

    if (!hasAnyPermission) {
      setPermissionsError("At least one module permission must be selected.");
      return;
    }
    setPermissionsError(null);

    const payload = {
      name: data.roleName.trim(),
      permissions: permissionsToBackend(data.permissions),
    };

    try {
      if (mode === "create") {
        await roleService.createRole(payload);
        showToast("Role created successfully.", "success");
      } else if (mode === "edit" && role) {
        await roleService.updateRole(role.id, payload);
        if (currentUser?.role?.id === role.id) {
          await refetchUser();
        }
        showToast("Role updated successfully.", "success");
      }

      navigate("/roles");
    } catch (error: any) {
      showToast(error.response?.data?.message || "Failed to save role.", "error");
    }
  };

  const handleFormError = () => {
    const hasAnyPermission = currentPermissions.some((permission) =>
      permissionActions.some((action) => permission[action])
    );
    if (!hasAnyPermission) {
      setPermissionsError("At least one module permission must be selected.");
    }
    showToast("Please fill all required fields correctly.", "error");
  };

  if (loading) {
    return <div className="py-10 text-center text-gray-500">Loading Details...</div>;
  }

  const pageTitle =
    mode === "create" ? "Add Role" : mode === "edit" ? "Edit Role" : "View Role";

  return (
    <>
      <PageMeta
        title={`${pageTitle} | SaiFlow`}
        description="Configure system user roles and module permissions."
      />
      <PageBreadcrumb pageTitle={pageTitle} />

      <div className="w-full space-y-6">
        <form onSubmit={handleSubmit(handleSave, handleFormError)} className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="mb-4 border-b border-gray-100 pb-2 text-sm font-semibold text-gray-800 dark:border-white/[0.05] dark:text-white/95">
              Role Details
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                  <span className="mt-1.5 block text-xs text-error-600">
                    {errors.roleName.message}
                  </span>
                )}
              </div>
              {role && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Role ID
                  </label>
                  <Input
                    type="text"
                    value={formatRoleId(role.id)}
                    disabled
                    className="cursor-not-allowed opacity-70"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="border-b border-gray-100 p-6 dark:border-white/[0.05]">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/95">
                Module Permissions <span className="text-error-500">*</span>
              </h3>
              {permissionsError && (
                <span className="mt-1.5 block text-xs text-error-600">{permissionsError}</span>
              )}
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-800/40">
                  <TableRow>
                    <TableCell isHeader className="px-5 py-3 text-start text-theme-xs font-semibold text-gray-500">
                      Menus
                    </TableCell>
                    {permissionActions.map((action) => (
                      <TableCell
                        key={action}
                        isHeader
                        className="w-24 px-5 py-3 text-center text-theme-xs font-semibold text-gray-500"
                      >
                        {actionLabels[action]}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {currentPermissions.map((permission, index) => {
                    const isParent = !permission.isSubMenu;

                    return (
                      <TableRow
                        key={permission.key}
                        className={
                          isParent
                            ? "bg-gray-50/50 font-medium text-gray-850 dark:bg-white/[0.01] dark:text-white"
                            : "text-gray-600 dark:text-gray-400"
                        }
                      >
                        <TableCell className="px-5 py-3 text-theme-sm">
                          <span className={permission.isSubMenu ? "inline-block pl-5 text-gray-500" : ""}>
                            {permission.isSubMenu ? `|- ${permission.menu}` : permission.menu}
                          </span>
                        </TableCell>
                        {permissionActions.map((action) => {
                          const supported = isActionSupported(permission, action);
                          const parentActionState = getParentActionState(permission, action);

                          return (
                            <TableCell key={action} className="px-5 py-3 text-center">
                              <div className="flex justify-center">
                                {supported ? (
                                  <Checkbox
                                    checked={permission.isSubMenu ? permission[action] : parentActionState.checked}
                                    indeterminate={!permission.isSubMenu && parentActionState.indeterminate}
                                    disabled={mode === "view"}
                                    onChange={(checked) =>
                                      handlePermissionChange(index, action, checked)
                                    }
                                  />
                                ) : (
                                  <span className="text-gray-400 dark:text-gray-600">-</span>
                                )}
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4 dark:border-white/[0.05]">
            <Button size="sm" type="button" variant="outline" onClick={() => navigate("/roles")}>
              {mode === "view" ? "Back to List" : "Cancel"}
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
