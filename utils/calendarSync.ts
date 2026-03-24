import * as CalendarModule from 'expo-calendar';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task } from '@/contexts/tasks';
import { parseTimeToDate, parseDurationToMinutes } from './taskDate';

const CALENDAR_SYNC_STORAGE_KEY = '@calendar_sync';
const CALENDAR_TYPE_STORAGE_KEY = '@calendar_type';
const CALENDAR_EVENT_IDS_KEY = '@calendar_event_ids';

interface CalendarEventIds {
  [taskId: string]: string; // taskId -> calendarEventId
}

/**
 * Check if calendar sync is enabled
 */
export async function isCalendarSyncEnabled(): Promise<boolean> {
  try {
    const syncEnabled = await AsyncStorage.getItem(CALENDAR_SYNC_STORAGE_KEY);
    return syncEnabled === 'true';
  } catch (error) {
    console.error('Failed to check calendar sync status:', error);
    return false;
  }
}

/**
 * Get the connected calendar type
 */
export async function getCalendarType(): Promise<'apple' | 'google' | null> {
  try {
    const calendarType = await AsyncStorage.getItem(CALENDAR_TYPE_STORAGE_KEY);
    return calendarType as 'apple' | 'google' | null;
  } catch (error) {
    console.error('Failed to get calendar type:', error);
    return null;
  }
}

/**
 * Get the target calendar for syncing
 */
async function getTargetCalendar(): Promise<CalendarModule.Calendar | null> {
  try {
    const hasPermission = await CalendarModule.requestCalendarPermissionsAsync();
    if (hasPermission.status !== 'granted') {
      return null;
    }

    const calendars = await CalendarModule.getCalendarsAsync(CalendarModule.EntityTypes.EVENT);
    if (calendars.length === 0) {
      return null;
    }

    const calendarType = await getCalendarType();
    
    if (Platform.OS === 'ios' && calendarType === 'apple') {
      // On iOS, look for the default calendar or iCloud calendar
      return calendars.find(
        (cal) => cal.source?.type === 'local' || cal.source?.name === 'iCloud'
      ) || calendars[0];
    } else if (calendarType === 'google') {
      // Look for Google Calendar
      const googleCalendar = calendars.find(
        (cal) => cal.source?.name?.toLowerCase().includes('google') || 
                 cal.sourceId?.includes('google')
      );
      return googleCalendar || calendars[0];
    }

    return calendars[0];
  } catch (error) {
    console.error('Failed to get target calendar:', error);
    return null;
  }
}

/**
 * Get stored calendar event IDs
 */
