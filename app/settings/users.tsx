import { useEffect, useState } from 'react';
import { confirmAction, notify } from '@/lib/platformAlert';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  authService,
  CreateUserData,
  UpdateUserData,
} from '@/services/auth.service';
import { UserRole } from '@/types/database';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/hooks/useTheme';
import {
  Users,
  UserPlus,
  Mail,
  ArrowLeft,
  Trash2,
  CreditCard as Edit,
  X,
  Phone,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react-native';

const ROLES: UserRole[] = ['MANAGER', 'VISITOR'];

export default function ManageUsersScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { colors } = useTheme();

  // List state
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('MANAGER');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit modal state
  const [editVisible, setEditVisible] = useState(false);
  const [editUser, setEditUser] = useState<any | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<'MANAGER' | 'VISITOR'>('MANAGER');
  const [isEditSaving, setIsEditSaving] = useState(false);

  const isOwner = user?.role === 'OWNER';

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const data = await authService.getCreatedUsers();
      setUsers(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Create ── */
  const handleCreate = async () => {
    if (!isOwner) {
      Alert.alert('Permission denied', 'Only owners can create users.');
      return;
    }
    if (!fullName.trim() || !email.trim() || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const payload: CreateUserData = {
      full_name: fullName.trim(),
      email: email.trim(),
      password,
      role,
      phone: phone.trim() || undefined,
    };

    try {
      setIsSubmitting(true);
      await authService.createUser(payload);
      setFullName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setRole('MANAGER');
      await loadUsers();
      Alert.alert('Success', 'User created successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Edit ── */
  const openEdit = (u: any) => {
    setEditUser(u);
    setEditFullName(u.full_name ?? '');
    setEditPhone(u.phone ?? '');
    setEditRole(
      (u.role === 'VISITOR' ? 'VISITOR' : 'MANAGER') as 'MANAGER' | 'VISITOR',
    );
    setEditVisible(true);
  };

  const handleEditSave = async () => {
    if (!editUser) return;
    if (!editFullName.trim()) {
      Alert.alert('Error', 'Full name is required');
      return;
    }
    try {
      setIsEditSaving(true);
      const updates: UpdateUserData = {
        full_name: editFullName.trim(),
        phone: editPhone.trim() || undefined,
        role: editRole,
      };
      await authService.updateUser(editUser.id, updates);
      setEditVisible(false);
      await loadUsers();
      Alert.alert('Success', 'User updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update user');
    } finally {
      setIsEditSaving(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = async (u: any) => {
    const confirmed = await confirmAction(
      'Delete User',
      `Are you sure you want to remove ${u.full_name}? This action cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      await authService.deleteUser(u.id);
      await loadUsers();
    } catch (error: any) {
      notify('Error', error.message || 'Failed to delete user');
    }
  };

  if (!isOwner) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.centerText, { color: colors.textSecondary }]}>Only owners can manage users.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Manage Users</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* ── Create Form ── */}
        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Invite User</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Full Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
              value={fullName}
              onChangeText={setFullName}
              placeholder="User full name"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Email *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
              value={email}
              onChangeText={setEmail}
              placeholder="user@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Phone</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone number"
              keyboardType="phone-pad"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Temporary Password *</Text>
            <View style={[styles.passwordWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                style={[styles.passwordInput, { color: colors.textPrimary }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Min 6 characters"
                secureTextEntry={!showPassword}
                placeholderTextColor={colors.textSecondary}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {showPassword ? (
                  <EyeOff size={20} color={colors.textSecondary} />
                ) : (
                  <Eye size={20} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>
            <Text style={[styles.inputHint, { color: colors.textSecondary }]}>
              Share this password with the user so they can log in.
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Role *</Text>
            <View style={styles.roleRow}>
              {ROLES.map((r) => {
                const isSelected = role === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[
                      styles.roleChip,
                      {
                        backgroundColor: isSelected ? colors.accent : colors.card,
                        borderColor: isSelected ? colors.accent : colors.border,
                      },
                    ]}
                    onPress={() => setRole(r)}
                  >
                    <Text
                      style={[
                        styles.roleChipText,
                        { color: isSelected ? '#fff' : colors.textSecondary },
                      ]}
                    >
                      {r}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.accent }, isSubmitting && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Invite User</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Team Members List ── */}
        <View style={styles.listHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Team Members{users.length > 0 ? ` (${users.length})` : ''}
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const isOwnerRole = item.role === 'OWNER';
              const isManagerRole = item.role === 'MANAGER';
              return (
                <View style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.userIcon, { backgroundColor: colors.background }]}>
                    <Users size={20} color={colors.accent} />
                  </View>

                  <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: colors.textPrimary }]}>{item.full_name}</Text>

                    <View style={styles.userMetaRow}>
                      <Mail size={12} color={colors.textSecondary} />
                      <Text style={[styles.userMetaText, { color: colors.textSecondary }]}>{item.email}</Text>
                    </View>

                    {item.phone ? (
                      <View style={styles.userMetaRow}>
                        <Phone size={12} color={colors.textSecondary} />
                        <Text style={[styles.userMetaText, { color: colors.textSecondary }]}>{item.phone}</Text>
                      </View>
                    ) : null}

                    <View
                      style={[
                        styles.roleBadge,
                        isOwnerRole && { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
                        isManagerRole && { backgroundColor: colors.currentBg },
                        !isOwnerRole && !isManagerRole && { backgroundColor: colors.overdueBg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleBadgeText,
                          isOwnerRole && { color: colors.accent },
                          isManagerRole && { color: colors.currentText },
                          !isOwnerRole && !isManagerRole && { color: colors.overdueText },
                        ]}
                      >
                        {item.role}
                      </Text>
                    </View>
                  </View>

                  {/* Action buttons */}
                  <View style={styles.userActions}>
                    {item.role !== 'OWNER' && (
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.background }]}
                        onPress={() => openEdit(item)}
                      >
                        <Edit size={18} color={colors.accent} />
                      </TouchableOpacity>
                    )}
                    {item.role !== 'OWNER' && (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.deleteBtn, { backgroundColor: colors.background }]}
                        onPress={() => handleDelete(item)}
                      >
                        <Trash2 size={18} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <UserPlus size={48} color={colors.border} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No team members yet. Invite managers or visitors above.
                </Text>
              </View>
            }
          />
        )}
      </ScrollView>

      {/* ── Edit User Modal ── */}
      <Modal
        visible={editVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBg}
            onPress={() => setEditVisible(false)}
          />
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            {/* Modal header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Edit User</Text>
              <TouchableOpacity onPress={() => setEditVisible(false)}>
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              {/* Full name */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Full Name *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
                  value={editFullName}
                  onChangeText={setEditFullName}
                  placeholder="User full name"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* Phone */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Phone</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }]}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Phone number"
                  keyboardType="phone-pad"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* Role */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Role *</Text>
                <View style={styles.roleRow}>
                  {ROLES.map((r) => {
                    const isSelected = editRole === r;
                    return (
                      <TouchableOpacity
                        key={r}
                        style={[
                          styles.roleChip,
                          {
                            backgroundColor: isSelected ? colors.accent : colors.card,
                            borderColor: isSelected ? colors.accent : colors.border,
                          },
                        ]}
                        onPress={() => setEditRole(r as 'MANAGER' | 'VISITOR')}
                      >
                        <Text
                          style={[
                            styles.roleChipText,
                            { color: isSelected ? '#fff' : colors.textSecondary },
                          ]}
                        >
                          {r}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Email (read-only) */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>Email</Text>
                <TextInput
                  style={[styles.input, styles.inputDisabled, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textSecondary }]}
                  value={editUser?.email ?? ''}
                  editable={false}
                />
                <Text style={[styles.inputHint, { color: colors.textSecondary }]}>Email cannot be changed.</Text>
              </View>

              {/* Save button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: colors.accent },
                  isEditSaving && styles.buttonDisabled,
                ]}
                onPress={handleEditSave}
                disabled={isEditSaving}
              >
                {isEditSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={styles.saveRow}>
                    <Save size={18} color="#fff" />
                    <Text style={styles.submitButtonText}>Save Changes</Text>
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  centerText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    padding: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  eyeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputDisabled: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
  inputHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  roleChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  roleChipSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  roleChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  roleChipTextSelected: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listHeaderRow: {
    marginBottom: 10,
  },
  loadingRow: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10,
  },
  userIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  userMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  userMetaText: {
    fontSize: 13,
    color: '#6b7280',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  actionBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f9ff',
  },
  deleteBtn: {
    backgroundColor: '#fef2f2',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 20,
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
    maxHeight: '80%',
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
  modalContent: {
    padding: 20,
    paddingBottom: 8,
  },
});
