import Colors from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, Target, TrendingUp } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface ProgressCardProps {
  completedCount: number;
  totalCount: number;
  selectedDate: Date;
}

export default function ProgressCard({ completedCount, totalCount }: ProgressCardProps) {
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(animatedWidth, {
        toValue: progress,
        tension: 40,
        friction: 8,
        useNativeDriver: false,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [progress, animatedWidth, scaleAnim]);

  const widthInterpolate = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const remainingTasks = totalCount - completedCount;
  const isAllDone = remainingTasks === 0 && totalCount > 0;

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <LinearGradient
        colors={isAllDone ? ['#4CAF50', '#66BB6A'] : ['#FF9052', '#FFB088']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.progressCard}
      >
        <View style={styles.contentRow}>
          <View style={styles.leftSection}>
            <View style={styles.iconContainer}>
              {isAllDone ? (
                <CheckCircle size={24} color="#FFFFFF" />
              ) : (
                <Target size={24} color="#FFFFFF" />
              )}
            </View>
            <View style={styles.textSection}>
              <Text style={styles.mainText}>
                {isAllDone ? 'All tasks completed!' : `${completedCount} of ${totalCount} done`}
              </Text>
              <Text style={styles.subText}>
                {isAllDone ? 'Great job today! 🎉' : `${remainingTasks} task${remainingTasks !== 1 ? 's' : ''} remaining`}
              </Text>
            </View>
          </View>
          
          <View style={styles.percentageContainer}>
            <Text style={styles.percentageText}>{Math.round(progress)}%</Text>
            <TrendingUp size={14} color="rgba(255,255,255,0.8)" />
          </View>
        </View>

        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBg}>
            <Animated.View style={[styles.progressBarFill, { width: widthInterpolate }]} />
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: '#FFFFFF' }]} />
            <Text style={styles.statLabel}>Completed</Text>
            <Text style={styles.statValue}>{completedCount}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: 'rgba(255,255,255,0.5)' }]} />
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={styles.statValue}>{remainingTasks}</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  progressCard: {
    borderRadius: 24,
    padding: 20,
    shadowColor: Colors.peach,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  contentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textSection: {
    flex: 1,
  },
  mainText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.85)',
  },
  percentageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  percentageText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#FFFFFF',
  },
  progressBarContainer: {
    marginBottom: 16,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.8)',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 20,
  },
});
