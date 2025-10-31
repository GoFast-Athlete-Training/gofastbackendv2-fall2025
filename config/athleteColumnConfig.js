// Athlete Column Configuration System
// Defines which columns can be upserted and their metadata

export const ATHLETE_COLUMN_CONFIG = {
  // Athlete table configuration - EXACT columns from Prisma schema
  athletes: {
    enabled: true,
    primaryKey: 'id',
    columns: {
      // System fields
      id: { upsertable: false, type: 'string', required: true, displayName: 'ID', description: 'Primary key' },
      firebaseId: { upsertable: false, type: 'string', required: true, displayName: 'Firebase ID', description: 'Firebase auth ID' },
      
      // Universal Profile (MVP1 Required)
      firstName: { upsertable: true, type: 'string', required: false, displayName: 'First Name', description: 'Athlete first name' },
      lastName: { upsertable: true, type: 'string', required: false, displayName: 'Last Name', description: 'Athlete last name' },
      email: { upsertable: false, type: 'string', required: true, displayName: 'Email', description: 'Athlete email address - Users must change their own email (not admin)' },
      phoneNumber: { upsertable: true, type: 'string', required: false, displayName: 'Phone Number', description: 'Optional phone number' },
      gofastHandle: { upsertable: true, type: 'string', required: false, displayName: 'GoFast Handle', description: 'Unique username' },
      birthday: { upsertable: true, type: 'datetime', required: false, displayName: 'Birthday', description: 'Date of birth' },
      gender: { upsertable: true, type: 'string', required: false, displayName: 'Gender', description: 'Gender identity' },
      city: { upsertable: true, type: 'string', required: false, displayName: 'City', description: 'City location' },
      state: { upsertable: true, type: 'string', required: false, displayName: 'State', description: 'State location' },
      primarySport: { upsertable: true, type: 'string', required: false, displayName: 'Primary Sport', description: 'Main sport activity' },
      photoURL: { upsertable: true, type: 'string', required: false, displayName: 'Photo URL', description: 'Profile photo URL' },
      bio: { upsertable: true, type: 'string', required: false, displayName: 'Bio', description: 'Athlete biography' },
      instagram: { upsertable: true, type: 'string', required: false, displayName: 'Instagram', description: 'Instagram handle' },
      
      // RunCrew Integration (MVP1)
      runCrewId: { upsertable: true, type: 'string', required: false, displayName: 'RunCrew ID', description: 'RunCrew membership ID' },
      
      // Training Profile (Future)
      currentPace: { upsertable: true, type: 'string', required: false, displayName: 'Current Pace', description: 'Current running pace' },
      weeklyMileage: { upsertable: true, type: 'number', required: false, displayName: 'Weekly Mileage', description: 'Miles per week' },
      trainingGoal: { upsertable: true, type: 'string', required: false, displayName: 'Training Goal', description: 'Training objective' },
      targetRace: { upsertable: true, type: 'string', required: false, displayName: 'Target Race', description: 'Target race event' },
      trainingStartDate: { upsertable: true, type: 'datetime', required: false, displayName: 'Training Start Date', description: 'When training began' },
      
      // Match Profile (Future)
      preferredDistance: { upsertable: true, type: 'string', required: false, displayName: 'Preferred Distance', description: 'Preferred running distance' },
      timePreference: { upsertable: true, type: 'string', required: false, displayName: 'Time Preference', description: 'Preferred training time' },
      paceRange: { upsertable: true, type: 'string', required: false, displayName: 'Pace Range', description: 'Pace range preference' },
      runningGoals: { upsertable: true, type: 'string', required: false, displayName: 'Running Goals', description: 'Running objectives' },
      
      // Garmin OAuth 2.0 PKCE Integration
      garmin_user_id: { upsertable: true, type: 'string', required: false, displayName: 'Garmin User ID', description: 'Garmin Partner API UUID', source: 'garmin' },
      garmin_access_token: { upsertable: true, type: 'string', required: false, displayName: 'Garmin Access Token', description: 'OAuth access token', source: 'garmin', sensitive: true },
      garmin_refresh_token: { upsertable: true, type: 'string', required: false, displayName: 'Garmin Refresh Token', description: 'OAuth refresh token', source: 'garmin', sensitive: true },
      garmin_expires_in: { upsertable: true, type: 'number', required: false, displayName: 'Token Expires In', description: 'Token expiration in seconds', source: 'garmin' },
      garmin_scope: { upsertable: true, type: 'string', required: false, displayName: 'Garmin Scope', description: 'OAuth scope permissions', source: 'garmin' },
      garmin_connected_at: { upsertable: true, type: 'datetime', required: false, displayName: 'Connected At', description: 'When Garmin was connected', source: 'garmin' },
      garmin_last_sync_at: { upsertable: true, type: 'datetime', required: false, displayName: 'Last Sync', description: 'Last data sync timestamp', source: 'garmin' },
      
      // Garmin Permissions & Status
      garmin_permissions: { upsertable: true, type: 'json', required: false, displayName: 'Garmin Permissions', description: 'Garmin permission details', source: 'garmin' },
      garmin_is_connected: { upsertable: true, type: 'boolean', required: false, displayName: 'Is Connected', description: 'Garmin connection status', source: 'garmin' },
      garmin_disconnected_at: { upsertable: true, type: 'datetime', required: false, displayName: 'Disconnected At', description: 'When user disconnected', source: 'garmin' },
      
      // Garmin Rich User Data (from API)
      garmin_user_profile: { upsertable: true, type: 'json', required: false, displayName: 'Garmin Profile', description: 'Rich user profile data from Garmin API', source: 'garmin' },
      garmin_user_sleep: { upsertable: true, type: 'json', required: false, displayName: 'Garmin Sleep', description: 'Sleep preferences from Garmin', source: 'garmin' },
      garmin_user_preferences: { upsertable: true, type: 'json', required: false, displayName: 'Garmin Preferences', description: 'User preferences from Garmin', source: 'garmin' },
      
      // System fields
      createdAt: { upsertable: false, type: 'datetime', required: true, displayName: 'Created At', description: 'Record creation timestamp' },
      updatedAt: { upsertable: false, type: 'datetime', required: true, displayName: 'Updated At', description: 'Record update timestamp' },
      status: { upsertable: true, type: 'string', required: false, displayName: 'Status', description: 'Optional status field' }
    }
  }
};

// Helper functions
export const getAthleteUpsertableColumns = (tableName) => {
  const tableConfig = ATHLETE_COLUMN_CONFIG[tableName];
  if (!tableConfig) return [];
  
  return Object.entries(tableConfig.columns)
    .filter(([_, config]) => config.upsertable)
    .map(([columnName, config]) => ({
      name: columnName,
      ...config
    }));
};

export const getAthleteColumnConfig = (tableName, columnName) => {
  return ATHLETE_COLUMN_CONFIG[tableName]?.columns?.[columnName] || null;
};

export const isAthleteUpsertEnabled = (tableName) => {
  return ATHLETE_COLUMN_CONFIG[tableName]?.enabled || false;
};

export const getAthletePrimaryKey = (tableName) => {
  return ATHLETE_COLUMN_CONFIG[tableName]?.primaryKey || 'id';
};
