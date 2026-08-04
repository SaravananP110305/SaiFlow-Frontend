import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import Select from "../../../components/form/Select";
import { getStorage, getMasterStorage, setStorage } from "../../../utils/storage";
import { useToast } from "../../../hooks/useToast";
import { initialClients, Client } from "../data/clientsData";
import {
  COUNTRIES,
  STATES,
  CITIES,
  INDUSTRIES,
  DESIGNATIONS,
  PAYMENT_TYPES,
} from "../../Master/data/masterData";

const COMMUNICATION_OPTS = ["Email", "Phone", "WhatsApp"];
const ASSIGNEES = ["John Doe", "Jane Smith", "Alice Johnson", "Robert Lee"];

export default function AddClient() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Form Fields ────────────────────────────
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"Active" | "Inactive" | "Blacklisted">("Active");

  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");

  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [pincode, setPincode] = useState("");

  const [contactName, setContactName] = useState("");
  const [designation, setDesignation] = useState("");
  const [mobile, setMobile] = useState("");

  const [relationshipManager, setRelationshipManager] = useState("");
  const [accountManager, setAccountManager] = useState("");

  const [clientSince, setClientSince] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Immediate");
  const [preferredCommunication, setPreferredCommunication] = useState("Email");
  const [creditLimit, setCreditLimit] = useState("");

  // Master lists
  const industryOptions = useMemo(() => {
    return getStorage<any[]>("saiflow_master_industries", INDUSTRIES)
      .filter((x) => x.status === "Active")
      .map((x) => ({ value: x.name, label: x.name }));
  }, []);

  const designationOptions = useMemo(() => {
    return getStorage<any[]>("saiflow_master_designations", DESIGNATIONS)
      .filter((x) => x.status === "Active")
      .map((x) => ({ value: x.name, label: x.name }));
  }, []);

  const paymentTypeOptions = useMemo(() => {
    return getStorage<any[]>("saiflow_master_payment_types", PAYMENT_TYPES)
      .filter((x) => x.status === "Active")
      .map((x) => ({ value: x.name, label: x.name }));
  }, []);

  const countryOptions = useMemo(() => {
    return getMasterStorage<any[]>("saiflow_master_countries", COUNTRIES)
      .filter((x) => x.status === "Active")
      .map((x) => ({ value: x.name, label: x.name }));
  }, []);

  const stateOptions = useMemo(() => {
    const selectedCountryObj = getMasterStorage<any[]>("saiflow_master_countries", COUNTRIES)
      .find((c) => c.name === country);
    if (!selectedCountryObj) return [];
    return getMasterStorage<any[]>("saiflow_master_states", STATES)
      .filter((s) => s.countryId === selectedCountryObj.id && s.status === "Active")
      .map((s) => ({ value: s.name, label: s.name }));
  }, [country]);

  const cityOptions = useMemo(() => {
    const selectedStateObj = getMasterStorage<any[]>("saiflow_master_states", STATES)
      .find((s) => s.name === state);
    if (!selectedStateObj) return [];
    return getMasterStorage<any[]>("saiflow_master_cities", CITIES)
      .filter((c) => c.stateId === selectedStateObj.id && c.status === "Active")
      .map((c) => ({ value: c.name, label: c.name }));
  }, [state]);

  // ── Load data ──────────────────────────────

  useEffect(() => {
    if (isEditMode) {
      const clients = getStorage<Client[]>("saiflow_clients", initialClients);
      const client = clients.find((c) => c.id === Number(id));
      if (client) {
        setName(client.name);
        setCompany(client.company);
        setEmail(client.email);
        setPhone(client.phone);
        setStatus(client.status);
        setIndustry(client.industry || "");
        setWebsite(client.website || "");
        setCompanyEmail(client.companyEmail || "");
        setCompanyPhone(client.companyPhone || "");
        setGstNumber(client.gstNumber || "");
        setPanNumber(client.panNumber || "");
        setAddress(client.address || "");
        setCity(client.city || "");
        setState(client.state || "");
        setCountry(client.country || "");
        setPincode(client.pincode || "");
        setContactName(client.contactName || "");
        setDesignation(client.designation || "");
        setMobile(client.mobile || "");
        setRelationshipManager(client.relationshipManager || "");
        setAccountManager(client.accountManager || "");
        setClientSince(client.clientSince || "");
        setPaymentTerms(client.paymentTerms || "Net 30");
        setPreferredCommunication(client.preferredCommunication || "Email");
        setCreditLimit(client.creditLimit || "");
      }
    }
    setLoading(false);
  }, [id, isEditMode]);

  // ── Validation helpers ──────────────────────

  const validateField = (field: string, value: string): string | null => {
    switch (field) {
      case "name":
        if (!value.trim()) return "Client name is required.";
        break;
      case "company":
        if (!value.trim()) return "Company name is required.";
        break;
      case "email":
        if (!value.trim()) return "Email is required.";
        if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value.trim())) return "Please enter a valid email address.";
        break;
      case "phone":
        if (!value.trim()) return "Phone number is required.";
        if (!/^[+]?[\d\s()-]{6,20}$/.test(value.trim())) return "Please enter a valid phone number.";
        break;
    }
    return null;
  };

  const handleBlur = (field: string, value: string) => {
    const err = validateField(field, value);
    setErrors((prev) => {
      const next = { ...prev };
      if (err) next[field] = err;
      else delete next[field];
      return next;
    });
  };

  const handleFieldChange = (field: string, value: string, setter: (v: string) => void) => {
    setter(value);
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // ── Validation & Save ──────────────────────

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    
    const nameErr = validateField("name", name);
    if (nameErr) newErrors.name = nameErr;
    
    const companyErr = validateField("company", company);
    if (companyErr) newErrors.company = companyErr;
    
    const emailErr = validateField("email", email);
    if (emailErr) newErrors.email = emailErr;
    
    const phoneErr = validateField("phone", phone);
    if (phoneErr) newErrors.phone = phoneErr;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast("Please fill all required fields correctly.", "error");
      return;
    }

    const clients = getStorage<Client[]>("saiflow_clients", initialClients);

    if (isEditMode) {
      const updated = clients.map((c) =>
        c.id === Number(id)
          ? {
              ...c,
              name: name.trim(),
              company: company.trim(),
              email: email.trim(),
              phone: phone.trim(),
              status,
              industry: industry || c.industry,
              website: website || c.website,
              companyEmail: companyEmail || c.companyEmail,
              companyPhone: companyPhone || c.companyPhone,
              gstNumber: gstNumber || c.gstNumber,
              panNumber: panNumber || c.panNumber,
              address: address || c.address,
              city: city || c.city,
              state: state || c.state,
              country: country || c.country,
              pincode: pincode || c.pincode,
              contactName: contactName || c.contactName,
              designation: designation || c.designation,
              mobile: mobile || c.mobile,
              relationshipManager: relationshipManager || c.relationshipManager,
              accountManager: accountManager || c.accountManager,
              clientSince: clientSince || c.clientSince,
              paymentTerms: paymentTerms || c.paymentTerms,
              preferredCommunication: preferredCommunication || c.preferredCommunication,
              creditLimit: creditLimit || c.creditLimit,
            }
          : c
      );
      setStorage("saiflow_clients", updated);
      showToast("Client details updated.", "success");
    } else {
      const newId = clients.length > 0 ? Math.max(...clients.map((c) => c.id)) + 1 : 1;
      const newClient: Client = {
        id: newId,
        name: name.trim(),
        company: company.trim(),
        email: email.trim(),
        phone: phone.trim(),
        projectsCount: 0,
        status,
        industry: industry || undefined,
        website: website || undefined,
        companyEmail: companyEmail || undefined,
        companyPhone: companyPhone || undefined,
        gstNumber: gstNumber || undefined,
        panNumber: panNumber || undefined,
        address: address || undefined,
        city: city || undefined,
        state: state || undefined,
        country: country || undefined,
        pincode: pincode || undefined,
        contactName: contactName || undefined,
        designation: designation || undefined,
        mobile: mobile || undefined,
        relationshipManager: relationshipManager || undefined,
        accountManager: accountManager || undefined,
        clientSince: clientSince || undefined,
        paymentTerms: paymentTerms || undefined,
        preferredCommunication: preferredCommunication || undefined,
        creditLimit: creditLimit || undefined,
        handoverStatus: "Pending",
      };
      setStorage("saiflow_clients", [...clients, newClient]);
      showToast("Client added successfully.", "success");
    }
    navigate("/clients");
  };

  const handleCancel = () => {
    navigate("/clients");
  };

  // ── Render helpers ─────────────────────────

  const sectionHeader = (title: string) => (
    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 pb-2 border-b border-gray-100 dark:border-white/[0.05]">
      {title}
    </h4>
  );

  const renderField = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    opts?: { type?: string; placeholder?: string; required?: boolean; errorKey?: string }
  ) => (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">
        {label} {opts?.required && <span className="text-error-500">*</span>}
      </label>
      <Input
        type={opts?.type || "text"}
        placeholder={opts?.placeholder || ""}
        value={value}
        onChange={(e) => handleFieldChange(opts?.errorKey || "", e.target.value, onChange)}
        onBlur={() => opts?.errorKey && handleBlur(opts.errorKey, value)}
        error={!!(opts?.errorKey && errors[opts.errorKey])}
        hint={opts?.errorKey ? errors[opts.errorKey] : undefined}
      />
    </div>
  );

  if (loading) {
    return <div className="text-center py-10 text-gray-500">Loading Client Details...</div>;
  }

  return (
    <>
      <PageMeta
        title={isEditMode ? "Edit Client | SaiFlow" : "Add Client | SaiFlow"}
        description={isEditMode ? "Edit an existing client in SaiFlow CRM." : "Add a new client to SaiFlow CRM."}
      />
      <PageBreadcrumb pageTitle={isEditMode ? "Edit Client" : "Add Client"} />

      <form onSubmit={handleSave} className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-6 space-y-6">
        {/* Section 1: Basic Information */}
        <div>
          {sectionHeader("Basic Information")}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                Client ID
              </label>
              <Input
                type="text"
                disabled={true}
                value={isEditMode ? `SF-CLI-${String(id).padStart(4, "0")}` : "Auto-Generated"}
                className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
              />
            </div>
            {renderField("Client Name", name, setName, { required: true, placeholder: "Johnathan Doe", errorKey: "name" })}
            {renderField("Company Name", company, setCompany, { required: true, placeholder: "SpaceX Logistics", errorKey: "company" })}
            {renderField("Email Address", email, setEmail, { required: true, type: "email", placeholder: "john@spacex.com", errorKey: "email" })}
            {renderField("Phone Number", phone, setPhone, { required: true, placeholder: "+1 (555) 019-2831", errorKey: "phone" })}
            {renderField("Website", website, setWebsite, { placeholder: "https://example.com" })}
            {renderField("Company Email", companyEmail, setCompanyEmail, { type: "email", placeholder: "info@company.com" })}
            {renderField("Company Phone", companyPhone, setCompanyPhone, { placeholder: "+1 (555) 000-0000" })}
          </div>
        </div>

        {/* Section 2: Company Profile */}
        <div>
          {sectionHeader("Company Profile")}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">Industry</label>
              <Select
                options={industryOptions}
                placeholder="Select Industry"
                defaultValue={industry}
                onChange={(val) => setIndustry(val)}
              />
            </div>
            {renderField("GST Number", gstNumber, setGstNumber, { placeholder: "29AAAAA0000A1Z1" })}
            {renderField("PAN Number", panNumber, setPanNumber, { placeholder: "AAAAA0000A" })}
          </div>
        </div>

        {/* Section 3: Address */}
        <div>
          {sectionHeader("Address")}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              {renderField("Office Address", address, setAddress, { placeholder: "45 Tech Corridor, ITPL Road" })}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">Country</label>
              <Select
                options={countryOptions}
                placeholder="Select Country"
                defaultValue={country}
                onChange={(val) => {
                  setCountry(val);
                  setState("");
                  setCity("");
                }}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">State</label>
              <Select
                options={stateOptions}
                placeholder="Select State"
                defaultValue={state}
                onChange={(val) => {
                  setState(val);
                  setCity("");
                }}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">City</label>
              <Select
                options={cityOptions}
                placeholder="Select City"
                defaultValue={city}
                onChange={(val) => setCity(val)}
              />
            </div>
            {renderField("Pincode", pincode, setPincode, { placeholder: "560066" })}
          </div>
        </div>

        {/* Section 4: Contact Person */}
        <div>
          {sectionHeader("Contact Person")}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {renderField("Contact Name", contactName, setContactName, { placeholder: "Johnathan Doe" })}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">Designation</label>
              <Select
                options={designationOptions}
                placeholder="Select Designation"
                defaultValue={designation}
                onChange={(val) => setDesignation(val)}
              />
            </div>
            {renderField("Mobile", mobile, setMobile, { placeholder: "+1 (555) 019-2831" })}
          </div>
        </div>

        {/* Section 5: Relationship */}
        <div>
          {sectionHeader("Relationship")}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">Relationship Manager</label>
              <Select
                options={ASSIGNEES.map((a) => ({ value: a, label: a }))}
                placeholder="Select Manager"
                defaultValue={relationshipManager}
                onChange={(val) => setRelationshipManager(val)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">Account Manager</label>
              <Select
                options={ASSIGNEES.map((a) => ({ value: a, label: a }))}
                placeholder="Select Manager"
                defaultValue={accountManager}
                onChange={(val) => setAccountManager(val)}
              />
            </div>
          </div>
        </div>

        {/* Section 6: Business Details */}
        <div>
          {sectionHeader("Business Details")}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {renderField("Client Since", clientSince, setClientSince, { type: "date" })}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">Payment Type</label>
              <Select
                options={paymentTypeOptions}
                placeholder="Select Payment Type"
                defaultValue={paymentTerms}
                onChange={(val) => setPaymentTerms(val)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">Preferred Communication</label>
              <Select
                options={COMMUNICATION_OPTS.map((c) => ({ value: c, label: c }))}
                placeholder="Select Method"
                defaultValue={preferredCommunication}
                onChange={(val) => setPreferredCommunication(val)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">Credit Limit (INR)</label>
              <Input
                type="number"
                placeholder="500000"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="pt-4 border-t border-gray-100 dark:border-white/[0.05]">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">Status</label>
              <Select
                options={[
                  { value: "Active", label: "Active" },
                  { value: "Inactive", label: "Inactive" },
                  { value: "Blacklisted", label: "Blacklisted" },
                ]}
                defaultValue={status}
                onChange={(val) => setStatus(val as any)}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button size="sm" type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button size="sm" type="submit">
              {isEditMode ? "Update Client" : "Save Client"}
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}
