import Colors from '@/constants/colors';
import { Calendar, Check, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, Platform, Pressable, StyleSheet, Text, View, Alert } from 'react-native';
import * as CalendarModule from 'expo-calendar';

interface CalendarSyncModalProps {
  visible: boolean;
  onClose: () => void;
  onConnect: (calendarType: 'apple' | 'google') => void;
}

export default function CalendarSyncModal({ visible, onClose, onConnect }: CalendarSyncModalProps) {
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const closeButtonScale = useRef(new Animated.Value(1)).current;
  const [connecting, setConnecting] = useState<'apple' | 'google' | null>(null);
  const [connectedCalendar, setConnectedCalendar] = useState<'apple' | 'google' | null>(null);
  
  const [optionAnims] = useState(() =>
    ['apple', 'google'].map(() => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(20),
      scale: new Animated.Value(0.95),
      pressScale: new Animated.Value(1),
    }))
  );

  useEffect(() => {
    if (visible) {
      // Animate backdrop fade in
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Animate modal slide up with scale
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 25,
          stiffness: 100,
          mass: 0.8,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 20,
          stiffness: 90,
        }),
      ]).start(() => {
        // Stagger option items animation
        const animations = optionAnims.map((anim, index) =>
          Animated.parallel([
            Animated.timing(anim.opacity, {
              toValue: 1,
              duration: 300,
              delay: index * 100,
              useNativeDriver: true,
            }),
            Animated.spring(anim.translateY, {
              toValue: 0,
              delay: index * 100,
              useNativeDriver: true,
              damping: 15,
              stiffness: 100,
            }),
            Animated.spring(anim.scale, {
              toValue: 1,
              delay: index * 100,
              useNativeDriver: true,
              damping: 12,
              stiffness: 120,
            }),
          ])
        );
        Animated.stagger(100, animations).start();
      });
    } else {
      // Animate backdrop fade out
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // After backdrop fades out, animate modal slide down
        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: Dimensions.get('window').height,
            useNativeDriver: true,
            damping: 20,
            stiffness: 100,
            mass: 0.8,
          }),
          Animated.spring(scaleAnim, {
            toValue: 0.85,
            useNativeDriver: true,
            damping: 18,
            stiffness: 90,
          }),
        ]).start(() => {
          // Reset animations
          optionAnims.forEach((anim) => {
            anim.opacity.setValue(0);
            anim.translateY.setValue(20);
            anim.scale.setValue(0.95);
            anim.pressScale.setValue(1);
          });
        });
      });
    }
  }, [visible, slideAnim, scaleAnim, backdropOpacity, optionAnims]);

  const handleClosePress = () => {
    Animated.sequence([
      Animated.timing(closeButtonScale, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(closeButtonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const requestCalendarPermissions = async () => {
    try {
      const { status } = await CalendarModule.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Calendar access is required to sync your tasks. Please enable it in Settings.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting calendar permissions:', error);
      Alert.alert('Error', 'Failed to request calendar permissions.');
      return false;
    }
  };

  const handleConnect = async (calendarType: 'apple' | 'google') => {
    setConnecting(calendarType);

    try {
      // Request permissions first
      const hasPermission = await requestCalendarPermissions();
      if (!hasPermission) {
        setConnecting(null);
        return;
      }

      // Get calendars
      const calendars = await CalendarModule.getCalendarsAsync(CalendarModule.EntityTypes.EVENT);
      
      if (calendars.length === 0) {
        Alert.alert(
          'No Calendars',
          'No calendars found on your device. Please add a calendar first.',
          [{ text: 'OK' }]
        );
        setConnecting(null);
        return;
      }

      // For iOS, find Apple Calendar
      // For Android, find Google Calendar (usually has 'google.com' in source)
      let targetCalendar = null;
      
      if (Platform.OS === 'ios' && calendarType === 'apple') {
        // On iOS, look for the default calendar or iCloud calendar
        targetCalendar = calendars.find(
          (cal) => cal.source?.type === 'local' || cal.source?.name === 'iCloud'
        ) || calendars[0];
      } else if (calendarType === 'google') {
        // Look for Google Calendar
        targetCalendar = calendars.find(
          (cal) => cal.source?.name?.toLowerCase().includes('google') || 
                   cal.sourceId?.includes('google')
        );
        
        // If not found, show instructions
        if (!targetCalendar) {
          Alert.alert(
            'Google Calendar Not Found',
            Platform.OS === 'ios' 
              ? 'Please sync your Google Calendar with Apple Calendar in Settings > Calendar > Accounts.'
              : 'Please make sure Google Calendar is installed and synced on your device.',
            [{ text: 'OK' }]
          );
          setConnecting(null);
          return;
        }
      }

      if (targetCalendar) {
        setConnectedCalendar(calendarType);
        onConnect(calendarType);
        
        // Close modal after a short delay
        setTimeout(() => {
          onClose();
          setConnecting(null);
        }, 1000);
      } else {
        Alert.alert(
          'Calendar Not Found',
          `Unable to find ${calendarType === 'apple' ? 'Apple' : 'Google'} Calendar. Please make sure it's set up on your device.`,
          [{ text: 'OK' }]
        );
        setConnecting(null);
      }
    } catch (error) {
      console.error('Error connecting to calendar:', error);
      Alert.alert('Error', 'Failed to connect to calendar. Please try again.');
      setConnecting(null);
    }
  };

  const calendarOptions = [
    {
      type: 'apple' as const,
      title: 'Apple Calendar',
      description: Platform.OS === 'ios' 
        ? 'Sync with your default Apple Calendar'
        : 'Available on iOS devices',
      icon: '🍎',
      available: Platform.OS === 'ios',
    },
    {
      type: 'google' as const,
      title: 'Google Calendar',
      description: 'Sync with your Google Calendar',
      icon: '📅',
      available: true,
    },
  ];

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
            styles.calendarSyncModalContainer,
            {
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={styles.iconContainer}>
                  <Calendar size={24} color={Colors.orangeStart} />
                </View>
                <Text style={styles.modalTitle}>Calendar</Text>
              </View>
              <Pressable onPress={handleClosePress} style={styles.closeButton}>
                <Animated.View style={{ transform: [{ scale: closeButtonScale }] }}>
                  <X size={24} color={Colors.textSecondary} />
                </Animated.View>
              </Pressable>
            </View>

            <View style={styles.modalHandle} />

            <View style={styles.modalContent}>
              <Text style={styles.modalDescription}>
                Choose a calendar to sync your tasks with
              </Text>

              <View style={styles.optionsContainer}>
                {calendarOptions.map((option, index) => {
                  const anim = optionAnims[index];
                  const isConnecting = connecting === option.type;
                  const isConnected = connectedCalendar === option.type;

                  const handlePressIn = () => {
                    if (!option.available || isConnecting || isConnected) return;
                    Animated.spring(anim.pressScale, {
                      toValue: 0.97,
                      useNativeDriver: true,
                      damping: 15,
                      stiffness: 300,
                    }).start();
                  };

                  const handlePressOut = () => {
                    if (!option.available || isConnecting || isConnected) return;
                    Animated.spring(anim.pressScale, {
                      toValue: 1,
                      useNativeDriver: true,
                      damping: 15,
                      stiffness: 300,
                    }).start();
                  };

                  return (
                    <Animated.View
                      key={option.type}
                      style={[
                        {
                          opacity: anim.opacity,
                          transform: [
                            { translateY: anim.translateY },
                            { scale: Animated.multiply(anim.scale, anim.pressScale) },
                          ],
                        },
                      ]}
                    >
                      <Pressable
                        style={[
                          styles.optionCard,
                          !option.available && styles.optionCardDisabled,
                          isConnected && styles.optionCardConnected,
                        ]}
                        onPress={() => option.available && !isConnecting && !isConnected && handleConnect(option.type)}
                        onPressIn={handlePressIn}
                        onPressOut={handlePressOut}
                        disabled={!option.available || isConnecting || isConnected}
                      >
                        <View style={styles.optionContent}>
                          <View style={styles.optionLeft}>
                            <View style={styles.optionIconContainer}>
                              <Text style={styles.optionIcon}>{option.icon}</Text>
                            </View>
                            <View style={styles.optionTextContainer}>
                              <Text style={styles.optionTitle}>{option.title}</Text>
                              <Text style={styles.optionDescription}>{option.description}</Text>
                            </View>
                          </View>
                          {isConnected && (
                            <View style={styles.connectedBadge}>
                              <Check size={20} color="#FFFFFF" />
                            </View>
                          )}
                          {isConnecting && (
                            <View style={styles.connectingIndicator}>
                              <Text style={styles.connectingText}>Connecting...</Text>
                            </View>
                          )}
                        </View>
                      </Pressable>
                    </Animated.View>
                  );
                })}
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  calendarSyncModalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 32,
    maxHeight: Dimensions.get('window').height * 0.7,
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#D1D5DB',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFE5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    paddingHorizontal: 20,
  },
  modalDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardDisabled: {
    opacity: 0.5,
  },
  optionCardConnected: {
    borderColor: Colors.orangeStart,
    backgroundColor: '#FFF5F0',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  optionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIcon: {
    fontSize: 32,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  connectedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.orangeStart,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectingIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  connectingText: {
    fontSize: 14,
    color: Colors.orangeStart,
    fontWeight: '500' as const,
  },
});
