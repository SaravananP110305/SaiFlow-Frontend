import { MasterItem } from "../pages/MasterConfigPage";

// Extend MasterItem to include parent foreign key support
export interface MasterItemMapped extends MasterItem {
  countryId?: number;
  stateId?: number;
  departmentId?: number;
}

export const LEAD_SOURCES: MasterItem[] = [
  { id: 1, name: "Website", status: "Active" },
  { id: 2, name: "Referral", status: "Active" },
  { id: 3, name: "Cold Call", status: "Active" },
  { id: 4, name: "LinkedIn", status: "Active" },
  { id: 5, name: "Email Campaign", status: "Inactive" },
  { id: 6, name: "Trade Show", status: "Active" },
];

export const INDUSTRIES: MasterItem[] = [
  { id: 1, name: "Information Technology", status: "Active" },
  { id: 2, name: "Healthcare", status: "Active" },
  { id: 3, name: "Finance", status: "Active" },
  { id: 4, name: "Manufacturing", status: "Active" },
  { id: 5, name: "Retail", status: "Active" },
  { id: 6, name: "Education", status: "Inactive" },
];

export const COUNTRIES: MasterItem[] = [
  { id: 1, name: "India", status: "Active" },
  { id: 2, name: "United States", status: "Active" },
  { id: 3, name: "United Kingdom", status: "Active" },
  { id: 4, name: "Canada", status: "Active" },
  { id: 5, name: "Australia", status: "Active" },
  { id: 6, name: "Germany", status: "Active" },
  { id: 7, name: "France", status: "Active" },
  { id: 8, name: "Japan", status: "Active" },
  { id: 9, name: "Singapore", status: "Active" },
  { id: 10, name: "United Arab Emirates", status: "Active" },
  { id: 11, name: "Brazil", status: "Active" },
  { id: 12, name: "South Korea", status: "Active" },
  { id: 13, name: "Netherlands", status: "Active" },
  { id: 14, name: "Switzerland", status: "Active" },
  { id: 15, name: "Sweden", status: "Active" }
];

