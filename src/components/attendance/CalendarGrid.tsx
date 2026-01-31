import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { COLORS } from '../../constants';

interface DayAttendance {
  date: string; // YYYY-MM-DD
  allPresent: boolean;
  hasAbsent: boolean;
  hasClasses: boolean;
}

interface CalendarGridProps {
  year: number;
  month: number; // 0-11
  attendanceData: Map<string, DayAttendance>;
  onDayPress: (date: string) => void;
  onMonthChange: (year: number, month: number) => void;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CalendarGrid({
  year,
  month,
  attendanceData,
  onDayPress,
  onMonthChange,
}: CalendarGridProps) {
  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const calendar = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      cells.push(null);
    }

    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(day);
    }

    // Fill remaining cells to complete the grid
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [year, month]);

  const weeks = useMemo(() => {
    const result: (number | null)[][] = [];
    for (let i = 0; i < calendar.length; i += 7) {
      result.push(calendar.slice(i, i + 7));
    }
    return result;
  }, [calendar]);

  const handlePrevMonth = () => {
    if (month === 0) {
      onMonthChange(year - 1, 11);
    } else {
      onMonthChange(year, month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      onMonthChange(year + 1, 0);
    } else {
      onMonthChange(year, month + 1);
    }
  };

  const getDayStyle = (day: number | null) => {
    if (!day) return null;

    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = dateString === todayString;
    const attendance = attendanceData.get(dateString);

    if (isToday) {
      return { backgroundColor: COLORS.primary, textColor: '#FFFFFF' };
    }

    if (attendance) {
      if (!attendance.hasClasses) {
        return { backgroundColor: COLORS.gray[100], textColor: COLORS.gray[500] };
      }
      if (attendance.allPresent) {
        return { backgroundColor: '#D1FAE5', textColor: COLORS.success };
      }
      if (attendance.hasAbsent) {
        return { backgroundColor: '#FEE2E2', textColor: COLORS.danger };
      }
    }

    return { backgroundColor: '#FFFFFF', textColor: COLORS.gray[800] };
  };

  const handleDayPress = (day: number | null) => {
    if (!day) return;
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onDayPress(dateString);
  };

  return (
    <View style={styles.container}>
      {/* Month Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.navButton} onPress={handlePrevMonth}>
          <ChevronLeft size={24} color={COLORS.gray[700]} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {MONTHS[month]} {year}
        </Text>
        <TouchableOpacity style={styles.navButton} onPress={handleNextMonth}>
          <ChevronRight size={24} color={COLORS.gray[700]} />
        </TouchableOpacity>
      </View>

      {/* Day Headers */}
      <View style={styles.weekRow}>
        {DAYS_OF_WEEK.map((day) => (
          <View key={day} style={styles.dayHeader}>
            <Text style={styles.dayHeaderText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.weekRow}>
          {week.map((day, dayIndex) => {
            const dayStyle = getDayStyle(day);
            return (
              <TouchableOpacity
                key={dayIndex}
                style={[
                  styles.dayCell,
                  dayStyle && { backgroundColor: dayStyle.backgroundColor },
                ]}
                onPress={() => handleDayPress(day)}
                disabled={!day}
              >
                {day && (
                  <Text
                    style={[
                      styles.dayText,
                      dayStyle && { color: dayStyle.textColor },
                    ]}
                  >
                    {day}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray[500],
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    margin: 2,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
