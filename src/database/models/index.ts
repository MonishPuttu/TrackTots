import Child from './Child';
import Class from './Class';
import AttendanceRecord from './AttendanceRecord';
import SavedLocation from './SavedLocation';

export { Child, Class, AttendanceRecord, SavedLocation };

// Export model classes array for database initialization
export const modelClasses = [Child, Class, AttendanceRecord, SavedLocation];

// Re-export types
export type { AttendanceStatus, DetectionMethod } from './AttendanceRecord';
