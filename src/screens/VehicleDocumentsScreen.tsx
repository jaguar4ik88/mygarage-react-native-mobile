import * as React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Icon from '../components/Icon';
import DocumentListRow from '../components/DocumentListRow';
import DocumentModal from '../components/DocumentModal';
import ScreenBackLink from '../components/ScreenBackLink';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants';
import ApiService from '../services/api';
import { Vehicle } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

import type { VehicleDocument } from '../components/DocumentListRow';

interface VehicleDocumentsScreenProps {
  onBack: () => void;
  vehicle: Vehicle;
  navigation?: any;
}

const VehicleDocumentsScreen: React.FC<VehicleDocumentsScreenProps> = ({
  onBack,
  vehicle,
  navigation,
}) => {
  const { t } = useLanguage();
  const { appearanceKey } = useTheme();
  const styles = useMemo(() => createStyles(), [appearanceKey]);
  const hookNavigation = useNavigation();
  const nav = navigation ?? hookNavigation;

  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<VehicleDocument | null>(null);
  const [isDocumentViewerOpen, setIsDocumentViewerOpen] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
    loadAuthToken();
  }, [vehicle.id]);

  const loadAuthToken = async () => {
    const token = await AsyncStorage.getItem('auth_token');
    setAuthToken(token);
  };

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await ApiService.getVehicleDocuments(vehicle.id);
      setDocuments(docs || []);
    } catch (error: any) {
      const isSubscriptionError =
        error.upgrade_required ||
        error.limit_reached ||
        error.message?.includes('PRO subscription') ||
        error.message?.includes('requires PRO');

      if (isSubscriptionError) {
        setDocuments([]);
      } else if (
        error.status === 404 ||
        error.message?.includes('not found') ||
        error.message?.includes('No documents')
      ) {
        setDocuments([]);
      } else {
        console.error('Error loading documents:', error);
        Alert.alert(t('common.error'), t('documents.errors.loadFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDocuments();
    setRefreshing(false);
  };

  const handleDocumentAdded = () => {
    loadDocuments();
  };

  const getDocumentTypeLabel = (type: string): string => {
    const types: { [key: string]: string } = {
      insurance: t('documents.types.insurance'),
      power_of_attorney: t('documents.types.power_of_attorney'),
      certificate: t('documents.types.certificate'),
      other: t('documents.types.other'),
    };
    return types[type] || type;
  };

  const getDocumentTypeIcon = (type: string): string => {
    const icons: { [key: string]: string } = {
      insurance: 'shield',
      power_of_attorney: 'file-contract',
      certificate: 'certificate',
      other: 'file',
    };
    return icons[type] || 'file';
  };

  const handleDelete = (document: VehicleDocument) => {
    Alert.alert(t('documents.delete.title'), t('documents.delete.message'), [
      { text: t('documents.delete.cancel'), style: 'cancel' },
      {
        text: t('documents.delete.confirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            await ApiService.deleteVehicleDocument(document.id);
            Alert.alert(t('common.success'), t('documents.success.deleted'));
            loadDocuments();
          } catch {
            Alert.alert(t('common.error'), t('documents.errors.deleteFailed'));
          }
        },
      },
    ]);
  };

  const handleOpenDocument = async (document: VehicleDocument) => {
    if (!document.file_url) {
      Alert.alert(t('common.error'), t('documents.errors.fileNotAvailable'));
      return;
    }

    try {
      const response = await fetch(document.file_url, { method: 'HEAD' });

      if (!response.ok) {
        Alert.alert(t('common.error'), t('documents.errors.fileNotFound'));
        return;
      }

      setSelectedDocument(document);
      setIsDocumentViewerOpen(true);
    } catch (error) {
      console.error('Error checking file:', error);
      Alert.alert(t('common.error'), t('documents.errors.fileCheckFailed'));
    }
  };

  const handleDownloadDocument = async (document: VehicleDocument) => {
    try {
      if (!document.file_url) {
        Alert.alert(t('common.error'), t('documents.errors.fileNotAvailable'));
        return;
      }

      const fileExtension = document.mime_type?.includes('pdf')
        ? 'pdf'
        : document.mime_type?.includes('image')
          ? 'jpg'
          : 'pdf';
      const fileName = document.file_name || `document_${document.id}.${fileExtension}`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      const downloadResult = await FileSystem.downloadAsync(document.file_url, fileUri);

      if (downloadResult.status === 200) {
        const isAvailable = await Sharing.isAvailableAsync();

        if (isAvailable) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: document.mime_type || 'application/pdf',
            dialogTitle: t('documents.saveDocument'),
          });
        } else {
          Alert.alert(t('common.success'), t('documents.downloaded') + ': ' + fileName);
        }
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      Alert.alert(t('common.error'), t('documents.errors.downloadFailed'));
    }
  };

  const renderListHeader = useCallback(() => {
    const canBack = typeof nav.canGoBack === 'function' && nav.canGoBack();
    return (
      <>
        {canBack ? <ScreenBackLink onPress={onBack} /> : null}
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderText}>
            <Text style={styles.pageTitle}>{t('documents.title')}</Text>
            <Text style={styles.vehicleLine} numberOfLines={1}>
              {vehicle.make} {vehicle.model} · {vehicle.year}
            </Text>
            <Text style={styles.pageSub}>{t('documents.pageSubtitle')}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setIsModalOpen(true)}
            style={styles.addFab}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t('documents.addDocument')}
          >
            <Icon name="plus" size={20} color={COLORS.background} />
          </TouchableOpacity>
        </View>
        {documents.length > 0 ? (
          <Text style={styles.sectionHeading}>{t('documents.sectionList').toUpperCase()}</Text>
        ) : null}
      </>
    );
  }, [documents.length, nav, onBack, styles, t, vehicle.make, vehicle.model, vehicle.year]);

  const renderEmpty = useCallback(() => {
    if (loading) return null;
    return (
      <View style={styles.emptyState}>
        <Icon name="file" size={48} color={COLORS.textMuted} />
        <Text style={styles.emptyTitle}>{t('documents.noDocuments')}</Text>
        <Text style={styles.emptyText}>{t('documents.noDocumentsText')}</Text>
      </View>
    );
  }, [loading, styles, t]);

  if (loading && documents.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <FlatList
        data={documents}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <DocumentListRow
            document={item}
            onPress={() => handleOpenDocument(item)}
            onDelete={() => handleDelete(item)}
            onDownload={() => handleDownloadDocument(item)}
            getDocumentTypeLabel={getDocumentTypeLabel}
            getDocumentTypeIcon={getDocumentTypeIcon}
            t={t}
          />
        )}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          documents.length === 0 ? styles.listContentEmpty : null,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.accent]}
            tintColor={COLORS.accent}
          />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      <DocumentModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDocumentAdded={handleDocumentAdded}
        vehicle={vehicle}
      />

      <Modal
        visible={isDocumentViewerOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsDocumentViewerOpen(false)}
      >
        <SafeAreaView style={styles.documentViewerContainer}>
          <View style={styles.documentViewerHeader}>
            <TouchableOpacity
              onPress={() => setIsDocumentViewerOpen(false)}
              style={styles.documentViewerCloseButton}
            >
              <Icon name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.documentViewerTitle} numberOfLines={1}>
              {selectedDocument?.name || t('documents.viewer')}
            </Text>
            <View style={styles.documentViewerHeaderSpacer} />
          </View>

          {selectedDocument && (
            <View style={styles.documentViewerContent}>
              {selectedDocument.mime_type?.startsWith('image/') ? (
                <Image
                  source={{ uri: selectedDocument.file_url }}
                  style={styles.documentViewerImage}
                  resizeMode="contain"
                />
              ) : (
                <WebView
                  source={{
                    uri: selectedDocument.file_url,
                    headers: {
                      Accept: 'application/pdf,*/*',
                    },
                  }}
                  style={styles.documentViewerWebView}
                  startInLoadingState={true}
                  scalesPageToFit={true}
                  renderLoading={() => (
                    <View style={styles.documentViewerLoading}>
                      <ActivityIndicator size="large" color={COLORS.accent} />
                      <Text style={styles.documentViewerLoadingText}>{t('documents.loading')}</Text>
                    </View>
                  )}
                  onError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
                    console.error('WebView error:', nativeEvent);
                    Alert.alert(t('common.error'), t('documents.errors.viewFailed'));
                  }}
                  onHttpError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
                    console.error('WebView HTTP error:', nativeEvent);

                    if (nativeEvent.statusCode === 404) {
                      Alert.alert(t('common.error'), t('documents.errors.fileNotFound'));
                      setIsDocumentViewerOpen(false);
                    }
                  }}
                />
              )}
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

