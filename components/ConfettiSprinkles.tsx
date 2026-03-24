import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const COLORS = ['#a786ff', '#fd8bbc', '#eca184', '#f8deb1', '#FF6B6B', '#6BCB77', '#4D96FF', '#FFD93D'];

const SHAPES: ParticleData['shape'][] = ['rect', 'circle', 'diamond', 'star'];

interface ParticleData {
  id: string;
  side: 'left' | 'right';
  angle: number;
  speed: number;
  spread: number;
  delay: number;
  color: string;
  size: number;
  rotation: number;
  shape: 'rect' | 'circle' | 'diamond' | 'star';
}

function generateParticles(): ParticleData[] {
  const particles: ParticleData[] = [];
  const count = 80;

  for (let i = 0; i < count; i++) {
    const side: 'left' | 'right' = i % 2 === 0 ? 'left' : 'right';
    const baseAngle = side === 'left' ? 60 : 120;
    const spreadRange = 55;
    const angleOffset = (Math.random() - 0.5) * spreadRange;
    const angleDeg = baseAngle + angleOffset;
    const angleRad = (angleDeg * Math.PI) / 180;

    particles.push({
      id: `${Date.now()}_${i}`,
      side,
      angle: angleRad,
      speed: 50 + Math.random() * 30,
      spread: spreadRange,
      delay: Math.random() * 2800,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
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

  const originX = data.side === 'left' ? -10 : SCREEN_WIDTH + 10;
  const originY = SCREEN_HEIGHT * 0.5;

  const cosA = Math.cos(data.angle);
  const sinA = -Math.sin(data.angle);

  const velocityX = cosA * data.speed;
  const velocityY = sinA * data.speed;

  const midX = velocityX * 6;
  const midY = velocityY * 6;
  const endX = midX + velocityX * 2;
  const endY = midY + SCREEN_HEIGHT * 0.6;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(data.delay),
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(progress, { toValue: 1, duration: 1800 + Math.random() * 600, useNativeDriver: true }),
      ]),
    ]);
    animation.start();
    return () => animation.stop();
  }, [data.delay, opacityAnim, progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, midX, endX],
  });

  const translateY = progress.interpolate({
    inputRange: [0, 0.3, 0.5, 1],
    outputRange: [0, midY * 0.6, midY, endY],
  });

  const scale = progress.interpolate({
    inputRange: [0, 0.1, 0.6, 1],
    outputRange: [0.2, 1.1, 1, 0.4],
  });

  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [`${data.rotation}deg`, `${data.rotation + 720}deg`],
  });

  const opacity = Animated.multiply(
    opacityAnim,
    progress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] })
  );

  return (
    <Animated.View
      style={{
        position: 'absolute' as const,
        left: originX,
        top: originY,
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
      console.log('[Confetti] Side cannons triggered');
      setParticles(generateParticles());
      cleanup();
      timerRef.current = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, 4000);
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
