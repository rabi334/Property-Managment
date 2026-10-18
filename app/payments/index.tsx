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
import { paymentService } from '@/services/payment.service';
import { tenantService, RentStatusEntry } from '@/services/tenant.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/hooks/useTheme';
import {
  DollarSign,
  Calendar,
  ChevronRight,
  Plus,
  AlertCircle,
} from 'lucide-react-native';

type Tab = 'status' | 'history';

export default function PaymentsListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    propertyId?: string;
    from?: string;
    to?: string;
  }>();
  const { user } = useAuthStore();
  const { colors } = useTheme();

  const [tab, setTab] = useState<Tab>('status');
  const [statusItems, setStatusItems] = useState<RentStatusEntry[]>([]);
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const canManage = user?.role === 'OWNER' || user?.role === 'MANAGER';

  useEffect(() => {
    loadStatus();
    loadHistory();
  }, [params.propertyId, params.from, params.to]);

  const loadStatus = async () => {
    try {
      setIsStatusLoading(true);
      const data = await tenantService.getRentStatus();
      setStatusItems(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsStatusLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      setIsHistoryLoading(true);
      const data = await paymentService.getAll({
        propertyId: params.propertyId,
        from: params.from,
        to: params.to,
      });
      setHistoryItems(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadStatus(), loadHistory()]);
    setRefreshing(false);
  };

  const isLoading = tab === 'status' ? isStatusLoading : isHistoryLoading;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Payments
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

      <View style={[styles.tabRow, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[
            styles.tabBtn,
            {
              backgroundColor:
                tab === 'status' ? colors.accent : colors.background,
            },
          ]}
          onPress={() => setTab('status')}
        >
          <Text
            style={[
              styles.tabBtnText,
              { color: tab === 'status' ? '#fff' : colors.textSecondary },
            ]}
          >
            Rent Status
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabBtn,
            {
              backgroundColor:
                tab === 'history' ? colors.accent : colors.background,
            },
          ]}
          onPress={() => setTab('history')}
        >
          <Text
            style={[
              styles.tabBtnText,
              { color: tab === 'history' ? '#fff' : colors.textSecondary },
            ]}
          >
            History
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading &&
      (tab === 'status'
        ? statusItems.length === 0
        : historyItems.length === 0) ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : tab === 'status' ? (
        <FlatList
          data={statusItems}
          keyExtractor={(item) => item.tenant_id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.statusCard, { backgroundColor: colors.card }]}
              onPress={() => {
                if (!canManage) return;
                router.push(
                  `/payments/create?tenantId=${item.tenant_id}` as any,
                );
              }}
              activeOpacity={canManage ? 0.7 : 1}
            >
              <View style={styles.statusCardTop}>
                <View>
                  <Text
                    style={[styles.statusName, { color: colors.textPrimary }]}
                  >
                    {item.full_name}
                  </Text>
                  <Text
                    style={[styles.statusSub, { color: colors.textSecondary }]}
                  >
                    {item.unit_name} · {item.property_name}
                  </Text>
                </View>
                <StatusBadge
                  status={item.status}
                  daysOverdue={item.days_overdue}
                  colors={colors}
                />
              </View>

              {item.status !== 'no_history' ? (
                <View
                  style={[
                    styles.statusDetails,
                    { borderTopColor: colors.border },
                  ]}
                >
                  <View>
                    <Text
                      style={[
                        styles.detailLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Rent
                    </Text>
                    <Text
                      style={[
                        styles.detailValue,
                        { color: colors.textPrimary },
                      ]}
                    >
                      ${item.rent_amount.toFixed(2)} /{' '}
                      {item.rent_type === 'yearly' ? 'yr' : 'mo'}
                    </Text>
                  </View>
                  <View>
                    <Text
                      style={[
                        styles.detailLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Last payment
                    </Text>
                    <Text
                      style={[
                        styles.detailValue,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {item.last_payment_date
                        ? new Date(item.last_payment_date).toLocaleDateString()
                        : '—'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={[
                        styles.detailLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Paid through
                    </Text>
                    <Text
                      style={[
                        styles.detailValue,
                        {
                          color:
                            item.status === 'overdue'
                              ? colors.overdueText
                              : colors.textPrimary,
                        },
                      ]}
                    >
                      {item.paid_through_date
                        ? new Date(item.paid_through_date).toLocaleDateString()
                        : '—'}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text
                  style={[
                    styles.noHistoryText,
                    { color: colors.textSecondary },
                  ]}
                >
                  No payments recorded yet
                </Text>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <DollarSign size={64} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No active tenants
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={historyItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card }]}
              onPress={() => router.push(`/payments/${item.id}` as any)}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: colors.currentBg },
                ]}
              >
                <DollarSign size={24} color={colors.currentText} />
              </View>
              <View style={styles.info}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  ${Number(item.amount).toFixed(2)}
                </Text>
                <Text
                  style={[styles.subtitle, { color: colors.textSecondary }]}
                >
                  {item.tenant?.full_name ?? 'Unknown tenant'} ·{' '}
                  {item.unit?.unit_name} · {item.unit?.property?.name}
                </Text>
                <View style={styles.metaRow}>
                  <Calendar size={12} color={colors.textSecondary} />
                  <Text
                    style={[styles.metaText, { color: colors.textSecondary }]}
                  >
                    {new Date(item.payment_date).toLocaleDateString()}
                  </Text>
                  <Text
                    style={[styles.metaDot, { color: colors.textSecondary }]}
                  >
                    •
                  </Text>
                  <Text
                    style={[styles.metaText, { color: colors.textSecondary }]}
                  >
                    {item.payment_method.charAt(0).toUpperCase() +
                      item.payment_method.slice(1)}
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <DollarSign size={64} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No payments recorded yet
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function StatusBadge({
  status,
  daysOverdue,
  colors,
}: {
  status: RentStatusEntry['status'];
  daysOverdue: number;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  if (status === 'no_history') {
    return (
      <View style={[styles.badge, { backgroundColor: colors.card }]}>
        <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
          No history
        </Text>
      </View>
    );
  }
  if (status === 'overdue') {
    return (
      <View style={[styles.badge, { backgroundColor: colors.overdueBg }]}>
        <AlertCircle size={12} color={colors.overdueText} />
        <Text style={[styles.badgeText, { color: colors.overdueText }]}>
          {daysOverdue}d overdue
        </Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, { backgroundColor: colors.currentBg }]}>
      <Text style={[styles.badgeText, { color: colors.currentText }]}>
        Current
      </Text>
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
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  tabBtnText: { fontSize: 13, fontWeight: '500' },
  listContent: { padding: 16, flexGrow: 1 },
  statusCard: { borderRadius: 14, padding: 16, marginBottom: 12 },
  statusCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusName: { fontSize: 15, fontWeight: '500' },
  statusSub: { fontSize: 12, marginTop: 3 },
  statusDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
  },
  detailLabel: { fontSize: 11, marginBottom: 2 },
  detailValue: { fontSize: 13, fontWeight: '500' },
  noHistoryText: { fontSize: 13, marginTop: 12 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: { fontSize: 11, fontWeight: '500' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
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
  metaDot: { fontSize: 12 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: { fontSize: 16, marginTop: 16 },
});
