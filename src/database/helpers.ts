import { Q } from '@nozbe/watermelondb';
import database from './index';
import { Child, Class, AttendanceRecord, SavedLocation } from './models';
import type { Schedule } from '../types';

// ==================== CHILD HELPERS ====================

interface CreateChildData {
  name: string;
  dateOfBirth?: number;
  avatarUri?: string;
  notes?: string;
}

/**
 * Create a new child record
 */
export async function createChild(data: CreateChildData): Promise<Child> {
  try {
    const newChild = await database.write(async () => {
      return await database.get<Child>('children').create((child) => {
        child.name = data.name;
        child.dateOfBirth = data.dateOfBirth;
        child.avatarUri = data.avatarUri;
        child.notes = data.notes;
        child.isActive = true;
      });
    });
    return newChild;
  } catch (error) {
    console.error('Error creating child:', error);
    throw error;
  }
}

/**
 * Get all active children
 */
export async function getActiveChildren(): Promise<Child[]> {
  try {
    const children = await database
      .get<Child>('children')
      .query(Q.where('is_active', true))
      .fetch();
    return children;
  } catch (error) {
    console.error('Error fetching active children:', error);
    throw error;
  }
}

/**
 * Get a child by ID
 */
export async function getChildById(id: string): Promise<Child | null> {
  try {
    const child = await database.get<Child>('children').find(id);
    return child;
  } catch (error) {
    console.error('Error fetching child by ID:', error);
    return null;
  }
}

/**
 * Update a child record
 */
export async function updateChild(
  id: string,
  data: Partial<CreateChildData>
): Promise<Child> {
  try {
    const child = await database.get<Child>('children').find(id);
    const updatedChild = await database.write(async () => {
      return await child.update((c) => {
        if (data.name !== undefined) c.name = data.name;
        if (data.dateOfBirth !== undefined) c.dateOfBirth = data.dateOfBirth;
        if (data.avatarUri !== undefined) c.avatarUri = data.avatarUri;
        if (data.notes !== undefined) c.notes = data.notes;
      });
    });
    return updatedChild;
  } catch (error) {
    console.error('Error updating child:', error);
    throw error;
  }
}

/**
 * Soft delete a child (set isActive to false)
 */
export async function deleteChild(id: string): Promise<void> {
  try {
    const child = await database.get<Child>('children').find(id);
    await database.write(async () => {
      await child.update((c) => {
        c.isActive = false;
      });
    });
  } catch (error) {
    console.error('Error deleting child:', error);
    throw error;
  }
}

// ==================== CLASS HELPERS ====================

interface CreateClassData {
  childId: string;
  name: string;
  category: string;
  color: string;
  locationName: string;
  locationAddress?: string;
  latitude: number;
  longitude: number;
  geofenceRadius?: number;
  schedule: Schedule;
  instructorName?: string;
  instructorContact?: string;
  instructorEmail?: string;
  enablePickupReminder?: boolean;
  pickupReminderMinutes?: number;
  enableAttendanceNotification?: boolean;
  autoAttendanceEnabled?: boolean;
  notes?: string;
}

/**
 * Create a new class record
 */
export async function createClass(data: CreateClassData): Promise<Class> {
  try {
    const newClass = await database.write(async () => {
      return await database.get<Class>('classes').create((cls) => {
        cls.childId = data.childId;
        cls.name = data.name;
        cls.category = data.category;
        cls.color = data.color;
        cls.locationName = data.locationName;
        cls.locationAddress = data.locationAddress;
        cls.latitude = data.latitude;
        cls.longitude = data.longitude;
        cls.geofenceRadius = data.geofenceRadius ?? 100;
        cls.scheduleJson = JSON.stringify(data.schedule);
        cls.instructorName = data.instructorName;
        cls.instructorContact = data.instructorContact;
        cls.instructorEmail = data.instructorEmail;
        cls.enablePickupReminder = data.enablePickupReminder ?? true;
        cls.pickupReminderMinutes = data.pickupReminderMinutes ?? 15;
        cls.enableAttendanceNotification = data.enableAttendanceNotification ?? true;
        cls.autoAttendanceEnabled = data.autoAttendanceEnabled ?? true;
        cls.notes = data.notes;
        cls.isActive = true;
      });
    });
    return newClass;
  } catch (error) {
    console.error('Error creating class:', error);
    throw error;
  }
}

/**
 * Get all classes for a specific child
 */
export async function getChildClasses(childId: string): Promise<Class[]> {
  try {
    const classes = await database
      .get<Class>('classes')
      .query(Q.where('child_id', childId), Q.where('is_active', true))
      .fetch();
    return classes;
  } catch (error) {
    console.error('Error fetching child classes:', error);
    throw error;
  }
}

/**
 * Get a class by ID
 */
export async function getClassById(id: string): Promise<Class | null> {
  try {
    const cls = await database.get<Class>('classes').find(id);
    return cls;
  } catch (error) {
    console.error('Error fetching class by ID:', error);
    return null;
  }
}

/**
 * Get all active classes
 */
