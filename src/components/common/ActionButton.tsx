import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../../constants';

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}

export default function ActionButton({ icon, label, onPress }: ActionButtonProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>{icon}</View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[100],
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
  },
  iconContainer: {
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.gray[700],
    textAlign: 'center',
  },
});
