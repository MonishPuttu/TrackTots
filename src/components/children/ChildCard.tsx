import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { User, Pencil, ChevronRight } from 'lucide-react-native';
import { COLORS } from '../../constants';

interface ChildCardProps {
  id: string;
  name: string;
  age: number | null;
  classCount: number;
  attendanceRate: number;
  avatarUri?: string;
  onPress: () => void;
  onEdit: () => void;
}

export default function ChildCard({
  name,
  age,
  classCount,
  attendanceRate,
  onPress,
  onEdit,
}: ChildCardProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <User size={28} color={COLORS.gray[400]} />
        </View>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.ageText}>
          {age !== null ? `${age} years old` : 'Age not set'}
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{classCount}</Text>
          <Text style={styles.statLabel}>Classes</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{attendanceRate}%</Text>
          <Text style={styles.statLabel}>Rate</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.editButton}
        onPress={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Pencil size={18} color={COLORS.gray[400]} />
      </TouchableOpacity>

      <ChevronRight size={20} color={COLORS.gray[300]} style={styles.chevron} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginBottom: 4,
  },
  ageText: {
    fontSize: 13,
    color: COLORS.gray[500],
  },
  statsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  stat: {
    alignItems: 'center',
    marginHorizontal: 8,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.gray[400],
    marginTop: 2,
  },
  editButton: {
    padding: 8,
    marginRight: 4,
  },
  chevron: {
    marginLeft: 4,
  },
});
