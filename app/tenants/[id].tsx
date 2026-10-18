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
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { tenantService } from '@/services/tenant.service';
import { useAuthStore } from '@/stores/authStore';
import { Button } from 'react-native';
import {
  ArrowLeft,
  Phone,
  IdCard,
  DollarSign,
  Trash2,
  CreditCard as Edit,
  Calendar,
  LogOut,
} from 'lucide-react-native';

export default function TenantDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();

  const [tenant, setTenant] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEndingTenancy, setIsEndingTenancy] = useState(false);

  const canManage = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const canDelete = user?.role === 'OWNER';

  useEffect(() => {
    if (id) {
      loadTenant();
    }
  }, [id]);

  const loadTenant = async () => {
    try {
      setIsLoading(true);
      const data = await tenantService.getById(id as string);
      setTenant(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load tenant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndTenancy = async () => {
    if (!id) return;

    const confirmed = await confirmAction(
      'Mark as Moved Out',
      'This will end the tenancy and mark the unit as vacant. Payment history will be preserved. Continue?',
    );
    if (!confirmed) return;

    try {
      setIsEndingTenancy(true);
      await tenantService.update(id as string, { status: 'past' });
      await loadTenant();
      if (Platform.OS === 'web') {
        window.alert('Tenant marked as moved out. The unit is now vacant.');
      } else {
        Alert.alert(
          'Done',
          'Tenant marked as moved out. The unit is now vacant.',
        );
      }
    } catch (error: any) {
      const msg = error.message || 'Failed to update tenancy status';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
    } finally {
      setIsEndingTenancy(false);
    }
  };

  const handleDelete = async () => {
    if (!id) {
      const msg = 'Missing tenant ID. Please reopen this tenant and try again.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
      return;
    }
    if (!canDelete) {
      const msg = 'Only owners can delete tenants.';
      Platform.OS === 'web'
        ? window.alert(msg)
        : Alert.alert('Permission denied', msg);
      return;
    }

    const confirmed = await confirmAction(
      'Delete Tenant',
      'Are you sure you want to delete this tenant record?',
    );
    if (!confirmed) return;

    try {
      await tenantService.delete(id as string);
      if (Platform.OS === 'web') {
        window.alert('Tenant deleted successfully.');
        router.back();
      } else {
        Alert.alert('Deleted', 'Tenant deleted successfully.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (error: any) {
      const msg = error.message || 'Failed to delete tenant';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!tenant) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Tenant not found</Text>
      </View>
    );
  }

  const isActive = tenant.status === 'active';
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tenant Details</Text>
        <View style={styles.headerActions}>
          {canManage && (
            <TouchableOpacity
              onPress={() => router.push(`/tenants/edit/${id}`)}
              style={{ marginRight: 12 }}
            >
              <Edit size={20} color="#2563eb" />
            </TouchableOpacity>
          )}
          {canDelete && (
            <TouchableOpacity onPress={handleDelete}>
              <Trash2 size={20} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{tenant.full_name}</Text>
            <View
              style={[
                styles.statusBadge,
                isActive ? styles.badgeActive : styles.badgePast,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  isActive ? styles.badgeTextActive : styles.badgeTextPast,
                ]}
              >
                {isActive ? 'Active' : 'Past'}
              </Text>
            </View>
          </View>

          {tenant.unit && (
            <Text style={styles.subtitle}>
              {tenant.unit.unit_name} • {tenant.unit.property?.name}
            </Text>
          )}

          <View style={styles.row}>
            <Phone size={16} color="#6b7280" />
            <Text style={styles.rowText}>{tenant.phone}</Text>
          </View>

          <View style={styles.row}>
            <IdCard size={16} color="#6b7280" />
            <Text style={styles.rowText}>{tenant.id_number}</Text>
          </View>

          {tenant.emergency_contact && (
            <View style={styles.row}>
              <Phone size={16} color="#6b7280" />
              <Text style={styles.rowText}>{tenant.emergency_contact}</Text>
            </View>
          )}

          <View style={styles.row}>
            <DollarSign size={16} color="#6b7280" />
            <Text style={styles.rowText}>
              Deposit: ${Number(tenant.deposit_amount).toFixed(2)}
            </Text>
          </View>

          {(tenant.lease_start_date || tenant.lease_end_date) && (
            <View style={styles.row}>
              <Calendar size={16} color="#6b7280" />
              <Text style={styles.rowText}>
                Lease:{' '}
                {tenant.lease_start_date
                  ? new Date(tenant.lease_start_date).toLocaleDateString()
                  : 'Start N/A'}{' '}
                -{' '}
                {tenant.lease_end_date
                  ? new Date(tenant.lease_end_date).toLocaleDateString()
                  : 'End N/A'}
              </Text>
            </View>
          )}
        </View>

        {canManage && isActive && (
          <TouchableOpacity
            style={[
              styles.endTenancyButton,
              isEndingTenancy && styles.buttonDisabled,
            ]}
            onPress={handleEndTenancy}
            disabled={isEndingTenancy}
          >
            {isEndingTenancy ? (
              <ActivityIndicator color="#dc2626" />
            ) : (
              <>
                <LogOut size={18} color="#dc2626" />
                <Text style={styles.endTenancyText}>Mark as Moved Out</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#6b7280' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  content: { flex: 1, padding: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: { fontSize: 22, fontWeight: '700', color: '#111827' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeActive: { backgroundColor: '#ecfdf5' },
  badgePast: { backgroundColor: '#f3f4f6' },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },
  badgeTextActive: { color: '#059669' },
  badgeTextPast: { color: '#6b7280' },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  rowText: { fontSize: 14, color: '#374151' },
  endTenancyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 16,
  },
  endTenancyText: { color: '#dc2626', fontSize: 15, fontWeight: '600' },
  buttonDisabled: { opacity: 0.6 },
});
