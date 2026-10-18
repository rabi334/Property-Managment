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
import { tenantService } from '@/services/tenant.service';
import { unitService } from '@/services/unit.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/hooks/useTheme';
import DatePickerInput from '@/components/DatePickerInput';
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  Hop as Home,
  Search,
  X,
} from 'lucide-react-native';

export default function CreateTenantScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ unitId?: string }>();
  const { user } = useAuthStore();
  const { colors } = useTheme();

  // Pre-loaded unit (when unitId param passed)
  const [unit, setUnit] = useState<any | null>(null);
  const [isUnitLoading, setIsUnitLoading] = useState(false);

  // Unit picker state (when no unitId param)
  const [allUnits, setAllUnits] = useState<any[]>([]);
  const [isUnitsLoading, setIsUnitsLoading] = useState(false);
  const [unitPickerVisible, setUnitPickerVisible] = useState(false);
  const [unitSearch, setUnitSearch] = useState('');

  // Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [leaseStartDate, setLeaseStartDate] = useState('');
  const [leaseEndDate, setLeaseEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const canManage = user?.role === 'OWNER' || user?.role === 'MANAGER';

  useEffect(() => {
    if (params.unitId) {
      loadUnit(params.unitId);
    } else {
      loadAllUnits();
    }
  }, [params.unitId]);

  const loadUnit = async (unitId: string) => {
    try {
      setIsUnitLoading(true);
      const data = await unitService.getById(unitId);
      setUnit(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load unit');
    } finally {
      setIsUnitLoading(false);
    }
  };

  const loadAllUnits = async () => {
    try {
      setIsUnitsLoading(true);
      const data = await unitService.getAll();
      setAllUnits(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load units');
    } finally {
      setIsUnitsLoading(false);
    }
  };

  const filteredUnits = allUnits.filter((u) => {
    const q = unitSearch.toLowerCase();
    return (
      u.unit_name?.toLowerCase().includes(q) ||
      u.property?.name?.toLowerCase().includes(q)
    );
  });

  const handleSelectUnit = (selectedUnit: any) => {
    setUnit(selectedUnit);
    setUnitPickerVisible(false);
    setUnitSearch('');
  };

  const handleSubmit = async () => {
    if (!canManage) {
      Alert.alert(
        'Permission denied',
        'You do not have permission to add tenants.',
      );
      return;
    }

    if (!unit) {
      Alert.alert('Error', 'Please select a unit for this tenant.');
      return;
    }

    if (!fullName.trim() || !phone.trim() || !idNumber.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const depositNum = parseFloat(depositAmount || '0') || 0;
    if (depositNum < 0) {
      Alert.alert('Error', 'Deposit cannot be negative');
      return;
    }

    try {
      setIsLoading(true);
      await tenantService.create({
        full_name: fullName.trim(),
        phone: phone.trim(),
        id_number: idNumber.trim(),
        emergency_contact: emergencyContact.trim() || undefined,
        deposit_amount: depositNum,
        unit_id: unit.id,
        lease_start_date: leaseStartDate || undefined,
        lease_end_date: leaseEndDate || undefined,
      });
      Alert.alert('Success', 'Tenant created successfully');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create tenant');
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
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Add Tenant</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* Unit selector */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Unit *</Text>
          {isUnitLoading || isUnitsLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          ) : unit ? (
            <TouchableOpacity
              style={[styles.unitCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => !params.unitId && setUnitPickerVisible(true)}
              activeOpacity={params.unitId ? 1 : 0.7}
            >
              <View style={styles.unitCardLeft}>
                <View style={[styles.unitIconCircle, { backgroundColor: colors.background }]}>
                  <Home size={18} color={colors.accent} />
                </View>
                <View>
                  <Text style={[styles.unitCardTitle, { color: colors.textPrimary }]}>{unit.unit_name}</Text>
                  <Text style={[styles.unitCardSub, { color: colors.textSecondary }]}>
                    {unit.property?.name ?? ''}
                  </Text>
                </View>
              </View>
              {!params.unitId && <ChevronDown size={18} color={colors.textSecondary} />}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.unitPickerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setUnitPickerVisible(true)}
            >
              <Building2 size={18} color={colors.textSecondary} />
              <Text style={[styles.unitPickerBtnText, { color: colors.textSecondary }]}>Select a unit</Text>
              <ChevronDown size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Full Name */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Full Name *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
            placeholder="Tenant full name"
            placeholderTextColor={colors.textSecondary}
            value={fullName}
            onChangeText={setFullName}
          />
        </View>

        {/* Phone */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Phone *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
            placeholder="Phone number"
            placeholderTextColor={colors.textSecondary}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        {/* ID Number */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>ID Number *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
            placeholder="National ID / Passport"
            placeholderTextColor={colors.textSecondary}
            value={idNumber}
            onChangeText={setIdNumber}
          />
        </View>

        {/* Emergency Contact */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Emergency Contact</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
            placeholder="Name and phone"
            placeholderTextColor={colors.textSecondary}
            value={emergencyContact}
            onChangeText={setEmergencyContact}
          />
        </View>

        {/* Deposit */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Deposit Amount</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
            placeholder="0.00"
            placeholderTextColor={colors.textSecondary}
            value={depositAmount}
            onChangeText={setDepositAmount}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Lease Start Date</Text>
          <DatePickerInput
            value={leaseStartDate}
            onChange={setLeaseStartDate}
            placeholder="Select lease start date"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Lease End Date</Text>
          <DatePickerInput
            value={leaseEndDate}
            onChange={setLeaseEndDate}
            placeholder="Select lease end date"
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
            <Text style={styles.submitButtonText}>Create Tenant</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Unit Picker Modal */}
      <Modal
        visible={unitPickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setUnitPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBg}
            onPress={() => setUnitPickerVisible(false)}
          />
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Unit</Text>
              <TouchableOpacity onPress={() => setUnitPickerVisible(false)}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={[styles.searchRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Search size={16} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Search by unit or property name…"
                placeholderTextColor={colors.textSecondary}
                value={unitSearch}
                onChangeText={setUnitSearch}
                autoCapitalize="none"
              />
            </View>

            <FlatList
              data={filteredUnits}
              keyExtractor={(item) => item.id}
              style={styles.unitList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isOccupied = item.status === 'occupied';
                const isVacant = item.status === 'vacant';
                const isMaint = item.status === 'maintenance';
                return (
                  <TouchableOpacity
                    style={[styles.unitListItem, { borderBottomColor: colors.border }]}
                    onPress={() => handleSelectUnit(item)}
                  >
                    <View style={[styles.unitListIconCircle, { backgroundColor: colors.background }]}>
                      <Home size={18} color={colors.accent} />
                    </View>
                    <View style={styles.unitListInfo}>
                      <Text style={[styles.unitListName, { color: colors.textPrimary }]}>{item.unit_name}</Text>
                      <Text style={[styles.unitListSub, { color: colors.textSecondary }]}>
                        {item.property?.name ?? ''}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        isOccupied && { backgroundColor: colors.currentBg },
                        isVacant && { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
                        isMaint && { backgroundColor: colors.overdueBg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          isOccupied && { color: colors.currentText },
                          isVacant && { color: colors.textSecondary },
                          isMaint && { color: colors.overdueText },
                        ]}
                      >
                        {item.status}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Text style={[styles.emptyListText, { color: colors.textSecondary }]}>No units found</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
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
  content: {
    flex: 1,
    padding: 16,
  },
  loadingRow: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
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
  // Unit card (selected state)
  unitCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unitCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  unitIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unitCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  unitCardSub: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  // Unit picker button (no selection yet)
  unitPickerBtn: {
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
  unitPickerBtnText: {
    flex: 1,
    fontSize: 15,
    color: '#9ca3af',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
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
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  unitList: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  unitListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  unitListIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unitListInfo: {
    flex: 1,
  },
  unitListName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  unitListSub: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    textTransform: 'capitalize',
  },
  statusOccupied: {
    backgroundColor: '#d1fae5',
  },
  statusVacant: {
    backgroundColor: '#fef3c7',
  },
  statusMaintenance: {
    backgroundColor: '#fee2e2',
  },
  emptyList: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 14,
    color: '#9ca3af',
  },
});
