import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../../constants';

interface ClassCardProps {
  name: string;
  time: string;
  status: 'present' | 'upcoming' | 'absent' | 'late';
  child: string;
  color: string;
  onPress: () => void;
}

export default function ClassCard({
  name,
  time,
  status,
  child,
  color,
  onPress,
}: ClassCardProps) {
  const getStatusStyle = () => {
    switch (status) {
      case 'present':
        return { backgroundColor: '#DCFCE7', color: '#166534' };
      case 'late':
        return { backgroundColor: '#FEF3C7', color: '#92400E' };
      case 'absent':
        return { backgroundColor: '#FEE2E2', color: '#991B1B' };
      default:
        return { backgroundColor: COLORS.gray[100], color: COLORS.gray[600] };
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'present':
        return 'Present';
      case 'late':
        return 'Late';
      case 'absent':
        return 'Absent';
      default:
        return 'Upcoming';
    }
  };

  const statusStyle = getStatusStyle();

  return (
    <TouchableOpacity
      style={[styles.container, { borderLeftColor: color }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.mainInfo}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.time}>{time}</Text>
          <Text style={styles.child}>{child}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusStyle.backgroundColor },
          ]}
        >
          <Text style={[styles.statusText, { color: statusStyle.color }]}>
            {getStatusText()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderLeftWidth: 4,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  mainInfo: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  time: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  child: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
