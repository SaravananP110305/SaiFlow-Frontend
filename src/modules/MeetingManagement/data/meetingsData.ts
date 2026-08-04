export type MeetingStatus = "Scheduled" | "Completed" | "Cancelled" | "Rescheduled";

export interface Meeting {
  id: number;
  subject: string;
  company: string;
  contactPerson: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  type: string; // Google Meet, Zoom, Offline, etc. (Matches Platform / Type)
  linkOrLocation: string;
  status: MeetingStatus;
  notes: string;

  // Workflow fields
  summary?: string;
  rescheduledDate?: string;
  rescheduledTime?: string;
  completedDate?: string;
  cancelledDate?: string;

  // Form fields
  relatedToType?: "Lead" | "Client";
  relatedToId?: number;
  meetingPlatform?: string; // Google Meet, Zoom, Microsoft Teams, Office, Client Office
  startTime?: string;
  endTime?: string;
  duration?: string;
  meetingOwner?: string[]; // Employees (Multi-Select)
  clientContactPerson?: string;
  scopeNotes?: string;
  agenda?: string;
}

export const getMeetingStatusColor = (
  status: MeetingStatus
): "primary" | "success" | "warning" | "error" | "info" | "light" => {
  switch (status) {
    case "Completed":
      return "success";
    case "Scheduled":
      return "primary";
    case "Rescheduled":
      return "info";
    case "Cancelled":
      return "error";
    default:
      return "light";
  }
};

export const initialMeetings: Meeting[] = [
  {
    id: 1,
    subject: "Tech solutions - Google Meet",
    company: "Tech solutions",
    contactPerson: "Alice Smith",
    date: "2026-07-09",
    time: "10:30",
    type: "Google Meet",
    linkOrLocation: "https://meet.google.com/abc-defg-hij",
    status: "Scheduled",
    notes: "Go through company presentation slides and introduce standard modules. Client showed interest in the CRM dashboard and reporting features.",
    relatedToType: "Lead",
    relatedToId: 1,
    meetingPlatform: "Google Meet",
    startTime: "10:30",
    endTime: "11:00",
    duration: "30 mins",
    meetingOwner: ["John Doe"],
    clientContactPerson: "Alice Smith",
  },
  {
    id: 2,
    subject: "Innovate LLC - Google Meet",
    company: "Innovate LLC",
    contactPerson: "Bob Jones",
    date: "2026-07-09",
    time: "14:00",
    type: "Google Meet",
    linkOrLocation: "https://meet.google.com/xyz-pqrs-tuv",
    status: "Rescheduled",
    notes: "Postponed by client from morning to afternoon. Need to present pricing tiers.",
    relatedToType: "Lead",
    relatedToId: 2,
    meetingPlatform: "Google Meet",
    startTime: "14:00",
    endTime: "14:45",
    duration: "45 mins",
    meetingOwner: ["Jane Smith"],
    clientContactPerson: "Bob Jones",
    summary: "Client was not available in the morning, rescheduled to afternoon. Discussed pricing tiers for enterprise plan.",
    rescheduledDate: "2026-07-09",
    rescheduledTime: "14:00",
  },
  {
    id: 3,
    subject: "Apex digital - Google Meet",
    company: "Apex digital",
    contactPerson: "Charlie Brown",
    date: "2026-07-10",
    time: "11:00",
    type: "Google Meet",
    linkOrLocation: "https://meet.google.com/mno-lkiu-asd",
    status: "Scheduled",
    notes: "Present API integration flow and database schemas. Technical team will attend.",
    relatedToType: "Lead",
    relatedToId: 3,
    meetingPlatform: "Google Meet",
    startTime: "11:00",
    endTime: "12:00",
    duration: "60 mins",
    meetingOwner: ["John Doe"],
    clientContactPerson: "Charlie Brown",
  },
  {
    id: 4,
    subject: "Nextgen software - Microsoft Teams",
    company: "Nextgen software",
    contactPerson: "Diana Prince",
    date: "2026-07-18",
    time: "10:30",
    type: "Microsoft Teams",
    linkOrLocation: "https://teams.microsoft.com/meet/nextgen-abc123",
    status: "Scheduled",
    notes: "Kickoff meeting to finalize project roadmap and assign team responsibilities.",
    relatedToType: "Lead",
    relatedToId: 4,
    meetingPlatform: "Microsoft Teams",
    startTime: "10:30",
    endTime: "11:30",
    duration: "60 mins",
    meetingOwner: ["Jane Smith", "John Doe"],
    clientContactPerson: "Diana Prince",
  },
];
