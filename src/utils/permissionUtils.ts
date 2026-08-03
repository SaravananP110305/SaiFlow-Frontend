import { Permission, sidebarStructure, buildDefaultPermissions } from '../modules/UserManagement/pages/UserRoleManagement';

/**
 * Converts frontend Permission[] array (with boolean fields) into the backend's
 * { module: string[] } map format.
 *
 * Frontend: [{ key: 'leads', view: true, create: true, edit: false, delete: false }]
 * Backend:  { leads: ['view', 'create'] }
 *
 * Sub-menu items are rolled up into their parent module key.
 */
export function permissionsToBackend(
  frontendPerms: Permission[]
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  // Only process parent-level items (not sub-menu items)
  const parentKeys = sidebarStructure.map((s) => s.key);

  for (const perm of frontendPerms) {
    // Skip sub-menu items — they share the parent module key
    if (perm.isSubMenu || perm.parentKey) continue;

    // Only include keys that match our sidebar modules
    if (!parentKeys.includes(perm.key)) continue;

    const actions: string[] = [];
    if (perm.view) actions.push('view');
    if (perm.create) actions.push('create');
    if (perm.edit) actions.push('edit');
    if (perm.delete) actions.push('delete');

    if (actions.length > 0) {
      result[perm.key] = actions;
    }
  }

  return result;
}

/**
 * Converts backend's { module: string[] } map format into the frontend Permission[] array.
 *
 * Backend:  { leads: ['view', 'create'] }
 * Frontend: [{ key: 'leads', menu: 'Leads', view: true, create: true, edit: false, delete: false }, ...]
 *
 * If the input is already an array (legacy localStorage format), it is returned as-is
 * after syncing with the current sidebar structure.
 */
export function permissionsToFrontend(
  backendPerms: Record<string, string[]> | Permission[] | null | undefined
): Permission[] {
  const defaults = buildDefaultPermissions();

  // Handle null/undefined
  if (!backendPerms) {
    return defaults;
  }

  // If it's already a frontend-style array, return synced version
  if (Array.isArray(backendPerms)) {
    return defaults.map((defaultPerm) => {
      const saved = (backendPerms as Permission[]).find(
        (p) => p.key === defaultPerm.key || p.menu === defaultPerm.menu
      );
      if (saved) {
        return {
          ...defaultPerm,
          view: saved.view,
          create: saved.create,
          edit: saved.edit,
          delete: saved.delete,
        };
      }
      return { ...defaultPerm };
    });
  }

  // Convert backend map format to frontend array
  const permsMap = backendPerms as Record<string, string[]>;

  return defaults.map((defaultPerm) => {
    // For sub-menu items, inherit from parent
    const moduleKey = defaultPerm.parentKey || defaultPerm.key;
    const actions = permsMap[moduleKey] || [];

    return {
      ...defaultPerm,
      view: actions.includes('view'),
      create: actions.includes('create'),
      edit: actions.includes('edit'),
      delete: actions.includes('delete'),
    };
  });
}
