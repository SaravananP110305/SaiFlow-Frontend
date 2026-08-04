import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import Select from "../../../components/form/Select";
import { useToast } from "../../../hooks/useToast";
import { clientService } from "../../../services/clientService";
import { masterService } from "../../../services/masterService";
import api from "../../../services/api";

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

  const [countriesList, setCountriesList] = useState<any[]>([]);
  const [statesList, setStatesList] = useState<any[]>([]);
  const [industryOptions, setIndustryOptions] = useState<{ value: string; label: string }[]>([]);
  const [designationOptions, setDesignationOptions] = useState<{ value: string; label: string }[]>([]);
  const [paymentTypeOptions, setPaymentTypeOptions] = useState<{ value: string; label: string }[]>([]);
  const [countryOptions, setCountryOptions] = useState<{ value: string; label: string }[]>([]);
  const [stateOptions, setStateOptions] = useState<{ value: string; label: string }[]>([]);
  const [cityOptions, setCityOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const [countriesData, industriesData, designationsData, paymentTypesData] = await Promise.all([
          masterService.getMasterItems("COUNTRY"),
          masterService.getMasterItems("INDUSTRY"),
          masterService.getMasterItems("DESIGNATION"),
          masterService.getMasterItems("PAYMENT_TYPE")
        ]);
        
        setCountriesList(countriesData);
        setCountryOptions(countriesData.map((x: any) => ({ value: x.name, label: x.name })));
        setIndustryOptions(industriesData.map((x: any) => ({ value: x.name, label: x.name })));
        setDesignationOptions(designationsData.map((x: any) => ({ value: x.name, label: x.name })));
        setPaymentTypeOptions(paymentTypesData.map((x: any) => ({ value: x.name, label: x.name })));
      } catch (err) {
        console.error("Failed to load drop-downs in AddClient", err);
      }
    };
    loadDropdownData();
  }, []);

  useEffect(() => {
    const loadStates = async () => {
      if (!country) {
        setStateOptions([]);
        return;
      }
      const selectedCountryObj = countriesList.find((c) => c.name === country);
      if (!selectedCountryObj) return;
      try {
        const states = await masterService.getMasterItems("STATE", selectedCountryObj.id);
        setStateOptions(states.map((s: any) => ({ value: s.name, label: s.name })));
        setStatesList(states);
      } catch (err) {
        console.error(err);
      }
    };
    loadStates();
  }, [country, countriesList]);

  useEffect(() => {
    const loadCities = async () => {
      if (!state) {
        setCityOptions([]);
        return;
      }
      const selectedStateObj = statesList.find((s) => s.name === state);
      if (!selectedStateObj) return;
      try {
        const cities = await masterService.getMasterItems("CITY", selectedStateObj.id);
        setCityOptions(cities.map((c: any) => ({ value: c.name, label: c.name })));
      } catch (err) {
        console.error(err);
      }
    };
    loadCities();
  }, [state, statesList]);

  useEffect(() => {
    const loadClient = async () => {
      if (isEditMode && id) {
        setLoading(true);
        try {
          const client = await clientService.getClientById(Number(id));
          if (client) {
            setName(client.contactName || client.name || "");
            setCompany(client.company?.name || client.company || "");
            setEmail(client.email || client.company?.email || "");
            setPhone(client.phone || client.company?.phone || "");
            setStatus(client.status || "Active");
            setIndustry(client.company?.industry || "");
            setWebsite(client.company?.website || "");
            setCompanyEmail(client.company?.email || "");
            setCompanyPhone(client.company?.phone || "");
            setGstNumber(client.gstPan || "");
            setPanNumber("");
            setAddress(client.company?.address || "");
            setCity(client.company?.city || "");
            setState(client.company?.state || "");
            setCountry(client.company?.country || "");
            setPincode(client.company?.pincode || "");
            setContactName(client.contactName || client.name || "");
            setDesignation("");
            setMobile(client.phone || "");
            setRelationshipManager("");
            setAccountManager("");
            setClientSince(client.createdAt ? client.createdAt.split("T")[0] : "");
            setPaymentTerms("Net 30");
            setPreferredCommunication("Email");
            setCreditLimit("");
          }
        } catch (err) {
          console.error(err);
          showToast("Failed to load client details.", "error");
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    loadClient();
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

  const handleSave = async (e: React.FormEvent) => {
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

    try {
      if (isEditMode && id) {
        const client = await clientService.getClientById(Number(id));
        if (client && client.companyId) {
          await api.put(`/companies/${client.companyId}`, {
            name: company.trim(),
            website: website.trim(),
            address: address.trim()
          });
        }
        await clientService.updateClient(Number(id), {
          gstPan: gstNumber,
          status
        });
        showToast("Client details updated.", "success");
      } else {
        let companyId;
        const searchRes = await api.get('/companies', { params: { search: company.trim() } });
        const existingCompany = searchRes.data?.data?.find(
          (c: any) => c.name.toLowerCase() === company.trim().toLowerCase()
        );
        if (existingCompany) {
          companyId = existingCompany.id;
        } else {
          const newCompany = await api.post('/companies', { name: company.trim() });
          companyId = newCompany.data?.data?.id;
        }

        await clientService.createClient({
          companyId,
          gstPan: gstNumber,
          status
        });
        showToast("Client added successfully.", "success");
      }
      navigate("/clients");
    } catch (err) {
      showToast("Failed to save client.", "error");
    }
  };

  if (loading) {
    return <div className="py-10 text-center text-gray-500">Loading client form...</div>;
  }

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
