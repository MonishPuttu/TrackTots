import { Model, Q } from '@nozbe/watermelondb';
import { field, date, readonly, relation, children } from '@nozbe/watermelondb/decorators';
import type { Query, Relation } from '@nozbe/watermelondb';
import type { Schedule } from '../../types';
import type Child from './Child';
import type AttendanceRecord from './AttendanceRecord';

export default class Class extends Model {
  static table = 'classes';

  static associations = {
    children: { type: 'belongs_to' as const, key: 'child_id' },
    attendance_records: { type: 'has_many' as const, foreignKey: 'class_id' },
  };

  @field('child_id') childId!: string;
  @field('name') name!: string;
  @field('category') category!: string;
  @field('color') color!: string;
  @field('location_name') locationName!: string;
  @field('location_address') locationAddress?: string;
  @field('latitude') latitude!: number;
  @field('longitude') longitude!: number;
  @field('geofence_radius') geofenceRadius!: number;
  @field('schedule') scheduleJson!: string;
  @field('instructor_name') instructorName?: string;
  @field('instructor_contact') instructorContact?: string;
  @field('instructor_email') instructorEmail?: string;
  @field('enable_pickup_reminder') enablePickupReminder!: boolean;
  @field('pickup_reminder_minutes') pickupReminderMinutes?: number;
  @field('enable_attendance_notification') enableAttendanceNotification!: boolean;
  @field('auto_attendance_enabled') autoAttendanceEnabled!: boolean;
  @field('notes') notes?: string;
  @field('is_active') isActive!: boolean;

  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;

  @relation('children', 'child_id') child!: Relation<Child>;
  @children('attendance_records') attendanceRecords!: Query<AttendanceRecord>;

  /**
   * Parse the JSON schedule string into a Schedule object
   */
  get schedule(): Schedule {
    try {
      return JSON.parse(this.scheduleJson || '{}');
    } catch {
      return {};
    }
  }

  /**
   * Get attendance records for a specific month
   */
  async getAttendanceForMonth(year: number, month: number): Promise<AttendanceRecord[]> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

    const records = await this.collections
      .get<AttendanceRecord>('attendance_records')
      .query(
        Q.where('class_id', this.id),
        Q.where('date', Q.gte(startDate)),
        Q.where('date', Q.lt(endDate))
      )
      .fetch();

    return records;
  }

  /**
   * Calculate attendance rate between two dates
   */
  async getAttendanceRate(startDate: string, endDate: string): Promise<number> {
    const records = await this.collections
      .get<AttendanceRecord>('attendance_records')
      .query(
        Q.where('class_id', this.id),
        Q.where('date', Q.gte(startDate)),
        Q.where('date', Q.lte(endDate))
      )
      .fetch();

    if (records.length === 0) {
      return 0;
    }

    const presentCount = records.filter(
      (r) => r.status === 'present' || r.status === 'late'
    ).length;

    return (presentCount / records.length) * 100;
  }
}
