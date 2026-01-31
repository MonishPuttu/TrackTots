import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants';

interface StatCardProps {
  label: string;
  value: string;
  sublabel: string;
}

export default function StatCard({ label, value, sublabel }: StatCardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.sublabel}>{sublabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    minHeight: 110,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.gray[500],
    marginBottom: 8,
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  sublabel: {
    fontSize: 12,
    color: COLORS.gray[400],
  },
});
