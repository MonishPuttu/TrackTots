import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Check, X, Info, Clock, Zap } from 'lucide-react-native';

import { COLORS } from '../../constants';

interface AttendanceRecordCardProps {
  id: string;
  childName: string;
  className: string;
  date: string;
  status: 'present' | 'absent' | 'excused' | 'late';
  checkInTime?: number;
  wasAutomatic: boolean;
  onPress?: () => void;
}

const STATUS_CONFIG = {
  present: {
    label: 'Present',
    color: COLORS.success,
    bgColor: '#D1FAE5',
    icon: Check,
  },
  absent: {
    label: 'Absent',
    color: COLORS.danger,
    bgColor: '#FEE2E2',
    icon: X,
  },
  excused: {
    label: 'Excused',
    color: COLORS.info,
    bgColor: '#CFFAFE',
    icon: Info,
  },
  late: {
    label: 'Late',
    color: COLORS.warning,
    bgColor: '#FEF3C7',
    icon: Clock,
  },
};

export default function AttendanceRecordCard({
  childName,
  className,
  date,
  status,
  checkInTime,
  wasAutomatic,
  onPress,
}: AttendanceRecordCardProps) {
  const config = STATUS_CONFIG[status];
  const IconComponent = config.icon;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.leftContent}>
        <Text style={styles.childName}>{childName}</Text>
        <Text style={styles.className}>{className}</Text>
        <View style={styles.timeRow}>
          <Text style={styles.date}>{formatDate(date)}</Text>
          {checkInTime && (
            <Text style={styles.time}> • {formatTime(checkInTime)}</Text>
          )}
        </View>
      </View>

      <View style={styles.rightContent}>
        <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
          <IconComponent size={14} color={config.color} />
          <Text style={[styles.statusText, { color: config.color }]}>
            {config.label}
          </Text>
        </View>
        {wasAutomatic && (
          <View style={styles.autoBadge}>
            <Zap size={12} color={COLORS.secondary} />
            <Text style={styles.autoText}>Auto</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  leftContent: {
    flex: 1,
  },
  childName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginBottom: 2,
  },
  className: {
    fontSize: 13,
    color: COLORS.gray[600],
    marginBottom: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    fontSize: 12,
    color: COLORS.gray[500],
  },
  time: {
    fontSize: 12,
    color: COLORS.gray[500],
  },
  rightContent: {
    alignItems: 'flex-end',
    gap: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  autoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#F3E8FF',
    borderRadius: 8,
  },
  autoText: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.secondary,
  },
});
