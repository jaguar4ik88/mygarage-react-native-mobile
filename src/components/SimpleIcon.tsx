import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { COLORS } from '../constants';

interface SimpleIconProps {
  name: string;
  size?: number;
  color?: string;
  style?: TextStyle;
}

const SimpleIcon: React.FC<SimpleIconProps> = ({ 
  name, 
  size = 24, 
  color = COLORS.text, 
  style 
}) => {
  const getIconSymbol = (iconName: string): string => {
    const iconMap: Record<string, string> = {
      // Navigation icons
      'home': '🏠',
      'manual': '📖',
      'reminders': '🔔',
      'sto': '📍',
      'history': '📊',
      'profile': '👤',
      
      // Action icons
      'add': '+',
      'edit': '✏️',
      'delete': '🗑️',
      'close': '✕',
      'forward': '→',
      'back': '←',
      
      // Status icons
      'notification': '🔔',
      'error': '❌',
      'success': '✅',
      'warning': '⚠️',
      'info': 'ℹ️',
      
      // Calendar and time
      'calendar': '📅',
      'tachometer-alt': '⏱️',
      
      // Files
      'file-pdf': '📄',
      
      // Car
      'car': '🚗',
      
      // Utility
      'refresh': '🔄',
      'lightbulb': '💡',
      
      // Settings
      'theme': '🎨',
      'language': '🌐',
      'about': 'ℹ️',
      'help': '❓',
      'contact': '📧',
      'star': '⭐',
    };
    
    return iconMap[iconName] || '?';
  };

  return (
    <Text 
      style={[
        styles.icon, 
        { 
          fontSize: size, 
          color: color 
        }, 
        style
      ]}
    >
      {getIconSymbol(name)}
    </Text>
  );
};

const styles = StyleSheet.create({
  icon: {
    textAlign: 'center',
    textAlignVertical: 'center',
  },
});

export default SimpleIcon;
