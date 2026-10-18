import { confirmAction, notify } from '@/lib/platformAlert';
import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { propertyService } from '@/services/property.service';
import { unitService } from '@/services/unit.service';
import { useAuthStore } from '@/stores/authStore';
import { usePropertyStore } from '@/stores/propertyStore';
import {
  ArrowLeft,
  CreditCard as Edit,
  Trash2,
  Plus,
  MapPin,
  Hop as Home,
} from 'lucide-react-native';

export default function PropertyDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuthStore();
  const { deleteProperty } = usePropertyStore();
  const [property, setProperty] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Re-fetch when screen comes back into focus (e.g. after deleting a unit)
  useFocusEffect(
    useCallback(() => {
      if (id) loadData();
    }, [id]),
  );

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [propertyData, unitsData] = await Promise.all([
        propertyService.getById(id as string),
        unitService.getByPropertyId(id as string),
      ]);
      setProperty(propertyData);
      setUnits(unitsData || []);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirmAction(
      'Delete Property',
      `Are you sure you want to delete "${property?.name}"? All associated units, tenants, payments and expenses will also be removed. This action cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      console.log('Starting delete for property:', id);
      await deleteProperty(id as string);
      console.log('Delete completed successfully');
      if (Platform.OS === 'web') {
        window.alert('Property has been deleted successfully.');
      } else {
        Alert.alert('Deleted', 'Property has been deleted successfully.');
      }
      router.back();
    } catch (error: any) {
      console.error('Delete failed:', error);
      const msg =
        error.message || 'Failed to delete property. Please try again.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
    }
  };

  const canManage = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const canDelete = user?.role === 'OWNER';

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!property) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Property not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Property Details</Text>
        <View style={styles.headerActions}>
          {canManage && (
            <TouchableOpacity
              onPress={() => router.push(`/properties/edit/${id}`)}
            >
              <Edit size={20} color="#2563eb" />
            </TouchableOpacity>
          )}
          {canDelete && (
            <TouchableOpacity onPress={handleDelete} style={{ marginLeft: 16 }}>
              <Trash2 size={20} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.content}>
        {property.image_url ? (
          <Image
            source={{ uri: property.image_url }}
            style={styles.propertyImage}
            resizeMode="cover"
          />
        ) : null}

        <View style={styles.infoCard}>
          <Text style={styles.propertyName}>{property.name}</Text>
          <View style={styles.infoRow}>
            <MapPin size={16} color="#6b7280" />
            <Text style={styles.infoText}>{property.address}</Text>
          </View>
          <View style={styles.tagContainer}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{property.type}</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>Tax: {property.tax_rate}%</Text>
            </View>
          </View>
          {property.description && (
            <Text style={styles.description}>{property.description}</Text>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Units ({units.length})</Text>
            {canManage && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push(`/units/create?propertyId=${id}`)}
              >
                <Plus size={16} color="#2563eb" />
                <Text style={styles.addButtonText}>Add Unit</Text>
              </TouchableOpacity>
            )}
          </View>

          {units.length === 0 ? (
            <View style={styles.emptyState}>
              <Home size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No units added yet</Text>
            </View>
          ) : (
            units.map((unit) => (
              <TouchableOpacity
                key={unit.id}
                style={styles.unitCard}
                onPress={() => router.push(`/units/${unit.id}`)}
              >
                <View style={styles.unitInfo}>
                  <Text style={styles.unitName}>{unit.unit_name}</Text>
                  <Text style={styles.unitRent}>
                    ${unit.rent_amount} / {unit.rent_type}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    unit.status === 'occupied' && styles.statusOccupied,
                    unit.status === 'vacant' && styles.statusVacant,
                    unit.status === 'maintenance' && styles.statusMaintenance,
                  ]}
                >
                  <Text style={styles.statusText}>{unit.status}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  propertyImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#e5e7eb',
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
  },
  propertyName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
  },
  tagContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  unitCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  unitInfo: {
    flex: 1,
  },
  unitName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  unitRent: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
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
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
  },
});
