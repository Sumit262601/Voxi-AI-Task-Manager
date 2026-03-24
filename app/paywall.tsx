import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  Linking,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check, Crown, Sparkles, Shield, Clock, Headphones, CalendarDays, Zap, Star } from 'lucide-react-native';
import { usePurchases } from '@/contexts/purchases';
import { PurchasesPackage } from 'react-native-purchases';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type BillingPeriod = 'weekly' | 'monthly' | 'yearly';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  tagline: string;
  icon: typeof Crown;
  accent: string;
  accentLight: string;
  price: string;
  period: string;
  popular?: boolean;
  savings?: string;
  features: PlanFeature[];
}

const WEEKLY_PLANS: Plan[] = [
  {
    id: 'premium_weekly',
    name: 'Weekly',
    tagline: 'Try it out',
    icon: Clock,
    accent: '#34D399',
    accentLight: 'rgba(52, 211, 153, 0.15)',
    price: '$12.99',
    period: '/wk',
    features: [
      { text: '5 tasks per day', included: true },
      { text: 'Cloud sync', included: true },
      { text: 'Custom themes', included: true },
      { text: 'Calendar access', included: true },
      { text: 'AI Task Assistant', included: false },
      { text: 'Advanced analytics', included: false },
      { text: 'Priority support', included: false },
    ],
  },
];

const MONTHLY_PLANS: Plan[] = [
  {
    id: 'premium_monthly',
    name: 'Monthly',
    tagline: 'Most Popular',
    icon: CalendarDays,
    accent: '#F59E0B',
    accentLight: 'rgba(245, 158, 11, 0.15)',
    price: '$19.99',
    period: '/mo',
    popular: true,
    features: [
      { text: '25 tasks per day', included: true },
      { text: 'Cloud sync', included: true },
      { text: 'Custom themes', included: true },
      { text: 'AI Task Assistant', included: true },
      { text: 'Calendar access', included: true },
      { text: 'Advanced analytics', included: false },
      { text: 'Priority support', included: false },
    ],
  },
];

const YEARLY_PLANS: Plan[] = [
  {
    id: 'pro_yearly',
    name: 'Yearly',
    tagline: 'All Access',
    icon: Crown,
    accent: '#A78BFA',
    accentLight: 'rgba(167, 139, 250, 0.15)',
    price: '$39.99',
    period: '/yr',
    features: [
      { text: 'Unlimited tasks', included: true },
      { text: 'Custom themes', included: true },
      { text: 'AI Task Assistant', included: true },
      { text: 'Calendar access', included: true },
      { text: 'Advanced analytics', included: true },
      { text: 'Priority support', included: true },
      { text: 'All features included', included: true },
    ],
  },
];

const LIGHT = {
  bg: '#F5F5F0',
  card: '#FFFFFF',
  cardBorder: '#E8E8E2',
  text: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textMuted: '#8E8E8E',
  surface: '#FFFFFF',
  accent: '#F59E0B',
};