export async function getAllActiveClasses(): Promise<Class[]> {
  try {
    const classes = await database
      .get<Class>('classes')
      .query(Q.where('is_active', true))
      .fetch();
    return classes;
  } catch (error) {
    console.error('Error fetching all active classes:', error);
    throw error;
  }
}

/**
 * Get today's classes based on schedule
 */
export async function getTodaysClasses(): Promise<Class[]> {
  try {
    const days = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ] as const;
    const today = days[new Date().getDay()];

    const allClasses = await database
      .get<Class>('classes')
      .query(Q.where('is_active', true))
      .fetch();

    // Filter classes that have today's schedule enabled
    const todaysClasses = allClasses.filter((cls) => {
      const schedule = cls.schedule;
      const daySchedule = schedule[today];
      return daySchedule?.enabled === true;
    });

    return todaysClasses;
  } catch (error) {
    console.error('Error fetching today\'s classes:', error);
    throw error;
  }
}

/**
 * Update a class record
 */
export async function updateClass(
  id: string,
  data: Partial<CreateClassData>
): Promise<Class> {
  try {
    const cls = await database.get<Class>('classes').find(id);
    const updatedClass = await database.write(async () => {
      return await cls.update((c) => {
        if (data.childId !== undefined) c.childId = data.childId;
        if (data.name !== undefined) c.name = data.name;
        if (data.category !== undefined) c.category = data.category;
        if (data.color !== undefined) c.color = data.color;
        if (data.locationName !== undefined) c.locationName = data.locationName;
        if (data.locationAddress !== undefined) c.locationAddress = data.locationAddress;
        if (data.latitude !== undefined) c.latitude = data.latitude;
        if (data.longitude !== undefined) c.longitude = data.longitude;
        if (data.geofenceRadius !== undefined) c.geofenceRadius = data.geofenceRadius;
        if (data.schedule !== undefined) c.scheduleJson = JSON.stringify(data.schedule);
        if (data.instructorName !== undefined) c.instructorName = data.instructorName;
        if (data.instructorContact !== undefined) c.instructorContact = data.instructorContact;
        if (data.instructorEmail !== undefined) c.instructorEmail = data.instructorEmail;
        if (data.enablePickupReminder !== undefined) c.enablePickupReminder = data.enablePickupReminder;
        if (data.pickupReminderMinutes !== undefined) c.pickupReminderMinutes = data.pickupReminderMinutes;
        if (data.enableAttendanceNotification !== undefined) c.enableAttendanceNotification = data.enableAttendanceNotification;
        if (data.autoAttendanceEnabled !== undefined) c.autoAttendanceEnabled = data.autoAttendanceEnabled;
        if (data.notes !== undefined) c.notes = data.notes;
      });
    });
    return updatedClass;
  } catch (error) {
    console.error('Error updating class:', error);
    throw error;
  }
}

/**
 * Soft delete a class
 */
export async function deleteClass(id: string): Promise<void> {
  try {
    const cls = await database.get<Class>('classes').find(id);
    await database.write(async () => {
      await cls.update((c) => {
        c.isActive = false;
      });
    });
  } catch (error) {
    console.error('Error deleting class:', error);
    throw error;
  }
}

// ==================== ATTENDANCE HELPERS ====================

type AttendanceStatus = 'present' | 'absent' | 'excused' | 'late';

