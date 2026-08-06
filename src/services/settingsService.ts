import api from "./api";

export interface AppSettings {
  appName?: string;
  timeZone?: string;
  language?: string;
  companyName?: string;
  contactEmail?: string;
  address?: string;
  categories?: Record<string, Record<string, string>>;
}

export const settingsService = {
  getSettings: async () => {
    const response = await api.get("/settings");
    return response.data;
  },

  updateSettings: async (data: Partial<AppSettings>) => {
    const response = await api.put("/settings", data);
    return response.data?.data;
  }
};