export const STATES: MasterItemMapped[] = [
  // India (countryId: 1)
  { id: 1, name: "Karnataka", countryId: 1, status: "Active" },
  { id: 4, name: "Maharashtra", countryId: 1, status: "Active" },
  { id: 6, name: "Tamil Nadu", countryId: 1, status: "Active" },
  { id: 7, name: "Telangana", countryId: 1, status: "Active" },
  { id: 8, name: "Gujarat", countryId: 1, status: "Active" },
  { id: 9, name: "Rajasthan", countryId: 1, status: "Active" },
  { id: 10, name: "Delhi", countryId: 1, status: "Active" },
  { id: 11, name: "Uttar Pradesh", countryId: 1, status: "Active" },

  // United States (countryId: 2)
  { id: 2, name: "New York", countryId: 2, status: "Active" },
  { id: 3, name: "California", countryId: 2, status: "Active" },
  { id: 12, name: "Texas", countryId: 2, status: "Active" },
  { id: 13, name: "Florida", countryId: 2, status: "Active" },
  { id: 14, name: "Illinois", countryId: 2, status: "Active" },
  { id: 15, name: "Washington", countryId: 2, status: "Active" },
  { id: 16, name: "Massachusetts", countryId: 2, status: "Active" },

  // United Kingdom (countryId: 3)
  { id: 17, name: "England", countryId: 3, status: "Active" },
  { id: 18, name: "Scotland", countryId: 3, status: "Active" },
  { id: 19, name: "Wales", countryId: 3, status: "Active" },

  // Canada (countryId: 4)
  { id: 5, name: "Ontario", countryId: 4, status: "Active" },
  { id: 20, name: "British Columbia", countryId: 4, status: "Active" },
  { id: 21, name: "Quebec", countryId: 4, status: "Active" },
  { id: 22, name: "Alberta", countryId: 4, status: "Active" },

  // Australia (countryId: 5)
  { id: 23, name: "New South Wales", countryId: 5, status: "Active" },
  { id: 24, name: "Victoria", countryId: 5, status: "Active" },
  { id: 25, name: "Queensland", countryId: 5, status: "Active" },

  // Germany (countryId: 6)
  { id: 26, name: "Bavaria", countryId: 6, status: "Active" },
  { id: 27, name: "North Rhine-Westphalia", countryId: 6, status: "Active" },
  { id: 28, name: "Berlin", countryId: 6, status: "Active" },

  // France (countryId: 7)
  { id: 29, name: "Île-de-France", countryId: 7, status: "Active" },
  { id: 30, name: "Provence-Alpes-Côte d'Azur", countryId: 7, status: "Active" },

  // Japan (countryId: 8)
  { id: 31, name: "Tokyo", countryId: 8, status: "Active" },
  { id: 32, name: "Osaka", countryId: 8, status: "Active" },

  // Singapore (countryId: 9)
  { id: 33, name: "Singapore", countryId: 9, status: "Active" },

  // UAE (countryId: 10)
  { id: 34, name: "Dubai", countryId: 10, status: "Active" },
  { id: 35, name: "Abu Dhabi", countryId: 10, status: "Active" },

  // Brazil (countryId: 11)
  { id: 36, name: "São Paulo", countryId: 11, status: "Active" },
  { id: 37, name: "Rio de Janeiro", countryId: 11, status: "Active" },

  // South Korea (countryId: 12)
  { id: 38, name: "Seoul", countryId: 12, status: "Active" },

  // Netherlands (countryId: 13)
  { id: 39, name: "North Holland", countryId: 13, status: "Active" },

  // Switzerland (countryId: 14)
  { id: 40, name: "Zürich", countryId: 14, status: "Active" },
  { id: 41, name: "Geneva", countryId: 14, status: "Active" },

  // Sweden (countryId: 15)
  { id: 42, name: "Stockholm", countryId: 15, status: "Active" },
];

