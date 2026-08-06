import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useForm, Controller } from "react-hook-form";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import Select from "../../../components/form/Select";
import DatePicker from "../../../components/form/date-picker";
import { useToast } from "../../../hooks/useToast";
import { meetingService } from "../../../services/meetingService";
import { leadService } from "../../../services/leadService";
import { clientService } from "../../../services/clientService";
import { userService } from "../../../services/userService";
import { ChevronDownIcon } from "../../../icons";

interface MeetingFormValues {
  company: string;
  contactPerson: string;
  date: string;
  type: string;
  linkOrLocation: string;
  notes: string;

  relatedToType: "Lead" | "Client";
  relatedToId: number;
  meetingPlatform: string;
  startTime: string;
  endTime: string;
  meetingOwner: string[];
  clientContactPerson: string;
}

const EMPLOYEES = ["John Doe", "Jane Smith", "Alice Johnson", "Robert Lee"];

const MEETING_MODES = ["Offline", "Online"];

function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr || typeof timeStr !== "string") return null;
  const trimmed = timeStr.trim();
  if (!trimmed) return null;

  // Match 12-hour or 24-hour time string: e.g. "12:00 AM", "09:30 PM", "14:30", "9:00"
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3] ? match[3].toUpperCase() : null;

  if (isNaN(hours) || isNaN(minutes)) return null;

  if (period) {
    if (period === "PM" && hours < 12) {
      hours += 12;
    } else if (period === "AM" && hours === 12) {
      hours = 0;
    }
  }

  return hours * 60 + minutes;
}

function calculateDurationMinutes(start: string, end: string): number {
  if (!start || !end) return 0;
  const startMin = parseTimeToMinutes(start);
  const endMin = parseTimeToMinutes(end);
  if (startMin === null || endMin === null) return 0;
  const diff = endMin - startMin;
  return diff > 0 ? diff : 0;
}

// Normalize the picker's 12-hour "h:mm AM/PM" (or 24-hour "HH:MM") value
// into canonical 24-hour "HH:MM" so `new Date()` parses it correctly.
function to24HourTime(timeStr: string): string {
  if (!timeStr) return "";
  const mins = parseTimeToMinutes(timeStr);
  if (mins === null) return timeStr.trim();
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const getLocalDateString = (isoString: string) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getMeetingType = (link: string | null | undefined) => {
  if (!link) return "Offline";
  const trimmed = link.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    if (/meet\.google\.com/i.test(trimmed)) return "Google Meet";
    if (/zoom\.us/i.test(trimmed)) return "Zoom";
    if (/teams\.(microsoft|live)\.com/i.test(trimmed)) return "Microsoft Teams";
    return "Online";
  }
  return "Offline";
};

const getEndTime = (scheduledAt: string, durationMinutes: number) => {
  if (!scheduledAt) return "";
  const start = new Date(scheduledAt);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};

