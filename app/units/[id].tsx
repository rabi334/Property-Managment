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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!unit) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Unit not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Unit Details</Text>
        <View style={styles.headerActions}>
          {canManage && (
            <TouchableOpacity onPress={() => router.push(`/units/edit/${id}`)}>
              <Edit3 size={20} color="#2563eb" />
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
        <View style={styles.infoCard}>
          <Text style={styles.unitName}>{unit.unit_name}</Text>
          <Text style={styles.propertyName}>{unit.property?.name}</Text>

          <View style={styles.chipRow}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>
                {unit.rent_type.charAt(0).toUpperCase() +
                  unit.rent_type.slice(1)}{' '}
                rent
              </Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipText}>
                ${Number(unit.rent_amount).toFixed(2)}
              </Text>
            </View>
            <View
              style={[
                styles.chip,
                unit.status === 'occupied' && styles.chipOccupied,
                unit.status === 'vacant' && styles.chipVacant,
                unit.status === 'maintenance' && styles.chipMaintenance,
              ]}
            >
              <Text style={styles.chipText}>
                {unit.status.charAt(0).toUpperCase() + unit.status.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tenant</Text>
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
                <Text style={styles.linkText}>
                  {tenant ? 'View Tenant' : 'Add Tenant'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {!tenant ? (
            <View style={styles.emptyRow}>
              <User size={32} color="#d1d5db" />
              <Text style={styles.emptyText}>No tenant assigned</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.rowCard}
              onPress={() => router.push(`/tenants/${tenant.id}`)}
            >
              <View style={styles.iconCircle}>
                <User size={20} color="#2563eb" />
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle}>{tenant.full_name}</Text>
                <Text style={styles.rowSubtitle}>{tenant.phone}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Payments</Text>
            {canManage && (
              <TouchableOpacity
                onPress={() => router.push(`/payments/create?unitId=${id}`)}
              >
                <Text style={styles.linkText}>Record Payment</Text>
              </TouchableOpacity>
            )}
          </View>

          {payments.length === 0 ? (
            <View style={styles.emptyRow}>
              <DollarSign size={32} color="#d1d5db" />
              <Text style={styles.emptyText}>No payments recorded</Text>
            </View>
          ) : (
            payments.slice(0, 5).map((payment) => (
              <View key={payment.id} style={styles.rowCard}>
                <View style={styles.iconCircle}>
                  <DollarSign size={20} color="#10b981" />
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle}>
                    ${Number(payment.amount).toFixed(2)}
                  </Text>
                  <Text style={styles.rowSubtitle}>
                    {new Date(payment.payment_date).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Maintenance</Text>
            {canManage && (
              <TouchableOpacity
                onPress={() => router.push(`/maintenance/create?unitId=${id}`)}
              >
                <Text style={styles.linkText}>New Request</Text>
              </TouchableOpacity>
            )}
          </View>

          {maintenanceRequests.length === 0 ? (
            <View style={styles.emptyRow}>
              <Wrench size={32} color="#d1d5db" />
              <Text style={styles.emptyText}>No maintenance requests</Text>
            </View>
          ) : (
            maintenanceRequests.slice(0, 5).map((request) => (
              <TouchableOpacity
                key={request.id}
                style={styles.rowCard}
                onPress={() => router.push(`/maintenance/${request.id}`)}
              >
                <View style={styles.iconCircle}>
                  <Wrench size={20} color="#f59e0b" />
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle}>{request.title}</Text>
                  <Text style={styles.rowSubtitle}>{request.status}</Text>
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
