import Colors from '@/constants/colors';
import { Check, Clock, Edit2, Plus, X, Bell, Calendar, Palette } from 'lucide-react-native';
import { ALERT_OPTIONS, getAlertLabelFromMinutes, requestNotificationPermissions } from '@/utils/notifications';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import EmojiPicker from './EmojiPicker';
import IOSTimePicker from './IOSTimePicker';

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
  { label: '1m', minutes: 1 },
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '45m', minutes: 45 },
  { label: '1h', minutes: 60 },
];



interface EditTaskModalProps {
  visible: boolean;
  editTitle: string;
  setEditTitle: (v: string) => void;
  editIcon: string;
  setEditIcon: (v: string) => void;
  editColor: string;
  setEditColor: (v: string) => void;
  editDescription: string;
  setEditDescription: (v: string) => void;
  editPriority: string;
  setEditPriority: (v: string) => void;
  showPriorityOptions: boolean;
  setShowPriorityOptions: (v: boolean | ((prev: boolean) => boolean)) => void;
  editScheduledDate: number;
  setEditScheduledDate: (v: number) => void;
  editTime: string;
  setEditTime: (v: string) => void;
  editDuration: string;
  setEditDuration: (v: string) => void;
  editAlertMinutes: number;
  setEditAlertMinutes: (v: number) => void;
  editFrequency: string;
  setEditFrequency: (v: string) => void;
  onClose: () => void;
  onSave: () => void;
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
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function EditTaskModal({
  visible,
  editTitle,
  setEditTitle,
  editIcon,
  setEditIcon,
  editColor,
  setEditColor,
  editDescription,
  setEditDescription,
  editPriority,
  setEditPriority,
  showPriorityOptions,
  setShowPriorityOptions,
  editScheduledDate,
  setEditScheduledDate,
  editTime,
  setEditTime,
  editDuration,
  setEditDuration,
  editAlertMinutes,
  setEditAlertMinutes,
  editFrequency,
  setEditFrequency,
  onClose,
  onSave,
}: EditTaskModalProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMonth, setDatePickerMonth] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(1);
  const [pickerHour, setPickerHour] = useState(8);
  const [pickerMinute, setPickerMinute] = useState(0);
  const [pickerPeriod, setPickerPeriod] = useState<'AM' | 'PM'>('AM');
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  const [showAlertPicker, setShowAlertPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 15,
        stiffness: 100,
      }).start();
    } else {
      scaleAnim.setValue(0.95);
    }
  }, [visible, scaleAnim]);

  useEffect(() => {
    if (!visible) {
      setShowEmojiPicker(false);
      setShowDatePicker(false);
      setShowTimePicker(false);
      setShowAlertPicker(false);
    } else {
      setDatePickerMonth(new Date(editScheduledDate));
      if (editTime) {
        const timeParts = editTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (timeParts) {
          const hour = parseInt(timeParts[1], 10);
          const minute = parseInt(timeParts[2], 10);
          const period = timeParts[3].toUpperCase() as 'AM' | 'PM';
          setPickerHour(hour);
          setPickerMinute(minute);
          setPickerPeriod(period);
        }
      }
      if (editDuration) {
        const durationMatch = editDuration.match(/(\d+)/);
        if (durationMatch) {
          const mins = parseInt(durationMatch[1], 10);
          if (editDuration.includes('h')) {
            setSelectedDuration(mins * 60);
          } else {
            setSelectedDuration(mins);
          }
        }
      } else {
        setSelectedDuration(1);
      }
    }
  }, [visible, editScheduledDate, editTime, editDuration]);

  const handleSetToday = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setEditScheduledDate(today.getTime());
  }, [setEditScheduledDate]);

  const handleSetTomorrow = useCallback(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    setEditScheduledDate(tomorrow.getTime());
  }, [setEditScheduledDate]);

  const handleTimeChange = useCallback((hour: number, minute: number, period: 'AM' | 'PM') => {
    setPickerHour(hour);
    setPickerMinute(minute);
    setPickerPeriod(period);
  }, []);

  const formatDurationDisplay = useCallback((mins: number) => {
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
    }
    return `${mins}m`;
  }, []);

  const handleConfirmTime = useCallback(() => {
    const timeStr = `${pickerHour.toString().padStart(2, '0')}:${pickerMinute.toString().padStart(2, '0')} ${pickerPeriod}`;
    setEditTime(timeStr);
    setEditDuration(formatDurationDisplay(selectedDuration));
    setShowTimePicker(false);
  }, [pickerHour, pickerMinute, pickerPeriod, formatDurationDisplay, selectedDuration, setEditTime, setEditDuration]);

  const handleEditIconPress = () => {
    setShowEmojiPicker(true);
  };

  const currentPriority = PRIORITY_OPTIONS.find(p => p.label === editPriority) || PRIORITY_OPTIONS[3];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.editModalContainer}>
        <View style={styles.modalHeader}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalHeaderTitle}>Edit Task</Text>
        </View>

        <ScrollView contentContainerStyle={styles.editModalContent} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.iconSection, { transform: [{ scale: scaleAnim }] }]}>
            <Pressable onPress={handleEditIconPress} style={[styles.editIconCircle, { backgroundColor: editColor || '#F5F5F5' }]}>
              <Text style={styles.editIconEmoji}>{editIcon}</Text>
            </Pressable>
            <Pressable style={styles.editIconButton} onPress={handleEditIconPress}>
              <Edit2 size={14} color="#FFFFFF" />
            </Pressable>
          </Animated.View>

          <View style={styles.titleSection}>
            <TextInput
              style={styles.editTitleInput}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Task title"
              placeholderTextColor={Colors.textSecondary}
            />
            <TextInput
              style={styles.editDescriptionInput}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Add a description..."
              placeholderTextColor="#C7C7CC"
              multiline
            />
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Palette size={18} color={Colors.textSecondary} />
              <Text style={styles.sectionTitle}>Color</Text>
            </View>
            <View style={styles.colorPickerContainer}>
              {AVAILABLE_COLORS.map((color) => {
                const isSelected = editColor === color;
                return (
                  <Pressable
                    key={color}
                    onPress={() => setEditColor(color)}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: color },
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
                  <Text style={[styles.badgeText, { color: currentPriority.color }]}>{editPriority}</Text>
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
                  const isSelected = editPriority === p.label;
                  return (
                    <Pressable
                      key={p.label}
                      onPress={() => setEditPriority(p.label)}
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
                  <Text style={[styles.badgeText, { color: Colors.orangeStart }]}>{formatDateLabel(editScheduledDate)}</Text>
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
                      formatDateLabel(editScheduledDate) === 'Today' && styles.quickDateBtnActive
                    ]}
                    onPress={handleSetToday}
                  >
                    <Text style={[
                      styles.quickDateBtnText,
                      formatDateLabel(editScheduledDate) === 'Today' && styles.quickDateBtnTextActive
                    ]}>Today</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.quickDateBtn,
                      formatDateLabel(editScheduledDate) === 'Tomorrow' && styles.quickDateBtnActive
                    ]}
                    onPress={handleSetTomorrow}
                  >
                    <Text style={[
                      styles.quickDateBtnText,
                      formatDateLabel(editScheduledDate) === 'Tomorrow' && styles.quickDateBtnTextActive
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
                      const isSelected = new Date(editScheduledDate).setHours(0, 0, 0, 0) === dayTimestamp;
                      const isToday = new Date().setHours(0, 0, 0, 0) === dayTimestamp;
                      days.push(
                        <Pressable
                          key={day}
                          style={styles.datePickerDayCell}
                          onPress={() => {
                            setEditScheduledDate(dayTimestamp);
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
                {editTime ? (
                  <View style={styles.timeDisplayRow}>
                    <View style={[styles.badge, { backgroundColor: '#EEF2FF' }]}>
                      <Text style={[styles.badgeText, { color: '#6366F1' }]}>
                        {editTime}, {editDuration}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        setEditTime('');
                        setEditDuration('');
                      }}
                      style={styles.clearTimeBtn}
                    >
                      <X size={14} color={Colors.textSecondary} />
                    </Pressable>
                  </View>
                ) : (
                  <Text style={styles.placeholderText}>Not set</Text>
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
                <IOSTimePicker
                  initialHour={pickerHour}
                  initialMinute={pickerMinute}
                  initialPeriod={pickerPeriod}
                  onTimeChange={handleTimeChange}
                />

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
                {editAlertMinutes >= 0 ? (
                  <View style={styles.timeDisplayRow}>
                    <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
                      <Text style={[styles.badgeText, { color: '#F59E0B' }]}>{getAlertLabelFromMinutes(editAlertMinutes)}</Text>
                    </View>
                    <Pressable onPress={() => setEditAlertMinutes(-1)} style={styles.clearTimeBtn}>
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
                        editAlertMinutes === option.minutes && styles.alertOptionBtnSelected
                      ]}
                      onPress={async () => {
                        const hasPermission = await requestNotificationPermissions();
                        if (hasPermission) {
                          setEditAlertMinutes(option.minutes);
                        }
                      }}
                    >
                      {editAlertMinutes === option.minutes && (
                        <Check size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                      )}
                      <Text style={[
                        styles.alertOptionText,
                        editAlertMinutes === option.minutes && styles.alertOptionTextSelected
                      ]}>{option.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </View>

          <View style={styles.editActions}>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.saveButton} onPress={onSave}>
              <LinearGradient
                colors={[Colors.orangeStart, Colors.peach]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.saveButtonGradient}
              >
                <Check size={18} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </View>

      <EmojiPicker
        visible={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onSelect={(emoji) => {
          setEditIcon(emoji);
          setShowEmojiPicker(false);
        }}
        selectedEmoji={editIcon}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  editModalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#D1D5DB',
    borderRadius: 3,
    marginBottom: 16,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  editModalContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  iconSection: {
    alignItems: 'center',
    marginVertical: 24,
    position: 'relative',
  },
  editIconCircle: {
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
  editIconEmoji: {
    fontSize: 40,
  },
  editIconButton: {
    position: 'absolute',
    right: '35%',
    bottom: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.orangeStart,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },

  titleSection: {
    marginBottom: 20,
  },
  editTitleInput: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  editDescriptionInput: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
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
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  closeButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  saveButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
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
