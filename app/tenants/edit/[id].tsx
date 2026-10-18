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
import { tenantService } from '@/services/tenant.service';
import { useAuthStore } from '@/stores/authStore';
import { ArrowLeft } from 'lucide-react-native';
import DatePickerInput from '@/components/DatePickerInput';

export default function EditTenantScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [leaseStartDate, setLeaseStartDate] = useState('');
  const [leaseEndDate, setLeaseEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const canManage = user?.role === 'OWNER' || user?.role === 'MANAGER';

  useEffect(() => {
    if (id) loadTenant(id as string);
  }, [id]);

  const loadTenant = async (tenantId: string) => {
    try {
      setIsLoading(true);
      const data = await tenantService.getById(tenantId);
      if (!data) {
        Alert.alert('Error', 'Tenant not found');
        router.back();
        return;
      }
      setFullName(data.full_name ?? '');
      setPhone(data.phone ?? '');
      setIdNumber(data.id_number ?? '');
      setEmergencyContact(data.emergency_contact ?? '');
      setDepositAmount(String(data.deposit_amount ?? '0'));
      setLeaseStartDate(data.lease_start_date ?? '');
      setLeaseEndDate(data.lease_end_date ?? '');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load tenant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!canManage) {
      Alert.alert('Permission denied', 'You do not have permission to edit tenants.');
      return;
    }

    if (!id) {
      Alert.alert('Error', 'Missing tenant reference.');
      return;
    }

    if (!fullName.trim() || !phone.trim() || !idNumber.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const depositNum = parseFloat(depositAmount || '0');
    if (isNaN(depositNum) || depositNum < 0) {
      Alert.alert('Error', 'Deposit amount must be a non-negative number');
      return;
    }

    try {
      setIsSaving(true);
      await tenantService.update(id as string, {
        full_name: fullName.trim(),
        phone: phone.trim(),
        id_number: idNumber.trim(),
        emergency_contact: emergencyContact.trim() || undefined,
        deposit_amount: depositNum,
        lease_start_date: leaseStartDate.trim() === '' ? '' : leaseStartDate,
        lease_end_date: leaseEndDate.trim() === '' ? '' : leaseEndDate,
      });
      Alert.alert('Success', 'Tenant updated successfully');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update tenant');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Tenant</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Tenant full name"
            value={fullName}
            onChangeText={setFullName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone *</Text>
          <TextInput
            style={styles.input}
            placeholder="Phone number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>ID Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="National ID / Passport"
            value={idNumber}
            onChangeText={setIdNumber}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Emergency Contact</Text>
          <TextInput
            style={styles.input}
            placeholder="Name and phone"
            value={emergencyContact}
            onChangeText={setEmergencyContact}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Deposit Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            value={depositAmount}
            onChangeText={setDepositAmount}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Lease Start Date</Text>
          <DatePickerInput
            value={leaseStartDate}
            onChange={setLeaseStartDate}
            placeholder="Select lease start date"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Lease End Date</Text>
          <DatePickerInput
            value={leaseEndDate}
            onChange={setLeaseEndDate}
            placeholder="Select lease end date"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isSaving && styles.buttonDisabled]}
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
