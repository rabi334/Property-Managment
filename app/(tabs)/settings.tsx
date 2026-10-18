import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { confirmAction } from '@/lib/platformAlert';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore, ThemePreference } from '@/stores/themeStore';
import { useTheme } from '@/hooks/useTheme';
import {
  User,
  Users,
  FileText,
  LogOut,
  ChevronRight,
  Wrench,
  DollarSign,
  Sun,
  Moon,
  SmartphoneIcon,
} from 'lucide-react-native';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { colors } = useTheme();
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);

  const handleLogout = async () => {
    const confirmed = await confirmAction(
      'Logout',
      'Are you sure you want to logout?',
      'Logout',
    );
    if (!confirmed) return;
    await logout();
    router.replace('/auth/login');
  };

  const isOwner = user?.role === 'OWNER';

  const themeOptions: { value: ThemePreference; label: string; icon: any }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'auto', label: 'Auto', icon: SmartphoneIcon },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Settings
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.profileSection,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.avatarContainer,
              { backgroundColor: colors.currentBg },
            ]}
          >
            <User size={48} color={colors.accent} />
          </View>
          <Text style={[styles.profileName, { color: colors.textPrimary }]}>
            {user?.full_name}
          </Text>
          <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
            {user?.email}
          </Text>
          <View
            style={[styles.roleBadge, { backgroundColor: colors.currentBg }]}
          >
            <Text style={[styles.roleBadgeText, { color: colors.currentText }]}>
              {user?.role}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Appearance
          </Text>
          <View
            style={[
              styles.themeRow,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {themeOptions.map((opt) => {
              const active = preference === opt.value;
              const Icon = opt.icon;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setPreference(opt.value)}
                  style={[
                    styles.themeOption,
                    { backgroundColor: active ? colors.accent : 'transparent' },
                  ]}
                >
                  <Icon
                    size={16}
                    color={active ? '#fff' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.themeOptionText,
                      { color: active ? '#fff' : colors.textSecondary },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Management
          </Text>

          {isOwner && (
            <TouchableOpacity
              style={[
                styles.menuItem,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={() => router.push('/settings/users')}
            >
              <View style={styles.menuItemLeft}>
                <Users size={20} color={colors.textSecondary} />
                <Text
                  style={[styles.menuItemText, { color: colors.textPrimary }]}
                >
                  Manage Users
                </Text>
              </View>
              <ChevronRight size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.menuItem,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => router.push('/maintenance')}
          >
            <View style={styles.menuItemLeft}>
              <Wrench size={20} color={colors.textSecondary} />
              <Text
                style={[styles.menuItemText, { color: colors.textPrimary }]}
              >
                Maintenance Requests
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.menuItem,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => router.push('/reports')}
          >
            <View style={styles.menuItemLeft}>
              <FileText size={20} color={colors.textSecondary} />
              <Text
                style={[styles.menuItemText, { color: colors.textPrimary }]}
              >
                Reports
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.menuItem,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => router.push('/tax-report')}
          >
            <View style={styles.menuItemLeft}>
              <DollarSign size={20} color={colors.textSecondary} />
              <Text
                style={[styles.menuItemText, { color: colors.textPrimary }]}
              >
                Tax Report
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Account
          </Text>

          <TouchableOpacity
            style={[
              styles.menuItem,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => router.push('/settings/profile')}
          >
            <View style={styles.menuItemLeft}>
              <User size={20} color={colors.textSecondary} />
              <Text
                style={[styles.menuItemText, { color: colors.textPrimary }]}
              >
                Edit Profile
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.menuItem,
              {
                backgroundColor: colors.overdueBg,
                borderColor: colors.overdueBg,
              },
            ]}
            onPress={handleLogout}
          >
            <View style={styles.menuItemLeft}>
              <LogOut size={20} color={colors.overdueText} />
              <Text
                style={[
                  styles.menuItemText,
                  { color: colors.overdueText, fontWeight: '600' },
                ]}
              >
                Logout
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Property Manager v1.0.0
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 24, fontWeight: '600' },
  content: { padding: 16 },
  profileSection: {
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: { fontSize: 20, fontWeight: '600', marginTop: 16 },
  profileEmail: { fontSize: 14, marginTop: 4 },
  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 12,
  },
  roleBadgeText: { fontSize: 12, fontWeight: '500' },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  themeRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 9,
  },
  themeOptionText: { fontSize: 13, fontWeight: '500' },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuItemText: { fontSize: 16 },
  footer: { alignItems: 'center', paddingVertical: 24 },
  footerText: { fontSize: 12 },
});
