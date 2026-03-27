import AppleLogo from '@/components/auth/AppleLogo';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const { login, signInWithApple } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    setError('');
    Keyboard.dismiss();

    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#FDF8F3', '#F5EDE4', '#EDE3D8']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={[Colors.orangeStart, '#E07840']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.logoGradient}
                >
                  <Text style={styles.logoIcon}>V</Text>
                </LinearGradient>
              </View>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to continue your journey</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Email</Text>
                  <TouchableWithoutFeedback onPress={() => emailInputRef.current?.focus()}>
                    <View
                      style={[
                        styles.inputWrapper,
                        emailFocused && styles.inputWrapperFocused,
                      ]}
                      pointerEvents="box-none"
                      collapsable={false}
                    >
                      <Mail size={20} color={emailFocused ? Colors.orangeStart : '#A89585'} style={styles.inputIcon} />
                      <TextInput
                        ref={emailInputRef}
                        style={styles.input}
                        value={email}
                        onChangeText={setEmail}
                      placeholder="your@email.com"
                      placeholderTextColor="#B5A698"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      editable={!isLoading}
                      cursorColor={Colors.orangeStart}
                      selectionColor="rgba(255, 144, 82, 0.3)"
                    />
                    </View>
                  </TouchableWithoutFeedback>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Password</Text>
                  <TouchableWithoutFeedback onPress={() => passwordInputRef.current?.focus()}>
                    <View
                      style={[
                        styles.inputWrapper,
                        passwordFocused && styles.inputWrapperFocused,
                      ]}
                      pointerEvents="box-none"
                      collapsable={false}
                    >
                      <Lock size={20} color={passwordFocused ? Colors.orangeStart : '#A89585'} style={styles.inputIcon} />
                      <TextInput
                        ref={passwordInputRef}
                        style={styles.input}
                        value={password}
                      onChangeText={setPassword}
                      placeholder="Enter your password"
                      placeholderTextColor="#B5A698"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      onSubmitEditing={handleLogin}
                      editable={!isLoading}
                      cursorColor={Colors.orangeStart}
                      selectionColor="rgba(255, 144, 82, 0.3)"
                    />
                      <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                        {showPassword ? (
                          <EyeOff size={20} color="#A89585" />
                        ) : (
                          <Eye size={20} color="#A89585" />
                        )}
                      </Pressable>
                    </View>
                  </TouchableWithoutFeedback>
                </View>

                <Pressable
                  onPress={() => {}}
                  style={({ pressed }) => [
                    styles.forgotPassword,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </Pressable>

                {error ? (
                  <Animated.View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </Animated.View>
                ) : null}

                <Pressable
                  onPress={handleLogin}
                  disabled={isLoading}
                  style={({ pressed }) => [
                    styles.buttonPressable,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <LinearGradient
                    colors={[Colors.orangeStart, '#E07840']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.button}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.buttonText}>Sign In</Text>
                    )}
                  </LinearGradient>
                </Pressable>

                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                <Pressable
                  onPress={signInWithApple}
                  disabled={isLoading}
                  style={({ pressed }) => [
                    styles.appleButtonPressable,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <View style={styles.appleButton}>
                    <AppleLogo size={20} color="#FFFFFF" />
                    <Text style={styles.appleButtonText}>Continue with Apple</Text>
                  </View>
                </Pressable>
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don&apos;t have an account? </Text>
              <Link href={"/(auth)/signup" as any} asChild>
                <Pressable disabled={isLoading}>
                  <Text style={styles.footerLink}>Sign up</Text>
                </Pressable>
              </Link>
            </View>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoGradient: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.orangeStart,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoIcon: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#2D2016',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#8B7355',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  form: {
    gap: 4,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#5C4D3C',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F4F0',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E8E0D8',
  },
  inputWrapperFocused: {
    borderColor: Colors.orangeStart,
    backgroundColor: '#FFF9F5',
    shadowColor: Colors.orangeStart,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  inputIcon: {
    marginLeft: 16,
  },
  input: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 16,
    fontSize: 16,
    color: '#2D2016',
  },
  eyeIcon: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorContainer: {
    backgroundColor: '#FFF0F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFD4D4',
  },
  errorText: {
    color: '#D94444',
    fontSize: 14,
    fontWeight: '500' as const,
  },
  buttonPressable: {
    marginTop: 8,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  button: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.orangeEnd,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600' as const,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8E0D8',
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#A89585',
    fontWeight: '500' as const,
  },
  appleButtonPressable: {
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: '#1A1A1A',
  },
  appleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 28,
  },
  footerText: {
    fontSize: 15,
    color: '#8B7355',
  },
  footerLink: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.orangeStart,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: Colors.orangeStart,
    fontWeight: '500' as const,
  },
});
