import Colors from '@/constants/colors';
import { Link, Stack } from 'expo-router';
import { AlertCircle } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <AlertCircle size={64} color={Colors.orangeStart} />
        <Text style={styles.title}>Page not found</Text>
        <Text style={styles.subtitle}>This screen doesn&apos;t exist.</Text>

        <Link href="/(tabs)" style={styles.link}>
          <Text style={styles.linkText}>Go to home screen</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 24,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  link: {
    marginTop: 32,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.orangeStart,
  },
});
