// Database Configuration
// Table names and IDs for GoFast Backend V2

export const DATABASE_CONFIG = {
  // Table Names
  TABLES: {
    ATHLETES: '"Athletes"',  // Note: Plural with quotes for PostgreSQL
    ACTIVITIES: '"Activities"',
    GARMIN_DATA: '"GarminData"'
  },
  
  // Database Connection
  CONNECTION: {
    PROVIDER: 'postgresql',
    DATABASE_NAME: 'gofast_db',
    CONNECTION_STRING: 'DATABASE_URL'
  }
};

export default DATABASE_CONFIG;
