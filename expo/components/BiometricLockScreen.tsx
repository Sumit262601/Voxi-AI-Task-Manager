import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Platform,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Fingerprint, ScanFace, Lock } from 'lucide-react-native';
import { authenticateWithBiometrics } from '@/utils/biometricAuth';

interface BiometricLockScreenProps {
  biometricType: 'face' | 'fingerprint' | 'iris' | 'none';
  onUnlock: () => void;
}

export default function BiometricLockScreen({ biometricType, onUnlock }: BiometricLockScreenProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    const ring = Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(ringAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    ring.start();

    return () => {
      pulse.stop();
      ring.stop();
    };
  }, [pulseAnim, fadeAnim, slideAnim, ringAnim]);

  const handleAuthenticate = useCallback(async () => {
    const label =
      biometricType === 'face'
        ? Platform.OS === 'ios'
          ? 'Face ID'
          : 'Face Recognition'
        : biometricType === 'fingerprint'
        ? Platform.OS === 'ios'
          ? 'Touch ID'
          : 'Fingerprint'
        : 'Biometric';

    const result = await authenticateWithBiometrics(`Unlock with ${label}`);
    if (result.success) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => onUnlock());
    }
  }, [biometricType, fadeAnim, onUnlock]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void handleAuthenticate();
    }, 500);
    return () => clearTimeout(timer);
  }, [handleAuthenticate]);

  const renderIcon = () => {
    const size = 56;
    const color = '#FFFFFF';
    if (biometricType === 'face') {
      return <ScanFace size={size} color={color} strokeWidth={1.5} />;
    }
    if (biometricType === 'fingerprint') {
      return <Fingerprint size={size} color={color} strokeWidth={1.5} />;
    }
    return <Lock size={size} color={color} strokeWidth={1.5} />;
  };

  const getTitle = () => {
    if (biometricType === 'face') {
      return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
    }
    if (biometricType === 'fingerprint') {
      return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    }
    return 'Biometric Lock';
  };

  const ringScale = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.4],
  });
  const ringOpacity = ringAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.1, 0],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={['#1A1A2E', '#16213E', '#0F3460']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <View style={styles.patternOverlay}>
          {[...Array(8)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.patternDot,
                {
                  left: `${(i * 14 + 5) % 100}%`,
                  top: `${(i * 12 + 8) % 90}%`,
                  opacity: 0.04 + i * 0.01,
                  width: 60 + i * 15,
                  height: 60 + i * 15,
                },
              ]}
            />
          ))}
        </View>

        <Animated.View
          style={[
            styles.content,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.lockIconWrapper}>
            <Animated.View
              style={[
                styles.ringOuter,
                {
                  transform: [{ scale: ringScale }],
                  opacity: ringOpacity,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.iconCircle,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              {renderIcon()}
            </Animated.View>
          </View>

          <Text style={styles.title}>App Locked</Text>
          <Text style={styles.subtitle}>
            Tap below to unlock with {getTitle()}
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.unlockButton,
              pressed && styles.unlockButtonPressed,
            ]}
            onPress={handleAuthenticate}
          >
            <LinearGradient
              colors={['#FF9052', '#FFB347']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.unlockGradient}
            >
              <Text style={styles.unlockText}>Unlock with {getTitle()}</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
}

type LockStyles = {
  container: ViewStyle;
  gradient: ViewStyle;
  patternOverlay: ViewStyle;
  patternDot: ViewStyle;
  content: ViewStyle;
  lockIconWrapper: ViewStyle;
  ringOuter: ViewStyle;
  iconCircle: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
  unlockButton: ViewStyle;
  unlockButtonPressed: ViewStyle;
  unlockGradient: ViewStyle;
  unlockText: TextStyle;
};

const styles = StyleSheet.create<LockStyles>({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patternOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  patternDot: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  lockIconWrapper: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  ringOuter: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#FF9052',
  },
  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,144,82,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,144,82,0.35)',
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 50,
    lineHeight: 22,
  },
  unlockButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FF9052',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  unlockButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  unlockGradient: {
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 16,
  },
  unlockText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
