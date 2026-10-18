import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ExpenseCategory } from '@/types/database';
import { expenseService } from '@/services/expense.service';
import { propertyService } from '@/services/property.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/hooks/useTheme';
import { notify } from '@/lib/platformAlert';
import DatePickerInput from '@/components/DatePickerInput';
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  MapPin,
  Search,
  X,
} from 'lucide-react-native';

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'maintenance',
  'utilities',
  'renovation',
  'other',
];

export default function CreateExpenseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ propertyId?: string }>();
  const { user } = useAuthStore();
  const { colors } = useTheme();

  const [property, setProperty] = useState<any | null>(null);
  const [isPropertyLoading, setIsPropertyLoading] = useState(false);
  const [allProperties, setAllProperties] = useState<any[]>([]);
  const [isPropertiesLoading, setIsPropertiesLoading] = useState(false);
  const [propertyPickerVisible, setPropertyPickerVisible] = useState(false);
  const [propertySearch, setPropertySearch] = useState('');

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('maintenance');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const canManage = user?.role === 'OWNER' || user?.role === 'MANAGER';

  useEffect(() => {
    if (params.propertyId) {
      loadProperty(params.propertyId);
    } else {
      loadAllProperties();
    }
  }, [params.propertyId]);

  const loadProperty = async (propertyId: string) => {
    try {
      setIsPropertyLoading(true);
      const data = await propertyService.getById(propertyId);
      setProperty(data);
    } catch (error: any) {
      notify('Error', error.message || 'Failed to load property');
    } finally {
      setIsPropertyLoading(false);
    }
  };

  const loadAllProperties = async () => {
    try {
      setIsPropertiesLoading(true);
      const data = await propertyService.getAll();
      setAllProperties(data);
    } catch (error: any) {
      notify('Error', error.message || 'Failed to load properties');
    } finally {
      setIsPropertiesLoading(false);
    }
  };

  const filteredProperties = allProperties.filter((p) => {
    const q = propertySearch.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q)
    );
  });

  const handleSelectProperty = (selectedProperty: any) => {
    setProperty(selectedProperty);
    setPropertyPickerVisible(false);
    setPropertySearch('');
  };

  const handleSubmit = async () => {
    if (!canManage) {
      notify(
        'Permission denied',
        'You do not have permission to add expenses.',
      );
      return;
    }
    if (!property) {
      notify('Error', 'Please select a property for this expense.');
      return;
    }
    if (!amount || !date || !description) {
      notify('Error', 'Please fill in all required fields');
      return;
    }
    const amountNum = parseFloat(amount);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      notify('Error', 'Amount must be a positive number');
      return;
    }

    try {
      setIsLoading(true);
      await expenseService.create({
        property_id: property.id,
        category,
        amount: amountNum,
        description,
        date,
      });
      notify('Success', 'Expense recorded successfully');
      router.back();
    } catch (error: any) {
      notify('Error', error.message || 'Failed to record expense');
    } finally {
      setIsLoading(false);
    }
  };

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
          Add expense
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            Property *
          </Text>
          {isPropertyLoading || isPropertiesLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          ) : property ? (
            <TouchableOpacity
              style={[
                styles.propertyCard,
                { backgroundColor: colors.card, borderColor: colors.accent },
              ]}
              onPress={() =>
                !params.propertyId && setPropertyPickerVisible(true)
              }
              activeOpacity={params.propertyId ? 1 : 0.7}
            >
              <View style={styles.propertyCardLeft}>
                <View
                  style={[
                    styles.propertyIconCircle,
                    { backgroundColor: colors.currentBg },
                  ]}
                >
                  <Building2 size={18} color={colors.accent} />
                </View>
                <View style={styles.propertyCardInfo}>
                  <Text
                    style={[
                      styles.propertyCardTitle,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {property.name}
                  </Text>
                  <Text
                    style={[
                      styles.propertyCardSub,
                      { color: colors.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {property.address}
                  </Text>
                </View>
              </View>
              {!params.propertyId && (
                <ChevronDown size={18} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.propertyPickerBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => setPropertyPickerVisible(true)}
            >
              <Building2 size={18} color={colors.textSecondary} />
              <Text
                style={[
                  styles.propertyPickerBtnText,
                  { color: colors.textSecondary },
                ]}
              >
                Select a property
              </Text>
              <ChevronDown size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            Amount *
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
            placeholder="Enter amount"
            placeholderTextColor={colors.textSecondary}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            Category *
          </Text>
          <View style={styles.chipGroup}>
            {EXPENSE_CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.chip,
                  {
                    borderColor: colors.border,
                    backgroundColor:
                      category === c ? colors.accent : colors.card,
                  },
                ]}
                onPress={() => setCategory(c)}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: category === c ? '#fff' : colors.textSecondary },
                  ]}
                >
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            Date *
          </Text>
          <DatePickerInput
            value={date}
            onChange={setDate}
            placeholder="Select expense date"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            Description *
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.textPrimary,
              },
            ]}
            placeholder="Describe this expense"
            placeholderTextColor={colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: colors.accent },
            isLoading && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Save expense</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={propertyPickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPropertyPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBg}
            onPress={() => setPropertyPickerVisible(false)}
          />
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View
              style={[styles.modalHeader, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Select property
              </Text>
              <TouchableOpacity onPress={() => setPropertyPickerVisible(false)}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.searchRow,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <Search size={16} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Search by name or address…"
                placeholderTextColor={colors.textSecondary}
                value={propertySearch}
                onChangeText={setPropertySearch}
                autoCapitalize="none"
              />
            </View>

            <FlatList
              data={filteredProperties}
              keyExtractor={(item) => item.id}
              style={styles.propertyList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.propertyListItem,
                    { borderBottomColor: colors.border },
                  ]}
                  onPress={() => handleSelectProperty(item)}
                >
                  <View
                    style={[
                      styles.propertyListIconCircle,
                      { backgroundColor: colors.currentBg },
                    ]}
                  >
                    <Building2 size={18} color={colors.accent} />
                  </View>
                  <View style={styles.propertyListInfo}>
                    <Text
                      style={[
                        styles.propertyListName,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {item.name}
                    </Text>
                    <View style={styles.propertyListAddressRow}>
                      <MapPin size={12} color={colors.textSecondary} />
                      <Text
                        style={[
                          styles.propertyListAddress,
                          { color: colors.textSecondary },
                        ]}
                        numberOfLines={1}
                      >
                        {item.address}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.typeBadge,
                      { backgroundColor: colors.background },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeBadgeText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {item.type}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Text
                    style={[
                      styles.emptyListText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    No properties found
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
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  loadingRow: { paddingVertical: 14, alignItems: 'center' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  propertyCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  propertyCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  propertyIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  propertyCardInfo: { flex: 1 },
  propertyCardTitle: { fontSize: 15, fontWeight: '600' },
  propertyCardSub: { fontSize: 13, marginTop: 2 },
  propertyPickerBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  propertyPickerBtnText: { flex: 1, fontSize: 15 },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 14, fontWeight: '500' },
  submitButton: {
    borderRadius: 10,
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
  },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15 },
  propertyList: { paddingHorizontal: 16, marginTop: 8 },
  propertyListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  propertyListIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  propertyListInfo: { flex: 1 },
  propertyListName: { fontSize: 15, fontWeight: '600' },
  propertyListAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  propertyListAddress: { fontSize: 13, flex: 1 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  emptyList: { paddingVertical: 32, alignItems: 'center' },
  emptyListText: { fontSize: 14 },
});
