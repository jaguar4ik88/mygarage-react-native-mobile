import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from './Icon';

const IconTest: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Icon Test</Text>
      
      <View style={styles.row}>
        <Icon name="home" size={32} color="#FF0000" />
        <Icon name="add" size={32} color="#00FF00" />
        <Icon name="delete" size={32} color="#0000FF" />
        <Icon name="calendar" size={32} color="#FF00FF" />
      </View>
      
      <View style={styles.row}>
        <Icon name="notification" size={32} color="#FFFF00" />
        <Icon name="car" size={32} color="#00FFFF" />
        <Icon name="refresh" size={32} color="#FFA500" />
        <Icon name="star" size={32} color="#800080" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
});

export default IconTest;
