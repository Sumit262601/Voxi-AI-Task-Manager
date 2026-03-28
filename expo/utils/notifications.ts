import * as Notifications from 'expo-notifications'; 
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_IDS_KEY = '@task_notification_ids';
const NOTIFICATION_HISTORY_KEY = '@notification_history';
const NOTIFICATIONS_ENABLED_KEY = '@notifications_enabled';
const DEFAULT_ALERT_MINUTES = 10;
const MAX_HISTORY = 50;

/** Used by NotificationsModal – keep in sync with Notification type there */
export interface NotificationHistoryItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'reminder' | 'completed' | 'info';
  createdAt: number;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface ScheduledNotification {
  taskId: string;
  notificationId: string;
}

export async function isNotificationsEnabled(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
    return stored !== 'false';
  } catch {
    return true;
  }
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? 'true' : 'false');
    console.log('Notifications enabled set to:', enabled);

    if (!enabled) {
      await cancelAllTaskNotifications();
      console.log('All scheduled notifications cancelled due to global toggle off');
    }
  } catch (error) {
    console.error('Error setting notifications enabled:', error);
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
    console.log('Notifications not supported on web');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Notification permission not granted');
    return false;
  }

  console.log('Notification permission granted');
  return true;
}

export async function scheduleTaskNotification(
  taskId: string,
  taskTitle: string,
  scheduledDate: number,
  taskTime: string,
  alertMinutes: number
): Promise<string | null> {
  if (Platform.OS === 'web') {
    console.log('Notifications not supported on web');
    return null;
  }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return null;
  }

  try {
    const globalEnabled = await isNotificationsEnabled();
    if (!globalEnabled) {
      console.log('Notifications are globally disabled, skipping schedule');
      return null;
    }

    await cancelTaskNotification(taskId);

    const taskDateTime = parseTaskDateTime(scheduledDate, taskTime);
    if (!taskDateTime) {
      console.log('Could not parse task date/time');
      return null;
    }

    const notificationTime = new Date(taskDateTime.getTime() - alertMinutes * 60 * 1000);
    const now = new Date();

    if (notificationTime <= now) {
      console.log('Notification time is in the past, skipping');
      return null;
    }

    const alertText = getAlertText(alertMinutes);
    const body = `"${taskTitle}" ${alertText}. Don't forget to complete it!`;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '📋 Voxi Task Reminder',
        body,
        subtitle: taskTitle,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { taskId, taskTitle },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: notificationTime,
      },
    });

    console.log(`Scheduled notification ${notificationId} for task ${taskId} at ${notificationTime.toISOString()}`);

    await saveNotificationId(taskId, notificationId);
    await saveNotificationToHistory({
      title: 'Task Reminder',
      message: body,
      type: 'reminder',
    });

    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
}

export async function cancelTaskNotification(taskId: string): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    const notificationIds = await getNotificationIds();
    const existing = notificationIds.find((n) => n.taskId === taskId);

    if (existing) {
      await Notifications.cancelScheduledNotificationAsync(existing.notificationId);
      console.log(`Cancelled notification for task ${taskId}`);
      
      const updated = notificationIds.filter((n) => n.taskId !== taskId);
      await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(updated));
    }
  } catch (error) {
    console.error('Error cancelling notification:', error);
  }
}

export async function cancelAllTaskNotifications(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.removeItem(NOTIFICATION_IDS_KEY);
    console.log('Cancelled all task notifications');
  } catch (error) {
    console.error('Error cancelling all notifications:', error);
  }
}

function parseTaskDateTime(scheduledDate: number, taskTime: string): Date | null {
  try {
    const date = new Date(scheduledDate);
    
    if (!taskTime) {
      date.setHours(9, 0, 0, 0);
      return date;
    }

    const timeParts = taskTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!timeParts) {
      date.setHours(9, 0, 0, 0);
      return date;
    }

    let hour = parseInt(timeParts[1], 10);
    const minute = parseInt(timeParts[2], 10);
    const period = timeParts[3].toUpperCase();

    if (period === 'AM' && hour === 12) {
      hour = 0;
    } else if (period === 'PM' && hour !== 12) {
      hour += 12;
    }

    date.setHours(hour, minute, 0, 0);
    return date;
  } catch (error) {
    console.error('Error parsing task date/time:', error);
    return null;
  }
}

function getAlertText(minutes: number): string {
  if (minutes === 0) return 'is starting now';
  if (minutes < 60) return `starts in ${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return hours === 1 ? 'starts in 1 hour' : `starts in ${hours} hours`;
  }
  return `starts in ${hours}h ${remainingMinutes}m`;
}

function getRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  const hr = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min} min ago`;
  if (hr < 24) return `${hr} hour${hr > 1 ? 's' : ''} ago`;
  if (day < 7) return `${day} day${day > 1 ? 's' : ''} ago`;
  return new Date(ts).toLocaleDateString();
}

