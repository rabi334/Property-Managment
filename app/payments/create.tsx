import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { PaymentMethod } from '@/types/database';
import { paymentService } from '@/services/payment.service';
import { tenantService } from '@/services/tenant.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/hooks/useTheme';
import DatePickerInput from '@/components/DatePickerInput';
import { ArrowLeft, ChevronDown, User, Search, X } from 'lucide-react-native';

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'bank', 'mobile'];

export default function CreatePaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tenantId?: string; unitId?: string }>();
  const { user } = useAuthStore();
  const { colors } = useTheme();

  const [tenant, setTenant] = useState<any | null>(null);
  const [isTenantLoading, setIsTenantLoading] = useState(false);

  const [allTenants, setAllTenants] = useState<any[]>([]);
  const [isTenantsLoading, setIsTenantsLoading] = useState(false);
  const [tenantPickerVisible, setTenantPickerVisible] = useState(false);
  const [tenantSearch, setTenantSearch] = useState('');

  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const canManage = user?.role === 'OWNER' || user?.role === 'MANAGER';

  useEffect(() => {
    if (params.tenantId) {
      loadTenant(params.tenantId);
    } else if (params.unitId) {
      // Came from a unit context (e.g. a unit's detail page) — look up
      // that unit's current active tenant instead of asking again.
      loadTenantForUnit(params.unitId);
    } else {
      loadActiveTenants();
    }
  }, [params.tenantId, params.unitId]);

  const loadTenant = async (id: string) => {
    try {
      setIsTenantLoading(true);
      const data = await tenantService.getById(id);
      setTenant(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load tenant');
    } finally {
      setIsTenantLoading(false);
    }
  };

  const loadTenantForUnit = async (unitId: string) => {
    try {
      setIsTenantLoading(true);
      const data = await tenantService.getByUnitId(unitId); // GET /tenants/by-unit/:unitId
      if (!data) {
        Alert.alert(
          'No active tenant',
          'This unit has no active tenant, so a payment cannot be recorded against it.',
          [{ text: 'OK', onPress: () => router.back() }],
        );
        return;
      }
      setTenant(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load tenant for unit');
    } finally {
      setIsTenantLoading(false);
    }
  };

  const loadActiveTenants = async () => {
    try {
      setIsTenantsLoading(true);
      const data = await tenantService.getAll();
      setAllTenants(data.filter((t: any) => t.status === 'active'));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load tenants');
    } finally {
      setIsTenantsLoading(false);
    }
  };

  const filteredTenants = allTenants.filter((t) => {
    const q = tenantSearch.toLowerCase();
    return (
      t.full_name?.toLowerCase().includes(q) ||
      t.unit?.unit_name?.toLowerCase().includes(q) ||
      t.unit?.property?.name?.toLowerCase().includes(q)
    );
  });

  const handleSelectTenant = (selected: any) => {
    setTenant(selected);
    setTenantPickerVisible(false);
    setTenantSearch('');
  };

  const handleSubmit = async () => {
    if (!canManage) {
      Alert.alert(
        'Permission denied',
        'You do not have permission to record payments.',
      );
      return;
    }
    if (!tenant) {
      Alert.alert('Error', 'Please select a tenant for this payment.');
      return;
    }
    if (!amount || !paymentDate) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    const amountNum = parseFloat(amount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Amount must be a positive number');
      return;
    }

    try {
      setIsLoading(true);
      await paymentService.create({
        tenant_id: tenant.id,
        amount: amountNum,
        payment_date: paymentDate,
        payment_method: method,
        notes: notes || undefined,
      });
      Alert.alert('Success', 'Payment recorded successfully');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to record payment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Record Payment</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Tenant *</Text>
          {isTenantLoading || isTenantsLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          ) : tenant ? (
            <TouchableOpacity
              style={[styles.tenantCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() =>
                !params.tenantId &&
                !params.unitId &&
                setTenantPickerVisible(true)
              }
              activeOpacity={params.tenantId || params.unitId ? 1 : 0.7}
            >
              <View style={styles.tenantCardLeft}>
                <View style={[styles.tenantIconCircle, { backgroundColor: colors.background }]}>
                  <User size={18} color={colors.accent} />
                </View>
                <View>
                  <Text style={[styles.tenantCardTitle, { color: colors.textPrimary }]}>{tenant.full_name}</Text>
                  <Text style={[styles.tenantCardSub, { color: colors.textSecondary }]}>
                    {tenant.unit?.unit_name ?? ''} •{' '}
                    {tenant.unit?.property?.name ?? ''}
                  </Text>
                  {tenant.unit?.rent_amount != null && (
                    <Text style={[styles.tenantCardSub, { color: colors.textSecondary }]}>
                      Rent: ${Number(tenant.unit.rent_amount).toFixed(2)} /{' '}
                      {tenant.unit.rent_type}
                    </Text>
                  )}
                </View>
              </View>
              {!params.tenantId && !params.unitId && (
                <ChevronDown size={18} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.tenantPickerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setTenantPickerVisible(true)}
            >
              <User size={18} color={colors.textSecondary} />
              <Text style={[styles.tenantPickerBtnText, { color: colors.textSecondary }]}>Select a tenant</Text>
              <ChevronDown size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Amount *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
            placeholder="Enter amount"
            placeholderTextColor={colors.textSecondary}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Payment Date *</Text>
          <DatePickerInput
            value={paymentDate}
            onChange={setPaymentDate}
            placeholder="Select payment date"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Payment Method *</Text>
          <View style={styles.chipGroup}>
            {PAYMENT_METHODS.map((m) => {
              const isSelected = method === m;
              return (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected ? colors.accent : colors.card,
                      borderColor: isSelected ? colors.accent : colors.border,
                    },
                  ]}
                  onPress={() => setMethod(m)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: isSelected ? '#fff' : colors.textSecondary },
                    ]}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
            placeholder="Optional notes about this payment"
            placeholderTextColor={colors.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.accent }, isLoading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Save Payment</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={tenantPickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setTenantPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBg}
            onPress={() => setTenantPickerVisible(false)}
          />
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Tenant</Text>
              <TouchableOpacity onPress={() => setTenantPickerVisible(false)}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Search size={16} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Search by tenant, unit, or property…"
                placeholderTextColor={colors.textSecondary}
                value={tenantSearch}
                onChangeText={setTenantSearch}
                autoCapitalize="none"
              />
            </View>

            <FlatList
              data={filteredTenants}
              keyExtractor={(item) => item.id}
              style={styles.tenantList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.tenantListItem, { borderBottomColor: colors.border }]}
                  onPress={() => handleSelectTenant(item)}
                >
                  <View style={[styles.tenantListIconCircle, { backgroundColor: colors.background }]}>
                    <User size={18} color={colors.accent} />
                  </View>
                  <View style={styles.tenantListInfo}>
                    <Text style={[styles.tenantListName, { color: colors.textPrimary }]}>{item.full_name}</Text>
                    <Text style={[styles.tenantListSub, { color: colors.textSecondary }]}>
                      {item.unit?.unit_name ?? ''} •{' '}
                      {item.unit?.property?.name ?? ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Text style={[styles.emptyListText, { color: colors.textSecondary }]}>
                    No active tenants found
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
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
  content: { flex: 1, padding: 16 },
  loadingRow: { paddingVertical: 14, alignItems: 'center' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  tenantCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tenantCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  tenantIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tenantCardTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  tenantCardSub: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  tenantPickerBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tenantPickerBtnText: { flex: 1, fontSize: 15, color: '#9ca3af' },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  chipSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  chipTextSelected: { color: '#fff' },
  submitButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  buttonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: { flex: 1, fontSize: 15, color: '#111827' },
  tenantList: { paddingHorizontal: 16, marginTop: 8 },
  tenantListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  tenantListIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tenantListInfo: { flex: 1 },
  tenantListName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  tenantListSub: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  emptyList: { paddingVertical: 32, alignItems: 'center' },
  emptyListText: { fontSize: 14, color: '#9ca3af' },
});
