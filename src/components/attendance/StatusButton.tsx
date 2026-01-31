import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Check, X, Info, Clock } from 'lucide-react-native';

import { COLORS } from '../../constants';

type AttendanceStatus = 'present' | 'absent' | 'excused' | 'late';

interface StatusButtonProps {
  status: AttendanceStatus;
  isSelected: boolean;
  onPress: () => void;
}

const STATUS_CONFIG: Record<AttendanceStatus, {
  label: string;
  color: string;
  bgColor: string;
  selectedBgColor: string;
  icon: typeof Check;
}> = {
  present: {
    label: 'Present',
    color: COLORS.success,
    bgColor: '#D1FAE5',
    selectedBgColor: COLORS.success,
    icon: Check,
  },
  absent: {
    label: 'Absent',
    color: COLORS.danger,
    bgColor: '#FEE2E2',
    selectedBgColor: COLORS.danger,
    icon: X,
  },
  excused: {
    label: 'Excused',
    color: COLORS.info,
    bgColor: '#CFFAFE',
    selectedBgColor: COLORS.info,
    icon: Info,
  },
  late: {
    label: 'Late',
    color: COLORS.warning,
    bgColor: '#FEF3C7',
    selectedBgColor: COLORS.warning,
    icon: Clock,
  },
};

export default function StatusButton({ status, isSelected, onPress }: StatusButtonProps) {
  const config = STATUS_CONFIG[status];
  const IconComponent = config.icon;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: isSelected ? config.selectedBgColor : config.bgColor,
          borderColor: config.color,
        },
        isSelected && styles.selectedButton,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <IconComponent
        size={20}
        color={isSelected ? '#FFFFFF' : config.color}
      />
      <Text
        style={[
          styles.label,
          { color: isSelected ? '#FFFFFF' : config.color },
        ]}
      >
        {config.label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
  },
  selectedButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
});
