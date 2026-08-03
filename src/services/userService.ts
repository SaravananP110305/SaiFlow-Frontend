import api from './api';

export const userService = {
  getUsers: async (params?: any) => {
    const response = await api.get('/users', { params });
    return response.data;
  },

  getUserById: async (id: number) => {
    const response = await api.get(`/users/${id}`);
    return response.data?.data;
  },

  createUser: async (data: any) => {
    const response = await api.post('/users', data);
    return response.data?.data;
  },

  updateUser: async (id: number, data: any) => {
    const response = await api.put(`/users/${id}`, data);
    return response.data?.data;
  },

  deleteUser: async (id: number) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },

  getAssignees: async () => {
    const response = await api.get('/users/assignees');
    return response.data;
  }
};
