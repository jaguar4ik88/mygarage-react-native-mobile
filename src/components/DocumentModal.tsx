import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Icon from './Icon';
import Button from './Button';
import Input from './Input';
import DateInput from './DateInput';
import { COLORS, FONTS, SPACING } from '../constants';
import ApiService from '../services/api';
import { Vehicle } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface VehicleDocument {
  id: number;
  vehicle_id: number;
  type: string;
  name: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  expiry_date: string | null;
  notes: string | null;
  created_at: string;
  file_url: string;
}

interface DocumentModalProps {
  visible: boolean;
  onClose: () => void;
  onDocumentAdded: () => void;
  editingDocument?: VehicleDocument | null;
  vehicle: Vehicle;
}

const DocumentModal: React.FC<DocumentModalProps> = ({
  visible,
  onClose,
  onDocumentAdded,
  editingDocument,
  vehicle,
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'insurance',
    name: '',
    expiry_date: '',
    notes: '',
  });
  const [selectedFile, setSelectedFile] = useState<any>(null);

  useEffect(() => {
    if (editingDocument) {
      setFormData({
        type: editingDocument.type,
        name: editingDocument.name,
        expiry_date: editingDocument.expiry_date || '',
        notes: editingDocument.notes || '',
      });
      setSelectedFile(null);
    } else {
      setFormData({
        type: 'insurance',
        name: '',
        expiry_date: '',
        notes: '',
      });
      setSelectedFile(null);
    }
  }, [editingDocument, visible]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('documents.errors.permissionDenied'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedFile(result.assets[0]);
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedFile(result.assets[0]);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert(t('common.error'), t('documents.errors.nameRequired'));
      return;
    }

    if (!editingDocument && !selectedFile) {
      Alert.alert(t('common.error'), t('documents.errors.fileRequired'));
      return;
    }

    try {
      setUploading(true);

      const formDataToSend = new FormData();
      formDataToSend.append('type', formData.type);
      formDataToSend.append('name', formData.name);
      if (formData.expiry_date) {
        formDataToSend.append('expiry_date', formData.expiry_date);
      }
      if (formData.notes) {
        formDataToSend.append('notes', formData.notes);
      }
      
      if (selectedFile) {
        formDataToSend.append('file', {
          uri: selectedFile.uri,
          type: selectedFile.mimeType || selectedFile.type || 'image/jpeg',
          name: selectedFile.fileName || selectedFile.name || 'document.jpg',
        } as any);
      }

      if (editingDocument) {
        await ApiService.updateVehicleDocument(editingDocument.id, formDataToSend);
      } else {
        await ApiService.uploadVehicleDocument(vehicle.id, formDataToSend);
      }

      Alert.alert(t('common.success'), t('documents.success.saved'));
      onDocumentAdded();
      handleClose();
    } catch (error: any) {
      console.error('Error saving document:', error);
      if (error.upgrade_required) {
        Alert.alert(t('common.error'), t('documents.errors.upgradeRequired'));
      } else {
        Alert.alert(t('common.error'), t('documents.errors.saveFailed'));
      }
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      type: 'insurance',
      name: '',
      expiry_date: '',
      notes: '',
    });
    setSelectedFile(null);
    onClose();
  };

  const documentTypes = [
    { value: 'insurance', label: t('documents.types.insurance'), icon: 'shield' },
    { value: 'power_of_attorney', label: t('documents.types.power_of_attorney'), icon: 'file-contract' },
    { value: 'certificate', label: t('documents.types.certificate'), icon: 'certificate' },
    { value: 'other', label: t('documents.types.other'), icon: 'file' },
  ];

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
            <Text style={styles.title}>{t('documents.addDocument')}</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.form}>
              {/* Document Type */}
              <View style={styles.section}>
                <Text style={styles.label}>{t('documents.documentType')}</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.typeScrollContainer}
                  contentContainerStyle={styles.typeScrollContent}
                >
                  {documentTypes.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.typeOption,
                        formData.type === type.value && styles.typeOptionSelected,
                      ]}
                      onPress={() => setFormData({ ...formData, type: type.value })}
                    >
                      <Icon 
                        name={type.icon} 
                        size={24} 
                        color={formData.type === type.value ? COLORS.background : COLORS.text} 
                      />
                      <Text style={[
                        styles.typeLabel,
                        formData.type === type.value && styles.typeLabelSelected,
                      ]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Document Name */}
              <View style={styles.section}>
                <Input
                  label={`${t('documents.documentName')} *`}
                  value={formData.name}
                  onChangeText={(value) => setFormData({ ...formData, name: value })}
                  placeholder={t('documents.documentNamePlaceholder')}
                />
              </View>

              {/* Expiry Date */}
              <View style={styles.section}>
                <DateInput
                  label={t('documents.expiryDate')}
                  value={formData.expiry_date}
                  onDateChange={(value) => setFormData({ ...formData, expiry_date: value })}
                />
              </View>

              {/* Notes */}
              <View style={styles.section}>
                <Input
                  label={t('documents.notes')}
                  value={formData.notes}
                  onChangeText={(value) => setFormData({ ...formData, notes: value })}
                  placeholder={t('documents.notesPlaceholder')}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* File Selection */}
              <View style={styles.section}>
                <Text style={styles.label}>{t('documents.selectFile')} *</Text>
                <View style={styles.filePickerButtons}>
                  <TouchableOpacity
                    style={styles.filePickerButton}
                    onPress={pickImage}
                  >
                    <Icon name="camera" size={24} color={COLORS.accent} />
                    <Text style={styles.filePickerButtonText}>{t('documents.selectPhoto')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.filePickerButton}
                    onPress={pickDocument}
                  >
                    <Icon name="file" size={24} color={COLORS.accent} />
                    <Text style={styles.filePickerButtonText}>{t('documents.selectFile')}</Text>
                  </TouchableOpacity>
                </View>

                {selectedFile && (
                  <View style={styles.selectedFileContainer}>
                    <Icon name="check" size={20} color={COLORS.success} />
                    <Text style={styles.selectedFileName} numberOfLines={1}>
                      {selectedFile.name || selectedFile.fileName || t('documents.selectedFile')}
                    </Text>
                    <TouchableOpacity onPress={() => setSelectedFile(null)}>
                      <Icon name="close" size={20} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.buttons}>
              <Button
                title={t('common.cancel')}
                onPress={handleClose}
                variant="outline"
                style={styles.cancelButton}
              />
              <Button
                title={uploading ? t('documents.uploading') : t('common.save')}
                onPress={handleSave}
                loading={uploading}
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
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    gap: SPACING.md,
    margin: SPACING.lg,
  },
  section: {
    marginTop: 0,
    marginBottom: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  typeScrollContainer: {
    marginBottom: SPACING.sm,
  },
  typeScrollContent: {
    paddingRight: SPACING.md,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    marginRight: SPACING.sm,
    gap: SPACING.xs,
  },
  typeOptionSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  typeLabel: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  typeLabelSelected: {
    color: COLORS.background,
  },
  filePickerButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  filePickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    gap: SPACING.xs,
  },
  filePickerButtonText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.text,
  },
  selectedFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    gap: SPACING.sm,
  },
  selectedFileName: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.text,
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

export default DocumentModal;
