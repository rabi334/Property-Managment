import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { tenantService } from '@/services/tenant.service';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/hooks/useTheme';
import {
  Plus,
  User,
  Phone,
  Hop as Home,
  ChevronRight,
  Search,
  X,
} from 'lucide-react-native';

export default function TenantsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const [tenants, setTenants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      setIsLoading(true);
      const data = await tenantService.getAll();
      setTenants(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTenants();
    setRefreshing(false);
  };

  const filteredTenants = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return tenants;
    return tenants.filter(
      (t) =>
        t.full_name?.toLowerCase().includes(q) ||
        t.phone?.toLowerCase().includes(q) ||
        t.id_number?.toLowerCase().includes(q) ||
        t.unit?.unit_name?.toLowerCase().includes(q) ||
        t.unit?.property?.name?.toLowerCase().includes(q),
    );
  }, [tenants, search]);

  const canManage = user?.role === 'OWNER' || user?.role === 'MANAGER';

  if (isLoading && tenants.length === 0) {
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
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Tenants
        </Text>
        {canManage && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/tenants/create')}
          >
            <Plus size={18} color="#fff" />
            <Text style={styles.addButtonText}>Add tenant</Text>
          </TouchableOpacity>
        )}
      </View>

      <View
        style={[
          styles.searchContainer,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <Search size={16} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search by name, phone, unit, or property…"
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        {search.length > 0 && (
          <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
            {filteredTenants.length} of {tenants.length} tenant
            {tenants.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      <FlatList
        data={filteredTenants}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.tenantCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => router.push(`/tenants/${item.id}`)}
          >
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: colors.currentBg },
              ]}
            >
              <User size={22} color={colors.accent} />
            </View>
            <View style={styles.tenantInfo}>
              <Text
                style={[styles.tenantName, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {item.full_name}
              </Text>
              <View style={styles.metaRow}>
                <Phone size={12} color={colors.textSecondary} />
                <Text
                  style={[styles.metaText, { color: colors.textSecondary }]}
                >
                  {item.phone}
                </Text>
              </View>
              {item.unit && (
                <View style={styles.metaRow}>
                  <Home size={12} color={colors.textSecondary} />
                  <Text
                    style={[styles.metaText, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {item.unit.unit_name}
                    {item.unit.property?.name
                      ? ` — ${item.unit.property.name}`
                      : ''}
                  </Text>
                </View>
              )}
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <User size={64} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {search ? 'No tenants found' : 'No tenants yet'}
            </Text>
            <Text
              style={[styles.emptySubtitle, { color: colors.textSecondary }]}
            >
              {search
                ? `No results for "${search}"`
                : 'Add your first tenant to get started'}
            </Text>
            {!search && canManage && (
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: colors.accent }]}
                onPress={() => router.push('/tenants/create')}
              >
                <Text style={styles.emptyButtonText}>
                  Add your first tenant
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 24, fontWeight: '600' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },
  resultCount: { fontSize: 12, fontWeight: '500' },
  listContent: { padding: 16, flexGrow: 1 },
  tenantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tenantInfo: { flex: 1, marginLeft: 12 },
  tenantName: { fontSize: 15, fontWeight: '500' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 5 },
  metaText: { fontSize: 13, flex: 1 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', marginTop: 16 },
  emptySubtitle: { fontSize: 14, marginTop: 6, textAlign: 'center' },
  emptyButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyButtonText: { color: '#fff', fontSize: 14, fontWeight: '500' },
});
