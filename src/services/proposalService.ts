import api from './api';

export const proposalService = {
  getProposals: async (params?: any) => {
    const response = await api.get('/proposals', { params });
    return response.data;
  },

  getProposalById: async (id: number) => {
    const response = await api.get(`/proposals/${id}`);
    return response.data?.data;
  },

  createProposal: async (data: any) => {
    const response = await api.post('/proposals', data);
    return response.data?.data;
  },

  updateProposal: async (id: number, data: any) => {
    const response = await api.put(`/proposals/${id}`, data);
    return response.data?.data;
  },

  deleteProposal: async (id: number) => {
    const response = await api.delete(`/proposals/${id}`);
    return response.data;
  }
};
