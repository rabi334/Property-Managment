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
import { paymentService } from '@/services/payment.service';
import { useAuthStore } from '@/stores/authStore';
import {
  ArrowLeft,
  Trash2,
  DollarSign,
  Calendar,
  CreditCard,
  Building2,
  Hop as Home,
  FileText,
} from 'lucide-react-native';

export default function PaymentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();

  const [payment, setPayment] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = user?.role === 'OWNER';

  useEffect(() => {
    if (id) loadPayment();
  }, [id]);

  const loadPayment = async () => {
    try {
      setIsLoading(true);
      const data = await paymentService.getById(id as string);
      setPayment(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load payment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (!id) {
      Alert.alert(
        'Error',
        'Missing payment ID. Please reopen this payment and try again.',
      );
      return;
    }

    if (!canDelete) {
      Alert.alert('Permission denied', 'Only owners can delete payments.');
      return;
    }
    Alert.alert(
      'Delete Payment',
      'Are you sure you want to delete this payment record? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await paymentService.delete(id as string);
              Alert.alert('Deleted', 'Payment deleted successfully.', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete payment');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!payment) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Payment not found</Text>
      </View>
    );
  }

  const methodColor: Record<string, string> = {
    cash: '#10b981',
    bank: '#2563eb',
    mobile: '#f59e0b',
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Details</Text>
        <View style={styles.headerActions}>
          {canDelete && (
            <TouchableOpacity
              onPress={handleDelete}
              disabled={isDeleting}
              style={styles.deleteBtn}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <Trash2 size={20} color="#ef4444" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Amount Card */}
        <View style={styles.amountCard}>
          <View style={styles.amountIconRow}>
            <View style={styles.amountIconCircle}>
              <DollarSign size={32} color="#10b981" />
            </View>
          </View>
          <Text style={styles.amountValue}>
            ${Number(payment.amount).toFixed(2)}
          </Text>
          <Text style={styles.amountLabel}>Payment Received</Text>
        </View>

        {/* Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.cardTitle}>Details</Text>

          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <Calendar size={18} color="#6b7280" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Payment Date</Text>
              <Text style={styles.rowValue}>
                {new Date(payment.payment_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <CreditCard size={18} color="#6b7280" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Payment Method</Text>
              <View
                style={[
                  styles.methodBadge,
                  {
                    backgroundColor: methodColor[payment.payment_method] + '20',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.methodBadgeText,
                    { color: methodColor[payment.payment_method] },
                  ]}
                >
                  {payment.payment_method.charAt(0).toUpperCase() +
                    payment.payment_method.slice(1)}
                </Text>
              </View>
            </View>
          </View>

          {payment.notes && (
            <>
              <View style={styles.divider} />
              <View style={styles.row}>
                <View style={styles.rowIcon}>
                  <FileText size={18} color="#6b7280" />
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.rowLabel}>Notes</Text>
                  <Text style={styles.rowValue}>{payment.notes}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Unit / Property Card */}
        {payment.unit && (
          <View style={styles.detailsCard}>
            <Text style={styles.cardTitle}>Property & Unit</Text>

            {payment.unit.property && (
              <>
                <View style={styles.row}>
                  <View style={styles.rowIcon}>
                    <Building2 size={18} color="#6b7280" />
                  </View>
                  <View style={styles.rowContent}>
                    <Text style={styles.rowLabel}>Property</Text>
                    <Text style={styles.rowValue}>
                      {payment.unit.property.name}
                    </Text>
                    <Text style={styles.rowSub}>
                      {payment.unit.property.address}
                    </Text>
                  </View>
                </View>
                <View style={styles.divider} />
              </>
            )}

            <View style={styles.row}>
              <View style={styles.rowIcon}>
                <Home size={18} color="#6b7280" />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>Unit</Text>
                <Text style={styles.rowValue}>{payment.unit.unit_name}</Text>
                <Text style={styles.rowSub}>
                  ${Number(payment.unit.rent_amount).toFixed(2)} /{' '}
                  {payment.unit.rent_type}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Meta */}
        <Text style={styles.metaText}>
          Recorded on{' '}
          {new Date(payment.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </Text>
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
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerActions: {
    width: 36,
    alignItems: 'flex-end',
  },
  deleteBtn: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  amountCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  amountIconRow: {
    marginBottom: 12,
  },
  amountIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  amountValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#10b981',
    marginBottom: 4,
  },
  amountLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 2,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  rowSub: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 12,
  },
  methodBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 2,
  },
  methodBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  metaText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 4,
  },
});