export const CITIES: MasterItemMapped[] = [
  // India → Karnataka (stateId: 1)
  { id: 1, name: "Bangalore", stateId: 1, status: "Active" },
  { id: 36, name: "Mysore", stateId: 1, status: "Active" },
  { id: 37, name: "Hubli", stateId: 1, status: "Active" },

  // India → Maharashtra (stateId: 4)
  { id: 2, name: "Mumbai", stateId: 4, status: "Active" },
  { id: 38, name: "Pune", stateId: 4, status: "Active" },
  { id: 39, name: "Nagpur", stateId: 4, status: "Active" },

  // India → Tamil Nadu (stateId: 6)
  { id: 40, name: "Chennai", stateId: 6, status: "Active" },
  { id: 41, name: "Coimbatore", stateId: 6, status: "Active" },
  { id: 107, name: "Madurai", stateId: 6, status: "Active" },
  { id: 108, name: "Tiruchirappalli", stateId: 6, status: "Active" },
  { id: 109, name: "Salem", stateId: 6, status: "Active" },
  { id: 110, name: "Tirunelveli", stateId: 6, status: "Active" },
  { id: 111, name: "Vellore", stateId: 6, status: "Active" },
  { id: 112, name: "Erode", stateId: 6, status: "Active" },
  { id: 113, name: "Thoothukkudi", stateId: 6, status: "Active" },
  { id: 114, name: "Dindigul", stateId: 6, status: "Active" },
  { id: 115, name: "Thanjavur", stateId: 6, status: "Active" },
  { id: 116, name: "Ranipet", stateId: 6, status: "Active" },
  { id: 117, name: "Sivakasi", stateId: 6, status: "Active" },
  { id: 118, name: "Karaikudi", stateId: 6, status: "Active" },
  { id: 119, name: "Hosur", stateId: 6, status: "Active" },
  { id: 120, name: "Nagercoil", stateId: 6, status: "Active" },
  { id: 121, name: "Kanchipuram", stateId: 6, status: "Active" },
  { id: 122, name: "Kumbakonam", stateId: 6, status: "Active" },
  { id: 123, name: "Tiruvannamalai", stateId: 6, status: "Active" },
  { id: 124, name: "Pudukkottai", stateId: 6, status: "Active" },
  { id: 125, name: "Rajapalayam", stateId: 6, status: "Active" },

  // India → Telangana (stateId: 7)
  { id: 42, name: "Hyderabad", stateId: 7, status: "Active" },

  // India → Gujarat (stateId: 8)
  { id: 43, name: "Ahmedabad", stateId: 8, status: "Active" },
  { id: 44, name: "Surat", stateId: 8, status: "Active" },
  { id: 45, name: "Vadodara", stateId: 8, status: "Active" },

  // India → Rajasthan (stateId: 9)
  { id: 46, name: "Jaipur", stateId: 9, status: "Active" },
  { id: 47, name: "Udaipur", stateId: 9, status: "Active" },

  // India → Delhi (stateId: 10)
  { id: 48, name: "New Delhi", stateId: 10, status: "Active" },

  // India → Uttar Pradesh (stateId: 11)
  { id: 49, name: "Noida", stateId: 11, status: "Active" },
  { id: 50, name: "Lucknow", stateId: 11, status: "Active" },

  // US → New York (stateId: 2)
  { id: 3, name: "New York City", stateId: 2, status: "Active" },
  { id: 51, name: "Buffalo", stateId: 2, status: "Active" },

  // US → California (stateId: 3)
  { id: 4, name: "San Francisco", stateId: 3, status: "Active" },
  { id: 52, name: "Los Angeles", stateId: 3, status: "Active" },
  { id: 53, name: "San Diego", stateId: 3, status: "Active" },
  { id: 54, name: "Sacramento", stateId: 3, status: "Active" },

  // US → Texas (stateId: 12)
  { id: 55, name: "Houston", stateId: 12, status: "Active" },
  { id: 56, name: "Dallas", stateId: 12, status: "Active" },
  { id: 57, name: "Austin", stateId: 12, status: "Active" },

  // US → Florida (stateId: 13)
  { id: 58, name: "Miami", stateId: 13, status: "Active" },
  { id: 59, name: "Orlando", stateId: 13, status: "Active" },

  // US → Illinois (stateId: 14)
  { id: 60, name: "Chicago", stateId: 14, status: "Active" },

  // US → Washington (stateId: 15)
  { id: 61, name: "Seattle", stateId: 15, status: "Active" },

  // US → Massachusetts (stateId: 16)
  { id: 62, name: "Boston", stateId: 16, status: "Active" },

  // UK → England (stateId: 17)
  { id: 63, name: "London", stateId: 17, status: "Active" },
  { id: 64, name: "Manchester", stateId: 17, status: "Active" },
  { id: 65, name: "Birmingham", stateId: 17, status: "Active" },

  // UK → Scotland (stateId: 18)
  { id: 66, name: "Edinburgh", stateId: 18, status: "Active" },
  { id: 67, name: "Glasgow", stateId: 18, status: "Active" },

  // UK → Wales (stateId: 19)
  { id: 68, name: "Cardiff", stateId: 19, status: "Active" },

  // Canada → Ontario (stateId: 5)
  { id: 5, name: "Toronto", stateId: 5, status: "Active" },
  { id: 69, name: "Ottawa", stateId: 5, status: "Active" },
  { id: 70, name: "Mississauga", stateId: 5, status: "Active" },

  // Canada → British Columbia (stateId: 20)
  { id: 71, name: "Vancouver", stateId: 20, status: "Active" },
  { id: 72, name: "Victoria", stateId: 20, status: "Active" },

  // Canada → Quebec (stateId: 21)
  { id: 73, name: "Montreal", stateId: 21, status: "Active" },
  { id: 74, name: "Quebec City", stateId: 21, status: "Active" },

  // Canada → Alberta (stateId: 22)
  { id: 75, name: "Calgary", stateId: 22, status: "Active" },
  { id: 76, name: "Edmonton", stateId: 22, status: "Active" },

  // Australia → New South Wales (stateId: 23)
  { id: 77, name: "Sydney", stateId: 23, status: "Active" },
  { id: 78, name: "Newcastle", stateId: 23, status: "Active" },

  // Australia → Victoria (stateId: 24)
  { id: 79, name: "Melbourne", stateId: 24, status: "Active" },
  { id: 80, name: "Geelong", stateId: 24, status: "Active" },

  // Australia → Queensland (stateId: 25)
  { id: 81, name: "Brisbane", stateId: 25, status: "Active" },
  { id: 82, name: "Gold Coast", stateId: 25, status: "Active" },

  // Germany → Bavaria (stateId: 26)
  { id: 83, name: "Munich", stateId: 26, status: "Active" },
  { id: 84, name: "Nuremberg", stateId: 26, status: "Active" },

  // Germany → North Rhine-Westphalia (stateId: 27)
  { id: 85, name: "Cologne", stateId: 27, status: "Active" },
  { id: 86, name: "Düsseldorf", stateId: 27, status: "Active" },

  // Germany → Berlin (stateId: 28)
  { id: 87, name: "Berlin", stateId: 28, status: "Active" },

  // France → Île-de-France (stateId: 29)
  { id: 88, name: "Paris", stateId: 29, status: "Active" },

  // France → Provence-Alpes-Côte d'Azur (stateId: 30)
  { id: 89, name: "Nice", stateId: 30, status: "Active" },
  { id: 90, name: "Marseille", stateId: 30, status: "Active" },

  // Japan → Tokyo (stateId: 31)
  { id: 91, name: "Tokyo", stateId: 31, status: "Active" },
  { id: 92, name: "Shinjuku", stateId: 31, status: "Active" },

  // Japan → Osaka (stateId: 32)
  { id: 93, name: "Osaka", stateId: 32, status: "Active" },
  { id: 94, name: "Kyoto", stateId: 32, status: "Active" },

  // Singapore (stateId: 33)
  { id: 95, name: "Singapore City", stateId: 33, status: "Active" },

  // UAE → Dubai (stateId: 34)
  { id: 96, name: "Dubai City", stateId: 34, status: "Active" },

  // UAE → Abu Dhabi (stateId: 35)
  { id: 97, name: "Abu Dhabi City", stateId: 35, status: "Active" },

  // Brazil → São Paulo (stateId: 36)
  { id: 98, name: "São Paulo City", stateId: 36, status: "Active" },

  // Brazil → Rio de Janeiro (stateId: 37)
  { id: 99, name: "Rio de Janeiro City", stateId: 37, status: "Active" },

  // South Korea → Seoul (stateId: 38)
  { id: 100, name: "Seoul City", stateId: 38, status: "Active" },

  // Netherlands → North Holland (stateId: 39)
  { id: 101, name: "Amsterdam", stateId: 39, status: "Active" },
  { id: 102, name: "Rotterdam", stateId: 39, status: "Active" },

  // Switzerland → Zürich (stateId: 40)
  { id: 103, name: "Zürich City", stateId: 40, status: "Active" },

  // Switzerland → Geneva (stateId: 41)
  { id: 104, name: "Geneva City", stateId: 41, status: "Active" },

  // Sweden → Stockholm (stateId: 42)
  { id: 105, name: "Stockholm City", stateId: 42, status: "Active" },
];

