import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState, useCallback } from 'react';
import Colors from '@/constants/colors';
import { useAuth } from './auth';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/utils/calendarSync';
import { scheduleTaskNotification, cancelTaskNotification, showInstantNotification, scheduleTaskNotificationAuto, saveNotificationToHistory } from '@/utils/notifications';
import { supabase, TaskRecord } from '@/utils/supabase';

export interface Task {
  id: string;
  icon: string;
  title: string;
  time: string;
  duration: string;
  color: string;
  borderColor: string;
  completed: boolean;
  completedAt?: number;
  type: 'scheduled' | 'checklist';
  priority: string;
  priorityColor: string;
  createdAt: number;
  scheduledDate: number;
  userId: string;
  alertMinutes?: number;
}

interface TasksState {
  tasks: Task[];
  isLoading: boolean;
  addTask: (task: Omit<Task, 'id' | 'completed' | 'createdAt' | 'userId'>) => void;
  updateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'createdAt' | 'userId'>>) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
}

const DEFAULT_COLORS = [
  { color: Colors.purple, borderColor: Colors.purple },
  { color: Colors.green, borderColor: Colors.green },
  { color: Colors.coral, borderColor: Colors.coral },
  { color: Colors.yellow, borderColor: Colors.yellow },
  { color: Colors.peach, borderColor: Colors.peach },
  { color: Colors.gray, borderColor: Colors.gray },
];

const taskRecordToTask = (record: TaskRecord): Task => ({
  id: record.id,
  icon: record.icon || '📝',
  title: record.title,
  time: record.time || '',
  duration: record.duration || '',
  color: record.color || Colors.purple,
  borderColor: record.border_color || Colors.purple,
  completed: record.completed,
  completedAt: record.completed_at ? new Date(record.completed_at).getTime() : undefined,
  type: (record.type as 'scheduled' | 'checklist') || 'scheduled',
  priority: record.priority || 'Regular',
  priorityColor: record.priority_color || Colors.blue,
  createdAt: new Date(record.created_at).getTime(),
  scheduledDate: new Date(record.scheduled_date).getTime(),
  userId: record.user_id,
  alertMinutes: record.alert_minutes ?? undefined,
});

const taskToRecord = (task: Task): Omit<TaskRecord, 'created_at' | 'updated_at'> => ({
  id: task.id,
  user_id: task.userId,
  title: task.title,
  icon: task.icon,
  time: task.time,
  duration: task.duration,
  color: task.color,
  border_color: task.borderColor,
  completed: task.completed,
  completed_at: task.completedAt ? new Date(task.completedAt).toISOString() : null,
  type: task.type,
  priority: task.priority,
  priority_color: task.priorityColor,
  scheduled_date: new Date(task.scheduledDate).toISOString(),
  alert_minutes: task.alertMinutes ?? null,
});

