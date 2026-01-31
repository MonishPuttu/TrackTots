import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { Platform } from 'react-native';

import { schema } from './schema';
import { modelClasses } from './models';

// Create the SQLite adapter with Expo-compatible settings
const adapter = new SQLiteAdapter({
  schema,
  dbName: 'TrackTotsDB',
  jsi: false,
  onSetUpError: (error) => {
    console.error('Database setup error:', error);
  },
});

// Create the database instance
const database = new Database({
  adapter,
  modelClasses,
});

export default database;

// Re-export models and schema for convenience
export * from './models';
export { schema } from './schema';
