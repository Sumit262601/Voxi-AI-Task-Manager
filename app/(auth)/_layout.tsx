import { Stack } from 'expo-router';

// Show onboarding first for new users; they can skip or finish to reach login
export const unstable_settings = {
  initialRouteName: 'onboarding',
};

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}
