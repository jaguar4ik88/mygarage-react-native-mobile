import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Card from './Card';
import Button from './Button';
import Input from './Input';
import Icon from './Icon';
import { COLORS, SPACING } from '../constants';
import ApiService from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
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
      Alert.alert(t('common.error'), t('sto.nameRequired') || 'Введите название');
      return;
    }

    try {
      setLoading(true);
      
      if (!userId) {
        Alert.alert(t('common.error'), 'User not found');
        return;
      }

      // Проверяем, является ли это редактированием существующей станции из БД
      const isEditingExistingStation = editingStation && 
        (editingStation as any).id && 
        typeof (editingStation as any).id === 'number' && 
        (editingStation as any).id < 1000000; // ID из БД обычно меньше 1M

      if (isEditingExistingStation) {
        // Редактирование существующей станции из БД
        await ApiService.updateUserStation((editingStation as any).id, station);
      } else {
        // Добавление новой станции (включая случаи с Google Place ID)
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
      onClose();
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
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={COLORS.textMuted} />
            </TouchableOpacity>
            <Text style={styles.title}>
              {editingStation ? t('common.edit') : t('common.add')} {t('sto.title')}
            </Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
              <View style={styles.form}>
                <Input
                  label={t('sto.name') || 'Название'}
                  value={station.name}
                  onChangeText={(value) => setStation(prev => ({ ...prev, name: value }))}
                  placeholder={t('sto.name') || 'Название'}
                />

                <Input
                  label={t('sto.description') || 'Описание'}
                  value={station.description}
                  onChangeText={(value) => setStation(prev => ({ ...prev, description: value }))}
                  placeholder={t('sto.description') || 'Описание'}
                  multiline
                  numberOfLines={3}
                />

                <Input
                  label={t('sto.phone') || 'Телефон'}
                  value={station.phone}
                  onChangeText={(value) => setStation(prev => ({ ...prev, phone: value }))}
                  placeholder={t('sto.phone') || 'Телефон'}
                  keyboardType="phone-pad"
                />

                <Input
                  label={t('sto.address') || 'Адрес'}
                  value={station.address}
                  onChangeText={(value) => setStation(prev => ({ ...prev, address: value }))}
                  placeholder={t('sto.address') || 'Адрес'}
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.buttons}>
                <Button
                  title={t('common.cancel')}
                  onPress={handleClose}
                  variant="outline"
                  style={styles.cancelButton}
                />
                <Button
                  title={t('common.save')}
                  onPress={handleSave}
                  loading={loading}
                  style={styles.saveButton}
                />
              </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  closeButton: {
    padding: SPACING.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40, // Для центрирования заголовка
  },
  scrollView: {
    flex: 1,
  },
  contentCard: {
    margin: SPACING.lg,
  },
  form: {
    gap: SPACING.lg,
    margin: SPACING.lg,
  },
  buttons: {
    flexDirection: 'row',
    gap: SPACING.md,
    margin: SPACING.lg,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
});

export default STOModal;
