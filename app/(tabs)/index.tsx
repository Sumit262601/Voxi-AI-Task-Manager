import {
  AddTaskModal,
  CalendarModal,
  EditTaskModal,
  EmptyState,
  FAB,
  HomeHeader,
  ProgressCard,
  TaskSections,
  WeekCalendar,
} from '@/components/home';

import { useTasks, type Task } from '@/contexts/tasks';
import { useCanCreateTask } from '@/contexts/purchases';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ConfettiSprinkles from '@/components/ConfettiSprinkles';
import NotificationsModal, { type Notification } from '@/components/profile/NotificationsModal';
import { getNotificationHistory, type NotificationHistoryItem } from '@/utils/notifications';

export default function HomeScreen() {
  const router = useRouter();
  const { tasks: allTasks, toggleTask: toggleTaskContext, updateTask, deleteTask, addTask } = useTasks();
  const { canCreateTask, dailyTaskLimit } = useCanCreateTask();
  const [today] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editPriority, setEditPriority] = useState('Regular');
  const [showPriorityOptions, setShowPriorityOptions] = useState(false);
  const [editScheduledDate, setEditScheduledDate] = useState(Date.now());
  const [editTime, setEditTime] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editAlertMinutes, setEditAlertMinutes] = useState(-1);
  const [editFrequency, setEditFrequency] = useState('Every Day');
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const handleToggleTask = useCallback((id: string) => {
    const task = allTasks.find(t => t.id === id);
    if (task && !task.completed) {
      setShowConfetti(true);
    }
    toggleTaskContext(id);
  }, [allTasks, toggleTaskContext]);

  const loadNotifications = useCallback(async () => {
    try {
      const history = await getNotificationHistory();
      const mapped: Notification[] = history.map((item: NotificationHistoryItem) => ({
        id: item.id,
        title: item.title,
        message: item.message,
        time: item.time,
        read: item.read,
        type: item.type,
      }));
      setNotifications(mapped);
    } catch (error) {
      console.log('Error loading notifications:', error);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleOpenNotifications = useCallback(() => {
    loadNotifications();
    setShowNotifications(true);
  }, [loadNotifications]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const openCalendarModal = () => {
    setCalendarMonth(selectedDate);
    setShowCalendarModal(true);
  };

  const closeCalendarModal = () => setShowCalendarModal(false);

  const changeMonth = (direction: number) => {
    const newDate = new Date(calendarMonth);
    newDate.setMonth(calendarMonth.getMonth() + direction);
    setCalendarMonth(newDate);
  };

  const selectDateFromCalendar = (day: number) => {
    const newDate = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      day
    );
    setSelectedDate(newDate);
    closeCalendarModal();
  };

  const isSameDay = (date1: Date, date2: number) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const tasksForSelectedDate = useMemo(
    () => allTasks.filter((t) => {
      if (t.scheduledDate) {
        return isSameDay(selectedDate, t.scheduledDate);
      }
      return isSameDay(selectedDate, t.createdAt);
    }),
    [allTasks, selectedDate]
  );

  const scheduledTasks = useMemo(
    () => tasksForSelectedDate.filter((t) => t.type === 'scheduled'),
    [tasksForSelectedDate]
  );

  const checklistTasks = useMemo(
    () => tasksForSelectedDate.filter((t) => t.type === 'checklist'),
    [tasksForSelectedDate]
  );

  const completedCount = tasksForSelectedDate.filter((t) => t.completed).length;
  const totalCount = tasksForSelectedDate.length;

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditIcon(task.icon);
    setEditDescription('');
    setEditColor(task.color);
    setEditPriority(task.priority || 'Regular');
    setShowPriorityOptions(false);
    setEditScheduledDate(task.scheduledDate || task.createdAt);
    setEditTime(task.time || '');
    setEditDuration(task.duration || '');
    setEditAlertMinutes(task.alertMinutes ?? -1);
    setEditFrequency('Every Day');
  };

  const closeEditModal = () => setEditingTask(null);

  const PRIORITY_COLORS: Record<string, string> = {
    'Urgent': '#E57373',
    'High': '#F48FB1',
    'Medium': '#B39DDB',
    'Regular': '#4A90D9',
    'None': '#4CAF50',
  };

  const saveTask = () => {
    if (editingTask) {
      updateTask(editingTask.id, {
        title: editTitle,
        icon: editIcon,
        color: editColor,
        borderColor: editColor,
        time: editTime,
        duration: editDuration,
        priority: editPriority,
        priorityColor: PRIORITY_COLORS[editPriority] || '#4A90D9',
        scheduledDate: editScheduledDate,
        alertMinutes: editAlertMinutes,
      });
      closeEditModal();
    }
  };

  return (
    <View style={styles.container}>
      <ConfettiSprinkles
        visible={showConfetti}
        onComplete={() => setShowConfetti(false)}
      />
      <LinearGradient
        colors={['#FAF8F5', '#FFF5EE', '#FAF8F5']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <HomeHeader
            selectedDate={selectedDate}
            onCalendarPress={openCalendarModal}
            onNotificationPress={handleOpenNotifications}
            unreadCount={unreadCount}
          />
          <WeekCalendar
            today={today}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />

          <View style={styles.contentWrapper}>
            <ScrollView 
              style={styles.scrollView} 
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {totalCount > 0 && (
                <ProgressCard
                  completedCount={completedCount}
                  totalCount={totalCount}
                  selectedDate={selectedDate}
                />
              )}

              <TaskSections 
                scheduledTasks={scheduledTasks} 
                checklistTasks={checklistTasks} 
                onPress={openEditModal} 
                onToggle={handleToggleTask} 
                onDelete={deleteTask} 
              />

              {tasksForSelectedDate.length === 0 && <EmptyState selectedDate={selectedDate} />}

              <View style={styles.bottomSpacer} />
            </ScrollView>
          </View>

          <FAB onPress={() => {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayTaskCount = allTasks.filter(t => t.createdAt >= todayStart.getTime()).length;
            if (!canCreateTask(todayTaskCount)) {
              const limitText = dailyTaskLimit === Infinity ? 'unlimited' : `${dailyTaskLimit}`;
              Alert.alert(
                'Daily Task Limit Reached',
                `You can only create ${limitText} tasks per day on your current plan. Upgrade to create more!`,
                [
                  { text: 'Maybe Later', style: 'cancel' },
                  { text: 'Upgrade Now', onPress: () => router.push('/paywall' as any) },
                ]
              );
              return;
            }
            setShowAddTaskModal(true);
          }} />

          <AddTaskModal
            key={showAddTaskModal ? `add-${selectedDate.getTime()}` : 'add-closed'}
            visible={showAddTaskModal}
            selectedDate={selectedDate}
            onClose={() => setShowAddTaskModal(false)}
            onSave={(task) => {
              addTask({
                title: task.title,
                icon: task.icon,
                color: task.color,
                borderColor: task.color,
                type: task.type,
                time: task.time,
                duration: task.duration,
                priority: task.priority,
                priorityColor: task.priorityColor,
                scheduledDate: task.scheduledDate,
                alertMinutes: task.alertMinutes,
              });
            }}
          />

          <CalendarModal
            visible={showCalendarModal}
            calendarMonth={calendarMonth}
            selectedDate={selectedDate}
            onClose={closeCalendarModal}
            onSelectDate={selectDateFromCalendar}
            onMonthChange={changeMonth}
          />

          <NotificationsModal
            visible={showNotifications}
            onClose={() => setShowNotifications(false)}
            notifications={notifications}
          />

          <EditTaskModal
            visible={editingTask !== null}
            editTitle={editTitle}
            setEditTitle={setEditTitle}
            editIcon={editIcon}
            setEditIcon={setEditIcon}
            editColor={editColor}
            setEditColor={setEditColor}
            editDescription={editDescription}
            setEditDescription={setEditDescription}
            editPriority={editPriority}
            setEditPriority={setEditPriority}
            showPriorityOptions={showPriorityOptions}
            setShowPriorityOptions={setShowPriorityOptions}
            editScheduledDate={editScheduledDate}
            setEditScheduledDate={setEditScheduledDate}
            editTime={editTime}
            setEditTime={setEditTime}
            editDuration={editDuration}
            setEditDuration={setEditDuration}
            editAlertMinutes={editAlertMinutes}
            setEditAlertMinutes={setEditAlertMinutes}
            editFrequency={editFrequency}
            setEditFrequency={setEditFrequency}
            onClose={closeEditModal}
            onSave={saveTask}
          />
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 24,
  },
  bottomSpacer: {
    height: 100,
  },
});
