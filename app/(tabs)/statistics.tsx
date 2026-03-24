import Colors from '@/constants/colors';
import { useTasks, type Task } from '@/contexts/tasks';
import { usePurchases } from '@/contexts/purchases';
import { parseDurationToMinutes, formatMinutes } from '@/utils/taskDate';
import { Clock, Target, TrendingUp, CheckCircle2, Calendar, Flame, Award, Lock, Sparkles, ChevronRight, Zap, Grid3x3, BarChart3 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Animated, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';

import Svg, { Circle } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TimeRange = 'Day' | 'Week' | 'Month' | 'Year';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatPercent = (value: number): string => {
  const rounded = Math.round(value);
  if (rounded === 100) return '100%';
  if (rounded === 0) return '0%';
  return `${value.toFixed(1)}%`;
};

const LOCKED_RANGES: TimeRange[] = ['Day', 'Month', 'Year'];

export default function StatisticsScreen() {
  const { tasks } = useTasks();
  const { canUseAdvancedStats } = usePurchases();
  const router = useRouter();
  const hasFullAccess = canUseAdvancedStats;
  const [selectedRange, setSelectedRange] = useState<TimeRange>('Week');

  const slideAnim = useRef(new Animated.Value(0)).current;

  const isLockedRange = useCallback((range: TimeRange) => {
    return !hasFullAccess && LOCKED_RANGES.includes(range);
  }, [hasFullAccess]);

  const handleRangeChange = useCallback((range: TimeRange) => {
    const ranges: TimeRange[] = ['Day', 'Week', 'Month', 'Year'];
    const newIndex = ranges.indexOf(range);
    Animated.spring(slideAnim, {
      toValue: newIndex,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();
    setSelectedRange(range);
  }, [slideAnim]);

  useEffect(() => {
    const ranges: TimeRange[] = ['Day', 'Week', 'Month', 'Year'];
    slideAnim.setValue(ranges.indexOf(selectedRange));
  }, []);

  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    switch (selectedRange) {
      case 'Day':
        start.setDate(now.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'Week':
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        end.setDate(diff + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case 'Month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(now.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'Year':
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(11, 31);
        end.setHours(23, 59, 59, 999);
        break;
    }

    return { startDate: start, endDate: end };
  }, [selectedRange]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const taskDate = new Date(task.createdAt);
      return taskDate >= startDate && taskDate <= endDate;
    });
  }, [tasks, startDate, endDate]);

  const stats = useMemo(() => {
    const created = filteredTasks.length;
    const completed = filteredTasks.filter((t) => t.completed).length;
    const missed = created - completed;
    const completedPercent = created > 0 ? (completed / created) * 100 : 0;
    const missedPercent = created > 0 ? (missed / created) * 100 : 0;

    const scheduledTasks = filteredTasks.filter((t) => t.type === 'scheduled');
    const checklistTasks = filteredTasks.filter((t) => t.type === 'checklist');
    const plannedTasks = scheduledTasks.length;
    const anytimeTasks = checklistTasks.length;
    const plannedPercent = created > 0 ? (plannedTasks / created) * 100 : 0;
    const anytimePercent = created > 0 ? (anytimeTasks / created) * 100 : 0;

    const totalMinutes = filteredTasks.reduce((acc, task) => {
      if (task.completed && task.duration) {
        return acc + parseDurationToMinutes(task.duration);
      }
      return acc;
    }, 0);

    const averageMinutesPerTask = completed > 0 ? totalMinutes / completed : 0;

    let daysInRange = 7;
    if (selectedRange === 'Week') daysInRange = 7;
    else if (selectedRange === 'Month') {
      const days = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();
      daysInRange = days;
    } else if (selectedRange === 'Year') daysInRange = 365;

    const averagePerDay = daysInRange > 0 ? completed / daysInRange : 0;

    return {
      created,
      completed,
      missed,
      completedPercent,
      missedPercent,
      averagePerDay,
      plannedTasks,
      anytimeTasks,
      plannedPercent,
      anytimePercent,
      totalMinutes,
      averageMinutesPerTask,
      daysInRange,
    };
  }, [filteredTasks, selectedRange, endDate]);

  const breakdown = useMemo(() => {
    if (selectedRange === 'Day') {
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const dayData = Array.from({ length: 7 }, (_, i) => {
        const daysAgo = 6 - i;
        const dayDate = new Date(today);
        dayDate.setDate(today.getDate() - daysAgo);
        dayDate.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayDate);
        dayEnd.setHours(23, 59, 59, 999);

        const dayTasks = filteredTasks.filter((task) => {
          const taskDate = task.completed && task.completedAt
            ? new Date(task.completedAt)
            : new Date(task.createdAt);
          return taskDate >= dayDate && taskDate <= dayEnd;
        });

        const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNumber = dayDate.getDate();

        return {
          label: daysAgo === 0 ? 'Today' : dayName,
          subLabel: `${dayNumber}`,
          tasks: dayTasks,
          completed: dayTasks.filter((t) => t.completed).length,
          total: dayTasks.length,
        };
      });

      const maxTasks = Math.max(...dayData.map((d) => d.total), 1);

      return dayData.map((day) => ({
        ...day,
        max: maxTasks,
        value: day.completed,
      }));
    } else if (selectedRange === 'Week') {
      const dayData = DAYS_OF_WEEK.map((day, index) => {
        const dayStart = new Date(startDate);
        dayStart.setDate(startDate.getDate() + index);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);

        const dayTasks = filteredTasks.filter((task) => {
          const taskDate = new Date(task.createdAt);
          return taskDate >= dayStart && taskDate <= dayEnd;
        });

        return {
          label: day,
          subLabel: dayStart.getDate().toString(),
          tasks: dayTasks,
          completed: dayTasks.filter((t) => t.completed).length,
          total: dayTasks.length,
        };
      });

      const maxTasks = Math.max(...dayData.map((d) => d.total), 1);

      return dayData.map((day) => ({
        ...day,
        max: maxTasks,
        value: day.completed,
      }));
    } else if (selectedRange === 'Month') {
      const weeks: { label: string; value: number; max: number; tasks: Task[]; completed: number; total: number; subLabel: string }[] = [];
      const firstDay = new Date(startDate);
      let currentWeekStart = new Date(firstDay);

      const weekData: { start: Date; end: Date; tasks: Task[] }[] = [];
      while (currentWeekStart <= endDate) {
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(currentWeekStart.getDate() + 6);
        if (weekEnd > endDate) weekEnd.setTime(endDate.getTime());

        const weekTasks = filteredTasks.filter((task) => {
          const taskDate = new Date(task.createdAt);
          return taskDate >= currentWeekStart && taskDate <= weekEnd;
        });

        weekData.push({
          start: new Date(currentWeekStart),
          end: new Date(weekEnd),
          tasks: weekTasks,
        });

        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      }

      const maxTasks = Math.max(...weekData.map((w) => w.tasks.length), 1);

      return weekData.map((week, index) => ({
        label: `W${index + 1}`,
        subLabel: `${week.start.getDate()}-${week.end.getDate()}`,
        value: week.tasks.filter((t) => t.completed).length,
        max: maxTasks,
        tasks: week.tasks,
        completed: week.tasks.filter((t) => t.completed).length,
        total: week.tasks.length,
      }));
    } else {
      const monthData = MONTHS.map((month, index) => {
        const monthStart = new Date(startDate.getFullYear(), index, 1);
        const monthEnd = new Date(startDate.getFullYear(), index + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);

        const monthTasks = filteredTasks.filter((task) => {
          const taskDate = new Date(task.createdAt);
          return taskDate >= monthStart && taskDate <= monthEnd;
        });

        return {
          label: month,
          subLabel: '',
          tasks: monthTasks,
          completed: monthTasks.filter((t) => t.completed).length,
          total: monthTasks.length,
        };
      });

      const maxTasks = Math.max(...monthData.map((m) => m.total), 1);

      return monthData.map((month) => ({
        ...month,
        max: maxTasks,
        value: month.completed,
      }));
    }
  }, [filteredTasks, selectedRange, startDate, endDate]);

  const segmentWidth = (SCREEN_WIDTH - 48) / 4;

  const statsContent = (
    <>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, styles.statCardPrimary]}>
              <View style={styles.statCardIcon}>
                <Target size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.statCardValue}>{stats.created}</Text>
              <Text style={styles.statCardLabel}>Total Tasks</Text>
            </View>

            <View style={[styles.statCard, styles.statCardSuccess]}>
              <View style={[styles.statCardIcon, styles.statCardIconSuccess]}>
                <CheckCircle2 size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.statCardValue}>{stats.completed}</Text>
              <Text style={styles.statCardLabel}>Completed</Text>
            </View>

            <View style={[styles.statCard, styles.statCardWarning]}>
              <View style={[styles.statCardIcon, styles.statCardIconWarning]}>
                <Clock size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.statCardValue}>{formatMinutes(stats.totalMinutes)}</Text>
              <Text style={styles.statCardLabel}>Time Spent</Text>
            </View>

            <View style={[styles.statCard, styles.statCardInfo]}>
              <View style={[styles.statCardIcon, styles.statCardIconInfo]}>
                <Flame size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.statCardValue}>{stats.averagePerDay.toFixed(1)}</Text>
              <Text style={styles.statCardLabel}>Avg/Day</Text>
            </View>
          </View>

          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <View style={styles.progressTitleRow}>
                <Award size={22} color={Colors.peach} />
                <Text style={styles.progressTitle}>Completion Rate</Text>
              </View>
              <Text style={styles.progressPercent}>{formatPercent(stats.completedPercent)}</Text>
            </View>

            <View style={styles.progressRingContainer}>
              <ProgressRing percent={stats.completedPercent} size={160} strokeWidth={14} />
              <View style={styles.progressRingCenter}>
                <Text style={styles.progressRingValue}>{stats.completed}</Text>
                <Text style={styles.progressRingLabel}>of {stats.created}</Text>
              </View>
            </View>

            <View style={styles.progressStats}>
              <View style={styles.progressStatItem}>
                <View style={[styles.progressStatDot, { backgroundColor: Colors.green }]} />
                <Text style={styles.progressStatLabel}>Completed</Text>
                <Text style={styles.progressStatValue}>{stats.completed}</Text>
              </View>
              <View style={styles.progressStatItem}>
                <View style={[styles.progressStatDot, { backgroundColor: Colors.coral }]} />
                <Text style={styles.progressStatLabel}>Pending</Text>
                <Text style={styles.progressStatValue}>{stats.missed}</Text>
              </View>
            </View>
          </View>

          <ContributionHeatmap tasks={tasks} />

          <View style={styles.taskTypeCard}>
            <View style={styles.taskTypeHeader}>
              <Calendar size={22} color={Colors.text} />
              <Text style={styles.taskTypeTitle}>Task Types</Text>
            </View>

            <View style={styles.taskTypeContent}>
              <View style={styles.taskTypeItem}>
                <View style={styles.taskTypeInfo}>
                  <View style={[styles.taskTypeDot, { backgroundColor: Colors.purple }]} />
                  <View>
                    <Text style={styles.taskTypeLabel}>Scheduled</Text>
                    <Text style={styles.taskTypeSubLabel}>With time & date</Text>
                  </View>
                </View>
                <View style={styles.taskTypeRight}>
                  <Text style={styles.taskTypeValue}>{stats.plannedTasks}</Text>
                  <Text style={styles.taskTypePercent}>{formatPercent(stats.plannedPercent)}</Text>
                </View>
              </View>

              <View style={styles.taskTypeDivider} />

              <View style={styles.taskTypeItem}>
                <View style={styles.taskTypeInfo}>
                  <View style={[styles.taskTypeDot, { backgroundColor: Colors.yellow }]} />
                  <View>
                    <Text style={styles.taskTypeLabel}>Checklist</Text>
                    <Text style={styles.taskTypeSubLabel}>Flexible timing</Text>
                  </View>
                </View>
                <View style={styles.taskTypeRight}>
                  <Text style={styles.taskTypeValue}>{stats.anytimeTasks}</Text>
                  <Text style={styles.taskTypePercent}>{formatPercent(stats.anytimePercent)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.taskTypeBar}>
              <View
                style={[
                  styles.taskTypeBarSegment,
                  {
                    backgroundColor: Colors.purple,
                    flex: stats.plannedPercent || 0.5,
                    borderTopLeftRadius: 6,
                    borderBottomLeftRadius: 6,
                  }
                ]}
              />
              <View
                style={[
                  styles.taskTypeBarSegment,
                  {
                    backgroundColor: Colors.yellow,
                    flex: stats.anytimePercent || 0.5,
                    borderTopRightRadius: 6,
                    borderBottomRightRadius: 6,
                  }
                ]}
              />
            </View>
          </View>

          <View style={styles.insightsCard}>
            <View style={styles.insightsHeader}>
              <TrendingUp size={22} color={Colors.text} />
              <Text style={styles.insightsTitle}>Insights</Text>
            </View>

            <View style={styles.insightItem}>
              <View style={[styles.insightIcon, { backgroundColor: '#E8F5E9' }]}>
                <Clock size={18} color="#4CAF50" />
              </View>
              <View style={styles.insightContent}>
                <Text style={styles.insightLabel}>Average time per task</Text>
                <Text style={styles.insightValue}>{formatMinutes(Math.round(stats.averageMinutesPerTask))}</Text>
              </View>
            </View>

            <View style={styles.insightItem}>
              <View style={[styles.insightIcon, { backgroundColor: '#E3F2FD' }]}>
                <Target size={18} color="#2196F3" />
              </View>
              <View style={styles.insightContent}>
                <Text style={styles.insightLabel}>Daily average time</Text>
                <Text style={styles.insightValue}>{formatMinutes(Math.round(stats.totalMinutes / Math.max(stats.daysInRange, 1)))}</Text>
              </View>
            </View>

            <View style={styles.insightItem}>
              <View style={[styles.insightIcon, { backgroundColor: '#FFF3E0' }]}>
                <Flame size={18} color={Colors.peach} />
              </View>
              <View style={styles.insightContent}>
                <Text style={styles.insightLabel}>Tasks per day</Text>
                <Text style={styles.insightValue}>{stats.averagePerDay.toFixed(1)} tasks</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 40 }} />
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Statistics</Text>
        <Text style={styles.subtitle}>Track your productivity</Text>
      </View>

      <View style={styles.segmentedControl}>
        <Animated.View
          style={[
            styles.segmentIndicator,
            {
              width: segmentWidth - 4,
              transform: [{
                translateX: slideAnim.interpolate({
                  inputRange: [0, 1, 2, 3],
                  outputRange: [2, segmentWidth + 2, segmentWidth * 2 + 2, segmentWidth * 3 + 2],
                }),
              }],
            },
          ]}
        />
        {(['Day', 'Week', 'Month', 'Year'] as TimeRange[]).map((range) => (
          <Pressable
            key={range}
            style={styles.segment}
            onPress={() => handleRangeChange(range)}
          >
            <Text
              style={[
                styles.segmentText,
                selectedRange === range && styles.segmentTextSelected,
              ]}
            >
              {range}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLockedRange(selectedRange) ? (
        <View style={styles.lockedWrapper}>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {statsContent}
          </ScrollView>
          <BlurView
            intensity={Platform.OS === 'ios' ? 60 : 70}
            tint="light"
            style={styles.blurOverlay}
          />
          <View style={styles.lockedContainer}>
            <View style={styles.lockedCard}>
              <View style={styles.lockedIconOuter}>
                <LinearGradient
                  colors={['#FF9052', '#FF6B35']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.lockedIconGradient}
                >
                  <Lock size={24} color="#FFFFFF" />
                </LinearGradient>
              </View>

              <Text style={styles.lockedTitle}>
                Unlock Full Statistics
              </Text>
              <Text style={styles.lockedSubtitle}>
                Get detailed insights for each day, month, and the entire year to boost your productivity.
              </Text>

              <View style={styles.lockedFeatures}>
                {[
                  { icon: Grid3x3, text: 'Daily & monthly breakdowns' },
                  { icon: TrendingUp, text: 'Yearly progress trends' },
                  { icon: Sparkles, text: 'Advanced productivity insights' },
                ].map((feature, i) => (
                  <View key={i} style={styles.lockedFeatureRow}>
                    <View style={styles.lockedFeatureIcon}>
                      <feature.icon size={16} color={Colors.peach} />
                    </View>
                    <Text style={styles.lockedFeatureText}>{feature.text}</Text>
                  </View>
                ))}
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.lockedCTA,
                  pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                ]}
                onPress={() => router.push('/paywall' as any)}
              >
                <LinearGradient
                  colors={['#FF9052', '#FF6B35']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.lockedCTAGradient}
                >
                  <Zap size={20} color="#FFFFFF" fill="#FFFFFF" />
                  <Text style={styles.lockedCTAText}>Upgrade to Pro</Text>
                  <ChevronRight size={18} color="#FFFFFF" />
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {statsContent}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

interface ProgressRingProps {
  percent: number;
  size: number;
  strokeWidth: number;
}

function ProgressRing({ percent, size, strokeWidth }: ProgressRingProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [currentPercent, setCurrentPercent] = useState(0);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: percent,
      duration: 1000,
      useNativeDriver: false,
    }).start();

    const listener = animatedValue.addListener(({ value }) => {
      setCurrentPercent(value);
    });

    return () => animatedValue.removeListener(listener);
  }, [percent]);

  const strokeDashoffset = circumference - (currentPercent / 100) * circumference;

  return (
    <Svg width={size} height={size}>
      <Circle
        stroke={Colors.border}
        fill="none"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
      />
      <Circle
        stroke={Colors.green}
        fill="none"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

const HEATMAP_MIN_CELL_SIZE = 12;
const HEATMAP_COLORS = ['#F0ECE8', '#FFE0CC', '#FFB88C', '#FF9052', '#E8682A'];
const HEATMAP_DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

interface ContributionHeatmapProps {
  tasks: Task[];
}

function ContributionHeatmap({ tasks }: ContributionHeatmapProps) {
  const [selectedCell, setSelectedCell] = useState<{ date: Date; count: number } | null>(null);

  const formatTooltipDate = useCallback((date: Date) => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const day = date.getDate();
    const suffix = (day >= 11 && day <= 13) ? 'th'
      : day % 10 === 1 ? 'st'
      : day % 10 === 2 ? 'nd'
      : day % 10 === 3 ? 'rd' : 'th';
    return `${monthNames[date.getMonth()]} ${day}${suffix}`;
  }, []);

  const heatmapData = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const year = today.getFullYear();

    // Calendar year: Jan 1 to Dec 31. Start from Monday of week containing Jan 1, end on Sunday of week containing Dec 31.
    const jan1 = new Date(year, 0, 1);
    const dec31 = new Date(year, 11, 31);
    const jan1Day = jan1.getDay(); // 0=Sun, 1=Mon, ...
    const daysToMonday = (jan1Day + 6) % 7; // Mon=0, Sun=6, Tue=1, ...
    const startDate = new Date(jan1);
    startDate.setDate(jan1.getDate() - daysToMonday);
    startDate.setHours(0, 0, 0, 0);

    const dec31Day = dec31.getDay();
    const daysToSunday = dec31Day === 0 ? 0 : 7 - dec31Day;
    const endDate = new Date(dec31);
    endDate.setDate(dec31.getDate() + daysToSunday);
    endDate.setHours(23, 59, 59, 999);

    const countMap: Record<string, number> = {};
    tasks.forEach((task) => {
      if (task.completed) {
        const d = task.completedAt ? new Date(task.completedAt) : new Date(task.createdAt);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        countMap[key] = (countMap[key] || 0) + 1;
      }
    });

    const weeks: { date: Date; count: number; isToday: boolean }[][] = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const week: { date: Date; count: number; isToday: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const key = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;
        const isToday = currentDate.getDate() === today.getDate() &&
          currentDate.getMonth() === today.getMonth() &&
          currentDate.getFullYear() === today.getFullYear();
        week.push({
          date: new Date(currentDate),
          count: countMap[key] || 0,
          isToday,
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeks.push(week);
    }

    const maxCount = Math.max(...weeks.flat().map((d) => d.count), 1);

    const monthLabels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, wIdx) => {
      const firstDay = week[0].date;
      const isCurrentYear = firstDay.getFullYear() === year;
      if (isCurrentYear && firstDay.getMonth() !== lastMonth) {
        lastMonth = firstDay.getMonth();
        monthLabels.push({ label: MONTHS[lastMonth], weekIndex: wIdx });
      }
    });

    const totalCompleted = tasks.filter((t) => t.completed).length;
    let currentStreak = 0;
    const checkDate = new Date(today);
    checkDate.setHours(0, 0, 0, 0);
    while (true) {
      const key = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
      if ((countMap[key] || 0) > 0) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return { weeks, maxCount, monthLabels, totalCompleted, currentStreak };
  }, [tasks]);

  const getColor = useCallback((count: number, max: number) => {
    if (count === 0) return '#F0ECE8';
    const ratio = count / max;
    if (ratio <= 0.25) return HEATMAP_COLORS[1];
    if (ratio <= 0.5) return HEATMAP_COLORS[2];
    if (ratio <= 0.75) return HEATMAP_COLORS[3];
    return HEATMAP_COLORS[4];
  }, []);

  const handleCellPress = useCallback((date: Date, count: number) => {
    setSelectedCell(prev => {
      if (prev && prev.date.getTime() === date.getTime()) {
        return null;
      }
      return { date, count };
    });
  }, []);

  const gap = 3;
  const weekCount = heatmapData.weeks.length;
  const cellSize = Math.max(
    HEATMAP_MIN_CELL_SIZE,
    Math.floor((SCREEN_WIDTH - 72 - 28) / weekCount)
  );
  const heatmapContentWidth = weekCount * (cellSize + gap);

  return (
    <View style={styles.heatmapCard}>
      <View style={styles.heatmapHeader}>
        <View style={styles.heatmapTitleRow}>
          <View style={styles.heatmapIconWrap}>
            <Grid3x3 size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.heatmapTitle}>Activity Streak</Text>
        </View>
        <View style={styles.heatmapStreakBadge}>
          <Flame size={14} color="#FFFFFF" />
          <Text style={styles.heatmapStreakText}>{heatmapData.currentStreak}d</Text>
        </View>
      </View>

      <View style={styles.heatmapStatsRow}>
        <View style={styles.heatmapStatItem}>
          <Text style={styles.heatmapStatValue}>{heatmapData.totalCompleted}</Text>
          <Text style={styles.heatmapStatLabel}>Completed</Text>
        </View>
        <View style={styles.heatmapStatDivider} />
        <View style={styles.heatmapStatItem}>
          <Text style={styles.heatmapStatValue}>{heatmapData.currentStreak}</Text>
          <Text style={styles.heatmapStatLabel}>Day Streak</Text>
        </View>
        <View style={styles.heatmapStatDivider} />
        <View style={styles.heatmapStatItem}>
          <Text style={styles.heatmapStatValue}>{heatmapData.weeks.flat().filter(d => d.count > 0).length}</Text>
          <Text style={styles.heatmapStatLabel}>Active Days</Text>
        </View>
      </View>

      {selectedCell && (
        <Pressable onPress={() => setSelectedCell(null)} style={styles.heatmapTooltipWrap}>
          <View style={styles.heatmapTooltip}>
            <Text style={styles.heatmapTooltipText}>
              {selectedCell.count} {selectedCell.count === 1 ? 'task' : 'tasks'} on {formatTooltipDate(selectedCell.date)}
            </Text>
          </View>
        </Pressable>
      )}

      <View style={styles.heatmapGridCard}>
        <View style={styles.heatmapGrid}>
          <View style={[styles.heatmapDayLabels, { gap }]}>
            <View style={{ height: 19 }} />
            {HEATMAP_DAY_LABELS.map((label, i) => (
              <Text
                key={i}
                style={[
                  styles.heatmapDayLabel,
                  { height: cellSize, lineHeight: cellSize },
                ]}
              >
                {label}
              </Text>
            ))}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={{ width: heatmapContentWidth }}>
              <View style={[styles.heatmapMonthRowInner, { position: 'relative' as const }]}>
                {heatmapData.weeks.map((_week, wIdx) => (
                  <View key={wIdx} style={{ width: cellSize }} />
                ))}
                {heatmapData.monthLabels.map((m) => (
                  <View
                    key={`month-${m.weekIndex}-${m.label}`}
                    style={{
                      position: 'absolute',
                      left: m.weekIndex * (cellSize + gap),
                      top: 0,
                      minWidth: 32,
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={styles.heatmapMonthLabelInline} numberOfLines={1}>
                      {m.label}
                    </Text>
                  </View>
                ))}
              </View>
              
              <View style={[styles.heatmapWeeksContainer, { minWidth: heatmapContentWidth, width: heatmapContentWidth }]}>
                {heatmapData.weeks.map((week, wIdx) => (
                  <View key={wIdx} style={[styles.heatmapWeekColumn, { gap }]}>
                    {week.map((day, dIdx) => {
                      const isFuture = day.date > new Date();
                      const isSelected = selectedCell?.date.getTime() === day.date.getTime();
                      return (
                        <Pressable
                          key={dIdx}
                          onPress={() => handleCellPress(day.date, day.count)}
                          style={[
                            styles.heatmapCell,
                            {
                              width: cellSize,
                              height: cellSize,
                              borderRadius: 4,
                              backgroundColor: isFuture
                                ? '#F5F2EE'
                                : getColor(day.count, heatmapData.maxCount),
                            },
                            day.isToday && styles.heatmapCellToday,
                            isSelected && styles.heatmapCellSelected,
                          ]}
                        />
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>

      <View style={styles.heatmapFooter}>
        <View style={styles.heatmapLegend}>
          <Text style={styles.heatmapLegendText}>Less</Text>
          {HEATMAP_COLORS.map((color, i) => (
            <View
              key={i}
              style={[
                styles.heatmapLegendCell,
                { backgroundColor: color },
              ]}
            />
          ))}
          <Text style={styles.heatmapLegendText}>More</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 4,
    marginHorizontal: 20,
    marginBottom: 20,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  segmentIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    backgroundColor: Colors.peach,
    borderRadius: 10,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  segmentTextSelected: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statCardPrimary: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.peach,
  },
  statCardSuccess: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.green,
  },
  statCardWarning: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.yellow,
  },
  statCardInfo: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.coral,
  },
  statCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.peach,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statCardIconSuccess: {
    backgroundColor: Colors.green,
  },
  statCardIconWarning: {
    backgroundColor: Colors.yellow,
  },
  statCardIconInfo: {
    backgroundColor: Colors.coral,
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  statCardLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  progressCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  progressPercent: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.green,
  },
  progressRingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  progressRingCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  progressRingValue: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  progressRingLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
  },
  progressStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressStatDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  progressStatLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  progressStatValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  heatmapCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 0,
    marginBottom: 16,
    alignSelf: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  heatmapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  heatmapTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heatmapIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: Colors.peach,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heatmapTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  heatmapStreakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.peach,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  heatmapStreakText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  heatmapStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Colors.background,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 16,
  },
  heatmapStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  heatmapStatValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  heatmapStatLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  heatmapStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
  },
  heatmapGridCard: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 12,
    paddingTop: 8,
    width: '100%',
  },
  heatmapMonthRow: {
    flexDirection: 'row',
    position: 'relative',
    height: 18,
    marginBottom: 4,
  },
  heatmapMonthLabel: {
    position: 'absolute',
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
  },
  heatmapGrid: {
    flexDirection: 'row',
  },
  heatmapDayLabels: {
    width: 28,
    marginRight: 4,
  },
  heatmapDayLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  heatmapWeeksContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 3,
  },
  heatmapWeekColumn: {
    flexDirection: 'column',
  },
  heatmapCell: {
    borderWidth: 0,
  },
  heatmapCellToday: {
    borderWidth: 1.5,
    borderColor: Colors.peach,
  },
  heatmapFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 14,
  },
  heatmapLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  heatmapLegendText: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginHorizontal: 2,
    fontWeight: '500' as const,
  },
  heatmapLegendCell: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  heatmapTooltipWrap: {
    alignItems: 'center',
    marginBottom: 10,
  },
  heatmapTooltip: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  heatmapTooltipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  heatmapMonthRowInner: {
    flexDirection: 'row' as const,
    height: 18,
    width: '100%',
    marginBottom: 4,
    gap: 3,
  },
  heatmapMonthLabelInline: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  heatmapCellSelected: {
    borderWidth: 2,
    borderColor: '#1F2937',
  },
  taskTypeCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  taskTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  taskTypeTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  taskTypeContent: {
    marginBottom: 16,
  },
  taskTypeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  taskTypeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  taskTypeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  taskTypeLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  taskTypeSubLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  taskTypeRight: {
    alignItems: 'flex-end',
  },
  taskTypeValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  taskTypePercent: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  taskTypeDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  taskTypeBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  taskTypeBarSegment: {
    height: '100%',
  },
  insightsCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  insightContent: {
    flex: 1,
  },
  insightLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  insightValue: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  lockedWrapper: {
    flex: 1,
    position: 'relative',
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  lockedContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  lockedCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,144,82,0.12)',
  },
  lockedIconOuter: {
    marginBottom: 20,
  },
  lockedIconGradient: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF9052',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  lockedTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  lockedSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  lockedFeatures: {
    width: '100%',
    marginBottom: 24,
    gap: 14,
  },
  lockedFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  lockedFeatureIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFF3EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedFeatureText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
    flex: 1,
  },
  lockedCTA: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  lockedCTAGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  lockedCTAText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
});
