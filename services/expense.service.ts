import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { Expense, ExpenseCategory } from '@/types/database';

export interface CreateExpenseData {
  property_id: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  date: string;
}

export interface UpdateExpenseData {
  property_id?: string;
  category?: ExpenseCategory;
  amount?: number;
  description?: string;
  date?: string;
}

export interface ExpenseSummary {
  totalAmount: number;
  expenseCount: number;
  byCategory: {
    maintenance: number;
    utilities: number;
    renovation: number;
    other: number;
  };
}

export interface ExpenseFilter {
  propertyId?: string;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
}

function toQuery(filter?: ExpenseFilter): string {
  if (!filter) return '';
  const params = new URLSearchParams();
  if (filter.propertyId) params.set('propertyId', filter.propertyId);
  if (filter.from) params.set('from', filter.from);
  if (filter.to) params.set('to', filter.to);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

class ExpenseService {
  async getAll(filter?: ExpenseFilter) {
    const data = await apiGet<any[]>(`/api/expenses${toQuery(filter)}`);
    return data;
  }

  async getByPropertyId(
    propertyId: string,
    filter?: Omit<ExpenseFilter, 'propertyId'>,
  ) {
    const qs = toQuery({ propertyId, ...filter });
    const data = await apiGet<Expense[]>(
      `/api/expenses/by-property/${propertyId}${qs}`,
    );
    return data;
  }

  async getById(id: string) {
    const data = await apiGet<any>(`/api/expenses/${id}`);
    return data;
  }

  async create(expenseData: CreateExpenseData) {
    const data = await apiPost<Expense>('/api/expenses', expenseData);
    return data;
  }

  async update(id: string, expenseData: UpdateExpenseData) {
    const data = await apiPatch<Expense>(`/api/expenses/${id}`, expenseData);
    return data;
  }

  async delete(id: string) {
    await apiDelete(`/api/expenses/${id}`);
  }

  async getMonthlySummary(
    year: number,
    month: number,
  ): Promise<ExpenseSummary> {
    const expenses = await this.getAll();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    const filtered = expenses.filter((e: any) => {
      const d = e.date;
      return d >= startDate && d <= endDate;
    });
    const summary: ExpenseSummary = {
      totalAmount: 0,
      expenseCount: filtered.length,
      byCategory: { maintenance: 0, utilities: 0, renovation: 0, other: 0 },
    };
    filtered.forEach((e: any) => {
      summary.totalAmount += Number(e.amount);
      summary.byCategory[e.category as ExpenseCategory] += Number(e.amount);
    });
    return summary;
  }
}

export const expenseService = new ExpenseService();
