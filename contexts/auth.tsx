import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { useRouter, useSegments } from 'expo-router';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Platform } from 'react-native';
import { supabase, UserProfile, SUPABASE_CALLBACK_URL } from '@/utils/supabase';
import { Session } from '@supabase/supabase-js';

const ONBOARDING_KEY = 'hasSeenOnboarding';
const CACHED_PROFILE_KEY = 'cached_user_profile';

interface User {
  email: string;
  id: string;
  name?: string;
  phone?: string;
  address?: string;
  profilePhoto?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<Omit<User, 'id'>>) => Promise<void>;
}

export const [AuthProvider, useAuth] = createContextHook((): AuthState => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getCachedProfile = useCallback(async (userId: string): Promise<User | null> => {
    try {
      const cached = await AsyncStorage.getItem(CACHED_PROFILE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as User;
        if (parsed.id === userId) {
          console.log('Using cached profile for:', userId);
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Failed to read cached profile:', err);
    }
    return null;
  }, []);

  const cacheProfile = useCallback(async (profile: User) => {
    try {
      await AsyncStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(profile));
    } catch (err) {
      console.warn('Failed to cache profile:', err);
    }
  }, []);

  const fetchUserProfile = useCallback(async (userId: string, email: string): Promise<User> => {
    console.log('Fetching user profile for:', userId);
    
    if (!supabase) {
      const cached = await getCachedProfile(userId);
      return cached || { id: userId, email };
    }
    
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      const fetchPromise = supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      const { data, error: profileError } = await Promise.race([fetchPromise, timeoutPromise]);

      if (profileError && profileError.code !== 'PGRST116') {
        console.warn('Profile fetch error (non-critical):', profileError.code, profileError.message);
      }

      if (data) {
        const profile = data as UserProfile;
        const userObj: User = {
          id: profile.id,
          email: profile.email,
          name: profile.name || undefined,
          phone: profile.phone || undefined,
          address: profile.address || undefined,
          profilePhoto: profile.profile_photo || undefined,
        };
        await cacheProfile(userObj);
        return userObj;
      }
    } catch (err) {
      console.warn('Network error fetching profile, checking cache:', err);
      const cached = await getCachedProfile(userId);
      if (cached) return cached;
    }

    return { id: userId, email };
  }, [getCachedProfile, cacheProfile]);

  const hashPassword = useCallback(async (password: string): Promise<string> => {
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password
    );
    console.log('Password hashed successfully');
    return hash;
  }, []);

  const createUserProfile = useCallback(async (userId: string, email: string, metadata?: { avatar_url?: string; name?: string; password_hash?: string }): Promise<void> => {
    console.log('Creating user profile for:', userId);
    
    if (!supabase) {
      console.warn('Supabase not configured, skipping profile creation');
      return;
    }
    
    try {
      const profileData: { id: string; email: string; profile_photo?: string; name?: string; password_hash?: string } = {
        id: userId,
        email: email,
      };
      
      if (metadata?.avatar_url) {
        profileData.profile_photo = metadata.avatar_url;
      }
      if (metadata?.name) {
        profileData.name = metadata.name;
      }
      if (metadata?.password_hash) {
        profileData.password_hash = metadata.password_hash;
      }
      
      const { error: insertError } = await supabase
        .from('users')
        .upsert(profileData, { onConflict: 'id' });

      if (insertError) {
        console.error('Error creating profile:', insertError.message || JSON.stringify(insertError));
      }
    } catch (err) {
      console.warn('Network error creating profile:', err);
    }
  }, []);

  const handleSession = useCallback(async (session: Session | null) => {
    if (session?.user) {
      const email = session.user.email || '';
      const userId = session.user.id;
      
      const oauthAvatar = session.user.user_metadata?.avatar_url ||
                         session.user.user_metadata?.picture ||
                         null;
      const oauthName = session.user.user_metadata?.full_name ||
                        session.user.user_metadata?.name ||
                        null;

      try {
        let userProfile = await fetchUserProfile(userId, email);

        if (!userProfile.profilePhoto && oauthAvatar && supabase) {
          const updates: { profile_photo?: string; name?: string; updated_at: string } = {
            profile_photo: oauthAvatar,
            updated_at: new Date().toISOString(),
          };
          if (!userProfile.name && oauthName) {
            updates.name = oauthName;
          }
          await supabase
            .from('users')
            .update(updates)
            .eq('id', userId);
          userProfile = {
            ...userProfile,
            profilePhoto: oauthAvatar,
            name: userProfile.name || oauthName || undefined,
          };
        }

        setUser(userProfile);
        console.log('User session loaded:', email);
      } catch (err) {
        console.error('Error loading user profile:', err);
        setUser({ id: userId, email, profilePhoto: oauthAvatar || undefined });
      }
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }, [fetchUserProfile]);

  useEffect(() => {
    console.log('Setting up Supabase auth listener');
    
    if (!supabase) {
      console.warn('Supabase not configured');
      setIsLoading(false);
      return;
    }
    
    void supabase.auth.getSession()
      .then(({ data: { session } }) => {
        void handleSession(session);
      })
      .catch((err) => {
        const errorMessage = err?.message || String(err);
        const isInvalidRefreshToken =
          errorMessage.includes('Invalid Refresh Token') ||
          errorMessage.includes('Refresh Token Not Found');
        const isNetworkError =
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('Network request failed') ||
          errorMessage.includes('TypeError');

        if (isInvalidRefreshToken && supabase) {
          console.warn('Clearing invalid refresh token');
          void supabase.auth.signOut().finally(() => void handleSession(null));
        } else if (isNetworkError) {
          console.warn('[Auth] Network error during getSession, attempting cached session:', errorMessage);
          void handleSession(null);
        } else {
          console.error('getSession error:', err);
          void handleSession(null);
        }
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event);
      void handleSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [handleSession]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);

    try {
      if (!validateEmail(email)) {
        throw new Error('Please enter a valid email address');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      if (!supabase) {
        throw new Error('Supabase is not configured');
      }

      const normalizedEmail = email.toLowerCase().trim();
      const passwordHash = await hashPassword(password);

      console.log('Signing in with Supabase Auth...');

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        console.error('Supabase login error:', signInError);
        if (signInError.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials.');
        }
        if (signInError.message.includes('Email not confirmed')) {
          throw new Error('Please verify your email address before logging in.');
        }
        throw new Error(signInError.message);
      }

      if (data.user) {
        const { data: dbUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', data.user.id)
          .single();

        if (!dbUser) {
          console.log('DB profile missing, re-creating...');
          await createUserProfile(data.user.id, normalizedEmail, {
            password_hash: passwordHash,
          });
        }
      }

      console.log('User logged in:', data.user?.email);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      setIsLoading(false);
      throw err;
    }
  }, [hashPassword, createUserProfile]);

  const signup = useCallback(async (email: string, password: string, name?: string) => {
    setError(null);
    setIsLoading(true);

    try {
      if (!validateEmail(email)) {
        throw new Error('Please enter a valid email address');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      if (!supabase) {
        throw new Error('Supabase is not configured');
      }

      const normalizedEmail = email.toLowerCase().trim();
      const passwordHash = await hashPassword(password);

      console.log('Hashing password with SHA-256 encryption...');

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      });

      if (signUpError) {
        console.error('Supabase signup error:', signUpError);

        if (signUpError.message.includes('User already registered')) {
          console.log('Auth user exists, checking if DB user was deleted...');
          const { data: existingDbUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', normalizedEmail)
            .single();

          console.log('Attempting sign-in for existing auth user...');
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });

          if (signInError) {
            throw new Error('An account with this email already exists but the password does not match. Please sign in or use a different email.');
          }

          if (signInData.user) {
            if (!existingDbUser) {
              console.log('DB user was deleted, re-creating profile...');
              await createUserProfile(signInData.user.id, normalizedEmail, {
                name: name || undefined,
                password_hash: passwordHash,
              });
            } else {
              console.log('User already exists in DB, signed in successfully.');
            }
            return;
          }

          throw new Error('An account with this email already exists. Please sign in instead.');
        }

        if (signUpError.message.includes('invalid')) {
          throw new Error('Unable to create account. Please check your email or try a different one.');
        }
        throw new Error(signUpError.message);
      }

      if (data.user) {
        await createUserProfile(data.user.id, normalizedEmail, {
          name: name || undefined,
          password_hash: passwordHash,
        });
      }

      console.log('User signed up with encrypted password:', data.user?.email);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Signup failed';
      setError(message);
      setIsLoading(false);
      throw err;
    }
  }, [hashPassword, createUserProfile]);

  const logout = useCallback(async () => {
    try {
      if (!supabase) {
        setUser(null);
        return;
      }
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.error('Supabase logout error:', signOutError);
      }
      await AsyncStorage.removeItem(CACHED_PROFILE_KEY);
      setUser(null);
      console.log('User logged out, cache cleared');
    } catch (err) {
      console.error('Failed to logout:', err);
      setUser(null);
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }

      if (Platform.OS === 'web') {
        console.log('[Auth] Starting Apple OAuth sign in for web...');
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: 'apple',
          options: {
            redirectTo: SUPABASE_CALLBACK_URL,
          },
        });
        if (oauthError) {
          throw new Error(oauthError.message);
        }
        setIsLoading(false);
        return;
      }

      console.log('[Auth] Starting Apple NATIVE sign in...');

      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );

      console.log('[Auth] Requesting Apple credentials via native API...');

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      console.log('[Auth] Apple credential received, checking identity token...');

      if (!credential.identityToken) {
        throw new Error('No identity token returned from Apple');
      }

      console.log('[Auth] Identity token received, signing in with Supabase...');

      const { data, error: signInError } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });

      if (signInError) {
        console.error('[Auth] Supabase Apple sign in error:', signInError);
        throw new Error(signInError.message);
      }

      if (data.user) {
        const fullName = credential.fullName;
        const name = fullName
          ? [fullName.givenName, fullName.familyName].filter(Boolean).join(' ')
          : undefined;
        
        await createUserProfile(data.user.id, data.user.email || '', {
          name: name || undefined,
        });
      }

      console.log('[Auth] Apple NATIVE sign in successful:', data.user?.email);
    } catch (err) {
      if ((err as { code?: string }).code === 'ERR_REQUEST_CANCELED') {
        console.log('[Auth] Apple sign in was canceled by user');
        setIsLoading(false);
        return;
      }
      const message = err instanceof Error ? err.message : 'Apple sign in failed';
      console.error('[Auth] Apple sign in failed:', message);
      setError(message);
      setIsLoading(false);
      throw err;
    }
  }, [createUserProfile]);

  const loginAsGuest = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }

      const guestEmail = `guest_${Date.now()}@guest.local`;
      const guestPassword = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: guestEmail,
        password: guestPassword,
      });

      if (signUpError) {
        console.error('Guest signup error:', signUpError);
        throw new Error(signUpError.message);
      }

      if (data.user) {
        await createUserProfile(data.user.id, guestEmail);
      }

      console.log('Guest user logged in:', data.user?.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Guest login failed';
      setError(message);
      setIsLoading(false);
      throw err;
    }
  }, [createUserProfile]);

  const updateProfile = useCallback(async (data: Partial<Omit<User, 'id'>>) => {
    if (!user) {
      throw new Error('No user logged in');
    }

    try {
      const updates: Partial<UserProfile> = {
        updated_at: new Date().toISOString(),
      };

      if (data.name !== undefined) updates.name = data.name || null;
      if (data.phone !== undefined) updates.phone = data.phone || null;
      if (data.address !== undefined) updates.address = data.address || null;
      if (data.profilePhoto !== undefined) updates.profile_photo = data.profilePhoto || null;
      if (data.email !== undefined) updates.email = data.email;

      if (!supabase) {
        throw new Error('Supabase is not configured');
      }

      const { error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (updateError) {
        console.error('Profile update error:', updateError.message || JSON.stringify(updateError));
        throw new Error(updateError.message || 'Failed to update profile');
      }

      const updatedUser: User = {
        ...user,
        ...data,
      };

      setUser(updatedUser);
      console.log('Profile updated:', updatedUser.email);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      setError(message);
      throw err;
    }
  }, [user]);

  return useMemo(() => ({
    user,
    isLoading,
    error,
    login,
    signup,
    signInWithApple,
    loginAsGuest,
    logout,
    updateProfile,
  }), [user, isLoading, error, login, signup, signInWithApple, loginAsGuest, logout, updateProfile]);
});