async function getCalendarEventIds(): Promise<CalendarEventIds> {
  try {
    const stored = await AsyncStorage.getItem(CALENDAR_EVENT_IDS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to get calendar event IDs:', error);
    return {};
  }
}

/**
 * Save calendar event IDs
 */
async function saveCalendarEventIds(eventIds: CalendarEventIds): Promise<void> {
  try {
    await AsyncStorage.setItem(CALENDAR_EVENT_IDS_KEY, JSON.stringify(eventIds));
  } catch (error) {
    console.error('Failed to save calendar event IDs:', error);
  }
}

/**
 * Create a calendar event from a task
 */
export async function createCalendarEvent(task: Task): Promise<string | null> {
  try {
    const syncEnabled = await isCalendarSyncEnabled();
    if (!syncEnabled) {
      return null;
    }

    // Only sync scheduled tasks
    if (task.type !== 'scheduled') {
      return null;
    }

    const calendar = await getTargetCalendar();
    if (!calendar) {
      console.warn('No calendar available for syncing');
      return null;
    }

    // Parse task time and duration
    // Use the task's createdAt date to determine which day the event should be on
    const taskDate = new Date(task.createdAt);
    taskDate.setHours(0, 0, 0, 0); // Reset to start of day
    
    const startDate = parseTimeToDate(taskDate, task.time);
    if (!startDate) {
      console.warn('Could not parse task time:', task.time);
      return null;
    }

    const durationMinutes = parseDurationToMinutes(task.duration);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

    // Create calendar event
    const eventId = await CalendarModule.createEventAsync(calendar.id, {
      title: task.title,
      startDate: startDate,
      endDate: endDate,
      notes: `Task from Talk2Task app${task.completed ? ' (Completed)' : ''}`,
      alarms: [{ relativeOffset: -15, method: CalendarModule.AlarmMethod.ALERT }], // 15 min before
    });

    // Store the event ID
    const eventIds = await getCalendarEventIds();
    eventIds[task.id] = eventId;
    await saveCalendarEventIds(eventIds);

    console.log('Calendar event created:', eventId, 'for task:', task.id);
    return eventId;
  } catch (error) {
    console.error('Failed to create calendar event:', error);
    return null;
  }
}

/**
 * Update a calendar event from a task
 */
export async function updateCalendarEvent(task: Task): Promise<void> {
  try {
    const syncEnabled = await isCalendarSyncEnabled();
    if (!syncEnabled) {
      return;
    }

    // Only sync scheduled tasks
    if (task.type !== 'scheduled') {
      return;
    }

    const eventIds = await getCalendarEventIds();
    const eventId = eventIds[task.id];

    if (!eventId) {
      // If no event exists, create one
      await createCalendarEvent(task);
      return;
    }

    const calendar = await getTargetCalendar();
    if (!calendar) {
      return;
    }

    // Parse task time and duration
    // Use the task's createdAt date to determine which day the event should be on
    const taskDate = new Date(task.createdAt);
    taskDate.setHours(0, 0, 0, 0); // Reset to start of day
    
    const startDate = parseTimeToDate(taskDate, task.time);
    if (!startDate) {
      return;
    }

    const durationMinutes = parseDurationToMinutes(task.duration);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

    // Update calendar event
    await CalendarModule.updateEventAsync(eventId, {
      title: task.title,
      startDate: startDate,
      endDate: endDate,
      notes: `Task from Talk2Task app${task.completed ? ' (Completed)' : ''}`,
    });

    console.log('Calendar event updated:', eventId, 'for task:', task.id);
  } catch (error) {
    console.error('Failed to update calendar event:', error);
    // If update fails, try to create a new event
    const eventIds = await getCalendarEventIds();
    delete eventIds[task.id];
    await saveCalendarEventIds(eventIds);
    await createCalendarEvent(task);
  }
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(taskId: string): Promise<void> {
  try {
    const syncEnabled = await isCalendarSyncEnabled();
    if (!syncEnabled) {
      return;
    }

    const eventIds = await getCalendarEventIds();
    const eventId = eventIds[taskId];

    if (!eventId) {
      return;
    }

    try {
      await CalendarModule.deleteEventAsync(eventId);
      console.log('Calendar event deleted:', eventId, 'for task:', taskId);
    } catch (error) {
      // Event might already be deleted, ignore
      console.warn('Failed to delete calendar event (might not exist):', error);
    }

    // Remove from storage
    delete eventIds[taskId];
    await saveCalendarEventIds(eventIds);
  } catch (error) {
    console.error('Failed to delete calendar event:', error);
  }
}

/**
 * Sync all tasks to calendar
 */
export async function syncAllTasksToCalendar(tasks: Task[]): Promise<void> {
  try {
    const syncEnabled = await isCalendarSyncEnabled();
    if (!syncEnabled) {
      return;
    }

    const calendar = await getTargetCalendar();
    if (!calendar) {
      Alert.alert(
        'Calendar Not Available',
        'Could not find a calendar to sync with. Please make sure your calendar is set up correctly.'
      );
      return;
    }

    // Filter only scheduled tasks
    const scheduledTasks = tasks.filter((t) => t.type === 'scheduled');
    
    // Get existing event IDs
    const eventIds = await getCalendarEventIds();
    
    // Create events for tasks that don't have one
    for (const task of scheduledTasks) {
      if (!eventIds[task.id]) {
        await createCalendarEvent(task);
      } else {
        // Update existing events
        await updateCalendarEvent(task);
      }
    }

    // Remove events for tasks that no longer exist
    const existingTaskIds = new Set(scheduledTasks.map((t) => t.id));
    for (const [taskId, eventId] of Object.entries(eventIds)) {
      if (!existingTaskIds.has(taskId)) {
        try {
          await CalendarModule.deleteEventAsync(eventId);
        } catch (error) {
          // Event might already be deleted, ignore
        }
        delete eventIds[taskId];
      }
    }

    await saveCalendarEventIds(eventIds);
    console.log('All tasks synced to calendar');
  } catch (error) {
    console.error('Failed to sync all tasks to calendar:', error);
    Alert.alert('Sync Error', 'Failed to sync tasks with calendar. Please try again.');
  }
}

/**
 * Clear all calendar events (when sync is disabled)
 */
export async function clearAllCalendarEvents(): Promise<void> {
  try {
    const eventIds = await getCalendarEventIds();
    
    for (const [taskId, eventId] of Object.entries(eventIds)) {
      try {
        await CalendarModule.deleteEventAsync(eventId);
      } catch (error) {
        // Event might already be deleted, ignore
        console.warn('Failed to delete calendar event:', error);
      }
    }

    await AsyncStorage.removeItem(CALENDAR_EVENT_IDS_KEY);
    console.log('All calendar events cleared');
  } catch (error) {
    console.error('Failed to clear calendar events:', error);
  }
}
