import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
  Pressable,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from './Button';
import Icon from './Icon';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants';
import ApiService from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { ServiceStation } from '../types';

interface STOModalProps {
  visible: boolean;
  onClose: () => void;
  onStationAdded: () => void;
  editingStation?: ServiceStation | null;
  userId: number | null;
}

const STOModal: React.FC<STOModalProps> = ({
  visible,
  onClose,
  onStationAdded,
  editingStation,
  userId,
}) => {
  const { t } = useLanguage();
  const { appearanceKey } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(), [appearanceKey]);

  const [loading, setLoading] = useState(false);
  const [station, setStation] = useState({
    name: '',
    description: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    if (editingStation) {
      setStation({
        name: editingStation.name || '',
        description: (editingStation as any).description || '',
        phone: editingStation.phone || '',
        address: editingStation.address || '',
      });
    } else {
      setStation({
        name: '',
        description: '',
        phone: '',
        address: '',
      });
    }
  }, [editingStation, visible]);

  const handleSave = async () => {
    if (!station.name.trim()) {
      Alert.alert(t('common.error'), t('sto.nameRequired'));
      return;
    }

    if (!userId) {
      Alert.alert(t('common.error'), t('sto.loginToSave'));
      return;
    }

    try {
      setLoading(true);

      const isEditingExistingStation =
        editingStation &&
        (editingStation as any).id &&
        typeof (editingStation as any).id === 'number' &&
        (editingStation as any).id < 1000000;

      if (isEditingExistingStation) {
        await ApiService.updateUserStation((editingStation as any).id, station);
      } else {
        const stationData = {
          ...station,
          latitude: (editingStation as any)?.latitude || 0,
          longitude: (editingStation as any)?.longitude || 0,
          rating: (editingStation as any)?.rating || 0,
          distance: (editingStation as any)?.distance || 0,
          types: (editingStation as any)?.types || [],
        };
        await ApiService.addUserStation(userId, stationData);
      }

      onStationAdded();
      handleClose();
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.message || t('sto.failedToLoadStations'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStation({
      name: '',
      description: '',
      phone: '',
      address: '',
    });
    onClose();
  };

  const modalTitle = editingStation ? t('common.edit') : t('sto.addStation');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.header}>
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [styles.headerClose, pressed && styles.pressed]}
              hitSlop={12}
            >
              <Icon name="close" size={22} color={COLORS.textSecondary} />
            </Pressable>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {modalTitle}
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={{
              paddingBottom: insets.bottom + SPACING.xxl,
              paddingHorizontal: SPACING.lg,
            }}
          >
            <View style={styles.form}>
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>{`${t('sto.name')} *`}</Text>
                <TextInput
                  style={styles.input}
                  value={station.name}
                  onChangeText={(value) => setStation((prev) => ({ ...prev, name: value }))}
                  placeholder={t('sto.name')}
                  placeholderTextColor={COLORS.textMuted}
                  selectionColor={COLORS.accent}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>{t('sto.description')}</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={station.description}
                  onChangeText={(value) => setStation((prev) => ({ ...prev, description: value }))}
                  placeholder={t('sto.description')}
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  selectionColor={COLORS.accent}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>{t('sto.phone')}</Text>
                <TextInput
                  style={styles.input}
                  value={station.phone}
                  onChangeText={(value) => setStation((prev) => ({ ...prev, phone: value }))}
                  placeholder={t('sto.phone')}
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="phone-pad"
                  selectionColor={COLORS.accent}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>{t('sto.address')}</Text>
                <TextInput
                  style={[styles.input, styles.textAreaSm]}
                  value={station.address}
                  onChangeText={(value) => setStation((prev) => ({ ...prev, address: value }))}
                  placeholder={t('sto.address')}
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  selectionColor={COLORS.accent}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <Text style={styles.primaryBtnText}>{t('common.save').toUpperCase()}</Text>
              )}
            </TouchableOpacity>

            <Button
              title={t('common.cancel')}
              onPress={handleClose}
              variant="outline"
              style={styles.cancelOutline}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

function createStyles() {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    keyboardAvoidingView: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: COLORS.border,
      backgroundColor: COLORS.background,
    },
    headerClose: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerSpacer: {
      width: 44,
    },
    pressed: {
      opacity: 0.65,
    },
    headerTitle: {
      flex: 1,
      fontFamily: FONTS.bold,
      fontSize: 18,
      letterSpacing: -0.3,
      color: COLORS.text,
      textAlign: 'center',
    },
    scrollView: {
      flex: 1,
    },
    form: {
      gap: SPACING.lg,
      paddingTop: SPACING.lg,
    },
    fieldBlock: {
      gap: SPACING.sm,
    },
    fieldLabel: {
      fontFamily: FONTS.semiBold,
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: COLORS.textSecondary,
    },
    input: {
      fontFamily: FONTS.regular,
      fontSize: 15,
      color: COLORS.text,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: RADIUS.xl,
      paddingHorizontal: SPACING.md,
      paddingVertical: 14,
    },
    textArea: {
      minHeight: 100,
      paddingTop: 14,
    },
    textAreaSm: {
      minHeight: 72,
      paddingTop: 14,
    },
    primaryBtn: {
      marginTop: SPACING.xl,
      backgroundColor: COLORS.accent,
      borderRadius: 999,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 52,
    },
    primaryBtnDisabled: {
      opacity: 0.75,
    },
    primaryBtnText: {
      fontFamily: FONTS.bold,
      fontSize: 13,
      letterSpacing: 1.4,
      color: COLORS.background,
    },
    cancelOutline: {
      marginTop: SPACING.md,
      borderRadius: 999,
    },
  });
}

export default STOModal;
