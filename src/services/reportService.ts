import api from './api';

export const reportService = {
  getDashboardSummary: async () => {
    const response = await api.get('/reports/dashboard-summary');
    return response.data?.data;
  },

  getLeadReport: async () => {
    const response = await api.get('/reports/leads');
    return response.data?.data;
  },

  getMeetingReport: async () => {
    const response = await api.get('/reports/meetings');
    return response.data?.data;
  },

  getEmployeeReport: async () => {
    const response = await api.get('/reports/employees');
    return response.data?.data;
  },

  getProposalReport: async () => {
    const response = await api.get('/reports/proposals');
    return response.data?.data;
  }
};
