import Colors from '@/constants/colors';
import { useTasks } from '@/contexts/tasks';
import { Plus, Sparkles } from 'lucide-react-native';
import { useRef, useEffect } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface QuickAction {
  id: string;
  emoji: string;
  label: string;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: '1', emoji: '💻', label: 'Work', color: Colors.purple },
  { id: '2', emoji: '🏋️', label: 'Workout', color: Colors.coral },
  { id: '3', emoji: '🏃', label: 'Running', color: Colors.yellow },
  { id: '4', emoji: '🧘', label: 'Relax', color: Colors.peach },
  { id: '5', emoji: '📖', label: 'Reading', color: Colors.green },
];

interface EmptyStateProps {
  selectedDate?: Date;
}

export default function EmptyState({ selectedDate }: EmptyStateProps) {
  const { addTask } = useTasks();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnims = useRef(QUICK_ACTIONS.map(() => new Animated.Value(0.8))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    const staggeredAnimations = scaleAnims.map((anim, index) =>
      Animated.sequence([
        Animated.delay(index * 80),
        Animated.spring(anim, {
          toValue: 1,
          tension: 60,
          friction: 6,
          useNativeDriver: true,
        }),
      ])
    );

    Animated.parallel(staggeredAnimations).start();
  }, [fadeAnim, slideAnim, scaleAnims]);

  const handleQuickAction = (action: QuickAction) => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    const targetDate = selectedDate ? new Date(selectedDate) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    addTask({
      icon: action.emoji,
      title: action.label,
      time: timeString,
      duration: '30 min',
      color: action.color,
      borderColor: action.color,
      type: 'scheduled',
      priority: 'Regular',
      priorityColor: '',
      scheduledDate: targetDate.getTime(),
    });
  };

  return (
    <Animated.View 
      style={[
        styles.emptyState, 
        { 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.illustrationContainer}>
        <View style={styles.circleOuter}>
          <View style={styles.circleInner}>
            <Text style={styles.emptyIcon}>📋</Text>
          </View>
        </View>
        <View style={styles.sparkleContainer}>
          <Sparkles size={20} color={Colors.peach} />
        </View>
      </View>

      <Text style={styles.emptyTitle}>Your day is clear!</Text>
      <Text style={styles.emptyText}>Start fresh by adding a task below</Text>

      <View style={styles.quickActionsContainer}>
        <Text style={styles.quickActionsLabel}>Quick add</Text>
        <View style={styles.quickActionsGrid}>
          {QUICK_ACTIONS.map((action, index) => (
            <Animated.View
              key={action.id}
              style={{ transform: [{ scale: scaleAnims[index] }] }}
            >
              <TouchableOpacity
                style={[styles.quickActionButton, { backgroundColor: action.color }]}
                onPress={() => handleQuickAction(action)}
                activeOpacity={0.8}
              >
                <Text style={styles.actionEmoji}>{action.emoji}</Text>
                <Text style={styles.actionLabel}>{action.label}</Text>
                <View style={styles.plusIcon}>
                  <Plus size={12} color="#FFFFFF" strokeWidth={3} />
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  illustrationContainer: {
    marginBottom: 24,
    position: 'relative',
  },
  circleOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 144, 82, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 144, 82, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 48,
  },
  sparkleContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  quickActionsContainer: {
    width: '100%',
    paddingHorizontal: 4,
  },
  quickActionsLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 14,
    textAlign: 'center',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionEmoji: {
    fontSize: 20,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  plusIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
