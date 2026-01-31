import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Plus, Calendar, User, BarChart3, Bell } from 'lucide-react-native';

import { ClassCard, StatCard, ActionButton } from '../components/common';
import { COLORS } from '../constants';
import {
  getActiveChildren,
  getTodaysClasses,
  getAllActiveClasses,
  getClassAttendance,
  getTodaysAttendance,
} from '../database/helpers';
import type { Schedule, DaySchedule } from '../types';
import type Child from '../database/models/Child';

// Helper functions for date calculations
const getCurrentDayOfWeek = (): keyof Schedule => {
  const days: (keyof Schedule)[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  return days[new Date().getDay()];
};

const formatDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getStartOfWeek = (): string => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday as start
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return formatDateString(monday);
};

const getEndOfWeek = (): string => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? 0 : 7 - dayOfWeek; // Sunday as end
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + diff);
  return formatDateString(sunday);
};

const getStartOfMonth = (): string => {
  const now = new Date();
  return formatDateString(new Date(now.getFullYear(), now.getMonth(), 1));
};

const getEndOfMonth = (): string => {
  const now = new Date();
  return formatDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0));
};

const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
};

const formatTimeRange = (schedule: DaySchedule | undefined): string => {
  if (!schedule) return 'No time set';
  return `${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)}`;
};

const formatTodayDate = (): string => {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
};

interface TodayClass {
  id: string;
  name: string;
  time: string;
  childName: string;
  color: string;
  status: 'present' | 'upcoming' | 'absent' | 'late';
  endTime: string;
  pickupReminderMinutes: number;
}

