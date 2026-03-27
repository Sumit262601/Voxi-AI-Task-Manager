import Colors from '@/constants/colors';
import type { Task } from '@/contexts/tasks';
import { formatCompletedAt, formatTimeDisplay, getCountdown } from '@/utils/taskDate';
import { Check, Clock, Trash2, AlertTriangle } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Alert, Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

interface SwipeableTaskCardProps {
  task: Task;
  showTime?: boolean;
  onPress: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

function SwipeableTaskCard({ task, showTime, onPress, onToggle, onDelete }: SwipeableTaskCardProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const deleteScale = useRef(new Animated.Value(0.6)).current;
  const rowHeight = useRef(new Animated.Value(1)).current;
  const [isRevealed, setIsRevealed] = useState(false);
  const isSwipedRef = useRef(false);
  const SNAP_THRESHOLD = -70;
  const ACTION_WIDTH = 80;

  const deleteIconRotate = translateX.interpolate({
    inputRange: [-120, -60, 0],
    outputRange: ['-8deg', '0deg', '8deg'],
    extrapolate: 'clamp',
  });

  const actionOpacity = translateX.interpolate({
    inputRange: [-60, -20, 0],
    outputRange: [1, 0.4, 0],
    extrapolate: 'clamp',
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 20;
      },
      onPanResponderGrant: () => {
        translateX.stopAnimation();
        translateX.extractOffset();
      },
      onPanResponderMove: (_, gestureState) => {
        const clampedX = Math.min(0, Math.max(-140, gestureState.dx));
        translateX.setValue(clampedX);

        const absX = Math.abs(clampedX);
        const scale = Math.min(1, 0.6 + (absX / ACTION_WIDTH) * 0.4);
        deleteScale.setValue(scale);

        if (clampedX <= SNAP_THRESHOLD && !isSwipedRef.current) {
          isSwipedRef.current = true;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else if (clampedX > SNAP_THRESHOLD) {
          isSwipedRef.current = false;
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        translateX.stopAnimation();
        translateX.flattenOffset();
        const dx = gestureState.dx;

        if (dx <= SNAP_THRESHOLD) {
          setIsRevealed(true);
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: -ACTION_WIDTH,
              tension: 80,
              friction: 10,
              useNativeDriver: false,
            }),
            Animated.spring(deleteScale, {
              toValue: 1,
              tension: 80,
              friction: 10,
              useNativeDriver: false,
            }),
          ]).start();
        } else {
          resetSwipe();
        }
        isSwipedRef.current = false;
      },
      onPanResponderTerminate: () => {
        translateX.stopAnimation();
        translateX.flattenOffset();
        resetSwipe();
      },
    })
  ).current;

  const resetSwipe = () => {
    setIsRevealed(false);
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        tension: 80,
        friction: 10,
        useNativeDriver: false,
      }),
      Animated.timing(deleteScale, {
        toValue: 0.6,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const performDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -500,
        duration: 280,
        useNativeDriver: false,
      }),
      Animated.timing(rowHeight, {
        toValue: 0,
        duration: 280,
        useNativeDriver: false,
      }),
    ]).start(() => {
      onDelete();
    });
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete Task',
      `Delete "${task.title}"? This can\'t be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: resetSwipe,
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: performDelete,
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <Animated.View style={[swipeStyles.container, { opacity: rowHeight }]}>
      <View style={swipeStyles.actionsRow}>
        <Animated.View
          style={[
            swipeStyles.deleteActionBox,
            { opacity: actionOpacity },
          ]}
        >
          <Pressable
            style={swipeStyles.deleteButton}
            onPress={confirmDelete}
          >
            <LinearGradient
              colors={['#FF6B6B', '#EE4444']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={swipeStyles.deleteGradient}
            >
              <Animated.View
                style={[
                  swipeStyles.deleteIconWrap,
                  {
                    transform: [
                      { scale: deleteScale },
                      { rotate: deleteIconRotate },
                    ],
                  },
                ]}
              >
                <Trash2 size={18} color="#FFFFFF" strokeWidth={2.5} />
              </Animated.View>
              <Text style={swipeStyles.deleteLabel}>Delete</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>

      <Animated.View
        style={[swipeStyles.cardSlider, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TaskCard
          task={task}
          showTime={showTime}
          onPress={() => {
            if (isRevealed) {
              resetSwipe();
            } else {
              onPress();
            }
          }}
          onToggle={onToggle}
        />
      </Animated.View>
    </Animated.View>
  );
}

export { SwipeableTaskCard };

const swipeStyles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 12,
    overflow: 'hidden',
    borderRadius: 18,
  },
  actionsRow: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteActionBox: {
    width: 80,
    height: '100%',
  },
  deleteButton: {
    flex: 1,
  },
  deleteGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 4,
  },
  deleteIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  cardSlider: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
  },
});

export interface TaskSectionsProps {
  scheduledTasks: Task[];
  checklistTasks: Task[];
  onPress: (task: Task) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TaskSections({
  scheduledTasks,
  checklistTasks,
  onPress,
  onToggle,
  onDelete,
}: TaskSectionsProps) {
  return (
    <>
      {scheduledTasks.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Clock size={16} color={Colors.peach} />
            </View>
            <Text style={styles.sectionTitle}>Scheduled</Text>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>{scheduledTasks.length}</Text>
            </View>
          </View>
          {scheduledTasks.map((task) => (
            <SwipeableTaskCard
              key={task.id}
              task={task}
              showTime
              onPress={() => onPress(task)}
              onToggle={() => onToggle(task.id)}
              onDelete={() => onDelete(task.id)}
            />
          ))}
        </View>
      )}

      {checklistTasks.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconContainer, { backgroundColor: 'rgba(175, 226, 113, 0.2)' }]}>
              <Check size={16} color={Colors.green} />
            </View>
            <Text style={styles.sectionTitle}>Checklist</Text>
            <View style={[styles.sectionBadge, { backgroundColor: 'rgba(175, 226, 113, 0.2)' }]}>
              <Text style={[styles.sectionBadgeText, { color: '#6B9B37' }]}>{checklistTasks.length}</Text>
            </View>
          </View>
          {checklistTasks.map((task) => (
            <SwipeableTaskCard
              key={task.id}
              task={task}
              onPress={() => onPress(task)}
              onToggle={() => onToggle(task.id)}
              onDelete={() => onDelete(task.id)}
            />
          ))}
        </View>
      )}
    </>
  );
}

interface TaskCardProps {
  task: Task;
  showTime?: boolean;
  onPress: () => void;
  onToggle: () => void;
  variant?: 'home' | 'calendar';
  selectedDate?: Date;
}

export default function TaskCard({
  task,
  showTime = false,
  onPress,
  onToggle,
  variant = 'home',
  selectedDate,
}: TaskCardProps) {
  if (!task) {
    return null;
  }

  if (variant === 'calendar') {
    const status = task.completed
      ? formatCompletedAt(task.completedAt)
      : getCountdown(selectedDate || new Date(), task.time);
    const timeDisplay = formatTimeDisplay(task.time);
    return (
      <Pressable
        style={[
          styles.calendarCard,
          { backgroundColor: task.color, borderLeftColor: task.borderColor },
          task.completed && styles.calendarCardDisabled,
        ]}
        onPress={onToggle}
        disabled={task.completed}
      >
        <View style={styles.calendarRow}>
          <View style={styles.calendarLeft}>
            <View style={[styles.calendarCheckbox, task.completed && styles.calendarCheckboxChecked]}>
              {task.completed && <Check size={14} color="#FFF" strokeWidth={3} />}
            </View>
            <View style={styles.calendarMeta}>
              <Text style={[styles.calendarTitle, task.completed && styles.calendarTitleDone]}>
                {task.title}
              </Text>
              <Text style={styles.calendarSub}>
                {task.type === 'scheduled' ? 'Scheduled' : 'Checklist'}
              </Text>
              <Text style={styles.calendarStatus}>{status}</Text>
            </View>
          </View>
          <Text style={styles.calendarTime}>{timeDisplay}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[
        styles.taskCard,
        { borderColor: task.borderColor || task.color },
        task.completed && styles.taskCardCompleted,
      ]}
      onPress={onPress}
      disabled={task.completed}
    >
      <View style={[styles.taskIcon, { backgroundColor: task.color }, task.completed && styles.taskIconDisabled]}>
        <Text style={styles.taskEmoji}>{task.icon}</Text>
      </View>
      
      <View style={styles.taskContent}>
        <Text style={[styles.taskTitle, task.completed && styles.taskTitleDone]}>{task.title}</Text>
        {showTime && task.time && (
          <View style={styles.timeRow}>
            <Clock size={12} color={Colors.orangeStart} />
            <Text style={styles.taskTime}>
              {task.time} • {task.duration}
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.priorityBadge, { backgroundColor: task.priorityColor || Colors.blue }, task.completed && styles.priorityBadgeDisabled]}>
        <Text style={styles.priorityText}>{task.priority || 'Regular'}</Text>
      </View>

      <Pressable
        style={[styles.checkbox, task.completed && styles.checkboxChecked]}
        onPress={(e) => {
          e.stopPropagation();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggle();
        }}
      >
        {task.completed && <Check size={14} color="#FFF" strokeWidth={3} />}
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderBottomWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  taskCardCompleted: {
    opacity: 0.65,
    borderBottomWidth: 2,
  },
  taskIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  taskEmoji: {
    fontSize: 22,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -5,
    gap: 4,
    marginTop: 4,
  },
  taskTime: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  priorityBadge: {
    backgroundColor: Colors.blue,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 10,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  taskIconDisabled: {
    opacity: 0.7,
  },
  priorityBadgeDisabled: {
    opacity: 0.7,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  calendarCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  calendarLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  calendarCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  calendarCheckboxChecked: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  calendarCardDisabled: {
    opacity: 0.6,
  },
  calendarMeta: {
    flex: 1,
  },
  calendarTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  calendarTitleDone: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  calendarSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  calendarStatus: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  calendarTime: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
    marginLeft: 8,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 144, 82, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    flex: 1,
  },
  sectionBadge: {
    backgroundColor: 'rgba(255, 144, 82, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.peach,
  },
});
