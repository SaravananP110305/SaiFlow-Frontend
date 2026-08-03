import {
  Permission,
  PermissionAction,
  permissionActions,
  permissionModules,
  buildDefaultPermissions,
} from "../modules/UserManagement/pages/UserRoleManagement";

export function permissionsToBackend(
  frontendPermissions: Permission[]
): Record<string, string[]> {
  const supportedModules = new Set(permissionModules.map((module) => module.key));
  const aggregatedPermissions = new Map<string, Set<PermissionAction>>();

  frontendPermissions.forEach((permission) => {
    const moduleKey = permission.parentKey || permission.key;
    if (!supportedModules.has(moduleKey)) {
      return;
    }

    const supportedActions =
      permissionModules.find((module) => module.key === moduleKey)?.actions ?? [];
    const actionSet = aggregatedPermissions.get(moduleKey) ?? new Set<PermissionAction>();

    permissionActions.forEach((action) => {
      if (supportedActions.includes(action) && permission[action]) {
        actionSet.add(action);
      }
    });

    if (actionSet.size > 0) {
      aggregatedPermissions.set(moduleKey, actionSet);
    }
  });

  return Object.fromEntries(
    Array.from(aggregatedPermissions.entries()).map(([moduleKey, actionSet]) => [
      moduleKey,
      permissionActions.filter((action) => actionSet.has(action)),
    ])
  );
}

export function permissionsToFrontend(
  backendPermissions: Record<string, string[]> | Permission[] | null | undefined
): Permission[] {
  const defaultPermissions = buildDefaultPermissions();

  if (!backendPermissions) {
    return defaultPermissions;
  }

  if (Array.isArray(backendPermissions)) {
    return defaultPermissions.map((defaultPermission) => {
      const savedPermission = backendPermissions.find(
        (permission) =>
          permission.key === defaultPermission.key || permission.menu === defaultPermission.menu
      );

      return savedPermission
        ? {
            ...defaultPermission,
            ...savedPermission,
          }
        : { ...defaultPermission };
    });
  }

  return defaultPermissions.map((defaultPermission) => {
    const moduleKey = defaultPermission.parentKey || defaultPermission.key;
    const actions = backendPermissions[moduleKey] || [];

    return {
      ...defaultPermission,
      view: actions.includes("view"),
      create: actions.includes("create"),
      edit: actions.includes("edit"),
      delete: actions.includes("delete"),
      assign: actions.includes("assign"),
      approve: actions.includes("approve"),
    };
  });
}