async function getNotificationIds(): Promise<ScheduledNotification[]> {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

async function saveNotificationId(taskId: string, notificationId: string): Promise<void> {
  try {
    const notificationIds = await getNotificationIds();
    const filtered = notificationIds.filter((n) => n.taskId !== taskId);
    filtered.push({ taskId, notificationId });
    await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error saving notification id:', error);
  }
}

async function getStoredNotificationHistory(): Promise<Array<NotificationHistoryItem & { createdAt: number }>> {
  try {
    const stored = await AsyncStorage.getItem(NOTIFICATION_HISTORY_KEY);
    const list = stored ? JSON.parse(stored) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * Saves a notification to local history so it shows in the Notifications modal.
 * Call this when you schedule a reminder or show an instant notification.
 */
export async function saveNotificationToHistory(entry: {
  title: string;
  message: string;
  type: NotificationHistoryItem['type'];
  read?: boolean;
}): Promise<void> {
  try {
    const list = await getStoredNotificationHistory();
    const createdAt = Date.now();
    const item: NotificationHistoryItem & { createdAt: number } = {
      id: `n-${createdAt}-${Math.random().toString(36).slice(2, 9)}`,
      title: entry.title,
      message: entry.message,
      time: getRelativeTime(createdAt),
      read: entry.read ?? false,
      type: entry.type,
      createdAt,
    };
    const updated = [item, ...list].slice(0, MAX_HISTORY);
    await AsyncStorage.setItem(NOTIFICATION_HISTORY_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving notification to history:', error);
  }
}

/**
 * Returns notification history for the current user (local device).
 * Use this in Profile to pass to NotificationsModal.
 */
export async function getNotificationHistory(): Promise<NotificationHistoryItem[]> {
  const list = await getStoredNotificationHistory();
  return list.map((item) => ({
    id: item.id,
    title: item.title,
    message: item.message,
    time: getRelativeTime(item.createdAt),
    read: item.read,
    type: item.type,
    createdAt: item.createdAt,
  }));
}

export const ALERT_OPTIONS = [
  { label: 'None', minutes: -1 },
  { label: 'At time', minutes: 0 },
  { label: '5 min before', minutes: 5 },
  { label: '10 min before', minutes: 10 },
  { label: '15 min before', minutes: 15 },
  { label: '30 min before', minutes: 30 },
  { label: '1 hour before', minutes: 60 },
  { label: '2 hours before', minutes: 120 },
];

export function getAlertLabelFromMinutes(minutes: number): string {
  const option = ALERT_OPTIONS.find((o) => o.minutes === minutes);
  return option?.label || 'None';
}

export function getMinutesFromAlertLabel(label: string): number {
  const option = ALERT_OPTIONS.find((o) => o.label === label);
  return option?.minutes ?? -1;
}

export async function showInstantNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<string | null> {
  if (Platform.OS === 'web') {
    console.log('Notifications not supported on web');
    return null;
  }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return null;
  }

  try {
    const globalEnabled = await isNotificationsEnabled();
    if (!globalEnabled) {
      console.log('Notifications are globally disabled, skipping instant notification');
      return null;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: data || {},
      },
      trigger: null,
    });

    console.log(`Sent instant notification: ${notificationId}`);
    await saveNotificationToHistory({
      title,
      message: body,
      type: 'info',
    });
    return notificationId;
  } catch (error) {
    console.error('Error sending instant notification:', error);
    return null;
  }
}

export async function rescheduleAllTaskNotifications(
  tasks: Array<{ id: string; title: string; scheduledDate: number; time: string; alertMinutes?: number; completed: boolean }>
): Promise<void> {
  if (Platform.OS === 'web') return;

  const globalEnabled = await isNotificationsEnabled();
  if (!globalEnabled) {
    console.log('Notifications disabled, skipping reschedule');
    return;
  }

  console.log('Rescheduling notifications for', tasks.length, 'tasks');

  for (const task of tasks) {
    if (task.completed || !task.time) continue;

    const effectiveAlert = task.alertMinutes !== undefined && task.alertMinutes >= 0
      ? task.alertMinutes
      : DEFAULT_ALERT_MINUTES;

    await scheduleTaskNotification(
      task.id,
      task.title,
      task.scheduledDate,
      task.time,
      effectiveAlert
    );
  }

  console.log('All task notifications rescheduled');
}

export async function scheduleTaskNotificationAuto(
  taskId: string,
  taskTitle: string,
  scheduledDate: number,
  taskTime: string,
  alertMinutes?: number
): Promise<string | null> {
  if (Platform.OS === 'web') {
    console.log('Notifications not supported on web');
    return null;
  }

  if (!taskTime) {
    console.log('No time set for task, skipping auto-schedule');
    return null;
  }

  const effectiveAlertMinutes = alertMinutes !== undefined && alertMinutes >= 0 
    ? alertMinutes 
    : DEFAULT_ALERT_MINUTES;

  return scheduleTaskNotification(
    taskId,
    taskTitle,
    scheduledDate,
    taskTime,
    effectiveAlertMinutes
  );
}
