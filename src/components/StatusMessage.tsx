import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SPACING } from '../constants';
import Icon from './Icon';

interface StatusMessageProps {
  type: 'loading' | 'error' | 'success' | 'info' | 'offline';
  title: string;
  message?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  showIcon?: boolean;
  t?: (key: string) => string;
}

const StatusMessage: React.FC<StatusMessageProps> = ({
  type,
  title,
  message,
  onRetry,
  onDismiss,
  showIcon = true,
  t,
}) => {
  const getIconName = () => {
    switch (type) {
      case 'loading':
        return 'loading';
      case 'error':
        return 'error';
      case 'success':
        return 'success';
      case 'info':
        return 'info';
      case 'offline':
        return 'warning';
      default:
        return 'info';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'loading':
        return COLORS.accent;
      case 'error':
        return COLORS.error;
      case 'success':
        return COLORS.success;
      case 'info':
        return COLORS.accent;
      case 'offline':
        return COLORS.warning;
      default:
        return COLORS.text;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'loading':
        return COLORS.card;
      case 'error':
        return COLORS.error + '20';
      case 'success':
        return COLORS.success + '20';
      case 'info':
        return COLORS.accent + '20';
      case 'offline':
        return COLORS.warning + '20';
      default:
        return COLORS.card;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'loading':
        return COLORS.border;
      case 'error':
        return COLORS.error;
      case 'success':
        return COLORS.success;
      case 'info':
        return COLORS.accent;
      case 'offline':
        return COLORS.warning;
      default:
        return COLORS.border;
    }
  };

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: getBackgroundColor(),
        borderColor: getBorderColor(),
      }
    ]}>
      <View style={styles.content}>
        {showIcon && (
          <Icon 
            name={getIconName()} 
            size={20} 
            color={getIconColor()} 
            style={styles.icon}
          />
        )}
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: getIconColor() }]}>
            {title}
          </Text>
          {message && (
            <Text style={styles.message}>
              {message}
            </Text>
          )}
        </View>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <Icon name="close" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Icon name="refresh" size={16} color={COLORS.accent} />
          <Text style={styles.retryText}>{t?.('common.retry') || 'Retry'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    margin: SPACING.md,
    padding: SPACING.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    marginRight: SPACING.sm,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  dismissButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  retryText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: SPACING.xs,
  },
});

export default StatusMessage;
