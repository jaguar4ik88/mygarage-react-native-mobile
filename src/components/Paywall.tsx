import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import Modal from 'react-native-modal';
import Icon from './Icon';
import Button from './Button';
import { COLORS, FONTS, SPACING } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';

interface PaywallProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  feature: string;
}

const Paywall: React.FC<PaywallProps> = ({ visible, onClose, onUpgrade, feature }) => {
  const { t } = useLanguage();

  // Маппинг snake_case (из базы) в camelCase (для переводов)
  const featureAliasMap: { [key: string]: string } = {
    'photo_documents': 'photoDocuments',
    'receipt_photos': 'receiptPhotos',
    'pdf_export': 'pdfExport',
    'unlimited_vehicles': 'vehiclesManagement', // До 3 авто = управление автомобилями
    'unlimited_reminders': 'unlimitedReminders',
    'expense_reminders': 'expenseReminders',
  };

  const getFeatureInfo = (feature: string) => {
    const featureAlias = featureAliasMap[feature] || feature;
    
    return {
      title: t(`subscription.features.${featureAlias}`),
      description: t(`subscription.features.${featureAlias}Desc`),
    };
  };

  const featureInfo = getFeatureInfo(feature);

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection="down"
      style={styles.modal}
    >
      <View style={styles.container}>
        <View style={styles.modalHandle} />
        
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Icon name="close" size={24} color={COLORS.textMuted} />
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../assets/adaptive-icon-new.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.title}>{featureInfo.title}</Text>
            <Text style={styles.description}>{featureInfo.description}</Text>
            <View style={styles.proFeaturesContainer}>
              <Text style={styles.proTitle}>{t('paywall.whatYouGet')}</Text>
              
              <View style={styles.featureItem}>
                <Icon name="check" size={20} color={COLORS.success} />
                <Text style={styles.featureText}>{t('paywall.benefitVehicles')}</Text>
              </View>

              <View style={styles.featureItem}>
                <Icon name="check" size={20} color={COLORS.success} />
                <Text style={styles.featureText}>{t('paywall.benefitReminders')}</Text>
              </View>

              <View style={styles.featureItem}>
                <Icon name="check" size={20} color={COLORS.success} />
                <Text style={styles.featureText}>{t('paywall.benefitDocuments')}</Text>
              </View>

              <View style={styles.featureItem}>
                <Icon name="check" size={20} color={COLORS.success} />
                <Text style={styles.featureText}>{t('paywall.benefitPdf')}</Text>
              </View>

              <View style={styles.featureItem}>
                <Icon name="check" size={20} color={COLORS.success} />
                <Text style={styles.featureText}>{t('paywall.benefitNotifications')}</Text>
              </View>
            </View>

            <View style={styles.priceContainer}>
              <Text style={styles.priceText}>$4.99</Text>
              <Text style={styles.perMonth}>{t('paywall.perMonth')}</Text>
            </View>

            <Button
              title={t('paywall.upgradeToPro')}
              onPress={onUpgrade}
              style={styles.upgradeButton}
            />

            <TouchableOpacity onPress={onClose} style={styles.noThanksButton}>
              <Text style={styles.noThanksText}>{t('paywall.noThanks')}</Text>
            </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  container: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    position: 'relative',
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  closeButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.md,
    zIndex: 10,
    padding: SPACING.xs,
  },
  content: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  logoContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  description: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 18,
  },
  proFeaturesContainer: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  proTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  featureText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: SPACING.lg,
  },
  priceText: {
    fontSize: 36,
    fontFamily: FONTS.bold,
    color: COLORS.accent,
  },
  perMonth: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  upgradeButton: {
    width: '100%',
    marginBottom: SPACING.md,
  },
  noThanksButton: {
    padding: SPACING.md,
  },
  noThanksText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});

export default Paywall;

