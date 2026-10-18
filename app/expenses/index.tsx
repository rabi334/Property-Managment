import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { expenseService } from '@/services/expense.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/hooks/useTheme';
import { Calendar, ChevronRight, Plus, Receipt } from 'lucide-react-native';

export default function ExpensesListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    propertyId?: string;
    from?: string;
    to?: string;
  }>();
  const { user } = useAuthStore();
  const { colors } = useTheme();

  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const canManage = user?.role === 'OWNER' || user?.role === 'MANAGER';

  useEffect(() => {
    loadData();
  }, [params.propertyId, params.from, params.to]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await expenseService.getAll({
        propertyId: params.propertyId,
        from: params.from,
        to: params.to,
      });
      setItems(data);
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

  if (isLoading && items.length === 0) {
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
          Expenses
        </Text>
        {canManage && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/expenses/create')}
          >
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => router.push(`/expenses/${item.id}` as any)}
          >
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: colors.overdueBg },
              ]}
            >
              <Receipt size={24} color={colors.overdueText} />
            </View>
            <View style={styles.info}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {item.description}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {item.property?.name} •{' '}
                {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
              </Text>
              <View style={styles.metaRow}>
                <Calendar size={12} color={colors.textSecondary} />
                <Text
                  style={[styles.metaText, { color: colors.textSecondary }]}
                >
                  {new Date(item.date).toLocaleDateString()}
                </Text>
              </View>
            </View>
            <View style={styles.amountContainer}>
              <Text style={[styles.amount, { color: colors.overdueText }]}>
                -${Number(item.amount).toFixed(2)}
              </Text>
              <ChevronRight size={20} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Receipt size={64} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No expenses recorded yet
            </Text>
          </View>
        }
      />
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
  listContent: { padding: 16, flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: { flex: 1, marginLeft: 12 },
  title: { fontSize: 16, fontWeight: '600' },
  subtitle: { fontSize: 13, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { fontSize: 12 },
  amountContainer: { alignItems: 'flex-end', marginLeft: 8, gap: 4 },
  amount: { fontSize: 15, fontWeight: '600' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: { fontSize: 16, marginTop: 16 },
});
