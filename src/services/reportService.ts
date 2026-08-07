import api from './api';

export interface ReportQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  source?: string;
  type?: string;
  role?: string;
  industry?: string;
  handover?: string;
  reason?: string;
}

export const reportService = {
  getDashboardSummary: async () => {
    const response = await api.post('/get-report-dashboard-summary');
    return response.data?.data;
  },

  getDashboardCharts: async () => {
    const response = await api.post('/get-report-dashboard-charts');
    return response.data?.data;
  },

  getLeadReport: async (params?: ReportQuery) => {
    const response = await api.post('/get-report-lead', params);
    return response.data;
  },

  getMeetingReport: async (params?: ReportQuery) => {
    const response = await api.post('/get-report-meeting', params);
    return response.data;
  },

  getEmployeeReport: async (params?: ReportQuery) => {
    const response = await api.post('/get-report-employee', params);
    return response.data;
  },

  getClientReport: async (params?: ReportQuery) => {
    const response = await api.post('/get-report-customer', params);
    return response.data;
  },

  getProposalReport: async (params?: ReportQuery) => {
    const response = await api.post('/get-report-proposal', params);
    return response.data;
  },

  getFollowUpReport: async (params?: ReportQuery) => {
    const response = await api.post('/get-report-follow-up', params);
    return response.data;
  }
};
