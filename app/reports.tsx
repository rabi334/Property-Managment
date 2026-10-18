import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { dashboardService } from '@/services/dashboard.service';
import { useTheme } from '@/hooks/useTheme';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';

export default function ReportsScreen() {
  const { colors } = useTheme();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [year]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await dashboardService.getMonthlyChartData(year);
      setChartData(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Financial Reports
        </Text>
        <View style={styles.yearSelector}>
          <TouchableOpacity
            style={styles.yearBtn}
            onPress={() => setYear((y) => y - 1)}
          >
            <ChevronLeft size={20} color={colors.accent} />
          </TouchableOpacity>
          <Text style={[styles.yearText, { color: colors.textPrimary }]}>
            {year}
          </Text>
          <TouchableOpacity
            style={styles.yearBtn}
            onPress={() => setYear((y) => Math.min(y + 1, currentYear))}
          >
            <ChevronRight
              size={20}
              color={year >= currentYear ? colors.border : colors.accent}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: colors.currentText },
              ]}
            />
            <Text
              style={[styles.legendText, { color: colors.textSecondary }]}
            >
              Income
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: colors.overdueText },
              ]}
            />
            <Text
              style={[styles.legendText, { color: colors.textSecondary }]}
            >
              Expenses
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: colors.accent }]}
            />
            <Text
              style={[styles.legendText, { color: colors.textSecondary }]}
            >
              Profit
            </Text>
          </View>
        </View>

        {chartData.map((entry) => (
          <View
            key={entry.month}
            style={[
              styles.rowCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.rowHeader}>
              <Text style={[styles.monthText, { color: colors.textPrimary }]}>
                {entry.month}
              </Text>
            </View>
            <View style={styles.metricRow}>
              <View style={styles.metricItem}>
                <TrendingUp size={18} color={colors.currentText} />
                <Text
                  style={[styles.metricLabel, { color: colors.textSecondary }]}
                >
                  Income
                </Text>
                <Text
                  style={[styles.metricValue, { color: colors.currentText }]}
                >
                  ${entry.income.toFixed(2)}
                </Text>
              </View>
              <View style={styles.metricItem}>
                <TrendingDown size={18} color={colors.overdueText} />
                <Text
                  style={[styles.metricLabel, { color: colors.textSecondary }]}
                >
                  Expenses
                </Text>
                <Text
                  style={[styles.metricValue, { color: colors.overdueText }]}
                >
                  ${entry.expenses.toFixed(2)}
                </Text>
              </View>
              <View style={styles.metricItem}>
                <DollarSign size={18} color={colors.accent} />
                <Text
                  style={[styles.metricLabel, { color: colors.textSecondary }]}
                >
                  Profit
                </Text>
                <Text
                  style={[
                    styles.metricValue,
                    {
                      color:
                        entry.profit >= 0
                          ? colors.currentText
                          : colors.overdueText,
                    },
                  ]}
                >
                  ${entry.profit.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  yearBtn: {
    padding: 4,
  },
  yearText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    minWidth: 44,
    textAlign: 'center',
  },
  content: {
    padding: 16,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#6b7280',
  },
  rowCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  rowHeader: {
    marginBottom: 8,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  incomeText: {
    color: '#10b981',
  },
  expenseText: {
    color: '#ef4444',
  },
});
