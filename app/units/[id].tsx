import { useEffect, useState } from 'react';
import { confirmAction, notify } from '@/lib/platformAlert';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { unitService } from '@/services/unit.service';
import { tenantService } from '@/services/tenant.service';
import { paymentService } from '@/services/payment.service';
import { maintenanceService } from '@/services/maintenance.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/hooks/useTheme';
import {
  ArrowLeft,
  Edit3,
  Trash2,
  User,
  DollarSign,
  Wrench,
} from 'lucide-react-native';

export default function UnitDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { colors } = useTheme();

  const [unit, setUnit] = useState<any>(null);
  const [tenant, setTenant] = useState<any | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const canManage = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const canDelete = user?.role === 'OWNER';

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [unitData, tenantData, paymentsData, maintenanceData] =
        await Promise.all([
          unitService.getById(id as string),
          tenantService.getByUnitId(id as string),
          paymentService.getByUnitId(id as string),
          maintenanceService.getByUnitId(id as string),
        ]);

      setUnit(unitData);
      setTenant(tenantData || null);
      setPayments(paymentsData || []);
      setMaintenanceRequests(maintenanceData || []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load unit details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) {
      notify(
        'Error',
        'Missing unit ID. Please reopen this unit and try again.',
      );
      return;
    }

    if (!canDelete) {
      notify('Permission denied', 'Only owners can delete units.');
      return;
    }

    const confirmed = await confirmAction(
      'Delete Unit',
      'Are you sure you want to delete this unit? This action cannot be undone.',
    );
    if (!confirmed) return;

    try {
      await unitService.delete(id as string);
      notify('Deleted', 'Unit deleted successfully.');
      router.back(); // fires immediately after notify on web; after dismissal isn't guaranteed either way since Alert doesn't block
    } catch (error: any) {
      notify('Error', error.message || 'Failed to delete unit');
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

  if (!unit) {
    return (
      <View
        style={[
          styles.errorContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Unit not found
        </Text>
      </View>
    );
  }

  const isOccupied = unit.status === 'occupied';
  const isMaintenance = unit.status === 'maintenance';
  const statusBadgeBg = isOccupied
    ? colors.currentBg
    : isMaintenance
      ? colors.overdueBg
      : colors.background;
  const statusBadgeColor = isOccupied
    ? colors.currentText
    : isMaintenance
      ? colors.overdueText
      : colors.textSecondary;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Unit Details
        </Text>
        <View style={styles.headerActions}>
          {canManage && (
            <TouchableOpacity onPress={() => router.push(`/units/edit/${id}`)}>
              <Edit3 size={20} color={colors.accent} />
            </TouchableOpacity>
          )}
          {canDelete && (
            <TouchableOpacity onPress={handleDelete} style={{ marginLeft: 16 }}>
              <Trash2 size={20} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View
          style={[
            styles.infoCard,
            { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
          ]}
        >
          <Text style={[styles.unitName, { color: colors.textPrimary }]}>
            {unit.unit_name}
          </Text>
          <Text style={[styles.propertyName, { color: colors.textSecondary }]}>
            {unit.property?.name}
          </Text>

          <View style={styles.chipRow}>
            <View
              style={[
                styles.chip,
                { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 },
              ]}
            >
              <Text style={[styles.chipText, { color: colors.textSecondary }]}>
                {unit.rent_type.charAt(0).toUpperCase() +
                  unit.rent_type.slice(1)}{' '}
                rent
              </Text>
            </View>
            <View
              style={[
                styles.chip,
                { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 },
              ]}
            >
              <Text style={[styles.chipText, { color: colors.textSecondary }]}>
                ${Number(unit.rent_amount).toFixed(2)}
              </Text>
            </View>
            <View
              style={[
                styles.chip,
                { backgroundColor: statusBadgeBg },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: statusBadgeColor, fontWeight: '600' },
                ]}
              >
                {unit.status.charAt(0).toUpperCase() + unit.status.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Tenant
            </Text>
            {canManage && (
              <TouchableOpacity
                onPress={() =>
                  router.push(
                    tenant
                      ? `/tenants/${tenant.id}`
                      : `/tenants/create?unitId=${id}`,
                  )
                }
              >
                <Text style={[styles.linkText, { color: colors.accent }]}>
                  {tenant ? 'View Tenant' : 'Add Tenant'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {!tenant ? (
            <View style={styles.emptyRow}>
              <User size={32} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No tenant assigned
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.rowCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => router.push(`/tenants/${tenant.id}`)}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: colors.currentBg },
                ]}
              >
                <User size={20} color={colors.currentText} />
              </View>
              <View style={styles.rowInfo}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                  {tenant.full_name}
                </Text>
                <Text
                  style={[styles.rowSubtitle, { color: colors.textSecondary }]}
                >
                  {tenant.phone}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Recent Payments
            </Text>
            {canManage && (
              <TouchableOpacity
                onPress={() => router.push(`/payments/create?unitId=${id}`)}
              >
                <Text style={[styles.linkText, { color: colors.accent }]}>
                  Record Payment
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {payments.length === 0 ? (
            <View style={styles.emptyRow}>
              <DollarSign size={32} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No payments recorded
              </Text>
            </View>
          ) : (
            payments.slice(0, 5).map((payment) => (
              <View
                key={payment.id}
                style={[
                  styles.rowCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: colors.currentBg },
                  ]}
                >
                  <DollarSign size={20} color={colors.currentText} />
                </View>
                <View style={styles.rowInfo}>
                  <Text
                    style={[styles.rowTitle, { color: colors.textPrimary }]}
                  >
                    ${Number(payment.amount).toFixed(2)}
                  </Text>
                  <Text
                    style={[
                      styles.rowSubtitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {new Date(payment.payment_date).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Maintenance
            </Text>
            {canManage && (
              <TouchableOpacity
                onPress={() => router.push(`/maintenance/create?unitId=${id}`)}
              >
                <Text style={[styles.linkText, { color: colors.accent }]}>
                  New Request
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {maintenanceRequests.length === 0 ? (
            <View style={styles.emptyRow}>
              <Wrench size={32} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No maintenance requests
              </Text>
            </View>
          ) : (
            maintenanceRequests.slice(0, 5).map((request) => (
              <TouchableOpacity
                key={request.id}
                style={[
                  styles.rowCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => router.push(`/maintenance/${request.id}`)}
              >
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: colors.overdueBg },
                  ]}
                >
                  <Wrench size={20} color={colors.overdueText} />
                </View>
                <View style={styles.rowInfo}>
                  <Text
                    style={[styles.rowTitle, { color: colors.textPrimary }]}
                  >
                    {request.title}
                  </Text>
                  <Text
                    style={[
                      styles.rowSubtitle,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {request.status}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
  },
  unitName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  propertyName: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    textTransform: 'capitalize',
  },
  chipOccupied: {
    backgroundColor: '#d1fae5',
  },
  chipVacant: {
    backgroundColor: '#fef3c7',
  },
  chipMaintenance: {
    backgroundColor: '#fee2e2',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  emptyRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowInfo: {
    flex: 1,
    marginLeft: 12,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  rowSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
});
