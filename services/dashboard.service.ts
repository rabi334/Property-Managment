import { apiGet } from '@/lib/api';
import { DashboardStats } from '@/types/database';

export interface DashboardFilter {
  propertyId?: string;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
}

export interface ExpiringLease {
  id: string;
  unit_name: string;
  status: string;
  lease_end_date: string;
  days_left: number;
  property: {
    id: string;
    name: string;
    address: string;
  };
  tenant: {
    id: string;
    full_name: string;
    phone: string;
  } | null;
}

function toQuery(filter?: DashboardFilter): string {
  if (!filter) return '';
  const params = new URLSearchParams();
  if (filter.propertyId) params.set('propertyId', filter.propertyId);
  if (filter.from) params.set('from', filter.from);
  if (filter.to) params.set('to', filter.to);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

class DashboardService {
  async getStats(filter?: DashboardFilter): Promise<DashboardStats> {
    const data = await apiGet<DashboardStats>(
      `/api/dashboard/stats${toQuery(filter)}`,
    );
    return data;
  }

  async getMonthlyChartData(
    year: number,
    filter?: Pick<DashboardFilter, 'propertyId'>,
  ) {
    const qs = toQuery(filter);
    const data = await apiGet<any[]>(`/api/dashboard/chart/${year}${qs}`);
    return data;
  }

  async getTaxReport(
    year: number,
    filter?: Pick<DashboardFilter, 'propertyId'>,
  ) {
    const qs = toQuery(filter);
    const data = await apiGet<any[]>(`/api/dashboard/tax-report/${year}${qs}`);
    return data;
  }

  async getExpiringLeases(
    days: number = 30,
    filter?: Pick<DashboardFilter, 'propertyId'>,
  ): Promise<ExpiringLease[]> {
    const params = new URLSearchParams();
    params.set('days', String(days));
    if (filter?.propertyId) params.set('propertyId', filter.propertyId);
    const data = await apiGet<ExpiringLease[]>(
      `/api/dashboard/expiring-leases?${params.toString()}`,
    );
    return data;
  }
}

export const dashboardService = new DashboardService();
