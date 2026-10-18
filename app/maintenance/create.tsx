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
import { maintenanceService } from '@/services/maintenance.service';
import { unitService } from '@/services/unit.service';
import { MaintenanceStatus } from '@/types/database';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/hooks/useTheme';
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  Hop as Home,
  Search,
  X,
} from 'lucide-react-native';

const STATUSES: MaintenanceStatus[] = ['pending', 'in_progress', 'completed'];

export default function CreateMaintenanceScreen() {
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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<MaintenanceStatus>('pending');
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
        'You do not have permission to create maintenance requests.',
      );
      return;
    }

    if (!unit) {
      Alert.alert('Error', 'Please select a unit for this request.');
      return;
    }

    if (!title.trim() || !description.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setIsLoading(true);
      await maintenanceService.create({
        unit_id: unit.id,
        title: title.trim(),
        description: description.trim(),
        status,
      });
      Alert.alert('Success', 'Maintenance request created');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create request');
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
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>New Maintenance Request</Text>
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

        {/* Title */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Title *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
            placeholder="Short summary of the issue"
            placeholderTextColor={colors.textSecondary}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
            placeholder="Describe the problem in detail"
            placeholderTextColor={colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Status */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Initial Status *</Text>
          <View style={styles.chipGroup}>
            {STATUSES.map((s) => {
              const isSelected = status === s;
              return (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected ? colors.accent : colors.card,
                      borderColor: isSelected ? colors.accent : colors.border,
                    },
                  ]}
                  onPress={() => setStatus(s)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: isSelected ? '#fff' : colors.textSecondary },
                    ]}
                  >
                    {s.replace('_', ' ').charAt(0).toUpperCase() +
                      s.replace('_', ' ').slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.accent }, isLoading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Create Request</Text>
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
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
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
  // Status chips
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  chipSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  chipTextSelected: {
    color: '#fff',
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
