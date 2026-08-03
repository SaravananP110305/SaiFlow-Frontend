import api from './api';

export const masterService = {
  getMasterItems: async (category?: string, parentId?: number, additionalParams?: any) => {
    const params: any = {};
    if (category) params.category = category;
    if (parentId !== undefined) params.parentId = parentId;
    if (additionalParams) {
      Object.assign(params, additionalParams);
    }
    
    const response = await api.get('/master-items', { params });
    if (additionalParams?.paginate === true || additionalParams?.paginate === 'true') {
      return response.data;
    }
    return response.data?.data || [];
  },

  getMasterItemById: async (id: number) => {
    const response = await api.get(`/master-items/${id}`);
    return response.data?.data;
  },

  createMasterItem: async (data: any) => {
    const response = await api.post('/master-items', data);
    return response.data?.data;
  },

  updateMasterItem: async (id: number, data: any) => {
    const response = await api.put(`/master-items/${id}`, data);
    return response.data?.data;
  },

  deleteMasterItem: async (id: number) => {
    const response = await api.delete(`/master-items/${id}`);
    return response.data;
  }
};