export const [TasksProvider, useTasks] = createContextHook((): TasksState => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    console.log('Loading tasks from Supabase for user:', user.id);

    try {
      if (!supabase) {
        console.warn('Supabase not configured');
        setTasks([]);
        setIsLoading(false);
        return;
      }

      const db = supabase;
      const { data, error } = await db
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load tasks from Supabase:', error);
        setTasks([]);
      } else if (data) {
        const loadedTasks = (data as TaskRecord[]).map(taskRecordToTask);
        setTasks(loadedTasks);
        console.log('Tasks loaded from Supabase:', loadedTasks.length);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const addTask = useCallback(async (taskInput: Omit<Task, 'id' | 'completed' | 'createdAt' | 'userId'>) => {
    if (!user) return;

    const colorIndex = tasks.length % DEFAULT_COLORS.length;
    const colors = DEFAULT_COLORS[colorIndex];

    const scheduledTimestamp = taskInput.scheduledDate || new Date().setHours(0, 0, 0, 0);
    const createdAt = Date.now();

    const newTask: Task = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      icon: taskInput.icon,
      title: taskInput.title,
      time: taskInput.time,
      duration: taskInput.duration,
      color: taskInput.color || colors.color,
      borderColor: taskInput.borderColor || colors.borderColor,
      type: taskInput.type,
      priority: taskInput.priority || 'Regular',
      priorityColor: taskInput.priorityColor || Colors.blue,
      completed: false,
      createdAt,
      scheduledDate: scheduledTimestamp,
      userId: user.id,
      alertMinutes: taskInput.alertMinutes,
    };

    setTasks(prev => [newTask, ...prev]);

    try {
      if (!supabase) {
        console.warn('Supabase not configured');
        return;
      }

      const db = supabase;
      const record = taskToRecord(newTask);
      const { error } = await db
        .from('tasks')
        .insert({
          ...record,
          created_at: new Date(createdAt).toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Failed to add task to Supabase:', error);
        setTasks(prev => prev.filter(t => t.id !== newTask.id));
        return;
      }

      console.log('Task added to Supabase:', newTask.title);

      if (newTask.type === 'scheduled') {
        await createCalendarEvent(newTask);
      }

      await showInstantNotification(
        '✅ Task Created',
        `"${newTask.title}" has been added to your tasks.`,
        { taskId: newTask.id }
      );

      if (newTask.time) {
        await scheduleTaskNotificationAuto(
          newTask.id,
          newTask.title,
          newTask.scheduledDate,
          newTask.time,
          taskInput.alertMinutes
        );
      }
    } catch (err) {
      console.error('Failed to add task:', err);
      setTasks(prev => prev.filter(t => t.id !== newTask.id));
    }
  }, [user, tasks]);

  const toggleTask = useCallback(async (id: string) => {
    if (!user) return;

    const existing = tasks.find((t) => t.id === id);
    if (!existing) return;

    const completed = !existing.completed;
    const completedAt = completed ? Date.now() : undefined;

    setTasks(prev => prev.map((task) =>
      task.id === id ? { ...task, completed, completedAt } : task
    ));

    try {
      if (!supabase) {
        console.warn('Supabase not configured');
        return;
      }

      const db = supabase;
      const { error } = await db
        .from('tasks')
        .update({
          completed,
          completed_at: completedAt ? new Date(completedAt).toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to toggle task in Supabase:', error);
        setTasks(prev => prev.map((task) =>
          task.id === id ? existing : task
        ));
        return;
      }

      console.log('Task toggled in Supabase:', id, 'completed:', completed);

      const updatedTask = { ...existing, completed, completedAt };
      if (updatedTask.type === 'scheduled') {
        await updateCalendarEvent(updatedTask);
      }
      if (completed) {
        await saveNotificationToHistory({
          title: 'Task Completed',
          message: `Great job! You completed "${existing.title}"`,
          type: 'completed',
        });
      }
    } catch (err) {
      console.error('Failed to toggle task:', err);
      setTasks(prev => prev.map((task) =>
        task.id === id ? existing : task
      ));
    }
  }, [user, tasks]);

  const updateTask = useCallback(async (id: string, updates: Partial<Omit<Task, 'id' | 'createdAt' | 'userId'>>) => {
    if (!user) return;

    const existing = tasks.find((t) => t.id === id);
    if (!existing) return;

    const updatedTask: Task = { ...existing, ...updates };

    setTasks(prev => prev.map((task) =>
      task.id === id ? updatedTask : task
    ));

    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.icon !== undefined) updateData.icon = updates.icon;
      if (updates.time !== undefined) updateData.time = updates.time;
      if (updates.duration !== undefined) updateData.duration = updates.duration;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.borderColor !== undefined) updateData.border_color = updates.borderColor;
      if (updates.completed !== undefined) updateData.completed = updates.completed;
      if (updates.completedAt !== undefined) updateData.completed_at = updates.completedAt ? new Date(updates.completedAt).toISOString() : null;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.priority !== undefined) updateData.priority = updates.priority;
      if (updates.priorityColor !== undefined) updateData.priority_color = updates.priorityColor;
      if (updates.scheduledDate !== undefined) updateData.scheduled_date = new Date(updates.scheduledDate).toISOString();
      if (updates.alertMinutes !== undefined) updateData.alert_minutes = updates.alertMinutes;

      if (!supabase) {
        console.warn('Supabase not configured');
        return;
      }

      const db = supabase;
      const { error } = await db
        .from('tasks')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to update task in Supabase:', error);
        setTasks(prev => prev.map((task) =>
          task.id === id ? existing : task
        ));
        return;
      }

      console.log('Task updated in Supabase:', id);

      if (updatedTask.type === 'scheduled') {
        await updateCalendarEvent(updatedTask);
      }
      if (updates.completed === true) {
        await saveNotificationToHistory({
          title: 'Task Completed',
          message: `Great job! You completed "${existing.title}"`,
          type: 'completed',
        });
      }

      if (updates.alertMinutes !== undefined && updates.alertMinutes >= 0) {
        await scheduleTaskNotification(
          updatedTask.id,
          updatedTask.title,
          updatedTask.scheduledDate,
          updatedTask.time,
          updates.alertMinutes
        );
      } else if (updates.alertMinutes === -1) {
        await cancelTaskNotification(id);
      }
    } catch (err) {
      console.error('Failed to update task:', err);
      setTasks(prev => prev.map((task) =>
        task.id === id ? existing : task
      ));
    }
  }, [user, tasks]);

  const deleteTask = useCallback(async (id: string) => {
    if (!user) return;

    const existing = tasks.find((t) => t.id === id);
    if (!existing) return;

    setTasks(prev => prev.filter((task) => task.id !== id));

    try {
      if (!supabase) {
        console.warn('Supabase not configured');
        return;
      }

      const db = supabase;
      const { error } = await db
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to delete task from Supabase:', error);
        setTasks(prev => [existing, ...prev]);
        return;
      }

      console.log('Task deleted from Supabase:', id);

      await deleteCalendarEvent(id);
      await cancelTaskNotification(id);
    } catch (err) {
      console.error('Failed to delete task:', err);
      setTasks(prev => [existing, ...prev]);
    }
  }, [user, tasks]);

  return {
    tasks,
    isLoading,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
  };
});