/**
 * Handles auth-based navigation (onboarding/login redirect). Lives in a separate component
 * so useRouter/useSegments are not called inside AuthProvider, which would change hook
 * order when expo-router renders +not-found and trigger "Rendered more hooks" errors.
 */
export function AuthNavigationSync() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const firstSegment = segments[0];
  const isNavigating = useRef(false);

  useEffect(() => {
    if (isLoading || isNavigating.current) return;

    const inAuthGroup = (firstSegment as string) === '(auth)';

    const checkOnboardingAndNavigate = async () => {
      if (!user && !inAuthGroup) {
        isNavigating.current = true;
        const hasSeenOnboarding = await AsyncStorage.getItem(ONBOARDING_KEY);
        setTimeout(() => {
          if (hasSeenOnboarding) {
            router.replace('/(auth)/login' as any);
          } else {
            router.replace('/(auth)/onboarding' as any);
          }
          setTimeout(() => {
            isNavigating.current = false;
          }, 500);
        }, 0);
      } else if (user && inAuthGroup) {
        isNavigating.current = true;
        setTimeout(() => {
          router.replace('/(tabs)');
          setTimeout(() => {
            isNavigating.current = false;
          }, 500);
        }, 0);
      }
    };

    void checkOnboardingAndNavigate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading, firstSegment]);

  return null;
}
