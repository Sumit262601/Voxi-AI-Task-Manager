import Colors from '@/constants/colors';
import { useTasks } from '@/contexts/tasks';
import { DAYS } from '@/utils/dateUtils';
import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { Animated, Dimensions, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 50;

interface WeekCalendarProps {
  today: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export default function WeekCalendar({ today, selectedDate, onSelectDate }: WeekCalendarProps) {
  const { tasks } = useTasks();
  
  const getWeekStart = useCallback((date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(selectedDate));
  const translateX = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    const selectedWeekStart = getWeekStart(selectedDate);
    if (selectedWeekStart.getTime() !== currentWeekStart.getTime()) {
      setCurrentWeekStart(selectedWeekStart);
    }
  }, [selectedDate, getWeekStart, currentWeekStart]);
  
  const getWeekDatesFromStart = useCallback((startDate: Date) => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, []);
  
  const weekDates = getWeekDatesFromStart(currentWeekStart);
  
  const getPrevWeekStart = useCallback(() => {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() - 7);
    return date;
  }, [currentWeekStart]);
  
  const getNextWeekStart = useCallback(() => {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + 7);
    return date;
  }, [currentWeekStart]);
  
  const prevWeekDates = getWeekDatesFromStart(getPrevWeekStart());
  const nextWeekDates = getWeekDatesFromStart(getNextWeekStart());
  
  const goToPrevWeekRef = useRef(() => {});
  const goToNextWeekRef = useRef(() => {});
  
  goToPrevWeekRef.current = () => {
    setCurrentWeekStart(getPrevWeekStart());
  };
  
  goToNextWeekRef.current = () => {
    setCurrentWeekStart(getNextWeekStart());
  };
  
  const panResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 30;
      },
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          Animated.timing(translateX, {
            toValue: SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            goToPrevWeekRef.current();
            translateX.setValue(0);
          });
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          Animated.timing(translateX, {
            toValue: -SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            goToNextWeekRef.current();
            translateX.setValue(0);
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  , [translateX]);

  const getTaskCountForDate = (date: Date): number => {
    return tasks.filter((t) => {
      const taskDate = t.scheduledDate ? new Date(t.scheduledDate) : new Date(t.createdAt);
      return (
        taskDate.getFullYear() === date.getFullYear() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getDate() === date.getDate()
      );
    }).length;
  };

  const renderWeek = (dates: Date[], key: string) => (
    <View key={key} style={styles.weekCalendar}>
      {dates.map((date, index) => {
        const isToday = date.toDateString() === today.toDateString();
        const isSelected = date.toDateString() === selectedDate.toDateString();
        const taskCount = getTaskCountForDate(date);
        const hasTask = taskCount > 0;
        const dayIndex = date.getDay();

        return (
          <Pressable
            key={index}
            style={[
              styles.dayContainer,
              isSelected && styles.selectedDay,
            ]}
            onPress={() => onSelectDate(new Date(date))}
          >
            <Text
              style={[
                styles.dayName,
                isSelected && styles.selectedDayName,
              ]}
            >
              {DAYS[dayIndex]}
            </Text>
            <View style={[
              styles.dateCircle,
              isToday && !isSelected && styles.todayCircle,
              isSelected && styles.selectedDateCircle,
            ]}>
              <Text
                style={[
                  styles.dateNumber,
                  isToday && !isSelected && styles.todayText,
                  isSelected && styles.selectedDateText,
                ]}
              >
                {date.getDate()}
              </Text>
            </View>
            {hasTask && (
              <View style={[
                styles.taskIndicator,
                isSelected && styles.taskIndicatorSelected,
              ]} />
            )}
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.swipeContainer} {...panResponder.panHandlers}>
        <Animated.View
          style={[
            styles.weeksWrapper
          ]}
        >
          {renderWeek(prevWeekDates, 'prev')}
          {renderWeek(weekDates, 'current')}
          {renderWeek(nextWeekDates, 'next')}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    overflow: 'hidden',
  },
  swipeContainer: {
    marginHorizontal: 12,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  weeksWrapper: {
    flexDirection: 'row',
    width: '300%',
    marginLeft: '-100%',
  },
  weekCalendar: {
    width: '33.333%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
  },
  dayContainer: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 16,
    minWidth: 44,
    flex: 1,
  },
  selectedDay: {
    backgroundColor: Colors.peach,
  },
  dayName: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedDayName: {
    color: '#FFFFFF',
  },
  dateCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCircle: {
    backgroundColor: 'rgba(255, 144, 82, 0.15)',
  },
  selectedDateCircle: {
    backgroundColor: '#FFFFFF',
  },
  dateNumber: {
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '700' as const,
    color: Colors.text,
  },
  todayText: {
    color: Colors.peach,
  },
  selectedDateText: {
    color: Colors.peach,
  },
  taskIndicator: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.peach,
    marginTop: 6,
  },
  taskIndicatorSelected: {
    backgroundColor: '#FFFFFF',
  },
});
