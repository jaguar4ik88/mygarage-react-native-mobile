import * as React from 'react';
import { useState, useEffect } from 'react';
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
  Dimensions,
  Linking,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Icon from '../components/Icon';
import Button from '../components/Button';
import Paywall from '../components/Paywall';
import DocumentModal from '../components/DocumentModal';
import Card from '../components/Card';
import { COLORS, FONTS, SPACING, ACTION_COLORS } from '../constants';
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

interface VehicleDocumentsScreenProps {
  onBack: () => void;
  vehicle: Vehicle;
  navigation?: any;
}

const { width: screenWidth } = Dimensions.get('window');
const CARD_WIDTH = (screenWidth - SPACING.md * 3) / 2; // 2 колонки с отступами

// Компонент для отображения документа в сетке
const DocumentCard: React.FC<{
  document: VehicleDocument;
  onPress: () => void;
  onDelete: () => void;
  onDownload: () => void;
  getDocumentTypeLabel: (type: string) => string;
  getDocumentTypeIcon: (type: string) => string;
  t: (key: string) => string;
}> = ({ document, onPress, onDelete, onDownload, getDocumentTypeLabel, getDocumentTypeIcon, t }) => {
  const [imageError, setImageError] = useState(false);

  return (
    <TouchableOpacity 
      style={styles.gridCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.gridCardContent}>
        <View style={styles.gridPreview}>
          {document.file_url && document.mime_type?.startsWith('image/') && !imageError ? (
            <Image 
              source={{ uri: document.file_url }} 
              style={styles.gridImage}
              resizeMode="cover"
              onError={() => {
                setImageError(true);
              }}
            />
          ) : (
            <View style={styles.gridIconContainer}>
              <Icon 
                name={getDocumentTypeIcon(document.type)} 
                size={28} 
                color={ACTION_COLORS.colorDocumentions} 
              />
            </View>
          )}
        </View>

        <View style={styles.gridInfo}>
          <Text style={styles.gridName} numberOfLines={2}>
            {document.name}
          </Text>
          <Text style={styles.gridType} numberOfLines={1}>
            {getDocumentTypeLabel(document.type)}
          </Text>
          {document.expiry_date && (
            <Text style={styles.gridExpiry} numberOfLines={1}>
              {t('documents.expires')}: {new Date(document.expiry_date).toLocaleDateString()}
            </Text>
          )}
        </View>

        {/* Кнопка удаления в правом верхнем углу */}
        <TouchableOpacity 
          style={styles.gridDeleteButton}
          onPress={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Icon name="trash" size={14} color={COLORS.error} />
        </TouchableOpacity>
        
        {/* Кнопка скачивания в правом нижнем углу */}
        <TouchableOpacity 
          style={styles.gridDownloadButtonBottom}
          onPress={(e) => {
            e.stopPropagation();
            onDownload();
          }}
        >
          <Icon name="download" size={14} color={ACTION_COLORS.colorDownload} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const VehicleDocumentsScreen: React.FC<VehicleDocumentsScreenProps> = ({ 
  onBack, 
  vehicle,
  navigation 
}) => {
  const { t } = useLanguage();
  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<VehicleDocument | null>(null);
  const [isDocumentViewerOpen, setIsDocumentViewerOpen] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
    loadAuthToken();
  }, []);

  const loadAuthToken = async () => {
    const token = await AsyncStorage.getItem('auth_token');
    setAuthToken(token);
  };

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await ApiService.getVehicleDocuments(vehicle.id);
      setDocuments(docs);
    } catch (error: any) {
      console.error('Error loading documents:', error);
      if (error.upgrade_required) {
        // Показываем Paywall вместо Alert
        setShowPaywall(true);
      } else {
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
    Alert.alert(
      t('documents.delete.title'),
      t('documents.delete.message'),
      [
        { text: t('documents.delete.cancel'), style: 'cancel' },
        {
          text: t('documents.delete.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await ApiService.deleteVehicleDocument(document.id);
              Alert.alert(t('common.success'), t('documents.success.deleted'));
              loadDocuments();
            } catch (error) {
              Alert.alert(t('common.error'), t('documents.errors.deleteFailed'));
            }
          },
        },
      ]
    );
  };

  const handleOpenDocument = async (document: VehicleDocument) => {
    // Проверяем наличие файла
    if (!document.file_url) {
      Alert.alert(t('common.error'), t('documents.errors.fileNotAvailable'));
      return;
    }

    try {
      // Проверяем что файл существует на сервере
      const response = await fetch(document.file_url, { method: 'HEAD' });
      
      if (!response.ok) {
        Alert.alert(
          t('common.error'),
          t('documents.errors.fileNotFound')
        );
        return;
      }

      // Откроем модальное окно для просмотра документа
      setSelectedDocument(document);
      setIsDocumentViewerOpen(true);
    } catch (error) {
      console.error('Error checking file:', error);
      Alert.alert(
        t('common.error'),
        t('documents.errors.fileCheckFailed')
      );
    }
  };

  const handleDownloadDocument = async (document: VehicleDocument) => {
    try {
      if (!document.file_url) {
        Alert.alert(t('common.error'), t('documents.errors.fileNotAvailable'));
        return;
      }

      // Скачиваем файл в приложении
      const fileExtension = document.mime_type?.includes('pdf') ? 'pdf' : 
                           document.mime_type?.includes('image') ? 'jpg' : 'pdf';
      const fileName = document.file_name || `document_${document.id}.${fileExtension}`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      // Скачиваем файл через legacy API
      const downloadResult = await FileSystem.downloadAsync(document.file_url, fileUri);

      if (downloadResult.status === 200) {
        // Открываем Share диалог
        const isAvailable = await Sharing.isAvailableAsync();
        
        if (isAvailable) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: document.mime_type || 'application/pdf',
            dialogTitle: t('documents.saveDocument'),
          });
        } else {
          Alert.alert(
            t('common.success'),
            t('documents.downloaded') + ': ' + fileName
          );
        }
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      Alert.alert(
        t('common.error'),
        t('documents.errors.downloadFailed')
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['left','right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left','right']}>
      {documents.length === 0 ? (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.accent}
            />
          }
        >
          <Card style={styles.emptyCard}>
            <View style={styles.emptyState}>
              <Icon name="file" size={64} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>{t('documents.noDocuments')}</Text>
              <Text style={styles.emptyText}>
                {t('documents.noDocumentsText')}
              </Text>
            </View>
          </Card>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setIsModalOpen(true)}
          >
            <Icon name="plus" size={24} color="white" />
            <Text style={styles.addButtonText}>{t('documents.addDocument')}</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <FlatList
          data={documents}
          numColumns={2}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.gridRow}
          ListHeaderComponent={() => (
            <Card style={styles.headerCard}>
              <View style={styles.headerContent}>
                <View style={styles.iconContainer}>
                  <Icon name="car" size={20} color={COLORS.accent} />
                </View>
                <Text style={styles.vehicleName}>
                  {vehicle.make} {vehicle.model} {vehicle.year}
                </Text>
              </View>
            </Card>
          )}
          renderItem={({ item }) => (
            <DocumentCard
              document={item}
              onPress={() => handleOpenDocument(item)}
              onDelete={() => handleDelete(item)}
              onDownload={() => handleDownloadDocument(item)}
              getDocumentTypeLabel={getDocumentTypeLabel}
              getDocumentTypeIcon={getDocumentTypeIcon}
              t={t}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.accent]}
              tintColor={COLORS.accent}
            />
          }
          ListEmptyComponent={
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>{t('documents.noDocuments')}</Text>
            </Card>
          }
        />
      )}

      <DocumentModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDocumentAdded={handleDocumentAdded}
        vehicle={vehicle}
      />

      <Paywall
        visible={showPaywall}
        onClose={() => {
          setShowPaywall(false);
          onBack();
        }}
        onUpgrade={() => {
          setShowPaywall(false);
          onBack();
          navigation?.navigate('Subscription');
        }}
        feature="photo_documents"
      />

      {/* Document Viewer Modal */}
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
              <Icon name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.documentViewerTitle}>
              {selectedDocument?.name || t('documents.viewer')}
            </Text>
            <View style={{ width: 40 }} />
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
                      'Accept': 'application/pdf,*/*',
                    }
                  }}
                  style={styles.documentViewerWebView}
                  startInLoadingState={true}
                  scalesPageToFit={true}
                  renderLoading={() => (
                    <View style={styles.documentViewerLoading}>
                      <ActivityIndicator size="large" color={COLORS.accent} />
                      <Text style={styles.documentViewerLoadingText}>
                        {t('documents.loading')}
                      </Text>
                    </View>
                  )}
                  onError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
                    console.error('WebView error:', nativeEvent);
                    Alert.alert(
                      t('common.error'),
                      t('documents.errors.viewFailed')
                    );
                  }}
                  onHttpError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
                    console.error('WebView HTTP error:', nativeEvent);
                    
                    if (nativeEvent.statusCode === 404) {
                      Alert.alert(
                        t('common.error'),
                        t('documents.errors.fileNotFound')
                      );
                      // Закрываем модальное окно
                      setIsDocumentViewerOpen(false);
                    }
                  }}
                  onLoadStart={() => {
                  }}
                  onLoadEnd={() => {
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  title: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.accent,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleName: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    padding: SPACING.md,
    textAlign: 'center',
  },
  documentsContainer: {
    padding: SPACING.md,
  },
  documentCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  documentPreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: SPACING.md,
    overflow: 'hidden',
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentImage: {
    width: '100%',
    height: '100%',
  },
  documentIcon: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: 4,
  },
  documentType: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  documentExpiry: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.warning,
  },
  documentNotes: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  deleteButton: {
    padding: SPACING.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  footer: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  modalKeyboardAvoidingView: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: SPACING.xl,
    minHeight: '60%',
    maxHeight: '90%',
  },
  keyboardAvoidingView: {
    flex: 1,
    maxHeight: '80%',
  },
  modalScrollView: {
    flex: 1,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    textAlign: 'center',
    flex: 1,
  },
  formGroup: {
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  label: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  typeOption: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
    minWidth: 100,
  },
  typeOptionSelected: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  typeLabel: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  typeLabelSelected: {
    color: COLORS.background,
  },
  filePickerContainer: {
    // Отступы теперь управляются через formGroup
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
  },
  filePickerButtonText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.text,
    marginLeft: SPACING.xs,
  },
  selectedFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectedFileName: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    marginLeft: SPACING.sm,
    marginRight: SPACING.sm,
  },
  // Grid styles
  gridContainer: {
    padding: SPACING.md,
    paddingTop: SPACING.lg,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  gridCard: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  gridCardContent: {
    position: 'relative',
  },
  gridPreview: {
    height: 120,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridInfo: {
    padding: SPACING.sm,
  },
  gridName: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  gridType: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  gridExpiry: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: COLORS.warning,
  },
  gridDeleteButton: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.error + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridDownloadButtonBottom: {
    position: 'absolute',
    bottom: SPACING.xs,
    right: SPACING.xs,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ACTION_COLORS.colorDownload + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Document Viewer Modal styles
  documentViewerContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  documentViewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  documentViewerCloseButton: {
    padding: SPACING.sm,
  },
  documentViewerTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    flex: 1,
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
  scrollView: {
    flex: 1,
  },
  emptyCard: {
    margin: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  addButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  headerCard: {
    margin: SPACING.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  listContent: {
    paddingBottom: SPACING.xl,
  },
});

export default VehicleDocumentsScreen;

