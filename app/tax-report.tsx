import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { dashboardService } from '@/services/dashboard.service';

export default function TaxReportScreen() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [rows, setRows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [year]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await dashboardService.getTaxReport(year);
      setRows(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const totals = rows.reduce(
    (acc, row) => {
      acc.income += row.totalIncome;
      acc.tax += row.taxPayable;
      return acc;
    },
    { income: 0, tax: 0 },
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tax Report</Text>
        <View style={styles.yearSelector}>
          <TouchableOpacity
            style={styles.yearBtn}
            onPress={() => setYear((y) => y - 1)}
          >
            <ChevronLeft size={20} color="#2563eb" />
          </TouchableOpacity>
          <Text style={styles.yearText}>{year}</Text>
          <TouchableOpacity
            style={styles.yearBtn}
            onPress={() => setYear((y) => Math.min(y + 1, currentYear))}
            disabled={year >= currentYear}
          >
            <ChevronRight
              size={20}
              color={year >= currentYear ? '#d1d5db' : '#2563eb'}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Income</Text>
            <Text style={styles.summaryValue}>${totals.income.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Tax Payable</Text>
            <Text style={styles.summaryValue}>${totals.tax.toFixed(2)}</Text>
          </View>
        </View>

        {rows.map((row) => (
          <View key={row.propertyId} style={styles.rowCard}>
            <Text style={styles.propertyName}>{row.propertyName}</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Tax Rate</Text>
              <Text style={styles.value}>{row.taxRate}%</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Total Income</Text>
              <Text style={styles.value}>${row.totalIncome.toFixed(2)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Tax Payable</Text>
              <Text style={styles.value}>${row.taxPayable.toFixed(2)}</Text>
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
    backgroundColor: '#f9fafb',
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
    minWidth: 48,
    textAlign: 'center',
  },
  content: {
    padding: 16,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  rowCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  propertyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
});