export default function MeetingForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEditMode = !!id;
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);

  const [rawLeads, setRawLeads] = useState<any[]>([]);
  const [rawClients, setRawClients] = useState<any[]>([]);
  const [employees, setEmployees] = useState<string[]>([]);

  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const [leadsData, clientsData, usersData] = await Promise.all([
          leadService.getLeads({ limit: 100 }),
          clientService.getClients(),
          userService.getUsers({ limit: 100 }).catch((err) => {
            console.warn("Failed to fetch users list (likely permission restricted):", err);
            return { data: [] };
          })
        ]);
        if (leadsData && Array.isArray(leadsData.data)) {
          setRawLeads(leadsData.data.map((l: any) => ({
            ...l,
            company: l.title || l.company || "",
            contactPerson: l.contactPerson || ""
          })));
        }
        if (clientsData && Array.isArray(clientsData.data)) {
          setRawClients(clientsData.data.map((c: any) => ({
            ...c,
            company: c.company?.name || c.company || "",
            name: c.contactName || c.name || ""
          })));
        }
        if (usersData && Array.isArray(usersData.data)) {
          // Only ACTIVE users (excluding the System Administrator account) are
          // eligible meeting owners, matching the app's other user pickers.
          setEmployees(
            usersData.data
              .filter((u: any) => u.status === "ACTIVE" && u.name !== "System Administrator")
              .map((u: any) => u.name)
          );
        }
      } catch (err) {
        console.error("Failed to load meetings dropdowns", err);
      }
    };
    loadDropdownData();
  }, []);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<MeetingFormValues>({
    defaultValues: {
      company: "",
      contactPerson: "",
      date: "",
      type: "Online",
      linkOrLocation: "",
      notes: "",
      relatedToType: "Lead",
      relatedToId: 0,
      meetingPlatform: "Online",
      startTime: "",
      endTime: "",
      meetingOwner: [],
      clientContactPerson: "",
    },
  });

  const relatedToType = watch("relatedToType");
  const relatedToId = watch("relatedToId");
  const meetingPlatform = watch("meetingPlatform");
  const currentMeetingOwner = watch("meetingOwner") || [];

  // Only Qualified leads are offered in the Lead dropdown; the currently
  // selected lead stays visible in Edit mode even if its status changed later.
  const leads = rawLeads.filter(
    (l: any) => (l.status || "").toUpperCase() === "QUALIFIED" || l.id === Number(relatedToId)
  );
  const clients = rawClients;

  // Employee Multi-Select Dropdown state
  const [isOwnerDropdownOpen, setIsOwnerDropdownOpen] = useState(false);
  const [ownerSearch, setOwnerSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOwnerDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const loadMeeting = async () => {
      if (isEditMode && id) {
        setLoading(true);
        try {
          const meeting = await meetingService.getMeetingById(Number(id));
          if (meeting) {
            reset({
              company: meeting.lead?.company?.name || meeting.lead?.title || "",
              contactPerson: meeting.lead?.contactPerson || "",
              date: meeting.scheduledAt ? getLocalDateString(meeting.scheduledAt) : "",
              type: getMeetingType(meeting.meetingLink),
              linkOrLocation: meeting.meetingLink || "",
              notes: meeting.agenda || "",
              relatedToType: "Lead",
              relatedToId: meeting.leadId,
              // Backend doesn't persist the mode; infer it from the saved link.
              meetingPlatform: meeting.meetingLink && /^https?:\/\//i.test(meeting.meetingLink) ? "Online" : "Offline",
              startTime: meeting.scheduledAt ? new Date(meeting.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : "",
              endTime: meeting.scheduledAt ? getEndTime(meeting.scheduledAt, meeting.durationMinutes || 30) : "",
              meetingOwner: meeting.createdBy ? [meeting.createdBy.name] : [],
              clientContactPerson: meeting.lead?.contactPerson || "",
            });
          }
        } catch (err) {
          console.error(err);
          showToast("Failed to load meeting details.", "error");
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    loadMeeting();
  }, [id, isEditMode, reset]);

  useEffect(() => {
    if (!isEditMode && rawLeads.length > 0) {
      const qRelatedType = searchParams.get("relatedType") as "Lead" | "Client";
      const qRelatedId = searchParams.get("relatedId");

      if (qRelatedType && qRelatedId) {
        const idNum = Number(qRelatedId);
        setValue("relatedToType", qRelatedType);
        setValue("relatedToId", idNum);

        if (qRelatedType === "Lead") {
          const lead = rawLeads.find((l) => l.id === idNum);
          if (lead) {
            setValue("company", lead.company);
            setValue("contactPerson", lead.contactPerson);
            setValue("clientContactPerson", lead.contactPerson);
          }
        } else {
          const client = rawClients.find((c) => c.id === idNum);
          if (client) {
            setValue("company", client.company);
            setValue("contactPerson", client.name);
            setValue("clientContactPerson", client.name);
          }
        }
      }
    }
  }, [isEditMode, searchParams, rawLeads, rawClients, setValue]);

  // Handle Related To selection change
  const handleRelatedChange = (typeVal: "Lead" | "Client", idVal: number) => {
    setValue("relatedToId", idVal);
    if (typeVal === "Lead") {
      const lead = leads.find((l) => l.id === idVal);
      if (lead) {
        setValue("company", lead.company);
        setValue("contactPerson", lead.contactPerson);
        setValue("clientContactPerson", lead.contactPerson);
      } else {
        setValue("company", "");
        setValue("contactPerson", "");
        setValue("clientContactPerson", "");
      }
    } else {
      const client = clients.find((c) => c.id === idVal);
      if (client) {
        setValue("company", client.company);
        setValue("contactPerson", client.name);
        setValue("clientContactPerson", client.name);
      } else {
        setValue("company", "");
        setValue("contactPerson", "");
        setValue("clientContactPerson", "");
      }
    }
  };

  const handleSave = async (data: MeetingFormValues) => {
    try {
      let leadId = Number(data.relatedToId);
      if (data.relatedToType === "Client") {
        const matchedClient = rawClients.find(c => c.id === leadId);
        if (matchedClient && matchedClient.leadId) {
          leadId = matchedClient.leadId;
        } else {
          leadId = rawLeads[0]?.id || 1;
        }
      }

      const start24 = to24HourTime(data.startTime) || "09:00";
      const scheduledAt = new Date(`${data.date}T${start24}`);

      const payload = {
        leadId,
        title: `${data.company} - ${data.meetingPlatform}`,
        scheduledAt: scheduledAt.toISOString(),
        durationMinutes: calculateDurationMinutes(data.startTime, data.endTime) || 30,
        meetingLink: data.linkOrLocation,
        status: "SCHEDULED",
        agenda: data.notes,
        scopeNotes: ""
      };

      if (isEditMode) {
        await meetingService.updateMeeting(Number(id), payload);
        showToast("Meeting updated successfully.", "success");
      } else {
        await meetingService.createMeeting(payload);
        showToast("Meeting scheduled successfully.", "success");
      }
      navigate("/meetings");
    } catch (err) {
      console.error("Failed to save meeting:", err);
      showToast("Failed to save meeting.", "error");
    }
  };

  const handleError = () => {
    showToast("Please fill all required fields.", "error");
  };

  const toggleOwner = (owner: string) => {
    const index = currentMeetingOwner.indexOf(owner);
    const newOwners = [...currentMeetingOwner];
    if (index === -1) {
      newOwners.push(owner);
    } else {
      newOwners.splice(index, 1);
    }
    setValue("meetingOwner", newOwners);
  };

  const filteredEmployees = (employees.length > 0 ? employees : EMPLOYEES).filter((emp) =>
    emp.toLowerCase().includes(ownerSearch.toLowerCase())
  );

  const handleCancel = () => {
    navigate(-1);
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-500">Loading Meeting Details...</div>;
  }

  const isLockRelated = searchParams.get("relatedType") && searchParams.get("relatedId");

  return (
    <>
      <PageMeta
        title={`${isEditMode ? "Edit Meeting" : "Schedule Meeting"} | SaiFlow`}
        description="Schedule or edit a meeting in SaiFlow CRM."
      />
      <PageBreadcrumb pageTitle={isEditMode ? "Edit Meeting" : "Schedule Meeting"} />

      <form
        onSubmit={handleSubmit(handleSave, handleError)}
        className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-6 space-y-6"
      >
        {/* Section 1: Lead */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05]">
            Lead
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                Meeting ID
              </label>
              <Input
                type="text"
                disabled={true}
                value={isEditMode ? `SF-MTG-${String(id).padStart(4, "0")}` : "Auto-generated"}
                className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                Lead <span className="text-error-500">*</span>
              </label>
              <Controller
                name="relatedToId"
                control={control}
                rules={{ required: true, min: { value: 1, message: "Please select a lead" } }}
                render={({ field: { value } }) => (
                  <Select
                    disabled={!!isLockRelated}
                    options={
                      relatedToType === "Lead"
                        ? leads.map((l) => ({ value: l.id.toString(), label: `${l.company} (${l.contactPerson})` }))
                        : clients.map((c) => ({ value: c.id.toString(), label: `${c.company} (${c.name})` }))
                    }
                    placeholder="Select Lead"
                    defaultValue={value ? value.toString() : ""}
                    onChange={(val) => handleRelatedChange(relatedToType, Number(val))}
                  />
                )}
              />
              {errors.relatedToId && (
                <span className="mt-1.5 text-xs text-error-600 block">Selection is required.</span>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Schedule */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05]">
            Schedule
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Controller
                name="date"
                control={control}
                rules={{ required: "Date is required" }}
                render={({ field: { onChange, value } }) => (
                  <DatePicker
                    id="meeting-date-picker"
                    label="Meeting Date"
                    placeholder="Select Meeting Date"
                    defaultDate={value}
                    onChange={(_, dateStr) => onChange(dateStr)}
                    required={true}
                  />
                )}
              />
              {errors.date && (
                <span className="mt-1.5 text-xs text-error-600 block">{errors.date.message}</span>
              )}
            </div>

            <div>
              <Controller
                name="startTime"
                control={control}
                rules={{ required: "Start time is required" }}
                render={({ field: { value, onChange } }) => (
                  <DatePicker
                    id="meeting-start-time"
                    mode="time"
                    label="Start Time"
                    required={true}
                    defaultDate={value}
                    onChange={(_, timeStr) => onChange(timeStr)}
                  />
                )}
              />
              {errors.startTime && (
                <span className="mt-1.5 text-xs text-error-600 block">{errors.startTime.message}</span>
              )}
            </div>

            <div>
              <Controller
                name="endTime"
                control={control}
                rules={{ required: "End time is required" }}
                render={({ field: { value, onChange } }) => (
                  <DatePicker
                    id="meeting-end-time"
                    mode="time"
                    label="End Time"
                    required={true}
                    defaultDate={value}
                    onChange={(_, timeStr) => onChange(timeStr)}
                  />
                )}
              />
              {errors.endTime && (
                <span className="mt-1.5 text-xs text-error-600 block">{errors.endTime.message}</span>
              )}
            </div>

          </div>
        </div>

        {/* Section 3: Participants */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05]">
            Participants
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Multi-select Meeting Owner */}
            <div className="relative" ref={dropdownRef}>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                Meeting Owner
              </label>
              <div
                onClick={() => setIsOwnerDropdownOpen(!isOwnerDropdownOpen)}
                className="min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 flex flex-wrap gap-1 items-center justify-between cursor-pointer"
              >
                <div className="flex flex-wrap gap-1">
                  {currentMeetingOwner.length > 0 ? (
                    currentMeetingOwner.map((owner) => (
                      <span
                        key={owner}
                        className="inline-flex items-center rounded-md bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                      >
                        {owner}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-450 dark:text-gray-500 text-xs">Select Employees...</span>
                  )}
                </div>
                <ChevronDownIcon className="w-4 h-4 text-gray-500 shrink-0" />
              </div>

              {isOwnerDropdownOpen && (
                <div className="absolute left-0 z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-905 bg-white dark:bg-gray-900">
                  <input
                    type="text"
                    placeholder="Search"
                    value={ownerSearch}
                    onChange={(e) => setOwnerSearch(e.target.value)}
                    className="w-full rounded-md border border-gray-200 bg-transparent px-3 py-2 text-xs text-gray-800 dark:border-gray-700 dark:text-white mb-2 focus:outline-none focus:border-brand-500"
                  />
                  <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
                    {filteredEmployees.map((emp) => {
                      const isChecked = currentMeetingOwner.includes(emp);
                      return (
                        <div
                          key={emp}
                          onClick={() => toggleOwner(emp)}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            readOnly
                            className="h-3.5 w-3.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                          />
                          <span className="text-gray-700 dark:text-gray-300">{emp}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                Client Contact Person
              </label>
              <Controller
                name="clientContactPerson"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="text"
                    placeholder="Contact Person Name"
                  />
                )}
              />
            </div>
          </div>
        </div>

        {/* Section 4: Meeting Mode */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05]">
            Meeting Mode
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                Meeting Mode <span className="text-error-500">*</span>
              </label>
              <Controller
                name="meetingPlatform"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Select
                    options={MEETING_MODES.map((p) => ({ value: p, label: p }))}
                    placeholder="Select Mode"
                    defaultValue={value}
                    onChange={(val) => {
                      onChange(val);
                      setValue("linkOrLocation", "");
                    }}
                  />
                )}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                {meetingPlatform === "Offline" ? "Venue / Location Address" : "Meeting Link"}{" "}
                <span className="text-error-500">*</span>
              </label>
              <Controller
                name="linkOrLocation"
                control={control}
                rules={{
                  required: "Link / Location is required",
                  validate: (val) => {
                    const isOnline = meetingPlatform !== "Offline";
                    if (isOnline) {
                      const urlPattern =
                        /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/;
                      return urlPattern.test(val) || "Please enter a valid URL";
                    }
                    return val.trim().length >= 5 || "Location must be at least 5 characters";
                  },
                }}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="text"
                    placeholder={
                      meetingPlatform === "Offline"
                        ? "Enter Office Address"
                        : "Enter Meeting URL"
                    }
                    error={!!errors.linkOrLocation}
                  />
                )}
              />
              {errors.linkOrLocation && (
                <span className="mt-1.5 text-xs text-error-600 block">{errors.linkOrLocation.message}</span>
              )}
            </div>
          </div>
        </div>

        {/* Section 5: Notes */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05]">
            Notes
          </h3>
          <div>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <textarea
                  {...field}
                  rows={3}
                  placeholder="Add any meeting notes or agenda details..."
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 shadow-theme-xs focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
              )}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/[0.05]">
          <Button size="sm" type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button size="sm" type="submit">
            Save Meeting
          </Button>
        </div>
      </form>
    </>
  );
}
