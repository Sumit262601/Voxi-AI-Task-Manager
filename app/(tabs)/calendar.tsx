import { SwipeableTaskCard } from '@/components/home';
import colors from '@/constants/colors';
import { useTasks, type Task } from '@/contexts/tasks';
import { parseTimeToDate } from '@/utils/taskDate';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react-native';
import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { 
  Animated, 
  Dimensions, 
  Pressable, 
  ScrollView, 
  StyleSheet, 
  Text, 
  View,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CALENDAR_PADDING = 16;
const CELL_GAP = 2;
const CELL_SIZE = (SCREEN_WIDTH - CALENDAR_PADDING * 2 - CELL_GAP * 6) / 7;
const CELL_HEIGHT = 38;

const WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getDaysInMonth(date: Date): (number | null)[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days: (number | null)[] = [];
  for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  return days;
}

function getTasksForDate(tasks: Task[], d: Date) {
  const dateStr = d.toDateString();
  return tasks.filter((t) => {
    const taskDate = t.scheduledDate ? new Date(t.scheduledDate) : new Date(t.createdAt);
    return taskDate.toDateString() === dateStr;
  });
}

export default function CalendarScreen() {
  const { tasks, toggleTask, deleteTask } = useTasks();
  const [viewMonth, setViewMonth] = useState(new Date());
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [selectedDate, setSelectedDate] = useState(today);
  
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const viewMonthNum = viewMonth.getMonth();
    const viewYear = viewMonth.getFullYear();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    if (viewMonthNum === currentMonth && viewYear === currentYear) {
      setSelectedDate(prev => {
        if (prev.getMonth() === currentMonth && prev.getFullYear() === currentYear && prev.getDate() === now.getDate()) {
          return prev;
        }
        return now;
      });
    } else {
      setSelectedDate(prev => {
        const prevInViewMonth = prev.getMonth() === viewMonthNum && prev.getFullYear() === viewYear;
        if (prevInViewMonth) return prev;
        
        let foundDay: Date | null = null;
        for (let day = 1; day <= 31; day++) {
          const testDate = new Date(viewYear, viewMonthNum, day);
          if (testDate.getMonth() !== viewMonthNum) break;
          testDate.setHours(0, 0, 0, 0);
          if (getTasksForDate(tasks, testDate).length > 0) {
            foundDay = testDate;
            break;
          }
        }
        const firstDay = new Date(viewYear, viewMonthNum, 1);
        firstDay.setHours(0, 0, 0, 0);
        return foundDay || firstDay;
      });
    }
  }, [viewMonth, tasks]);

  const changeMonth = useCallback((dir: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: dir * -20,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      const next = new Date(viewMonth);
      next.setMonth(viewMonth.getMonth() + dir);
      setViewMonth(next);
      
      slideAnim.setValue(dir * 20);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [viewMonth, fadeAnim, slideAnim]);

  const goToToday = useCallback(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    setViewMonth(now);
    setSelectedDate(now);
  }, []);

  const days = getDaysInMonth(viewMonth);
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const isToday = (d: Date) => d.toDateString() === todayDate.toDateString();

  const tasksForSelected = useMemo(
    () => getTasksForDate(tasks, selectedDate),
    [tasks, selectedDate]
  );

  const sortedTasks = useMemo(() => {
    return [...tasksForSelected].sort((a, b) => {
      const da = parseTimeToDate(selectedDate, a.time);
      const db = parseTimeToDate(selectedDate, b.time);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da.getTime() - db.getTime();
    });
  }, [tasksForSelected, selectedDate]);

  const hasTasksForDay = useCallback((day: number) => {
    const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
    d.setHours(0, 0, 0, 0);
    return getTasksForDate(tasks, d).length > 0;
  }, [tasks, viewMonth]);

  const selectDay = useCallback((day: number) => {
    const newDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
    newDate.setHours(0, 0, 0, 0);
    setSelectedDate(newDate);
  }, [viewMonth]);

  const isCurrentMonth = viewMonth.getMonth() === todayDate.getMonth() && 
                         viewMonth.getFullYear() === todayDate.getFullYear();

  const formattedSelectedDate = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const completedCount = sortedTasks.filter(t => t.completed).length;
  const totalCount = sortedTasks.length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.calendarCard}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.monthYearContainer}>
            <Text style={styles.monthText}>{MONTH_NAMES[viewMonth.getMonth()]}</Text>
            <Text style={styles.yearText}>{viewMonth.getFullYear()}</Text>
          </View>
          <View style={styles.headerActions}>
            {!isCurrentMonth && (
              <Pressable 
                onPress={goToToday} 
                style={styles.todayButton}
                hitSlop={8}
              >
                <Text style={styles.todayButtonText}>Today</Text>
              </Pressable>
            )}
            <View style={styles.navButtons}>
              <Pressable 
                onPress={() => changeMonth(-1)} 
                style={styles.navButton} 
                hitSlop={8}
              >
                <ChevronLeft size={22} color={colors.peach} />
              </Pressable>
              <Pressable 
                onPress={() => changeMonth(1)} 
                style={styles.navButton} 
                hitSlop={8}
              >
                <ChevronRight size={22} color={colors.peach} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Week days header */}
        <View style={styles.weekDaysRow}>
          {WEEK_DAYS.map((day, index) => (
            <View key={`${day}-${index}`} style={styles.weekDayCell}>
              <Text style={[
                styles.weekDayText,
                (index === 0 || index === 6) && styles.weekendText
              ]}>
                {day}
              </Text>
            </View>
          ))}
        </View>

        {/* Calendar Grid */}
        <Animated.View 
          style={[
            styles.calendarGrid,
            { 
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }]
            }
          ]}
        >
          {days.map((day, index) => {
            if (day === null) {
              return <View key={`empty-${index}`} style={styles.dayCell} />;
            }

            const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
            d.setHours(0, 0, 0, 0);
            const isTodayDate = isToday(d);
            const isSelected = 
              selectedDate.getDate() === day &&
              selectedDate.getMonth() === viewMonth.getMonth() &&
              selectedDate.getFullYear() === viewMonth.getFullYear();
            const hasTasks = hasTasksForDay(day);
            const isWeekend = index % 7 === 0 || index % 7 === 6;

            return (
              <Pressable
                key={day}
                style={styles.dayCell}
                onPress={() => selectDay(day)}
              >
                <View style={[
                  styles.dayContent,
                  isTodayDate && styles.todayContent,
                  isSelected && !isTodayDate && styles.selectedContent,
                ]}>
                  <Text style={[
                    styles.dayText,
                    isWeekend && !isSelected && !isTodayDate && styles.weekendDayText,
                    isTodayDate && styles.todayText,
                    isSelected && !isTodayDate && styles.selectedText,
                  ]}>
                    {day}
                  </Text>
                </View>
                {hasTasks && (
                  <View style={[
                    styles.taskDot,
                    (isTodayDate || isSelected) && styles.taskDotHighlighted
                  ]} />
                )}
              </Pressable>
            );
          })}
        </Animated.View>
      </View>

      {/* Selected Date Info */}
      <View style={styles.selectedDateHeader}>
        <View style={styles.selectedDateInfo}>
          <Text style={styles.selectedDateText}>{formattedSelectedDate}</Text>
          {totalCount > 0 && (
            <Text style={styles.taskSummary}>
              {completedCount}/{totalCount} completed
            </Text>
          )}
        </View>
      </View>

      {/* Task List */}
      <ScrollView
        style={styles.taskScroll}
        contentContainerStyle={styles.taskList}
        showsVerticalScrollIndicator={false}
      >
        {sortedTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <CalendarIcon size={48} color={colors.peach} />
            </View>
            <Text style={styles.emptyTitle}>No Tasks</Text>
            <Text style={styles.emptySubtitle}>
              No tasks scheduled for this day
            </Text>
          </View>
        ) : (
          sortedTasks.map((task) => (
            <SwipeableTaskCard
              key={task.id}
              task={task}
              showTime={task.type === 'scheduled'}
              onPress={() => {}}
              onToggle={() => toggleTask(task.id)}
              onDelete={() => deleteTask(task.id)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.card,
  },
  calendarCard: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  monthYearContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  monthText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  yearText: {
    fontSize: 22,
    fontWeight: '400',
    color: colors.textSecondary,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 144, 82, 0.12)',
  },
  todayButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.peach,
  },
  navButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 144, 82, 0.12)',
  },
  weekDaysRow: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  weekDayCell: {
    width: CELL_SIZE,
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  weekendText: {
    color: colors.coral,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 4,
  },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  dayContent: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayContent: {
    backgroundColor: colors.peach,
  },
  selectedContent: {
    backgroundColor: 'rgba(255, 144, 82, 0.15)',
  },
  dayText: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.text,
  },
  weekendDayText: {
    color: colors.coral,
  },
  todayText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  selectedText: {
    color: '#000000',
    fontWeight: '600',
  },
  taskDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.green,
    marginTop: 1,
  },
  taskDotHighlighted: {
    backgroundColor: colors.green,
  },
  selectedDateHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  selectedDateInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedDateText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  taskSummary: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  taskScroll: {
    flex: 1,
  },
  taskList: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 144, 82, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
