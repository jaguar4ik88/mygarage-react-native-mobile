import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Icon from './Icon';
import Input from './Input';
import DateInput from './DateInput';
import Button from './Button';
import { COLORS, FONTS, SPACING, BASE_URL, RADIUS, hexToRgba } from '../constants';
import { ServiceHistory, Vehicle } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

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
  const { appearanceKey } = useTheme();
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
      const apiUrl = `${BASE_URL}/api/expenses/${editingRecord.id}/receipt`;
      
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
      `${BASE_URL}/storage/`,  // Основной домен (через симлинк)
      `${BASE_URL}/api/storage/`,  // API эндпоинт для фото
      `${BASE_URL}/public/storage/`,  // Через public/storage
      `${BASE_URL}/www/storage/app/public/`,  // Прямой путь
      'https://mygarage.app/storage/'   // Альтернативный домен (fallback)
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

  const styles = useMemo(() => {
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
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.sm,
        paddingBottom: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        backgroundColor: COLORS.background,
      },
      headerTextBlock: {
        flex: 1,
        paddingRight: SPACING.md,
        minWidth: 0,
      },
      headerEyebrow: {
        fontFamily: FONTS.semiBold,
        fontSize: 10,
        letterSpacing: 1.6,
        textTransform: 'uppercase',
        color: COLORS.textMuted,
        marginBottom: 6,
      },
      headerTitle: {
        fontFamily: FONTS.bold,
        fontSize: 18,
        lineHeight: 24,
        letterSpacing: -0.2,
        color: COLORS.text,
      },
      closeButton: {
        padding: SPACING.xs,
        marginTop: 2,
        borderRadius: RADIUS.sm,
      },
      scrollView: {
        flex: 1,
      },
      scrollContent: {
        flexGrow: 1,
        paddingBottom: SPACING.xxl,
      },
      content: {
        padding: SPACING.lg,
      },
      formGroup: {
        marginBottom: SPACING.lg,
      },
      label: {
        fontSize: 11,
        fontFamily: FONTS.semiBold,
        color: COLORS.textSecondary,
        marginBottom: SPACING.sm,
        letterSpacing: 2,
        textTransform: 'uppercase',
      },
      chipsScrollContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: SPACING.lg,
      },
      chip: {
        marginRight: SPACING.sm,
        paddingHorizontal: SPACING.md,
        paddingVertical: 6,
        borderRadius: RADIUS.pill,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.surface,
      },
      chipActive: {
        borderColor: COLORS.accent,
        backgroundColor: hexToRgba(COLORS.accent, 0.12),
      },
      chipText: {
        fontFamily: FONTS.medium,
        fontSize: 12,
        color: COLORS.textSecondary,
      },
      chipTextActive: {
        color: COLORS.accent,
        fontFamily: FONTS.semiBold,
      },
      typeChip: {
        alignItems: 'center',
        minWidth: 100,
      },
      receiptHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
      },
      proBadge: {
        backgroundColor: hexToRgba(COLORS.accent, 0.22),
        paddingHorizontal: SPACING.sm,
        paddingVertical: 2,
        borderRadius: RADIUS.pill,
        marginLeft: SPACING.sm,
        borderWidth: 1,
        borderColor: hexToRgba(COLORS.accent, 0.35),
      },
      proBadgeText: {
        color: COLORS.accent,
        fontSize: 10,
        fontFamily: FONTS.bold,
      },
      receiptButtons: {
        flexDirection: 'row',
        gap: SPACING.sm,
        flexWrap: 'nowrap',
      },
      receiptButton: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.sm,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.surface,
      },
      receiptButtonText: {
        fontFamily: FONTS.semiBold,
        fontSize: 12,
        color: COLORS.accent,
      },
      receiptPreview: {
        marginTop: SPACING.md,
        position: 'relative',
        borderRadius: RADIUS.xl,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
      },
      receiptImage: {
        width: '100%',
        height: 200,
        borderRadius: RADIUS.xl,
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
        backgroundColor: hexToRgba(COLORS.shadow, 0.92),
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
        backgroundColor: hexToRgba(COLORS.surface, 0.85),
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
      },
      imageModalImage: {
        width: '100%',
        height: '100%',
      },
      lockedFeature: {
        padding: SPACING.xl,
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.card,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
      },
      lockedText: {
        fontSize: 14,
        fontFamily: FONTS.regular,
        color: COLORS.textMuted,
        marginTop: SPACING.sm,
        textAlign: 'center',
      },
      errorText: {
        color: COLORS.error,
        fontSize: 12,
        fontFamily: FONTS.regular,
        marginTop: SPACING.xs,
      },
      inputField: {
        borderRadius: RADIUS.xl,
        backgroundColor: COLORS.surface,
      },
      dateFieldTrigger: {
        borderRadius: RADIUS.xl,
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
  }, [appearanceKey]);

  const renderContent = () => (
    <View style={styles.content}>
      {/* Выбор автомобиля */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('expenseModal.vehicle')} {t('expenseModal.required')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled={true}
          contentContainerStyle={styles.chipsScrollContent}
        >
          {vehicles.map((vehicle) => (
            <TouchableOpacity
              key={vehicle.id}
              style={[
                styles.chip,
                formData.vehicle_id === vehicle.id.toString() && styles.chipActive,
              ]}
              onPress={() => handleInputChange('vehicle_id', vehicle.id.toString())}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.chipText,
                  formData.vehicle_id === vehicle.id.toString() && styles.chipTextActive,
                ]}
                numberOfLines={1}
              >
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled={true}
          contentContainerStyle={styles.chipsScrollContent}
        >
          {expenseTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.chip,
                styles.typeChip,
                formData.expense_type_id === type.id.toString() && styles.chipActive,
              ]}
              onPress={() => handleInputChange('expense_type_id', type.id.toString())}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.chipText,
                  formData.expense_type_id === type.id.toString() && styles.chipTextActive,
                ]}
              >
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
        labelStyle={styles.label}
        inputStyle={styles.inputField}
      />

      <DateInput
        label={t('expenseModal.date')}
        value={formData.service_date}
        onDateChange={(value: string) => handleInputChange('service_date', value)}
        error={errors.service_date}
        labelStyle={styles.label}
        fieldStyle={styles.dateFieldTrigger}
      />

      <Input
        label={t('expenseModal.description')}
        value={formData.description}
        onChangeText={(value) => handleInputChange('description', value)}
        placeholder={t('expenseModal.description')}
        multiline
        numberOfLines={3}
        labelStyle={styles.label}
        inputStyle={styles.inputField}
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
                activeOpacity={0.85}
              >
                <Icon name="camera" size={18} color={COLORS.accent} />
                <Text style={styles.receiptButtonText} numberOfLines={1} ellipsizeMode="tail">
                  {t('expenseModal.takePhoto')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.receiptButton}
                onPress={pickReceiptPhoto}
                activeOpacity={0.85}
              >
                <Icon name="image" size={18} color={COLORS.accent} />
                <Text style={styles.receiptButtonText} numberOfLines={1} ellipsizeMode="tail">
                  {t('expenseModal.chooseFromGallery')}
                </Text>
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
                  <Icon name="close" size={20} color={COLORS.text} />
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

      <TouchableOpacity
        style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
        onPress={handleSubmitForm}
        disabled={loading}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={t('common.save')}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.background} />
        ) : (
          <Text style={styles.primaryBtnText}>{t('common.save').toUpperCase()}</Text>
        )}
      </TouchableOpacity>

      <Button
        title={t('common.cancel')}
        onPress={onClose}
        variant="outline"
        disabled={loading}
        style={styles.cancelOutline}
      />
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {Platform.OS === 'ios' ? (
          <KeyboardAvoidingView
            style={styles.keyboardAvoidingView}
            behavior="padding"
            keyboardVerticalOffset={0}
          >
            <View style={styles.header}>
              <View style={styles.headerTextBlock}>
                <Text style={styles.headerEyebrow}>{t('expenseModal.formEyebrow')}</Text>
                <Text style={styles.headerTitle} numberOfLines={2}>
                  {editingRecord ? t('expenseModal.editTitle') : t('expenseModal.title')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Icon name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
              automaticallyAdjustKeyboardInsets={true}
            >
              {renderContent()}
            </ScrollView>
          </KeyboardAvoidingView>
        ) : (
          <>
            <View style={styles.header}>
              <View style={styles.headerTextBlock}>
                <Text style={styles.headerEyebrow}>{t('expenseModal.formEyebrow')}</Text>
                <Text style={styles.headerTitle} numberOfLines={2}>
                  {editingRecord ? t('expenseModal.editTitle') : t('expenseModal.title')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Icon name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
            >
              {renderContent()}
            </ScrollView>
          </>
        )}
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
                <Icon name="close" size={24} color={COLORS.text} />
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

export default ExpenseModal;

