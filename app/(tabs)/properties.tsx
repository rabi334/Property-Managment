import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { usePropertyStore } from '@/stores/propertyStore';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/hooks/useTheme';
import {
  Plus,
  Building2,
  MapPin,
  ChevronRight,
  Search,
  X,
} from 'lucide-react-native';
import { PropertyType } from '@/types/database';

const TYPE_FILTERS: { label: string; value: PropertyType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Apartment', value: 'apartment' },
  { label: 'Commercial', value: 'commercial' },
  { label: 'Mixed-use', value: 'mixed-use' },
];

export default function PropertiesScreen() {
  const router = useRouter();
  const { properties, isLoading, fetchProperties } = usePropertyStore();
  const { user } = useAuthStore();
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<PropertyType | 'all'>('all');

  useEffect(() => {
    fetchProperties();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProperties();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProperties();
    setRefreshing(false);
  };

  const filteredProperties = useMemo(() => {
    const q = search.toLowerCase().trim();
    return properties.filter((p) => {
      const matchesSearch =
        !q ||
        p.name?.toLowerCase().includes(q) ||
        p.address?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q);
      const matchesType = typeFilter === 'all' || p.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [properties, search, typeFilter]);

  const canManage = user?.role === 'OWNER' || user?.role === 'MANAGER';

  if (isLoading && properties.length === 0) {
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
          Properties
        </Text>
        {canManage && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/properties/create')}
          >
            <Plus size={18} color="#fff" />
            <Text style={styles.addButtonText}>Add property</Text>
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
            placeholder="Search by name or address…"
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
            {filteredProperties.length} of {properties.length} propert
            {properties.length !== 1 ? 'ies' : 'y'}
          </Text>
        )}
      </View>

      <View
        style={[
          styles.filterRow,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        {TYPE_FILTERS.map((f) => {
          const count =
            f.value === 'all'
              ? properties.length
              : properties.filter((p) => p.type === f.value).length;
          const isSelected = typeFilter === f.value;
          return (
            <TouchableOpacity
              key={f.value}
              style={[
                styles.filterChip,
                {
                  borderColor: colors.border,
                  backgroundColor: isSelected ? colors.accent : colors.card,
                },
              ]}
              onPress={() => setTypeFilter(f.value)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: isSelected ? '#fff' : colors.textSecondary },
                ]}
              >
                {f.label}
              </Text>
              {count > 0 && (
                <View
                  style={[
                    styles.filterBadge,
                    {
                      backgroundColor: isSelected
                        ? 'rgba(255,255,255,0.25)'
                        : colors.background,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterBadgeText,
                      { color: isSelected ? '#fff' : colors.textSecondary },
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filteredProperties}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.propertyCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => router.push(`/properties/${item.id}`)}
          >
            {item.image_url ? (
              <Image
                source={{ uri: item.image_url }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: colors.currentBg },
                ]}
              >
                <Building2 size={22} color={colors.accent} />
              </View>
            )}
            <View style={styles.propertyInfo}>
              <Text
                style={[styles.propertyName, { color: colors.textPrimary }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <View style={styles.propertyMeta}>
                <MapPin size={12} color={colors.textSecondary} />
                <Text
                  style={[
                    styles.propertyAddress,
                    { color: colors.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {item.address}
                </Text>
              </View>
              <View style={styles.tagContainer}>
                <View
                  style={[styles.tag, { backgroundColor: colors.background }]}
                >
                  <Text
                    style={[styles.tagText, { color: colors.textSecondary }]}
                  >
                    {item.type}
                  </Text>
                </View>
                <View
                  style={[styles.tag, { backgroundColor: colors.background }]}
                >
                  <Text
                    style={[styles.tagText, { color: colors.textSecondary }]}
                  >
                    Tax: {item.tax_rate}%
                  </Text>
                </View>
              </View>
            </View>
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Building2 size={64} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {search || typeFilter !== 'all'
                ? 'No properties found'
                : 'No properties yet'}
            </Text>
            <Text
              style={[styles.emptySubtitle, { color: colors.textSecondary }]}
            >
              {search
                ? `No results for "${search}"`
                : typeFilter !== 'all'
                  ? `No ${typeFilter} properties`
                  : 'Add your first property to get started'}
            </Text>
            {!search && typeFilter === 'all' && canManage && (
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: colors.accent }]}
                onPress={() => router.push('/properties/create')}
              >
                <Text style={styles.emptyButtonText}>
                  Add your first property
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    gap: 5,
  },
  filterChipText: { fontSize: 12, fontWeight: '500' },
  filterBadge: {
    borderRadius: 999,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: { fontSize: 10, fontWeight: '600' },
  listContent: { padding: 16, flexGrow: 1 },
  propertyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnail: { width: 52, height: 52, borderRadius: 12 },
  propertyInfo: { flex: 1, marginLeft: 12 },
  propertyName: { fontSize: 15, fontWeight: '500' },
  propertyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
    flex: 1,
  },
  propertyAddress: { fontSize: 13, flex: 1 },
  tagContainer: { flexDirection: 'row', marginTop: 8, gap: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontSize: 11, textTransform: 'capitalize', fontWeight: '500' },
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
