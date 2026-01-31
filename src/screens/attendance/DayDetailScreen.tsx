import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Calendar, Users, Check, Plus } from 'lucide-react-native';
import { Q } from '@nozbe/watermelondb';

import { AttendanceRecordCard, StatusButton } from '../../components/attendance';
import { COLORS } from '../../constants';
import database from '../../database';
import type Class from '../../database/models/Class';
import type Child from '../../database/models/Child';
import type AttendanceRecord from '../../database/models/AttendanceRecord';

type DayDetailRouteParams = {
  DayDetail: {
    date: string; // YYYY-MM-DD
  };
};

interface ClassWithAttendance {
  classId: string;
  className: string;
  childId: string;
  childName: string;
  startTime: string;
  endTime: string;
  attendance: AttendanceRecord | null;
}

export default function DayDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<DayDetailRouteParams, 'DayDetail'>>();
  const insets = useSafeAreaInsets();
  const { date } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [classesForDay, setClassesForDay] = useState<ClassWithAttendance[]>([]);

  useEffect(() => {
    loadDayData();
  }, [date]);

  const loadDayData = async () => {
    try {
      const selectedDate = new Date(date);
      const dayOfWeek = selectedDate.getDay(); // 0-6, Sunday-Saturday
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek];

      // Get all active classes
      const allClasses = await database
        .get<Class>('classes')
        .query(Q.where('is_active', true))
        .fetch();

      // Get all attendance records for this date
      const attendanceRecords = await database
        .get<AttendanceRecord>('attendance_records')
        .query(Q.where('date', date))
        .fetch();

      // Create a map of classId -> attendance record
      const attendanceMap = new Map<string, AttendanceRecord>();
      attendanceRecords.forEach(record => {
        attendanceMap.set(record.classId, record);
      });

      // Filter classes scheduled for this day of week and build the list
      const scheduledClasses: ClassWithAttendance[] = [];

      for (const cls of allClasses) {
        // Parse schedule and check if class runs on this day
        const schedule = cls.schedule;
        if (!schedule) continue;

        const daySchedule = schedule[dayName as keyof typeof schedule];
        if (!daySchedule || !daySchedule.enabled) continue;

        // Get child name
        const child = await database.get<Child>('children').find(cls.childId);

        scheduledClasses.push({
          classId: cls.id,
          className: cls.name,
          childId: cls.childId,
          childName: child.name,
          startTime: daySchedule.startTime,
          endTime: daySchedule.endTime,
          attendance: attendanceMap.get(cls.id) || null,
        });
      }

      // Sort by start time
      scheduledClasses.sort((a, b) => a.startTime.localeCompare(b.startTime));

      setClassesForDay(scheduledClasses);
    } catch (error) {
      console.error('Error loading day data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDisplayDate = (): string => {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  const getStats = () => {
    const scheduled = classesForDay.length;
    const attended = classesForDay.filter(c => c.attendance?.status === 'present' || c.attendance?.status === 'late').length;
    return { scheduled, attended };
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleAddManualEntry = () => {
    navigation.navigate('ManualAttendance', { preselectedDate: date });
  };

  const handleClassPress = (classItem: ClassWithAttendance) => {
    navigation.navigate('ManualAttendance', {
      preselectedDate: date,
      preselectedClassId: classItem.classId,
    });
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'present':
        return { bg: '#DCFCE7', text: '#16A34A' };
      case 'absent':
        return { bg: '#FEE2E2', text: '#DC2626' };
      case 'excused':
        return { bg: '#FEF3C7', text: '#D97706' };
      case 'late':
        return { bg: '#DBEAFE', text: '#2563EB' };
      default:
        return { bg: COLORS.gray[100], text: COLORS.gray[500] };
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const stats = getStats();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color={COLORS.gray[800]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Day Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Date Card */}
        <View style={styles.dateCard}>
          <View style={styles.dateIconContainer}>
            <Calendar size={24} color={COLORS.primary} />
          </View>
          <Text style={styles.dateText}>{formatDisplayDate()}</Text>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#DBEAFE' }]}>
              <Users size={20} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.statValue}>{stats.scheduled}</Text>
              <Text style={styles.statLabel}>Scheduled</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#DCFCE7' }]}>
              <Check size={20} color="#16A34A" />
            </View>
            <View>
              <Text style={styles.statValue}>{stats.attended}</Text>
              <Text style={styles.statLabel}>Attended</Text>
            </View>
          </View>
        </View>

        {/* Classes List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Classes</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddManualEntry}>
              <Plus size={16} color={COLORS.primary} />
              <Text style={styles.addButtonText}>Add Entry</Text>
            </TouchableOpacity>
          </View>

          {classesForDay.length > 0 ? (
            <View style={styles.classesList}>
              {classesForDay.map((item, index) => {
                const statusColors = getStatusColor(item.attendance?.status);
                return (
                  <TouchableOpacity
                    key={`${item.classId}-${index}`}
                    style={styles.classCard}
                    onPress={() => handleClassPress(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.classInfo}>
                      <Text style={styles.className}>{item.className}</Text>
                      <Text style={styles.childName}>{item.childName}</Text>
                      <Text style={styles.classTime}>
                        {formatTime(item.startTime)} - {formatTime(item.endTime)}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                      <Text style={[styles.statusText, { color: statusColors.text }]}>
                        {item.attendance?.status
                          ? item.attendance.status.charAt(0).toUpperCase() + item.attendance.status.slice(1)
                          : 'Not Marked'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Calendar size={48} color={COLORS.gray[300]} />
              <Text style={styles.emptyTitle}>No Classes Scheduled</Text>
              <Text style={styles.emptyText}>
                There are no classes scheduled for this day.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.gray[500],
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  headerSpacer: {
    width: 40,
  },

  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Date Card
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  dateIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.gray[800],
    flex: 1,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.gray[800],
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.gray[500],
  },

  // Section
  section: {},
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Classes List
  classesList: {
    gap: 12,
  },
  classCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.gray[50],
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  classInfo: {
    flex: 1,
    gap: 4,
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  childName: {
    fontSize: 14,
    color: COLORS.gray[600],
  },
  classTime: {
    fontSize: 13,
    color: COLORS.gray[500],
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.gray[700],
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray[500],
    textAlign: 'center',
  },
});
