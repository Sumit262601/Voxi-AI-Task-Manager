import Colors from '@/constants/colors';
import { Check, Clock, Plus, X, Bell, Calendar, Palette, ListChecks, CalendarClock } from 'lucide-react-native';
import { ALERT_OPTIONS, getAlertLabelFromMinutes, requestNotificationPermissions } from '@/utils/notifications';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import EmojiPicker from './EmojiPicker';

const AVAILABLE_COLORS = [
  '#d6d6d6',
  '#AFE271',
  '#B7B7F7',
  '#F28B87',
  '#FCDE8A',
  '#FF9052',
];

const PRIORITY_OPTIONS = [
  { label: 'Urgent', color: '#EF4444', bgColor: '#FEF2F2' },
  { label: 'High', color: '#F59E0B', bgColor: '#FFFBEB' },
  { label: 'Medium', color: '#8B5CF6', bgColor: '#F5F3FF' },
  { label: 'Regular', color: '#3B82F6', bgColor: '#EFF6FF' },
  { label: 'None', color: '#10B981', bgColor: '#ECFDF5' },
];

const DURATION_OPTIONS = [
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '45m', minutes: 45 },
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
];

const generateTimeSlots = () => {
  const slots: { time: string; hour: number; minute: number; period: 'AM' | 'PM' }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const period = h < 12 ? 'AM' : 'PM';
      const timeStr = `${hour12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
      slots.push({ time: timeStr, hour: h, minute: m, period });
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();


interface AddTaskModalProps {
  visible: boolean;
  selectedDate: Date;
  onClose: () => void;
  onSave: (task: {
    title: string;
    icon: string;
    color: string;
    type: 'scheduled' | 'checklist';
    time: string;
    duration: string;
    priority: string;
    priorityColor: string;
    scheduledDate: number;
    alertMinutes: number;
  }) => void;
}

const formatDateLabel = (timestamp: number): string => {
  const date = new Date(timestamp);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const taskDate = new Date(timestamp);
  taskDate.setHours(0, 0, 0, 0);

  if (taskDate.getTime() === today.getTime()) return 'Today';
  if (taskDate.getTime() === tomorrow.getTime()) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const PRIORITY_COLORS: Record<string, string> = {
  'Urgent': '#EF4444',
  'High': '#F59E0B',
  'Medium': '#8B5CF6',
  'Regular': '#3B82F6',
  'None': '#10B981',
};

export default function AddTaskModal({
  visible,
  selectedDate,
  onClose,
  onSave,
}: AddTaskModalProps) {
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('📋');
  const [color, setColor] = useState('#F5F5F5');
  const [taskType, setTaskType] = useState<'scheduled' | 'checklist'>('checklist');
  const [priority, setPriority] = useState('Regular');
  const [showPriorityOptions, setShowPriorityOptions] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(selectedDate.getTime());
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('');
  const [alertMinutes, setAlertMinutes] = useState(-1);
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMonth, setDatePickerMonth] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [selectedTimeIndex, setSelectedTimeIndex] = useState(32);
  const [showAlertPicker, setShowAlertPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const timeScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      setTitle('');
      setIcon('📋');
      setColor('#F5F5F5');
      setTaskType('checklist');
      setPriority('Regular');
      setShowPriorityOptions(false);
      setScheduledDate(selectedDate.getTime());
      setTime('');
      setDuration('');
      setAlertMinutes(-1);
      setShowDatePicker(false);
      setShowTimePicker(false);
      setShowAlertPicker(false);
      setShowEmojiPicker(false);
      setSelectedDuration(30);
      setSelectedTimeIndex(32);
      setDatePickerMonth(selectedDate);
      
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 15,
        stiffness: 100,
      }).start();
    } else {
      scaleAnim.setValue(0.95);
    }
  }, [visible, selectedDate, scaleAnim]);

  const handleSetToday = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setScheduledDate(today.getTime());
  }, []);

  const handleSetTomorrow = useCallback(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    setScheduledDate(tomorrow.getTime());
  }, []);

  const calculateEndTime = useCallback((startIndex: number, durationMins: number) => {
    const slot = TIME_SLOTS[startIndex];
    if (!slot) return '';

    let totalMinutes = slot.hour * 60 + slot.minute + durationMins;
    totalMinutes = totalMinutes % (24 * 60);
    const endHour = Math.floor(totalMinutes / 60);
    const endMinute = totalMinutes % 60;

    const hour12 = endHour === 0 ? 12 : endHour > 12 ? endHour - 12 : endHour;
    const period = endHour < 12 ? 'AM' : 'PM';
    return `${hour12.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')} ${period}`;
  }, []);

  const scrollToSelectedTime = useCallback(() => {
    setTimeout(() => {
      timeScrollRef.current?.scrollTo({ y: selectedTimeIndex * 44 - 88, animated: false });
    }, 100);
  }, [selectedTimeIndex]);

  useEffect(() => {
    if (showTimePicker) {
      scrollToSelectedTime();
    }
  }, [showTimePicker, scrollToSelectedTime]);

  const formatDurationDisplay = useCallback((mins: number) => {
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
    }
    return `${mins}m`;
  }, []);

  const handleConfirmTime = useCallback(() => {
    const slot = TIME_SLOTS[selectedTimeIndex];
    if (slot) {
      setTime(slot.time);
      setDuration(formatDurationDisplay(selectedDuration));
      setTaskType('scheduled');
    }
    setShowTimePicker(false);
  }, [selectedTimeIndex, formatDurationDisplay, selectedDuration]);

  const handleSave = () => {
    if (!title.trim()) return;
    
    onSave({
      title: title.trim(),
      icon,
      color,
      type: taskType,
      time,
      duration,
      priority,
      priorityColor: PRIORITY_COLORS[priority] || '#3B82F6',
      scheduledDate,
      alertMinutes,
    });
    onClose();
  };

  const currentPriority = PRIORITY_OPTIONS.find(p => p.label === priority) || PRIORITY_OPTIONS[3];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerHandle} />
          <Text style={styles.headerTitle}>New Task</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.iconSection, { transform: [{ scale: scaleAnim }] }]}>
            <Pressable 
              onPress={() => setShowEmojiPicker(true)} 
              style={[styles.iconCircle, { backgroundColor: color }]}
            >
              <Text style={styles.iconEmoji}>{icon}</Text>
            </Pressable>
          </Animated.View>

          <View style={styles.titleSection}>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="What needs to be done?"
              placeholderTextColor={Colors.textSecondary}
              autoFocus
            />
          </View>

          <View style={styles.taskTypeSection}>
            <Pressable
              style={[styles.taskTypeBtn, taskType === 'checklist' && styles.taskTypeBtnActive]}
              onPress={() => {
                setTaskType('checklist');
                setTime('');
                setDuration('');
              }}
            >
              <ListChecks size={18} color={taskType === 'checklist' ? '#FFFFFF' : Colors.textSecondary} />
              <Text style={[styles.taskTypeBtnText, taskType === 'checklist' && styles.taskTypeBtnTextActive]}>
                Checklist
              </Text>
            </Pressable>
            <Pressable
              style={[styles.taskTypeBtn, taskType === 'scheduled' && styles.taskTypeBtnActive]}
              onPress={() => setTaskType('scheduled')}
            >
              <CalendarClock size={18} color={taskType === 'scheduled' ? '#FFFFFF' : Colors.textSecondary} />
              <Text style={[styles.taskTypeBtnText, taskType === 'scheduled' && styles.taskTypeBtnTextActive]}>
                Scheduled
              </Text>
            </Pressable>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Palette size={18} color={Colors.textSecondary} />
              <Text style={styles.sectionTitle}>Color</Text>
            </View>
            <View style={styles.colorPickerContainer}>
              {AVAILABLE_COLORS.map((c) => {
                const isSelected = color === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setColor(c)}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: c },
                      isSelected && styles.colorCircleSelected,
                    ]}
                  >
                    {isSelected && <Check size={16} color={Colors.text} />}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Pressable 
              style={styles.sectionRow}
              onPress={() => setShowPriorityOptions((v) => !v)}
            >
              <View style={styles.sectionLeft}>
                <View style={[styles.sectionIconBg, { backgroundColor: currentPriority.bgColor }]}>
                  <View style={[styles.priorityDot, { backgroundColor: currentPriority.color }]} />
                </View>
                <Text style={styles.sectionTitle}>Priority</Text>
              </View>
              <View style={styles.sectionRight}>
                <View style={[styles.badge, { backgroundColor: currentPriority.bgColor }]}>
                  <Text style={[styles.badgeText, { color: currentPriority.color }]}>{priority}</Text>
                </View>
                <View style={[styles.addButton, showPriorityOptions && styles.addButtonActive]}>
                  {showPriorityOptions ? (
                    <X size={16} color="#FFFFFF" />
                  ) : (
                    <Plus size={16} color="#FFFFFF" />
                  )}
                </View>
              </View>
            </Pressable>

            {showPriorityOptions && (
              <View style={styles.optionsContainer}>
                {PRIORITY_OPTIONS.map((p) => {
                  const isSelected = priority === p.label;
                  return (
                    <Pressable
                      key={p.label}
                      onPress={() => setPriority(p.label)}
                      style={[
                        styles.priorityOptionBtn,
                        { backgroundColor: p.bgColor },
                        isSelected && { borderColor: p.color, borderWidth: 2 },
                      ]}
                    >
                      {isSelected && (
                        <Check size={12} color={p.color} style={{ marginRight: 4 }} />
                      )}
                      <Text style={[styles.priorityOptionText, { color: p.color }]}>{p.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.sectionCard}>
            <Pressable 
              style={styles.sectionRow}
              onPress={() => setShowDatePicker(!showDatePicker)}
            >
              <View style={styles.sectionLeft}>
                <View style={[styles.sectionIconBg, { backgroundColor: '#FFF5EE' }]}>
                  <Calendar size={16} color={Colors.orangeStart} />
                </View>
                <Text style={styles.sectionTitle}>Date</Text>
              </View>
              <View style={styles.sectionRight}>
                <View style={[styles.badge, { backgroundColor: '#FFF5EE' }]}>
                  <Text style={[styles.badgeText, { color: Colors.orangeStart }]}>{formatDateLabel(scheduledDate)}</Text>
                </View>
                <View style={[styles.addButton, showDatePicker && styles.addButtonActive]}>
                  {showDatePicker ? (
                    <X size={16} color="#FFFFFF" />
                  ) : (
                    <Plus size={16} color="#FFFFFF" />
                  )}
                </View>
              </View>
            </Pressable>

            {showDatePicker && (
              <View style={styles.datePickerContainer}>
                <View style={styles.quickDateButtons}>
                  <Pressable
                    style={[
                      styles.quickDateBtn,
                      formatDateLabel(scheduledDate) === 'Today' && styles.quickDateBtnActive
                    ]}
                    onPress={handleSetToday}
                  >
                    <Text style={[
                      styles.quickDateBtnText,
                      formatDateLabel(scheduledDate) === 'Today' && styles.quickDateBtnTextActive
                    ]}>Today</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.quickDateBtn,
                      formatDateLabel(scheduledDate) === 'Tomorrow' && styles.quickDateBtnActive
                    ]}
                    onPress={handleSetTomorrow}
                  >
                    <Text style={[
                      styles.quickDateBtnText,
                      formatDateLabel(scheduledDate) === 'Tomorrow' && styles.quickDateBtnTextActive
                    ]}>Tomorrow</Text>
                  </Pressable>
                </View>
                <View style={styles.datePickerHeader}>
                  <Pressable onPress={() => {
                    const newDate = new Date(datePickerMonth);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setDatePickerMonth(newDate);
                  }} style={styles.dateNavBtn}>
                    <Text style={styles.datePickerArrow}>‹</Text>
                  </Pressable>
                  <Text style={styles.datePickerMonthText}>
                    {datePickerMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </Text>
                  <Pressable onPress={() => {
                    const newDate = new Date(datePickerMonth);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setDatePickerMonth(newDate);
                  }} style={styles.dateNavBtn}>
                    <Text style={styles.datePickerArrow}>›</Text>
                  </Pressable>
                </View>
                <View style={styles.datePickerDaysHeader}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <Text key={`${day}-${i}`} style={styles.datePickerDayLabel}>{day}</Text>
                  ))}
                </View>
                <View style={styles.datePickerDays}>
                  {(() => {
                    const year = datePickerMonth.getFullYear();
                    const month = datePickerMonth.getMonth();
                    const firstDay = new Date(year, month, 1).getDay();
                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                    const days = [];
                    for (let i = 0; i < firstDay; i++) {
                      days.push(<View key={`empty-${i}`} style={styles.datePickerDayCell} />);
                    }
                    for (let day = 1; day <= daysInMonth; day++) {
                      const dayTimestamp = new Date(year, month, day).setHours(0, 0, 0, 0);
                      const isSelected = new Date(scheduledDate).setHours(0, 0, 0, 0) === dayTimestamp;
                      const isToday = new Date().setHours(0, 0, 0, 0) === dayTimestamp;
                      days.push(
                        <Pressable
                          key={day}
                          style={styles.datePickerDayCell}
                          onPress={() => {
                            setScheduledDate(dayTimestamp);
                          }}
                        >
                          <View style={[
                            styles.datePickerDayInner,
                            isSelected && styles.datePickerDaySelected,
                            isToday && !isSelected && styles.datePickerDayToday,
                          ]}>
                            <Text style={[
                              styles.datePickerDayText,
                              isSelected && styles.datePickerDayTextSelected,
                              isToday && !isSelected && styles.datePickerDayTextToday,
                            ]}>{day}</Text>
                          </View>
                        </Pressable>
                      );
                    }
                    return days;
                  })()}
                </View>
              </View>
            )}
          </View>

          {taskType === 'scheduled' && (
            <View style={styles.sectionCard}>
              <Pressable 
                style={styles.sectionRow}
                onPress={() => setShowTimePicker(!showTimePicker)}
              >
                <View style={styles.sectionLeft}>
                  <View style={[styles.sectionIconBg, { backgroundColor: '#EEF2FF' }]}>
                    <Clock size={16} color="#6366F1" />
                  </View>
                  <Text style={styles.sectionTitle}>Time</Text>
                </View>
                <View style={styles.sectionRight}>
                  {time ? (
                    <View style={styles.timeDisplayRow}>
                      <View style={[styles.badge, { backgroundColor: '#EEF2FF' }]}>
                        <Text style={[styles.badgeText, { color: '#6366F1' }]}>
                          {time}, {duration}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => {
                          setTime('');
                          setDuration('');
                        }}
                        style={styles.clearTimeBtn}
                      >
                        <X size={14} color={Colors.textSecondary} />
                      </Pressable>
                    </View>
                  ) : (
                    <Text style={styles.placeholderText}>Set time</Text>
                  )}
                  <View style={[styles.addButton, showTimePicker && styles.addButtonActive]}>
                    {showTimePicker ? (
                      <X size={16} color="#FFFFFF" />
                    ) : (
                      <Plus size={16} color="#FFFFFF" />
                    )}
                  </View>
                </View>
              </Pressable>

              {showTimePicker && (
                <View style={styles.timePickerContainer}>
                  <View style={styles.timeListContainer}>
                    <ScrollView
                      ref={timeScrollRef}
                      style={styles.timeListScroll}
                      showsVerticalScrollIndicator={false}
                      snapToInterval={44}
                      decelerationRate="fast"
                      contentContainerStyle={styles.timeListContent}
                    >
                      <View style={styles.timeListSpacer} />
                      {TIME_SLOTS.map((slot, index) => {
                        const isSelected = selectedTimeIndex === index;
                        const endTime = calculateEndTime(index, selectedDuration);
                        return (
                          <Pressable
                            key={slot.time}
                            style={[
                              styles.timeSlotItem,
                              isSelected && styles.timeSlotItemSelected,
                            ]}
                            onPress={() => setSelectedTimeIndex(index)}
                          >
                            <Text style={[
                              styles.timeSlotText,
                              isSelected && styles.timeSlotTextSelected,
                            ]}>
                              {isSelected ? `${slot.time} - ${endTime}` : slot.time}
                            </Text>
                          </Pressable>
                        );
                      })}
                      <View style={styles.timeListSpacer} />
                    </ScrollView>
                    <View style={styles.timeSelectionIndicator} pointerEvents="none" />
                  </View>

                  <Text style={styles.durationLabel}>Duration</Text>
                  <View style={styles.durationOptions}>
                    {DURATION_OPTIONS.map((option) => (
                      <Pressable
                        key={option.label}
                        style={[
                          styles.durationBtn,
                          selectedDuration === option.minutes && styles.durationBtnSelected
                        ]}
                        onPress={() => setSelectedDuration(option.minutes)}
                      >
                        <Text style={[
                          styles.durationBtnText,
                          selectedDuration === option.minutes && styles.durationBtnTextSelected
                        ]}>{option.label}</Text>
                      </Pressable>
                    ))}
                  </View>

                  <Pressable style={styles.timeConfirmBtn} onPress={handleConfirmTime}>
                    <Text style={styles.timeConfirmBtnText}>Set Time</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

          <View style={styles.sectionCard}>
            <Pressable 
              style={styles.sectionRow}
              onPress={() => setShowAlertPicker(!showAlertPicker)}
            >
              <View style={styles.sectionLeft}>
                <View style={[styles.sectionIconBg, { backgroundColor: '#FEF3C7' }]}>
                  <Bell size={16} color="#F59E0B" />
                </View>
                <Text style={styles.sectionTitle}>Reminder</Text>
              </View>
              <View style={styles.sectionRight}>
                {alertMinutes >= 0 ? (
                  <View style={styles.timeDisplayRow}>
                    <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
                      <Text style={[styles.badgeText, { color: '#F59E0B' }]}>{getAlertLabelFromMinutes(alertMinutes)}</Text>
                    </View>
                    <Pressable onPress={() => setAlertMinutes(-1)} style={styles.clearTimeBtn}>
                      <X size={14} color={Colors.textSecondary} />
                    </Pressable>
                  </View>
                ) : (
                  <Text style={styles.placeholderText}>Not set</Text>
                )}
                <View style={[styles.addButton, showAlertPicker && styles.addButtonActive]}>
                  {showAlertPicker ? (
                    <X size={16} color="#FFFFFF" />
                  ) : (
                    <Plus size={16} color="#FFFFFF" />
                  )}
                </View>
              </View>
            </Pressable>

            {showAlertPicker && (
              <View style={styles.alertPickerContainer}>
                <Text style={styles.alertSubtitle}>Get notified before your task starts</Text>
                <View style={styles.alertOptionsGrid}>
                  {ALERT_OPTIONS.filter(o => o.minutes >= 0).map((option) => (
                    <Pressable
                      key={option.label}
                      style={[
                        styles.alertOptionBtn,
                        alertMinutes === option.minutes && styles.alertOptionBtnSelected
                      ]}
                      onPress={async () => {
                        const hasPermission = await requestNotificationPermissions();
                        if (hasPermission) {
                          setAlertMinutes(option.minutes);
                        }
                      }}
                    >
                      {alertMinutes === option.minutes && (
                        <Check size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                      )}
                      <Text style={[
                        styles.alertOptionText,
                        alertMinutes === option.minutes && styles.alertOptionTextSelected
                      ]}>{option.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable 
              style={[styles.saveButton, !title.trim() && styles.saveButtonDisabled]} 
              onPress={handleSave}
              disabled={!title.trim()}
            >
              <LinearGradient
                colors={title.trim() ? [Colors.orangeStart, Colors.peach] : ['#E5E5EA', '#D1D1D6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.saveButtonGradient}
              >
                <Plus size={18} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Add Task</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </View>

      <EmojiPicker
        visible={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onSelect={(emoji) => {
          setIcon(emoji);
          setShowEmojiPicker(false);
        }}
        selectedEmoji={icon}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#D1D5DB',
    borderRadius: 3,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  iconSection: {
    alignItems: 'center',
    marginVertical: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  iconEmoji: {
    fontSize: 40,
  },

  titleSection: {
    marginBottom: 20,
  },
  titleInput: {
    fontSize: 22,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  taskTypeSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  taskTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  taskTypeBtnActive: {
    backgroundColor: Colors.orangeStart,
  },
  taskTypeBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  taskTypeBtnTextActive: {
    color: '#FFFFFF',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    paddingBottom: 12,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  sectionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  addButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: Colors.orangeStart,
  },
  addButtonActive: {
    backgroundColor: Colors.textSecondary,
  },
  colorPickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  colorCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorCircleSelected: {
    borderColor: Colors.orangeStart,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 16,
    paddingTop: 0,
  },
  priorityOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  priorityOptionText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  datePickerContainer: {
    padding: 16,
    paddingTop: 0,
  },
  quickDateButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  quickDateBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  quickDateBtnActive: {
    backgroundColor: Colors.orangeStart,
  },
  quickDateBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  quickDateBtnTextActive: {
    color: '#FFFFFF',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerArrow: {
    fontSize: 24,
    color: Colors.orangeStart,
    fontWeight: '300' as const,
  },
  datePickerMonthText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  datePickerDaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  datePickerDayLabel: {
    width: 36,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  datePickerDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  datePickerDayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  datePickerDayInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerDaySelected: {
    backgroundColor: Colors.orangeStart,
  },
  datePickerDayToday: {
    borderWidth: 2,
    borderColor: Colors.orangeStart,
  },
  datePickerDayText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  datePickerDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700' as const,
  },
  datePickerDayTextToday: {
    color: Colors.orangeStart,
    fontWeight: '700' as const,
  },
  timeDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clearTimeBtn: {
    padding: 4,
  },
  placeholderText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  timePickerContainer: {
    padding: 16,
    paddingTop: 0,
  },
  timeListContainer: {
    height: 220,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
    position: 'relative',
  },
  timeListScroll: {
    flex: 1,
  },
  timeListContent: {
    alignItems: 'center',
  },
  timeListSpacer: {
    height: 88,
  },
  timeSlotItem: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  timeSlotItemSelected: {
    backgroundColor: 'rgba(255,144,82,0.15)',
    borderRadius: 10,
    marginHorizontal: 8,
  },
  timeSlotText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '400' as const,
  },
  timeSlotTextSelected: {
    color: Colors.orangeStart,
    fontWeight: '700' as const,
    fontSize: 18,
  },
  timeSelectionIndicator: {
    position: 'absolute',
    top: '50%',
    left: 16,
    right: 16,
    height: 44,
    marginTop: -22,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.orangeStart,
    borderStyle: 'dashed',
  },
  durationLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginTop: 16,
    marginBottom: 10,
  },
  durationOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  durationBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  durationBtnSelected: {
    backgroundColor: Colors.orangeStart,
  },
  durationBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  durationBtnTextSelected: {
    color: '#FFFFFF',
  },
  timeConfirmBtn: {
    marginTop: 16,
    backgroundColor: Colors.orangeStart,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  timeConfirmBtnText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  alertPickerContainer: {
    padding: 16,
    paddingTop: 0,
  },
  alertSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  alertOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  alertOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
  },
  alertOptionBtnSelected: {
    backgroundColor: Colors.orangeStart,
  },
  alertOptionText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  alertOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  saveButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
