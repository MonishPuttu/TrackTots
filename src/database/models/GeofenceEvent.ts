import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import type { Relation } from '@nozbe/watermelondb';
import type Class from './Class';

export default class GeofenceEvent extends Model {
  static table = 'geofence_events';

  static associations = {
    classes: { type: 'belongs_to' as const, key: 'class_id' },
  };

  @field('class_id') classId!: string;
  @field('event_type') eventType!: string;
  @field('event_time') eventTime!: number;
  @field('latitude') latitude!: number;
  @field('longitude') longitude!: number;
  @field('accuracy') accuracy!: number;
  @field('was_processed') wasProcessed!: boolean;
  @field('created_attendance_record') createdAttendanceRecord!: boolean;

  @readonly @date('created_at') createdAt!: Date;

  @relation('classes', 'class_id') class!: Relation<Class>;
}
