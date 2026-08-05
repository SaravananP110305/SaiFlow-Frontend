import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useForm, Controller } from "react-hook-form";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import Select from "../../../components/form/Select";
import { useToast } from "../../../hooks/useToast";
import { useAuth } from "../../../context/AuthContext";
import { leadService } from "../../../services/leadService";
import { masterService } from "../../../services/masterService";
import { userService } from "../../../services/userService";
import api from "../../../services/api";

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
  const { hasPermission } = useAuth();
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

  // ── Backend API states ──────────────────────────────────────
  const [sources, setSources] = useState<any[]>([]);
  const [priorities, setPriorities] = useState<any[]>([]);
  const [countriesList, setCountriesList] = useState<any[]>([]);
  const [statesList, setStatesList] = useState<any[]>([]);
  const [citiesList, setCitiesList] = useState<any[]>([]);
  const [industriesList, setIndustriesList] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Derived options arrays
  const [sourceOptions, setSourceOptions] = useState<{ value: string; label: string }[]>([]);
  const [priorityOptions, setPriorityOptions] = useState<{ value: string; label: string }[]>([]);
  const [companyTypeOptions, setCompanyTypeOptions] = useState<{ value: string; label: string }[]>([]);
  const [countryOptions, setCountryOptions] = useState<{ value: string; label: string }[]>([]);
  const [stateOptions, setStateOptions] = useState<{ value: string; label: string }[]>([]);
  const [cityOptions, setCityOptions] = useState<{ value: string; label: string }[]>([]);
  const [industryOptions, setIndustryOptions] = useState<{ value: string; label: string }[]>([]);
  const [designationOptions, setDesignationOptions] = useState<{ value: string; label: string }[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const [sourcesData, prioritiesData, compTypesData, countriesData, industriesData, designationsData, usersData] = await Promise.all([
          masterService.getMasterItems("LEAD_SOURCE"),
          masterService.getMasterItems("PRIORITY"),
          masterService.getMasterItems("COMPANY_TYPE"),
          masterService.getMasterItems("COUNTRY"),
          masterService.getMasterItems("INDUSTRY"),
          masterService.getMasterItems("DESIGNATION"),
          userService.getUsers()
        ]);

        // Keep full raw lists so existing records that reference an inactive
        // master item can still resolve during Edit mode; only expose ACTIVE
        // records as selectable dropdown options.
        setSources(sourcesData);
        setPriorities(prioritiesData);
        setCountriesList(countriesData);
        setIndustriesList(industriesData);
        // userService.getUsers() returns the full response object; extract the data array
        const usersList = usersData?.data || [];
        setUsers(usersList);

        const activeOnly = (items: any[]) => (items || []).filter((x: any) => x.status === "Active");
        setSourceOptions(activeOnly(sourcesData).map((x: any) => ({ value: x.name, label: x.name })));
        setPriorityOptions(activeOnly(prioritiesData).map((x: any) => ({ value: x.name, label: x.name })));
        setCompanyTypeOptions(activeOnly(compTypesData).map((x: any) => ({ value: x.name, label: x.name })));
        setCountryOptions(activeOnly(countriesData).map((x: any) => ({ value: x.name, label: x.name })));
        setIndustryOptions(activeOnly(industriesData).map((x: any) => ({ value: x.name, label: x.name })));
        setDesignationOptions(activeOnly(designationsData).map((x: any) => ({ value: x.name, label: x.name })));
        // Show only ACTIVE users, excluding the System Administrator account.
        setEmployeeOptions(
          usersList
            .filter(
              (x: any) =>
                x.status === "ACTIVE" &&
                x.name !== "System Administrator" &&
                x.role?.name !== "System Administrator"
            )
            .map((x: any) => ({ value: x.name, label: x.name }))
        );
      } catch (err) {
        console.error("Failed to load drop-down lists", err);
      }
    };
    loadDropdownData();
  }, []);

  useEffect(() => {
    const loadStates = async () => {
      if (!watchCountry) {
        setStateOptions([]);
        return;
      }
      const selectedCountryObj = countriesList.find((c) => c.name === watchCountry);
      if (!selectedCountryObj) return;
      try {
        const states = await masterService.getMasterItems("STATE", selectedCountryObj.id);
        // Keep the full list for cascade resolution, show only ACTIVE states.
        setStatesList(states);
        setStateOptions(states.filter((s: any) => s.status === "Active").map((s: any) => ({ value: s.name, label: s.name })));
      } catch (err) {
        console.error("Failed to load states", err);
      }
    };
    loadStates();
  }, [watchCountry, countriesList]);

  useEffect(() => {
    const loadCities = async () => {
      if (!watchState) {
        setCityOptions([]);
        return;
      }
      const selectedStateObj = statesList.find((s) => s.name === watchState);
      if (!selectedStateObj) return;
      try {
        const cities = await masterService.getMasterItems("CITY", selectedStateObj.id);
        setCitiesList(cities);
        setCityOptions(cities.filter((c: any) => c.status === "Active").map((c: any) => ({ value: c.name, label: c.name })));
      } catch (err) {
        console.error("Failed to load cities", err);
      }
    };
    loadCities();
  }, [watchState, statesList]);

  useEffect(() => {
    const loadLead = async () => {
      setLoading(true);
      try {
        if (isEditMode && id) {
          const lead = await leadService.getLeadById(Number(id));
          if (lead) {
            reset({
              company: lead.company?.name || lead.title || "",
              contactPerson: lead.contactPerson || "",
              designation: lead.designation || "",
              phone: lead.phone ? lead.phone.replace(/\D/g, "").slice(-10) : "",
              alternatePhone: lead.alternatePhone || "",
              email: lead.email || "",
              alternateEmail: lead.alternateEmail || "",
              website: lead.company?.website || "",
              industry: lead.company?.industry?.name || "",
              companyType: lead.company?.companyType || "",
              addressLine1: lead.company?.address || "",
              country: lead.company?.country?.name || "",
              state: lead.company?.state?.name || "",
              city: lead.company?.city?.name || "",
              pincode: lead.company?.pincode || "",
              source: lead.source?.name || lead.source || "",
              priority: lead.priority?.name || lead.priority || "Medium",
              assignedTo: lead.assignedTo?.name || "",
              notes: lead.notes || "",
            });
          }
        }
      } catch (err) {
        showToast("Failed to load lead details.", "error");
      } finally {
        setLoading(false);
      }
    };
    loadLead();
  }, [id, isEditMode, reset]);

  const handleSave = async (data: LeadFormValues) => {
    try {
      // 1. Resolve company (create or update with full enrichment)
      const companyData = {
        name: data.company.trim(),
        website: data.website.trim() || null,
        address: data.addressLine1.trim() || null,
        pincode: data.pincode.trim() || null,
        companyType: data.companyType.trim() || null,
        industryId: industriesList.find((i) => i.name === data.industry)?.id ?? null,
        countryId: countriesList.find((c) => c.name === data.country)?.id ?? null,
        stateId: statesList.find((s) => s.name === data.state)?.id ?? null,
        cityId: citiesList.find((c) => c.name === data.city)?.id ?? null
      };

      let companyId: number | null = null;
      const searchRes = await api.get('/companies', { params: { search: data.company.trim() } });
      const existingCompany = searchRes.data?.data?.find(
        (c: any) => c.name.toLowerCase() === data.company.trim().toLowerCase()
      );

      if (existingCompany) {
        if (!hasPermission('companies', 'edit')) {
          showToast("You don't have permission to update company details.", "error");
          return;
        }
        await api.put(`/companies/${existingCompany.id}`, companyData);
        companyId = existingCompany.id;
      } else {
        if (!hasPermission('companies', 'create')) {
          showToast("You don't have permission to create companies. Contact your admin.", "error");
          return;
        }
        const newCompany = await api.post('/companies', companyData);
        companyId = newCompany.data?.data?.id;
      }

      // 2. Resolve relational IDs
      const selectedSource = sources.find((s) => s.name === data.source);
      const sourceId = selectedSource ? selectedSource.id : null;

      const selectedPriority = priorities.find((p) => p.name === data.priority);
      const priorityId = selectedPriority ? selectedPriority.id : null;

      const selectedUser = users.find((u) => u.name === data.assignedTo);
      const assignedToId = selectedUser ? selectedUser.id : null;

      const payload = {
        title: data.company.trim(),
        contactPerson: data.contactPerson.trim(),
        designation: data.designation.trim(),
        email: data.email.trim(),
        phone: data.phone,
        alternatePhone: data.alternatePhone,
        alternateEmail: data.alternateEmail,
        companyId,
        sourceId,
        priorityId,
        assignedToId,
        requirements: data.notes.trim()
      };

      if (isEditMode) {
        await leadService.updateLead(Number(id), payload);
        showToast("Lead updated successfully.", "success");
      } else {
        await leadService.createLead(payload);
        showToast("Lead created successfully.", "success");
      }
      navigate("/leads");
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to save lead.", "error");
    }
  };

  const handleFormError = () => {
    showToast("Please fill all required fields correctly.", "error");
  };

  const handleCancel = () => {
    navigate("/leads");
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-500">Loading Details...</div>;
  }

  return (
    <>
      <PageMeta
        title={isEditMode ? "Edit Lead | SaiFlow" : "Add Lead | SaiFlow"}
        description={isEditMode ? "Edit an existing lead in SaiFlow CRM." : "Add a new lead to SaiFlow CRM."}
      />
      <PageBreadcrumb pageTitle={isEditMode ? "Edit Lead" : "Add Lead"} />

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
                        placeholder="Enter Company Name"
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
                        placeholder="Enter Contact Person"
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
                        placeholder="Select Designation"
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
                        placeholder="Enter 10-Digit Number"
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
                    rules={{
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
                        placeholder="Enter Alternate Number"
                        maxLength={10}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "");
                          onChange(digits);
                        }}
                        error={!!errors.alternatePhone}
                      />
                    )}
                  />
                  {errors.alternatePhone && (
                    <span className="mt-1 text-xs text-error-600 block">
                      {errors.alternatePhone.message}
                    </span>
                  )}
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
                        placeholder="Select Industry"
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
                        placeholder="Select Company Type"
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
                    Address Line
                  </label>
                  <Controller
                    name="addressLine1"
                    control={control}
                    render={({ field }) => (
                      <Input {...field} type="text" placeholder="Floor, Block, Street Address" error={!!errors.addressLine1} />
                    )}
                  />
                  {errors.addressLine1 && (
                    <span className="mt-1 text-xs text-error-600 block">{errors.addressLine1.message}</span>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Country
                  </label>
                  <Controller
                    name="country"
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <Select
                        options={countryOptions}
                        placeholder="Select Country"
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
                    State
                  </label>
                  <Controller
                    name="state"
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <Select
                        options={stateOptions}
                        placeholder="Select State"
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
                    City
                  </label>
                  <Controller
                    name="city"
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <Select
                        options={cityOptions}
                        placeholder="Select City"
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
                        placeholder="Select Source"
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
                        placeholder="Select Priority"
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
                        placeholder="Select Lead Owner"
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
                      placeholder="Enter Any Additional Remarks or Notes..."
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
