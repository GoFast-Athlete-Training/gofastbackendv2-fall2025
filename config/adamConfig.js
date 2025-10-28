// Adam's Test Data Configuration
// Critical IDs and data for testing and debugging

export const ADAM_CONFIG = {
  // Adam's Athlete ID
  ATHLETE_ID: 'cmh9pl5in0000rj1wkijpxl2t',
  
  // Adam's Email
  EMAIL: 'adam.cole.novadude@gmail.com',
  
  // Adam's Firebase ID
  FIREBASE_ID: 'npICZjYVK5bKUTsEY6yEkZ9rDwY2',
  
  // Test Data
  TEST_DATA: {
    GARMIN_SCOPE: 'PARTNER_WRITE PARTNER_READ CONNECT_READ CONNECT_WRITE',
    LAST_OAUTH_SUCCESS: '2025-10-28',
    TOKEN_STATUS: 'active'
  },
  
  // SQL Queries for Adam's Data
  SQL_QUERIES: {
    GET_ADAM: `SELECT * FROM "Athletes" WHERE id = 'cmh9pl5in0000rj1wkijpxl2t';`,
    GET_ADAM_GARMIN: `SELECT id, email, garmin_user_id, garmin_access_token IS NOT NULL as has_access_token, garmin_refresh_token IS NOT NULL as has_refresh_token, garmin_expires_in, garmin_scope, garmin_connected_at, garmin_last_sync_at, garmin_is_connected FROM "Athletes" WHERE id = 'cmh9pl5in0000rj1wkijpxl2t';`
  }
};

export default ADAM_CONFIG;
