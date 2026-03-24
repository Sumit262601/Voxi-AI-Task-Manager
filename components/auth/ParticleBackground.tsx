import { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width, height } = Dimensions.get('window');

interface ParticleProps {
  delay: number;
  startX: number;
  startY: number;
  size: number;
  duration: number;
  color: string;
}

function Particle({ delay, startX, startY, size, duration, color }: ParticleProps) {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const animate = () => {
      translateY.setValue(0);
      translateX.setValue(0);
      opacity.setValue(0);
      scale.setValue(0.5);

      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -height * 0.4,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: (Math.random() - 0.5) * 80,
            duration,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.5,
              duration: duration * 0.25,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: duration * 0.75,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(scale, {
              toValue: 1,
              duration: duration * 0.4,
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 0.2,
              duration: duration * 0.6,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start(() => animate());
    };

    animate();
  }, [delay, duration, opacity, scale, translateX, translateY]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        {
          left: startX,
          top: startY,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          transform: [{ translateY }, { translateX }, { scale }],
          opacity,
        },
      ]}
    />
  );
}

export default function ParticleBackground() {
  const particles = useRef(
    Array.from({ length: 15 }, (_, i) => ({
      id: i,
      delay: Math.random() * 4000,
      startX: Math.random() * width,
      startY: height * 0.4 + Math.random() * height * 0.6,
      size: 3 + Math.random() * 6,
      duration: 5000 + Math.random() * 4000,
      color: [
        'rgba(255, 144, 82, 0.35)',
        'rgba(175, 226, 113, 0.35)',
        'rgba(183, 183, 247, 0.35)',
        'rgba(252, 222, 138, 0.35)',
        'rgba(255, 255, 255, 0.25)',
      ][Math.floor(Math.random() * 5)],
    }))
  ).current;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((particle) => (
        <Particle key={particle.id} {...particle} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute' as const,
  },
});
