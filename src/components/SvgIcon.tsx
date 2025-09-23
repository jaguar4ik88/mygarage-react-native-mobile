import React from 'react';
import { View, StyleSheet, TextStyle } from 'react-native';
import Svg, { Use } from 'react-native-svg';
import { COLORS } from '../constants';

interface SvgIconProps {
  name: string;
  size?: number;
  color?: string;
  style?: TextStyle;
}

const SvgIcon: React.FC<SvgIconProps> = ({ 
  name, 
  size = 24, 
  color = COLORS.text, 
  style 
}) => {
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Use href={`#${name}`} fill={color} />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SvgIcon;
