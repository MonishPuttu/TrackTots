import Child from './Child';
import Class from './Class';
import AttendanceRecord from './AttendanceRecord';
import SavedLocation from './SavedLocation';
import GeofenceEvent from './GeofenceEvent';

export { Child, Class, AttendanceRecord, SavedLocation, GeofenceEvent };

// Export model classes array for database initialization
export const modelClasses = [Child, Class, AttendanceRecord, SavedLocation, GeofenceEvent];

// Re-export types
export type { AttendanceStatus, DetectionMethod } from './AttendanceRecord';
