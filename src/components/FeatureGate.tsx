import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useLanguage } from '../contexts/LanguageContext';
import { COLORS, SPACING } from '../constants';
import Icon from './Icon';

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
  user: any;
}

const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
  user,
}) => {
  const { hasFeature, planType } = useFeatureAccess(user);
  const { t } = useLanguage();

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  const getRequiredPlan = (feature: string): string => {
    const featurePlans: Record<string, string> = {
      'photo_documents': 'Pro',
      'fuel_tracking': 'Pro',
      'mileage_tracking': 'Pro',
      'advanced_analytics': 'Pro',
      'smart_reminders': 'Pro',
      'widgets': 'Pro',
      'export_data': 'Pro',
      'gps_integration': 'Premium',
      'obd_diagnosis': 'Premium',
      'ai_assistant': 'Premium',
      'checklists': 'Premium',
      'gamification': 'Premium',
      'cloud_backup': 'Premium',
      'api_integrations': 'Premium',
      'client_management': 'Business',
      'business_reports': 'Business',
      '1c_integration': 'Business',
      'master_app': 'Business',
      'business_analytics': 'Business',
    };

    return featurePlans[feature] || 'Pro';
  };

  const requiredPlan = getRequiredPlan(feature);

  return (
    <View style={styles.upgradePrompt}>
      <View style={styles.upgradeContent}>
        <Icon name="lock" size={24} color={COLORS.accent} />
        <Text style={styles.upgradeTitle}>
          {t('subscription.featureLocked')}
        </Text>
        <Text style={styles.upgradeText}>
          {t('subscription.upgradeRequired', { plan: requiredPlan })}
        </Text>
        <TouchableOpacity style={styles.upgradeButton}>
          <Text style={styles.upgradeButtonText}>
            {t('subscription.upgradeTo', { plan: requiredPlan })}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  upgradePrompt: {
    margin: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  upgradeContent: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  upgradeText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  upgradeButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FeatureGate;