interface Reminder {
  id: string;
  childName: string;
  className: string;
  time: string;
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);
  const [totalClasses, setTotalClasses] = useState(0);
  const [todaysClasses, setTodaysClasses] = useState<TodayClass[]>([]);
  const [weeklyStats, setWeeklyStats] = useState({ attended: 0, total: 0 });
  const [monthlyRate, setMonthlyRate] = useState(0);
  const [reminders, setReminders] = useState<Reminder[]>([]);

  // Calculate pickup reminder time
  const calculatePickupTime = (endTime: string, reminderMinutes: number): string => {
    const [hours, minutes] = endTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes - reminderMinutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMinutes = totalMinutes % 60;
    return formatTime(`${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`);
  };

  // Load all dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      // Load children
      const activeChildren = await getActiveChildren();
      setChildren(activeChildren);

      // Load all active classes
      const allClasses = await getAllActiveClasses();
      setTotalClasses(allClasses.length);

      // Load today's classes with child info
      const todayClasses = await getTodaysClasses();
      const todayAttendance = await getTodaysAttendance();
      const currentDay = getCurrentDayOfWeek();

      const classesWithInfo: TodayClass[] = await Promise.all(
        todayClasses.map(async (cls) => {
          // Get child info
          let childName = 'Unknown Child';
          try {
            const child = await cls.child.fetch();
            childName = child?.name || 'Unknown Child';
          } catch {
            childName = 'Unknown Child';
          }

          // Get schedule for today
          const schedule = cls.schedule[currentDay];

          // Check attendance status
          const attendance = todayAttendance.find((a) => a.classId === cls.id);
          let status: 'present' | 'upcoming' | 'absent' | 'late' = 'upcoming';
          if (attendance) {
            status = attendance.status as 'present' | 'absent' | 'late';
          }

          return {
            id: cls.id,
            name: cls.name,
            time: formatTimeRange(schedule),
            childName,
            color: cls.color,
            status,
            endTime: schedule?.endTime || '00:00',
            pickupReminderMinutes: cls.pickupReminderMinutes || 15,
          };
        })
      );

      // Sort by time
      classesWithInfo.sort((a, b) => a.time.localeCompare(b.time));
      setTodaysClasses(classesWithInfo);

      // Calculate weekly stats
      const startOfWeek = getStartOfWeek();
      const endOfWeek = getEndOfWeek();
      let weekAttended = 0;
      let weekTotal = 0;

      for (const cls of allClasses) {
        const records = await getClassAttendance(cls.id, startOfWeek, endOfWeek);
        weekTotal += records.length;
        weekAttended += records.filter(
          (r) => r.status === 'present' || r.status === 'late'
        ).length;
      }

      setWeeklyStats({ attended: weekAttended, total: weekTotal || 0 });

      // Calculate monthly stats
      const startOfMonth = getStartOfMonth();
      const endOfMonth = getEndOfMonth();
      let monthAttended = 0;
      let monthTotal = 0;

      for (const cls of allClasses) {
        const records = await getClassAttendance(cls.id, startOfMonth, endOfMonth);
        monthTotal += records.length;
        monthAttended += records.filter(
          (r) => r.status === 'present' || r.status === 'late'
        ).length;
      }

      const rate = monthTotal > 0 ? Math.round((monthAttended / monthTotal) * 100) : 0;
      setMonthlyRate(rate);

      // Build reminders from today's classes
      const upcomingReminders: Reminder[] = classesWithInfo
        .filter((cls) => cls.status === 'upcoming' || cls.status === 'present')
        .map((cls) => ({
          id: cls.id,
          childName: cls.childName,
          className: cls.name,
          time: calculatePickupTime(cls.endTime, cls.pickupReminderMinutes),
        }))
        .slice(0, 3);

      setReminders(upcomingReminders);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const initLoad = async () => {
      setIsLoading(true);
      await loadDashboardData();
      setIsLoading(false);
    };
    initLoad();
  }, [loadDashboardData]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    setIsRefreshing(false);
  }, [loadDashboardData]);

  // Navigation handlers
  const handleClassPress = (classId: string) => {
    navigation.navigate('ClassDetail', { classId });
  };

  const handleAddClass = () => {
    navigation.navigate('Classes', { screen: 'AddClass' });
  };

  const handleAddChild = () => {
    navigation.navigate('Children', { screen: 'AddChild' });
  };

  const handleViewCalendar = () => {
    navigation.navigate('Attendance');
  };

  const handleViewReports = () => {
    navigation.navigate('Reports');
  };

  // Render class item
  const renderClassItem = ({ item }: { item: TodayClass }) => (
    <ClassCard
      name={item.name}
      time={item.time}
      status={item.status}
      child={item.childName}
      color={item.color}
      onPress={() => handleClassPress(item.id)}
    />
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          colors={[COLORS.primary]}
          tintColor={COLORS.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back!</Text>
        <Text style={styles.headerTitle}>Track Your Kids' Classes</Text>
        <Text style={styles.headerSubtitle}>
          {children.length} children • {totalClasses} active classes
        </Text>
      </View>

      {/* Today's Schedule Section */}
      <View style={styles.section}>
        <View style={styles.scheduleHeader}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          <Text style={styles.dateText}>{formatTodayDate()}</Text>
        </View>

        <View style={styles.scheduleCard}>
          {todaysClasses.length > 0 ? (
            <FlatList
              data={todaysClasses}
              renderItem={renderClassItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Calendar size={40} color={COLORS.gray[300]} />
              <Text style={styles.emptyStateText}>No classes scheduled for today</Text>
              <TouchableOpacity
                style={styles.addClassButton}
                onPress={handleAddClass}
              >
                <Plus size={16} color={COLORS.primary} />
                <Text style={styles.addClassText}>Add a Class</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Stats Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Attendance Overview</Text>
        <View style={styles.statsRow}>
          <StatCard
            label="This Week"
            value={`${weeklyStats.attended}/${weeklyStats.total}`}
            sublabel="Classes Attended"
          />
          <View style={styles.statSpacer} />
          <StatCard
            label="Overall Rate"
            value={`${monthlyRate}%`}
            sublabel="This Month"
          />
        </View>
      </View>

      {/* Reminders Section */}
      {reminders.length > 0 && (
        <View style={styles.section}>
          <View style={styles.remindersHeader}>
            <Bell size={20} color={COLORS.gray[600]} />
            <Text style={[styles.sectionTitle, { marginLeft: 8, marginBottom: 0 }]}>
              Upcoming Reminders
            </Text>
          </View>
          <View style={styles.remindersCard}>
            {reminders.map((reminder, index) => (
              <View
                key={reminder.id}
                style={[
                  styles.reminderItem,
                  index < reminders.length - 1 && styles.reminderBorder,
                ]}
              >
                <View style={styles.reminderIcon}>
                  <Bell size={16} color={COLORS.primary} />
                </View>
                <View style={styles.reminderContent}>
                  <Text style={styles.reminderText}>
                    Pick up {reminder.childName} from {reminder.className}
                  </Text>
                  <Text style={styles.reminderTime}>{reminder.time}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Quick Actions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <View style={styles.actionRow}>
            <ActionButton
              icon={<Plus size={24} color={COLORS.primary} />}
              label="Add Class"
              onPress={handleAddClass}
            />
            <View style={styles.actionSpacer} />
            <ActionButton
              icon={<Calendar size={24} color={COLORS.primary} />}
              label="View Calendar"
              onPress={handleViewCalendar}
            />
          </View>
          <View style={styles.actionRowSpacer} />
          <View style={styles.actionRow}>
            <ActionButton
              icon={<User size={24} color={COLORS.primary} />}
              label="Add Child"
              onPress={handleAddChild}
            />
            <View style={styles.actionSpacer} />
            <ActionButton
              icon={<BarChart3 size={24} color={COLORS.primary} />}
              label="View Reports"
              onPress={handleViewReports}
            />
          </View>
        </View>
      </View>

      {/* Bottom spacing */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  contentContainer: {
    paddingBottom: 24,
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
    backgroundColor: COLORS.primary,
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  welcomeText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },

  // Section
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginBottom: 12,
  },

  // Schedule
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 13,
    color: COLORS.gray[500],
  },
  scheduleCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.gray[500],
  },
  addClassButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  addClassText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
  },
  statSpacer: {
    width: 12,
  },

  // Reminders
  remindersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  remindersCard: {
    backgroundColor: COLORS.gray[100],
    borderRadius: 16,
    padding: 4,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  reminderBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  reminderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reminderContent: {
    flex: 1,
  },
  reminderText: {
    fontSize: 14,
    color: COLORS.gray[700],
    marginBottom: 2,
  },
  reminderTime: {
    fontSize: 12,
    color: COLORS.gray[500],
  },

  // Actions
  actionsGrid: {},
  actionRow: {
    flexDirection: 'row',
  },
  actionSpacer: {
    width: 12,
  },
  actionRowSpacer: {
    height: 12,
  },

  bottomSpacer: {
    height: 24,
  },
});
