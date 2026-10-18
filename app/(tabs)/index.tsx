import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDashboardStore } from '@/stores/dashboardStore';
import { useAuthStore } from '@/stores/authStore';
import { usePropertyStore } from '@/stores/propertyStore';
import { useTheme } from '@/hooks/useTheme';
import { dashboardService, ExpiringLease } from '@/services/dashboard.service';
import {
  TrendingUp,
  TrendingDown,
  Building2,
  Hop as Home,
  DollarSign,
  CircleAlert as AlertCircle,
  CalendarClock,
  Phone,
  ChevronRight,
} from 'lucide-react-native';

export default function DashboardScreen() {
  const router = useRouter();
  const { stats, isLoading, fetchStats } = useDashboardStore();
  const { user } = useAuthStore();
  const { properties, fetchProperties } = usePropertyStore();
  const { colors } = useTheme();

  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    null,
  );
  type PeriodRange = 'month' | 'year' | 'all';
  const [range, setRange] = useState<PeriodRange>('month');
  const [expiringLeases, setExpiringLeases] = useState<ExpiringLease[]>([]);
  const [isExpiringLoading, setIsExpiringLoading] = useState(false);

  const dateRange = useMemo<{ from?: string; to?: string }>(() => {
    if (range === 'all') {
      return {};
    }
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    if (range === 'year') {
      return { from: `${year}-01-01`, to: `${year}-12-31` };
    }
    const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { from, to };
  }, [range]);

  useEffect(() => {
    fetchProperties().catch(() => {});
  }, []);

  useEffect(() => {
    fetchStats({
      propertyId: selectedPropertyId || undefined,
      from: dateRange.from,
      to: dateRange.to,
    });
  }, [selectedPropertyId, dateRange.from, dateRange.to]);

  useEffect(() => {
    loadExpiringLeases();
  }, [selectedPropertyId]);

  const loadExpiringLeases = async () => {
    try {
      setIsExpiringLoading(true);
      const data = await dashboardService.getExpiringLeases(30, {
        propertyId: selectedPropertyId || undefined,
      });
      setExpiringLeases(data);
    } catch {
      setExpiringLeases([]);
    } finally {
      setIsExpiringLoading(false);
    }
  };

  const onRefresh = () => {
    fetchStats({
      propertyId: selectedPropertyId || undefined,
      from: dateRange.from,
      to: dateRange.to,
    });
    loadExpiringLeases();
  };

  // Urgency ramp: overdueBg/Text for urgent, accent-tinted for warning, currentBg/Text for soon.
  function expiryColors(daysLeft: number) {
    if (daysLeft <= 7)
      return { bg: colors.overdueBg, text: colors.overdueText };
    if (daysLeft <= 14) return { bg: colors.card, text: colors.accent };
    return { bg: colors.currentBg, text: colors.currentText };
  }

  if (isLoading && !stats) {
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
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
      }
    >
      <View
        style={[
          styles.header,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>
            Welcome back,
          </Text>
          <Text style={[styles.userName, { color: colors.textPrimary }]}>
            {user?.full_name}
          </Text>
        </View>
        <View
          style={[styles.roleContainer, { backgroundColor: colors.currentBg }]}
        >
          <Text style={[styles.roleText, { color: colors.currentText }]}>
            {user?.role}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.filtersCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.filtersTitle, { color: colors.textPrimary }]}>
          Filters
        </Text>

        <Text style={[styles.filtersLabel, { color: colors.textSecondary }]}>
          Property
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <TouchableOpacity
            style={[
              styles.chip,
              {
                borderColor: colors.border,
                backgroundColor:
                  selectedPropertyId === null ? colors.accent : colors.card,
              },
            ]}
            onPress={() => setSelectedPropertyId(null)}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color:
                    selectedPropertyId === null ? '#fff' : colors.textSecondary,
                },
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {properties.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.chip,
                {
                  borderColor: colors.border,
                  backgroundColor:
                    selectedPropertyId === p.id ? colors.accent : colors.card,
                },
              ]}
              onPress={() => setSelectedPropertyId(p.id)}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color:
                      selectedPropertyId === p.id
                        ? '#fff'
                        : colors.textSecondary,
                  },
                ]}
              >
                {p.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.filtersLabel, { color: colors.textSecondary }]}>
          Period
        </Text>
        <View style={styles.chipRow}>
          <TouchableOpacity
            style={[
              styles.chip,
              {
                borderColor: colors.border,
                backgroundColor:
                  range === 'month' ? colors.accent : colors.card,
              },
            ]}
            onPress={() => setRange('month')}
          >
            <Text
              style={[
                styles.chipText,
                { color: range === 'month' ? '#fff' : colors.textSecondary },
              ]}
            >
              This month
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.chip,
              {
                borderColor: colors.border,
                backgroundColor: range === 'year' ? colors.accent : colors.card,
              },
            ]}
            onPress={() => setRange('year')}
          >
            <Text
              style={[
                styles.chipText,
                { color: range === 'year' ? '#fff' : colors.textSecondary },
              ]}
            >
              This year
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.chip,
              {
                borderColor: colors.border,
                backgroundColor: range === 'all' ? colors.accent : colors.card,
              },
            ]}
            onPress={() => setRange('all')}
          >
            <Text
              style={[
                styles.chipText,
                { color: range === 'all' ? '#fff' : colors.textSecondary },
              ]}
            >
              All time
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.currentBg, borderColor: colors.border },
          ]}
        >
          <Building2 size={24} color={colors.accent} />
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {stats?.totalProperties || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Total properties
          </Text>
        </View>
        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.currentBg, borderColor: colors.border },
          ]}
        >
          <Home size={24} color={colors.accent} />
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {stats?.totalUnits || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Total units
          </Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.badge, { backgroundColor: colors.currentBg }]}>
            <Text style={[styles.badgeText, { color: colors.currentText }]}>
              Occupied
            </Text>
          </View>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {stats?.occupiedUnits || 0}
          </Text>
        </View>
        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.badge, { backgroundColor: colors.card }]}>
            <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
              Vacant
            </Text>
          </View>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {stats?.vacantUnits || 0}
          </Text>
        </View>
        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.badge, { backgroundColor: colors.overdueBg }]}>
            <Text style={[styles.badgeText, { color: colors.overdueText }]}>
              Maintenance
            </Text>
          </View>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {stats?.maintenanceUnits || 0}
          </Text>
        </View>
      </View>

      {(expiringLeases.length > 0 || isExpiringLoading) && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <CalendarClock size={18} color={colors.accent} />
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.textPrimary, marginBottom: 0 },
                ]}
              >
                Expiring leases
              </Text>
            </View>
            <View
              style={[styles.expiringBadge, { backgroundColor: colors.card }]}
            >
              <Text
                style={[
                  styles.expiringBadgeText,
                  { color: colors.textSecondary },
                ]}
              >
                {isExpiringLoading
                  ? '…'
                  : `${expiringLeases.length} within 30 days`}
              </Text>
            </View>
          </View>

          {isExpiringLoading ? (
            <View style={styles.expiringLoading}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          ) : (
            expiringLeases.map((lease) => {
              const ec = expiryColors(lease.days_left);
              return (
                <TouchableOpacity
                  key={lease.id}
                  style={[
                    styles.expiringCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderLeftColor: ec.text,
                    },
                  ]}
                  onPress={() => router.push(`/units/${lease.id}`)}
                >
                  <View style={styles.expiringCardTop}>
                    <View style={styles.expiringCardLeft}>
                      <Text
                        style={[
                          styles.expiringUnitName,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {lease.unit_name}
                      </Text>
                      <Text
                        style={[
                          styles.expiringPropertyName,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {lease.property.name}
                      </Text>
                    </View>
                    <View
                      style={[styles.daysLeftBadge, { backgroundColor: ec.bg }]}
                    >
                      <Text style={[styles.daysLeftText, { color: ec.text }]}>
                        {lease.days_left === 0
                          ? 'Today'
                          : lease.days_left === 1
                            ? '1 day left'
                            : `${lease.days_left} days left`}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.expiringMeta}>
                    <CalendarClock size={13} color={colors.textSecondary} />
                    <Text
                      style={[
                        styles.expiringMetaText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Expires{' '}
                      {new Date(lease.lease_end_date).toLocaleDateString(
                        'en-US',
                        { month: 'short', day: 'numeric', year: 'numeric' },
                      )}
                    </Text>
                  </View>

                  {lease.tenant && (
                    <View style={styles.expiringTenantRow}>
                      <View style={styles.expiringMeta}>
                        <Home size={13} color={colors.textSecondary} />
                        <Text
                          style={[
                            styles.expiringMetaText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {lease.tenant.full_name}
                        </Text>
                      </View>
                      <View style={styles.expiringMeta}>
                        <Phone size={13} color={colors.textSecondary} />
                        <Text
                          style={[
                            styles.expiringMetaText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {lease.tenant.phone}
                        </Text>
                      </View>
                    </View>
                  )}

                  <ChevronRight
                    size={16}
                    color={colors.textSecondary}
                    style={styles.expiringChevron}
                  />
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Financial overview
        </Text>

        <TouchableOpacity
          style={[
            styles.financeCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => {
            const queryParts = [
              dateRange.from ? `from=${dateRange.from}` : null,
              dateRange.to ? `to=${dateRange.to}` : null,
              selectedPropertyId ? `propertyId=${selectedPropertyId}` : null,
            ].filter(Boolean);
            const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
            router.push(`/payments${qs}` as any);
          }}
        >
          <View style={styles.financeRow}>
            <View
              style={[
                styles.financeIcon,
                { backgroundColor: colors.currentBg },
              ]}
            >
              <TrendingUp size={20} color={colors.currentText} />
            </View>
            <View style={styles.financeInfo}>
              <Text
                style={[styles.financeLabel, { color: colors.textSecondary }]}
              >
                {range === 'month'
                  ? 'Monthly income'
                  : range === 'year'
                    ? 'Yearly income'
                    : 'Total income'}
              </Text>
              <Text
                style={[styles.financeValue, { color: colors.currentText }]}
              >
                ${stats?.monthlyIncome.toFixed(2) || '0.00'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.financeCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => {
            const queryParts = [
              dateRange.from ? `from=${dateRange.from}` : null,
              dateRange.to ? `to=${dateRange.to}` : null,
              selectedPropertyId ? `propertyId=${selectedPropertyId}` : null,
            ].filter(Boolean);
            const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
            router.push(`/expenses${qs}` as any);
          }}
        >
          <View style={styles.financeRow}>
            <View
              style={[
                styles.financeIcon,
                { backgroundColor: colors.overdueBg },
              ]}
            >
              <TrendingDown size={20} color={colors.overdueText} />
            </View>
            <View style={styles.financeInfo}>
              <Text
                style={[styles.financeLabel, { color: colors.textSecondary }]}
              >
                {range === 'month'
                  ? 'Monthly expenses'
                  : range === 'year'
                    ? 'Yearly expenses'
                    : 'Total expenses'}
              </Text>
              <Text
                style={[styles.financeValue, { color: colors.overdueText }]}
              >
                ${stats?.monthlyExpenses.toFixed(2) || '0.00'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <View
          style={[
            styles.financeCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.financeRow}>
            <View
              style={[
                styles.financeIcon,
                { backgroundColor: colors.currentBg },
              ]}
            >
              <DollarSign size={20} color={colors.accent} />
            </View>
            <View style={styles.financeInfo}>
              <Text
                style={[styles.financeLabel, { color: colors.textSecondary }]}
              >
                Net profit
              </Text>
              <Text
                style={[
                  styles.financeValue,
                  {
                    color:
                      (stats?.netProfit || 0) >= 0
                        ? colors.currentText
                        : colors.overdueText,
                  },
                ]}
              >
                ${stats?.netProfit.toFixed(2) || '0.00'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.financeCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => router.push('/tax-report')}
        >
          <View style={styles.financeRow}>
            <View
              style={[styles.financeIcon, { backgroundColor: colors.card }]}
            >
              <AlertCircle size={20} color={colors.accent} />
            </View>
            <View style={styles.financeInfo}>
              <Text
                style={[styles.financeLabel, { color: colors.textSecondary }]}
              >
                Tax payable
              </Text>
              <Text style={[styles.financeValue, { color: colors.accent }]}>
                ${stats?.taxPayable.toFixed(2) || '0.00'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {stats && stats.monthlyIncome === 0 && stats.monthlyExpenses === 0 && (
          <View
            style={[
              styles.emptyPeriodBanner,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.emptyPeriodText,
                { color: colors.textSecondary },
              ]}
            >
              No transactions recorded for {range === 'month' ? 'this month' : range === 'year' ? 'this year' : 'this period'}. Switch period filter above to view historical records.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  greeting: { fontSize: 14 },
  userName: { fontSize: 24, fontWeight: '600', marginTop: 4 },
  roleContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleText: { fontSize: 12, fontWeight: '500' },
  filtersCard: {
    margin: 16,
    marginBottom: 0,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  filtersTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  filtersLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 8,
  },
  chipRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: '500' },
  statsGrid: { flexDirection: 'row', padding: 16, gap: 12 },
  statCard: { flex: 1, borderRadius: 14, padding: 16, borderWidth: 1 },
  statValue: { fontSize: 28, fontWeight: '600', marginTop: 8 },
  statLabel: { fontSize: 12, marginTop: 4 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  badgeText: { fontSize: 10, fontWeight: '500' },
  section: { padding: 16 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  expiringBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  expiringBadgeText: { fontSize: 11, fontWeight: '500' },
  expiringLoading: { paddingVertical: 24, alignItems: 'center' },
  expiringCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  expiringCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  expiringCardLeft: { flex: 1, marginRight: 10 },
  expiringUnitName: { fontSize: 15, fontWeight: '600' },
  expiringPropertyName: { fontSize: 13, marginTop: 2 },
  daysLeftBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  daysLeftText: { fontSize: 12, fontWeight: '600' },
  expiringMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  expiringMetaText: { fontSize: 13 },
  expiringTenantRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  expiringChevron: { position: 'absolute', right: 14, bottom: 14 },
  financeCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  financeRow: { flexDirection: 'row', alignItems: 'center' },
  financeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  financeInfo: { marginLeft: 12, flex: 1 },
  financeLabel: { fontSize: 14 },
  financeValue: { fontSize: 20, fontWeight: '600', marginTop: 4 },
  emptyPeriodBanner: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 12,
    alignItems: 'center',
  },
  emptyPeriodText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
