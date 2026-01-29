// TypeScript type definitions

export interface Child {
  id: string;
  name: string;
  dateOfBirth?: number;
  avatarUri?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Class {
  id: string;
  childId: string;
  name: string;
  category: string;
  color: string;
  locationName: string;
  locationAddress?: string;
  latitude: number;
  longitude: number;
  geofenceRadius: number;
  schedule: Schedule;
  instructorName?: string;
  instructorContact?: string;
  instructorEmail?: string;
  enablePickupReminder: boolean;
  pickupReminderMinutes?: number;
  enableAttendanceNotification: boolean;
  autoAttendanceEnabled: boolean;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceRecord {
  id: string;
  classId: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent' | 'excused' | 'late';
  checkInTime?: number;
  checkOutTime?: number;
  wasAutomatic: boolean;
  detectionMethod?: string;
  checkInLatitude?: number;
  checkInLongitude?: number;
  locationAccuracy?: number;
  notes?: string;
  parentVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Schedule {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
}

export interface DaySchedule {
  enabled: boolean;
  startTime: string; // HH:mm format
  endTime: string;
  checkInWindowMinutes: number;
}