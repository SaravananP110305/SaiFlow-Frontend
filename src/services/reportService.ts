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
    const response = await api.get('/reports/dashboard-summary');
    return response.data?.data;
  },

  getLeadReport: async (params?: ReportQuery) => {
    const response = await api.get('/reports/leads', { params });
    return response.data;
  },

  getMeetingReport: async (params?: ReportQuery) => {
    const response = await api.get('/reports/meetings', { params });
    return response.data;
  },

  getEmployeeReport: async (params?: ReportQuery) => {
    const response = await api.get('/reports/employees', { params });
    return response.data;
  },

  getClientReport: async (params?: ReportQuery) => {
    const response = await api.get('/reports/clients', { params });
    return response.data;
  },

  getProposalReport: async (params?: ReportQuery) => {
    const response = await api.get('/reports/proposals', { params });
    return response.data;
  },

  getFollowUpReport: async (params?: ReportQuery) => {
    const response = await api.get('/reports/follow-ups', { params });
    return response.data;
  }
};
