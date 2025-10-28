// GoFast Backend API Configuration
// The 4 actual API calls we have

export const API_ROUTES = {
  // 1. CREATE ATHLETE
  CREATE_ATHLETE: {
    method: 'POST',
    path: '/api/athlete/create',
    file: 'routes/Athlete/athleteCreateRoute.js',
    purpose: 'Create new athlete from Firebase sign-in',
    usedBy: ['MVP1 signup', 'MVP1 signin']
  },

  // 2. HYDRATE ALL ATHLETES (Container Query)
  HYDRATE_ATHLETES: {
    method: 'GET', 
    path: '/api/athlete/admin/hydrate',
    file: 'routes/Athlete/athleteHydrateRoute.js',
    purpose: 'Get all athletes for admin dashboard',
    usedBy: ['AdminHome', 'AdminAthletes']
  },

  // 3. RETRIEVE INDIVIDUAL ATHLETE (Universal Hydrate)
  RETRIEVE_ATHLETE: {
    method: 'GET',
    path: '/api/athlete/retrieve',
    file: 'routes/Athlete/athleteUniversalHydrateRoute.js', 
    purpose: 'Get individual athlete by Firebase ID for frontend hydration',
    usedBy: ['AthleteHome', 'Profile pages', 'Any authenticated page']
  },

  // 4. UPDATE ATHLETE PROFILE
  UPDATE_PROFILE: {
    method: 'PUT',
    path: '/api/athlete/:id/profile', 
    file: 'routes/Athlete/athleteProfileRoute.js',
    purpose: 'Save profile form data to athlete',
    usedBy: ['Profile setup forms']
  }
};

export const ROUTE_ORDER = [
  'athleteHydrateRouter',  // Specific routes first
  'athleteProfileRouter', // Profile routes second  
  'athleteCreateRouter'   // General routes last
];

export default API_ROUTES;