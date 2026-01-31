import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronDown,
  Calendar,
  Users,
  Check,
  TrendingUp,
  ChevronRight,
  BarChart3,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Q } from '@nozbe/watermelondb';

import { COLORS } from '../constants';
import database from '../database';
import { getActiveChildren, getAllActiveClasses } from '../database/helpers';
import type Child from '../database/models/Child';
import type Class from '../database/models/Class';
import type AttendanceRecord from '../database/models/AttendanceRecord';
import type { Schedule } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TimeRange = 'this_month' | 'last_month' | 'this_year' | 'custom';

interface ClassAttendanceData {
  classId: string;
  className: string;
  classColor: string;
  totalScheduled: number;
  present: number;
  percentage: number;
}

interface WeekData {
  label: string;
  count: number;
}

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data state
  const [children, setChildren] = useState<Child[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);

  // Filter state
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('this_month');
  const [customStartDate, setCustomStartDate] = useState<Date>(new Date());
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date());
  const [showChildPicker, setShowChildPicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Stats state
  const [totalScheduled, setTotalScheduled] = useState(0);
  const [totalPresent, setTotalPresent] = useState(0);
  const [attendanceRate, setAttendanceRate] = useState(0);
  const [classAttendance, setClassAttendance] = useState<ClassAttendanceData[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeekData[]>([]);

  const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'this_year', label: 'This Year' },
    { value: 'custom', label: 'Custom Range' },
  ];

  const getDateRange = useCallback((): { start: Date; end: Date } => {
    const now = new Date();
    switch (selectedTimeRange) {
      case 'this_month':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        };
      case 'last_month':
        return {
          start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
          end: new Date(now.getFullYear(), now.getMonth(), 0),
        };
      case 'this_year':
        return {
          start: new Date(now.getFullYear(), 0, 1),
          end: new Date(now.getFullYear(), 11, 31),
        };
      case 'custom':
        return { start: customStartDate, end: customEndDate };
      default:
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: now,
        };
    }
  }, [selectedTimeRange, customStartDate, customEndDate]);

  const formatDateString = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const formatDisplayDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const loadData = useCallback(async () => {
    try {
      const [allChildren, allClasses] = await Promise.all([
        getActiveChildren(),
        getAllActiveClasses(),
      ]);
      setChildren(allChildren);
      setClasses(allClasses);
      await calculateStats(allChildren, allClasses);
    } catch (error) {
      console.error('Error loading reports data:', error);
    }
  }, [selectedChildId, selectedTimeRange, customStartDate, customEndDate]);

  const calculateStats = async (allChildren: Child[], allClasses: Class[]) => {
    const { start, end } = getDateRange();
    const startStr = formatDateString(start);
    const endStr = formatDateString(end);

    // Filter classes by child if selected
    const filteredClasses = selectedChildId
      ? allClasses.filter(c => c.childId === selectedChildId)
      : allClasses;

    if (filteredClasses.length === 0) {
      setTotalScheduled(0);
      setTotalPresent(0);
      setAttendanceRate(0);
      setClassAttendance([]);
      setWeeklyData([]);
      return;
    }

    // Get attendance records for date range
    const classIds = filteredClasses.map(c => c.id);
    const records = await database
      .get<AttendanceRecord>('attendance_records')
      .query(
        Q.where('class_id', Q.oneOf(classIds)),
        Q.where('date', Q.gte(startStr)),
        Q.where('date', Q.lte(endStr))
      )
      .fetch();

    // Calculate scheduled classes in date range
    let scheduled = 0;
    const classScheduledMap = new Map<string, number>();

    for (const cls of filteredClasses) {
      const schedule = cls.schedule as Schedule;
      if (!schedule) continue;

      let classScheduled = 0;
      const currentDate = new Date(start);
      while (currentDate <= end) {
        const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        if (schedule[dayName as keyof Schedule]?.enabled) {
          classScheduled++;
          scheduled++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      classScheduledMap.set(cls.id, classScheduled);
    }

    // Calculate present count
    const presentRecords = records.filter(r => r.status === 'present' || r.status === 'late');
    const present = presentRecords.length;
    const rate = scheduled > 0 ? Math.round((present / scheduled) * 100) : 0;

    setTotalScheduled(scheduled);
    setTotalPresent(present);
    setAttendanceRate(rate);

    // Calculate per-class attendance
    const classData: ClassAttendanceData[] = filteredClasses.map(cls => {
      const classRecords = records.filter(r => r.classId === cls.id);
      const classPresent = classRecords.filter(r => r.status === 'present' || r.status === 'late').length;
      const classScheduled = classScheduledMap.get(cls.id) || 0;
      const percentage = classScheduled > 0 ? Math.round((classPresent / classScheduled) * 100) : 0;

      return {
        classId: cls.id,
        className: cls.name,
        classColor: cls.color || COLORS.primary,
        totalScheduled: classScheduled,
        present: classPresent,
        percentage,
      };
    }).sort((a, b) => b.percentage - a.percentage);

    setClassAttendance(classData);

    // Calculate weekly trend (last 4 weeks)
    await calculateWeeklyTrend(filteredClasses);
  };

  const calculateWeeklyTrend = async (filteredClasses: Class[]) => {
    const now = new Date();
    const weeks: WeekData[] = [];

    if (filteredClasses.length === 0) {
      setWeeklyData([
        { label: 'Week 1', count: 0 },
        { label: 'Week 2', count: 0 },
        { label: 'Week 3', count: 0 },
        { label: 'Week 4', count: 0 },
      ]);
      return;
    }

    for (let i = 3; i >= 0; i--) {
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - (i * 7));
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 6);

      const startStr = formatDateString(weekStart);
      const endStr = formatDateString(weekEnd);

      const classIds = filteredClasses.map(c => c.id);
      const records = await database
        .get<AttendanceRecord>('attendance_records')
        .query(
          Q.where('class_id', Q.oneOf(classIds)),
          Q.where('date', Q.gte(startStr)),
          Q.where('date', Q.lte(endStr))
        )
        .fetch();

      const presentCount = records.filter(r => r.status === 'present' || r.status === 'late').length;

      weeks.push({
        label: `Week ${4 - i}`,
        count: presentCount,
      });
    }

    setWeeklyData(weeks);
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadData();
      setIsLoading(false);
    };
    init();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    if (classes.length > 0) {
      calculateStats(children, classes);
    }
  }, [selectedChildId, selectedTimeRange, customStartDate, customEndDate]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleStartDateChange = (event: any, date?: Date) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (date) {
      setCustomStartDate(date);
    }
  };

  const handleEndDateChange = (event: any, date?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (date) {
      setCustomEndDate(date);
    }
  };

  const getSelectedChildName = () => {
    if (!selectedChildId) return 'All Children';
    return children.find(c => c.id === selectedChildId)?.name || 'All Children';
  };

  const getSelectedTimeRangeLabel = () => {
    return timeRangeOptions.find(t => t.value === selectedTimeRange)?.label || 'This Month';
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Reports</Text>
        <BarChart3 size={24} color={COLORS.gray[800]} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Filter Controls */}
        <View style={styles.filtersRow}>
          {/* Child Picker */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => {
                setShowChildPicker(!showChildPicker);
                setShowTimePicker(false);
              }}
            >
              <Users size={16} color={COLORS.gray[600]} />
              <Text style={styles.filterButtonText} numberOfLines={1}>
                {getSelectedChildName()}
              </Text>
              <ChevronDown size={16} color={COLORS.gray[500]} />
            </TouchableOpacity>
            {showChildPicker && (
              <View style={styles.dropdownMenu}>
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    !selectedChildId && styles.dropdownItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedChildId(null);
                    setShowChildPicker(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownItemText,
                    !selectedChildId && styles.dropdownItemTextSelected,
                  ]}>
                    All Children
                  </Text>
                  {!selectedChildId && <Check size={16} color={COLORS.primary} />}
                </TouchableOpacity>
                {children.map(child => (
                  <TouchableOpacity
                    key={child.id}
                    style={[
                      styles.dropdownItem,
                      selectedChildId === child.id && styles.dropdownItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedChildId(child.id);
                      setShowChildPicker(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      selectedChildId === child.id && styles.dropdownItemTextSelected,
                    ]}>
                      {child.name}
                    </Text>
                    {selectedChildId === child.id && <Check size={16} color={COLORS.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Time Range Picker */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => {
                setShowTimePicker(!showTimePicker);
                setShowChildPicker(false);
              }}
            >
              <Calendar size={16} color={COLORS.gray[600]} />
              <Text style={styles.filterButtonText} numberOfLines={1}>
                {getSelectedTimeRangeLabel()}
              </Text>
              <ChevronDown size={16} color={COLORS.gray[500]} />
            </TouchableOpacity>
            {showTimePicker && (
              <View style={styles.dropdownMenu}>
                {timeRangeOptions.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.dropdownItem,
                      selectedTimeRange === option.value && styles.dropdownItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedTimeRange(option.value);
                      setShowTimePicker(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      selectedTimeRange === option.value && styles.dropdownItemTextSelected,
                    ]}>
                      {option.label}
                    </Text>
                    {selectedTimeRange === option.value && <Check size={16} color={COLORS.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Custom Date Range */}
        {selectedTimeRange === 'custom' && (
          <View style={styles.customDateRow}>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Calendar size={16} color={COLORS.gray[600]} />
              <Text style={styles.datePickerText}>{formatDisplayDate(customStartDate)}</Text>
            </TouchableOpacity>
            <Text style={styles.dateSeparator}>to</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Calendar size={16} color={COLORS.gray[600]} />
              <Text style={styles.datePickerText}>{formatDisplayDate(customEndDate)}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Summary Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
            <Calendar size={24} color={COLORS.primary} />
            <Text style={styles.statValue}>{totalScheduled}</Text>
            <Text style={styles.statLabel}>Total Classes</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#DCFCE7' }]}>
            <Check size={24} color="#16A34A" />
            <Text style={styles.statValue}>{totalPresent}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
            <TrendingUp size={24} color="#D97706" />
            <Text style={styles.statValue}>{attendanceRate}%</Text>
            <Text style={styles.statLabel}>Rate</Text>
          </View>
        </View>

        {/* Attendance by Class */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Attendance by Class</Text>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All</Text>
              <ChevronRight size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          {classAttendance.length > 0 ? (
            <View style={styles.classListContainer}>
              {classAttendance.slice(0, 4).map((item, index) => (
                <View key={item.classId} style={styles.classItem}>
                  <View style={styles.classHeader}>
                    <Text style={styles.className}>{item.className}</Text>
                    <Text style={styles.classRatio}>
                      {item.present}/{item.totalScheduled}
                    </Text>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        { width: `${item.percentage}%`, backgroundColor: item.classColor },
                      ]}
                    />
                  </View>
                  <Text style={[styles.percentageText, { color: item.classColor }]}>
                    {item.percentage}%
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No class data available</Text>
            </View>
          )}
        </View>

        {/* Weekly Trend */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Weekly Trend</Text>
          </View>
          {weeklyData.length > 0 && weeklyData.some(w => w.count > 0) ? (
            <View style={styles.chartContainer}>
              <View style={styles.barChart}>
                {weeklyData.map((week, index) => {
                  const maxCount = Math.max(...weeklyData.map(w => w.count), 1);
                  const barHeight = (week.count / maxCount) * 120;
                  return (
                    <View key={index} style={styles.barColumn}>
                      <Text style={styles.barValue}>{week.count}</Text>
                      <View style={styles.barWrapper}>
                        <View
                          style={[
                            styles.bar,
                            { height: Math.max(barHeight, 4) },
                          ]}
                        />
                      </View>
                      <Text style={styles.barLabel}>{week.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <TrendingUp size={48} color={COLORS.gray[300]} />
              <Text style={styles.emptyText}>No attendance data for the last 4 weeks</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={customStartDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleStartDateChange}
          maximumDate={customEndDate}
        />
      )}
      {showEndDatePicker && (
        <DateTimePicker
          value={customEndDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleEndDateChange}
          minimumDate={customStartDate}
          maximumDate={new Date()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.gray[800],
  },

  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Filters
  filtersRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    zIndex: 10,
  },
  filterContainer: {
    flex: 1,
    position: 'relative',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 6,
  },
  filterButtonText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.gray[700],
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 100,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  dropdownItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  dropdownItemText: {
    fontSize: 14,
    color: COLORS.gray[700],
  },
  dropdownItemTextSelected: {
    color: COLORS.primary,
    fontWeight: '500',
  },

  // Custom Date Range
  customDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  datePickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  datePickerText: {
    fontSize: 14,
    color: COLORS.gray[700],
  },
  dateSeparator: {
    fontSize: 14,
    color: COLORS.gray[500],
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.gray[800],
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray[600],
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
  },

  // Class List
  classListContainer: {
    gap: 16,
  },
  classItem: {
    gap: 8,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  className: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray[700],
    flex: 1,
  },
  classRatio: {
    fontSize: 13,
    color: COLORS.gray[500],
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: COLORS.gray[100],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  percentageText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },

  // Chart
  chartContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  barChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 180,
    width: '100%',
    paddingHorizontal: 8,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray[700],
    marginBottom: 4,
  },
  barWrapper: {
    width: 32,
    height: 120,
    justifyContent: 'flex-end',
    backgroundColor: COLORS.gray[100],
    borderRadius: 6,
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 6,
  },
  barLabel: {
    fontSize: 11,
    color: COLORS.gray[500],
    marginTop: 8,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray[500],
    textAlign: 'center',
  },
});