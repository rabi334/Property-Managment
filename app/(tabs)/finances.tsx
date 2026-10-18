import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { paymentService } from '@/services/payment.service';
import { expenseService } from '@/services/expense.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/hooks/useTheme';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
} from 'lucide-react-native';

export default function FinancesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [paymentsData, expensesData] = await Promise.all([
        paymentService.getAll(),
        expenseService.getAll(),
      ]);
      setPayments(paymentsData.slice(0, 10));
      setExpenses(expensesData.slice(0, 10));
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const canManage = user?.role === 'OWNER' || user?.role === 'MANAGER';

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
          Finances
        </Text>
        {canManage && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/payments/create')}
          >
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.summaryGrid}>
          <View
            style={[styles.summaryCard, { backgroundColor: colors.currentBg }]}
          >
            <TrendingUp size={24} color={colors.currentText} />
            <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
              ${totalPayments.toFixed(2)}
            </Text>
            <Text
              style={[styles.summaryLabel, { color: colors.textSecondary }]}
            >
              Recent income
            </Text>
          </View>
          <View
            style={[styles.summaryCard, { backgroundColor: colors.overdueBg }]}
          >
            <TrendingDown size={24} color={colors.overdueText} />
            <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
              ${totalExpenses.toFixed(2)}
            </Text>
            <Text
              style={[styles.summaryLabel, { color: colors.textSecondary }]}
            >
              Recent expenses
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Recent payments
            </Text>
            <TouchableOpacity onPress={() => router.push('/payments')}>
              <Text style={[styles.viewAllText, { color: colors.accent }]}>
                View all
              </Text>
            </TouchableOpacity>
          </View>
          {payments.length === 0 ? (
            <View style={styles.emptyState}>
              <DollarSign size={48} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No payments recorded
              </Text>
            </View>
          ) : (
            payments.map((payment) => (
              <View
                key={payment.id}
                style={[
                  styles.transactionCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View
                  style={[
                    styles.transactionIcon,
                    { backgroundColor: colors.currentBg },
                  ]}
                >
                  <TrendingUp size={20} color={colors.currentText} />
                </View>
                <View style={styles.transactionInfo}>
                  <Text
                    style={[
                      styles.transactionTitle,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {payment.tenant?.full_name ||
                      payment.unit?.unit_name ||
                      'Payment'}
                  </Text>
                  <View style={styles.transactionMeta}>
                    <Calendar size={12} color={colors.textSecondary} />
                    <Text
                      style={[
                        styles.transactionDate,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.transactionAmount,
                    { color: colors.currentText },
                  ]}
                >
                  +${Number(payment.amount).toFixed(2)}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Recent expenses
            </Text>
            <TouchableOpacity onPress={() => router.push('/expenses')}>
              <Text style={[styles.viewAllText, { color: colors.accent }]}>
                View all
              </Text>
            </TouchableOpacity>
          </View>
          {expenses.length === 0 ? (
            <View style={styles.emptyState}>
              <DollarSign size={48} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No expenses recorded
              </Text>
            </View>
          ) : (
            expenses.map((expense) => (
              <View
                key={expense.id}
                style={[
                  styles.transactionCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View
                  style={[
                    styles.transactionIcon,
                    { backgroundColor: colors.overdueBg },
                  ]}
                >
                  <TrendingDown size={20} color={colors.overdueText} />
                </View>
                <View style={styles.transactionInfo}>
                  <Text
                    style={[
                      styles.transactionTitle,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {expense.description}
                  </Text>
                  <View style={styles.transactionMeta}>
                    <Calendar size={12} color={colors.textSecondary} />
                    <Text
                      style={[
                        styles.transactionDate,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {new Date(expense.date).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.transactionAmount,
                    { color: colors.overdueText },
                  ]}
                >
                  -${Number(expense.amount).toFixed(2)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 24, fontWeight: '600' },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { padding: 16 },
  summaryGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center' },
  summaryValue: { fontSize: 20, fontWeight: '600', marginTop: 8 },
  summaryLabel: { fontSize: 12, marginTop: 4 },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  viewAllText: { fontSize: 14, fontWeight: '500' },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: { flex: 1, marginLeft: 12 },
  transactionTitle: { fontSize: 14, fontWeight: '500' },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  transactionDate: { fontSize: 12 },
  transactionAmount: { fontSize: 16, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 14, marginTop: 12 },
});
