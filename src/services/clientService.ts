import api from './api';

export const clientService = {
  getClients: async (params?: any) => {
    const response = await api.post('/get-customer', params);
    return response.data;
  },

  getClientById: async (id: number) => {
    const response = await api.get(`/get-customer/${id}`);
    return response.data?.data;
  },

  createClient: async (data: any) => {
    const response = await api.post('/create-customer', data);
    return response.data?.data;
  },

  updateClient: async (id: number, data: any) => {
    const response = await api.put(`/update-customer/${id}`, data);
    return response.data?.data;
  },

  deleteClient: async (id: number) => {
    const response = await api.delete(`/delete-customer/${id}`);
    return response.data;
  },

  getProjects: async (params?: any) => {
    const response = await api.post('/get-project', params);
    return response.data;
  },

  createProject: async (data: any) => {
    const response = await api.post('/create-project', data);
    return response.data?.data;
  },

  updateProject: async (id: number, data: any) => {
    const response = await api.put(`/update-project/${id}`, data);
    return response.data?.data;
  }
};
