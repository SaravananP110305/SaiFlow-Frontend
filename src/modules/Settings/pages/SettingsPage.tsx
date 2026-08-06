import { useState, useEffect } from "react";
import axios from "axios";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import Select from "../../../components/form/Select";
import { useToast } from "../../../hooks/useToast";
import { useAuth } from "../../../context/AuthContext";
import { settingsService } from "../../../services/settingsService";

interface Settings {
  appName: string;
  timeZone: string;
  language: string;
  companyName: string;
  contactEmail: string;
  address: string;
}

const EMPTY_SETTINGS: Settings = {
  appName: "",
  timeZone: "",
  language: "",
  companyName: "",
  contactEmail: "",
  address: "",
};

export default function SettingsPage() {
  const { showToast } = useToast();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("settings", "edit");
  const [activeTab, setActiveTab] = useState<"general" | "company">("general");

  const [settings, setSettings] = useState<Settings>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const getErrorMessage = (err: unknown, fallback: string) => {
    if (axios.isAxiosError(err)) {
      return (err.response?.data as { message?: string } | undefined)?.message || fallback;
    }
    return fallback;
  };

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const res = await settingsService.getSettings();
        const data = res?.data || {};
        setSettings({
          appName: data.appName || "",
          timeZone: data.timeZone || "",
          language: data.language || "",
          companyName: data.companyName || "",
          contactEmail: data.contactEmail || "",
          address: data.address || "",
        });
      } catch (err) {
        showToast(getErrorMessage(err, "Failed to load settings from backend."), "error");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [showToast]);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsService.updateSettings({
        appName: settings.appName,
        timeZone: settings.timeZone,
        language: settings.language,
      });
      showToast("General system settings saved.", "success");
    } catch (err) {
      showToast(getErrorMessage(err, "Failed to save settings."), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsService.updateSettings({
        companyName: settings.companyName,
        contactEmail: settings.contactEmail,
        address: settings.address,
      });
      showToast("Company profile details updated.", "success");
    } catch (err) {
      showToast(getErrorMessage(err, "Failed to update company profile."), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageMeta
        title="System Settings | SaiFlow"
        description="Configure application defaults, company metadata, and database controls in SaiFlow ERP."
      />
      <PageBreadcrumb pageTitle="Settings" />

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 mb-6">
        <button
          onClick={() => setActiveTab("general")}
          className={`pb-3 text-sm font-semibold border-b-2 px-4 cursor-pointer transition-colors ${activeTab === "general"
            ? "border-brand-500 text-brand-500 font-semibold"
            : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
        >
          General Settings
        </button>
        <button
          onClick={() => setActiveTab("company")}
          className={`pb-3 text-sm font-semibold border-b-2 px-4 cursor-pointer transition-colors ${activeTab === "company"
            ? "border-brand-500 text-brand-500 font-semibold"
            : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
        >
          Company Details
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] max-w-2xl">
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading settings...</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] max-w-2xl">
          {activeTab === "general" && (
            <form onSubmit={handleSaveGeneral} className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">General Configuration</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Application Name</label>
                <Input
                  type="text"
                  value={settings.appName}
                  disabled={!canEdit}
                  onChange={(e) => setSettings((prev) => ({ ...prev, appName: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">System Timezone</label>
                <Select
                  options={[
                    { value: "GMT+05:30", label: "GMT+05:30 (India Standard Time)" },
                    { value: "GMT+00:00", label: "GMT+00:00 (UTC)" },
                    { value: "GMT-05:00", label: "GMT-05:00 (Eastern Standard Time)" },
                  ]}
                  defaultValue={settings.timeZone}
                  disabled={!canEdit}
                  onChange={(value) => setSettings((prev) => ({ ...prev, timeZone: value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Default Language</label>
                <Select
                  options={[
                    { value: "English (US)", label: "English (US)" },
                    { value: "English (UK)", label: "English (UK)" },
                    { value: "Spanish", label: "Spanish" },
                  ]}
                  defaultValue={settings.language}
                  disabled={!canEdit}
                  onChange={(value) => setSettings((prev) => ({ ...prev, language: value }))}
                />
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" variant="primary" size="sm" disabled={!canEdit || saving}>
                  {saving ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </form>
          )}

          {activeTab === "company" && (
            <form onSubmit={handleSaveCompany} className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">Company Profile Details</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Company Registered Name</label>
                <Input
                  type="text"
                  value={settings.companyName}
                  disabled={!canEdit}
                  onChange={(e) => setSettings((prev) => ({ ...prev, companyName: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Contact Email Address</label>
                <Input
                  type="email"
                  value={settings.contactEmail}
                  disabled={!canEdit}
                  onChange={(e) => setSettings((prev) => ({ ...prev, contactEmail: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Corporate Address</label>
                <Input
                  type="text"
                  value={settings.address}
                  disabled={!canEdit}
                  onChange={(e) => setSettings((prev) => ({ ...prev, address: e.target.value }))}
                />
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" variant="primary" size="sm" disabled={!canEdit || saving}>
                  {saving ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </>
  );
}
