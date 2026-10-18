import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { Unit, RentType, UnitStatus } from '@/types/database';

export interface CreateUnitData {
  property_id: string;
  unit_name: string;
  rent_type: RentType;
  rent_amount: number;
  status?: UnitStatus;
}

export interface UpdateUnitData {
  unit_name?: string;
  rent_type?: RentType;
  rent_amount?: number;
  status?: UnitStatus;
}

class UnitService {
  async getByPropertyId(propertyId: string) {
    const data = await apiGet<any[]>(`/api/units/by-property/${propertyId}`);
    return data;
  }

  async getById(id: string) {
    const data = await apiGet<any>(`/api/units/${id}`);
    return data;
  }

  async create(unitData: CreateUnitData) {
    const data = await apiPost<Unit>('/api/units', unitData);
    return data;
  }

  async update(id: string, unitData: UpdateUnitData) {
    const data = await apiPatch<Unit>(`/api/units/${id}`, unitData);
    return data;
  }

  async delete(id: string) {
    await apiDelete(`/api/units/${id}`);
  }

  async getAll() {
    const data = await apiGet<any[]>('/api/units');
    return data;
  }
}

export const unitService = new UnitService();
