import * as React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '../constants';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Feather from 'react-native-vector-icons/Feather';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

const Icon: React.FC<IconProps> = ({ 
  name, 
  size = 24, 
  color = COLORS.text, 
  style
}) => {
  const getIconComponent = (iconName: string) => {
    const iconMap: Record<string, { component: any; iconName: string }> = {
      // Navigation icons
      'home': { component: MaterialIcons, iconName: 'home' },
      'manual': { component: MaterialIcons, iconName: 'menu' },
      'reminders': { component: MaterialIcons, iconName: 'notifications' },
      'sto': { component: MaterialIcons, iconName: 'business' },
      'history': { component: MaterialIcons, iconName: 'history' },
      'profile': { component: MaterialIcons, iconName: 'person' },
      'actions': { component: MaterialIcons, iconName: 'apps' },
      
      // Action icons
      'add': { component: MaterialIcons, iconName: 'add' },
      'edit': { component: MaterialIcons, iconName: 'edit' },
      'delete': { component: MaterialIcons, iconName: 'delete' },
      'close': { component: MaterialIcons, iconName: 'close' },
      'forward': { component: MaterialIcons, iconName: 'arrow-forward' },
      'back': { component: MaterialIcons, iconName: 'arrow-back' },
      
      // Status icons
      'notification': { component: MaterialIcons, iconName: 'notifications' },
      'error': { component: MaterialIcons, iconName: 'error' },
      'success': { component: MaterialIcons, iconName: 'check' },
      'warning': { component: MaterialIcons, iconName: 'warning' },
      'info': { component: MaterialIcons, iconName: 'info' },
      
      // Calendar and time
      'calendar': { component: MaterialIcons, iconName: 'event' },
      'tachometer-alt': { component: MaterialIcons, iconName: 'speed' },
      'clock': { component: MaterialIcons, iconName: 'access-time' },
      
      // Files
      'file-pdf': { component: MaterialIcons, iconName: 'picture-as-pdf' },
      'file': { component: MaterialIcons, iconName: 'insert-drive-file' },
      'folder': { component: MaterialIcons, iconName: 'folder' },
      
      // Car
      'car': { component: MaterialIcons, iconName: 'directions-car' },
      
      // Utility
      'refresh': { component: MaterialIcons, iconName: 'refresh' },
      'lightbulb': { component: MaterialIcons, iconName: 'lightbulb' },
      
      // Settings
      'theme': { component: MaterialIcons, iconName: 'palette' },
      'language': { component: MaterialIcons, iconName: 'language' },
      'about': { component: MaterialIcons, iconName: 'info' },
      'help': { component: MaterialIcons, iconName: 'help' },
      'contact': { component: MaterialIcons, iconName: 'contact-mail' },
      'star': { component: MaterialIcons, iconName: 'star' },
      
      // Additional icons
      'search': { component: MaterialIcons, iconName: 'search' },
      'filter': { component: MaterialIcons, iconName: 'filter-list' },
      'sort': { component: MaterialIcons, iconName: 'sort' },
      'download': { component: MaterialIcons, iconName: 'download' },
      'copy': { component: MaterialIcons, iconName: 'content-copy' },
      'settings': { component: MaterialIcons, iconName: 'settings' },
      'logout': { component: MaterialIcons, iconName: 'logout' },
      'exit': { component: MaterialIcons, iconName: 'exit-to-app' },
      'menu': { component: MaterialIcons, iconName: 'menu' },
      'menu-close': { component: MaterialIcons, iconName: 'close' },
      'arrow-up': { component: MaterialIcons, iconName: 'keyboard-arrow-up' },
      'arrow-down': { component: MaterialIcons, iconName: 'keyboard-arrow-down' },
      'arrow-left': { component: MaterialIcons, iconName: 'keyboard-arrow-left' },
      'arrow-right': { component: MaterialIcons, iconName: 'keyboard-arrow-right' },
      'heart': { component: MaterialIcons, iconName: 'favorite' },
      'star-outline': { component: MaterialIcons, iconName: 'star-border' },
      'user-circle': { component: MaterialIcons, iconName: 'account-circle' },
      'avatar': { component: MaterialIcons, iconName: 'account-circle' },
      'admin': { component: MaterialIcons, iconName: 'admin-panel-settings' },
      'catalog': { component: MaterialIcons, iconName: 'apps' },
      'cart': { component: MaterialIcons, iconName: 'shopping-cart' },
      'business': { component: MaterialIcons, iconName: 'business' },
      'creative': { component: MaterialIcons, iconName: 'palette' },
      'tech': { component: MaterialIcons, iconName: 'computer' },
      'education': { component: MaterialIcons, iconName: 'school' },
      'lifestyle': { component: MaterialIcons, iconName: 'favorite' },
      'credit-card': { component: MaterialIcons, iconName: 'credit-card' },
      'paypal': { component: MaterialIcons, iconName: 'payment' },
      'image': { component: MaterialIcons, iconName: 'image' },
      'video': { component: MaterialIcons, iconName: 'videocam' },
      'empty-cart': { component: MaterialIcons, iconName: 'shopping-cart' },
      'empty-prompts': { component: MaterialIcons, iconName: 'search' },
      'empty-reviews': { component: MaterialIcons, iconName: 'star' },
      'chart-bar': { component: MaterialIcons, iconName: 'bar-chart' },
      'wallet': { component: MaterialIcons, iconName: 'account-balance-wallet' },
      'money': { component: MaterialIcons, iconName: 'attach-money' },
      'fuel': { component: MaterialIcons, iconName: 'local-gas-station' },
      'laptop': { component: MaterialIcons, iconName: 'laptop' },
      'rocket': { component: MaterialIcons, iconName: 'rocket-launch' },
      'book': { component: MaterialIcons, iconName: 'book' },
      'hospital': { component: MaterialIcons, iconName: 'local-hospital' },
      'balance': { component: MaterialIcons, iconName: 'balance' },
      'eye': { component: MaterialIcons, iconName: 'visibility' },
      'spinner': { component: MaterialIcons, iconName: 'refresh' },
      
      // Additional useful icons
      'phone': { component: MaterialIcons, iconName: 'phone' },
      'mail': { component: MaterialIcons, iconName: 'mail' },
      'map': { component: MaterialIcons, iconName: 'map' },
      'pin': { component: MaterialIcons, iconName: 'place' },
      'lock': { component: MaterialIcons, iconName: 'lock' },
      'unlock': { component: MaterialIcons, iconName: 'lock-open' },
      'wifi': { component: MaterialIcons, iconName: 'wifi' },
      'battery-icon': { component: MaterialIcons, iconName: 'battery-full' },
      'signal': { component: MaterialIcons, iconName: 'signal-cellular-4-bar' },
      'wrench': { component: MaterialIcons, iconName: 'build' },
      'tool': { component: MaterialIcons, iconName: 'build' },
      'cog': { component: MaterialIcons, iconName: 'settings' },
      'sliders': { component: MaterialIcons, iconName: 'tune' },
      'toggle-left': { component: MaterialIcons, iconName: 'toggle-off' },
      'toggle-right': { component: MaterialIcons, iconName: 'toggle-on' },
      'check-circle': { component: MaterialIcons, iconName: 'check-circle' },
      'x-circle': { component: MaterialIcons, iconName: 'cancel' },
      'alert-circle': { component: MaterialIcons, iconName: 'error' },
      'help-circle': { component: MaterialIcons, iconName: 'help' },
      'message-circle': { component: MaterialIcons, iconName: 'message' },
      'thumbs-up': { component: MaterialIcons, iconName: 'thumb-up' },
      'thumbs-down': { component: MaterialIcons, iconName: 'thumb-down' },
      'share': { component: MaterialIcons, iconName: 'share' },
      'external-link': { component: MaterialIcons, iconName: 'open-in-new' },
      'chevron-up': { component: MaterialIcons, iconName: 'keyboard-arrow-up' },
      'chevron-down': { component: MaterialIcons, iconName: 'keyboard-arrow-down' },
      'chevron-left': { component: MaterialIcons, iconName: 'keyboard-arrow-left' },
      'chevron-right': { component: MaterialIcons, iconName: 'keyboard-arrow-right' },
      'chevrons-up': { component: MaterialIcons, iconName: 'keyboard-double-arrow-up' },
      'chevrons-down': { component: MaterialIcons, iconName: 'keyboard-double-arrow-down' },
      'chevrons-left': { component: MaterialIcons, iconName: 'keyboard-double-arrow-left' },
      'chevrons-right': { component: MaterialIcons, iconName: 'keyboard-double-arrow-right' },
      'rotate-ccw': { component: MaterialIcons, iconName: 'rotate-left' },
      'rotate-cw': { component: MaterialIcons, iconName: 'rotate-right' },
      'move': { component: MaterialIcons, iconName: 'open-with' },
      'maximize': { component: MaterialIcons, iconName: 'fullscreen' },
      'minimize': { component: MaterialIcons, iconName: 'fullscreen-exit' },
      'square': { component: MaterialIcons, iconName: 'crop-square' },
      'circle': { component: MaterialIcons, iconName: 'radio-button-unchecked' },
      'triangle': { component: MaterialIcons, iconName: 'change-history' },
      'hexagon': { component: MaterialIcons, iconName: 'hexagon' },
      'octagon': { component: MaterialIcons, iconName: 'octagon' },
      'diamond': { component: MaterialIcons, iconName: 'diamond' },
      'activity': { component: MaterialIcons, iconName: 'activity' },
      'airplay': { component: MaterialIcons, iconName: 'airplay' },
      'align-center': { component: MaterialIcons, iconName: 'format-align-center' },
      'align-left': { component: MaterialIcons, iconName: 'format-align-left' },
      'align-right': { component: MaterialIcons, iconName: 'format-align-right' },
      'archive': { component: MaterialIcons, iconName: 'archive' },
      'arrow-up-right': { component: MaterialIcons, iconName: 'north-east' },
      'arrow-down-left': { component: MaterialIcons, iconName: 'south-west' },
      'arrow-down-right': { component: MaterialIcons, iconName: 'south-east' },
      'arrow-up-left': { component: MaterialIcons, iconName: 'north-west' },
      'at-sign': { component: MaterialIcons, iconName: 'alternate-email' },
      'award': { component: MaterialIcons, iconName: 'emoji-events' },
      'bar-chart': { component: MaterialIcons, iconName: 'bar-chart' },
      'bookmark': { component: MaterialIcons, iconName: 'bookmark' },
      'box': { component: MaterialIcons, iconName: 'inbox' },
      'building': { component: MaterialIcons, iconName: 'business' },
      'calculator': { component: MaterialIcons, iconName: 'calculate' },
      'camera': { component: MaterialIcons, iconName: 'camera-alt' },
      'cast': { component: MaterialIcons, iconName: 'cast' },
      'check-square': { component: MaterialIcons, iconName: 'check-box' },
      'coffee': { component: MaterialIcons, iconName: 'coffee' },
      'compass': { component: MaterialIcons, iconName: 'explore' },
      'database': { component: MaterialIcons, iconName: 'storage' },
      'dollar-sign': { component: MaterialIcons, iconName: 'attach-money' },
      'gift': { component: MaterialIcons, iconName: 'card-giftcard' },
      'hash': { component: MaterialIcons, iconName: 'tag' },
      'headphones': { component: MaterialIcons, iconName: 'headphones' },
      'key': { component: MaterialIcons, iconName: 'vpn-key' },
      'layers': { component: MaterialIcons, iconName: 'layers' },
      'link': { component: MaterialIcons, iconName: 'link' },
      'list': { component: MaterialIcons, iconName: 'list' },
      'loader': { component: MaterialIcons, iconName: 'refresh' },
      'moon': { component: MaterialIcons, iconName: 'dark-mode' },
      'music': { component: MaterialIcons, iconName: 'music-note' },
      'navigation': { component: MaterialIcons, iconName: 'navigation' },
      'package': { component: MaterialIcons, iconName: 'inventory' },
      'paperclip': { component: MaterialIcons, iconName: 'attach-file' },
      'pie-chart': { component: MaterialIcons, iconName: 'pie-chart' },
      'printer': { component: MaterialIcons, iconName: 'print' },
      'radio': { component: MaterialIcons, iconName: 'radio' },
      'save': { component: MaterialIcons, iconName: 'save' },
      'send': { component: MaterialIcons, iconName: 'send' },
      'server': { component: MaterialIcons, iconName: 'dns' },
      'smartphone': { component: MaterialIcons, iconName: 'smartphone' },
      'sun': { component: MaterialIcons, iconName: 'light-mode' },
      'tag': { component: MaterialIcons, iconName: 'tag' },
      'terminal': { component: MaterialIcons, iconName: 'terminal' },
      'thermometer': { component: MaterialIcons, iconName: 'thermostat' },
      'trash': { component: MaterialIcons, iconName: 'delete' },
      'truck': { component: MaterialIcons, iconName: 'local-shipping' },
      'umbrella': { component: MaterialIcons, iconName: 'umbrella' },
      'upload': { component: MaterialIcons, iconName: 'upload' },
      'users': { component: MaterialIcons, iconName: 'group' },
      'location': { component: MaterialIcons, iconName: 'location-on' },
      'volume1': { component: MaterialIcons, iconName: 'volume-up' },
      'volume2': { component: MaterialIcons, iconName: 'volume-up' },
      'volume-x': { component: MaterialIcons, iconName: 'volume-off' },
      'watch': { component: MaterialIcons, iconName: 'watch' },
      'wind': { component: MaterialIcons, iconName: 'air' },
      'zoom-in': { component: MaterialIcons, iconName: 'zoom-in' },
      'zoom-out': { component: MaterialIcons, iconName: 'zoom-out' },
      
      // Reminder type icons (from backend seeder)
      'oil-barrel': { component: MaterialIcons, iconName: 'local-gas-station' },
      'filter-alt': { component: MaterialIcons, iconName: 'filter-alt' },
      'tire-repair': { component: MaterialIcons, iconName: 'tire-repair' },
      'car-repair': { component: MaterialIcons, iconName: 'build' },
      'water-drop': { component: MaterialIcons, iconName: 'water-drop' },
      'battery-full': { component: MaterialIcons, iconName: 'battery-full' },
      'engineering': { component: MaterialIcons, iconName: 'engineering' },
      'electrical-services': { component: MaterialIcons, iconName: 'electrical-services' },
      'car-crash': { component: MaterialIcons, iconName: 'car-crash' },
      
      // Reminder type keys (from Reminder interface)
      'oil': { component: MaterialIcons, iconName: 'local-gas-station' },
      'filters': { component: MaterialIcons, iconName: 'filter-alt' },
      'tires': { component: MaterialIcons, iconName: 'tire-repair' },
      'brakes': { component: MaterialIcons, iconName: 'build' },
      'coolant': { component: MaterialIcons, iconName: 'water-drop' },
      'inspection': { component: MaterialIcons, iconName: 'search' },
      'timing_belt': { component: MaterialIcons, iconName: 'settings' },
      'transmission': { component: MaterialIcons, iconName: 'settings' },
      'battery': { component: MaterialIcons, iconName: 'battery-full' },
      'engine': { component: MaterialIcons, iconName: 'engineering' },
      'electrical': { component: MaterialIcons, iconName: 'electrical-services' },
      'suspension': { component: MaterialIcons, iconName: 'car-crash' },
      'other': { component: MaterialIcons, iconName: 'build' },
    };
    
    return iconMap[iconName] || { component: MaterialIcons, iconName: 'info' };
  };

  const { component: IconComponent, iconName } = getIconComponent(name);

  return (
    <View style={[styles.container, style]}>
      <IconComponent 
        name={iconName}
        size={size} 
        color={color} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Icon;