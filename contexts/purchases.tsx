import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Platform, Linking, Alert } from 'react-native';
import Purchases, { 
  CustomerInfo, 
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, SubscriptionRecord } from '@/utils/supabase';
import { useAuth } from './auth';

/** App mode: development | preview | production (set in EAS build env or .env) */
const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV ?? (__DEV__ ? 'development' : 'production');

function getRCToken() {
  // Use test API key in all dev modes: local dev, development build, preview build, or web
  const useTestKey =
    __DEV__ ||
    Platform.OS === 'web' ||
    APP_ENV === 'development' ||
    APP_ENV === 'preview';

  if (useTestKey) {
    return process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
  }
  // Production only: use platform-specific keys
  return Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
    default: process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY,
  });
}

const apiKey = getRCToken();
let isConfigured = false;

if (apiKey && !isConfigured && Platform.OS !== 'web') {
  console.log('Configuring RevenueCat with API key');
  try {
    Purchases.configure({ apiKey });
    isConfigured = true;
  } catch (err) {
    console.warn('[RevenueCat] Failed to configure:', err);
  }
}

export type SubscriptionTier = 'free' | 'weekly' | 'monthly' | 'yearly';

function detectTierFromCustomerInfo(info: CustomerInfo | null): SubscriptionTier {
  if (!info) return 'free';

  const activeEntitlements = info.entitlements.active;
  const entitlementKeys = Object.keys(activeEntitlements);

  if (entitlementKeys.length === 0) return 'free';

  for (const key of entitlementKeys) {
    const entitlement = activeEntitlements[key];
    const productId = (entitlement.productIdentifier ?? '').toLowerCase();
    const entitlementId = key.toLowerCase();

    console.log('[Tier Detection] entitlement:', entitlementId, 'product:', productId);

    if (
      productId.includes('annual') ||
      productId.includes('yearly') ||
      productId.includes('year') ||
      entitlementId === 'max'
    ) {
      console.log('[Tier Detection] Detected yearly plan');
      return 'yearly';
    }

    if (
      productId.includes('monthly') ||
      productId.includes('month') ||
      entitlementId === 'pro'
    ) {
      console.log('[Tier Detection] Detected monthly plan');
      return 'monthly';
    }

    if (
      productId.includes('weekly') ||
      productId.includes('week') ||
      entitlementId === 'plus'
    ) {
      console.log('[Tier Detection] Detected weekly plan');
      return 'weekly';
    }
  }

  console.log('[Tier Detection] Fallback — has entitlements but unknown tier, defaulting to free');
  return 'free';
}

const PLAN_INFO: Record<SubscriptionTier, { name: string; price: string; shortName: string }> = {
  free: { name: 'Free Plan', price: '$0', shortName: 'Free' },
  weekly: { name: 'Weekly Plan', price: '$12.99/wk', shortName: 'Weekly' },
  monthly: { name: 'Monthly Plan', price: '$19.99/mo', shortName: 'Monthly' },
  yearly: { name: 'Yearly Plan', price: '$39.99/yr', shortName: 'Yearly' },
};

interface PurchasesState {
  tier: SubscriptionTier;
  isWeekly: boolean;
  isMonthly: boolean;
  isYearly: boolean;
  isPremium: boolean;
  isLoading: boolean;
  customerInfo: CustomerInfo | null;
  currentOffering: PurchasesOffering | null;
  purchasePackage: (pkg: PurchasesPackage) => Promise<CustomerInfo>;
  restorePurchases: () => Promise<CustomerInfo>;
  identifyUser: (userId: string) => Promise<void>;
  isPurchasing: boolean;
  isRestoring: boolean;
  error: string | null;
  canCreateTask: (todayTaskCount: number) => boolean;
  canUseAI: boolean;
  canUseCalendar: boolean;
  canUseAdvancedStats: boolean;
  dailyTaskLimit: number;
  planDisplayName: string;
  planPrice: string;
  expirationDate: string | null;
  willRenew: boolean;
  manageSubscription: () => void;
}

