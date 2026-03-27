import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const SUPABASE_CALLBACK_URL = 'https://qalnqgvvmteisiycvhgv.supabase.co/auth/v1/callback';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are not set. Please configure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        storageKey: 'supabase-auth-session',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  : null;

export const isSupabaseConfigured = (): boolean => {
  return supabase !== null;
};

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  profile_photo: string | null;
  password_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskRecord {
  id: string;
  user_id: string;
  title: string;
  icon: string | null;
  time: string | null;
  duration: string | null;
  color: string | null;
  border_color: string | null;
  completed: boolean;
  completed_at: string | null;
  type: string;
  priority: string | null;
  priority_color: string | null;
  scheduled_date: string;
  alert_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionRecord {
  id: string;
  user_id: string;
  tier: 'free' | 'plus' | 'pro' | 'max';
  plan_name: string | null;
  status: 'active' | 'expired' | 'cancelled' | 'trial' | 'grace_period';
  product_id: string | null;
  store: 'app_store' | 'play_store' | 'stripe' | null;
  purchase_date: string | null;
  expiration_date: string | null;
  original_purchase_date: string | null;
  is_sandbox: boolean;
  will_renew: boolean;
  unsubscribe_detected_at: string | null;
  billing_issues_detected_at: string | null;
  price_amount: number | null;
  currency: string | null;
  daily_task_limit: number;
  ai_access: boolean;
  calendar_access: boolean;
  entitlements: string | null;
  created_at: string;
  updated_at: string;
}
