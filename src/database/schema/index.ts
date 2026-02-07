import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    // Children table
    tableSchema({
      name: 'children',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'date_of_birth', type: 'number', isOptional: true },
        { name: 'avatar_uri', type: 'string', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'is_active', type: 'boolean', isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // Classes table
    tableSchema({
      name: 'classes',
      columns: [
        { name: 'child_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'category', type: 'string', isIndexed: true },
        { name: 'color', type: 'string' },
        { name: 'location_name', type: 'string' },
        { name: 'location_address', type: 'string', isOptional: true },
        { name: 'latitude', type: 'number' },
        { name: 'longitude', type: 'number' },
        { name: 'geofence_radius', type: 'number' },
        { name: 'schedule', type: 'string' }, // JSON stringified Schedule object
        { name: 'instructor_name', type: 'string', isOptional: true },
        { name: 'instructor_contact', type: 'string', isOptional: true },
        { name: 'instructor_email', type: 'string', isOptional: true },
        { name: 'enable_pickup_reminder', type: 'boolean' },
        { name: 'pickup_reminder_minutes', type: 'number', isOptional: true },
        { name: 'enable_attendance_notification', type: 'boolean' },
        { name: 'auto_attendance_enabled', type: 'boolean' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'is_active', type: 'boolean', isIndexed: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // Attendance records table
    tableSchema({
      name: 'attendance_records',
      columns: [
        { name: 'class_id', type: 'string', isIndexed: true },
        { name: 'date', type: 'string', isIndexed: true }, // YYYY-MM-DD format
        { name: 'status', type: 'string', isIndexed: true }, // present, absent, excused, late
        { name: 'check_in_time', type: 'number', isOptional: true },
        { name: 'check_out_time', type: 'number', isOptional: true },
        { name: 'was_automatic', type: 'boolean' },
        { name: 'detection_method', type: 'string', isOptional: true }, // geofence, manual, scheduled
        { name: 'check_in_latitude', type: 'number', isOptional: true },
        { name: 'check_in_longitude', type: 'number', isOptional: true },
        { name: 'location_accuracy', type: 'number', isOptional: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'parent_verified', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // Saved locations table
    tableSchema({
      name: 'saved_locations',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'address', type: 'string', isOptional: true },
        { name: 'latitude', type: 'number' },
        { name: 'longitude', type: 'number' },
        { name: 'category', type: 'string', isIndexed: true },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'is_favorite', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // Geofence events table (for tracking location-based attendance events)
    tableSchema({
      name: 'geofence_events',
      columns: [
        { name: 'class_id', type: 'string', isIndexed: true },
        { name: 'event_type', type: 'string', isIndexed: true }, // 'enter' | 'exit'
        { name: 'event_time', type: 'number' },
        { name: 'latitude', type: 'number' },
        { name: 'longitude', type: 'number' },
        { name: 'accuracy', type: 'number' },
        { name: 'was_processed', type: 'boolean' },
        { name: 'created_attendance_record', type: 'boolean' },
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
});

export default schema;
