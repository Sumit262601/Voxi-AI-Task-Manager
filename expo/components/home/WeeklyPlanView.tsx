import Colors from '@/constants/colors';
import type { Task } from '@/contexts/tasks';
import { useTasks } from '@/contexts/tasks';
import { Check, ChevronRight, Clock, Flame, Star } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface WeeklyPlanViewProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onTaskPress: (task: Task) => void;
  onToggleTask: (id: string) => void;
}

const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const SHORT_DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

function getWeekStartAndDates(date: Date): Date[] {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(d);
    dd.setDate(d.getDate() + i);
    dates.push(dd);
  }
  return dates;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

const ACCENT_COLORS = [
  '#FF9052',
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
];

interface DayCardProps {
  date: Date;
  tasks: Task[];
  isToday: boolean;
  isSelected: boolean;
  accentColor: string;
  index: number;
  onPress: () => void;
  onToggleTask: (id: string) => void;
  onTaskPress: (task: Task) => void;
}

function DayCard({ date, tasks, isToday, isSelected, accentColor, index, onPress, onToggleTask, onTaskPress }: DayCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;
  const allDone = totalCount > 0 && completedCount === totalCount;
  const dayIndex = date.getDay();

  const scheduledTasks = tasks.filter(t => t.type === 'scheduled').slice(0, 3);
  const checklistTasks = tasks.filter(t => t.type === 'checklist').slice(0, 2);
  const visibleTasks = [...scheduledTasks, ...checklistTasks].slice(0, 4);
  const remainingCount = totalCount - visibleTasks.length;

  return (
    <Animated.View
      style={[
        dayStyles.wrapper,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Pressable
        style={[
          dayStyles.card,
          isToday && dayStyles.todayCard,
          isSelected && { borderColor: accentColor, borderWidth: 2 },
        ]}
        onPress={onPress}
      >
        <View style={dayStyles.header}>
          <View style={dayStyles.headerLeft}>
            <View style={[dayStyles.dayBadge, { backgroundColor: isToday ? accentColor : '#F0EDE8' }]}>
              <Text style={[dayStyles.dayBadgeText, isToday && { color: '#FFF' }]}>
                {SHORT_DAYS[dayIndex]}
              </Text>
            </View>
            <View>
              <Text style={[dayStyles.dayName, isToday && { color: accentColor }]}>
                {FULL_DAYS[dayIndex]}
              </Text>
              <Text style={dayStyles.dateLabel}>
                {date.getDate()} {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()]}
              </Text>
            </View>
          </View>
          <View style={dayStyles.headerRight}>
            {isToday && (
              <View style={dayStyles.todayPill}>
                <Flame size={12} color={accentColor} />
                <Text style={[dayStyles.todayPillText, { color: accentColor }]}>Today</Text>
              </View>
            )}
            {totalCount > 0 && (
              <View style={dayStyles.countContainer}>
                <Text style={dayStyles.countText}>
                  {completedCount}/{totalCount}
                </Text>
              </View>
            )}
            <ChevronRight size={16} color={Colors.textSecondary} />
          </View>
        </View>

        {totalCount > 0 && (
          <View style={dayStyles.progressContainer}>
            <View style={dayStyles.progressBg}>
              <View
                style={[
                  dayStyles.progressFill,
                  {
                    width: `${progress * 100}%`,
                    backgroundColor: allDone ? '#4CAF50' : accentColor,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {totalCount === 0 ? (
          <View style={dayStyles.emptyContainer}>
            <Text style={dayStyles.emptyText}>No tasks planned</Text>
          </View>
        ) : (
          <View style={dayStyles.tasksContainer}>
            {visibleTasks.map((task) => (
              <Pressable
                key={task.id}
                style={dayStyles.taskRow}
                onPress={() => onTaskPress(task)}
              >
                <Pressable
                  style={[
                    dayStyles.miniCheckbox,
                    task.completed && { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
                  ]}
                  onPress={() => onToggleTask(task.id)}
                  hitSlop={8}
                >
                  {task.completed && <Check size={10} color="#FFF" strokeWidth={3} />}
                </Pressable>
                <View style={[dayStyles.taskDot, { backgroundColor: task.color }]} />
                <Text
                  style={[dayStyles.taskTitle, task.completed && dayStyles.taskTitleDone]}
                  numberOfLines={1}
                >
                  {task.icon} {task.title}
                </Text>
                {task.time ? (
                  <View style={dayStyles.taskTimeBadge}>
                    <Clock size={10} color={Colors.textSecondary} />
                    <Text style={dayStyles.taskTimeText}>{task.time}</Text>
                  </View>
                ) : null}
                {task.priority === 'Urgent' || task.priority === 'High' ? (
                  <View style={[dayStyles.priorityDot, { backgroundColor: task.priorityColor }]} />
                ) : null}
              </Pressable>
            ))}
            {remainingCount > 0 && (
              <Text style={dayStyles.moreText}>+{remainingCount} more</Text>
            )}
          </View>
        )}

        {allDone && (
          <View style={dayStyles.completedBanner}>
            <Star size={14} color="#4CAF50" />
            <Text style={dayStyles.completedText}>All done!</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function WeeklyPlanView({ selectedDate, onSelectDate, onTaskPress, onToggleTask }: WeeklyPlanViewProps) {
  const { tasks: allTasks } = useTasks();
  const today = useMemo(() => new Date(), []);

  const weekDates = useMemo(() => getWeekStartAndDates(selectedDate), [selectedDate]);

  const getTasksForDate = useCallback(
    (date: Date): Task[] => {
      return allTasks.filter((t) => {
        const taskDate = new Date(t.scheduledDate || t.createdAt);
        return isSameDay(date, taskDate);
      });
    },
    [allTasks]
  );

  const weekSummary = useMemo(() => {
    let totalTasks = 0;
    let completedTasks = 0;
    weekDates.forEach((date) => {
      const dayTasks = getTasksForDate(date);
      totalTasks += dayTasks.length;
      completedTasks += dayTasks.filter(t => t.completed).length;
    });
    return { totalTasks, completedTasks };
  }, [weekDates, getTasksForDate]);

  const weekProgress = weekSummary.totalTasks > 0
    ? Math.round((weekSummary.completedTasks / weekSummary.totalTasks) * 100)
    : 0;

  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <View style={styles.summaryLeft}>
          <Text style={styles.summaryTitle}>This Week</Text>
          <Text style={styles.summarySubtitle}>
            {weekSummary.completedTasks} of {weekSummary.totalTasks} tasks completed
          </Text>
        </View>
        <View style={styles.summaryRight}>
          <View style={styles.percentCircle}>
            <Text style={styles.percentText}>{weekProgress}%</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {weekDates.map((date, index) => {
          const dayTasks = getTasksForDate(date);
          const dateIsToday = isSameDay(date, today);
          const dateIsSelected = isSameDay(date, selectedDate);

          return (
            <DayCard
              key={date.toISOString()}
              date={date}
              tasks={dayTasks}
              isToday={dateIsToday}
              isSelected={dateIsSelected}
              accentColor={ACCENT_COLORS[index % ACCENT_COLORS.length]}
              index={index}
              onPress={() => onSelectDate(date)}
              onToggleTask={onToggleTask}
              onTaskPress={onTaskPress}
            />
          );
        })}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1E',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 20,
    padding: 18,
  },
  summaryLeft: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  summarySubtitle: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.6)',
  },
  summaryRight: {
    marginLeft: 16,
  },
  percentCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,144,82,0.2)',
    borderWidth: 3,
    borderColor: '#FF9052',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#FF9052',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
});

const dayStyles = StyleSheet.create({
  wrapper: {
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#F0EDE8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  todayCard: {
    borderColor: 'rgba(255,144,82,0.3)',
    shadowColor: '#FF9052',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dayBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBadgeText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: 0.5,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,144,82,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  todayPillText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  countContainer: {
    backgroundColor: '#F0EDE8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBg: {
    height: 4,
    backgroundColor: '#F0EDE8',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  emptyContainer: {
    paddingVertical: 6,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic' as const,
  },
  tasksContainer: {
    gap: 6,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRadius: 10,
    gap: 8,
  },
  miniCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  taskTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  taskTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F8F6F3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  taskTimeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  moreText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    paddingLeft: 32,
    paddingTop: 2,
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0EDE8',
  },
  completedText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#4CAF50',
  },
});
