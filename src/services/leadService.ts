import api from './api';

export interface LeadQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sourceId?: number;
  priorityId?: number;
  assignedToId?: number;
  createdFrom?: string;
  createdTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface LeadPayload {
  title: string;
  contactPerson: string;
  email: string;
  phone?: string;
  designation?: string;
  alternatePhone?: string;
  alternateEmail?: string;
  website?: string | null;
  industryId?: number | null;
  companyType?: string | null;
  address?: string | null;
  countryId?: number | null;
  stateId?: number | null;
  cityId?: number | null;
  pincode?: string | null;
  sourceId?: number | null;
  priorityId?: number | null;
  assignedToId?: number | null;
  status?: string;
  requirements?: string;
}

export interface ImportRow {
  title?: string;
  companyName?: string | null;
  contactPerson?: string | null;
  designation?: string | null;
  email?: string | null;
  alternateEmail?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  website?: string | null;
  address?: string | null;
  pincode?: string | null;
  industryId?: number | null;
  countryId?: number | null;
  stateId?: number | null;
  cityId?: number | null;
  companyType?: string | null;
  sourceId?: number | null;
  priorityId?: number | null;
  assignedToId?: number | null;
  status?: string | null;
  requirements?: string | null;
}

export interface ConvertPayload {
  gstPan?: string;
  paymentTerms?: string;
  creditLimit?: number | null;
  relationshipManagerId?: number | null;
  accountManagerId?: number | null;
}

export const leadService = {
  getLeads: async (params?: LeadQuery) => {
    const response = await api.get('/leads', { params });
    return response.data;
  },

  getLeadById: async (id: number) => {
    const response = await api.get(`/leads/${id}`);
    return response.data?.data;
  },

  createLead: async (data: LeadPayload) => {
    const response = await api.post('/leads', data);
    return response.data?.data;
  },

  updateLead: async (id: number, data: Partial<LeadPayload>) => {
    const response = await api.put(`/leads/${id}`, data);
    return response.data?.data;
  },

  assignLead: async (id: number, assignedToId: number) => {
    const response = await api.patch(`/leads/${id}/assignment`, { assignedToId });
    return response.data?.data;
  },

  deleteLead: async (id: number) => {
    const response = await api.delete(`/leads/${id}`);
    return response.data;
  },

  getStatusCounts: async () => {
    const response = await api.get('/leads/status-counts');
    return response.data?.data;
  },

  bulkAssign: async (ids: number[], assignedToId: number) => {
    const response = await api.post('/leads/bulk-assign', { ids, assignedToId });
    return response.data?.data;
  },

  bulkDelete: async (ids: number[]) => {
    const response = await api.post('/leads/bulk-delete', { ids });
    return response.data?.data;
  },

  importLeads: async (rows: ImportRow[]) => {
    const response = await api.post('/leads/import', { leads: rows });
    return response.data?.data;
  },

  exportLeads: async (params?: LeadQuery) => {
    const response = await api.get('/leads/export', { params, responseType: 'blob' });
    return response.data as Blob;
  },

  convertLead: async (id: number, data: ConvertPayload) => {
    const response = await api.post(`/leads/${id}/convert`, data);
    return response.data?.data;
  }
};
