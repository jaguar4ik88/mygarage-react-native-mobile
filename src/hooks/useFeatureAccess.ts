import { useState, useEffect } from 'react';
import { User } from '../types';

interface FeatureAccess {
  hasFeature: (feature: string) => boolean;
  planType: string;
  isPro: boolean;
  isPremium: boolean;
  isBusiness: boolean;
  features: string[];
}

export const useFeatureAccess = (user: User | null): FeatureAccess => {
  const [planType, setPlanType] = useState<string>('free');
  const [features, setFeatures] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      // For now, always return 'free' plan (MVP phase)
      // Later this will come from user.plan_type
      const currentPlan = user.plan_type || 'free';
      setPlanType(currentPlan);
      
      // Get features for current plan
      const planFeatures = getPlanFeatures(currentPlan);
      setFeatures(planFeatures);
    }
  }, [user]);

  const hasFeature = (feature: string): boolean => {
    return features.includes(feature);
  };

  const isPro = planType === 'pro' || planType === 'premium' || planType === 'business';
  const isPremium = planType === 'premium' || planType === 'business';
  const isBusiness = planType === 'business';

  return {
    hasFeature,
    planType,
    isPro,
    isPremium,
    isBusiness,
    features,
  };
};

const getPlanFeatures = (planType: string): string[] => {
  const features = {
    free: [
      'vehicles_limit_1',
      'reminders_unlimited', // unlimited - users can delete reminders
      'basic_reminders',
      'basic_manual',
      'basic_advice',
      'sto_search',
      'basic_reports',
    ],
    pro: [
      'vehicles_limit_3',
      'reminders_unlimited',
      'photo_documents',
      'fuel_tracking',
      'mileage_tracking',
      'advanced_analytics',
      'smart_reminders',
      'widgets',
      'export_data',
      'advanced_reports',
    ],
    premium: [
      'vehicles_unlimited',
      'reminders_unlimited',
      'gps_integration',
      'obd_diagnosis',
      'ai_assistant',
      'checklists',
      'gamification',
      'cloud_backup',
      'api_integrations',
    ],
    business: [
      'vehicles_unlimited',
      'reminders_unlimited',
      'client_management',
      'business_reports',
      '1c_integration',
      'master_app',
      'business_analytics',
    ]
  };

  return features[planType as keyof typeof features] || features.free;
};
