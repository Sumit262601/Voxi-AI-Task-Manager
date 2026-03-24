import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/auth';
import { formatDate } from '@/utils/dateUtils';
import { useRouter } from 'expo-router';
import { Calendar, Sparkles } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

interface HomeHeaderProps {
  selectedDate: Date;
  onCalendarPress: () => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function HomeHeader({ selectedDate, onCalendarPress }: HomeHeaderProps) {
  const { user } = useAuth();
  const router = useRouter();
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
          
          <Pressable onPress={() => router.push('/profile' as any)} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
            {user?.profilePhoto ? (
              <Image source={{ uri: user.profilePhoto }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'}
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
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
  },
  avatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.peach,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
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