export const DEPARTMENTS: MasterItem[] = [
  { id: 1, name: "Sales", status: "Active" },
  { id: 2, name: "Business Development", status: "Active" },
  { id: 3, name: "Engineering", status: "Active" },
  { id: 4, name: "Presales", status: "Active" },
  { id: 5, name: "Quality Assurance", status: "Active" },
  { id: 6, name: "DevOps", status: "Active" }
];

export const DESIGNATIONS: MasterItemMapped[] = [
  { id: 1, name: "CEO & Founder", departmentId: 1, status: "Active" },
  { id: 2, name: "BD Manager", departmentId: 2, status: "Active" },
  { id: 3, name: "BD Executive", departmentId: 2, status: "Active" },
  { id: 4, name: "Tech Lead", departmentId: 3, status: "Active" },
  { id: 5, name: "Senior Developer", departmentId: 3, status: "Active" },
  { id: 6, name: "QA Lead", departmentId: 5, status: "Active" },
  { id: 7, name: "DevOps Engineer", departmentId: 6, status: "Active" }
];

export const TECHNOLOGIES: MasterItem[] = [
  { id: 1, name: "React.js", status: "Active" },
  { id: 2, name: "Node.js", status: "Active" },
  { id: 3, name: "TypeScript", status: "Active" },
  { id: 4, name: "Python", status: "Active" },
  { id: 5, name: "PostgreSQL", status: "Active" },
  { id: 6, name: "AWS Cloud", status: "Active" },
  { id: 7, name: "Docker & K8s", status: "Active" }
];

