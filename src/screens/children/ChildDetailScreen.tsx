import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import {
  ArrowLeft,
  Edit3,
  BookOpen,
  Calendar,
  Clock,
  TrendingUp,
  ChevronRight,
  Plus,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS, CLASS_COLORS } from '../../constants';
import { 
  getChildById, 
  getChildClasses, 
  getClassAttendance 
} from '../../database/helpers';
import type Child from '../../database/models/Child';
import type Class from '../../database/models/Class';
import type AttendanceRecord from '../../database/models/AttendanceRecord';

type ChildDetailRouteParams = {
  ChildDetail: {
    childId: string;
  };
};

interface ClassWithStats {
  classData: Class;
  attendanceRate: number;
  totalSessions: number;
}

interface RecentAttendance {
  record: AttendanceRecord;
  className: string;
  classColor: string;
}

export default function ChildDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<ChildDetailRouteParams, 'ChildDetail'>>();
  const { childId } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [child, setChild] = useState<Child | null>(null);
  const [classesWithStats, setClassesWithStats] = useState<ClassWithStats[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<RecentAttendance[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalClasses: 0,
    thisMonthSessions: 0,
    attendanceRate: 0,
  });

  const loadChildData = useCallback(async () => {
    try {
      const childData = await getChildById(childId);
      if (!childData) {
        navigation.goBack();
        return;
      }
      setChild(childData);

      // Load classes
      const classes = await getChildClasses(childId);
      
      // Calculate date range for this month
      const now = new Date();
      const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const endOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;
      
      // Get stats for each class
      let totalSessions = 0;
      let totalAttended = 0;
      const allRecentRecords: RecentAttendance[] = [];

      const classStats: ClassWithStats[] = await Promise.all(
        classes.map(async (cls) => {
          const records = await getClassAttendance(cls.id, startOfMonth, endOfMonth);
          const attended = records.filter(
            (r) => r.status === 'present' || r.status === 'late'
          ).length;
          
          totalSessions += records.length;
          totalAttended += attended;
          
          // Add to recent attendance
          records.slice(-5).forEach((record) => {
            allRecentRecords.push({
              record,
              className: cls.name,
              classColor: cls.color,
            });
          });
          
          return {
            classData: cls,
            attendanceRate: records.length > 0 ? Math.round((attended / records.length) * 100) : 0,
            totalSessions: records.length,
          };
        })
      );

      setClassesWithStats(classStats);
      
      // Sort recent attendance by date descending
      allRecentRecords.sort((a, b) => 
        new Date(b.record.date).getTime() - new Date(a.record.date).getTime()
      );
      setRecentAttendance(allRecentRecords.slice(0, 10));

      setOverallStats({
        totalClasses: classes.length,
        thisMonthSessions: totalSessions,
        attendanceRate: totalSessions > 0 ? Math.round((totalAttended / totalSessions) * 100) : 0,
      });

    } catch (error) {
      console.error('Error loading child data:', error);
    }
  }, [childId, navigation]);

  useEffect(() => {
    const initLoad = async () => {
      setIsLoading(true);
      await loadChildData();
      setIsLoading(false);
    };
    initLoad();
  }, [loadChildData]);

  useFocusEffect(
    useCallback(() => {
      loadChildData();
    }, [loadChildData])
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadChildData();
    setIsRefreshing(false);
  }, [loadChildData]);

  const handleEdit = () => {
    navigation.navigate('EditChild', { childId });
  };

  const handleAddClass = () => {
    // Navigate to add class screen with childId pre-selected
    navigation.navigate('ClassesTab', {
      screen: 'AddClass',
      params: { childId },
    });
  };

  const handleClassPress = (classId: string) => {
    navigation.navigate('ClassesTab', {
      screen: 'ClassDetail',
      params: { classId },
    });
  };

  const getInitials = (name: string) => {
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return COLORS.success;
      case 'late':
        return COLORS.warning;
      case 'absent':
        return COLORS.danger;
      default:
        return COLORS.gray[400];
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'present':
        return 'Present';
      case 'late':
        return 'Late';
      case 'absent':
        return 'Absent';
      default:
        return 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading child details...</Text>
      </View>
    );
  }

  if (!child) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#8B5CF6', '#7C3AED']}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
            <Edit3 size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Avatar and Name */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(child.name)}</Text>
          </View>
          <Text style={styles.childName}>{child.name}</Text>
          {child.age !== null && (
            <Text style={styles.childAge}>{child.age} years old</Text>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#EFF6FF' }]}>
              <BookOpen size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>{overallStats.totalClasses}</Text>
            <Text style={styles.statLabel}>Classes</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#F0FDF4' }]}>
              <Calendar size={20} color={COLORS.success} />
            </View>
            <Text style={styles.statValue}>{overallStats.thisMonthSessions}</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#FEF3C7' }]}>
              <TrendingUp size={20} color={COLORS.warning} />
            </View>
            <Text style={styles.statValue}>{overallStats.attendanceRate}%</Text>
            <Text style={styles.statLabel}>Attendance</Text>
          </View>
        </View>

        {/* Classes Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Enrolled Classes</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddClass}>
              <Plus size={18} color={COLORS.primary} />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {classesWithStats.length === 0 ? (
            <View style={styles.emptyClasses}>
              <BookOpen size={40} color={COLORS.gray[300]} />
              <Text style={styles.emptyText}>No classes enrolled yet</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={handleAddClass}>
                <Plus size={18} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>Add First Class</Text>
              </TouchableOpacity>
            </View>
          ) : (
            classesWithStats.map((item) => (
              <TouchableOpacity
                key={item.classData.id}
                style={styles.classCard}
                onPress={() => handleClassPress(item.classData.id)}
              >
                <View 
                  style={[
                    styles.classColorBand, 
                    { backgroundColor: CLASS_COLORS[item.classData.color as keyof typeof CLASS_COLORS] || COLORS.primary }
                  ]} 
                />
                <View style={styles.classInfo}>
                  <Text style={styles.className}>{item.classData.name}</Text>
                  <Text style={styles.classLocation}>{item.classData.locationName}</Text>
                  <View style={styles.classStats}>
                    <View style={styles.classStat}>
                      <Calendar size={14} color={COLORS.gray[500]} />
                      <Text style={styles.classStatText}>{item.totalSessions} sessions</Text>
                    </View>
                    <View style={styles.classStat}>
                      <TrendingUp size={14} color={COLORS.gray[500]} />
                      <Text style={styles.classStatText}>{item.attendanceRate}% attendance</Text>
                    </View>
                  </View>
                </View>
                <ChevronRight size={20} color={COLORS.gray[400]} />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Recent Attendance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Attendance</Text>

          {recentAttendance.length === 0 ? (
            <View style={styles.emptyAttendance}>
              <Clock size={40} color={COLORS.gray[300]} />
              <Text style={styles.emptyText}>No attendance records yet</Text>
            </View>
          ) : (
            recentAttendance.map((item, index) => (
              <View key={`${item.record.id}-${index}`} style={styles.attendanceItem}>
                <View 
                  style={[
                    styles.attendanceDot, 
                    { backgroundColor: CLASS_COLORS[item.classColor as keyof typeof CLASS_COLORS] || COLORS.primary }
                  ]} 
                />
                <View style={styles.attendanceInfo}>
                  <Text style={styles.attendanceClass}>{item.className}</Text>
                  <Text style={styles.attendanceDate}>{formatDate(item.record.date)}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(item.record.status) + '20' }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: getStatusColor(item.record.status) }
                  ]}>
                    {getStatusLabel(item.record.status)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Notes Section */}
        {child.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{child.notes}</Text>
            </View>
          </View>
        )}
      </ScrollView>
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
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 32,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  editButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  profileSection: {
    alignItems: 'center',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  childName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  childAge: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },

  // Content
  content: {
    flex: 1,
    marginTop: -16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: COLORS.gray[50],
  },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 40,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.gray[800],
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray[500],
    marginTop: 2,
  },

  // Section
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 4,
  },

  // Class Card
  classCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  classColorBand: {
    width: 4,
    height: '100%',
  },
  classInfo: {
    flex: 1,
    padding: 16,
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  classLocation: {
    fontSize: 13,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  classStats: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 16,
  },
  classStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  classStatText: {
    fontSize: 12,
    color: COLORS.gray[500],
  },

  // Empty States
  emptyClasses: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  emptyAttendance: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.gray[500],
    marginTop: 12,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },

  // Attendance Item
  attendanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  attendanceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  attendanceInfo: {
    flex: 1,
  },
  attendanceClass: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.gray[800],
  },
  attendanceDate: {
    fontSize: 13,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Notes
  notesCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
  },
  notesText: {
    fontSize: 15,
    color: COLORS.gray[700],
    lineHeight: 22,
  },
});
