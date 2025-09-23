import * as React from 'react';
import { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from 'react-native-modal';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import Icon from '../components/Icon';
import { COLORS, FONTS, SPACING } from '../constants';
import ApiService from '../services/api';
import ExternalApiService from '../services/externalApi';
import { Vehicle } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface AddCarScreenProps {
  onCarAdded: (vehicle: Vehicle) => void;
  onBack: () => void;
}

const AddCarScreen: React.FC<AddCarScreenProps> = ({ onCarAdded, onBack }) => {
  const { t } = useLanguage();
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
    engine: '',
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
        if (!manualForm.engine) newErrors.engine = t('addCar.errors.engineRequired');
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
            engine_type: manualForm.engine,
            mileage: parseInt(formData.mileage),
          };
        }
        console.log('Vehicle data to send:', vehicleData);

        const vehicle = await ApiService.addVehicle(vehicleData);
        console.log('Vehicle created via API:', vehicle);
        onCarAdded(vehicle);
    } catch (error: any) {
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

  return (
    <SafeAreaView style={styles.container} edges={['top','left','right','bottom']}>
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

        <View style={styles.methodSelector}>
          <TouchableOpacity
            style={[styles.methodButton, method === 'vin' && styles.methodButtonActive]}
            onPress={() => setMethod('vin')}
          >
            <Text style={[styles.methodButtonText, method === 'vin' && styles.methodButtonTextActive]}>
              {t('addCar.methodVin')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.methodButton, method === 'engine' && styles.methodButtonActive]}
            onPress={() => setMethod('engine')}
          >
            <Text style={[styles.methodButtonText, method === 'engine' && styles.methodButtonTextActive]}>
              {t('addCar.methodEngine')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.methodButton, method === 'manual' && styles.methodButtonActive]}
            onPress={() => setMethod('manual')}
          >
            <Text style={[styles.methodButtonText, method === 'manual' && styles.methodButtonTextActive]}>
              {t('addCar.methodManual')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          {method === 'vin' ? (
            <Card>
              <Input
                label={t('addCar.vin')}
                value={formData.vin}
                onChangeText={(value) => handleInputChange('vin', value)}
                error={errors.vin}
                autoCapitalize="characters"
                maxLength={17}
              />
              <Button
                title={t('addCar.decodeVin')}
                onPress={handleVinDecode}
                loading={vinLoading}
                variant="outline"
              />
              
              {/* Показываем декодированные данные */}
              {(formData.year || formData.maker || formData.model || formData.engine) && (
                <View style={styles.decodedDataContainer}>
                  <Text style={styles.decodedDataTitle}>{t('addCar.vinDecoded')}</Text>
                  {formData.year && (
                    <View style={styles.decodedDataItem}>
                      <Text style={styles.decodedDataLabel}>{t('addCar.year')}:</Text>
                      <Text style={styles.decodedDataValue}>{formData.year}</Text>
                    </View>
                  )}
                  {formData.maker && (
                    <View style={styles.decodedDataItem}>
                      <Text style={styles.decodedDataLabel}>{t('addCar.make')}:</Text>
                      <Text style={styles.decodedDataValue}>{formData.maker}</Text>
                    </View>
                  )}
                  {formData.model && (
                    <View style={styles.decodedDataItem}>
                      <Text style={styles.decodedDataLabel}>{t('addCar.model')}:</Text>
                      <Text style={styles.decodedDataValue}>{formData.model}</Text>
                    </View>
                  )}
                  {formData.engine && (
                    <View style={styles.decodedDataItem}>
                      <Text style={styles.decodedDataLabel}>{t('addCar.engine')}:</Text>
                      <Text style={styles.decodedDataValue}>{formData.engine}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Показываем ошибки валидации для режима VIN */}
              {(errors.year || errors.make || errors.model || errors.engine) && (
                <View style={styles.validationErrorsContainer}>
                  <Text style={styles.validationErrorsTitle}>{t('addCar.validationErrors')}</Text>
                  {errors.year && <Text style={styles.validationErrorText}>• {errors.year}</Text>}
                  {errors.make && <Text style={styles.validationErrorText}>• {errors.make}</Text>}
                  {errors.model && <Text style={styles.validationErrorText}>• {errors.model}</Text>}
                  {errors.engine && <Text style={styles.validationErrorText}>• {errors.engine}</Text>}
                </View>
              )}
            </Card>
          ) : method === 'engine' ? (
            <Card>
              {/* Existing picker-based flow */}
              <View style={styles.dropdownContainer}>
                <Text style={styles.dropdownLabel}>{t('addCar.make')}</Text>
                <TouchableOpacity
                  style={[styles.inputLike, {justifyContent: 'space-between', flexDirection: 'row'}]}
                  onPress={() => openPicker('make')}
                >
                  <Text style={styles.dropdownOptionText}>
                    {engineForm.maker || ''}
                  </Text>
                  <Icon name="chevron-right" size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
                {errors.make && <Text style={styles.errorText}>{errors.make}</Text>}
              </View>

              <View style={styles.dropdownContainer}>
                <Text style={styles.dropdownLabel}>{t('addCar.model')}</Text>
                <TouchableOpacity
                  style={[styles.inputLike, {justifyContent: 'space-between', flexDirection: 'row'}]}
                  onPress={() => openPicker('model')}
                >
                  <Text style={styles.dropdownOptionText}>
                    {engineForm.model || ''}
                  </Text>
                  <Icon name="chevron-right" size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
                {errors.model && <Text style={styles.errorText}>{errors.model}</Text>}
              </View>

              <View style={styles.dropdownContainer}>
                <Text style={styles.dropdownLabel}>{t('addCar.engine')}</Text>
                <TouchableOpacity
                  style={[styles.inputLike, {justifyContent: 'space-between', flexDirection: 'row'}]}
                  onPress={() => openPicker('engine')}
                >
                  <Text style={styles.dropdownOptionText}>
                    {engineForm.engine || ''}
                  </Text>
                  <Icon name="chevron-right" size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
                {errors.engine && <Text style={styles.errorText}>{errors.engine}</Text>}
              </View>

              <Input
                label={t('addCar.year')}
                value={engineForm.year}
                onChangeText={(value) => handleYearChange(value)}
                error={errors.year}
                keyboardType="numeric"
              />
            </Card>
          ) : (
            <Card style={{ zIndex: 10 }}>
              {/* Pure manual text inputs */}
              <View pointerEvents="box-none">
              <Input
                label={t('addCar.make')}
                value={manualForm.maker}
                onChangeText={(value) => {
                  console.log('manual make input:', value);
                  setManualForm(prev => ({ ...prev, maker: value }));
                }}
                error={errors.make}
                editable={true}
                autoCorrect={false}
                autoCapitalize="words"
                containerStyle={{ zIndex: 20 }}
                inputStyle={{ zIndex: 20 }}
                keyboardType="default"
                autoComplete="off"
                textContentType="none"
                returnKeyType="done"
                blurOnSubmit={true}
                enablesReturnKeyAutomatically={true}
              />
              <Input
                label={t('addCar.model')}
                value={manualForm.model}
                onChangeText={(value) => {
                  console.log('manual model input:', value);
                  setManualForm(prev => ({ ...prev, model: value }));
                }}
                error={errors.model}
                editable={true}
                autoCorrect={false}
                autoCapitalize="characters"
                containerStyle={{ zIndex: 20 }}
                inputStyle={{ zIndex: 20 }}
                keyboardType="default"
                autoComplete="off"
                textContentType="none"
                onFocus={() => console.log('manual model focus')}
              />
              <Input
                label={t('addCar.engine')}
                value={manualForm.engine}
                onChangeText={(value) => setManualForm(prev => ({ ...prev, engine: value }))}
                error={errors.engine}
                editable={true}
                autoCorrect={false}
                autoCapitalize="none"
              />
              <Input
                label={t('addCar.year')}
                value={manualForm.year}
                onChangeText={(value) => handleYearChange(value)}
                error={errors.year}
                keyboardType="numeric"
                editable={true}
              />
              </View>
            </Card>
          )}

          <Input
            label={t('addCar.mileage')}
            value={formData.mileage}
            onChangeText={(value) => handleInputChange('mileage', value)}
            error={errors.mileage}
            keyboardType="numeric"
          />

          <Button
            title={t('common.add')}
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitButton}
          />

        </View>

        {/* Modal Picker */}
        <Modal isVisible={picker.visible} onBackdropPress={() => setPicker(prev => ({...prev, visible: false}))}>
          <View style={{ backgroundColor: COLORS.card, borderRadius: 8, padding: SPACING.md }}>
            <Text style={{ color: COLORS.text, fontWeight: 'bold', fontSize: 16, marginBottom: SPACING.sm }}>
              {picker.type === 'make' ? t('addCar.make') : picker.type === 'model' ? t('addCar.model') : t('addCar.engine')}
            </Text>
            <View style={styles.searchInputContainer}>
              <TextInput
                style={styles.searchTextInput}
                value={search}
                onChangeText={setSearch}
              />
              <Icon name="search" size={16} color={COLORS.textSecondary} />
            </View>
            <ScrollView style={{ maxHeight: 300, marginTop: SPACING.sm }}>
              {picker.items
                .filter((it) => it.toLowerCase().includes(search.toLowerCase()))
                .map((it, idx) => {
                  const label = it;
                  const selected = (picker.type === 'make' && engineForm.maker === label)
                    || (picker.type === 'model' && engineForm.model === label)
                    || (picker.type === 'engine' && engineForm.engine === label);
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}
                      onPress={() => {
                        if (picker.type === 'make') handleMakeChangeEngine(label);
                        if (picker.type === 'model') handleModelChangeEngine(label);
                        if (picker.type === 'engine') handleTrimChange({ engine: label });
                        setPicker(prev => ({...prev, visible: false}));
                      }}
                    >
                      <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.accent, marginRight: 10, alignItems: 'center', justifyContent: 'center' }}>
                        {selected && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.accent }} />}
                      </View>
                      <Text style={{ color: COLORS.text }}>{label}</Text>
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

const styles = StyleSheet.create({
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
    paddingBottom: SPACING.xl,
  },
  methodSelector: {
    flexDirection: 'row',
    margin: SPACING.lg,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 4,
  },
  methodButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderRadius: 6,
  },
  methodButtonActive: {
    backgroundColor: COLORS.accent,
  },
  methodButtonText: {
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  methodButtonTextActive: {
    color: COLORS.background,
  },
  form: {
    padding: SPACING.lg,
  },
  dropdownContainer: {
    marginBottom: SPACING.lg,
  },
  dropdownLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  dropdownOption: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputLike: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.card,
    minHeight: 48,
  },
  dropdownOptionActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  dropdownOptionText: {
    color: COLORS.text,
    fontSize: 14,
  },
  dropdownOptionTextActive: {
    color: COLORS.background,
    fontWeight: '500',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    marginTop: SPACING.xs,
  },
  submitButton: {
    marginTop: SPACING.lg,
  },
  decodedDataContainer: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  decodedDataTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.accent,
    marginBottom: SPACING.sm,
  },
  decodedDataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  decodedDataLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  decodedDataValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
  },
  validationErrorsContainer: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.error + '20',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  validationErrorsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.error,
    marginBottom: SPACING.xs,
  },
  validationErrorText: {
    fontSize: 13,
    color: COLORS.error,
    marginBottom: SPACING.xs,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.background,
  },
  searchTextInput: {
    flex: 1,
    color: COLORS.text,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
  },
});

export default AddCarScreen;
