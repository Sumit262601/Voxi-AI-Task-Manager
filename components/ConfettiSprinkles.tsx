import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Animated, Dimensions, StyleSheet, View, Easing } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SPRINKLE_COLORS = [
  '#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF',
  '#FF8FDA', '#A66CFF', '#FF9F45', '#54BAB9',
  '#F94C10', '#C3FF99', '#FF78F0', '#00D2FF',
  '#FFE162', '#7EC8E3', '#E14D2A', '#B2A4FF',
];

const SHAPES: SprinkleData['shape'][] = ['rect', 'circle', 'diamond', 'star'];

interface SprinkleData {
  id: string;
  delay: number;
  duration: number;
  color: string;
  width: number;
  height: number;
  rotation: number;
  shape: 'rect' | 'circle' | 'diamond' | 'star';
  angle: number;
  burstRadius: number;
  trailColor: string;
  wave: number;
}

function generateFireworkBurst(centerX: number, burstY: number, count: number, baseDelay: number): SprinkleData[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
    const size = 5 + Math.random() * 9;
    return {
      id: `${Date.now()}_${baseDelay}_${i}`,
      delay: baseDelay,
      duration: 2500 + Math.random() * 1500,
      color: SPRINKLE_COLORS[Math.floor(Math.random() * SPRINKLE_COLORS.length)],
      width: size,
      height: size + Math.random() * 6,
      rotation: Math.random() * 360,
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      angle,
      burstRadius: 70 + Math.random() * 180,
      trailColor: SPRINKLE_COLORS[Math.floor(Math.random() * SPRINKLE_COLORS.length)],
      wave: wave(centerX, burstY),
    };
  });
}

function wave(centerX: number, burstY: number): number {
  return centerX + burstY * 0;
}

interface FireworkRocketProps {
  startX: number;
  burstY: number;
  riseDelay: number;
  riseDuration: number;
  particles: SprinkleData[];
}

function FireworkRocket({ startX, burstY, riseDelay, riseDuration, particles }: FireworkRocketProps) {
  const riseAnim = useRef(new Animated.Value(0)).current;
  const trailOpacity = useRef(new Animated.Value(0)).current;
  const [hasBurst, setHasBurst] = useState<boolean>(false);
  const flashAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(riseDelay),
      Animated.parallel([
        Animated.timing(trailOpacity, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(riseAnim, {
          toValue: 1,
          duration: riseDuration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]);
    animation.start(() => {
      setHasBurst(true);
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(flashAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    });
    return () => animation.stop();
  }, []);

  const rocketY = riseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT + 20, burstY],
  });

  const rocketOpacity = riseAnim.interpolate({
    inputRange: [0, 0.1, 0.9, 1],
    outputRange: [0, 1, 1, 0],
  });

  const rocketScale = riseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.6, 1, 0.3],
  });

  return (
    <>
      {!hasBurst && (
        <>
          <Animated.View style={{
            position: 'absolute' as const,
            left: startX - 3,
            top: 0,
            width: 6,
            height: 18,
            borderRadius: 3,
            backgroundColor: '#FFF',
            opacity: rocketOpacity,
            transform: [{ translateY: rocketY }, { scale: rocketScale }],
          }} />
          <Animated.View style={{
            position: 'absolute' as const,
            left: startX - 2,
            top: 0,
            width: 4,
            height: 30,
            borderRadius: 2,
            backgroundColor: '#FFD93D',
            opacity: Animated.multiply(trailOpacity, riseAnim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 0.7, 0],
            })),
            transform: [
              { translateY: Animated.add(rocketY, new Animated.Value(16)) },
              { scale: rocketScale },
            ],
          }} />
        </>
      )}

      <Animated.View style={{
        position: 'absolute' as const,
        left: startX - 25,
        top: burstY - 25,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.8)',
        opacity: flashAnim,
        transform: [{ scale: flashAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2.5] }) }],
      }} />

      {hasBurst && particles.map((p, idx) => (
        <BurstParticle key={p.id} data={p} burstX={startX} burstY={burstY} index={idx} />
      ))}
    </>
  );
}

