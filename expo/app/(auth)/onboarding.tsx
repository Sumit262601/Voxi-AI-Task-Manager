import Colors from '@/constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { CheckCircle, Calendar, Target, Sparkles } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const ONBOARDING_KEY = 'hasSeenOnboarding';

interface OnboardingSlide {
  id: number;
  icon: React.ReactElement;
  title: string;
  description: string;
  color: string;
}

const slides: OnboardingSlide[] = [
  {
    id: 1,
    icon: <CheckCircle size={64} color="#FF9052" strokeWidth={1.5} />,
    title: 'Manage Your Tasks',
    description: 'Organize your daily tasks efficiently and never miss a deadline again',
    color: '#FF9052',
  },
  {
    id: 2,
    icon: <Calendar size={64} color="#AFE271" strokeWidth={1.5} />,
    title: 'Plan Your Schedule',
    description: 'Visualize your week and month with our intuitive calendar view',
    color: '#AFE271',
  },
  {
    id: 3,
    icon: <Target size={64} color="#B7B7F7" strokeWidth={1.5} />,
    title: 'Track Your Progress',
    description: 'See detailed statistics and insights about your productivity',
    color: '#B7B7F7',
  },
  {
    id: 4,
    icon: <Sparkles size={64} color="#FCDE8A" strokeWidth={1.5} />,
    title: 'AI-Powered Assistant',
    description: 'Get smart suggestions and let AI help you plan your day',
    color: '#FCDE8A',
  },
];

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
            toValue: -height * 0.3,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: (Math.random() - 0.5) * 100,
            duration,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.6,
              duration: duration * 0.3,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: duration * 0.7,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(scale, {
              toValue: 1.2,
              duration: duration * 0.5,
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 0.3,
              duration: duration * 0.5,
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

function ParticleBackground() {
  const particles = useRef(
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      delay: Math.random() * 3000,
      startX: Math.random() * width,
      startY: height * 0.5 + Math.random() * height * 0.5,
      size: 4 + Math.random() * 8,
      duration: 4000 + Math.random() * 3000,
      color: [
        'rgba(255, 144, 82, 0.4)',
        'rgba(175, 226, 113, 0.4)',
        'rgba(183, 183, 247, 0.4)',
        'rgba(252, 222, 138, 0.4)',
        'rgba(255, 255, 255, 0.3)',
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

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slideAnimations = useRef(slides.map(() => new Animated.Value(0))).current;
  const iconBounce = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(iconBounce, {
          toValue: -10,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(iconBounce, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    bounceAnimation.start();

    return () => bounceAnimation.stop();
  }, [fadeIn, iconBounce]);

  useEffect(() => {
    slideAnimations.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: index === currentIndex ? 1 : 0,
        duration: 400,
        useNativeDriver: true,
      }).start();
    });
  }, [currentIndex, slideAnimations]);

  const handleNext = useCallback(() => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
      Animated.timing(scrollX, {
        toValue: (currentIndex + 1) * width,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [currentIndex, scrollX]);

  const handleGetStarted = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/(auth)/login' as any);
  }, [router]);

  const handleSkip = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/(auth)/login' as any);
  }, [router]);

  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <LinearGradient
      colors={['#3D3228', '#5A4D3D', '#6B5D4A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <ParticleBackground />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Animated.View style={[styles.container, { opacity: fadeIn }]}>
          <View style={styles.topContainer}>
            <Text style={styles.logoText}>Voxi</Text>
            {!isLastSlide && (
              <Pressable onPress={handleSkip} style={styles.skipButton}>
                <Text style={styles.skipText}>Skip</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.slideContainer}>
            {slides.map((slide, index) => {
              const opacity = slideAnimations[index].interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              });

              const translateYContent = slideAnimations[index].interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              });

              if (index !== currentIndex) return null;

              return (
                <Animated.View
                  key={slide.id}
                  style={[
                    styles.slide,
                    {
                      opacity,
                      transform: [{ translateY: translateYContent }],
                    },
                  ]}
                >
                  <Animated.View
                    style={[
                      styles.iconContainer,
                      {
                        transform: [{ translateY: iconBounce }],
                        shadowColor: slide.color,
                      },
                    ]}
                  >
                    <View style={[styles.iconGlow, { backgroundColor: slide.color }]} />
                    {slide.icon}
                  </Animated.View>

                  <Text style={styles.title}>{slide.title}</Text>
                  <Text style={styles.description}>{slide.description}</Text>
                </Animated.View>
              );
            })}
          </View>

          <View style={styles.pagination}>
            {slides.map((_, index) => {
              const dotScaleX = slideAnimations[index].interpolate({
                inputRange: [0, 1],
                outputRange: [8 / 24, 1],
              });

              const dotOpacity = slideAnimations[index].interpolate({
                inputRange: [0, 1],
                outputRange: [0.4, 1],
              });

              return (
                <Pressable
                  key={index}
                  onPress={() => {
                    setCurrentIndex(index);
                    Animated.timing(scrollX, {
                      toValue: index * width,
                      duration: 400,
                      useNativeDriver: true,
                    }).start();
                  }}
                >
                  <View style={styles.dotWrapper}>
                    <Animated.View
                      style={[
                        styles.dot,
                        {
                          opacity: dotOpacity,
                          backgroundColor: slides[index].color,
                          transform: [{ scaleX: dotScaleX }],
                        },
                      ]}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={isLastSlide ? handleGetStarted : handleNext}
            style={({ pressed }) => [
              styles.buttonPressable,
              pressed && styles.buttonPressed,
            ]}
          >
            <LinearGradient
              colors={[Colors.orangeStart, '#E07840']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>
                {isLastSlide ? 'Get Started' : 'Next'}
              </Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  topContainer: {
    height: 44,
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FF9052',
    letterSpacing: 1,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500' as const,
  },
  slideContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slide: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  iconGlow: {
    position: 'absolute' as const,
    width: 100,
    height: 100,
    borderRadius: 50,
    opacity: 0.15,
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textAlign: 'center' as const,
    marginBottom: 16,
  },
  description: {
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center' as const,
    lineHeight: 26,
    paddingHorizontal: 20,
  },
  pagination: {
    flexDirection: 'row' as const,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    gap: 8,
  },
  dotWrapper: {
    width: 24,
    height: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 24,
    height: 8,
    borderRadius: 4,
  },
  buttonPressable: {
    marginBottom: 20,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  button: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: '#FF9052',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600' as const,
  },
  particle: {
    position: 'absolute' as const,
  },
});
