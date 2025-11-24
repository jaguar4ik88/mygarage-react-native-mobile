import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from './Icon';
import { COLORS, FONTS, SPACING } from '../constants';
import SubscriptionService from '../services/SubscriptionService';
import Paywall from './Paywall';

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showPaywall?: boolean;
  onUpgrade?: () => void;
}

const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback,
  showPaywall = true,
  onUpgrade
}) => {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [showPaywallModal, setShowPaywallModal] = useState(false);

  useEffect(() => {
    checkAccess();
  }, [feature]);

  const checkAccess = async () => {
    try {
      const access = await SubscriptionService.checkAccess(feature);
      setHasAccess(access);
    } catch (error) {
      console.error('Error checking feature access:', error);
      setHasAccess(false);
    }
  };

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      setShowPaywallModal(true);
    }
  };

  // Показываем загрузку пока проверяем доступ
  if (hasAccess === null) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Проверка доступа...</Text>
      </View>
    );
  }

  // Если есть доступ, показываем контент
  if (hasAccess) {
    return <>{children}</>;
  }

  // Если нет доступа, показываем fallback или Paywall
  if (fallback) {
    return <>{fallback}</>;
  }

  if (showPaywall) {
    return (
      <>
        <View style={styles.noAccessContainer}>
          <Icon name="lock" size={24} color={COLORS.textMuted} />
          <Text style={styles.noAccessText}>
            Эта функция доступна только в PRO версии
          </Text>
          <TouchableOpacity 
            style={styles.upgradeButton}
            onPress={handleUpgrade}
          >
            <Text style={styles.upgradeButtonText}>
              Обновить до PRO
            </Text>
          </TouchableOpacity>
        </View>

        <Paywall
          visible={showPaywallModal}
          onClose={() => setShowPaywallModal(false)}
          onUpgrade={() => {
            setShowPaywallModal(false);
            handleUpgrade();
          }}
          feature={feature}
        />
      </>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  loadingContainer: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
  },
  noAccessContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    margin: SPACING.md,
  },
  noAccessText: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  upgradeButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 8,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.background,
  },
});

export default FeatureGate;