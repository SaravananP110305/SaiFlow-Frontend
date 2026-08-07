import api from './api';

export const meetingService = {
  getMeetings: async (params?: any) => {
    const response = await api.post('/get-meeting', params);
    return response.data;
  },

  getMeetingById: async (id: number) => {
    const response = await api.get(`/get-meeting/${id}`);
    return response.data?.data;
  },

  createMeeting: async (data: any) => {
    const response = await api.post('/create-meeting', data);
    return response.data?.data;
  },

  updateMeeting: async (id: number, data: any) => {
    const response = await api.put(`/update-meeting/${id}`, data);
    return response.data?.data;
  },

  updateMeetingStatus: async (id: number, status: string, scopeNotes?: string, actionSummary?: string) => {
    const response = await api.patch(`/update-meeting-status/${id}`, { status, scopeNotes, actionSummary });
    return response.data?.data;
  },

  deleteMeeting: async (id: number) => {
    const response = await api.delete(`/delete-meeting/${id}`);
    return response.data;
  }
};
