import { useParams, useNavigate } from "react-router";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Badge from "../../../components/ui/badge/Badge";
import Button from "../../../components/ui/button/Button";
import { Client } from "../data/clientsData";
import { clientService } from "../../../services/clientService";
import { useEffect, useState } from "react";
import {
  FiBriefcase,
  FiUser,
  FiMail,
  FiPhone,
  FiGlobe,
  FiCalendar,
  FiArrowLeft,
  FiActivity,
  FiCreditCard,
  FiExternalLink,
  FiShield,
  FiHome,
  FiCompass,
  FiMap,
  FiNavigation,
  FiFlag,
} from "react-icons/fi";

interface InfoCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

function InfoCard({ icon, label, value }: InfoCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3.5 dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-gray-800">
        <span className="text-gray-500 dark:text-gray-400">{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <span className="block text-xs text-gray-400 dark:text-gray-550 mb-0.5">
          {label}
        </span>
        <span className="block text-sm font-medium text-gray-850 dark:text-white/90 break-words">
          {value || <span className="text-gray-400 font-normal">—</span>}
        </span>
      </div>
    </div>
  );
}

export default function ClientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadClientDetails = async () => {
      try {
        setLoading(true);
        const data = await clientService.getClientById(Number(id));
        if (data) {
          setClient({
            id: data.id,
            company: data.company?.name || data.company || "",
            name: data.contactName || data.name || "",
            email: data.email || data.company?.email || "",
            phone: data.phone || data.company?.phone || "",
            projectsCount: data.projects ? data.projects.length : 0,
            status: data.status || "Active",
            gstNumber: data.gstPan || "",
            panNumber: "",
            website: data.company?.website || "",
            companyEmail: data.company?.email || "",
            companyPhone: data.company?.phone || "",
            address: data.company?.address || "",
            city: data.company?.city || "",
            state: data.company?.state || "",
            country: data.company?.country || "India",
            pincode: data.company?.pincode || "",
            contactName: data.contactName || data.name || "",
            designation: "",
            mobile: data.phone || "",
            relationshipManager: "",
            accountManager: "",
            clientSince: data.createdAt ? data.createdAt.split("T")[0] : "",
            paymentTerms: "Net 30",
            preferredCommunication: "Email",
            creditLimit: "",
            handoverStatus: data.projects && data.projects.length > 0 ? "Onboarded" : "Pending",
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadClientDetails();
  }, [id]);

  const [activeTab, setActiveTab] = useState("overview");

  if (loading) {
    return <div className="py-10 text-center text-gray-500">Loading client details...</div>;
  }

  if (!client) {
    return (
      <>
        <PageBreadcrumb pageTitle="Client Details" />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
            Client Not Found
          </p>
          <p className="text-sm text-gray-400 mb-6">
            The client you're looking for does not exist or has been deleted.
          </p>
          <Button size="sm" onClick={() => navigate("/clients")}>
            Back to Client List
          </Button>
        </div>
      </>
    );
  }

  // Tab configurations
  const tabs: { id: string; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "contacts", label: "Contacts" },
    { id: "timeline", label: "Timeline" },
  ];

  return (
    <>
      <PageMeta
        title={`Client Details: ${client.company} | SaiFlow`}
        description="View enterprise profile, meetings, contracts and payment terms."
      />
      <PageBreadcrumb pageTitle="Client Details" />

      {/* Top Action Bar */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => navigate("/clients")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-white transition cursor-pointer"
        >
          <FiArrowLeft className="size-4" />
          Back to List
        </button>
      </div>

      {/* Summary Header Card */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-gray-200 bg-white px-6 py-5 mb-6 dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white font-bold text-lg">
            {client.company.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-850 dark:text-white/95">
              {client.company}
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
              <span>Client ID: SF-CLI-{String(client.id).padStart(4, "0")}</span>
              <span>•</span>
              <span>Contact: {client.name}</span>
              <span>•</span>
              <span>Email: {client.email}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge size="md" color={client.status === "Active" ? "success" : client.status === "Blacklisted" ? "error" : "warning"}>
            {client.status}
          </Badge>
        </div>
      </div>

      {/* Premium Tab Navigators */}
      <div className="border-b border-gray-200 dark:border-white/[0.05] mb-6 overflow-x-auto scrollbar-none">
        <nav className="flex min-w-max pb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all duration-200 flex items-center gap-2 cursor-pointer whitespace-nowrap ${activeTab === tab.id
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/[0.03] rounded-t-lg"
                }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`inline-flex items-center justify-center min-w-[22px] h-[22px] rounded-full px-1.5 text-[11px] font-bold leading-none transition-all duration-200 ${activeTab === tab.id
                    ? "bg-brand-500 text-white shadow-xs"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Contents */}
      <div className="space-y-6">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Company Profile */}
            <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-5">
              <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wider">
                Company Profile
              </h3>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <InfoCard icon={<FiBriefcase className="size-4" />} label="Industry" value={client.industry || "Information Technology"} />
                <InfoCard icon={<FiGlobe className="size-4" />} label="Website" value={client.website ? <a href={client.website} target="_blank" rel="noreferrer" className="text-gray-800 dark:text-white/90 hover:text-gray-500 dark:hover:text-gray-400 hover:underline transition-colors inline-flex items-center gap-1">{client.website}<FiExternalLink className="size-3" /></a> : "—"} />
                <InfoCard icon={<FiShield className="size-4" />} label="GST Number" value={client.gstNumber} />
                <InfoCard icon={<FiShield className="size-4" />} label="PAN Number" value={client.panNumber || "AAAAA0000A"} />
                <InfoCard icon={<FiMail className="size-4" />} label="Company Email" value={client.companyEmail} />
                <InfoCard icon={<FiPhone className="size-4" />} label="Company Phone" value={client.companyPhone} />
              </div>
            </div>

            {/* Business Details */}
            <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-5">
              <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wider">
                Business Details
              </h3>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <InfoCard icon={<FiCalendar className="size-4" />} label="Client Since" value={client.clientSince || "2024-01-10"} />
                <InfoCard icon={<FiCreditCard className="size-4" />} label="Payment Terms" value={client.paymentTerms || "Net 30"} />
                <InfoCard icon={<FiCreditCard className="size-4" />} label="Credit Limit (INR)" value={client.creditLimit ? `₹${Number(client.creditLimit).toLocaleString()}` : "₹500,000"} />
                <InfoCard icon={<FiMail className="size-4" />} label="Preferred Communication" value={client.preferredCommunication || "Email"} />
              </div>
            </div>

            {/* Address Details */}
            <div className="md:col-span-2 rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-5">
              <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wider">
                Address Details
              </h3>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                <div className="sm:col-span-3">
                  <InfoCard icon={<FiHome className="size-4" />} label="Office Address" value={client.address || "45 Tech Corridor, ITPL Road"} />
                </div>
                <InfoCard icon={<FiCompass className="size-4" />} label="City" value={client.city || "Bangalore"} />
                <InfoCard icon={<FiMap className="size-4" />} label="State" value={client.state || "Karnataka"} />
                <InfoCard icon={<FiNavigation className="size-4" />} label="Pincode" value={client.pincode || "560066"} />
                <InfoCard icon={<FiFlag className="size-4" />} label="Country" value={client.country || "India"} />
              </div>
            </div>
          </div>
        )}

        {activeTab === "contacts" && (
          <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-5">
            <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05] uppercase tracking-wider">
              Primary Contact Person
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoCard icon={<FiUser className="size-4" />} label="Contact Name" value={client.contactName || client.name} />
              <InfoCard icon={<FiBriefcase className="size-4" />} label="Designation" value={client.designation || "BD Director"} />
              <InfoCard icon={<FiPhone className="size-4" />} label="Mobile" value={client.mobile || client.phone} />
              <InfoCard icon={<FiMail className="size-4" />} label="Email" value={client.email ? <a href={`mailto:${client.email}`} className="text-gray-800 dark:text-white/90 hover:text-gray-500 dark:hover:text-gray-400 hover:underline transition-colors">{client.email}</a> : "—"} />
            </div>

            <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 mt-6 mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05] uppercase tracking-wider">
              Relationship Assignment
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoCard icon={<FiUser className="size-4" />} label="Relationship Manager" value={client.relationshipManager || "John Doe"} />
              <InfoCard icon={<FiUser className="size-4" />} label="Account Manager" value={client.accountManager || "Jane Smith"} />
            </div>
          </div>
        )}

        {/* Timeline */}
        {activeTab === "timeline" && (
          <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-5">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05] flex items-center gap-2">
              <FiActivity className="size-4 text-brand-500" />
              Client Relationship Timeline
            </h3>
            {client.clientSince ? (
              <div className="relative border-l-2 border-gray-100 dark:border-gray-850 ml-4 pl-6 space-y-6">
                <div className="relative">
                  <span className="absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 ring-4 ring-white dark:ring-gray-900">
                    <span className="h-1.5 w-1.5 rounded-full bg-white"></span>
                  </span>
                  <div>
                    <span className="text-xs text-gray-400 dark:text-gray-505 block mb-0.5">
                      {client.clientSince}
                    </span>
                    <p className="text-sm font-semibold text-gray-850 dark:text-white/90">
                      Client Account Created
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Converted from qualified won lead. Relationship manager assigned: {client.relationshipManager || "John Doe"}.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <FiActivity className="size-8 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No timeline activities recorded yet.
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Activities will appear as you manage this client.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
