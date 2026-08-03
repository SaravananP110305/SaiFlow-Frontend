import api from './api';

export const clientService = {
  getClients: async (params?: any) => {
    const response = await api.get('/clients', { params });
    return response.data;
  },

  getClientById: async (id: number) => {
    const response = await api.get(`/clients/${id}`);
    return response.data?.data;
  },

  createClient: async (data: any) => {
    const response = await api.post('/clients', data);
    return response.data?.data;
  },

  updateClient: async (id: number, data: any) => {
    const response = await api.put(`/clients/${id}`, data);
    return response.data?.data;
  },

  deleteClient: async (id: number) => {
    const response = await api.delete(`/clients/${id}`);
    return response.data;
  },

  getProjects: async (params?: any) => {
    const response = await api.get('/clients/projects', { params });
    return response.data;
  },

  createProject: async (data: any) => {
    const response = await api.post('/clients/projects', data);
    return response.data?.data;
  },

  updateProject: async (id: number, data: any) => {
    const response = await api.put(`/clients/projects/${id}`, data);
    return response.data?.data;
  }
};
