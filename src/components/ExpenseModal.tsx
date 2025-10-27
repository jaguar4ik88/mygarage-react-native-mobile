import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Icon from './Icon';
import Input from './Input';
import DateInput from './DateInput';
import Button from './Button';
import { COLORS, FONTS, SPACING } from '../constants';
import { ServiceHistory, Vehicle } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface ExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any, receiptPhoto?: any) => Promise<void>;
  editingRecord: ServiceHistory | null;
  vehicles: Vehicle[];
  expenseTypes: Array<{ id: number; slug: string; name: string }>;
  initialVehicleId?: number | null;
  userCurrency: string;
  isPro: boolean;
}

const ExpenseModal: React.FC<ExpenseModalProps> = ({
  visible,
  onClose,
  onSubmit,
  editingRecord,
  vehicles,
  expenseTypes,
  initialVehicleId,
  userCurrency,
  isPro,
}) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    vehicle_id: '',
    expense_type_id: '',
    description: '',
    cost: '',
    service_date: '',
  });
  const [receiptPhoto, setReceiptPhoto] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  const [imageError, setImageError] = useState(false);

  // Функция для попытки загрузки с разными URL
  const tryLoadImage = async (photoPath: string) => {
    // Если это уже полный URL, используем его
    if (photoPath.startsWith('http')) {
      return photoPath;
    }

    // Сначала попробуем через новый API эндпоинт для чеков
    if (editingRecord?.id) {
      const apiUrl = `https://mygarage.uno/api/expenses/${editingRecord.id}/receipt`;
      
      try {
        const response = await fetch(apiUrl, { method: 'HEAD' });
        if (response.ok) {
          return apiUrl;
        }
      } catch (error) {
        // Silent fail
      }
    }

    const baseUrls = [
      'https://mygarage.uno/storage/',  // Основной домен (через симлинк)
      'https://mygarage.uno/api/storage/',  // API эндпоинт для фото
      'https://mygarage.uno/public/storage/',  // Через public/storage
      'https://mygarage.uno/www/storage/app/public/',  // Прямой путь
      'https://mygarage.app/storage/'   // Альтернативный домен
    ];

    // Попробуем все URL по очереди
    for (let i = 0; i < baseUrls.length; i++) {
      const testUrl = baseUrls[i] + photoPath;
      
      try {
        const response = await fetch(testUrl, { method: 'HEAD' });
        if (response.ok) {
          return testUrl;
        }
      } catch (error) {
        // Silent fail
      }
    }
    
    // Если ничего не работает, используем fallback
    return 'https://via.placeholder.com/300x200/ff0000/ffffff?text=File+Not+Saved+On+Server';
  };

  useEffect(() => {
    if (visible) {
      // Сбрасываем все состояния при открытии
      setReceiptPhoto(null);
      setCurrentImageUrl('');
      setImageError(false);
      
      if (editingRecord) {
        setFormData({
          vehicle_id: editingRecord.vehicle_id.toString(),
          expense_type_id: (editingRecord as any).expense_type_id ? String((editingRecord as any).expense_type_id) : '',
          description: editingRecord.description,
          cost: editingRecord.cost.toString(),
          service_date: editingRecord.service_date.split('T')[0],
        });
        // Если у записи есть фото, показываем его
        if (editingRecord.receipt_photo) {
          // Сбрасываем состояние ошибки
          setImageError(false);
          
          // Асинхронно загружаем правильный URL
          const loadPhoto = async () => {
            let workingUrl: string;
            if (editingRecord.receipt_photo!.startsWith('http')) {
              workingUrl = editingRecord.receipt_photo!;
            } else {
              const result = await tryLoadImage(editingRecord.receipt_photo!);
              workingUrl = result || '';
            }
            
            setCurrentImageUrl(workingUrl);
            setReceiptPhoto({ 
              uri: workingUrl,
              isExisting: true
            });
          };
          
          loadPhoto();
        } else {
          setReceiptPhoto(null);
        }
      } else {
        setFormData({
          vehicle_id: initialVehicleId?.toString() || '',
          expense_type_id: expenseTypes[0]?.id ? String(expenseTypes[0].id) : '',
          description: '',
          cost: '',
          service_date: new Date().toISOString().split('T')[0],
        });
        setReceiptPhoto(null);
      }
      setErrors({});
    }
  }, [visible, editingRecord, initialVehicleId, expenseTypes]);

  const pickReceiptPhoto = async () => {
    if (!isPro) {
      Alert.alert('PRO функция', 'Добавление фото чеков доступно только для PRO подписчиков');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Ошибка', 'Необходимо разрешение для доступа к фото');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setReceiptPhoto(result.assets[0]);
      setCurrentImageUrl(result.assets[0].uri);
      setImageError(false);
    }
  };

  const takeReceiptPhoto = async () => {
    if (!isPro) {
      Alert.alert('PRO функция', 'Добавление фото чеков доступно только для PRO подписчиков');
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Ошибка', 'Необходимо разрешение для доступа к камере');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setReceiptPhoto(result.assets[0]);
      setCurrentImageUrl(result.assets[0].uri);
      setImageError(false);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.vehicle_id) {
      newErrors.vehicle_id = t('expenseModal.vehicleRequired');
    }
    if (!formData.expense_type_id) {
      newErrors.expense_type_id = t('expenseModal.vehicleRequired');
    }
    if (!formData.cost) {
      newErrors.cost = t('expenseModal.costRequired');
    } else if (isNaN(Number(formData.cost))) {
      newErrors.cost = t('expenseModal.costMustBeNumber');
    }
    if (!formData.service_date) {
      newErrors.service_date = t('expenseModal.dateRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitForm = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await onSubmit(formData, receiptPhoto);
      onClose();
    } catch (error: any) {
      Alert.alert(t('expenseModal.error'), error.message || t('expenseModal.saveError'));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={20} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.title}>
              {editingRecord ? t('expenseModal.editTitle') : t('expenseModal.title')}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.content}>
              {/* Выбор автомобиля */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('expenseModal.vehicle')} {t('expenseModal.required')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {vehicles.map((vehicle) => (
                    <TouchableOpacity
                      key={vehicle.id}
                      style={[
                        styles.vehicleOption,
                        formData.vehicle_id === vehicle.id.toString() && styles.vehicleOptionActive,
                      ]}
                      onPress={() => handleInputChange('vehicle_id', vehicle.id.toString())}
                    >
                      <Text style={[
                        styles.vehicleOptionText,
                        formData.vehicle_id === vehicle.id.toString() && styles.vehicleOptionTextActive,
                      ]}>
                        {vehicle.make} {vehicle.model}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {errors.vehicle_id && <Text style={styles.errorText}>{errors.vehicle_id}</Text>}
              </View>

              {/* Тип траты */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('expenseModal.expenseType')} {t('expenseModal.required')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {expenseTypes.map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.typeOption,
                        formData.expense_type_id === type.id.toString() && styles.typeOptionActive,
                      ]}
                      onPress={() => handleInputChange('expense_type_id', type.id.toString())}
                    >
                      <Text style={[
                        styles.typeOptionText,
                        formData.expense_type_id === type.id.toString() && styles.typeOptionTextActive,
                      ]}>
                        {type.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {errors.expense_type_id && <Text style={styles.errorText}>{errors.expense_type_id}</Text>}
              </View>

              <Input
                label={`${t('expenseModal.cost')} ${t('expenseModal.required')}`}
                value={formData.cost}
                onChangeText={(value) => handleInputChange('cost', value)}
                keyboardType="numeric"
                placeholder={`0 ${userCurrency}`}
                error={errors.cost}
              />

              <DateInput
                label={t('expenseModal.date')}
                value={formData.service_date}
                onDateChange={(value: string) => handleInputChange('service_date', value)}
                error={errors.service_date}
              />

              <Input
                label={t('expenseModal.description')}
                value={formData.description}
                onChangeText={(value) => handleInputChange('description', value)}
                placeholder={t('expenseModal.description')}
                multiline
                numberOfLines={3}
              />


              {/* Фото чека (PRO) */}
              <View style={styles.formGroup}>
                <View style={styles.receiptHeader}>
                  <Text style={styles.label}>{t('expenseModal.receiptPhoto')}</Text>
                  {!isPro && (
                    <View style={styles.proBadge}>
                      <Text style={styles.proBadgeText}>PRO</Text>
                    </View>
                  )}
                </View>

                {isPro ? (
                  <>
                    <View style={styles.receiptButtons}>
                      <TouchableOpacity
                        style={styles.receiptButton}
                        onPress={takeReceiptPhoto}
                      >
                        <Icon name="camera" size={24} color={COLORS.accent} />
                        <Text style={styles.receiptButtonText}>{t('expenseModal.takePhoto')}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.receiptButton}
                        onPress={pickReceiptPhoto}
                      >
                        <Icon name="image" size={24} color={COLORS.accent} />
                        <Text style={styles.receiptButtonText}>{t('expenseModal.chooseFromGallery')}</Text>
                      </TouchableOpacity>
                    </View>

                    {receiptPhoto && (
                      <View style={styles.receiptPreview}>
                        <TouchableOpacity
                          onPress={() => setShowImageModal(true)}
                          style={styles.imageContainer}
                        >
                          <Image
                            source={{ 
                              uri: imageError 
                                ? 'https://via.placeholder.com/300x200/ff0000/ffffff?text=Image+Not+Found'
                                : currentImageUrl || receiptPhoto.uri 
                            }}
                            style={styles.receiptImage}
                            resizeMode="cover"
                            onError={() => {
                              setImageError(true);
                            }}
                            onLoad={() => {
                              setImageError(false);
                            }}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.removeReceiptButton}
                          onPress={() => {
                            setReceiptPhoto(null);
                            setCurrentImageUrl('');
                            setImageError(false);
                          }}
                        >
                          <Icon name="close" size={20} color={COLORS.background} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.lockedFeature}>
                    <Icon name="lock" size={32} color={COLORS.textMuted} />
                    <Text style={styles.lockedText}>
                      {t('expenseModal.receiptProOnly')}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.modalButtons}>
                <Button
                  title={t('expenseModal.cancel')}
                  onPress={onClose}
                  variant="outline"
                  disabled={loading}
                  style={{ flex: 1, marginRight: SPACING.sm }}
                />
                <Button
                  title={loading ? `${t('expenseModal.save')}...` : t('expenseModal.save')}
                  onPress={handleSubmitForm}
                  disabled={loading}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      
      {/* Модальное окно для увеличения фото */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity
            style={styles.imageModalCloseArea}
            onPress={() => setShowImageModal(false)}
          >
            <View style={styles.imageModalContent}>
              <TouchableOpacity
                style={styles.imageModalCloseButton}
                onPress={() => setShowImageModal(false)}
              >
                <Icon name="close" size={24} color={COLORS.background} />
              </TouchableOpacity>
              {receiptPhoto && (
                <Image
                  source={{ uri: receiptPhoto.uri }}
                  style={styles.imageModalImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
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
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeButton: {
    padding: SPACING.sm,
  },
  title: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
  },
  formGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  vehicleOption: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  vehicleOptionActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  vehicleOptionText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.text,
  },
  vehicleOptionTextActive: {
    color: COLORS.background,
    fontFamily: FONTS.medium,
  },
  typeOption: {
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 100,
  },
  typeOptionActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  typeOptionText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    textAlign: 'center',
  },
  typeOptionTextActive: {
    color: COLORS.background,
    fontFamily: FONTS.medium,
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  proBadge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: SPACING.sm,
  },
  proBadgeText: {
    color: COLORS.background,
    fontSize: 10,
    fontFamily: FONTS.bold,
  },
  receiptButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  receiptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  receiptButtonText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.text,
    marginLeft: SPACING.xs,
  },
  receiptPreview: {
    marginTop: SPACING.md,
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  receiptImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removeReceiptButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: COLORS.error,
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    flex: 1,
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalCloseArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContent: {
    width: '90%',
    height: '80%',
    position: 'relative',
  },
  imageModalCloseButton: {
    position: 'absolute',
    top: SPACING.lg,
    right: SPACING.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  imageModalImage: {
    width: '100%',
    height: '100%',
  },
  lockedFeature: {
    padding: SPACING.xl,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  lockedText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    fontFamily: FONTS.regular,
    marginTop: SPACING.xs,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
  },
});

export default ExpenseModal;

