import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Alert } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import database from '../database';
import type Class from '../database/models/Class';
import type AttendanceRecord from '../database/models/AttendanceRecord';
import type { Schedule, DaySchedule } from '../types';

// Task name constant
export const LOCATION_TASK_NAME = 'background-location-task';

// Define the background task at module level (OUTSIDE the class)
// TaskManager runs in a separate background worker thread and cannot access class instances
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('[LocationService] Background task error:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    
    if (locations && locations.length > 0) {
      const location = locations[0];
      console.log('[LocationService] Background location received:', {
        lat: location.coords.latitude,
        lon: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: new Date(location.timestamp).toISOString(),
      });

      // Process the location using static method
      await LocationService.processLocation(location);
    }
  }
});

/**
 * LocationService handles background location tracking and automatic attendance marking
 * based on geofence detection for classes.
 */
class LocationService {
  private static instance: LocationService | null = null;
  private isTracking: boolean = false;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get the singleton instance of LocationService
   */
  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Initialize the location service - entry point
   */
  static async initialize(): Promise<boolean> {
    console.log('[LocationService] Initializing...');
    const instance = LocationService.getInstance();
    const hasPermission = await instance.requestPermissions();
    console.log('[LocationService] Initialization complete, hasPermission:', hasPermission);
    return hasPermission;
  }

  /**
   * Request foreground and background location permissions
   */
  async requestPermissions(): Promise<boolean> {
    console.log('[LocationService] Requesting permissions...');

    // Request foreground location permission first
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    console.log('[LocationService] Foreground permission status:', foregroundStatus);

    if (foregroundStatus !== 'granted') {
      Alert.alert(
        'Location Permission Required',
        'TrackTots needs access to your location to automatically track attendance when you arrive at class locations. Please enable location access in your device settings.',
        [{ text: 'OK' }]
      );
      return false;
    }

    // Request background location permission
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    console.log('[LocationService] Background permission status:', backgroundStatus);

    if (backgroundStatus !== 'granted') {
      Alert.alert(
        'Background Location Required',
        'To automatically mark attendance, TrackTots needs "Always Allow" location access. Please go to Settings > Apps > TrackTots > Permissions > Location and select "Allow all the time".',
        [{ text: 'OK' }]
      );
      return false;
    }

    console.log('[LocationService] All permissions granted');
    return true;
  }

  /**
   * Start background location tracking
   */
  async startTracking(): Promise<boolean> {
    console.log('[LocationService] Starting tracking...');

    // Check permissions first
    const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
    const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();

    if (foregroundStatus !== 'granted' || backgroundStatus !== 'granted') {
      console.log('[LocationService] Missing permissions, cannot start tracking');
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return false;
      }
    }

    // Check if already tracking
    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (isRegistered) {
      console.log('[LocationService] Task already registered, tracking is active');
      this.isTracking = true;
      return true;
    }