function BurstParticle({ data, burstX, burstY }: { data: SprinkleData; burstX: number; burstY: number; index: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  const sparkle = useRef(new Animated.Value(1)).current;

  const targetX = Math.cos(data.angle) * data.burstRadius;
  const targetY = Math.sin(data.angle) * data.burstRadius;
  const gravity = 120 + Math.random() * 80;

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(progress, {
        toValue: 1,
        duration: data.duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(sparkle, { toValue: 0.3, duration: 200 + Math.random() * 200, useNativeDriver: true }),
          Animated.timing(sparkle, { toValue: 1, duration: 200 + Math.random() * 200, useNativeDriver: true }),
        ])
      ),
    ]);
    animation.start();
    return () => animation.stop();
  }, []);

  const translateX = progress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, targetX, targetX * 0.85],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, targetY, targetY + gravity],
  });
  const scale = progress.interpolate({
    inputRange: [0, 0.1, 0.4, 1],
    outputRange: [0.2, 1.5, 1, 0],
  });
  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${data.rotation + 540}deg`],
  });
  const opacity = Animated.multiply(
    sparkle,
    progress.interpolate({ inputRange: [0, 0.1, 0.6, 1], outputRange: [1, 1, 0.8, 0] })
  );

  return (
    <Animated.View style={{
      position: 'absolute' as const,
      left: burstX,
      top: burstY,
      opacity,
      transform: [{ translateX }, { translateY }, { scale }, { rotate }],
    }}>
      <ShapeView data={data} />
    </Animated.View>
  );
}

function ShapeView({ data }: { data: SprinkleData }) {
  const { width, color, shape } = data;
  const height = data.height;
  switch (shape) {
    case 'circle':
      return <View style={{ width, height: width, borderRadius: width / 2, backgroundColor: color }} />;
    case 'diamond':
      return (
        <View style={{
          width: width * 0.9, height: width * 0.9, backgroundColor: color,
          transform: [{ rotate: '45deg' }], borderRadius: 2,
        }} />
      );
    case 'star':
      return (
        <View style={{ width: width * 1.1, height: width * 1.1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: width * 0.4, height: width * 1.1, backgroundColor: color, borderRadius: 1, position: 'absolute' as const }} />
          <View style={{ width: width * 1.1, height: width * 0.4, backgroundColor: color, borderRadius: 1, position: 'absolute' as const }} />
        </View>
      );
    default:
      return <View style={{ width, height, backgroundColor: color, borderRadius: 2 }} />;
  }
}

interface ConfettiSprinklesProps {
  visible: boolean;
  onComplete?: () => void;
}

function generateFireworkShow(): FireworkRocketProps[] {
  const rockets: FireworkRocketProps[] = [];

  const cx = SCREEN_WIDTH / 2;
  rockets.push({
    startX: cx,
    burstY: SCREEN_HEIGHT * 0.22,
    riseDelay: 0,
    riseDuration: 1000,
    particles: generateFireworkBurst(cx, SCREEN_HEIGHT * 0.22, 40, 0),
  });

  const leftX = SCREEN_WIDTH * 0.25;
  rockets.push({
    startX: leftX,
    burstY: SCREEN_HEIGHT * 0.3,
    riseDelay: 600,
    riseDuration: 900,
    particles: generateFireworkBurst(leftX, SCREEN_HEIGHT * 0.3, 30, 250),
  });

  const rightX = SCREEN_WIDTH * 0.75;
  rockets.push({
    startX: rightX,
    burstY: SCREEN_HEIGHT * 0.28,
    riseDelay: 1000,
    riseDuration: 950,
    particles: generateFireworkBurst(rightX, SCREEN_HEIGHT * 0.28, 30, 400),
  });

  rockets.push({
    startX: cx + (Math.random() - 0.5) * SCREEN_WIDTH * 0.4,
    burstY: SCREEN_HEIGHT * 0.18,
    riseDelay: 1600,
    riseDuration: 1050,
    particles: generateFireworkBurst(cx, SCREEN_HEIGHT * 0.18, 35, 700),
  });

  return rockets;
}

export default function ConfettiSprinkles({ visible, onComplete }: ConfettiSprinklesProps) {
  const [rockets, setRockets] = useState<FireworkRocketProps[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (visible) {
      console.log('[Confetti] Firework show started');
      setRockets(generateFireworkShow());
      cleanup();
      timerRef.current = setTimeout(() => {
        setRockets([]);
        onComplete?.();
      }, 7000);
    } else {
      setRockets([]);
      cleanup();
    }
    return cleanup;
  }, [visible, onComplete, cleanup]);

  if (rockets.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {rockets.map((rocket, idx) => (
        <FireworkRocket key={`rocket_${idx}`} {...rocket} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
});
