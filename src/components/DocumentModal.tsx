import React, { useState, useEffect, useMemo } from 'react';
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
  ActivityIndicator,
  Pressable,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Icon from './Icon';
import Button from './Button';
import DateInput from './DateInput';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants';
import ApiService from '../services/api';
import { Vehicle } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

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
  const { appearanceKey } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(), [appearanceKey]);

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
      if (!error.upgrade_required && !error.limit_reached) {
        console.error('Error saving document:', error);
      }
      Alert.alert(t('common.error'), t('documents.errors.saveFailed'));
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
    {
      value: 'power_of_attorney',
      label: t('documents.types.power_of_attorney'),
      icon: 'file-contract',
    },
    { value: 'certificate', label: t('documents.types.certificate'), icon: 'certificate' },
    { value: 'other', label: t('documents.types.other'), icon: 'file' },
  ];

  const modalTitle = editingDocument ? t('common.edit') : t('documents.addDocument');

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
                <Text style={styles.fieldLabel}>{t('documents.documentType')}</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.typeRow}
                >
                  {documentTypes.map((type) => {
                    const sel = formData.type === type.value;
                    return (
                      <TouchableOpacity
                        key={type.value}
                        style={[styles.typePill, sel && styles.typePillSelected]}
                        onPress={() => setFormData({ ...formData, type: type.value })}
                        activeOpacity={0.85}
                      >
                        <Icon
                          name={type.icon}
                          size={18}
                          color={sel ? COLORS.background : COLORS.textSecondary}
                        />
                        <Text
                          style={[styles.typePillText, sel && styles.typePillTextSelected]}
                          numberOfLines={2}
                        >
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>{`${t('documents.documentName')} *`}</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(value) => setFormData({ ...formData, name: value })}
                  placeholder={t('documents.documentNamePlaceholder')}
                  placeholderTextColor={COLORS.textMuted}
                  selectionColor={COLORS.accent}
                />
              </View>

              <View style={styles.dateNotesCluster}>
                <View style={styles.fieldBlock}>
                  <DateInput
                    label={t('documents.expiryDate')}
                    value={formData.expiry_date}
                    onDateChange={(value) => setFormData({ ...formData, expiry_date: value })}
                    placeholder={t('documents.expiryDatePlaceholder')}
                    labelStyle={styles.fieldLabel}
                    fieldStyle={styles.dateFieldOverride}
                    containerStyle={styles.dateInputCluster}
                  />
                </View>

                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>{t('documents.notes')}</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.notes}
                    onChangeText={(value) => setFormData({ ...formData, notes: value })}
                    placeholder={t('documents.notesPlaceholder')}
                    placeholderTextColor={COLORS.textMuted}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    selectionColor={COLORS.accent}
                  />
                </View>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>{`${t('documents.selectFile')} *`}</Text>
                <View style={styles.fileActions}>
                  <TouchableOpacity
                    style={styles.fileAction}
                    onPress={pickImage}
                    activeOpacity={0.85}
                  >
                    <Icon name="camera" size={18} color={COLORS.accent} />
                    <Text style={styles.fileActionText} numberOfLines={1} ellipsizeMode="tail">
                      {t('documents.selectPhoto')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.fileAction}
                    onPress={pickDocument}
                    activeOpacity={0.85}
                  >
                    <Icon name="file" size={18} color={COLORS.accent} />
                    <Text style={styles.fileActionText} numberOfLines={1} ellipsizeMode="tail">
                      {t('documents.selectFile')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {selectedFile ? (
                  <View style={styles.selectedFile}>
                    <Icon name="check" size={18} color={COLORS.success} />
                    <Text style={styles.selectedFileName} numberOfLines={1}>
                      {selectedFile.name || selectedFile.fileName || t('documents.selectedFile')}
                    </Text>
                    <TouchableOpacity onPress={() => setSelectedFile(null)} hitSlop={12}>
                      <Icon name="close" size={18} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, uploading && styles.primaryBtnDisabled]}
              onPress={handleSave}
              disabled={uploading}
              activeOpacity={0.9}
            >
              {uploading ? (
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
    dateNotesCluster: {
      gap: SPACING.sm,
    },
    dateInputCluster: {
      marginBottom: 0,
    },
    fieldLabel: {
      fontFamily: FONTS.semiBold,
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: COLORS.textSecondary,
    },
    typeRow: {
      flexDirection: 'row',
      gap: SPACING.sm,
      paddingVertical: SPACING.xs,
    },
    typePill: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
      gap: 6,
      minWidth: 92,
      maxWidth: 112,
    },
    typePillSelected: {
      backgroundColor: COLORS.accent,
      borderColor: COLORS.accent,
    },
    typePillText: {
      fontFamily: FONTS.medium,
      fontSize: 10,
      textAlign: 'center',
      color: COLORS.textSecondary,
      lineHeight: 13,
    },
    typePillTextSelected: {
      color: COLORS.background,
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
    dateFieldOverride: {
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    fileActions: {
      flexDirection: 'row',
      gap: SPACING.sm,
      flexWrap: 'nowrap',
    },
    fileAction: {
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
    fileActionText: {
      fontFamily: FONTS.semiBold,
      fontSize: 12,
      color: COLORS.accent,
    },
    selectedFile: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      padding: SPACING.md,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },
    selectedFileName: {
      flex: 1,
      fontFamily: FONTS.medium,
      fontSize: 14,
      color: COLORS.text,
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

export default DocumentModal;
