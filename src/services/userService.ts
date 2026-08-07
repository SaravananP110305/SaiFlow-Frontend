import api from './api';

export const userService = {
  getUsers: async (params?: any) => {
    const response = await api.post('/get-user', params);
    return response.data;
  },

  getUserById: async (id: number) => {
    const response = await api.get(`/get-user/${id}`);
    return response.data?.data;
  },

  createUser: async (data: any) => {
    const response = await api.post('/create-user', data);
    return response.data?.data;
  },

  updateUser: async (id: number, data: any) => {
    const response = await api.put(`/update-user/${id}`, data);
    return response.data?.data;
  },

  deleteUser: async (id: number) => {
    const response = await api.delete(`/delete-user/${id}`);
    return response.data;
  },

  getAssignees: async () => {
    const response = await api.post('/get-user-assignees');
    return response.data;
  }
};
