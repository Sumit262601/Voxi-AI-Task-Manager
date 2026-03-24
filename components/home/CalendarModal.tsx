import Colors from '@/constants/colors';
import { getDaysInMonth } from '@/utils/dateUtils';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface CalendarModalProps {
  visible: boolean;
  calendarMonth: Date;
  selectedDate: Date;
  onClose: () => void;
  onSelectDate: (day: number) => void;
  onMonthChange: (direction: number) => void;
}

export default function CalendarModal({
  visible,
  calendarMonth,
  selectedDate,
  onClose,
  onSelectDate,
  onMonthChange,
}: CalendarModalProps) {
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 90,
          mass: 0.8,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 18,
          stiffness: 80,
        }),
      ]).start(() => {
        Animated.timing(headerAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    } else {
      headerAnim.setValue(0);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: Dimensions.get('window').height,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, scaleAnim, backdropOpacity, headerAnim]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.backdrop,
            { opacity: backdropOpacity },
          ]}
        />
        <Animated.View
          style={[
            styles.calendarModalContainer,
            { 
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ] 
            },
          ]}
        >
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.modalContent}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.headerLeft}>
                <View style={styles.headerIconContainer}>
                  <Calendar size={20} color={Colors.orangeStart} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Calendar</Text>
                  <Text style={styles.modalSubtitle}>Select a date</Text>
                </View>
              </View>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <X size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.calendarContent}>
              <View style={styles.monthNavigation}>
                <Pressable onPress={() => onMonthChange(-1)} style={styles.navButton}>
                  <ChevronLeft size={22} color={Colors.orangeStart} />
                </Pressable>
                <Text style={styles.calendarMonthYear}>
                  {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </Text>
                <Pressable onPress={() => onMonthChange(1)} style={styles.navButton}>
                  <ChevronRight size={22} color={Colors.orangeStart} />
                </Pressable>
              </View>

              <View style={styles.calendarGrid}>
                <View style={styles.calendarWeekDays}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <View key={`${day}-${i}`} style={styles.weekDayCell}>
                      <Text style={[
                        styles.calendarWeekDay,
                        (i === 0 || i === 6) && styles.weekendDay
                      ]}>
                        {day}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={styles.calendarDaysGrid}>
                  {getDaysInMonth(calendarMonth).map((day, index) => {
                    const isSelected =
                      day !== null &&
                      selectedDate.getDate() === day &&
                      selectedDate.getMonth() === calendarMonth.getMonth() &&
                      selectedDate.getFullYear() === calendarMonth.getFullYear();
                    
                    const dayDate = day !== null 
                      ? new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day)
                      : null;
                    dayDate?.setHours(0, 0, 0, 0);
                    
                    const isToday = dayDate?.getTime() === today.getTime();
                    const isWeekend = index % 7 === 0 || index % 7 === 6;

                    return (
                      <Pressable
                        key={index}
                        style={styles.calendarDay}
                        onPress={() => day !== null && onSelectDate(day)}
                        disabled={!day}
                      >
                        {day !== null && (
                          <View
                            style={[
                              styles.calendarDayCircle,
                              isSelected && styles.calendarDaySelected,
                              isToday && !isSelected && styles.calendarDayToday,
                            ]}
                          >
                            <Text
                              style={[
                                styles.calendarDayText,
                                isSelected && styles.calendarDayTextSelected,
                                isToday && !isSelected && styles.calendarDayTextToday,
                                isWeekend && !isSelected && !isToday && styles.weekendDayText,
                              ]}
                            >
                              {day}
                            </Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.legendContainer}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Colors.orangeStart }]} />
                  <Text style={styles.legendText}>Selected</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { borderWidth: 2, borderColor: Colors.orangeStart, backgroundColor: 'transparent' }]} />
                  <Text style={styles.legendText}>Today</Text>
                </View>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  calendarModalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  modalContent: {
    paddingBottom: 32,
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#D1D5DB',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFF5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarContent: {
    padding: 20,
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonthYear: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  calendarGrid: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  calendarWeekDays: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
  },
  calendarWeekDay: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  weekendDay: {
    color: Colors.orangeStart,
  },
  calendarDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  calendarDayCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDaySelected: {
    backgroundColor: Colors.orangeStart,
    shadowColor: Colors.orangeStart,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: Colors.orangeStart,
    backgroundColor: '#FFF5EE',
  },
  calendarDayText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700' as const,
  },
  calendarDayTextToday: {
    color: Colors.orangeStart,
    fontWeight: '700' as const,
  },
  weekendDayText: {
    color: Colors.textSecondary,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
});
