import api from './api';

export const leadService = {
  getLeads: async (params?: any) => {
    const response = await api.get('/leads', { params });
    return response.data;
  },

  getLeadById: async (id: number) => {
    const response = await api.get(`/leads/${id}`);
    return response.data?.data;
  },

  createLead: async (data: any) => {
    const response = await api.post('/leads', data);
    return response.data?.data;
  },

  updateLead: async (id: number, data: any) => {
    const response = await api.put(`/leads/${id}`, data);
    return response.data?.data;
  },

  assignLead: async (id: number, assignedToId: number) => {
    const response = await api.patch(`/leads/${id}/assignment`, { assignedToId });
    return response.data?.data;
  },

  deleteLead: async (id: number) => {
    const response = await api.delete(`/leads/${id}`);
    return response.data;
  }
};
