import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const COLORS = ['#a786ff', '#fd8bbc', '#eca184', '#f8deb1', '#FF6B6B', '#6BCB77', '#4D96FF', '#FFD93D'];

interface ParticleData {
  id: string;
  originX: number;
  originY: number;
  angle: number;
  speed: number;
  color: string;
  size: number;
  rotationEnd: number;
  gravity: number;
  delay: number;
  duration: number;
}

function generateBurst(originX: number, originY: number, count: number, baseDelay: number): ParticleData[] {
  const particles: ParticleData[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const speed = 20 + Math.random() * 40;
    particles.push({
      id: `${Date.now()}_${baseDelay}_${i}`,
      originX,
      originY,
      angle,
      speed,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 5 + Math.random() * 7,
      rotationEnd: 360 + Math.random() * 720,
      gravity: 18 + Math.random() * 14,
      delay: baseDelay + Math.random() * 80,
      duration: 1800 + Math.random() * 600,
    });
  }
  return particles;
}

function generateFireworks(durationMs: number): ParticleData[] {
  const particles: ParticleData[] = [];
  const burstInterval = 250;
  const bursts = Math.floor(durationMs / burstInterval);

  for (let b = 0; b < bursts; b++) {
    const timeLeft = durationMs - b * burstInterval;
    const particleCount = Math.floor(50 * (timeLeft / durationMs));
    if (particleCount <= 0) break;

    const half = Math.floor(particleCount / 2);

    const leftX = 0.1 * SCREEN_WIDTH + Math.random() * 0.2 * SCREEN_WIDTH;
    const leftY = Math.random() * SCREEN_HEIGHT * 0.6;
    particles.push(...generateBurst(leftX, leftY, half, b * burstInterval));

    const rightX = 0.7 * SCREEN_WIDTH + Math.random() * 0.2 * SCREEN_WIDTH;
    const rightY = Math.random() * SCREEN_HEIGHT * 0.6;
    particles.push(...generateBurst(rightX, rightY, half, b * burstInterval));
  }

  return particles;
}

function FireworkParticle({ data }: { data: ParticleData }) {
  const progress = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  const endX = Math.cos(data.angle) * data.speed * 6;
  const endY = Math.sin(data.angle) * data.speed * 6 + data.gravity * 12;

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(data.delay),
      Animated.parallel([
        Animated.timing(fadeIn, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(progress, { toValue: 1, duration: data.duration, useNativeDriver: true }),
      ]),
    ]);
    anim.start();
    return () => anim.stop();
  }, [data.delay, data.duration, fadeIn, progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, endX * 0.5, endX],
  });

  const translateY = progress.interpolate({
    inputRange: [0, 0.2, 0.5, 1],
    outputRange: [0, endY * 0.15, endY * 0.4, endY],
  });

  const scale = progress.interpolate({
    inputRange: [0, 0.1, 0.5, 0.85, 1],
    outputRange: [0.1, 1.2, 1, 0.6, 0],
  });

  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${data.rotationEnd}deg`],
  });

  const opacity = Animated.multiply(
    fadeIn,
    progress.interpolate({ inputRange: [0, 0.5, 0.85, 1], outputRange: [1, 1, 0.5, 0] })
  );

  const isCircle = data.size > 9;

  return (
    <Animated.View
      style={{
        position: 'absolute' as const,
        left: data.originX,
        top: data.originY,
        opacity,
        transform: [{ translateX }, { translateY }, { scale }, { rotate }],
      }}
    >
      <View
        style={{
          width: data.size,
          height: isCircle ? data.size : data.size * 1.4,
          backgroundColor: data.color,
          borderRadius: isCircle ? data.size / 2 : 2,
        }}
      />
    </Animated.View>
  );
}

interface ConfettiSprinklesProps {
  visible: boolean;
  onComplete?: () => void;
}

export default function ConfettiSprinkles({ visible, onComplete }: ConfettiSprinklesProps) {
  const [particles, setParticles] = useState<ParticleData[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (visible) {
      console.log('[Confetti] Fireworks triggered');
      const fireworkDuration = 5000;
      setParticles(generateFireworks(fireworkDuration));
      cleanup();
      timerRef.current = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, fireworkDuration + 2500);
    } else {
      setParticles([]);
      cleanup();
    }
    return cleanup;
  }, [visible, onComplete, cleanup]);

  if (particles.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((data) => (
        <FireworkParticle key={data.id} data={data} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    overflow: 'hidden',
  },
});
