import api, { setAccessToken, refreshAccessToken } from './api';

export interface ProfileUpdate {
  name?: string;
  email?: string;
  phone?: string;
}

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
    const response = await api.get('/auth/profile');
    return response.data?.data?.user;
  },

  getPrivileges: async () => {
    const response = await api.get('/auth/privileges');
    return response.data?.data;
  },

  updateProfile: async (data: ProfileUpdate) => {
    const response = await api.patch('/auth/profile', data);
    return response.data?.data?.user;
  },

  uploadProfilePhoto: async (file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    // No Content-Type is set here on purpose: axios passes FormData through
    // untouched and the browser sets 'multipart/form-data; boundary=...'.
    const response = await api.patch('/auth/profile/photo', formData);
    return response.data?.data?.user;
  },

  refreshToken: async () => {
    return refreshAccessToken();
  },

  changePassword: async (data: any) => {
    const response = await api.patch('/auth/change-password', data);
    return response.data;
  }
};
