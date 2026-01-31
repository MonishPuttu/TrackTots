import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  MapPin,
  Clock,
  User,
  Phone,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  TrendingUp,
  Bell,
} from 'lucide-react-native';
import MapView, { Marker, Circle } from 'react-native-maps';

import { COLORS, CLASS_COLORS } from '../../constants';
import database from '../../database';
import { deleteClass } from '../../database/helpers';
import { Q } from '@nozbe/watermelondb';
import Class from '../../database/models/Class';
import Child from '../../database/models/Child';
import AttendanceRecord from '../../database/models/AttendanceRecord';
import type { Schedule } from '../../types';

const { width } = Dimensions.get('window');

type ClassDetailRouteParams = {
  ClassDetail: {
    classId: string;
  };
};

interface AttendanceStats {
  total: number;
  attended: number;
  rate: number;
}

const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

const DAY_LABELS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export default function ClassDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<ClassDetailRouteParams, 'ClassDetail'>>();
  const { classId } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [classData, setClassData] = useState<Class | null>(null);
  const [child, setChild] = useState<Child | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats>({ total: 0, attended: 0, rate: 0 });

  const loadClassData = useCallback(async () => {
    try {
      const classCollection = database.get<Class>('classes');
      const foundClass = await classCollection.find(classId);
      setClassData(foundClass);

      // Load child
      const childCollection = database.get<Child>('children');
      const foundChild = await childCollection.find(foundClass.childId);
      setChild(foundChild);

      // Load all attendance records for this class
      const records = await database
        .get<AttendanceRecord>('attendance_records')
        .query(Q.where('class_id', classId))
        .fetch();
      
      // Sort by date descending
      records.sort((a, b) => b.date.localeCompare(a.date));
      setAttendanceRecords(records);

      // Calculate stats
      const attended = records.filter(r => r.status === 'present').length;
      const total = records.length;
      const rate = total > 0 ? Math.round((attended / total) * 100) : 0;
      setStats({ total, attended, rate });
    } catch (error) {
      console.error('Error loading class:', error);
      Alert.alert('Error', 'Failed to load class details.');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  }, [classId, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadClassData();
    }, [loadClassData])
  );

  const handleEdit = () => {
    navigation.navigate('EditClass', { classId });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Class',
      `Are you sure you want to delete "${classData?.name}"? This will also delete all attendance records for this class.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteClass(classId);
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting class:', error);
              Alert.alert('Error', 'Failed to delete class.');
            }
          },
        },
      ]
    );
  };

  const formatTime = (timeString?: string): string => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getEnabledDays = (): string[] => {
    if (!classData?.schedule) return [];
    const schedule = classData.schedule as Schedule;
    return DAYS_ORDER.filter((day) => schedule[day]?.enabled);
  };

  const getScheduleForDay = (day: string) => {
    if (!classData?.schedule) return null;
    const schedule = classData.schedule as Schedule;
    return schedule[day as keyof Schedule];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
      case 'checked_in':
        return <CheckCircle size={16} color={COLORS.success} />;
      case 'absent':
        return <XCircle size={16} color={COLORS.danger} />;
      default:
        return <Clock size={16} color={COLORS.warning} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'present':
        return 'Present';
      case 'checked_in':
        return 'Checked In';
      case 'checked_out':
        return 'Checked Out';
      case 'absent':
        return 'Absent';
      case 'late':
        return 'Late';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading class details...</Text>
      </View>
    );
  }

  if (!classData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Class not found.</Text>
        <TouchableOpacity style={styles.goBackButton} onPress={() => navigation.goBack()}>
          <Text style={styles.goBackButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const classColor = CLASS_COLORS[classData.color as keyof typeof CLASS_COLORS] || COLORS.primary;
  const gradientColors = [classColor, `${classColor}CC`] as const;
  const enabledDays = getEnabledDays();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Gradient Header */}
        <LinearGradient colors={gradientColors} style={styles.header}>
          {/* Back Button & Actions */}
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerRightActions}>
              <TouchableOpacity style={styles.headerButton} onPress={handleEdit}>
                <Edit2 size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} onPress={handleDelete}>
                <Trash2 size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Class Info */}
          <View style={styles.headerContent}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{classData.category}</Text>
            </View>
            <Text style={styles.className}>{classData.name}</Text>
            {child && (
              <Text style={styles.childName}>For {child.name}</Text>
            )}
          </View>
        </LinearGradient>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { borderLeftColor: COLORS.primary }]}>
            <Calendar size={20} color={COLORS.primary} />
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Classes</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: COLORS.success }]}>
            <CheckCircle size={20} color={COLORS.success} />
            <Text style={styles.statNumber}>{stats.attended}</Text>
            <Text style={styles.statLabel}>Attended</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: COLORS.warning }]}>
            <TrendingUp size={20} color={COLORS.warning} />
            <Text style={styles.statNumber}>{stats.rate}%</Text>
            <Text style={styles.statLabel}>Rate</Text>
          </View>
        </View>

        {/* Schedule Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={20} color={COLORS.gray[600]} />
            <Text style={styles.sectionTitle}>Schedule</Text>
          </View>
          {enabledDays.length > 0 ? (
            <View style={styles.scheduleList}>
              {enabledDays.map((day) => {
                const daySchedule = getScheduleForDay(day);
                return (
                  <View key={day} style={styles.scheduleItem}>
                    <Text style={styles.scheduleDay}>{DAY_LABELS[day]}</Text>
                    <Text style={styles.scheduleTime}>
                      {formatTime(daySchedule?.startTime)} - {formatTime(daySchedule?.endTime)}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.noScheduleText}>No schedule set</Text>
          )}
        </View>

        {/* Location Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={20} color={COLORS.gray[600]} />
            <Text style={styles.sectionTitle}>Location</Text>
          </View>
          <View style={styles.locationInfo}>
            <Text style={styles.locationName}>{classData.locationName}</Text>
            {classData.locationAddress && (
              <Text style={styles.locationAddress}>{classData.locationAddress}</Text>
            )}
            <Text style={styles.geofenceRadius}>
              Geofence: {classData.geofenceRadius}m radius
            </Text>
          </View>

          {/* Mini Map */}
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: classData.latitude,
                longitude: classData.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
            >
              <Marker
                coordinate={{
                  latitude: classData.latitude,
                  longitude: classData.longitude,
                }}
                pinColor={classColor}
              />
              <Circle
                center={{
                  latitude: classData.latitude,
                  longitude: classData.longitude,
                }}
                radius={classData.geofenceRadius}
                fillColor={`${classColor}20`}
                strokeColor={classColor}
                strokeWidth={2}
              />
            </MapView>
          </View>
        </View>

        {/* Instructor Section */}
        {(classData.instructorName || classData.instructorContact || classData.instructorEmail) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <User size={20} color={COLORS.gray[600]} />
              <Text style={styles.sectionTitle}>Instructor</Text>
            </View>
            <View style={styles.instructorInfo}>
              {classData.instructorName && (
                <Text style={styles.instructorName}>{classData.instructorName}</Text>
              )}
              {classData.instructorContact && (
                <View style={styles.contactRow}>
                  <Phone size={16} color={COLORS.gray[500]} />
                  <Text style={styles.contactText}>{classData.instructorContact}</Text>
                </View>
              )}
              {classData.instructorEmail && (
                <View style={styles.contactRow}>
                  <Mail size={16} color={COLORS.gray[500]} />
                  <Text style={styles.contactText}>{classData.instructorEmail}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Notification Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bell size={20} color={COLORS.gray[600]} />
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>
          <View style={styles.notificationSettings}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Pickup Reminder</Text>
              <Text style={[
                styles.settingValue,
                { color: classData.enablePickupReminder ? COLORS.success : COLORS.gray[400] }
              ]}>
                {classData.enablePickupReminder
                  ? `${classData.pickupReminderMinutes} min before end`
                  : 'Disabled'}
              </Text>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Auto-attendance Notification</Text>
              <Text style={[
                styles.settingValue,
                { color: classData.enableAttendanceNotification ? COLORS.success : COLORS.gray[400] }
              ]}>
                {classData.enableAttendanceNotification ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>
        </View>

        {/* Recent Attendance */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={20} color={COLORS.gray[600]} />
            <Text style={styles.sectionTitle}>Recent Attendance</Text>
          </View>
          {attendanceRecords.length > 0 ? (
            <View style={styles.attendanceList}>
              {attendanceRecords.slice(0, 5).map((record) => (
                <View key={record.id} style={styles.attendanceItem}>
                  <View style={styles.attendanceLeft}>
                    {getStatusIcon(record.status)}
                    <Text style={styles.attendanceDate}>
                      {formatDate(record.date)}
                    </Text>
                  </View>
                  <Text style={styles.attendanceStatus}>
                    {getStatusText(record.status)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noAttendanceText}>No attendance records yet</Text>
          )}
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.gray[600],
    marginBottom: 16,
  },
  goBackButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  goBackButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRightActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerContent: {
    alignItems: 'flex-start',
  },
  categoryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  className: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  childName: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    marginTop: -20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.gray[800],
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.gray[500],
    marginTop: 2,
  },

  // Section
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.gray[800],
  },

  // Schedule
  scheduleList: {
    gap: 10,
  },
  scheduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
    padding: 14,
    borderRadius: 10,
  },
  scheduleDay: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.gray[800],
  },
  scheduleTime: {
    fontSize: 14,
    color: COLORS.gray[600],
  },
  noScheduleText: {
    fontSize: 14,
    color: COLORS.gray[500],
    fontStyle: 'italic',
  },

  // Location
  locationInfo: {
    marginBottom: 12,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: COLORS.gray[600],
    marginBottom: 4,
  },
  geofenceRadius: {
    fontSize: 13,
    color: COLORS.gray[500],
  },
  mapContainer: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  map: {
    flex: 1,
  },

  // Instructor
  instructorInfo: {
    gap: 8,
  },
  instructorName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[800],
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    color: COLORS.gray[600],
  },

  // Notification Settings
  notificationSettings: {
    gap: 12,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 14,
    color: COLORS.gray[700],
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Attendance
  attendanceList: {
    gap: 8,
  },
  attendanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
    padding: 12,
    borderRadius: 10,
  },
  attendanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  attendanceDate: {
    fontSize: 14,
    color: COLORS.gray[800],
  },
  attendanceStatus: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.gray[600],
  },
  noAttendanceText: {
    fontSize: 14,
    color: COLORS.gray[500],
    fontStyle: 'italic',
  },
});
