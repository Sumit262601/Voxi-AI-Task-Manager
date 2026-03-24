import Colors from '@/constants/colors';
import { Bell, BellOff, Clock, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'reminder' | 'completed' | 'info';
}

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  notifications?: Notification[];
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MIN_HEIGHT = SCREEN_HEIGHT * 0.35;
const MAX_HEIGHT = SCREEN_HEIGHT * 0.9;
const DEFAULT_HEIGHT = SCREEN_HEIGHT * 0.6;

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'reminder':
      return { icon: Clock, color: '#F59E0B', bg: '#FEF3C7' };
    case 'completed':
      return { icon: Bell, color: '#10B981', bg: '#D1FAE5' };
    default:
      return { icon: Bell, color: Colors.orangeStart, bg: '#FFF5EE' };
  }
};

export default function NotificationsModal({ visible, onClose, notifications = [] }: NotificationsModalProps) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const [modalHeight, setModalHeight] = useState(DEFAULT_HEIGHT);
  const heightRef = useRef(DEFAULT_HEIGHT);
  const dragStartHeight = useRef(DEFAULT_HEIGHT);

  const notificationAnims = useMemo(
    () =>
      Array.from({ length: notifications.length }, () => ({
        opacity: new Animated.Value(0),
        translateY: new Animated.Value(30),
        scale: new Animated.Value(0.9),
        pressScale: new Animated.Value(1),
      })),
    [notifications.length]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderGrant: () => {
        dragStartHeight.current = heightRef.current;
      },
      onPanResponderMove: (_, gestureState) => {
        const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, dragStartHeight.current - gestureState.dy));
        heightRef.current = newHeight;
        setModalHeight(newHeight);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 && gestureState.vy > 0.3) {
          onClose();
          return;
        }

        const finalHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, heightRef.current));
        heightRef.current = finalHeight;
        setModalHeight(finalHeight);
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      heightRef.current = DEFAULT_HEIGHT;
      setModalHeight(DEFAULT_HEIGHT);

      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 24,
          stiffness: 90,
          mass: 0.8,
        }),
      ]).start(() => {
        Animated.timing(headerAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();

        const animations = notificationAnims.map((anim, index) =>
          Animated.parallel([
            Animated.timing(anim.opacity, {
              toValue: 1,
              duration: 350,
              delay: index * 80,
              useNativeDriver: true,
            }),
            Animated.spring(anim.translateY, {
              toValue: 0,
              delay: index * 80,
              useNativeDriver: true,
              damping: 12,
              stiffness: 100,
            }),
            Animated.spring(anim.scale, {
              toValue: 1,
              delay: index * 80,
              useNativeDriver: true,
              damping: 10,
              stiffness: 100,
            }),
          ])
        );
        Animated.stagger(80, animations).start();
      });
    } else {
      headerAnim.setValue(0);
      const fadeOutAnimations = notificationAnims.map((anim, index) =>
        Animated.parallel([
          Animated.timing(anim.opacity, {
            toValue: 0,
            duration: 150,
            delay: index * 20,
            useNativeDriver: true,
          }),
          Animated.timing(anim.translateY, {
            toValue: -15,
            duration: 150,
            delay: index * 20,
            useNativeDriver: true,
          }),
          Animated.timing(anim.scale, {
            toValue: 0.9,
            duration: 150,
            delay: index * 20,
            useNativeDriver: true,
          }),
        ])
      );

      Animated.parallel([
        Animated.stagger(20, fadeOutAnimations),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start(() => {
        notificationAnims.forEach((anim) => {
          anim.opacity.setValue(0);
          anim.translateY.setValue(30);
          anim.scale.setValue(0.9);
          anim.pressScale.setValue(1);
        });
      });
    }
  }, [visible, slideAnim, backdropOpacity, notificationAnims, headerAnim]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.backdrop,
            { opacity: backdropOpacity },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.notificationsModalContainer,
            {
              height: modalHeight,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View {...panResponder.panHandlers} style={styles.dragHandleArea}>
            <View style={styles.modalHandle} />
          </View>

          <View style={styles.modalHeader}>
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              testID="notification-close"
            >
              <X size={18} color={Colors.text} />
            </Pressable>

            <View style={styles.headerCenter}>
              <View style={styles.headerIconContainer}>
                <Bell size={18} color={Colors.orangeStart} />
              </View>
              <View>
                <Text style={styles.modalTitle}>Notifications</Text>
                <Text style={styles.modalSubtitle}>
                  {notifications.filter((n) => !n.read).length > 0
                    ? `${notifications.filter((n) => !n.read).length} new updates`
                    : notifications.length === 0
                      ? 'No notifications yet'
                      : 'All caught up'}
                </Text>
              </View>
            </View>

            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.notificationsList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.notificationsListContent}
            bounces={Platform.OS !== 'web'}
          >
            {notifications.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <BellOff size={40} color={Colors.textSecondary} />
                </View>
                <Text style={styles.emptyStateText}>No notifications</Text>
                <Text style={styles.emptyStateSubtext}>You are all caught up! Check back later.</Text>
              </View>
            ) : (
              notifications.map((notification, index) => {
                const anim = notificationAnims[index];
                if (!anim) return null;
                const iconConfig = getNotificationIcon(notification.type);
                const IconComponent = iconConfig.icon;

                const handlePressIn = () => {
                  Animated.spring(anim.pressScale, {
                    toValue: 0.96,
                    useNativeDriver: true,
                    damping: 15,
                    stiffness: 300,
                  }).start();
                };
                const handlePressOut = () => {
                  Animated.spring(anim.pressScale, {
                    toValue: 1,
                    useNativeDriver: true,
                    damping: 15,
                    stiffness: 300,
                  }).start();
                };

                return (
                  <Animated.View
                    key={notification.id}
                    style={{
                      opacity: anim.opacity,
                      transform: [
                        { translateY: anim.translateY },
                        { scale: Animated.multiply(anim.scale, anim.pressScale) },
                      ],
                    }}
                  >
                    <Pressable
                      style={[
                        styles.notificationItem,
                        !notification.read && styles.notificationItemUnread,
                      ]}
                      onPressIn={handlePressIn}
                      onPressOut={handlePressOut}
                    >
                      <View style={[styles.notificationIcon, { backgroundColor: iconConfig.bg }]}>
                        <IconComponent size={18} color={iconConfig.color} />
                      </View>
                      <View style={styles.notificationContent}>
                        <View style={styles.notificationHeader}>
                          <Text style={styles.notificationTitle}>{notification.title}</Text>
                          {!notification.read && <View style={styles.unreadDot} />}
                        </View>
                        <Text style={styles.notificationMessage}>{notification.message}</Text>
                        <Text style={styles.notificationTime}>{notification.time}</Text>
                      </View>
                    </Pressable>
                  </Animated.View>
                );
              })
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  notificationsModalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FAFAFA',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 16,
  },
  dragHandleArea: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#D1D5DB',
    borderRadius: 3,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginLeft: 14,
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  notificationsList: {
    flex: 1,
  },
  notificationsListContent: {
    padding: 16,
    paddingBottom: 40,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 10,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  notificationItemUnread: {
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 3,
    borderLeftColor: Colors.orangeStart,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  notificationMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: Colors.textSecondary,
    opacity: 0.7,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.orangeStart,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});
