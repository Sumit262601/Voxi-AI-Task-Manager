import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_ENABLED_KEY = '@biometric_auth_enabled';

let LocalAuthentication: typeof import('expo-local-authentication') | null = null;

if (Platform.OS !== 'web') {
  try {
    LocalAuthentication = require('expo-local-authentication');
  } catch (e) {
    console.warn('[Biometric] expo-local-authentication not available:', e);
  }
}

interface BiometricResult {
  success: boolean;
  error?: string;
}

interface BiometricSupport {
  isAvailable: boolean;
  biometricType: 'face' | 'fingerprint' | 'iris' | 'none';
}

export async function checkBiometricSupport(): Promise<BiometricSupport> {
  if (Platform.OS === 'web') {
    return { isAvailable: false, biometricType: 'none' };
  }

  try {
    if (!LocalAuthentication) {
      return { isAvailable: false, biometricType: 'none' };
    }
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      return { isAvailable: false, biometricType: 'none' };
    }

    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    let biometricType: 'face' | 'fingerprint' | 'iris' | 'none' = 'none';

    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometricType = 'face';
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometricType = 'fingerprint';
    } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      biometricType = 'iris';
    }

    console.log('[Biometric] Support check:', { hasHardware, isEnrolled, biometricType });
    return { isAvailable: true, biometricType };
  } catch (err) {
    console.error('[Biometric] Support check failed:', err);
    return { isAvailable: false, biometricType: 'none' };
  }
}

export async function authenticateWithBiometrics(promptMessage?: string): Promise<BiometricResult> {
  if (Platform.OS === 'web') {
    return { success: true };
  }

  try {
    if (!LocalAuthentication) {
      return { success: false, error: 'Biometrics not available' };
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: promptMessage || 'Authenticate to access the app',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
      fallbackLabel: 'Use Passcode',
    });

    console.log('[Biometric] Auth result:', result.success);
    return {
      success: result.success,
      error: result.success ? undefined : 'Authentication failed',
    };
  } catch (err) {
    console.error('[Biometric] Auth error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Authentication failed',
    };
  }
}

export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
    console.log('[Biometric] Setting enabled:', enabled);
  } catch (err) {
    console.error('[Biometric] Failed to save setting:', err);
  }
}

export function getBiometricLabel(type: 'face' | 'fingerprint' | 'iris' | 'none'): string {
  switch (type) {
    case 'face':
      return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
    case 'fingerprint':
      return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    case 'iris':
      return 'Iris Recognition';
    default:
      return 'Biometric';
  }
}
