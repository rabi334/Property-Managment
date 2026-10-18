import { useEffect, useState } from 'react';
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
import { useTheme } from '@/hooks/useTheme';
import { ArrowLeft } from 'lucide-react-native';

const RENT_TYPES: RentType[] = ['monthly', 'yearly'];
const UNIT_STATUSES: UnitStatus[] = ['occupied', 'vacant', 'maintenance'];

export default function EditUnitScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { colors } = useTheme();

  const [unitName, setUnitName] = useState('');
  const [rentType, setRentType] = useState<RentType>('monthly');
  const [rentAmount, setRentAmount] = useState('');
  const [status, setStatus] = useState<UnitStatus>('vacant');
  const [propertyName, setPropertyName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const canManage = user?.role === 'OWNER' || user?.role === 'MANAGER';

  useEffect(() => {
    if (id) {
      loadUnit(id as string);
    }
  }, [id]);

  const loadUnit = async (unitId: string) => {
    try {
      setIsLoading(true);
      const data: any = await unitService.getById(unitId);
      if (!data) {
        Alert.alert('Error', 'Unit not found');
        router.back();
        return;
      }

      setUnitName(data.unit_name);
      setRentType(data.rent_type);
      setRentAmount(String(data.rent_amount ?? ''));
      setStatus(data.status);
      setPropertyName(data.property?.name || '');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load unit');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!canManage) {
      Alert.alert(
        'Permission denied',
        'You do not have permission to edit units.',
      );
      return;
    }

    if (!id) {
      Alert.alert('Error', 'Missing unit reference.');
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
      setIsSaving(true);
      await unitService.update(id as string, {
        unit_name: unitName,
        rent_type: rentType,
        rent_amount: rentAmountNum,
        status,
      });
      Alert.alert('Success', 'Unit updated successfully');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update unit');
    } finally {
      setIsSaving(false);
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
          Edit Unit
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {propertyName ? (
          <View
            style={[
              styles.propertyBadge,
              { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
            ]}
          >
            <Text style={[styles.propertyBadgeText, { color: colors.accent }]}>
              {propertyName}
            </Text>
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            Unit Name *
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.textPrimary,
              },
            ]}
            placeholder="e.g. Apt 101, Suite A"
            placeholderTextColor={colors.textSecondary}
            value={unitName}
            onChangeText={setUnitName}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.rowItem]}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Rent Type *
            </Text>
            <View style={styles.chipGroup}>
              {RENT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.chip,
                    {
                      borderColor: colors.border,
                      backgroundColor:
                        rentType === type ? colors.accent : colors.card,
                    },
                  ]}
                  onPress={() => setRentType(type)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: rentType === type ? '#fff' : colors.textSecondary },
                    ]}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.inputGroup, styles.rowItem]}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              Status *
            </Text>
            <View style={styles.chipGroup}>
              {UNIT_STATUSES.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.chip,
                    {
                      borderColor: colors.border,
                      backgroundColor:
                        status === s ? colors.accent : colors.card,
                    },
                  ]}
                  onPress={() => setStatus(s)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: status === s ? '#fff' : colors.textSecondary },
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
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            Rent Amount *
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.textPrimary,
              },
            ]}
            placeholder="Enter rent amount"
            placeholderTextColor={colors.textSecondary}
            value={rentAmount}
            onChangeText={setRentAmount}
            keyboardType="decimal-pad"
          />
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: colors.accent },
            isSaving && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Save Changes</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  propertyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 16,
  },
  propertyBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
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
