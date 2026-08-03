import api, { setAccessToken, refreshAccessToken } from './api';

export const authService = {
  login: async (credentials: any) => {
    const response = await api.post('/auth/sessions', credentials, {
      skipAuthRefresh: true
    });
    const token = response.data?.data?.accessToken;
    if (token) {
      setAccessToken(token);
    }
    return response.data?.data;
  },

  logout: async () => {
    try {
      await api.delete('/auth/sessions');
    } finally {
      setAccessToken(null);
    }
  },

  getMe: async () => {
    const response = await api.get('/auth/profile');
    return response.data?.data?.user;
  },

  refreshToken: async () => {
    return refreshAccessToken();
  },

  changePassword: async (data: any) => {
    const response = await api.patch('/auth/profile/password', data);
    return response.data;
  }
};