export const [PurchasesProvider, usePurchases] = createContextHook((): PurchasesState => {
  const [error, setError] = useState<string | null>(null);  
  const [isUserIdentified, setIsUserIdentified] = useState<boolean>(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const lastSyncedTier = useRef<string | null>(null);
  const identifyingRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isConfigured || !user?.id || Platform.OS === 'web') {
      setIsUserIdentified(false);
      return;
    }

    if (identifyingRef.current === user.id) return;
    identifyingRef.current = user.id;

    const identifyCurrentUser = async () => {
      try {
        console.log('[RevenueCat] Identifying user:', user.id);
        setIsUserIdentified(false);
        const { customerInfo } = await Purchases.logIn(user.id);
        console.log('[RevenueCat] User identified successfully');
        console.log('[RevenueCat] Active entitlements:', Object.keys(customerInfo.entitlements.active));
        console.log('[RevenueCat] App user ID:', customerInfo.originalAppUserId);
        queryClient.setQueryData(['customerInfo', user.id], customerInfo);
        setIsUserIdentified(true);
      } catch (err) {
        console.error('[RevenueCat] Failed to identify user:', err);
        identifyingRef.current = null;
        setIsUserIdentified(false);
      }
    };

    void identifyCurrentUser();
  }, [user?.id, queryClient]);

  useEffect(() => {
    if (!isConfigured || Platform.OS === 'web') return;
    if (user === null) {
      const logoutRC = async () => {
        try {
          console.log('[RevenueCat] User logged out, resetting to anonymous');
          setIsUserIdentified(false);
          identifyingRef.current = null;
          await Purchases.logOut();
          queryClient.removeQueries({ queryKey: ['customerInfo'] });
          queryClient.removeQueries({ queryKey: ['offerings'] });
          lastSyncedTier.current = null;
        } catch (err) {
          console.error('[RevenueCat] Failed to log out:', err);
        }
      };
      void logoutRC();
    }
  }, [user, queryClient]);

  const isNativePlatform = Platform.OS !== 'web';

  const customerInfoQuery = useQuery({
    queryKey: ['customerInfo', user?.id],
    queryFn: async () => {
      console.log('[RevenueCat] Fetching customer info for user:', user?.id);
      const info = await Purchases.getCustomerInfo();
      console.log('[RevenueCat] Customer info fetched, active entitlements:', Object.keys(info.entitlements.active));
      console.log('[RevenueCat] Original app user ID:', info.originalAppUserId);
      return info;
    },
    enabled: isConfigured && isNativePlatform && !!user?.id && isUserIdentified,
    staleTime: 1000 * 30,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const offeringsQuery = useQuery({
    queryKey: ['offerings', user?.id],
    queryFn: async () => {
      console.log('[RevenueCat] Fetching offerings');
      const offerings = await Purchases.getOfferings();
      console.log('[RevenueCat] Offerings fetched:', offerings.current?.identifier);
      console.log('[RevenueCat] Available packages:', offerings.current?.availablePackages.map(p => p.identifier));
      return offerings;
    },
    enabled: isConfigured && isNativePlatform && !!user?.id && isUserIdentified,
    staleTime: 1000 * 60 * 10,
    retry: 2,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      console.log('Purchasing package:', pkg.identifier);
      setError(null);
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      console.log('[Purchase] Completed, entitlements:', Object.keys(customerInfo.entitlements.active));
      return customerInfo;
    },
    onSuccess: async (customerInfo) => {
      console.log('[Purchase] Success, updating cache for user:', user?.id);
      queryClient.setQueryData(['customerInfo', user?.id], customerInfo);

      try {
        const freshInfo = await Purchases.getCustomerInfo();
        console.log('[Purchase] Fresh info fetched, entitlements:', Object.keys(freshInfo.entitlements.active));
        queryClient.setQueryData(['customerInfo', user?.id], freshInfo);
      } catch {
        console.log('[Purchase] Fresh fetch failed, using purchase return info');
      }

      void queryClient.invalidateQueries({ queryKey: ['customerInfo', user?.id] });
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Purchase failed';
      console.error('Purchase error:', message);
      if (!message.includes('cancelled') && !message.includes('canceled')) {
        setError(message);
      }
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      console.log('Restoring purchases');
      setError(null);
      const customerInfo = await Purchases.restorePurchases();
      console.log('[Restore] Completed, entitlements:', Object.keys(customerInfo.entitlements.active));
      return customerInfo;
    },
    onSuccess: async (customerInfo) => {
      console.log('[Restore] Success, updating cache for user:', user?.id);
      queryClient.setQueryData(['customerInfo', user?.id], customerInfo);

      try {
        const freshInfo = await Purchases.getCustomerInfo();
        console.log('[Restore] Fresh info fetched, entitlements:', Object.keys(freshInfo.entitlements.active));
        queryClient.setQueryData(['customerInfo', user?.id], freshInfo);
      } catch {
        console.log('[Restore] Fresh fetch failed, using restore return info');
      }

      void queryClient.invalidateQueries({ queryKey: ['customerInfo', user?.id] });
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Restore failed';
      console.error('Restore error:', message);
      setError(message);
    },
  });

  const identifyUser = useCallback(async (userId: string) => {
    if (!isConfigured || Platform.OS === 'web') return;
    try {
      console.log('[RevenueCat] Manual identify user:', userId);
      identifyingRef.current = userId;
      setIsUserIdentified(false);
      const { customerInfo: newInfo } = await Purchases.logIn(userId);
      queryClient.setQueryData(['customerInfo', userId], newInfo);
      setIsUserIdentified(true);
      console.log('[RevenueCat] Manual identify success, entitlements:', Object.keys(newInfo.entitlements.active));
    } catch (err) {
      console.error('[RevenueCat] Failed to identify user:', err);
      identifyingRef.current = null;
      setIsUserIdentified(false);
    }
  }, [queryClient]);

  useEffect(() => {
    if (!isConfigured || Platform.OS === 'web') return;

    const listener = (info: CustomerInfo) => {
      console.log('[RevenueCat] Customer info updated via listener, entitlements:', Object.keys(info.entitlements.active));
      if (user?.id) {
        queryClient.setQueryData(['customerInfo', user.id], info);
        void queryClient.invalidateQueries({ queryKey: ['customerInfo', user.id] });
      }
    };

    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, [queryClient, user?.id]);

  const customerInfo = customerInfoQuery.data ?? null;
  const tier = detectTierFromCustomerInfo(customerInfo);

  const isWeekly = tier === 'weekly';
  const isMonthly = tier === 'monthly';
  const isYearly = tier === 'yearly';
  const isPremium = tier !== 'free';

  const dailyTaskLimit = isYearly ? Infinity : isMonthly ? 25 : 5;
  const canUseAI = isMonthly || isYearly;
  const canUseCalendar = true; // Calendar is free for all users
  const canUseAdvancedStats = isMonthly || isYearly;

  const activeEntitlementKeys = Object.keys(customerInfo?.entitlements.active ?? {});
  const activeEntitlement = activeEntitlementKeys.length > 0
    ? customerInfo?.entitlements.active[activeEntitlementKeys[0]]
    : null;

  const expirationDate = activeEntitlement?.expirationDate ?? null;
  const willRenew = activeEntitlement?.willRenew ?? false;

  const planDisplayName = PLAN_INFO[tier].name;
  const planPrice = PLAN_INFO[tier].price;

  const manageSubscription = useCallback(() => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Manage Subscription',
        'Please manage your subscription through the App Store or Google Play Store on your device.',
      );
      return;
    }
    if (Platform.OS === 'ios') {
      void Linking.openURL('https://apps.apple.com/account/subscriptions');
    } else if (Platform.OS === 'android') {
      void Linking.openURL('https://play.google.com/store/account/subscriptions');
    }
  }, []);

  const syncSubscriptionToSupabase = useCallback(async (
    userId: string,
    currentTier: SubscriptionTier,
    info: CustomerInfo | null,
  ) => {
    if (!supabase || !userId) {
      console.log('[Subscription Sync] Skipping - no supabase or userId');
      return;
    }

    try {
      const activeEntitlements = info?.entitlements.active ?? {};
      const entitlementKeys = Object.keys(activeEntitlements);
      const entObj = entitlementKeys.length > 0 ? activeEntitlements[entitlementKeys[0]] : null;

      let status: SubscriptionRecord['status'] = 'active';
      if (currentTier === 'free') {
        status = 'expired';
      } else if (entObj?.billingIssueDetectedAt) {
        status = 'grace_period';
      } else if (entObj?.unsubscribeDetectedAt && !entObj?.willRenew) {
        status = 'cancelled';
      }

      let store: SubscriptionRecord['store'] = null;
      const storeValue = entObj?.store;
      if (storeValue === 'APP_STORE' || storeValue === 'MAC_APP_STORE') {
        store = 'app_store';
      } else if (storeValue === 'PLAY_STORE') {
        store = 'play_store';
      } else if (storeValue === 'STRIPE') {
        store = 'stripe';
      } else if (storeValue === 'RC_BILLING') {
        store = 'stripe';
      }

      const planNames: Record<SubscriptionTier, string> = {
        free: 'Free',
        weekly: 'Weekly - $12.99/wk',
        monthly: 'Monthly - $19.99/mo',
        yearly: 'Yearly - $39.99/yr',
      };

      const dailyLimits: Record<SubscriptionTier, number> = {
        free: 5,
        weekly: 5,
        monthly: 25,
        yearly: 999999,
      };

      const subscriptionData = {
        user_id: userId,
        tier: currentTier,
        plan_name: planNames[currentTier],
        status,
        product_id: entObj?.productIdentifier ?? null,
        store,
        purchase_date: entObj?.latestPurchaseDate ?? null,
        expiration_date: entObj?.expirationDate ?? null,
        original_purchase_date: entObj?.originalPurchaseDate ?? null,
        is_sandbox: entObj?.isSandbox ?? false,
        will_renew: entObj?.willRenew ?? false,
        unsubscribe_detected_at: entObj?.unsubscribeDetectedAt ?? null,
        billing_issues_detected_at: entObj?.billingIssueDetectedAt ?? null,
        price_amount: null as number | null,
        currency: null as string | null,
        daily_task_limit: dailyLimits[currentTier],
        ai_access: currentTier === 'monthly' || currentTier === 'yearly',
        calendar_access: currentTier === 'monthly' || currentTier === 'yearly',
        entitlements: entitlementKeys.length > 0 ? JSON.stringify(entitlementKeys) : null,
        updated_at: new Date().toISOString(),
      };

      console.log('[Subscription Sync] Syncing to Supabase:', {
        userId,
        tier: currentTier,
        status,
        store,
        productId: subscriptionData.product_id,
      });

      const { data: existing } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existing) {
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update(subscriptionData)
          .eq('user_id', userId);

        if (updateError) {
          console.error('[Subscription Sync] Update error:', updateError.message);
        } else {
          console.log('[Subscription Sync] Updated subscription record');
        }
      } else {
        const { error: insertError } = await supabase
          .from('subscriptions')
          .insert({
            ...subscriptionData,
            created_at: new Date().toISOString(),
          });

        if (insertError && insertError.code !== '23505') {
          console.error('[Subscription Sync] Insert error:', insertError.message);
        } else {
          console.log('[Subscription Sync] Created subscription record');
        }
      }
    } catch (err) {
      console.error('[Subscription Sync] Failed to sync:', err);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const tierKey = `${user.id}_${tier}`;
    if (lastSyncedTier.current === tierKey) return;
    lastSyncedTier.current = tierKey;

    console.log('[Subscription Sync] Tier changed, syncing:', tier);
    void syncSubscriptionToSupabase(user.id, tier, customerInfo);
  }, [user?.id, tier, customerInfo, syncSubscriptionToSupabase]);

  const canCreateTask = useCallback((todayTaskCount: number) => {
    if (isYearly) return true;
    if (isMonthly) return todayTaskCount < 25;
    return todayTaskCount < 5;
  }, [isYearly, isMonthly]);

  return useMemo(() => ({
    tier,
    isWeekly,
    isMonthly,
    isYearly,
    isPremium,
    isLoading: customerInfoQuery.isLoading || offeringsQuery.isLoading,
    customerInfo,
    currentOffering: offeringsQuery.data?.current ?? null,
    purchasePackage: purchaseMutation.mutateAsync,
    restorePurchases: restoreMutation.mutateAsync,
    identifyUser,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
    error,
    canCreateTask,
    canUseAI,
    canUseCalendar,
    canUseAdvancedStats,
    dailyTaskLimit,
    planDisplayName,
    planPrice,
    expirationDate,
    willRenew,
    manageSubscription,
  }), [
    tier, isWeekly, isMonthly, isYearly, isPremium,
    customerInfoQuery.isLoading, offeringsQuery.isLoading,
    customerInfo, offeringsQuery.data,
    purchaseMutation.mutateAsync, restoreMutation.mutateAsync,
    identifyUser, purchaseMutation.isPending, restoreMutation.isPending,
    error, canCreateTask, canUseAI, canUseCalendar, canUseAdvancedStats,
    dailyTaskLimit, planDisplayName, planPrice, expirationDate, willRenew,
    manageSubscription,
  ]);
});

export function useIsPremium() {
  const { isPremium } = usePurchases();
  return isPremium;
}

export function useSubscriptionTier() {
  const { tier, isWeekly, isMonthly, isYearly } = usePurchases();
  return { tier, isWeekly, isMonthly, isYearly };
}

export function useCanCreateTask() {
  const { canCreateTask, dailyTaskLimit, tier } = usePurchases();
  return { canCreateTask, dailyTaskLimit, tier };
}

export function useCanUseAI() {
  const { canUseAI, tier } = usePurchases();
  return { canUseAI, tier };
}

export function useCanUseCalendar() {
  const { canUseCalendar, tier } = usePurchases();
  return { canUseCalendar, tier };
}
