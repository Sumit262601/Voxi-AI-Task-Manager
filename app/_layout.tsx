import { AuthProvider, AuthNavigationSync } from '@/contexts/auth';
import { TasksProvider } from '@/contexts/tasks';
import { PurchasesProvider } from '@/contexts/purchases';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState, useCallback } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import BiometricLockScreen from '@/components/BiometricLockScreen';
import { isBiometricEnabled, checkBiometricSupport } from '@/utils/biometricAuth';
import { useAuth } from '@/contexts/auth';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Back' }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="chat-agent"
        options={{
          headerShown: false,
          presentation: 'transparentModal',
          animation: 'none',
        }}
      />
      <Stack.Screen
        name="paywall"
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}

function BiometricGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isLocked, setIsLocked] = useState(false);
  const [biometricType, setBiometricType] = useState<'face' | 'fingerprint' | 'iris' | 'none'>('none');
  const [checkedInitial, setCheckedInitial] = useState(false);

  const checkAndLock = useCallback(async () => {
    if (Platform.OS === 'web' || !user) {
      setIsLocked(false);
      setCheckedInitial(true);
      return;
    }
    try {
      const enabled = await isBiometricEnabled();
      if (enabled) {
        const support = await checkBiometricSupport();
        if (support.isAvailable) {
          setBiometricType(support.biometricType);
          setIsLocked(true);
        }
      }
    } catch (err) {
      console.error('[BiometricGate] Check failed:', err);
    }
    setCheckedInitial(true);
  }, [user]);

  useEffect(() => {
    void checkAndLock();
  }, [checkAndLock]);

  useEffect(() => {
    if (Platform.OS === 'web' || !user) return;

    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        const enabled = await isBiometricEnabled();
        if (enabled) {
          const support = await checkBiometricSupport();
          if (support.isAvailable) {
            setBiometricType(support.biometricType);
            setIsLocked(true);
          }
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [user]);

  if (!checkedInitial) return null;

  return (
    <>
      {children}
      {isLocked && (
        <BiometricLockScreen
          biometricType={biometricType}
          onUnlock={() => setIsLocked(false)}
        />
      )}
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <AuthNavigationSync />
          <TasksProvider>
            <PurchasesProvider>
              <StatusBar style="dark" />
              <BiometricGate>
                <RootLayoutNav />
              </BiometricGate>
            </PurchasesProvider>
          </TasksProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