interface MarkAttendanceOptions {
  notes?: string;
  checkInLatitude?: number;
  checkInLongitude?: number;
  locationAccuracy?: number;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Mark attendance for a class
 */
export async function markAttendance(
  classId: string,
  status: AttendanceStatus,
  automatic: boolean = false,
  options?: MarkAttendanceOptions
): Promise<AttendanceRecord> {
  try {
    const dateString = getTodayDateString();

    // Check if attendance record already exists for this class and date
    const existingRecords = await database
      .get<AttendanceRecord>('attendance_records')
      .query(Q.where('class_id', classId), Q.where('date', dateString))
      .fetch();

    let record: AttendanceRecord;

    await database.write(async () => {
      if (existingRecords.length > 0) {
        // Update existing record
        record = await existingRecords[0].update((r) => {
          r.status = status;
          r.checkInTime = Date.now();
          r.wasAutomatic = automatic;
          r.detectionMethod = automatic ? 'geofence' : 'manual';
          r.parentVerified = !automatic;
          if (options?.notes) r.notes = options.notes;
          if (options?.checkInLatitude) r.checkInLatitude = options.checkInLatitude;
          if (options?.checkInLongitude) r.checkInLongitude = options.checkInLongitude;
          if (options?.locationAccuracy) r.locationAccuracy = options.locationAccuracy;
        });
      } else {
        // Create new record
        record = await database.get<AttendanceRecord>('attendance_records').create((r) => {
          r.classId = classId;
          r.date = dateString;
          r.status = status;
          r.checkInTime = Date.now();
          r.wasAutomatic = automatic;
          r.detectionMethod = automatic ? 'geofence' : 'manual';
          r.parentVerified = !automatic;
          r.notes = options?.notes;
          r.checkInLatitude = options?.checkInLatitude;
          r.checkInLongitude = options?.checkInLongitude;
          r.locationAccuracy = options?.locationAccuracy;
        });
      }
    });

    return record!;
  } catch (error) {
    console.error('Error marking attendance:', error);
    throw error;
  }
}

/**
 * Mark checkout time for attendance
 */
export async function markCheckout(classId: string): Promise<AttendanceRecord | null> {
  try {
    const dateString = getTodayDateString();

    const existingRecords = await database
      .get<AttendanceRecord>('attendance_records')
      .query(Q.where('class_id', classId), Q.where('date', dateString))
      .fetch();

    if (existingRecords.length === 0) {
      console.warn('No attendance record found for checkout');
      return null;
    }

    let record: AttendanceRecord;
    await database.write(async () => {
      record = await existingRecords[0].update((r) => {
        r.checkOutTime = Date.now();
      });
    });

    return record!;
  } catch (error) {
    console.error('Error marking checkout:', error);
    throw error;
  }
}

/**
 * Get attendance records for a class within a date range
 */
export async function getClassAttendance(
  classId: string,
  startDate: string,
  endDate: string
): Promise<AttendanceRecord[]> {
  try {
    const records = await database
      .get<AttendanceRecord>('attendance_records')
      .query(
        Q.where('class_id', classId),
        Q.where('date', Q.gte(startDate)),
        Q.where('date', Q.lte(endDate))
      )
      .fetch();
    return records;
  } catch (error) {
    console.error('Error fetching class attendance:', error);
    throw error;
  }
}

/**
 * Get all attendance records for a specific date
 */
export async function getAttendanceByDate(date: string): Promise<AttendanceRecord[]> {
  try {
    const records = await database
      .get<AttendanceRecord>('attendance_records')
      .query(Q.where('date', date))
      .fetch();
    return records;
  } catch (error) {
    console.error('Error fetching attendance by date:', error);
    throw error;
  }
}

/**
 * Get today's attendance records
 */
export async function getTodaysAttendance(): Promise<AttendanceRecord[]> {
  return getAttendanceByDate(getTodayDateString());
}

// ==================== SAVED LOCATION HELPERS ====================

interface CreateSavedLocationData {
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  category: string;
  notes?: string;
  isFavorite?: boolean;
}

/**
 * Create a new saved location
 */
export async function createSavedLocation(
  data: CreateSavedLocationData
): Promise<SavedLocation> {
  try {
    const location = await database.write(async () => {
      return await database.get<SavedLocation>('saved_locations').create((loc) => {
        loc.name = data.name;
        loc.address = data.address;
        loc.latitude = data.latitude;
        loc.longitude = data.longitude;
        loc.category = data.category;
        loc.notes = data.notes;
        loc.isFavorite = data.isFavorite ?? false;
      });
    });
    return location;
  } catch (error) {
    console.error('Error creating saved location:', error);
    throw error;
  }
}

/**
 * Get all saved locations
 */
export async function getSavedLocations(): Promise<SavedLocation[]> {
  try {
    const locations = await database.get<SavedLocation>('saved_locations').query().fetch();
    return locations;
  } catch (error) {
    console.error('Error fetching saved locations:', error);
    throw error;
  }
}

/**
 * Get favorite saved locations
 */
export async function getFavoriteLocations(): Promise<SavedLocation[]> {
  try {
    const locations = await database
      .get<SavedLocation>('saved_locations')
      .query(Q.where('is_favorite', true))
      .fetch();
    return locations;
  } catch (error) {
    console.error('Error fetching favorite locations:', error);
    throw error;
  }
}

// ==================== SETTINGS HELPERS ====================

// Simple in-memory settings store (can be replaced with AsyncStorage)
const settingsCache: Record<string, unknown> = {};

/**
 * Get a setting value
 */
export function getSetting<T>(key: string, defaultValue: T): T {
  if (key in settingsCache) {
    return settingsCache[key] as T;
  }
  return defaultValue;
}

/**
 * Set a setting value
 */
export function setSetting<T>(key: string, value: T): void {
  settingsCache[key] = value;
}

// ==================== DATABASE UTILITIES ====================

/**
 * Reset the database (for development/testing only)
 */
export async function resetDatabase(): Promise<void> {
  try {
    await database.write(async () => {
      await database.unsafeResetDatabase();
    });
    console.log('Database reset successfully');
  } catch (error) {
    console.error('Error resetting database:', error);
    throw error;
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<{
  childrenCount: number;
  classesCount: number;
  attendanceRecordsCount: number;
  savedLocationsCount: number;
}> {
  try {
    const [children, classes, attendanceRecords, savedLocations] = await Promise.all([
      database.get<Child>('children').query(Q.where('is_active', true)).fetchCount(),
      database.get<Class>('classes').query(Q.where('is_active', true)).fetchCount(),
      database.get<AttendanceRecord>('attendance_records').query().fetchCount(),
      database.get<SavedLocation>('saved_locations').query().fetchCount(),
    ]);

    return {
      childrenCount: children,
      classesCount: classes,
      attendanceRecordsCount: attendanceRecords,
      savedLocationsCount: savedLocations,
    };
  } catch (error) {
    console.error('Error getting database stats:', error);
    throw error;
  }
}
