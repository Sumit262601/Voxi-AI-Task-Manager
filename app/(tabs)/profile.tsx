import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/auth';
import { useTasks } from '@/contexts/tasks';

import { Bell, Calendar, ChevronRight, Crown, Edit2, FileText, Fingerprint, LogOut, MessageSquare, ScanFace, Shield, Star, User, CheckCircle2, Clock, TrendingUp, XCircle } from 'lucide-react-native';
import { usePurchases } from '@/contexts/purchases';
import { Image, Pressable, ScrollView, StyleSheet, Switch, Text, View, Alert, Animated, ViewStyle, TextStyle, ImageStyle, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import NotificationsModal, { type Notification } from '@/components/profile/NotificationsModal';
import RateUsModal from '@/components/profile/RateUsModal';
import FeedbackModal from '@/components/profile/FeedbackModal';
import { syncAllTasksToCalendar, clearAllCalendarEvents, isCalendarSyncEnabled, getCalendarType } from '@/utils/calendarSync';
import { getNotificationHistory } from '@/utils/notifications';
import { checkBiometricSupport, isBiometricEnabled, setBiometricEnabled, authenticateWithBiometrics, getBiometricLabel } from '@/utils/biometricAuth';
import { Platform } from 'react-native';


export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { tier, isPremium, planDisplayName, planPrice, willRenew, manageSubscription } = usePurchases();

  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [userNotifications, setUserNotifications] = useState<Notification[]>([]);
  const [showRateUsModal, setShowRateUsModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [calendarSyncEnabled, setCalendarSyncEnabled] = useState(false);
  const [connectedCalendarType, setConnectedCalendarType] = useState<'apple' | 'google' | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<'face' | 'fingerprint' | 'iris' | 'none'>('none');
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const router = useRouter();
  const { tasks } = useTasks();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const stats = useMemo(() => {
    const completed = tasks.filter(t => t.completed).length;
    const pending = tasks.filter(t => !t.completed).length;
    const total = tasks.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, pending, total, completionRate };
  }, [tasks]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    const loadBiometricStatus = async () => {
      try {
        const support = await checkBiometricSupport();
        setBiometricAvailable(support.isAvailable);
        setBiometricType(support.biometricType);
        if (support.isAvailable) {
          const enabled = await isBiometricEnabled();
          setBiometricEnabledState(enabled);
        }
      } catch (error) {
        console.error('Failed to load biometric status:', error);
      }
    };
    void loadBiometricStatus();
  }, []);

  const handleBiometricToggle = async (enabled: boolean) => {
    if (enabled) {
      const result = await authenticateWithBiometrics('Verify to enable biometric lock');
      if (result.success) {
        await setBiometricEnabled(true);
        setBiometricEnabledState(true);
        Alert.alert('Biometric Lock Enabled', `Your app is now protected with ${getBiometricLabel(biometricType)}.`);
      } else {
        Alert.alert('Authentication Failed', 'Could not verify your identity. Please try again.');
      }
    } else {
      await setBiometricEnabled(false);
      setBiometricEnabledState(false);
      Alert.alert('Biometric Lock Disabled', 'App lock has been turned off.');
    }
  };

  useEffect(() => {
    const loadCalendarSyncStatus = async () => {
      try {
        const enabled = await isCalendarSyncEnabled();
        const calendarType = await getCalendarType();
        setCalendarSyncEnabled(enabled);
        setConnectedCalendarType(calendarType);
      } catch (error) {
        console.error('Failed to load calendar sync status:', error);
      }
    };
    void loadCalendarSyncStatus();
  }, []);

  const loadUserNotifications = async () => {
    try {
      const list = await getNotificationHistory();
      setUserNotifications(list);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  useEffect(() => {
    if (showNotificationsModal) {
      void loadUserNotifications();
    }
  }, [showNotificationsModal]);

  const handleCalendarConnect = async (calendarType: 'apple' | 'google') => {
    try {
      await AsyncStorage.setItem('@calendar_sync', 'true');
      await AsyncStorage.setItem('@calendar_type', calendarType);
      setCalendarSyncEnabled(true);
      setConnectedCalendarType(calendarType);

      await syncAllTasksToCalendar(tasks);

      Alert.alert(
        'Calendar Connected',
        `Your tasks will now sync with ${calendarType === 'apple' ? 'Apple' : 'Google'} Calendar.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to enable calendar sync:', error);
      Alert.alert('Error', 'Failed to connect calendar. Please try again.');
    }
  };

  const handleCalendarSyncToggle = async (enabled: boolean) => {
    try {
      if (enabled) {
        Alert.alert(
          'Connect Calendar',
          'Choose your calendar to sync tasks with:',
          [
            { text: 'Apple Calendar', onPress: () => handleCalendarConnect('apple') },
            { text: 'Google Calendar', onPress: () => handleCalendarConnect('google') },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      } else {
        await AsyncStorage.setItem('@calendar_sync', 'false');
        setCalendarSyncEnabled(false);

        await clearAllCalendarEvents();

        Alert.alert(
          'Calendar Disconnected',
          'Your tasks will no longer sync with your calendar.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Failed to toggle calendar sync:', error);
      Alert.alert('Error', 'Failed to update calendar sync setting.');
    }
  };

  const MenuItem = ({
    icon,
    iconBg,
    iconColor: _iconColor,
    title,
    subtitle,
    onPress,
    showSwitch,
    switchValue,
    onSwitchChange,
    isLogout
  }: {
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showSwitch?: boolean;
    switchValue?: boolean;
    onSwitchChange?: (value: boolean) => void;
    isLogout?: boolean;
  }) => (
    <Pressable
      style={({ pressed }) => [
        styles.menuItem,
        pressed && styles.menuItemPressed
      ]}
      onPress={onPress}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: iconBg }]}>
        <>{icon}</>
      </View>
      <View style={styles.menuTextContainer}>
        <Text style={[styles.menuItemText, isLogout && styles.logoutText]}>{title}</Text>
        {subtitle && <Text style={styles.menuItemSubtext}>{subtitle}</Text>}
      </View>
      {showSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: '#E5E5E5', true: Colors.green }}
          thumbColor="#FFFFFF"
        />
      ) : !isLogout && (
        <ChevronRight size={20} color={Colors.textSecondary} />
      )}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={styles.headerSection}>
        <LinearGradient
          colors={['#FF9052', '#FFB347']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <SafeAreaView edges={['top']}>
            <View style={styles.headerPattern}>
              {[...Array(6)].map((_, i) => (
                <View key={i} style={[styles.patternCircle, {
                  left: `${(i * 20) % 100}%`,
                  top: `${(i * 15) % 80}%`,
                  opacity: 0.1 + (i * 0.03),
                  width: 40 + (i * 10),
                  height: 40 + (i * 10),
                }]} />
              ))}
            </View>

            <View style={styles.profileSection}>
              <Pressable
                style={styles.avatarWrapper}
                onPress={() => router.push('/edit-profile' as any)}
              >
                <View style={styles.avatarContainer}>
                  {user?.profilePhoto ? (
                    <Image source={{ uri: user.profilePhoto }} style={styles.avatarImage} resizeMode="cover" />
                  ) : (
                    <User size={40} color="#FF9052" />
                  )}
                </View>
                <View style={styles.editIconContainer}>
                  <Edit2 size={12} color="#FFFFFF" strokeWidth={2.5} />
                </View>
              </Pressable>

              <Text style={styles.profileName}>
                {user?.name || user?.email?.split('@')[0] || 'User'}
              </Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <View style={[styles.statIconBg, { backgroundColor: '#E8F5E9' }]}>
              <CheckCircle2 size={18} color={Colors.green} />
            </View>
            <Text style={styles.statValue}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIconBg, { backgroundColor: '#FFF3E0' }]}>
              <Clock size={18} color={Colors.peach} />
            </View>
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIconBg, { backgroundColor: '#E8EAF6' }]}>
              <TrendingUp size={18} color={Colors.purple} />
            </View>
            <Text style={styles.statValue}>{stats.completionRate}%</Text>
            <Text style={styles.statLabel}>Rate</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SUBSCRIPTION</Text>
            <View style={styles.menuCard}>
              <MenuItem
                icon={<Crown size={20} color={Colors.orangeStart} />}
                iconBg="#FFF5EE"
                iconColor={Colors.orangeStart}
                title={isPremium ? planDisplayName : 'Upgrade to Premium'}
                subtitle={
                  tier === 'free'
                    ? 'Free Plan \u2022 Upgrade to unlock more'
                    : `${planPrice} \u2022 ${willRenew ? 'Active \u2022 Auto-renews' : 'Active \u2022 Will not renew'}`
                }
                onPress={() => router.push('/paywall' as any)}
              />
              {isPremium && (
                <>
                  <View style={styles.separator} />
                  <MenuItem
                    icon={<XCircle size={20} color="#FF6B6B" />}
                    iconBg="#FFE5E5"
                    iconColor="#FF6B6B"
                    title="Cancel Subscription"
                    subtitle="Manage through your app store"
                    onPress={() => {
                      Alert.alert(
                        'Cancel Subscription',
                        'You will be redirected to your app store to manage your subscription. Your current plan will remain active until the end of the billing period.',
                        [
                          { text: 'Keep Plan', style: 'cancel' },
                          {
                            text: 'Continue',
                            style: 'destructive',
                            onPress: () => manageSubscription(),
                          },
                        ]
                      );
                    }}
                  />
                </>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>APP SETTINGS</Text>
            <View style={styles.menuCard}>
              <MenuItem
                icon={<Bell size={20} color="#FF9052" />}
                iconBg="#FFF5F0"
                iconColor="#FF9052"
                title="Notifications"
                subtitle="Manage your alerts"
                onPress={() => setShowNotificationsModal(true)}
              />
              <View style={styles.separator} />
              {biometricAvailable && Platform.OS !== 'web' && (
                <>
                  <View style={styles.separator} />
                  <MenuItem
                    icon={biometricType === 'face' ? <ScanFace size={20} color="#34C759" /> : <Fingerprint size={20} color="#34C759" />}
                    iconBg="#E8F9ED"
                    iconColor="#34C759"
                    title={`${getBiometricLabel(biometricType)} Lock`}
                    subtitle={biometricEnabled ? 'App is protected' : 'Secure your app'}
                    showSwitch
                    switchValue={biometricEnabled}
                    onSwitchChange={handleBiometricToggle}
                  />
                </>
              )}
              <View style={styles.separator} />
              <MenuItem
                icon={<Calendar size={20} color="#4A90E2" />}
                iconBg="#E5F4FF"
                iconColor="#4A90E2"
                title="Calendar Sync"
                subtitle={calendarSyncEnabled && connectedCalendarType
                  ? `Connected to ${connectedCalendarType === 'apple' ? 'Apple' : 'Google'} Calendar`
                  : 'Sync tasks with calendar'}
                showSwitch
                switchValue={calendarSyncEnabled}
                onSwitchChange={handleCalendarSyncToggle}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SUPPORT</Text>
            <View style={styles.menuCard}>
              <MenuItem
                icon={<MessageSquare size={20} color="#FFB800" />}
                iconBg="#FFF9E5"
                iconColor="#FFB800"
                title="Send Feedback"
                subtitle="Help us improve"
                onPress={() => setShowFeedbackModal(true)}
              />
              <View style={styles.separator} />
              <MenuItem
                icon={<Star size={20} color="#FF6B6B" />}
                iconBg="#FFE5E5"
                iconColor="#FF6B6B"
                title="Rate Us"
                subtitle="Share your experience"
                onPress={() => setShowRateUsModal(true)}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>LEGAL</Text>
            <View style={styles.menuCard}>
              <MenuItem
                icon={<Shield size={20} color="#9B59B6" />}
                iconBg="#F0E5FF"
                iconColor="#9B59B6"
                title="Privacy Policy"
                onPress={() => Linking.openURL('https://voxi-task-manager.com/privacy')}
              />
              <View style={styles.separator} />
              <MenuItem
                icon={<FileText size={20} color="#3498DB" />}
                iconBg="#E5F4FF"
                iconColor="#3498DB"
                title="Terms & Conditions"
                onPress={() => Linking.openURL('https://voxi-task-manager.com/terms')}
              />
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.menuCard}>
              <MenuItem
                icon={<LogOut size={20} color="#FF4444" />}
                iconBg="#FFEBEB"
                iconColor="#FF4444"
                title="Log Out"
                isLogout
                onPress={logout}
              />
            </View>
          </View>

          <Text style={styles.versionText}>Version 1.0.0</Text>
        </Animated.View>
      </ScrollView>

      <NotificationsModal
        visible={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        notifications={userNotifications}
      />

      <RateUsModal
        visible={showRateUsModal}
        onClose={() => setShowRateUsModal(false)}
        onRate={(rating) => {
          console.log('User rated:', rating);
        }}
      />

      <FeedbackModal
        visible={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onSubmit={(feedback) => {
          console.log('User feedback:', feedback);
        }}
      />
    </View>
  );
}

type ProfileStyles = {
  container: ViewStyle;
  scrollView: ViewStyle;
  scrollContent: ViewStyle;
  headerSection: ViewStyle;
  headerGradient: ViewStyle;
  headerPattern: ViewStyle;
  patternCircle: ViewStyle;
  profileSection: ViewStyle;
  avatarWrapper: ViewStyle;
  avatarContainer: ViewStyle;
  avatarImage: ImageStyle;
  editIconContainer: ViewStyle;
  profileName: TextStyle;
  profileEmail: TextStyle;
  statsContainer: ViewStyle;
  statItem: ViewStyle;
  statIconBg: ViewStyle;
  statValue: TextStyle;
  statLabel: TextStyle;
  statDivider: ViewStyle;
  section: ViewStyle;
  sectionTitle: TextStyle;
  menuCard: ViewStyle;
  menuItem: ViewStyle;
  menuItemPressed: ViewStyle;
  menuIconContainer: ViewStyle;
  menuTextContainer: ViewStyle;
  menuItemText: TextStyle;
  menuItemSubtext: TextStyle;
  separator: ViewStyle;
  logoutText: TextStyle;
  versionText: TextStyle;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerSection: {
    marginBottom: 22,
  },
  headerGradient: {
    paddingBottom: 50,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  headerPattern: {
    ...StyleSheet.absoluteFillObject,
  },
  patternCircle: {
    position: 'absolute',
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
  },
  profileSection: {
    alignItems: 'center',
    // marginTop: 12,
  },
  avatarWrapper: {
    position: 'relative',
    paddingVertical: 18,
    // marginBottom: 2,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 18,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 2,
    textTransform: 'capitalize',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  profileEmail: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    marginHorizontal: 20,
    marginTop: -35,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 8,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  menuCard: {
    // backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuItemPressed: {
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  menuItemSubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 74,
  },
  logoutText: {
    color: '#FF4444',
    fontWeight: '600' as const,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 8,
  },
}) as ProfileStyles;
