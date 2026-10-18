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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Maintenance Request</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* Unit selector */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Unit *</Text>
          {isUnitLoading || isUnitsLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#2563eb" />
            </View>
          ) : unit ? (
            <TouchableOpacity
              style={styles.unitCard}
              onPress={() => !params.unitId && setUnitPickerVisible(true)}
              activeOpacity={params.unitId ? 1 : 0.7}
            >
              <View style={styles.unitCardLeft}>
                <View style={styles.unitIconCircle}>
                  <Home size={18} color="#2563eb" />
                </View>
                <View>
                  <Text style={styles.unitCardTitle}>{unit.unit_name}</Text>
                  <Text style={styles.unitCardSub}>
                    {unit.property?.name ?? ''}
                  </Text>
                </View>
              </View>
              {!params.unitId && <ChevronDown size={18} color="#6b7280" />}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.unitPickerBtn}
              onPress={() => setUnitPickerVisible(true)}
            >
              <Building2 size={18} color="#6b7280" />
              <Text style={styles.unitPickerBtnText}>Select a unit</Text>
              <ChevronDown size={18} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>

        {/* Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="Short summary of the issue"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe the problem in detail"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Status */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Initial Status *</Text>
          <View style={styles.chipGroup}>
            {STATUSES.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, status === s && styles.chipSelected]}
                onPress={() => setStatus(s)}
              >
                <Text
                  style={[
                    styles.chipText,
                    status === s && styles.chipTextSelected,
                  ]}
                >
                  {s.replace('_', ' ').charAt(0).toUpperCase() +
                    s.replace('_', ' ').slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.buttonDisabled]}
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
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Unit</Text>
              <TouchableOpacity onPress={() => setUnitPickerVisible(false)}>
                <X size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchRow}>
              <Search size={16} color="#9ca3af" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by unit or property name…"
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
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.unitListItem}
                  onPress={() => handleSelectUnit(item)}
                >
                  <View style={styles.unitListIconCircle}>
                    <Home size={18} color="#2563eb" />
                  </View>
                  <View style={styles.unitListInfo}>
                    <Text style={styles.unitListName}>{item.unit_name}</Text>
                    <Text style={styles.unitListSub}>
                      {item.property?.name ?? ''}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      item.status === 'occupied' && styles.statusOccupied,
                      item.status === 'vacant' && styles.statusVacant,
                      item.status === 'maintenance' && styles.statusMaintenance,
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>{item.status}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Text style={styles.emptyListText}>No units found</Text>
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
