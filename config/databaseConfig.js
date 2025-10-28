// Database Configuration
// Table names and IDs for GoFast Backend V2

export const DATABASE_CONFIG = {
  // Table Names
  TABLES: {
    ATHLETES: 'athletes',  // Note: lowercase, no quotes
    ACTIVITIES: 'athlete_activities',
    GARMIN_DATA: 'garmin_data'
  },
  
  // Database Connection
  CONNECTION: {
    PROVIDER: 'postgresql',
    DATABASE_NAME: 'gofast_db',
    CONNECTION_STRING: 'DATABASE_URL'
  }
};

export default DATABASE_CONFIG;
