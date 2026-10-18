import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { Payment, PaymentMethod } from '@/types/database';

export interface CreatePaymentData {
  tenant_id: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  notes?: string;
}

export interface PaymentSummary {
  totalAmount: number;
  paymentCount: number;
  byMethod: {
    cash: number;
    bank: number;
    mobile: number;
  };
}

export interface PaymentFilter {
  propertyId?: string;
  unitId?: string;
  tenantId?: string;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
}

function toQuery(filter?: PaymentFilter): string {
  if (!filter) return '';
  const params = new URLSearchParams();
  if (filter.propertyId) params.set('propertyId', filter.propertyId);
  if (filter.unitId) params.set('unitId', filter.unitId);
  if (filter.tenantId) params.set('tenantId', filter.tenantId);
  if (filter.from) params.set('from', filter.from);
  if (filter.to) params.set('to', filter.to);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

class PaymentService {
  async getAll(filter?: PaymentFilter) {
    const data = await apiGet<any[]>(`/api/payments${toQuery(filter)}`);
    return data;
  }

  async getByUnitId(unitId: string) {
    const data = await apiGet<Payment[]>(`/api/payments/by-unit/${unitId}`);
    return data;
  }

  async getById(id: string) {
    const data = await apiGet<any>(`/api/payments/${id}`);
    return data;
  }

  async create(paymentData: CreatePaymentData) {
    const data = await apiPost<Payment>('/api/payments', paymentData);
    return data;
  }

  async delete(id: string) {
    await apiDelete(`/api/payments/${id}`);
  }

  async getMonthlySummary(
    year: number,
    month: number,
  ): Promise<PaymentSummary> {
    // Backend doesn't have this endpoint; compute from getAll filtered by unit
    const payments = await this.getAll();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    const filtered = payments.filter((p: any) => {
      const d = p.payment_date;
      return d >= startDate && d <= endDate;
    });
    const summary: PaymentSummary = {
      totalAmount: 0,
      paymentCount: filtered.length,
      byMethod: { cash: 0, bank: 0, mobile: 0 },
    };
    filtered.forEach((p: any) => {
      summary.totalAmount += Number(p.amount);
      summary.byMethod[p.payment_method as PaymentMethod] += Number(p.amount);
    });
    return summary;
  }

  async getYearlySummary(year: number): Promise<PaymentSummary> {
    const payments = await this.getAll();
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    const filtered = payments.filter((p: any) => {
      const d = p.payment_date;
      return d >= startDate && d <= endDate;
    });
    const summary: PaymentSummary = {
      totalAmount: 0,
      paymentCount: filtered.length,
      byMethod: { cash: 0, bank: 0, mobile: 0 },
    };
    filtered.forEach((p: any) => {
      summary.totalAmount += Number(p.amount);
      summary.byMethod[p.payment_method as PaymentMethod] += Number(p.amount);
    });
    return summary;
  }
}

export const paymentService = new PaymentService();
