import { useState, useEffect } from "react";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Button from "../../../components/ui/button/Button";
import { roleService } from "../../../services/roleService";
import { useToast } from "../../../hooks/useToast";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "../../../components/ui/table";

interface RolePermission {
  role: string;
  read: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  export: boolean;
  settings: boolean;
}


export default function AccessPermissionMatrix() {
  const { showToast } = useToast();
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [backendRoles, setBackendRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const data = await roleService.getRoles();
      if (Array.isArray(data)) {
        setBackendRoles(data);
        const mapped = data.map((r: any) => {
          const perms = r.permissions || {};
          const leadsPerms = perms.leads || [];
          const settingsPerms = perms.settings || [];
          return {
            role: r.name,
            read: leadsPerms.includes("view"),
            create: leadsPerms.includes("create"),
            edit: leadsPerms.includes("edit"),
            delete: leadsPerms.includes("delete"),
            export: leadsPerms.includes("export"),
            settings: settingsPerms.includes("view") || settingsPerms.includes("edit"),
          };
        });
        setPermissions(mapped);
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to load permission matrix.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleCheckboxChange = (roleIndex: number, field: keyof Omit<RolePermission, "role">) => {
    const updated = [...permissions];
    updated[roleIndex] = {
      ...updated[roleIndex],
      [field]: !updated[roleIndex][field],
    };
    setPermissions(updated);
  };

  const handleSave = async () => {
    try {
      await Promise.all(permissions.map(async (p) => {
        const role = backendRoles.find((r) => r.name === p.role);
        if (!role) return;

        const perms = {
          users: p.settings ? ['view'] : [],
          roles: p.settings ? ['view'] : [],
          leads: [
            ...(p.read ? ['view'] : []),
            ...(p.create ? ['create'] : []),
            ...(p.edit ? ['edit'] : []),
            ...(p.delete ? ['delete'] : []),
            ...(p.export ? ['export'] : [])
          ],
          meetings: [
            ...(p.read ? ['view'] : []),
            ...(p.create ? ['create'] : []),
            ...(p.edit ? ['edit'] : []),
            ...(p.delete ? ['delete'] : [])
          ],
          proposals: [
            ...(p.read ? ['view'] : []),
            ...(p.create ? ['create'] : []),
            ...(p.edit ? ['edit'] : []),
            ...(p.delete ? ['delete'] : [])
          ],
          clients: [
            ...(p.read ? ['view'] : []),
            ...(p.create ? ['create'] : []),
            ...(p.edit ? ['edit'] : []),
            ...(p.delete ? ['delete'] : [])
          ],
          reports: p.read ? ['view'] : [],
          connect: [
            ...(p.read ? ['view'] : []),
            ...(p.create ? ['create'] : []),
            ...(p.edit ? ['edit'] : [])
          ],
          settings: p.settings ? ['view', 'edit'] : []
        };

        await roleService.updateRole(role.id, { permissions: perms });
      }));
      showToast("Access permission matrix saved successfully.", "success");
      fetchRoles();
    } catch (err) {
      showToast("Failed to save matrix.", "error");
    }
  };

  const handleReset = () => {
    fetchRoles();
    showToast("Access permission matrix reset to database values.", "info");
  };

  if (loading) {
    return <div className="py-10 text-center text-gray-500">Loading permission matrix...</div>;
  }

  return (
    <>
      <PageMeta
        title="Access Permission Matrix | SaiFlow"
        description="Configure role-based access permissions and control levels in SaiFlow CRM & ERP."
      />
      <PageBreadcrumb pageTitle="Access Permission Matrix" />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Role Permissions</h3>
            <p className="text-sm text-gray-500 mt-1">Select the access levels and permissions for each workspace role.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleReset} variant="outline" size="sm">
              Reset to Default
            </Button>
            <Button onClick={handleSave} variant="primary" size="sm">
              Save Matrix
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/[0.05]">
          <div className="max-w-full overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <th className="px-6 py-3.5 text-start text-sm font-semibold text-gray-700 dark:text-white/90">Role</th>
                  <th className="px-6 py-3.5 text-center text-sm font-semibold text-gray-700 dark:text-white/90">Read</th>
                  <th className="px-6 py-3.5 text-center text-sm font-semibold text-gray-700 dark:text-white/90">Create</th>
                  <th className="px-6 py-3.5 text-center text-sm font-semibold text-gray-700 dark:text-white/90">Edit</th>
                  <th className="px-6 py-3.5 text-center text-sm font-semibold text-gray-700 dark:text-white/90">Delete</th>
                  <th className="px-6 py-3.5 text-center text-sm font-semibold text-gray-700 dark:text-white/90">Export</th>
                  <th className="px-6 py-3.5 text-center text-sm font-semibold text-gray-700 dark:text-white/90">Settings</th>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissions.map((p, roleIndex) => (
                  <TableRow key={p.role} className="border-b border-gray-100 last:border-0 dark:border-white/[0.05] hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                    <TableCell className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                      {p.role}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={p.read}
                        onChange={() => handleCheckboxChange(roleIndex, "read")}
                        disabled={p.role === "Administrator"}
                        className="w-4 h-4 rounded-sm border-gray-300 text-brand-500 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800"
                      />
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={p.create}
                        onChange={() => handleCheckboxChange(roleIndex, "create")}
                        disabled={p.role === "Administrator"}
                        className="w-4 h-4 rounded-sm border-gray-300 text-brand-500 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800"
                      />
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={p.edit}
                        onChange={() => handleCheckboxChange(roleIndex, "edit")}
                        disabled={p.role === "Administrator"}
                        className="w-4 h-4 rounded-sm border-gray-300 text-brand-500 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800"
                      />
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={p.delete}
                        onChange={() => handleCheckboxChange(roleIndex, "delete")}
                        disabled={p.role === "Administrator"}
                        className="w-4 h-4 rounded-sm border-gray-300 text-brand-500 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800"
                      />
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={p.export}
                        onChange={() => handleCheckboxChange(roleIndex, "export")}
                        disabled={p.role === "Administrator"}
                        className="w-4 h-4 rounded-sm border-gray-300 text-brand-500 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800"
                      />
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={p.settings}
                        onChange={() => handleCheckboxChange(roleIndex, "settings")}
                        disabled={p.role === "Administrator"}
                        className="w-4 h-4 rounded-sm border-gray-300 text-brand-500 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </>
  );
}