export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    currentOffering,
    purchasePackage,
    restorePurchases,
    isPurchasing,
    isRestoring,
    isLoading,
    error,
  } = usePurchases();

  const showWeekly = Platform.OS !== 'android';
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string>('premium_monthly');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const cardSlide = useRef(new Animated.Value(60)).current;
  const featuresSlide = useRef(new Animated.Value(80)).current;
  const btnScale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 40,
          friction: 12,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(cardSlide, {
        toValue: 0,
        tension: 40,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.spring(featuresSlide, {
        toValue: 0,
        tension: 40,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.spring(btnScale, {
        toValue: 1,
        tension: 50,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, cardSlide, featuresSlide, btnScale]);

  const packages = currentOffering?.availablePackages ?? [];
  const activePlans = billingPeriod === 'weekly' ? WEEKLY_PLANS : billingPeriod === 'monthly' ? MONTHLY_PLANS : YEARLY_PLANS;
  const periodAccent = activePlans[0]?.accent ?? LIGHT.accent;
  const periodAccentLight = activePlans[0]?.accentLight ?? 'rgba(245, 158, 11, 0.15)';

  useEffect(() => {
    if (billingPeriod === 'weekly') {
      setSelectedPlan('premium_weekly');
    } else if (billingPeriod === 'yearly') {
      setSelectedPlan('pro_yearly');
    } else {
      setSelectedPlan('premium_monthly');
    }
  }, [billingPeriod]);

  const getPackageForPlan = (planId: string): PurchasesPackage | undefined => {
    if (planId === 'premium_weekly') {
      return packages.find(pkg => {
        const id = (pkg.identifier ?? '').toLowerCase();
        return id.includes('weekly') || id === '$rc_weekly';
      });
    }
    if (planId === 'premium_monthly') {
      return packages.find(pkg => {
        const id = (pkg.identifier ?? '').toLowerCase();
        return id === '$rc_monthly' || id.includes('monthly');
      });
    }
    if (planId === 'pro_yearly') {
      return packages.find(pkg => {
        const id = (pkg.identifier ?? '').toLowerCase();
        return id.includes('annual') || id.includes('yearly') || id === '$rc_annual';
      });
    }
    return packages.find(pkg => {
      const id = (pkg.identifier ?? '').toLowerCase();
      const productId = (pkg.product?.identifier ?? '').toLowerCase();
      return id.includes(planId) || productId.includes(planId);
    });
  };

  const handlePurchase = async () => {
    const pkg = getPackageForPlan(selectedPlan);
    if (!pkg) {
      console.log('No package found for plan:', selectedPlan);
      return;
    }
    try {
      const info = await purchasePackage(pkg);
      console.log('[Paywall] Purchase completed, entitlements:', Object.keys(info.entitlements.active));
      await new Promise(resolve => setTimeout(resolve, 500));
      router.back();
    } catch {
      console.log('Purchase cancelled or failed');
    }
  };

  const handleRestore = async () => {
    try {
      const info = await restorePurchases();
      console.log('[Paywall] Restore completed, entitlements:', Object.keys(info.entitlements.active));
      await new Promise(resolve => setTimeout(resolve, 500));
      router.back();
    } catch {
      console.log('Restore failed');
    }
  };

  const getPlanPrice = (planId: string): string => {
    const pkg = getPackageForPlan(planId);
    if (pkg) return pkg.product.priceString;
    const allPlans = [...WEEKLY_PLANS, ...MONTHLY_PLANS, ...YEARLY_PLANS];
    return allPlans.find(p => p.id === planId)?.price ?? '';
  };

  const selectedPlanData = activePlans.find(p => p.id === selectedPlan) ?? activePlans[0];

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContent}>
          <View style={styles.loadingGlow}>
            <Crown size={32} color={LIGHT.accent} />
          </View>
          <Text style={styles.loadingText}>Loading plans...</Text>
        </View>
      </View>
    );
  }

  const displayPrice = getPlanPrice(selectedPlan) || selectedPlanData?.price;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.topGlow, { top: -100 }]} />

      <TouchableOpacity
        style={[styles.closeBtn, { top: insets.top + 12 }]}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <X size={18} color={LIGHT.textSecondary} />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.header,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.crownContainer}>
            <View style={styles.crownGlow} />
            <LinearGradient
              colors={['#F59E0B', '#F97316']}
              style={styles.crownBadge}
            >
              <Crown size={22} color="#fff" />
            </LinearGradient>
          </View>

          <Text style={styles.title}>Unlock Premium</Text>
          <Text style={styles.subtitle}>
            Supercharge your productivity with powerful features
          </Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.toggleSection,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.toggleBar}>
            {((['weekly', 'monthly', 'yearly'] as BillingPeriod[]).filter(p => p !== 'weekly' || showWeekly)).map((period) => {
              const active = billingPeriod === period;
              const label = period === 'weekly' ? 'Weekly' : period === 'monthly' ? 'Monthly' : 'Yearly';
              return (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.toggleItem,
                    active && [
                      styles.toggleItemActive,
                      {
                        borderColor: periodAccent,
                        backgroundColor: periodAccentLight,
                      },
                    ],
                  ]}
                  onPress={() => setBillingPeriod(period)}
                  activeOpacity={0.8}
                >
                  {period === 'monthly' && (
                    <View style={[styles.popularPill, { backgroundColor: MONTHLY_PLANS[0].accent }]}>
                      <Text style={styles.popularPillText}>Most Popular</Text>
                    </View>
                  )}
                  <Text style={[styles.toggleLabel, active && [styles.toggleLabelActive, { color: periodAccent }]]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.planSection,
            { opacity: fadeAnim, transform: [{ translateY: cardSlide }] },
          ]}
        >
          {activePlans.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            const IconComp = plan.icon;
            const price = getPlanPrice(plan.id);

            return (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  isSelected && { borderColor: plan.accent, borderWidth: 2 },
                ]}
                onPress={() => setSelectedPlan(plan.id)}
                activeOpacity={0.85}
              >
                {plan.popular && (
                  <View style={[styles.bestBadge, { backgroundColor: plan.accent }]}>
                    <Sparkles size={10} color="#fff" />
                    <Text style={styles.bestBadgeText}>BEST VALUE</Text>
                  </View>
                )}

                <View style={styles.planCardInner}>
                  <View style={[styles.planIcon, { backgroundColor: plan.accentLight }]}>
                    <IconComp size={20} color={plan.accent} />
                  </View>

                  <View style={styles.planDetails}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={[styles.planTag, { color: plan.accent }]}>{plan.tagline}</Text>
                  </View>

                  <View style={styles.planPricing}>
                    <Text style={[styles.planPrice, isSelected && { color: plan.accent }]}>
                      {price || plan.price}
                    </Text>
                    <Text style={styles.planPeriod}>{plan.period}</Text>
                  </View>

                  <View style={[styles.radio, isSelected && { borderColor: plan.accent }]}>
                    {isSelected && <View style={[styles.radioFill, { backgroundColor: plan.accent }]} />}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        <Animated.View
          style={[
            styles.featuresCard,
            { opacity: fadeAnim, transform: [{ translateY: featuresSlide }] },
          ]}
        >
          <View style={styles.featuresHeader}>
            <Star size={14} color={selectedPlanData?.accent ?? LIGHT.accent} />
            <Text style={styles.featuresTitle}>
              What&apos;s included in {activePlans.find(p => p.id === selectedPlan)?.name ?? 'Monthly'}
            </Text>
          </View>

          <View style={styles.featuresList}>
            {selectedPlanData?.features.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <View
                  style={[
                    styles.featureIcon,
                    {
                      backgroundColor: feature.included
                        ? (selectedPlanData.accentLight ?? 'rgba(245,158,11,0.15)')
                        : 'rgba(0,0,0,0.06)',
                    },
                  ]}
                >
                  {feature.included ? (
                    <Check size={12} color={selectedPlanData.accent} strokeWidth={3} />
                  ) : (
                    <X size={12} color={LIGHT.textMuted} />
                  )}
                </View>
                <Text
                  style={[
                    styles.featureLabel,
                    !feature.included && styles.featureLabelOff,
                  ]}
                >
                  {feature.text}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View style={[styles.trustRow, { opacity: fadeAnim }]}>
          <View style={styles.trustChip}>
            <Shield size={13} color="#34D399" />
            <Text style={styles.trustChipText}>Secure</Text>
          </View>
          <View style={styles.trustDot} />
          <View style={styles.trustChip}>
            <Clock size={13} color="#A78BFA" />
            <Text style={styles.trustChipText}>Cancel anytime</Text>
          </View>
          <View style={styles.trustDot} />
          <View style={styles.trustChip}>
            <Headphones size={13} color="#F59E0B" />
            <Text style={styles.trustChipText}>24/7 Support</Text>
          </View>
        </Animated.View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <TouchableOpacity
            style={[styles.ctaBtn, isPurchasing && { opacity: 0.6 }]}
            onPress={handlePurchase}
            disabled={isPurchasing}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#F59E0B', '#F97316']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}
            >
              {isPurchasing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Zap size={18} color="#fff" />
                  <Text style={styles.ctaText}>
                    Continue — {displayPrice}{selectedPlanData?.period}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          style={styles.restoreBtn}
          onPress={handleRestore}
          disabled={isRestoring}
          activeOpacity={0.7}
        >
          {isRestoring ? (
            <ActivityIndicator color={LIGHT.textSecondary} size="small" />
          ) : (
            <Text style={styles.restoreText}>Restore Purchases</Text>
          )}
        </TouchableOpacity>

        <View style={styles.legalSection}>
          <Text style={styles.terms}>
            Payment will be charged to your Apple ID account at confirmation of purchase. Subscription automatically renews unless it is cancelled at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period. You can manage and cancel your subscriptions by going to your account settings on the App Store after purchase.
          </Text>
          <View style={styles.legalLinks}>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://voxi-task-manager.com/terms')}
              activeOpacity={0.7}
            >
              <Text style={styles.legalLink}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.legalDot}>·</Text>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://voxi-task-manager.com/privacy')}
              activeOpacity={0.7}
            >
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LIGHT.bg,
  },
  topGlow: {
    position: 'absolute' as const,
    left: SCREEN_WIDTH * 0.15,
    width: SCREEN_WIDTH * 0.7,
    height: 260,
    borderRadius: 200,
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 20,
  },
  loadingGlow: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  loadingText: {
    color: LIGHT.textSecondary,
    fontSize: 15,
    fontWeight: '500' as const,
  },
  closeBtn: {
    position: 'absolute' as const,
    right: 18,
    zIndex: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: LIGHT.cardBorder,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  scroll: {
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center' as const,
    marginBottom: 32,
  },
  crownContainer: {
    marginBottom: 18,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  crownGlow: {
    position: 'absolute' as const,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  crownBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  title: {
    fontSize: 34,
    fontWeight: '800' as const,
    color: LIGHT.text,
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: LIGHT.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 22,
    maxWidth: 260,
  },
  toggleSection: {
    marginBottom: 20,
  },
  toggleBar: {
    flexDirection: 'row' as const,
    backgroundColor: LIGHT.card,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: LIGHT.cardBorder,
  },
  toggleItem: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 11,
    borderRadius: 11,
    gap: 4,
  },
  toggleItemActive: {
    backgroundColor: LIGHT.surface,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: LIGHT.textMuted,
  },
  toggleLabelActive: {
    color: LIGHT.text,
  },
  popularPill: {
    backgroundColor: LIGHT.accent,
    top: -12,
    position: 'absolute' as const,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  popularPillText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  planSection: {
    gap: 10,
    marginBottom: 20,
  },
  planCard: {
    backgroundColor: LIGHT.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: LIGHT.cardBorder,
    padding: 16,
    overflow: 'hidden' as const,
  },
  bestBadge: {
    position: 'absolute' as const,
    top: 0,
    right: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 6,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  bestBadgeText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: '#fff',
    letterSpacing: 0.5,
  },
  planCardInner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  planIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  planDetails: {
    marginLeft: 14,
    flex: 1,
  },
  planName: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: LIGHT.text,
    marginBottom: 2,
  },
  planTag: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  planPricing: {
    alignItems: 'flex-end' as const,
    marginRight: 14,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: LIGHT.text,
  },
  planPeriod: {
    fontSize: 11,
    color: LIGHT.textSecondary,
    fontWeight: '500' as const,
    marginTop: 1,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: LIGHT.cardBorder,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  radioFill: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  featuresCard: {
    backgroundColor: LIGHT.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: LIGHT.cardBorder,
    padding: 20,
    marginBottom: 20,
  },
  featuresHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 16,
  },
  featuresTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: LIGHT.text,
  },
  featuresList: {
    gap: 13,
  },
  featureRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  featureIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  featureLabel: {
    fontSize: 14,
    color: LIGHT.text,
    fontWeight: '500' as const,
    flex: 1,
  },
  featureLabelOff: {
    color: LIGHT.textMuted,
  },
  trustRow: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 24,
    gap: 10,
  },
  trustChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
  },
  trustChipText: {
    fontSize: 12,
    color: LIGHT.textSecondary,
    fontWeight: '500' as const,
  },
  trustDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: LIGHT.textMuted,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    textAlign: 'center' as const,
    fontWeight: '500' as const,
  },
  ctaBtn: {
    borderRadius: 16,
    overflow: 'hidden' as const,
    marginBottom: 10,
  },
  ctaGradient: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 18,
    gap: 8,
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  billingNote: {
    textAlign: 'center' as const,
    fontSize: 13,
    color: LIGHT.textSecondary,
    marginBottom: 8,
  },
  restoreBtn: {
    paddingVertical: 14,
    alignItems: 'center' as const,
  },
  restoreText: {
    color: LIGHT.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
    textDecorationLine: 'underline' as const,
  },
  legalSection: {
    marginTop: 4,
    gap: 10,
  },
  terms: {
    fontSize: 10,
    color: LIGHT.textMuted,
    textAlign: 'center' as const,
    lineHeight: 15,
  },
  legalLinks: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 8,
  },
  legalLink: {
    fontSize: 12,
    color: LIGHT.accent,
    fontWeight: '600' as const,
    textDecorationLine: 'underline' as const,
  },
  legalDot: {
    fontSize: 14,
    color: LIGHT.textMuted,
    fontWeight: '700' as const,
  },
});
