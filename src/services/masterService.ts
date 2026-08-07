import api from './api';

export const masterService = {
  getMasterItems: async (category?: string, parentId?: number, additionalParams?: any) => {
    const body: any = {};
    if (category) body.category = category;
    if (parentId !== undefined) body.parentId = parentId;
    if (additionalParams) {
      Object.assign(body, additionalParams);
    }
    
    const response = await api.post('/get-master', body);
    if (additionalParams?.paginate === true || additionalParams?.paginate === 'true') {
      return response.data;
    }
    return response.data?.data || [];
  },

  getMasterItemById: async (id: number) => {
    const response = await api.get(`/get-master/${id}`);
    return response.data?.data;
  },

  createMasterItem: async (data: any) => {
    const response = await api.post('/create-master', data);
    return response.data?.data;
  },

  updateMasterItem: async (id: number, data: any) => {
    const response = await api.put(`/update-master/${id}`, data);
    return response.data?.data;
  },

  deleteMasterItem: async (id: number) => {
    const response = await api.delete(`/delete-master/${id}`);
    return response.data;
  }
};
