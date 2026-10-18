import { create } from 'zustand';
import { DashboardStats } from '@/types/database';
import { dashboardService, DashboardFilter } from '@/services/dashboard.service';

interface DashboardState {
  stats: DashboardStats | null;
  chartData: any[];
  isLoading: boolean;
  fetchStats: (filter?: DashboardFilter) => Promise<void>;
  fetchChartData: (year: number, filter?: Pick<DashboardFilter, 'propertyId'>) => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  stats: null,
  chartData: [],
  isLoading: false,

  fetchStats: async (filter) => {
    try {
      set({ isLoading: true });
      const stats = await dashboardService.getStats(filter);
      set({ stats, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  fetchChartData: async (year: number, filter) => {
    try {
      const chartData = await dashboardService.getMonthlyChartData(year, filter);
      set({ chartData });
    } catch (error) {
      throw error;
    }
  },
}));
