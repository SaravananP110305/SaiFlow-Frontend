import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { useForm, Controller } from "react-hook-form";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import Select from "../../../components/form/Select";
import { getStorage, getMasterStorage, setStorage } from "../../../utils/storage";
import { useToast } from "../../../hooks/useToast";
import { initialLeads, Lead, LeadStatus, LeadPriority } from "../data/leadsData";
import {
  LEAD_SOURCES,
  INDUSTRIES,
  COUNTRIES,
  STATES,
  CITIES,
  PRIORITIES as MASTER_PRIORITIES,
  COMPANY_TYPES,
  DESIGNATIONS,
} from "../../Master/data/masterData";

interface LeadFormValues {
  // Card 1: Lead Information
  company: string;
  contactPerson: string;
  designation: string;

  // Card 2: Contact Details
  phone: string;
  alternatePhone: string;
  email: string;
  alternateEmail: string;
  website: string;

  // Card 3: Company Details
  industry: string;
  companyType: string;

  // Card 4: Address
  addressLine1: string;
  country: string;
  state: string;
  city: string;
  pincode: string;

  // Card 5: Lead Details
  source: string;
  priority: string;

  // Card 6: Assignment
  assignedTo: string;

  // Card 7: Remarks / Notes
  notes: string;
}

export default function AddLead() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);

  // Collapsible sections for progressive disclosure
  const [expandedSections, setExpandedSections] = useState({
    companyAddress: false,
    leadAssignment: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    if (!isEditMode) {
      setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
    }
  };

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LeadFormValues>({
    mode: "onChange",
    defaultValues: {
      company: "",
      contactPerson: "",
      designation: "",
      phone: "",
      alternatePhone: "",
      email: "",
      alternateEmail: "",
      website: "",
      industry: "",
      companyType: "",
      addressLine1: "",
      country: "",
      state: "",
      city: "",
      pincode: "",
      source: "",
      priority: "",
      assignedTo: "",
      notes: "",
    },
  });

  const watchCountry = watch("country");
  const watchState = watch("state");

  // Data sources setup from master configuration
  const sourceOptions = useMemo(() => {
    return getStorage("saiflow_master_lead_sources", LEAD_SOURCES)
      .filter((x: any) => x.status === "Active")
      .map((x: any) => ({ value: x.name, label: x.name }));
  }, []);

  const priorityOptions = useMemo(() => {
    return getStorage("saiflow_master_priorities", MASTER_PRIORITIES)
      .filter((x: any) => x.status === "Active")
      .map((x: any) => ({ value: x.name, label: x.name }));
  }, []);

  const companyTypeOptions = useMemo(() => {
    return getStorage("saiflow_master_company_types", COMPANY_TYPES)
      .filter((x: any) => x.status === "Active")
      .map((x: any) => ({ value: x.name, label: x.name }));
  }, []);

  const countryOptions = useMemo(() => {
    return getMasterStorage("saiflow_master_countries", COUNTRIES)
      .filter((x: any) => x.status === "Active")
      .map((x: any) => ({ value: x.name, label: x.name }));
  }, []);

  const stateOptions = useMemo(() => {
    const selectedCountryObj = getMasterStorage<any[]>("saiflow_master_countries", COUNTRIES)
      .find((c) => c.name === watchCountry);
    if (!selectedCountryObj) return [];
    return getMasterStorage<any[]>("saiflow_master_states", STATES)
      .filter((s) => s.countryId === selectedCountryObj.id && s.status === "Active")
      .map((s) => ({ value: s.name, label: s.name }));
  }, [watchCountry]);

  const cityOptions = useMemo(() => {
    const selectedStateObj = getMasterStorage<any[]>("saiflow_master_states", STATES)
      .find((s) => s.name === watchState);
    if (!selectedStateObj) return [];
    return getMasterStorage<any[]>("saiflow_master_cities", CITIES)
      .filter((c) => c.stateId === selectedStateObj.id && c.status === "Active")
      .map((c) => ({ value: c.name, label: c.name }));
  }, [watchState]);

  const industryOptions = useMemo(() => {
    return getStorage("saiflow_master_industries", INDUSTRIES)
      .filter((x: any) => x.status === "Active")
      .map((x: any) => ({ value: x.name, label: x.name }));
  }, []);

  const designationOptions = useMemo(() => {
    return getStorage("saiflow_master_designations", DESIGNATIONS)
      .filter((x: any) => x.status === "Active")
      .map((x: any) => ({ value: x.name, label: x.name }));
  }, []);

  // Employee data from user management list
  const employeeOptions = useMemo(() => {
    return getStorage("saiflow_users", [
      { name: "John Doe", status: "Active" },
      { name: "Jane Smith", status: "Active" },
      { name: "Alice Johnson", status: "Active" },
      { name: "Robert Lee", status: "Active" },
    ])
      .filter((x: any) => x.status === "Active")
      .map((x: any) => ({ value: x.name, label: x.name }));
  }, []);

  useEffect(() => {
    const currentLeads = getStorage<Lead[]>("saiflow_leads", initialLeads);
    if (isEditMode) {
      const lead = currentLeads.find((l) => l.id === Number(id));
      if (lead) {
        reset({
          company: lead.company,
          contactPerson: lead.contactPerson,
          designation: lead.designation || "",
          phone: lead.phone.replace(/\D/g, "").slice(-10),
          alternatePhone: lead.alternatePhone || "",
          email: lead.email,
          alternateEmail: lead.alternateEmail || "",
          website: lead.website || "",
          industry: lead.industry || "",
          companyType: lead.companyType || "",
          addressLine1: lead.addressLine1 || lead.address || "",
          country: lead.country || "",
          state: lead.state || "",
          city: lead.city || "",
          pincode: lead.pincode || "",
          source: lead.source || "",
          priority: lead.priority || "Medium",
          assignedTo: lead.assignedTo || "",
          notes: lead.notes || "",
        });
      }
    }
    setLoading(false);
  }, [id, isEditMode, reset]);

  const handleSave = (data: LeadFormValues) => {
    const currentLeads = getStorage<Lead[]>("saiflow_leads", initialLeads);
    if (isEditMode) {
      const updated = currentLeads.map((l) =>
        l.id === Number(id)
          ? {
            ...l,
            company: data.company.trim(),
            contactPerson: data.contactPerson.trim(),
            designation: data.designation.trim(),
            phone: data.phone,
            alternatePhone: data.alternatePhone,
            email: data.email.trim(),
            alternateEmail: data.alternateEmail,
            website: data.website.trim(),
            industry: data.industry,
            companyType: data.companyType,
            addressLine1: data.addressLine1.trim(),
            address: data.addressLine1.trim(),
            country: data.country,
            state: data.state,
            city: data.city,
            pincode: data.pincode,
            source: data.source,
            status: (l.status || "New") as LeadStatus,
            priority: data.priority as LeadPriority,
            assignedTo: data.assignedTo,
            notes: data.notes.trim(),
            assignedDate: l.assignedDate || new Date().toISOString().split("T")[0],
          }
          : l
      );
      setStorage("saiflow_leads", updated);
      // Log update activity
      const leadLogs = getStorage<any[]>("saiflow_lead_logs", []);
      setStorage("saiflow_lead_logs", [...leadLogs, {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        leadId: Number(id),
        action: "lead_updated",
        description: `Lead for ${data.company.trim()} was updated. Assigned to ${data.assignedTo || "John Doe"}.`,
        timestamp: new Date().toISOString(),
        operator: data.assignedTo || "John Doe",
      }]);
      showToast("Lead updated successfully.", "success");
    } else {
      const nextId = currentLeads.length > 0 ? Math.max(...currentLeads.map((l) => l.id)) + 1 : 1;
      const newLead: Lead = {
        id: nextId,
        company: data.company.trim(),
        contactPerson: data.contactPerson.trim(),
        designation: data.designation.trim(),
        phone: data.phone,
        alternatePhone: data.alternatePhone,
        email: data.email.trim(),
        alternateEmail: data.alternateEmail,
        website: data.website.trim(),
        industry: data.industry,
        companyType: data.companyType,
        addressLine1: data.addressLine1.trim(),
        address: data.addressLine1.trim(),
        country: data.country,
        state: data.state,
        city: data.city,
        pincode: data.pincode,
        source: data.source,
        status: "New" as LeadStatus,
        priority: (data.priority || "Medium") as LeadPriority,
        assignedTo: data.assignedTo || "John Doe",
        assignedDate: new Date().toISOString().split("T")[0],
        notes: data.notes.trim(),
        createdAt: new Date().toISOString().split("T")[0],
      };
      setStorage("saiflow_leads", [...currentLeads, newLead]);
      // Log creation activity
      const leadLogs = getStorage<any[]>("saiflow_lead_logs", []);
      setStorage("saiflow_lead_logs", [...leadLogs, {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        leadId: nextId,
        action: "lead_created",
        description: `Lead created for ${data.company.trim()} by ${data.assignedTo || data.contactPerson || "John Doe"}.`,
        timestamp: new Date().toISOString(),
        operator: data.assignedTo || "John Doe",
      }]);
      showToast("Lead created successfully.", "success");
    }
    navigate("/leads");
  };

  const handleFormError = () => {
    showToast("Please fill all required fields correctly.", "error");
  };

  const handleCancel = () => {
    navigate("/leads");
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-500">Loading details...</div>;
  }

  return (
    <>
      <PageMeta
        title={isEditMode ? "Edit Lead | SaiFlow" : "Add Lead | SaiFlow"}
        description={isEditMode ? "Edit an existing lead in SaiFlow CRM." : "Add a new lead to SaiFlow CRM."}
      />
      <PageBreadcrumb pageTitle={isEditMode ? "Edit lead" : "Add lead"} />

      <form onSubmit={handleSubmit(handleSave, handleFormError)} className="space-y-10">
        {/* ═══════════════════ SECTION 1: Contact Information ═══════════════════ */}
        <div>
          <div className="flex items-center gap-4 mb-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-500 dark:text-brand-400">
              Contact Information
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-brand-500/30 to-transparent" />
          </div>
          <div className="grid grid-cols-1 gap-6">
            {/* Card 1: Lead Information */}
            <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-5">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/95 mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05]">
                Lead Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Company Name <span className="text-error-500">*</span>
                  </label>
                  <Controller
                    name="company"
                    control={control}
                    rules={{ required: "Company name is required" }}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="text"
                        placeholder="Enter company name"
                        error={!!errors.company}
                      />
                    )}
                  />
                  {errors.company && (
                    <span className="mt-1 text-xs text-error-600 block">
                      {errors.company.message}
                    </span>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Contact Person <span className="text-error-500">*</span>
                  </label>
                  <Controller
                    name="contactPerson"
                    control={control}
                    rules={{ required: "Contact person is required" }}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="text"
                        placeholder="Enter contact person"
                        error={!!errors.contactPerson}
                      />
                    )}
                  />
                  {errors.contactPerson && (
                    <span className="mt-1 text-xs text-error-600 block">
                      {errors.contactPerson.message}
                    </span>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Designation
                  </label>
                  <Controller
                    name="designation"
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <Select
                        options={designationOptions}
                        placeholder="Select designation"
                        onChange={onChange}
                        defaultValue={value}
                      />
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Contact Details */}
            <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-5">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/95 mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05]">
                Contact Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Mobile Number <span className="text-error-500">*</span>
                  </label>
                  <Controller
                    name="phone"
                    control={control}
                    rules={{
                      required: "Mobile number is required",
                      pattern: {
                        value: /^[6-9]\d{9}$/,
                        message: "Please enter a valid 10-digit mobile number",
                      },
                    }}
                    render={({ field: { value, onChange, ...rest } }) => (
                      <Input
                        {...rest}
                        value={value}
                        type="text"
                        placeholder="Enter 10-digit number"
                        maxLength={10}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "");
                          onChange(digits);
                        }}
                        error={!!errors.phone}
                      />
                    )}
                  />
                  {errors.phone && (
                    <span className="mt-1 text-xs text-error-600 block">{errors.phone.message}</span>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Alternate Mobile
                  </label>
                  <Controller
                    name="alternatePhone"
                    control={control}
                    render={({ field: { value, onChange, ...rest } }) => (
                      <Input
                        {...rest}
                        value={value}
                        type="text"
                        placeholder="Enter alternate number"
                        maxLength={15}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "");
                          onChange(digits);
                        }}
                      />
                    )}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email Address <span className="text-error-500">*</span>
                  </label>
                  <Controller
                    name="email"
                    control={control}
                    rules={{
                      required: "Email address is required",
                      pattern: {
                        value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                        message: "Please enter a valid email address",
                      },
                    }}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="email"
                        placeholder="example@company.com"
                        error={!!errors.email}
                      />
                    )}
                  />
                  {errors.email && (
                    <span className="mt-1 text-xs text-error-600 block">{errors.email.message}</span>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Alternate Email
                  </label>
                  <Controller
                    name="alternateEmail"
                    control={control}
                    rules={{
                      pattern: {
                        value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                        message: "Please enter a valid email address",
                      },
                    }}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="email"
                        placeholder="alt@company.com"
                        error={!!errors.alternateEmail}
                      />
                    )}
                  />
                  {errors.alternateEmail && (
                    <span className="mt-1 text-xs text-error-600 block">
                      {errors.alternateEmail.message}
                    </span>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Website <span className="text-error-500">*</span>
                  </label>
                  <Controller
                    name="website"
                    control={control}
                    rules={{ required: "Website is required" }}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="text"
                        placeholder="https://example.com"
                        error={!!errors.website}
                      />
                    )}
                  />
                  {errors.website && (
                    <span className="mt-1 text-xs text-error-600 block">
                      {errors.website.message}
                    </span>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ═══════════════════ SECTION 2: Company & Address ═══════════════════ */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection("companyAddress")}
            className="w-full flex items-center gap-4 mb-5 cursor-pointer group"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-500 dark:text-brand-400">
              Company & Address
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-brand-500/30 to-transparent" />
            <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expandedSections.companyAddress ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div className={`grid grid-cols-1 gap-6 overflow-hidden transition-all duration-300 ${expandedSections.companyAddress ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'} ${isEditMode ? 'max-h-[2000px] opacity-100' : ''}`}>
            {/* Card 3: Company Details */}
            <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-5">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/95 mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05]">
                Company Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Industry
                  </label>
                  <Controller
                    name="industry"
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <Select
                        options={industryOptions}
                        placeholder="Select industry"
                        onChange={onChange}
                        defaultValue={value}
                      />
                    )}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Company Type
                  </label>
                  <Controller
                    name="companyType"
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <Select
                        options={companyTypeOptions}
                        placeholder="Select company type"
                        onChange={onChange}
                        defaultValue={value}
                      />
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Card 4: Address */}
            <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-5">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/95 mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05]">
                Address
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Address Line <span className="text-error-500">*</span>
                  </label>
                  <Controller
                    name="addressLine1"
                    control={control}
                    rules={{ required: "Address line 1 is required" }}
                    render={({ field }) => (
                      <Input {...field} type="text" placeholder="Floor, block, street address" error={!!errors.addressLine1} />
                    )}
                  />
                  {errors.addressLine1 && (
                    <span className="mt-1 text-xs text-error-600 block">{errors.addressLine1.message}</span>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Country <span className="text-error-500">*</span>
                  </label>
                  <Controller
                    name="country"
                    control={control}
                    rules={{ required: "Country is required" }}
                    render={({ field: { value, onChange } }) => (
                      <Select
                        options={countryOptions}
                        placeholder="Select country"
                        onChange={(val) => {
                          onChange(val);
                          setValue("state", "");
                          setValue("city", "");
                        }}
                        defaultValue={value}
                      />
                    )}
                  />
                  {errors.country && (
                    <span className="mt-1 text-xs text-error-600 block">{errors.country.message}</span>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    State <span className="text-error-500">*</span>
                  </label>
                  <Controller
                    name="state"
                    control={control}
                    rules={{ required: "State is required" }}
                    render={({ field: { value, onChange } }) => (
                      <Select
                        options={stateOptions}
                        placeholder="Select state"
                        onChange={(val) => {
                          onChange(val);
                          setValue("city", "");
                        }}
                        defaultValue={value}
                      />
                    )}
                  />
                  {errors.state && (
                    <span className="mt-1 text-xs text-error-600 block">{errors.state.message}</span>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    City <span className="text-error-500">*</span>
                  </label>
                  <Controller
                    name="city"
                    control={control}
                    rules={{ required: "City is required" }}
                    render={({ field: { value, onChange } }) => (
                      <Select
                        options={cityOptions}
                        placeholder="Select city"
                        onChange={onChange}
                        defaultValue={value}
                      />
                    )}
                  />
                  {errors.city && (
                    <span className="mt-1 text-xs text-error-600 block">{errors.city.message}</span>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Pincode
                  </label>
                  <Controller
                    name="pincode"
                    control={control}
                    render={({ field }) => (
                      <Input {...field} type="text" placeholder="e.g. 560001" maxLength={8} />
                    )}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ═══════════════════ SECTION 3: Lead & Assignment ═══════════════════ */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection("leadAssignment")}
            className="w-full flex items-center gap-4 mb-5 cursor-pointer group"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-500 dark:text-brand-400">
              Lead & Assignment
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-brand-500/30 to-transparent" />
            <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${expandedSections.leadAssignment ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div className={`grid grid-cols-1 gap-6 overflow-hidden transition-all duration-300 ${expandedSections.leadAssignment ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'} ${isEditMode ? 'max-h-[2000px] opacity-100' : ''}`}>
            {/* Card 5: Lead Details */}
            <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-5">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/95 mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05]">
                Lead Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Lead Source <span className="text-error-500">*</span>
                  </label>
                  <Controller
                    name="source"
                    control={control}
                    rules={{ required: "Lead source is required" }}
                    render={({ field: { value, onChange } }) => (
                      <Select
                        options={sourceOptions}
                        placeholder="Select source"
                        onChange={onChange}
                        defaultValue={value}
                      />
                    )}
                  />
                  {errors.source && (
                    <span className="mt-1 text-xs text-error-600 block">{errors.source.message}</span>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Priority <span className="text-error-500">*</span>
                  </label>
                  <Controller
                    name="priority"
                    control={control}
                    rules={{ required: "Priority is required" }}
                    render={({ field: { value, onChange } }) => (
                      <Select
                        options={priorityOptions}
                        placeholder="Select priority"
                        onChange={onChange}
                        defaultValue={value}
                      />
                    )}
                  />
                  {errors.priority && (
                    <span className="mt-1 text-xs text-error-600 block">{errors.priority.message}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Card 6: Assignment */}
            <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-5">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/95 mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05]">
                Assignment
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Lead Owner <span className="text-error-500">*</span>
                  </label>
                  <Controller
                    name="assignedTo"
                    control={control}
                    rules={{ required: "Lead owner is required" }}
                    render={({ field: { value, onChange } }) => (
                      <Select
                        options={employeeOptions}
                        placeholder="Select lead owner"
                        onChange={onChange}
                        defaultValue={value}
                      />
                    )}
                  />
                  {errors.assignedTo && (
                    <span className="mt-1 text-xs text-error-600 block">{errors.assignedTo.message}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Card 7: Remarks / Notes */}
            <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-5">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white/95 mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05]">
                Remarks
              </h3>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Notes
                </label>
                <Controller
                  name="notes"
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <textarea
                      value={value || ""}
                      onChange={onChange}
                      placeholder="Enter any additional remarks or notes..."
                      className="w-full min-h-[100px] rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    />
                  )}
                />
              </div>
            </div>

          </div>
        </div>

        {/* ═══════════════════ FORM DIVIDER ═══════════════════ */}
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-brand-500/30 to-transparent" />
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button size="sm" type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button size="sm" type="submit">
            {isEditMode ? "Update" : "Save"}
          </Button>
        </div>
      </form>
    </>
  );
}
