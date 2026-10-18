import { useEffect, Component, ReactNode } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';

// ─── Error Boundary ────────────────────────────────────────────────────────
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>🚨 App Error</Text>
            <Text style={styles.errorSubtitle}>
              Something went wrong during startup.
            </Text>
            <View style={styles.errorBox}>
              <ScrollView>
                <Text style={styles.errorMessage}>
                  {this.state.error?.message ?? 'Unknown error'}
                </Text>
                {this.state.error?.stack ? (
                  <Text style={styles.errorStack}>
                    {this.state.error.stack}
                  </Text>
                ) : null}
              </ScrollView>
            </View>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => this.setState({ hasError: false, error: null })}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// ─── Root Layout ───────────────────────────────────────────────────────────
export default function RootLayout() {
  useFrameworkReady();

  return (
    <ErrorBoundary>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ErrorBoundary>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 480,
    borderWidth: 1,
    borderColor: '#fecaca',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#dc2626',
    marginBottom: 6,
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: '#1e1e2e',
    borderRadius: 10,
    padding: 14,
    maxHeight: 260,
    marginBottom: 20,
  },
  errorMessage: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f87171',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  errorStack: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  retryButton: {
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
