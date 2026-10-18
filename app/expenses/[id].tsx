import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { expenseService, UpdateExpenseData } from '@/services/expense.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/hooks/useTheme';
import { confirmAction, notify } from '@/lib/platformAlert';
import { ExpenseCategory } from '@/types/database';
import DatePickerInput from '@/components/DatePickerInput';
import {
  ArrowLeft,
  Trash2,
  CreditCard as Edit,
  Receipt,
  Building2,
  Calendar,
  Tag,
  Save,
  X,
} from 'lucide-react-native';

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'maintenance',
  'utilities',
  'renovation',
  'other',
];

export default function ExpenseDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { colors } = useTheme();

  const [expense, setExpense] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('maintenance');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');

  const canManage = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const canDelete = user?.role === 'OWNER';

  useEffect(() => {
    if (id) loadExpense();
  }, [id]);

  const loadExpense = async () => {
    try {
      setIsLoading(true);
      const data = await expenseService.getById(id as string);
      setExpense(data);
      populateEditFields(data);
    } catch (error: any) {
      notify('Error', error.message || 'Failed to load expense');
    } finally {
      setIsLoading(false);
    }
  };

  const populateEditFields = (data: any) => {
    setAmount(String(data.amount ?? ''));
    setCategory(data.category ?? 'maintenance');
    setDate(data.date ?? '');
    setDescription(data.description ?? '');
  };

  const handleEdit = () => {
    populateEditFields(expense);
    setIsEditing(true);
  };

  const handleCancelEdit = () => setIsEditing(false);

  const handleSave = async () => {
    if (!amount || !date || !description) {
      notify('Error', 'Please fill in all required fields');
      return;
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      notify('Error', 'Amount must be a positive number');
      return;
    }
    try {
      setIsSaving(true);
      const updates: UpdateExpenseData = {
        amount: amountNum,
        category,
        date,
        description,
      };
      const updated = await expenseService.update(id as string, updates);
      setExpense({ ...expense, ...updated });
      setIsEditing(false);
      notify('Success', 'Expense updated successfully');
    } catch (error: any) {
      notify('Error', error.message || 'Failed to update expense');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) {
      notify(
        'Error',
        'Missing expense ID. Please reopen this expense and try again.',
      );
      return;
    }
    if (!canDelete) {
      notify('Permission denied', 'Only owners can delete expenses.');
      return;
    }
    const confirmed = await confirmAction(
      'Delete Expense',
      'Are you sure you want to delete this expense? This cannot be undone.',
    );
    if (!confirmed) return;

    try {
      await expenseService.delete(id as string);
      notify('Deleted', 'Expense deleted successfully.');
      router.back();
    } catch (error: any) {
      notify('Error', error.message || 'Failed to delete expense');
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

  if (!expense) {
    return (
      <View
        style={[styles.errorContainer, { backgroundColor: colors.background }]}
      >
        <Text style={{ color: colors.textSecondary }}>Expense not found</Text>
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
          Expense details
        </Text>
        <View style={styles.headerActions}>
          {!isEditing && canManage && (
            <TouchableOpacity onPress={handleEdit} style={styles.headerBtn}>
              <Edit size={20} color={colors.accent} />
            </TouchableOpacity>
          )}
          {!isEditing && canDelete && (
            <TouchableOpacity onPress={handleDelete} style={styles.headerBtn}>
              <Trash2 size={20} color={colors.overdueText} />
            </TouchableOpacity>
          )}
          {isEditing && (
            <>
              <TouchableOpacity
                onPress={handleCancelEdit}
                style={styles.headerBtn}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                style={styles.headerBtn}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Save size={20} color={colors.accent} />
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.bannerCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View
            style={[styles.iconCircle, { backgroundColor: colors.overdueBg }]}
          >
            <Receipt size={32} color={colors.overdueText} />
          </View>
          {isEditing ? (
            <View style={styles.amountEditContainer}>
              <Text
                style={[styles.amountCurrency, { color: colors.textPrimary }]}
              >
                $
              </Text>
              <TextInput
                style={[
                  styles.amountInput,
                  {
                    color: colors.textPrimary,
                    borderBottomColor: colors.accent,
                  },
                ]}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          ) : (
            <Text style={[styles.amountText, { color: colors.overdueText }]}>
              ${Number(expense.amount).toFixed(2)}
            </Text>
          )}
          <View
            style={[
              styles.categoryBadge,
                { backgroundColor: colors.background },
            ]}
          >
            <Text
              style={[
                styles.categoryBadgeText,
                { color: colors.textSecondary },
              ]}
            >
              {isEditing ? category : expense.category}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.detailCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.fieldRow}>
            <View
              style={[styles.fieldIcon, { backgroundColor: colors.background }]}
            >
              <Receipt size={16} color={colors.textSecondary} />
            </View>
            <View style={styles.fieldContent}>
              <Text
                style={[styles.fieldLabel, { color: colors.textSecondary }]}
              >
                Description
              </Text>
              {isEditing ? (
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe this expense"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              ) : (
                <Text
                  style={[styles.fieldValue, { color: colors.textPrimary }]}
                >
                  {expense.description}
                </Text>
              )}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.fieldRow}>
            <View
              style={[styles.fieldIcon, { backgroundColor: colors.background }]}
            >
              <Tag size={16} color={colors.textSecondary} />
            </View>
            <View style={styles.fieldContent}>
              <Text
                style={[styles.fieldLabel, { color: colors.textSecondary }]}
              >
                Category
              </Text>
              {isEditing ? (
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
                          {
                            color:
                              category === c ? '#fff' : colors.textSecondary,
                          },
                        ]}
                      >
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text
                  style={[styles.fieldValue, { color: colors.textPrimary }]}
                >
                  {expense.category.charAt(0).toUpperCase() +
                    expense.category.slice(1)}
                </Text>
              )}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.fieldRow}>
            <View
              style={[styles.fieldIcon, { backgroundColor: colors.background }]}
            >
              <Calendar size={16} color={colors.textSecondary} />
            </View>
            <View style={styles.fieldContent}>
              <Text
                style={[styles.fieldLabel, { color: colors.textSecondary }]}
              >
                Date
              </Text>
              {isEditing ? (
                <DatePickerInput value={date} onChange={setDate} />
              ) : (
                <Text
                  style={[styles.fieldValue, { color: colors.textPrimary }]}
                >
                  {new Date(expense.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              )}
            </View>
          </View>

          {expense.property && (
            <>
              <View
                style={[styles.divider, { backgroundColor: colors.border }]}
              />
              <View style={styles.fieldRow}>
                <View
                  style={[
                    styles.fieldIcon,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <Building2 size={16} color={colors.textSecondary} />
                </View>
                <View style={styles.fieldContent}>
                  <Text
                    style={[styles.fieldLabel, { color: colors.textSecondary }]}
                  >
                    Property
                  </Text>
                  <Text
                    style={[styles.fieldValue, { color: colors.textPrimary }]}
                  >
                    {expense.property.name}
                  </Text>
                  <Text
                    style={[
                      styles.fieldSubValue,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {expense.property.address}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {isEditing && (
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: colors.accent },
              isSaving && styles.buttonDisabled,
            ]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save changes</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBtn: { padding: 4 },
  content: { padding: 16, paddingBottom: 40 },
  bannerCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  amountText: { fontSize: 32, fontWeight: '700', marginBottom: 12 },
  amountEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  amountCurrency: { fontSize: 28, fontWeight: '600', marginRight: 4 },
  amountInput: {
    fontSize: 28,
    fontWeight: '600',
    borderBottomWidth: 2,
    minWidth: 100,
    textAlign: 'center',
    paddingVertical: 4,
  },
  categoryBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  categoryBadgeText: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  detailCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  fieldRow: { flexDirection: 'row', paddingVertical: 12, gap: 12 },
  fieldIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  fieldContent: { flex: 1 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fieldValue: { fontSize: 15, fontWeight: '500' },
  fieldSubValue: { fontSize: 13, marginTop: 2 },
  divider: { height: 1 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginTop: 4,
  },
  textArea: { minHeight: 72, textAlignVertical: 'top' },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '500' },
  saveButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
