import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { maintenanceService } from '@/services/maintenance.service';
import { MaintenanceStatus } from '@/types/database';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/hooks/useTheme';
import { ArrowLeft, Wrench, Trash2 } from 'lucide-react-native';

const STATUSES: MaintenanceStatus[] = ['pending', 'in_progress', 'completed'];

export default function MaintenanceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { colors } = useTheme();

  const [request, setRequest] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const canManage = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const canDelete = user?.role === 'OWNER';

  useEffect(() => {
    if (id) {
      loadRequest();
    }
  }, [id]);

  const loadRequest = async () => {
    try {
      setIsLoading(true);
      const data = await maintenanceService.getById(id as string);
      setRequest(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (status: MaintenanceStatus) => {
    if (!canManage) return;
    if (!request) return;

    try {
      setIsUpdating(true);
      const updated = await maintenanceService.update(request.id, { status });
      setRequest(updated);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = () => {
    if (!id) {
      Alert.alert('Error', 'Missing request ID. Please reopen this request and try again.');
      return;
    }

    if (!canDelete) {
      Alert.alert('Permission denied', 'Only owners can delete maintenance requests.');
      return;
    }

    Alert.alert(
      'Delete Request',
      'Are you sure you want to delete this maintenance request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await maintenanceService.delete(id as string);
              Alert.alert('Deleted', 'Maintenance request deleted successfully.', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete request');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Request not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Maintenance Request</Text>
        <View style={styles.headerActions}>
          {canDelete && (
            <TouchableOpacity onPress={handleDelete}>
              <Trash2 size={20} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.iconRow}>
            <View style={[styles.iconCircle, { backgroundColor: colors.background }]}>
              <Wrench size={24} color={colors.accent} />
            </View>
            <View style={styles.iconText}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{request.title}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {request.unit?.unit_name} • {request.unit?.property?.name}
              </Text>
            </View>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Description</Text>
          <Text style={[styles.description, { color: colors.textPrimary }]}>{request.description}</Text>

          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Status</Text>
          <View style={styles.statusRow}>
            {STATUSES.map((s) => {
              const isSelected = request.status === s;
              return (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.statusChip,
                    {
                      backgroundColor: isSelected ? colors.accent : colors.card,
                      borderColor: isSelected ? colors.accent : colors.border,
                    },
                  ]}
                  disabled={!canManage || isUpdating}
                  onPress={() => handleStatusChange(s)}>
                  <Text
                    style={[
                      styles.statusChipText,
                      { color: isSelected ? '#fff' : colors.textSecondary },
                    ]}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
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
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    marginLeft: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  statusChipSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  statusChipTextSelected: {
    color: '#fff',
  },
});

