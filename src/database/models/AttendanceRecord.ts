import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import type { Relation } from '@nozbe/watermelondb';
import type Class from './Class';

export type AttendanceStatus = 'present' | 'absent' | 'excused' | 'late';
export type DetectionMethod = 'geofence' | 'manual' | 'scheduled';

export default class AttendanceRecord extends Model {
  static table = 'attendance_records';

  static associations = {
    classes: { type: 'belongs_to' as const, key: 'class_id' },
  };

  @field('class_id') classId!: string;
  @field('date') date!: string; // YYYY-MM-DD format
  @field('status') status!: AttendanceStatus;
  @field('check_in_time') checkInTime?: number;
  @field('check_out_time') checkOutTime?: number;
  @field('was_automatic') wasAutomatic!: boolean;
  @field('detection_method') detectionMethod?: DetectionMethod;
  @field('check_in_latitude') checkInLatitude?: number;
  @field('check_in_longitude') checkInLongitude?: number;
  @field('location_accuracy') locationAccuracy?: number;
  @field('notes') notes?: string;
  @field('parent_verified') parentVerified!: boolean;

  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('classes', 'class_id') class!: Relation<Class>;

  /**
   * Get formatted date string for display
   */
  get formattedDate(): string {
    const [year, month, day] = this.date.split('-');
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
