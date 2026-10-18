import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { Tenant } from '@/types/database';

export interface CreateTenantData {
  full_name: string;
  phone: string;
  id_number: string;
  emergency_contact?: string;
  deposit_amount: number;
  unit_id: string;
  lease_start_date?: string;
  lease_end_date?: string;
}

export interface UpdateTenantData {
  full_name?: string;
  phone?: string;
  id_number?: string;
  emergency_contact?: string;
  deposit_amount?: number;
  unit_id?: string;
  status?: 'active' | 'past';
  lease_start_date?: string;
  lease_end_date?: string;
}

export interface RentStatusEntry {
  tenant_id: string;
  full_name: string;
  unit_id: string;
  unit_name: string;
  property_name: string;
  rent_amount: number;
  rent_type: 'monthly' | 'yearly';
  total_paid: number;
  last_payment_date: string | null;
  last_payment_amount: number | null;
  paid_through_date: string | null;
  next_due_date: string | null;
  grace_end_date: string | null;
  status: 'current' | 'overdue' | 'no_history';
  days_overdue: number;
}

class TenantService {
  async getAll() {
    const data = await apiGet<any[]>('/api/tenants');
    return data;
  }

  async getById(id: string) {
    const data = await apiGet<any>(`/api/tenants/${id}`);
    return data;
  }

  async getByUnitId(unitId: string) {
    const data = await apiGet<any | null>(`/api/tenants/by-unit/${unitId}`);
    return data;
  }

  async getRentStatus() {
    const data = await apiGet<RentStatusEntry[]>('/api/tenants/rent-status');
    return data;
  }

  async create(tenantData: CreateTenantData) {
    const data = await apiPost<Tenant>('/api/tenants', tenantData);
    return data;
  }

  async update(id: string, tenantData: UpdateTenantData) {
    const data = await apiPatch<Tenant>(`/api/tenants/${id}`, tenantData);
    return data;
  }

  async delete(id: string) {
    await apiDelete(`/api/tenants/${id}`);
  }
}

export const tenantService = new TenantService();
