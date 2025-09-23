import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './Icon';
import Button from './Button';
import { COLORS, SPACING } from '../constants';

interface FormModalProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSubmit?: () => void;
  cancelLabel?: string;
  submitLabel?: string;
  loading?: boolean;
  children: React.ReactNode;
}

const FormModal: React.FC<FormModalProps> = ({
  visible,
  title,
  onClose,
  onSubmit,
  cancelLabel = 'Cancel',
  submitLabel = 'Save',
  loading,
  children,
}) => {
  const insets = useSafeAreaInsets();

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
            <Text style={styles.title}>{title}</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            contentContainerStyle={{ paddingBottom: insets.bottom + SPACING.xxl }}
          >
            <View style={styles.content}>{children}</View>
            {onSubmit && (
              <View style={styles.actionsBottom}>
                <Button
                  title={cancelLabel}
                  onPress={onClose}
                  variant="outline"
                  style={{ flex: 1, marginRight: 4 }}
                />
                <Button
                  title={submitLabel}
                  onPress={onSubmit}
                  loading={loading}
                  style={{ flex: 1, marginLeft: 4 }}
                />
              </View>
            )}
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
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeButton: {
    padding: SPACING.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
  },
  actionsBottom: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
  },
});

export default FormModal;


