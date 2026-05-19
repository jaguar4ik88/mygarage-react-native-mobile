import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Input from '../components/Input';
import Modal from 'react-native-modal';
import Icon from '../components/Icon';
import ScreenBackLink from '../components/ScreenBackLink';
import { COLORS, FONTS, SPACING, RADIUS, hexToRgba } from '../constants';
import ApiService from '../services/api';
import ExternalApiService from '../services/externalApi';
import { Vehicle } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface AddCarScreenProps {
  onCarAdded: (vehicle: Vehicle) => void;
  onBack: () => void;
  navigation?: any;
}

const AddCarScreen: React.FC<AddCarScreenProps> = ({ onCarAdded, onBack, navigation: navigationProp }) => {
  const { t } = useLanguage();
  const { appearanceKey } = useTheme();
  const styles = useMemo(() => createStyles(), [appearanceKey]);
  const hookNavigation = useNavigation();
  const navigation = navigationProp ?? hookNavigation;
  const { isGuest, promptToLogin, user } = useAuth();
  const [method, setMethod] = useState<'vin' | 'engine' | 'manual'>('vin');
  const [loading, setLoading] = useState(false);
  const [vinLoading, setVinLoading] = useState(false);
  const [formData, setFormData] = useState({
    vin: '',
    year: '',
    maker: '',
    model: '',
    engine: '',
    mileage: '',
  });
  // Separate state per tab to avoid cross-updates
  const [engineForm, setEngineForm] = useState({
    year: '',
    maker: '',
    model: '',
    engine: '',
  });
  const [manualForm, setManualForm] = useState({
    year: '',
    maker: '',
    model: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [makers, setMakers] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [trims, setTrims] = useState<any[]>([]);
  const [picker, setPicker] = useState<{type: 'make'|'model'|'engine'|null, visible: boolean, items: string[]}>({type: null, visible: false, items: []});
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadCarMakers();
  }, []);

  const loadCarMakers = async () => {
    try {
      const carMakers = await ExternalApiService.getCarMakers();
      setMakers(carMakers);
    } catch (error) {
      console.error('Error loading car makers:', error);
    }
  };

  const loadCarModels = async (maker: string, year?: number) => {
    try {
      const carModels = await ExternalApiService.getCarModels(maker, year);
      setModels(carModels);
    } catch (error) {
      console.error('Error loading car models:', error);
    }
  };

  const loadCarYears = async (maker: string) => {
    try {
      const carYears = await ExternalApiService.getCarYears(maker);
      setYears(carYears);
    } catch (error) {
      console.error('Error loading car years:', error);
    }
  };

  const loadCarTrims = async (maker: string, model: string, year?: number) => {
    try {
      const carTrims = await ExternalApiService.getCarTrims(maker, model, year);
      setTrims(carTrims);
    } catch (error) {
      console.error('Error loading car trims:', error);
    }
  };

  const handleVinDecode = async () => {
    const vin = (formData.vin || '').trim().toUpperCase();
    if (!vin) {
      setErrors({ vin: t('addCar.errors.vinRequired') });
      return;
    }
    if (vin.length !== 17) {
      setErrors({ vin: t('addCar.errors.vinLength') });
      return;
    }

    setVinLoading(true);
    try {
      const decodedData = await ExternalApiService.decodeVin(vin);
      if (decodedData) {
        setFormData(prev => ({
          ...prev,
          vin,
          year: decodedData.year ? decodedData.year.toString() : '',
          maker: decodedData.make || '',
          model: decodedData.model || '',
          engine: decodedData.engine || '',
        }));
        setErrors({});
        Alert.alert(t('addCar.success'), t('addCar.vinDataFilled'));
      } else {
        Alert.alert(
          t('addCar.vinNotFound'),
          t('addCar.vinNotFoundMessage'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('addCar.selectManually'), onPress: () => setMethod('manual') },
          ]
        );
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('addCar.vinDecodeError'));
    } finally {
      setVinLoading(false);
    }
  };

  const handleMakeChangeEngine = (maker: string) => {
    setEngineForm(prev => ({ ...prev, maker, model: '', engine: '' }));
    setModels([]);
    setTrims([]);
  };

  const handleYearChange = (year: string) => {
    if (method === 'engine') {
      setEngineForm(prev => ({ ...prev, year }));
    } else if (method === 'manual') {
      setManualForm(prev => ({ ...prev, year }));
    } else {
      setFormData(prev => ({ ...prev, year }));
    }
  };

  const handleModelChangeEngine = (model: string) => {
    setEngineForm(prev => ({ ...prev, model, engine: '' }));
    setTrims([]);
  };

  const handleTrimChange = (trim: any) => {
    const label = (trim && (trim.engine || trim.trim_engine)) ? (trim.engine || trim.trim_engine) : (typeof trim === 'string' ? trim : '');
    setEngineForm(prev => ({ ...prev, engine: label }));
  };

  const openPicker = async (type: 'make'|'model'|'engine') => {
    try {
      setSearch('');
      if (type === 'make') {
        if (makers.length === 0) await loadCarMakers();
        setPicker({ type, visible: true, items: makers });
      } else if (type === 'model') {
        if (!engineForm.maker) {
          Alert.alert(t('common.information'), t('addCar.errors.makeRequired'));
          return;
        }
        const modelsData = await ExternalApiService.getCarModels(engineForm.maker, engineForm.year ? parseInt(engineForm.year) : undefined);
        setModels(modelsData);
        setPicker({ type, visible: true, items: modelsData });
      } else {
        if (!engineForm.maker || !engineForm.model) {
          Alert.alert(t('common.information'), t('addCar.errors.modelRequired'));
          return;
        }
        const trimsData = await ExternalApiService.getCarTrims(engineForm.maker, engineForm.model, engineForm.year ? parseInt(engineForm.year) : undefined);
        setTrims(trimsData);
        setPicker({ type, visible: true, items: trimsData.map(t => t.engine || t.trim_engine || '').filter(Boolean) });
      }
    } catch (e) {
      console.error('openPicker error', e);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (method === 'vin') {
      if (!formData.vin) {
        newErrors.vin = t('addCar.errors.vinRequired');
      }
      // Проверяем, что декодированные данные заполнены
      if (!formData.year) newErrors.year = t('addCar.errors.yearNotFromVin');
      if (!formData.maker) newErrors.make = t('addCar.errors.makeNotFromVin');
      if (!formData.model) newErrors.model = t('addCar.errors.modelNotFromVin');
      if (!formData.engine) newErrors.engine = t('addCar.errors.engineNotFromVin');
    } else {
      if (method === 'engine') {
        if (!engineForm.year) newErrors.year = t('addCar.errors.yearRequired');
        if (!engineForm.maker) newErrors.make = t('addCar.errors.makeRequired');
        if (!engineForm.model) newErrors.model = t('addCar.errors.modelRequired');
        if (!engineForm.engine) newErrors.engine = t('addCar.errors.engineRequired');
      } else if (method === 'manual') {
        if (!manualForm.year) newErrors.year = t('addCar.errors.yearRequired');
        if (!manualForm.maker) newErrors.make = t('addCar.errors.makeRequired');
        if (!manualForm.model) newErrors.model = t('addCar.errors.modelRequired');
      }
    }

    if (!formData.mileage) {
      newErrors.mileage = t('addCar.errors.mileageRequired');
    } else if (isNaN(Number(formData.mileage))) {
      newErrors.mileage = t('addCar.errors.mileageMustBeNumber');
    }

    // Year bounds check for engine/manual
    const yearNum = method === 'engine' ? parseInt(engineForm.year || '0', 10)
      : method === 'manual' ? parseInt(manualForm.year || '0', 10)
      : parseInt(formData.year || '0', 10);
    if (Number.isFinite(yearNum) && yearNum > 0) {
      if (yearNum < 1900) {
        newErrors.year = t('addCar.errors.yearRequired');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    console.log('handleSubmit called with formData:', formData);
    console.log('method:', method);
    
    // Проверка на гостевой режим
    if (isGuest) {
      promptToLogin();
      return;
    }
    
    if (!validateForm()) {
      console.log('Validation failed, errors:', errors);
      return;
    }

    setLoading(true);
    try {
      console.log('Using API path');
        let vehicleData: Partial<Vehicle> = {};
        if (method === 'vin') {
          vehicleData = {
            vin: (formData.vin || '').trim().toUpperCase(),
            year: parseInt(formData.year),
            make: formData.maker,
            model: formData.model,
            engine_type: formData.engine,
            mileage: parseInt(formData.mileage),
          };
        } else if (method === 'engine') {
          vehicleData = {
            year: parseInt(engineForm.year),
            make: engineForm.maker,
            model: engineForm.model,
            engine_type: engineForm.engine,
            mileage: parseInt(formData.mileage),
          };
        } else {
          vehicleData = {
            year: parseInt(manualForm.year),
            make: manualForm.maker,
            model: manualForm.model,
            mileage: parseInt(formData.mileage),
          };
        }
        console.log('Vehicle data to send:', vehicleData);

        const vehicle = await ApiService.addVehicle(vehicleData);
        console.log('Vehicle created via API:', vehicle);
        onCarAdded(vehicle);
    } catch (error: any) {
      const showVehicleLimitAlert = () => {
        const planType = user?.plan_type || 'free';
        const message =
          planType === 'pro'
            ? t('subscription.vehicleLimitProMessage')
            : planType === 'premium'
              ? t('subscription.vehicleLimitPremiumMessage')
              : t('subscription.vehicleLimitFreeMessage');
        Alert.alert(t('subscription.proFeature'), message, [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('subscription.upgrade'),
            onPress: () => navigation.navigate('Subscription'),
          },
        ]);
      };

      // Проверка лимита подписки (это не ошибка, а бизнес-логика)
      if (error.upgrade_required || error.limit_reached) {
        showVehicleLimitAlert();
        return;
      }

      // Дополнительная проверка по тексту сообщения
      if (
        error.message &&
        (error.message.includes('maximum number of vehicles') ||
          error.message.includes('requires PRO subscription') ||
          error.message.includes('requires PREMIUM subscription'))
      ) {
        showVehicleLimitAlert();
        return;
      }
      
      // Только реальные ошибки логируем
      console.error('Error adding vehicle:', error);
      
      // Обрабатываем ошибки валидации от API
      if (error.message && error.message.includes('Validation error')) {
        Alert.alert(t('addCar.validationError'), t('addCar.checkDataCorrectness'));
      } else if (error.message && error.message.includes('vin has already been taken')) {
        Alert.alert(t('common.error'), t('addCar.vinAlreadyExists'));
      } else {
        Alert.alert(t('common.error'), t('addCar.failedToAddCar'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    const normalized = field === 'vin' ? value.toUpperCase() : value;
    setFormData(prev => ({ ...prev, [field]: normalized }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const showBack = typeof navigation.canGoBack === 'function' && navigation.canGoBack();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          contentContainerStyle={styles.scrollContent}
          onScrollBeginDrag={Keyboard.dismiss}
        >
          {showBack ? <ScreenBackLink onPress={onBack} /> : null}

          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>{t('addCar.title')}</Text>
            <Text style={styles.pageSub}>{t('addCar.pageSubtitle')}</Text>
          </View>

          <View style={styles.methodSegment}>
            <TouchableOpacity
              style={[styles.methodChip, method === 'vin' && styles.methodChipActive]}
              onPress={() => setMethod('vin')}
              activeOpacity={0.85}
            >
              <Text style={[styles.methodChipText, method === 'vin' && styles.methodChipTextActive]}>
                {t('addCar.methodVin')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.methodChip, method === 'engine' && styles.methodChipActive]}
              onPress={() => setMethod('engine')}
              activeOpacity={0.85}
            >
              <Text
                style={[styles.methodChipText, method === 'engine' && styles.methodChipTextActive]}
              >
                {t('addCar.methodEngine')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.methodChip, method === 'manual' && styles.methodChipActive]}
              onPress={() => setMethod('manual')}
              activeOpacity={0.85}
            >
              <Text
                style={[styles.methodChipText, method === 'manual' && styles.methodChipTextActive]}
              >
                {t('addCar.methodManual')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formStack}>
            {method === 'vin' ? (
              <View style={styles.panel}>
                <Input
                  label={t('addCar.vin')}
                  labelStyle={styles.fieldLabel}
                  containerStyle={styles.inputContainer}
                  inputStyle={styles.inputField}
                  value={formData.vin}
                  onChangeText={(value) => handleInputChange('vin', value)}
                  error={errors.vin}
                  autoCapitalize="characters"
                  maxLength={17}
                />
                <TouchableOpacity
                  style={[styles.outlineBtn, vinLoading && styles.btnMuted]}
                  onPress={handleVinDecode}
                  disabled={vinLoading}
                  activeOpacity={0.9}
                >
                  {vinLoading ? (
                    <ActivityIndicator color={COLORS.accent} />
                  ) : (
                    <Text style={styles.outlineBtnText}>{t('addCar.decodeVin')}</Text>
                  )}
                </TouchableOpacity>

                {(formData.year || formData.maker || formData.model || formData.engine) ? (
                  <View style={styles.decodedBox}>
                    <Text style={styles.decodedTitle}>{t('addCar.vinDecoded')}</Text>
                    {formData.year ? (
                      <View style={styles.decodedRow}>
                        <Text style={styles.decodedLabel}>{t('addCar.year')}</Text>
                        <Text style={styles.decodedValue}>{formData.year}</Text>
                      </View>
                    ) : null}
                    {formData.maker ? (
                      <View style={styles.decodedRow}>
                        <Text style={styles.decodedLabel}>{t('addCar.make')}</Text>
                        <Text style={styles.decodedValue}>{formData.maker}</Text>
                      </View>
                    ) : null}
                    {formData.model ? (
                      <View style={styles.decodedRow}>
                        <Text style={styles.decodedLabel}>{t('addCar.model')}</Text>
                        <Text style={styles.decodedValue}>{formData.model}</Text>
                      </View>
                    ) : null}
                    {formData.engine ? (
                      <View style={styles.decodedRow}>
                        <Text style={styles.decodedLabel}>{t('addCar.engine')}</Text>
                        <Text style={styles.decodedValue}>{formData.engine}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {(errors.year || errors.make || errors.model || errors.engine) ? (
                  <View style={styles.validationBox}>
                    <Text style={styles.validationTitle}>{t('addCar.validationErrors')}</Text>
                    {errors.year ? (
                      <Text style={styles.validationLine}>• {errors.year}</Text>
                    ) : null}
                    {errors.make ? (
                      <Text style={styles.validationLine}>• {errors.make}</Text>
                    ) : null}
                    {errors.model ? (
                      <Text style={styles.validationLine}>• {errors.model}</Text>
                    ) : null}
                    {errors.engine ? (
                      <Text style={styles.validationLine}>• {errors.engine}</Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : method === 'engine' ? (
              <View style={styles.panel}>
                <View style={styles.selectBlock}>
                  <Text style={styles.fieldLabel}>{t('addCar.make')}</Text>
                  <TouchableOpacity
                    style={styles.selectRow}
                    onPress={() => openPicker('make')}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.selectRowText} numberOfLines={1}>
                      {engineForm.maker || ''}
                    </Text>
                    <Icon name="chevron-right" size={16} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                  {errors.make ? <Text style={styles.fieldError}>{errors.make}</Text> : null}
                </View>

                <View style={styles.selectBlock}>
                  <Text style={styles.fieldLabel}>{t('addCar.model')}</Text>
                  <TouchableOpacity
                    style={styles.selectRow}
                    onPress={() => openPicker('model')}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.selectRowText} numberOfLines={1}>
                      {engineForm.model || ''}
                    </Text>
                    <Icon name="chevron-right" size={16} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                  {errors.model ? <Text style={styles.fieldError}>{errors.model}</Text> : null}
                </View>

                <View style={styles.selectBlock}>
                  <Text style={styles.fieldLabel}>{t('addCar.engine')}</Text>
                  <TouchableOpacity
                    style={styles.selectRow}
                    onPress={() => openPicker('engine')}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.selectRowText} numberOfLines={1}>
                      {engineForm.engine || ''}
                    </Text>
                    <Icon name="chevron-right" size={16} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                  {errors.engine ? <Text style={styles.fieldError}>{errors.engine}</Text> : null}
                </View>

                <Input
                  label={t('addCar.year')}
                  labelStyle={styles.fieldLabel}
                  containerStyle={styles.inputContainer}
                  inputStyle={styles.inputField}
                  value={engineForm.year}
                  onChangeText={(value) => handleYearChange(value)}
                  error={errors.year}
                  keyboardType="numeric"
                />
              </View>
            ) : (
              <View style={[styles.panel, styles.panelElevated]}>
                <Input
                  label={t('addCar.make')}
                  labelStyle={styles.fieldLabel}
                  containerStyle={styles.inputContainer}
                  inputStyle={styles.inputField}
                  value={manualForm.maker}
                  onChangeText={(value) => {
                    setManualForm((prev) => ({ ...prev, maker: value }));
                  }}
                  error={errors.make}
                  editable={true}
                  autoCorrect={false}
                  autoCapitalize="words"
                  keyboardType="default"
                  autoComplete="off"
                  textContentType="none"
                  returnKeyType="done"
                  blurOnSubmit={true}
                  enablesReturnKeyAutomatically={true}
                />
                <Input
                  label={t('addCar.model')}
                  labelStyle={styles.fieldLabel}
                  containerStyle={styles.inputContainer}
                  inputStyle={styles.inputField}
                  value={manualForm.model}
                  onChangeText={(value) => {
                    setManualForm((prev) => ({ ...prev, model: value }));
                  }}
                  error={errors.model}
                  editable={true}
                  autoCorrect={false}
                  autoCapitalize="characters"
                  keyboardType="default"
                  autoComplete="off"
                  textContentType="none"
                />
                <Input
                  label={t('addCar.year')}
                  labelStyle={styles.fieldLabel}
                  containerStyle={styles.inputContainer}
                  inputStyle={styles.inputField}
                  value={manualForm.year}
                  onChangeText={(value) => handleYearChange(value)}
                  error={errors.year}
                  keyboardType="numeric"
                  editable={true}
                />
              </View>
            )}

            <Input
              label={t('addCar.mileage')}
              labelStyle={styles.fieldLabel}
              containerStyle={styles.inputContainer}
              inputStyle={styles.inputField}
              value={formData.mileage}
              onChangeText={(value) => handleInputChange('mileage', value)}
              error={errors.mileage}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.btnMuted]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <Text style={styles.primaryBtnText}>{t('common.add').toUpperCase()}</Text>
              )}
            </TouchableOpacity>
          </View>

          <Modal
            isVisible={picker.visible}
            onBackdropPress={() => setPicker((prev) => ({ ...prev, visible: false }))}
          >
            <View style={styles.pickerSheet}>
              <Text style={styles.pickerTitle}>
                {picker.type === 'make'
                  ? t('addCar.make')
                  : picker.type === 'model'
                    ? t('addCar.model')
                    : t('addCar.engine')}
              </Text>
              <View style={styles.pickerSearchRow}>
                <TextInput
                  style={styles.pickerSearchInput}
                  value={search}
                  onChangeText={setSearch}
                  placeholderTextColor={COLORS.textMuted}
                />
                <Icon name="search" size={16} color={COLORS.textSecondary} />
              </View>
              <ScrollView style={styles.pickerList}>
                {picker.items
                  .filter((it) => it.toLowerCase().includes(search.toLowerCase()))
                  .map((it, idx) => {
                    const label = it;
                    const selected =
                      (picker.type === 'make' && engineForm.maker === label) ||
                      (picker.type === 'model' && engineForm.model === label) ||
                      (picker.type === 'engine' && engineForm.engine === label);
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={styles.pickerItem}
                        onPress={() => {
                          if (picker.type === 'make') handleMakeChangeEngine(label);
                          if (picker.type === 'model') handleModelChangeEngine(label);
                          if (picker.type === 'engine') handleTrimChange({ engine: label });
                          setPicker((prev) => ({ ...prev, visible: false }));
                        }}
                        activeOpacity={0.85}
                      >
                        <View style={styles.pickerRadioOuter}>
                          {selected ? <View style={styles.pickerRadioInner} /> : null}
                        </View>
                        <Text style={styles.pickerItemLabel}>{label}</Text>
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>
            </View>
          </Modal>
        </ScrollView>
      </KeyboardAvoidingView>

    </SafeAreaView>
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
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.xxl,
    },
    pageHeader: {
      paddingTop: SPACING.sm,
      marginBottom: SPACING.lg,
    },
    pageTitle: {
      fontFamily: FONTS.bold,
      fontSize: 28,
      letterSpacing: -0.4,
      color: COLORS.text,
      marginBottom: 6,
    },
    pageSub: {
      fontFamily: FONTS.regular,
      fontSize: 14,
      color: COLORS.textSecondary,
      lineHeight: 20,
    },
    methodSegment: {
      flexDirection: 'row',
      gap: SPACING.xs,
      padding: 4,
      marginBottom: SPACING.lg,
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    methodChip: {
      flex: 1,
      paddingVertical: SPACING.sm,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: RADIUS.lg,
    },
    methodChipActive: {
      backgroundColor: COLORS.accent,
    },
    methodChipText: {
      fontFamily: FONTS.medium,
      fontSize: 11,
      color: COLORS.textSecondary,
      textAlign: 'center',
    },
    methodChipTextActive: {
      color: COLORS.background,
    },
    formStack: {
      gap: SPACING.lg,
    },
    panel: {
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
      padding: SPACING.md,
      gap: SPACING.md,
    },
    panelElevated: {
      zIndex: 10,
    },
    fieldLabel: {
      fontFamily: FONTS.semiBold,
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: COLORS.textSecondary,
    },
    inputContainer: {
      marginBottom: 0,
    },
    inputField: {
      borderRadius: RADIUS.xl,
      backgroundColor: COLORS.background,
      borderWidth: 1,
      borderColor: COLORS.border,
      fontFamily: FONTS.regular,
      fontSize: 15,
    },
    selectBlock: {
      gap: SPACING.sm,
    },
    selectRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: RADIUS.xl,
      paddingHorizontal: SPACING.md,
      paddingVertical: 14,
      backgroundColor: COLORS.background,
      minHeight: 48,
    },
    selectRowText: {
      flex: 1,
      fontFamily: FONTS.regular,
      fontSize: 15,
      color: COLORS.text,
      marginRight: SPACING.sm,
    },
    fieldError: {
      color: COLORS.error,
      fontSize: 13,
      fontFamily: FONTS.regular,
      marginTop: SPACING.xs,
    },
    outlineBtn: {
      borderRadius: 999,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.background,
      minHeight: 48,
    },
    outlineBtnText: {
      fontFamily: FONTS.semiBold,
      fontSize: 13,
      color: COLORS.accent,
    },
    btnMuted: {
      opacity: 0.75,
    },
    decodedBox: {
      padding: SPACING.md,
      backgroundColor: hexToRgba(COLORS.accent, 0.08),
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: hexToRgba(COLORS.accent, 0.35),
      gap: SPACING.xs,
    },
    decodedTitle: {
      fontFamily: FONTS.bold,
      fontSize: 13,
      color: COLORS.accent,
      marginBottom: SPACING.xs,
    },
    decodedRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: SPACING.xs,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: COLORS.border,
    },
    decodedLabel: {
      fontFamily: FONTS.medium,
      fontSize: 13,
      color: COLORS.textSecondary,
    },
    decodedValue: {
      fontFamily: FONTS.semiBold,
      fontSize: 13,
      color: COLORS.text,
      flex: 1,
      textAlign: 'right',
      marginLeft: SPACING.md,
    },
    validationBox: {
      padding: SPACING.md,
      backgroundColor: hexToRgba(COLORS.error, 0.12),
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: COLORS.error,
      gap: SPACING.xs,
    },
    validationTitle: {
      fontFamily: FONTS.bold,
      fontSize: 13,
      color: COLORS.error,
    },
    validationLine: {
      fontFamily: FONTS.regular,
      fontSize: 13,
      color: COLORS.error,
    },
    primaryBtn: {
      backgroundColor: COLORS.accent,
      borderRadius: 999,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 52,
    },
    primaryBtnText: {
      fontFamily: FONTS.bold,
      fontSize: 13,
      letterSpacing: 1.4,
      color: COLORS.background,
    },
    pickerSheet: {
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.xl,
      padding: SPACING.md,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    pickerTitle: {
      fontFamily: FONTS.bold,
      fontSize: 16,
      letterSpacing: -0.2,
      color: COLORS.text,
      marginBottom: SPACING.sm,
    },
    pickerSearchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: RADIUS.xl,
      paddingHorizontal: SPACING.md,
      backgroundColor: COLORS.background,
    },
    pickerSearchInput: {
      flex: 1,
      color: COLORS.text,
      paddingVertical: SPACING.sm,
      marginRight: SPACING.sm,
      fontFamily: FONTS.regular,
      fontSize: 15,
    },
    pickerList: {
      maxHeight: 300,
      marginTop: SPACING.sm,
    },
    pickerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.md,
    },
    pickerRadioOuter: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: COLORS.accent,
      marginRight: SPACING.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pickerRadioInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: COLORS.accent,
    },
    pickerItemLabel: {
      fontFamily: FONTS.regular,
      fontSize: 15,
      color: COLORS.text,
      flex: 1,
    },
  });
}

export default AddCarScreen;

