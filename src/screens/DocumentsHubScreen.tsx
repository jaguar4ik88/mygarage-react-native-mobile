import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Icon from '../components/Icon';
import DocumentListRow, { type VehicleDocument } from '../components/DocumentListRow';
import DocumentModal from '../components/DocumentModal';
import ScreenBackLink from '../components/ScreenBackLink';
import { COLORS, FONTS, SPACING, RADIUS, hexToRgba } from '../constants';
import ApiService from '../services/api';
import { Vehicle } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

const DocumentsHubScreen: React.FC = () => {
  const { t } = useLanguage();
  const { appearanceKey } = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(), [appearanceKey]);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<VehicleDocument | null>(null);
  const [isDocumentViewerOpen, setIsDocumentViewerOpen] = useState(false);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) ?? null,
    [vehicles, selectedVehicleId]
  );

  useEffect(() => {
    if (!user?.id) {
      setVehicles([]);
      setSelectedVehicleId(null);
      setVehiclesLoading(false);
      return;
    }
    let cancelled = false;
    setVehiclesLoading(true);
    (async () => {
      try {
        const vs = await ApiService.getVehicles();
        if (!cancelled) setVehicles(vs || []);
      } catch (e) {
        console.error('DocumentsHub load vehicles:', e);
        if (!cancelled) setVehicles([]);
      } finally {
        if (!cancelled) setVehiclesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (vehicles.length === 0) {
      setSelectedVehicleId(null);
      return;
    }
    if (selectedVehicleId == null || !vehicles.some((v) => v.id === selectedVehicleId)) {
      setSelectedVehicleId(vehicles[0].id);
    }
  }, [vehicles, selectedVehicleId]);

  const loadDocuments = useCallback(async () => {
    if (!selectedVehicleId) {
      setDocuments([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const docs = await ApiService.getVehicleDocuments(selectedVehicleId);
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
  }, [selectedVehicleId, t]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

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

  const showBack = typeof navigation.canGoBack === 'function' && navigation.canGoBack();

  const renderListHeader = useCallback(() => {
    return (
      <>
        {showBack ? <ScreenBackLink onPress={() => navigation.goBack()} /> : null}
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderText}>
            <Text style={styles.pageTitle}>{t('documents.title')}</Text>
            <Text style={styles.vehicleLine} numberOfLines={1}>
              {selectedVehicle
                ? `${selectedVehicle.make} ${selectedVehicle.model} · ${selectedVehicle.year}`
                : t('documents.hubPickVehicle')}
            </Text>
            <Text style={styles.pageSub}>{t('documents.pageSubtitle')}</Text>
          </View>
          {selectedVehicle ? (
            <TouchableOpacity
              onPress={() => setIsModalOpen(true)}
              style={styles.addFab}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('documents.addDocument')}
            >
              <Icon name="plus" size={20} color={COLORS.background} />
            </TouchableOpacity>
          ) : (
            <View style={styles.addFabSpacer} />
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.vehicleChips}
          keyboardShouldPersistTaps="handled"
        >
          {vehicles.map((v) => {
            const on = v.id === selectedVehicleId;
            return (
              <TouchableOpacity
                key={v.id}
                onPress={() => setSelectedVehicleId(v.id)}
                style={[styles.vehicleChip, on && styles.vehicleChipActive]}
                activeOpacity={0.85}
              >
                <Text style={[styles.vehicleChipText, on && styles.vehicleChipTextActive]} numberOfLines={1}>
                  {v.make} {v.model}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {documents.length > 0 ? (
          <Text style={styles.sectionHeading}>{t('documents.sectionList').toUpperCase()}</Text>
        ) : null}
      </>
    );
  }, [
    showBack,
    navigation,
    styles,
    t,
    selectedVehicle,
    vehicles,
    selectedVehicleId,
    documents.length,
  ]);

  const renderEmpty = useCallback(() => {
    if (vehiclesLoading) return null;
    if (loading) return null;
    if (!user?.id) {
      return (
        <View style={styles.emptyState}>
          <Icon name="folder" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>{t('auth.authRequired')}</Text>
        </View>
      );
    }
    if (vehicles.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Icon name="car" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>{t('documents.hubNoVehicles')}</Text>
          <Text style={styles.emptyText}>{t('documents.hubNoVehiclesHint')}</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <Icon name="file" size={48} color={COLORS.textMuted} />
        <Text style={styles.emptyTitle}>{t('documents.noDocuments')}</Text>
        <Text style={styles.emptyText}>{t('documents.noDocumentsText')}</Text>
      </View>
    );
  }, [loading, vehiclesLoading, user?.id, vehicles.length, styles, t]);

  if (vehiclesLoading && user?.id) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (loading && documents.length === 0 && selectedVehicleId != null && vehicles.length > 0) {
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
          user?.id ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.accent]}
              tintColor={COLORS.accent}
            />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      {selectedVehicle ? (
        <DocumentModal
          visible={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onDocumentAdded={handleDocumentAdded}
          vehicle={selectedVehicle}
        />
      ) : null}

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
                  onError={() => {
                    Alert.alert(t('common.error'), t('documents.errors.viewFailed'));
                  }}
                  onHttpError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
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
      marginBottom: SPACING.md,
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
    addFabSpacer: {
      width: 40,
      height: 40,
    },
    vehicleChips: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      paddingBottom: SPACING.md,
      flexGrow: 0,
    },
    vehicleChip: {
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
      maxWidth: 200,
    },
    vehicleChipActive: {
      borderColor: COLORS.accent,
      borderWidth: 2,
      backgroundColor: hexToRgba(COLORS.accent, 0.12),
    },
    vehicleChipText: {
      fontFamily: FONTS.medium,
      fontSize: 12,
      color: COLORS.textSecondary,
    },
    vehicleChipTextActive: {
      color: COLORS.text,
      fontWeight: '700',
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
      textAlign: 'center',
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

export default DocumentsHubScreen;
