import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { Property, PropertyType } from '@/types/database';

export interface CreatePropertyData {
  name: string;
  type: PropertyType;
  address: string;
  tax_rate: number;
  description?: string;
  image_url?: string;
}

export interface UpdatePropertyData {
  name?: string;
  type?: PropertyType;
  address?: string;
  tax_rate?: number;
  description?: string;
  image_url?: string;
}

class PropertyService {
  async getAll() {
    const data = await apiGet<Property[]>('/api/properties');
    return data;
  }

  async getById(id: string) {
    const data = await apiGet<any>(`/api/properties/${id}`);
    return data;
  }

  async create(propertyData: CreatePropertyData) {
    const data = await apiPost<Property>('/api/properties', propertyData);
    return data;
  }

  async update(id: string, propertyData: UpdatePropertyData) {
    const data = await apiPatch<Property>(
      `/api/properties/${id}`,
      propertyData,
    );
    return data;
  }

  async delete(id: string) {
    await apiDelete(`/api/properties/${id}`);
  }
}

export const propertyService = new PropertyService();
