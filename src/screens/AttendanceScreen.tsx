import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Plus, Calendar } from 'lucide-react-native';
import { Q } from '@nozbe/watermelondb';

import { CalendarGrid, AttendanceRecordCard } from '../components/attendance';
import { COLORS } from '../constants';
import database from '../database';
import { getActiveChildren, getAllActiveClasses } from '../database/helpers';
import type Child from '../database/models/Child';
import type Class from '../database/models/Class';
import type AttendanceRecord from '../database/models/AttendanceRecord';
import type { Schedule } from '../types';

interface DayAttendance {
  date: string;
  allPresent: boolean;
  hasAbsent: boolean;
  hasClasses: boolean;
}

interface RecordWithDetails {
  id: string;
  childName: string;
  className: string;
  date: string;
  status: 'present' | 'absent' | 'excused' | 'late';
  checkInTime?: number;
  wasAutomatic: boolean;
}

export default function AttendanceScreen() {
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Calendar state
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [attendanceMap, setAttendanceMap] = useState<Map<string, DayAttendance>>(new Map());
  
  // Data state
  const [children, setChildren] = useState<Child[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [recentRecords, setRecentRecords] = useState<RecordWithDetails[]>([]);
  
  // Filter state
  const [selectedChildFilter, setSelectedChildFilter] = useState<string | null>(null);
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<'week' | 'month' | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [allChildren, allClasses] = await Promise.all([
        getActiveChildren(),
        getAllActiveClasses(),
      ]);
      
      setChildren(allChildren);
      setClasses(allClasses);

      // Load attendance for current month
      await loadMonthAttendance(currentYear, currentMonth, allClasses, allChildren);
      
      // Load recent records
      await loadRecentRecords(allChildren, allClasses);
    } catch (error) {
      console.error('Error loading attendance data:', error);
    }
  }, [currentYear, currentMonth]);

  const loadMonthAttendance = async (
    year: number,
    month: number,
    allClasses: Class[],
    allChildren: Child[]
  ) => {
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endMonth = month === 11 ? 0 : month + 1;
    const endYear = month === 11 ? year + 1 : year;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    // Get all attendance records for the month
    const records = await database
      .get<AttendanceRecord>('attendance_records')
      .query(
        Q.where('date', Q.gte(startDate)),
        Q.where('date', Q.lte(endDate))
      )
      .fetch();

    // Filter by child if selected
    const filteredClasses = selectedChildFilter
      ? allClasses.filter(c => c.childId === selectedChildFilter)
      : allClasses;

    // Build attendance map for each day
    const map = new Map<string, DayAttendance>();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, month, day).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      
      // Find classes scheduled for this day
      const scheduledClasses = filteredClasses.filter(cls => {
        const schedule = cls.schedule as Schedule;
        return schedule[dayOfWeek as keyof Schedule]?.enabled === true;
      });

      if (scheduledClasses.length === 0) {
        map.set(dateString, {
          date: dateString,
          allPresent: false,
          hasAbsent: false,
          hasClasses: false,
        });
        continue;
      }

      // Check attendance for each scheduled class
      const dayRecords = records.filter(r => r.date === dateString);
      let presentCount = 0;
      let absentCount = 0;

      for (const cls of scheduledClasses) {
        const record = dayRecords.find(r => r.classId === cls.id);
        if (record) {
          if (record.status === 'present' || record.status === 'late') {
            presentCount++;
          } else if (record.status === 'absent') {
            absentCount++;
          }
        }
      }

      map.set(dateString, {
        date: dateString,
        allPresent: presentCount === scheduledClasses.length && presentCount > 0,
        hasAbsent: absentCount > 0,
        hasClasses: true,
      });
    }

    setAttendanceMap(map);
  };

  const loadRecentRecords = async (allChildren: Child[], allClasses: Class[]) => {
    const records = await database
      .get<AttendanceRecord>('attendance_records')
      .query(Q.sortBy('date', Q.desc), Q.take(10))
      .fetch();

    const childMap = new Map(allChildren.map(c => [c.id, c.name]));
    const classMap = new Map(allClasses.map(c => [c.id, { name: c.name, childId: c.childId }]));

    const recordsWithDetails: RecordWithDetails[] = records.map(record => {
      const classInfo = classMap.get(record.classId);
      return {
        id: record.id,
        childName: childMap.get(classInfo?.childId || '') || 'Unknown',
        className: classInfo?.name || 'Unknown Class',
        date: record.date,
        status: record.status,
        checkInTime: record.checkInTime,
        wasAutomatic: record.wasAutomatic,
      };
    });

    // Filter by child if selected
    const filtered = selectedChildFilter
      ? recordsWithDetails.filter(r => {
          const classInfo = allClasses.find(c => c.name === r.className);
          return classInfo?.childId === selectedChildFilter;
        })
      : recordsWithDetails;

    setRecentRecords(filtered);
  };

  useEffect(() => {
    const initLoad = async () => {
      setIsLoading(true);
      await loadData();
      setIsLoading(false);
    };
    initLoad();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    if (classes.length > 0 && children.length > 0) {
      loadMonthAttendance(currentYear, currentMonth, classes, children);
      loadRecentRecords(children, classes);
    }
  }, [currentYear, currentMonth, selectedChildFilter, selectedTimeFilter]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  const handleMonthChange = (year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
  };

  const handleDayPress = (date: string) => {
    navigation.navigate('DayDetail', { date });
  };

  const handleManualEntry = () => {
    navigation.navigate('ManualAttendance');
  };

  const handleFilterPress = (type: 'child' | 'time', value: string | null) => {
    if (type === 'child') {
      setSelectedChildFilter(prev => prev === value ? null : value);
    } else if (type === 'time') {
      setSelectedTimeFilter(prev => prev === value ? null : value as 'week' | 'month' | null);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading attendance...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Attendance</Text>
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              !selectedChildFilter && styles.filterChipActive,
            ]}
            onPress={() => handleFilterPress('child', null)}
          >
            <Text style={[
              styles.filterChipText,
              !selectedChildFilter && styles.filterChipTextActive,
            ]}>
              All Children
            </Text>
          </TouchableOpacity>
          
          {children.map(child => (
            <TouchableOpacity
              key={child.id}
              style={[
                styles.filterChip,
                selectedChildFilter === child.id && styles.filterChipActive,
              ]}
              onPress={() => handleFilterPress('child', child.id)}
            >
              <Text style={[
                styles.filterChipText,
                selectedChildFilter === child.id && styles.filterChipTextActive,
              ]}>
                {child.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Calendar */}
        <CalendarGrid
          year={currentYear}
          month={currentMonth}
          attendanceData={attendanceMap}
          onDayPress={handleDayPress}
          onMonthChange={handleMonthChange}
        />

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#D1FAE5' }]} />
            <Text style={styles.legendText}>Present</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#FEE2E2' }]} />
            <Text style={styles.legendText}>Absent</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: COLORS.primary }]} />
            <Text style={styles.legendText}>Today</Text>
          </View>
        </View>

        {/* Recent Records Section */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent Records</Text>
            <TouchableOpacity
              style={styles.manualEntryButton}
              onPress={handleManualEntry}
            >
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.manualEntryText}>Manual Entry</Text>
            </TouchableOpacity>
          </View>

          {recentRecords.length > 0 ? (
            recentRecords.map(record => (
              <AttendanceRecordCard
                key={record.id}
                id={record.id}
                childName={record.childName}
                className={record.className}
                date={record.date}
                status={record.status}
                checkInTime={record.checkInTime}
                wasAutomatic={record.wasAutomatic}
              />
            ))
          ) : (
            <View style={styles.emptyRecords}>
              <Calendar size={40} color={COLORS.gray[300]} />
              <Text style={styles.emptyRecordsText}>No attendance records yet</Text>
              <Text style={styles.emptyRecordsSubtext}>
                Add manual entries or enable auto-tracking
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
    backgroundColor: COLORS.gray[50],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.gray[500],
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: COLORS.gray[50],
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.gray[800],
  },

  // Filters
  filterContainer: {
    marginBottom: 16,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray[600],
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  // Legend
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 16,
    marginBottom: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.gray[600],
  },

  // Recent Section
  recentSection: {
    paddingHorizontal: 16,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  manualEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  manualEntryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyRecords: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  emptyRecordsText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.gray[700],
    marginTop: 12,
  },
  emptyRecordsSubtext: {
    fontSize: 14,
    color: COLORS.gray[500],
    marginTop: 4,
    textAlign: 'center',
  },
});