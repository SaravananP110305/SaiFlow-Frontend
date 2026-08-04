import api, { setAccessToken, refreshAccessToken } from './api';

export const authService = {
  login: async (credentials: any) => {
    const response = await api.post('/auth/login', credentials, {
      skipAuthRefresh: true
    });
    const token = response.data?.data?.accessToken;
    if (token) {
      setAccessToken(token);
    }
    return token;
  },

  logout: async () => {
    try {
      await api.delete('/auth/logout');
    } finally {
      setAccessToken(null);
    }
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data?.data?.user;
  },

  getPrivileges: async () => {
    const response = await api.get('/auth/privileges');
    return response.data?.data;
  },

  refreshToken: async () => {
    return refreshAccessToken();
  },

  changePassword: async (data: any) => {
    const response = await api.patch('/auth/change-password', data);
    return response.data;
  }
};
