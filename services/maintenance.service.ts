import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { MaintenanceRequest, MaintenanceStatus } from '@/types/database';

export interface CreateMaintenanceData {
  unit_id: string;
  title: string;
  description: string;
  status?: MaintenanceStatus;
}

export interface UpdateMaintenanceData {
  title?: string;
  description?: string;
  status?: MaintenanceStatus;
}

class MaintenanceService {
  async getAll() {
    const data = await apiGet<any[]>('/api/maintenance');
    return data;
  }

  async getById(id: string) {
    const data = await apiGet<any>(`/api/maintenance/${id}`);
    return data;
  }

  async getByUnitId(unitId: string) {
    const data = await apiGet<MaintenanceRequest[]>(`/api/maintenance/by-unit/${unitId}`);
    return data;
  }

  async getByStatus(status: MaintenanceStatus) {
    const all = await this.getAll();
    return all.filter((m: any) => m.status === status);
  }

  async create(maintenanceData: CreateMaintenanceData) {
    const data = await apiPost<MaintenanceRequest>('/api/maintenance', maintenanceData);
    return data;
  }

  async update(id: string, maintenanceData: UpdateMaintenanceData) {
    const data = await apiPatch<MaintenanceRequest>(`/api/maintenance/${id}`, maintenanceData);
    return data;
  }

  async delete(id: string) {
    await apiDelete(`/api/maintenance/${id}`);
  }
}

export const maintenanceService = new MaintenanceService();
