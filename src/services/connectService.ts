import api from './api';

export interface ConnectPayload {
  leadId: number;
  outcome?: string;
  summary?: string;
  followUpType?: string;
  followUpDate?: string;
  followUpTime?: string;
  status?: string;
}

export interface ConnectQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  leadId?: number;
}

export const connectService = {
  getConnects: async (params?: ConnectQuery) => {
    const response = await api.post('/get-connect', params);
    return response.data;
  },

  createConnect: async (data: ConnectPayload) => {
    const response = await api.post('/create-connect', data);
    return response.data?.data;
  },

  updateConnect: async (id: number, data: Partial<ConnectPayload>) => {
    const response = await api.patch(`/update-connect/${id}`, data);
    return response.data?.data;
  }
};