export const PRIORITIES: MasterItem[] = [
  { id: 1, name: "Critical", status: "Active" },
  { id: 2, name: "High", status: "Active" },
  { id: 3, name: "Medium", status: "Active" },
  { id: 4, name: "Low", status: "Active" }
];

export const PROJECT_CATEGORIES: MasterItem[] = [
  { id: 1, name: "ERP Software Development", status: "Active" },
  { id: 2, name: "Mobile App Development", status: "Active" },
  { id: 3, name: "Cloud Migration Service", status: "Active" },
  { id: 4, name: "QA & Testing Service", status: "Active" },
  { id: 5, name: "UI/UX Consultation", status: "Active" }
];

export const COMPANY_TYPES: MasterItem[] = [
  { id: 1, name: "Proprietorship", status: "Active" },
  { id: 2, name: "Partnership", status: "Active" },
  { id: 3, name: "Private Limited", status: "Active" },
  { id: 4, name: "Public Limited", status: "Active" },
  { id: 5, name: "LLP", status: "Active" }
];

export const PAYMENT_TYPES: MasterItem[] = [
  { id: 1, name: "Cash", status: "Active" },
  { id: 2, name: "Bank Transfer", status: "Active" },
  { id: 3, name: "Credit Card", status: "Active" },
  { id: 4, name: "UPI", status: "Active" },
  { id: 5, name: "Cheque", status: "Active" }
];

export const LEAD_STATUSES: MasterItem[] = [
  { id: 1, name: "New", status: "Active" },
  { id: 2, name: "Contacted", status: "Active" },
  { id: 3, name: "Qualified", status: "Active" },
  { id: 4, name: "Proposal Sent", status: "Active" },
  { id: 5, name: "Won", status: "Active" },
  { id: 6, name: "Lost", status: "Active" }
];

export const LOST_REASONS: MasterItem[] = [
  { id: 1, name: "Budget Constraints", status: "Active" },
  { id: 2, name: "Chose Competitor", status: "Active" },
  { id: 3, name: "No Decision Made", status: "Active" },
  { id: 4, name: "Poor Fit", status: "Active" },
  { id: 5, name: "Timeline Mismatch", status: "Active" },
  { id: 6, name: "Lost Contact", status: "Inactive" },
];

export const FOLLOWUP_TYPES: MasterItem[] = [
  { id: 1, name: "Call", status: "Active" },
  { id: 2, name: "Meeting", status: "Active" },
  { id: 3, name: "Email", status: "Active" },
  { id: 4, name: "WhatsApp", status: "Active" },
];
