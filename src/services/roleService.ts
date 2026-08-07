import api from './api';

export const roleService = {
  getRoles: async (params?: any) => {
    const response = await api.post('/get-role', params);
    if (params?.paginate === true || params?.paginate === 'true') {
      return response.data;
    }
    return response.data?.data || [];
  },

  getRoleById: async (id: number) => {
    const response = await api.get(`/get-role/${id}`);
    return response.data?.data;
  },

  createRole: async (data: any) => {
    const response = await api.post('/create-role', data);
    return response.data?.data;
  },

  updateRole: async (id: number, data: any) => {
    const response = await api.put(`/update-role/${id}`, data);
    return response.data?.data;
  },

  deleteRole: async (id: number) => {
    const response = await api.delete(`/delete-role/${id}`);
    return response.data;
  }
};
