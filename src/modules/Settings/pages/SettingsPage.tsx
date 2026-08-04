import { useState } from "react";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import Select from "../../../components/form/Select";
import { useToast } from "../../../hooks/useToast";

interface Settings {
  appName: string;
  timeZone: string;
  language: string;
  companyName: string;
  contactEmail: string;
  address: string;
}

const DEFAULT_SETTINGS: Settings = {
  appName: "SaiFlow ERP",
  timeZone: "GMT+05:30",
  language: "English (US)",
  companyName: "Sai Technologies",
  contactEmail: "info@saiflow.com",
  address: "12, Tech Park Avenue, Bangalore, India",
};

export default function SettingsPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"general" | "company">("general");

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  // General Settings States
  const [appName, setAppName] = useState(settings.appName);
  const [timeZone, setTimeZone] = useState(settings.timeZone);
  const [language, setLanguage] = useState(settings.language);

  // Company Details States
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [contactEmail, setContactEmail] = useState(settings.contactEmail);
  const [address, setAddress] = useState(settings.address);

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    setSettings((prev) => ({
      ...prev,
      appName,
      timeZone,
      language,
    }));
    showToast("General system settings saved.", "success");
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    setSettings((prev) => ({
      ...prev,
      companyName,
      contactEmail,
      address,
    }));
    showToast("Company profile details updated.", "success");
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

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] max-w-2xl">
        {activeTab === "general" && (
          <form onSubmit={handleSaveGeneral} className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">General Configuration</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Application Name</label>
              <Input type="text" value={appName} onChange={(e) => setAppName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">System Timezone</label>
              <Select
                options={[
                  { value: "GMT+05:30", label: "GMT+05:30 (India Standard Time)" },
                  { value: "GMT+00:00", label: "GMT+00:00 (UTC)" },
                  { value: "GMT-05:00", label: "GMT-05:00 (Eastern Standard Time)" },
                ]}
                defaultValue={timeZone}
                onChange={setTimeZone}
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
                defaultValue={language}
                onChange={setLanguage}
              />
            </div>
            <div className="flex justify-end pt-4">
              <Button type="submit" variant="primary" size="sm">Save Settings</Button>
            </div>
          </form>
        )}

        {activeTab === "company" && (
          <form onSubmit={handleSaveCompany} className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">Company Profile Details</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Company Registered Name</label>
              <Input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Contact Email Address</label>
              <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1">Corporate Address</label>
              <Input type="text" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="flex justify-end pt-4">
              <Button type="submit" variant="primary" size="sm">Save Profile</Button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
