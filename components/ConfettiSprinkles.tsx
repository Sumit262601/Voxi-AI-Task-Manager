import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const COLORS = ['#a786ff', '#fd8bbc', '#eca184', '#f8deb1', '#FF6B6B', '#6BCB77', '#4D96FF', '#FFD93D'];

const SHAPES: ParticleData['shape'][] = ['rect', 'circle', 'diamond', 'star'];

interface ParticleData {
  id: string;
  side: 'left' | 'right';
  startX: number;
  velocityX: number;
  velocityY: number;
  delay: number;
  color: string;
  size: number;
  rotationStart: number;
  rotationEnd: number;
  shape: 'rect' | 'circle' | 'diamond' | 'star';
  gravity: number;
  wobbleAmp: number;
  wobbleFreq: number;
}

function generateParticles(): ParticleData[] {
  const particles: ParticleData[] = [];
  const count = 100;

  for (let i = 0; i < count; i++) {
    const side: 'left' | 'right' = i % 2 === 0 ? 'left' : 'right';
    const startX = side === 'left' ? -5 : SCREEN_WIDTH + 5;

    const angleDeg = side === 'left'
      ? 55 + Math.random() * 40
      : 85 + Math.random() * 40;
    const angleRad = (angleDeg * Math.PI) / 180;

    const speed = 55 + Math.random() * 35;
    const dirX = side === 'left' ? 1 : -1;

    particles.push({
      id: `${Date.now()}_${i}`,
      side,
      startX,
      velocityX: Math.cos(angleRad) * speed * dirX,
      velocityY: -Math.sin(angleRad) * speed,
      delay: Math.random() * 1800,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 6 + Math.random() * 8,
      rotationStart: Math.random() * 360,
      rotationEnd: Math.random() * 360 + 540 + Math.random() * 360,
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      gravity: 12 + Math.random() * 10,
      wobbleAmp: 8 + Math.random() * 20,
      wobbleFreq: 1 + Math.random() * 2,
    });
  }

  return particles;
}

function ShapeView({ color, size, shape }: { color: string; size: number; shape: ParticleData['shape'] }) {
  switch (shape) {
    case 'circle':
      return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
    case 'diamond':
      return (
        <View style={{
          width: size * 0.9, height: size * 0.9, backgroundColor: color,
          transform: [{ rotate: '45deg' }], borderRadius: 2,
        }} />
      );
    case 'star':
      return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: size * 0.35, height: size, backgroundColor: color, borderRadius: 1, position: 'absolute' as const }} />
          <View style={{ width: size, height: size * 0.35, backgroundColor: color, borderRadius: 1, position: 'absolute' as const }} />
        </View>
      );
    default:
      return <View style={{ width: size, height: size * 1.6, backgroundColor: color, borderRadius: 2 }} />;
  }
}

function CannonParticle({ data }: { data: ParticleData }) {
  const progress = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const duration = 2400 + Math.random() * 800;

  const peakT = 0.3;
  const riseX = data.velocityX * 5;
  const riseY = data.velocityY * 5;

  const midX = riseX + data.velocityX * 1.5 + data.wobbleAmp;
  const midY = riseY + data.gravity * 3;

  const endX = midX + data.wobbleAmp * (data.side === 'left' ? 0.5 : -0.5);
  const endY = SCREEN_HEIGHT * 0.7 + Math.random() * SCREEN_HEIGHT * 0.3;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(data.delay),
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(progress, { toValue: 1, duration, useNativeDriver: true }),
      ]),
    ]);
    animation.start();
    return () => animation.stop();
  }, [data.delay, opacityAnim, progress, duration]);

  const translateX = progress.interpolate({
    inputRange: [0, peakT, 0.6, 1],
    outputRange: [0, riseX, midX, endX],
  });

  const translateY = progress.interpolate({
    inputRange: [0, peakT, 0.55, 0.75, 1],
    outputRange: [0, riseY, riseY + data.gravity * 8, midY + data.gravity * 14, endY],
  });

  const scale = progress.interpolate({
    inputRange: [0, 0.08, 0.5, 0.85, 1],
    outputRange: [0.2, 1.15, 1, 0.7, 0.3],
  });

  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [`${data.rotationStart}deg`, `${data.rotationEnd}deg`],
  });

  const opacity = Animated.multiply(
    opacityAnim,
    progress.interpolate({ inputRange: [0, 0.6, 0.85, 1], outputRange: [1, 1, 0.6, 0] })
  );

  return (
    <Animated.View
      style={{
        position: 'absolute' as const,
        left: data.startX,
        top: SCREEN_HEIGHT * 0.45,
        opacity,
        transform: [{ translateX }, { translateY }, { scale }, { rotate }],
      }}
    >
      <ShapeView color={data.color} size={data.size} shape={data.shape} />
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
      console.log('[Confetti] Side cannons triggered - shoot up & fall');
      setParticles(generateParticles());
      cleanup();
      timerRef.current = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, 5000);
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
        <CannonParticle key={data.id} data={data} />
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