    try {
      // Start background location updates
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 60000, // 1 minute
        distanceInterval: 50, // 50 meters
        foregroundService: {
          notificationTitle: 'TrackTots',
          notificationBody: 'Tracking location for automatic attendance',
          notificationColor: '#4A90D9',
        },
        // Android-specific: show notification when app is in background
        showsBackgroundLocationIndicator: true,
        // Defer updates to save battery
        deferredUpdatesInterval: 60000,
        deferredUpdatesDistance: 50,
      });

      this.isTracking = true;
      console.log('[LocationService] Background location tracking started successfully');
      return true;
    } catch (error) {
      console.error('[LocationService] Failed to start tracking:', error);
      return false;
    }
  }

  /**
   * Stop background location tracking
   */
  async stopTracking(): Promise<void> {
    console.log('[LocationService] Stopping tracking...');

    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        console.log('[LocationService] Background location tracking stopped');
      } else {
        console.log('[LocationService] Task was not registered');
      }

      this.isTracking = false;
    } catch (error) {
      console.error('[LocationService] Failed to stop tracking:', error);
      this.isTracking = false;
    }
  }

  /**
   * Check if currently tracking
   */
  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  /**
   * Get current location with high accuracy (for map picker)
   */
  async getCurrentLocation(): Promise<Location.LocationObject | null> {
    console.log('[LocationService] Getting current location...');

    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('[LocationService] No foreground permission for current location');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      console.log('[LocationService] Current location:', {
        lat: location.coords.latitude,
        lon: location.coords.longitude,
        accuracy: location.coords.accuracy,
      });

      return location;
    } catch (error) {
      console.error('[LocationService] Failed to get current location:', error);
      return null;
    }
  }

  // ========================================
  // STATIC METHODS (called by background task)
  // ========================================

  /**
   * Process a location update from the background task
   */
  static async processLocation(location: Location.LocationObject): Promise<void> {
    const lat = location.coords.latitude;
    const lon = location.coords.longitude;
    const accuracy = location.coords.accuracy || 0;

    console.log('[LocationService] Processing location:', { lat, lon, accuracy });

    try {
      // Get today's active classes
      const classes = await LocationService.getTodaysActiveClasses();
      console.log('[LocationService] Today\'s active classes:', classes.length);

      if (classes.length === 0) {
        console.log('[LocationService] No active classes for today');
        return;
      }

      // Check each class for geofence entry
      for (const classItem of classes) {
        const distance = LocationService.calculateDistance(
          lat,
          lon,
          classItem.latitude,
          classItem.longitude
        );

        console.log(`[LocationService] Class "${classItem.name}":`, {
          classLat: classItem.latitude,
          classLon: classItem.longitude,
          geofenceRadius: classItem.geofenceRadius,
          distanceToClass: distance,
          withinGeofence: distance <= classItem.geofenceRadius,
        });

        // Check if within geofence
        if (distance <= classItem.geofenceRadius) {
          console.log(`[LocationService] Within geofence for class "${classItem.name}"`);
          await LocationService.handleGeofenceEntry(classItem, location);
        }
      }
    } catch (error) {
      console.error('[LocationService] Error processing location:', error);
    }
  }

  /**
   * Get all classes that are active today with auto-attendance enabled
   */
  private static async getTodaysActiveClasses(): Promise<Class[]> {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()];
    console.log('[LocationService] Getting active classes for:', today);

    try {
      // Query all classes from database
      const allClasses = await database
        .get<Class>('classes')
        .query(
          Q.where('is_active', true),
          Q.where('auto_attendance_enabled', true)
        )
        .fetch();

      console.log('[LocationService] Found classes with auto-attendance:', allClasses.length);

      // Filter classes that have today enabled in their schedule
      const todaysClasses = allClasses.filter((classItem) => {
        try {
          const schedule: Schedule = JSON.parse(classItem.scheduleJson || '{}');
          const todaySchedule = schedule[today as keyof Schedule];
          const isEnabled = todaySchedule?.enabled === true;
          console.log(`[LocationService] Class "${classItem.name}" schedule for ${today}:`, {
            hasSchedule: !!todaySchedule,
            enabled: isEnabled,
          });
          return isEnabled;
        } catch (e) {
          console.error(`[LocationService] Error parsing schedule for class ${classItem.id}:`, e);
          return false;
        }
      });

      console.log('[LocationService] Classes active today:', todaysClasses.length);
      return todaysClasses;
    } catch (error) {
      console.error('[LocationService] Error getting today\'s classes:', error);
      return [];
    }
  }

  /**
   * Handle entry into a class geofence
   */
  private static async handleGeofenceEntry(
    classItem: Class,
    location: Location.LocationObject
  ): Promise<void> {
    console.log(`[LocationService] Handling geofence entry for "${classItem.name}"`);

    // Check if within class time window
    const withinTime = LocationService.isWithinClassTime(classItem);
    console.log(`[LocationService] Within class time window: ${withinTime}`);

    if (!withinTime) {
      console.log('[LocationService] Not within class time window, skipping attendance');
      return;
    }

    // Check if attendance already recorded for today
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const existingRecord = await LocationService.getAttendanceForToday(classItem.id, today);

    if (existingRecord) {
      console.log('[LocationService] Attendance already recorded for today');
      return;
    }

    // Mark attendance
    console.log('[LocationService] Marking attendance...');
    await LocationService.markAttendance(classItem, location);
  }

  /**
   * Check if current time is within the class check-in window
   */
  private static isWithinClassTime(classItem: Class): boolean {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()] as keyof Schedule;

    try {
      const schedule: Schedule = JSON.parse(classItem.scheduleJson || '{}');
      const todaySchedule: DaySchedule | undefined = schedule[today];

      if (!todaySchedule || !todaySchedule.enabled) {
        console.log('[LocationService] No schedule for today');
        return false;
      }

      // Parse start time
      const [startHours, startMinutes] = todaySchedule.startTime.split(':').map(Number);
      const checkInWindowMinutes = todaySchedule.checkInWindowMinutes || 15;

      // Get current time
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // Calculate class start in minutes from midnight
      const classStartMinutes = startHours * 60 + startMinutes;

      // Calculate window (before and after class start)
      const windowStart = classStartMinutes - checkInWindowMinutes;
      const windowEnd = classStartMinutes + checkInWindowMinutes;

      console.log('[LocationService] Time check:', {
        classStart: todaySchedule.startTime,
        checkInWindow: checkInWindowMinutes,
        windowStart: `${Math.floor(windowStart / 60)}:${String(windowStart % 60).padStart(2, '0')}`,
        windowEnd: `${Math.floor(windowEnd / 60)}:${String(windowEnd % 60).padStart(2, '0')}`,
        currentTime: `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`,
        currentMinutes,
        withinWindow: currentMinutes >= windowStart && currentMinutes <= windowEnd,
      });

      return currentMinutes >= windowStart && currentMinutes <= windowEnd;
    } catch (error) {
      console.error('[LocationService] Error checking class time:', error);
      return false;
    }
  }

  /**
   * Get attendance record for a specific class and date
   */
  private static async getAttendanceForToday(
    classId: string,
    date: string
  ): Promise<AttendanceRecord | null> {
    try {
      const records = await database
        .get<AttendanceRecord>('attendance_records')
        .query(
          Q.where('class_id', classId),
          Q.where('date', date)
        )
        .fetch();

      if (records.length > 0) {
        console.log('[LocationService] Found existing attendance record:', records[0].id);
        return records[0];
      }

      return null;
    } catch (error) {
      console.error('[LocationService] Error checking attendance:', error);
      return null;
    }
  }

  /**
   * Mark attendance for a class
   */
  private static async markAttendance(
    classItem: Class,
    location: Location.LocationObject
  ): Promise<void> {
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];

    try {
      await database.write(async () => {
        // Create attendance record
        const attendanceRecord = await database
          .get<AttendanceRecord>('attendance_records')
          .create((record) => {
            record._raw.id = `attendance_${classItem.id}_${today}_${now}`;
            (record as any).classId = classItem.id;
            (record as any).date = today;
            (record as any).status = 'present';
            (record as any).checkInTime = now;
            (record as any).wasAutomatic = true;
            (record as any).detectionMethod = 'geofence';
            (record as any).checkInLatitude = location.coords.latitude;
            (record as any).checkInLongitude = location.coords.longitude;
            (record as any).locationAccuracy = location.coords.accuracy || 0;
            (record as any).parentVerified = false;
          });

        console.log('[LocationService] Attendance record created:', attendanceRecord.id);

        // Create geofence event record
        const geofenceEvent = await database
          .get('geofence_events')
          .create((event: any) => {
            event._raw.id = `geofence_${classItem.id}_${now}`;
            event.classId = classItem.id;
            event.eventType = 'enter';
            event.eventTime = now;
            event.latitude = location.coords.latitude;
            event.longitude = location.coords.longitude;
            event.accuracy = location.coords.accuracy || 0;
            event.wasProcessed = true;
            event.createdAttendanceRecord = true;
          });

        console.log('[LocationService] Geofence event created:', geofenceEvent.id);
      });

      console.log(`[LocationService] ✓ Attendance marked successfully for "${classItem.name}"`);
    } catch (error) {
      console.error('[LocationService] Error marking attendance:', error);
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @returns Distance in meters
   */
  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters (6371 km = 6371000 m)
    
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c;

    return distance; // Distance in meters
  }
}

export default LocationService;
