import api from './api';

export const roleService = {
  getRoles: async (params?: any) => {
    const response = await api.get('/roles', { params });
    if (params?.paginate === true || params?.paginate === 'true') {
      return response.data;
    }
    return response.data?.data || [];
  },

  getRoleById: async (id: number) => {
    const response = await api.get(`/roles/${id}`);
    return response.data?.data;
  },

  createRole: async (data: any) => {
    const response = await api.post('/roles', data);
    return response.data?.data;
  },

  updateRole: async (id: number, data: any) => {
    const response = await api.put(`/roles/${id}`, data);
    return response.data?.data;
  },

  deleteRole: async (id: number) => {
    const response = await api.delete(`/roles/${id}`);
    return response.data;
  }
};
