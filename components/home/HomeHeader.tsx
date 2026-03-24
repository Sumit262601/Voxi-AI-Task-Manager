import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/auth';
import { formatDate } from '@/utils/dateUtils';
import { Bell, Calendar, Sparkles } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface HomeHeaderProps {
  selectedDate: Date;
  onCalendarPress: () => void;
  onNotificationPress: () => void;
  unreadCount: number;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function HomeHeader({ selectedDate, onCalendarPress, onNotificationPress, unreadCount }: HomeHeaderProps) {
  const { user } = useAuth();
  const greeting = getGreeting();
  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <View style={styles.headerContainer}>
      <View style={styles.topRow}>
        <View style={styles.greetingSection}>
          <View style={styles.greetingRow}>
            <Text style={styles.greetingText}>{greeting}</Text>
            <Sparkles size={18} color={Colors.peach} />
          </View>
          <Text style={styles.nameText}>{firstName}</Text>
        </View>
        
        <View style={styles.rightSection}>
          <Pressable style={styles.calendarButton} onPress={onCalendarPress}>
            <Calendar size={20} color={Colors.text} />
          </Pressable>
          
          <Pressable
            style={styles.notificationButton}
            onPress={onNotificationPress}
            testID="notification-bell"
          >
            <Bell size={20} color={Colors.text} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>
      
      <View style={styles.dateRow}>
        <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  greetingSection: {
    flex: 1,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greetingText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
  },
  nameText: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.text,
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  calendarButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F5F3F0',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F5F3F0',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#F5F3F0',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    lineHeight: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: Colors.dateText,
  },
});
