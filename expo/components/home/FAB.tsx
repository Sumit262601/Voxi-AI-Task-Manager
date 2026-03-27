import Colors from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text } from 'react-native';

interface FABProps {
  onPress: () => void;
}

export default function FAB({ onPress }: FABProps) {
  return (
    <Pressable style={styles.fab} onPress={onPress}>
      <LinearGradient
        colors={[Colors.orangeStart, Colors.orangeEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fabGradient}
      >
        <Text style={styles.fabIcon}>+</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: {
    fontSize: 36,
    fontWeight: '300' as const,
    color: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
});
