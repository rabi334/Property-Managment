import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { RentType, UnitStatus } from '@/types/database';
import { unitService } from '@/services/unit.service';
import { useAuthStore } from '@/stores/authStore';
import { ArrowLeft } from 'lucide-react-native';

const RENT_TYPES: RentType[] = ['monthly', 'yearly'];
const UNIT_STATUSES: UnitStatus[] = ['occupied', 'vacant', 'maintenance'];

export default function CreateUnitScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ propertyId?: string }>();
  const { user } = useAuthStore();

  const [unitName, setUnitName] = useState('');
  const [rentType, setRentType] = useState<RentType>('monthly');
  const [rentAmount, setRentAmount] = useState('');
  const [status, setStatus] = useState<UnitStatus>('vacant');
  const [isLoading, setIsLoading] = useState(false);

  const canManage = user?.role === 'OWNER' || user?.role === 'MANAGER';

  const handleSubmit = async () => {
    if (!canManage) {
      Alert.alert(
        'Permission denied',
        'You do not have permission to add units.',
      );
      return;
    }

    if (!params.propertyId) {
      Alert.alert('Error', 'Missing property reference for this unit.');
      return;
    }

    if (!unitName || !rentAmount) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const rentAmountNum = parseFloat(rentAmount);
    if (Number.isNaN(rentAmountNum) || rentAmountNum <= 0) {
      Alert.alert('Error', 'Rent amount must be a positive number');
      return;
    }

    try {
      setIsLoading(true);
      await unitService.create({
        property_id: params.propertyId,
        unit_name: unitName,
        rent_type: rentType,
        rent_amount: rentAmountNum,
        status,
      });
      Alert.alert('Success', 'Unit created successfully');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create unit');
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
        <Text style={styles.headerTitle}>Add Unit</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Unit Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Apt 101, Suite A"
            value={unitName}
            onChangeText={setUnitName}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.rowItem]}>
            <Text style={styles.label}>Rent Type *</Text>
            <View style={styles.chipGroup}>
              {RENT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.chip,
                    rentType === type && styles.chipSelected,
                  ]}
                  onPress={() => setRentType(type)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      rentType === type && styles.chipTextSelected,
                    ]}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.inputGroup, styles.rowItem]}>
            <Text style={styles.label}>Status *</Text>
            <View style={styles.chipGroup}>
              {UNIT_STATUSES.map((s) => (
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
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Rent Amount *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter rent amount"
            value={rentAmount}
            onChangeText={setRentAmount}
            keyboardType="decimal-pad"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Create Unit</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowItem: {
    flex: 1,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'capitalize',
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
});