function createStyles() {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    listContent: {
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.xxl,
    },
    listContentEmpty: {
      flexGrow: 1,
    },
    pageHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: SPACING.md,
      paddingTop: SPACING.sm,
      marginBottom: SPACING.lg,
    },
    pageHeaderText: {
      flex: 1,
      minWidth: 0,
    },
    pageTitle: {
      fontFamily: FONTS.bold,
      fontSize: 28,
      letterSpacing: -0.4,
      color: COLORS.text,
      marginBottom: 6,
    },
    vehicleLine: {
      fontFamily: FONTS.semiBold,
      fontSize: 14,
      color: COLORS.text,
      marginBottom: 4,
    },
    pageSub: {
      fontFamily: FONTS.regular,
      fontSize: 14,
      color: COLORS.textSecondary,
      lineHeight: 20,
    },
    addFab: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: COLORS.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: SPACING.xs,
    },
    sectionHeading: {
      fontFamily: FONTS.semiBold,
      fontSize: 13,
      letterSpacing: 2,
      color: COLORS.accent,
      marginBottom: SPACING.md,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: SPACING.xxl,
      paddingHorizontal: SPACING.md,
    },
    emptyTitle: {
      fontFamily: FONTS.bold,
      fontSize: 18,
      color: COLORS.text,
      marginTop: SPACING.md,
      marginBottom: SPACING.sm,
    },
    emptyText: {
      fontFamily: FONTS.regular,
      fontSize: 14,
      color: COLORS.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
    documentViewerContainer: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    documentViewerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: COLORS.border,
      backgroundColor: COLORS.background,
    },
    documentViewerCloseButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    documentViewerHeaderSpacer: {
      width: 44,
    },
    documentViewerTitle: {
      flex: 1,
      fontSize: 18,
      fontFamily: FONTS.bold,
      letterSpacing: -0.3,
      color: COLORS.text,
      textAlign: 'center',
    },
    documentViewerContent: {
      flex: 1,
    },
    documentViewerImage: {
      flex: 1,
      width: '100%',
    },
    documentViewerWebView: {
      flex: 1,
    },
    documentViewerLoading: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: COLORS.background,
    },
    documentViewerLoadingText: {
      marginTop: SPACING.md,
      fontSize: 16,
      fontFamily: FONTS.medium,
      color: COLORS.text,
    },
  });
}

export default VehicleDocumentsScreen;
