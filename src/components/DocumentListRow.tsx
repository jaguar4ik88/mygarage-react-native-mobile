import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Icon from './Icon';
import { COLORS, FONTS, SPACING, ACTION_COLORS, RADIUS, hexToRgba } from '../constants';

export interface VehicleDocument {
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

export interface DocumentListRowProps {
  document: VehicleDocument;
  onPress: () => void;
  onDelete: () => void;
  onDownload: () => void;
  getDocumentTypeLabel: (type: string) => string;
  getDocumentTypeIcon: (type: string) => string;
  t: (key: string) => string;
}

const DocumentListRow: React.FC<DocumentListRowProps> = ({
  document,
  onPress,
  onDelete,
  onDownload,
  getDocumentTypeLabel,
  getDocumentTypeIcon,
  t,
}) => {
  const [imageError, setImageError] = useState(false);
  const showThumb =
    Boolean(document.file_url && document.mime_type?.startsWith('image/') && !imageError);

  const subtitleParts = [getDocumentTypeLabel(document.type)];
  if (document.expiry_date) {
    subtitleParts.push(
      `${t('documents.expires')} ${new Date(document.expiry_date).toLocaleDateString()}`
    );
  }
  const subtitle = subtitleParts.join(' · ');

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
    >
      <View style={styles.thumbWrap}>
        {showThumb ? (
          <Image
            source={{ uri: document.file_url }}
            style={styles.thumbImage}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.thumbIcon}>
            <Icon
              name={getDocumentTypeIcon(document.type)}
              size={22}
              color={ACTION_COLORS.colorDocumentions}
            />
          </View>
        )}
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {document.name}
        </Text>
        <Text style={styles.rowSub} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onDownload}
        style={styles.downloadBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={t('documents.saveDocument')}
      >
        <Icon name="download" size={18} color={COLORS.accent} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onDelete}
        style={styles.iconBtn}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel={t('documents.delete.confirm')}
      >
        <Icon name="delete" size={18} color={ACTION_COLORS.colorDelete} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.md,
  },
  thumbWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: hexToRgba(COLORS.text, 0.07),
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbIcon: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 4,
  },
  rowSub: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  iconBtn: {
    padding: SPACING.xs,
  },
  downloadBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: hexToRgba(COLORS.accent, 0.12),
  },
});

export default DocumentListRow;
