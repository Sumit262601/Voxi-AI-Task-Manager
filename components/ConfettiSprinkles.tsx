import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SPRINKLE_COLORS = [
  '#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF',
  '#FF8FDA', '#A66CFF', '#FF9F45', '#54BAB9',
  '#F94C10', '#C3FF99', '#FF78F0', '#00D2FF',
  '#FFE162', '#7EC8E3', '#E14D2A', '#B2A4FF',
];

type AnimationStyle = 'classic' | 'explosion' | 'spiral' | 'fountain' | 'rain' | 'firework';

const ANIMATION_STYLES: AnimationStyle[] = ['classic', 'explosion', 'spiral', 'fountain', 'rain', 'firework'];

function pickRandomStyle(): AnimationStyle {
  return ANIMATION_STYLES[Math.floor(Math.random() * ANIMATION_STYLES.length)];
}

interface SprinkleData {
  id: string;
  x: number;
  y: number;
  delay: number;
  duration: number;
  color: string;
  width: number;
  height: number;
  rotation: number;
  swingAmplitude: number;
  shape: 'rect' | 'circle' | 'diamond' | 'star';
  animStyle: AnimationStyle;
  angle: number;
  speed: number;
}

function getCount(style: AnimationStyle): number {
  switch (style) {
    case 'explosion': return 60;
    case 'firework': return 55;
    case 'fountain': return 50;
    case 'spiral': return 45;
    case 'rain': return 65;
    default: return 50;
  }
}

const SHAPES: SprinkleData['shape'][] = ['rect', 'circle', 'diamond', 'star'];

function generateSprinkles(style: AnimationStyle): SprinkleData[] {
  const count = getCount(style);
  return Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    return {
      id: `${Date.now()}_${i}`,
      x: style === 'explosion' || style === 'firework'
        ? SCREEN_WIDTH / 2
        : style === 'fountain'
          ? SCREEN_WIDTH / 2 + (Math.random() - 0.5) * 60
          : Math.random() * SCREEN_WIDTH,
      y: style === 'explosion'
        ? SCREEN_HEIGHT * 0.45
        : style === 'firework'
          ? SCREEN_HEIGHT * 0.35
          : style === 'fountain'
            ? SCREEN_HEIGHT * 0.5
            : -60,
      delay: style === 'rain'
        ? Math.random() * 800
        : style === 'spiral'
          ? i * 25
          : Math.random() * 300,
      duration: style === 'rain'
        ? 1200 + Math.random() * 600
        : style === 'firework'
          ? 1400 + Math.random() * 800
          : 1600 + Math.random() * 1000,
      color: SPRINKLE_COLORS[Math.floor(Math.random() * SPRINKLE_COLORS.length)],
      width: style === 'rain' ? 3 + Math.random() * 3 : 6 + Math.random() * 8,
      height: style === 'rain' ? 16 + Math.random() * 12 : 12 + Math.random() * 14,
      rotation: Math.random() * 360,
      swingAmplitude: 20 + Math.random() * 40,
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      animStyle: style,
      angle,
      speed: 0.6 + Math.random() * 0.8,
    };
  });
}

interface ConfettiSprinklesProps {
  visible: boolean;
  onComplete?: () => void;
}

function ClassicSprinkle({ data }: { data: SprinkleData }) {
  const fallAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(data.delay),
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(fallAnim, { toValue: 1, duration: data.duration, useNativeDriver: true }),
        Animated.loop(
          Animated.timing(spinAnim, { toValue: 1, duration: 500 + Math.random() * 400, useNativeDriver: true })
        ),
      ]),
    ]);
    animation.start();
    return () => animation.stop();
  }, []);

  const translateY = fallAnim.interpolate({ inputRange: [0, 1], outputRange: [-60, SCREEN_HEIGHT + 60] });
  const translateX = fallAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, data.swingAmplitude, 0, -data.swingAmplitude, 0],
  });
  const rotate = spinAnim.interpolate({ inputRange: [0, 1], outputRange: [`${data.rotation}deg`, `${data.rotation + 360}deg`] });
  const opacity = Animated.multiply(opacityAnim, fallAnim.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] }));

  return (
    <Animated.View style={{
      position: 'absolute' as const, left: data.x, top: 0,
      opacity, transform: [{ translateY }, { translateX }, { rotate }],
    }}>
      <ShapeView data={data} />
    </Animated.View>
  );
}

function ExplosionSprinkle({ data }: { data: SprinkleData }) {
  const progress = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const radius = 80 + Math.random() * 180;
  const targetX = Math.cos(data.angle) * radius * data.speed;
  const targetY = Math.sin(data.angle) * radius * data.speed;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(data.delay),
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(progress, { toValue: 1, duration: data.duration, useNativeDriver: true }),
      ]),
    ]);
    animation.start();
    return () => animation.stop();
  }, []);

  const translateX = progress.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, targetX, targetX * 1.1] });
  const translateY = progress.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, targetY, targetY + 200] });
  const scale = progress.interpolate({ inputRange: [0, 0.15, 0.5, 1], outputRange: [0, 1.3, 1, 0.3] });
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${data.rotation + 720}deg`] });
  const opacity = Animated.multiply(opacityAnim, progress.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1, 0] }));

  return (
    <Animated.View style={{
      position: 'absolute' as const, left: data.x, top: data.y,
      opacity, transform: [{ translateX }, { translateY }, { scale }, { rotate }],
    }}>
      <ShapeView data={data} />
    </Animated.View>
  );
}

function SpiralSprinkle({ data, index }: { data: SprinkleData; index: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const spiralRadius = 30 + index * 2.5;
  const spiralAngle = index * 0.45;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(data.delay),
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(progress, { toValue: 1, duration: data.duration + 400, useNativeDriver: true }),
      ]),
    ]);
    animation.start();
    return () => animation.stop();
  }, []);

  const translateX = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, Math.cos(spiralAngle) * spiralRadius, Math.cos(spiralAngle * 2) * spiralRadius * 0.5],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [-60, SCREEN_HEIGHT * 0.5, SCREEN_HEIGHT + 60],
  });
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${360 * 3}deg`] });
  const scale = progress.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0.2, 1.1, 1, 0.4] });
  const opacity = Animated.multiply(opacityAnim, progress.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }));

  return (
    <Animated.View style={{
      position: 'absolute' as const, left: data.x, top: 0,
      opacity, transform: [{ translateX }, { translateY }, { rotate }, { scale }],
    }}>
      <ShapeView data={data} />
    </Animated.View>
  );
}

