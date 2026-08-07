import api from './api';

export const proposalService = {
  getProposals: async (params?: any) => {
    const response = await api.post('/get-proposal', params);
    return response.data;
  },

  getProposalById: async (id: number) => {
    const response = await api.get(`/get-proposal/${id}`);
    return response.data?.data;
  },

  createProposal: async (data: any) => {
    const response = await api.post('/create-proposal', data);
    return response.data?.data;
  },

  updateProposal: async (id: number, data: any) => {
    const response = await api.put(`/update-proposal/${id}`, data);
    return response.data?.data;
  },

  deleteProposal: async (id: number) => {
    const response = await api.delete(`/delete-proposal/${id}`);
    return response.data;
  }
};
