import api from './api';

export const meetingService = {
  getMeetings: async (params?: any) => {
    const response = await api.get('/meetings', { params });
    return response.data;
  },

  getMeetingById: async (id: number) => {
    const response = await api.get(`/meetings/${id}`);
    return response.data?.data;
  },

  createMeeting: async (data: any) => {
    const response = await api.post('/meetings', data);
    return response.data?.data;
  },

  updateMeeting: async (id: number, data: any) => {
    const response = await api.put(`/meetings/${id}`, data);
    return response.data?.data;
  },

  updateMeetingStatus: async (id: number, status: string, scopeNotes?: string, actionSummary?: string) => {
    const response = await api.patch(`/meetings/${id}`, { status, scopeNotes, actionSummary });
    return response.data?.data;
  },

  deleteMeeting: async (id: number) => {
    const response = await api.delete(`/meetings/${id}`);
    return response.data;
  }
};