function FountainSprinkle({ data }: { data: SprinkleData }) {
  const progress = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const spreadX = (Math.random() - 0.5) * SCREEN_WIDTH * 0.8;
  const peakY = -(150 + Math.random() * 200);

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(data.delay),
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.timing(progress, { toValue: 1, duration: data.duration + 300, useNativeDriver: true }),
      ]),
    ]);
    animation.start();
    return () => animation.stop();
  }, []);

  const translateX = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, spreadX * 0.7, spreadX] });
  const translateY = progress.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, peakY, SCREEN_HEIGHT * 0.6] });
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: [`${data.rotation}deg`, `${data.rotation + 540}deg`] });
  const scale = progress.interpolate({ inputRange: [0, 0.3, 0.7, 1], outputRange: [0.3, 1.2, 1, 0.5] });
  const opacity = Animated.multiply(opacityAnim, progress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }));

  return (
    <Animated.View style={{
      position: 'absolute' as const, left: data.x, top: data.y,
      opacity, transform: [{ translateX }, { translateY }, { scale }, { rotate }],
    }}>
      <ShapeView data={data} />
    </Animated.View>
  );
}

function RainSprinkle({ data }: { data: SprinkleData }) {
  const fallAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(data.delay),
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
        Animated.timing(fallAnim, { toValue: 1, duration: data.duration, useNativeDriver: true }),
      ]),
    ]);
    animation.start();
    return () => animation.stop();
  }, []);

  const drift = (Math.random() - 0.5) * 30;
  const translateY = fallAnim.interpolate({ inputRange: [0, 1], outputRange: [-40, SCREEN_HEIGHT + 40] });
  const translateX = fallAnim.interpolate({ inputRange: [0, 1], outputRange: [0, drift] });
  const opacity = Animated.multiply(opacityAnim, fallAnim.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }));

  return (
    <Animated.View style={{
      position: 'absolute' as const, left: data.x, top: 0,
      opacity, transform: [{ translateY }, { translateX }],
    }}>
      <ShapeView data={data} />
    </Animated.View>
  );
}

function FireworkSprinkle({ data }: { data: SprinkleData }) {
  const riseAnim = useRef(new Animated.Value(0)).current;
  const burstAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const burstRadius = 60 + Math.random() * 160;
  const burstX = Math.cos(data.angle) * burstRadius;
  const burstY = Math.sin(data.angle) * burstRadius;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.delay(data.delay),
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(riseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(burstAnim, { toValue: 1, duration: data.duration, useNativeDriver: true }),
        ]),
      ]),
    ]);
    animation.start();
    return () => animation.stop();
  }, []);

  const translateY = Animated.add(
    riseAnim.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_HEIGHT * 0.3, 0] }),
    burstAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, burstY, burstY + 120] })
  );
  const translateX = burstAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, burstX, burstX * 0.9] });
  const scale = burstAnim.interpolate({ inputRange: [0, 0.15, 0.5, 1], outputRange: [0.5, 1.4, 1, 0.2] });
  const rotate = burstAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${data.rotation + 600}deg`] });
  const opacity = Animated.multiply(
    opacityAnim,
    burstAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1, 0] })
  );

  return (
    <Animated.View style={{
      position: 'absolute' as const, left: data.x, top: data.y,
      opacity, transform: [{ translateX }, { translateY }, { scale }, { rotate }],
    }}>
      <ShapeView data={data} />
    </Animated.View>
  );
}

function ShapeView({ data }: { data: SprinkleData }) {
  const { width, height, color, shape } = data;
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

function SprinkleItem({ data, index }: { data: SprinkleData; index: number }) {
  switch (data.animStyle) {
    case 'explosion': return <ExplosionSprinkle data={data} />;
    case 'spiral': return <SpiralSprinkle data={data} index={index} />;
    case 'fountain': return <FountainSprinkle data={data} />;
    case 'rain': return <RainSprinkle data={data} />;
    case 'firework': return <FireworkSprinkle data={data} />;
    default: return <ClassicSprinkle data={data} />;
  }
}

export default function ConfettiSprinkles({ visible, onComplete }: ConfettiSprinklesProps) {
  const [sprinkles, setSprinkles] = useState<SprinkleData[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (visible) {
      const style = pickRandomStyle();
      console.log('[Confetti] Animation style:', style);
      setSprinkles(generateSprinkles(style));
      cleanup();
      timerRef.current = setTimeout(() => {
        setSprinkles([]);
        onComplete?.();
      }, 3500);
    } else {
      setSprinkles([]);
      cleanup();
    }
    return cleanup;
  }, [visible, onComplete, cleanup]);

  if (sprinkles.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {sprinkles.map((data, index) => (
        <SprinkleItem key={data.id} data={data} index={index} />
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
