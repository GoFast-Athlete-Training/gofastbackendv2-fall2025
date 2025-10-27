// API Configuration - GoFast Backend V2
// Centralized API endpoint configuration

export const ApiConfig = {
  // ===== BASE CONFIGURATION =====
  BASE_URL: 'https://gofastbackendv2-fall2025.onrender.com',
  API_VERSION: 'v1',
  
  // ===== ATHLETE ENDPOINTS =====
  ATHLETE: {
    // Base athlete routes
    BASE: '/api/athlete',
    
    // CRUD Operations
    CREATE: '/api/athlete/create',           // POST - Create new athlete
    GET_ALL: '/api/athlete',                 // GET - Get all athletes
    GET_BY_ID: '/api/athlete/:id',          // GET - Get athlete by ID
    UPDATE: '/api/athlete/:id',              // PUT - Update athlete
    DELETE: '/api/athlete/:id',             // DELETE - Delete athlete
    
    // Profile Management
    PROFILE: {
      GET: '/api/athlete/:id/profile',       // GET - Get full profile
      UPDATE: '/api/athlete/:id/profile',   // PUT - Update profile
      UNIVERSAL: '/api/athlete/:id/universal', // PUT - Update universal profile
      TRAINING: '/api/athlete/:id/training',  // PUT - Update training profile
      MATCHING: '/api/athlete/:id/matching',  // PUT - Update matching profile
      EVENT: '/api/athlete/:id/event'         // PUT - Update event profile
    },
    
    // Authentication
    AUTH: {
      CREATE_USER: '/api/athlete/create',    // POST - Create athlete from Firebase
      LINK_FIREBASE: '/api/athlete/:id/link-firebase' // POST - Link Firebase ID
    }
  },

  // ===== TRAINING ENDPOINTS =====
  TRAINING: {
    BASE: '/api/training',
    PLANS: '/api/training/plans',
    ACTIVITIES: '/api/training/activities',
    STATS: '/api/training/stats'
  },

  // ===== MATCHING ENDPOINTS =====
  MATCHING: {
    BASE: '/api/matching',
    FIND_MATCHES: '/api/matching/find',
    REQUESTS: '/api/matching/requests',
    PAIRS: '/api/matching/pairs'
  },

  // ===== RUNCREW ENDPOINTS =====
  RUNCREW: {
    BASE: '/api/runcrew',
    CREWS: '/api/runcrew/crews',
    MEMBERS: '/api/runcrew/members',
    LEADERBOARD: '/api/runcrew/leaderboard'
  },

  // ===== SYSTEM ENDPOINTS =====
  SYSTEM: {
    HEALTH: '/api/health',
    STATUS: '/api/status',
    VERSION: '/api/version'
  }
};

// ===== FULL URLS =====
export const ApiUrls = {
  // Athlete URLs
  ATHLETE: {
    CREATE: `${ApiConfig.BASE_URL}${ApiConfig.ATHLETE.CREATE}`,
    GET_ALL: `${ApiConfig.BASE_URL}${ApiConfig.ATHLETE.GET_ALL}`,
    GET_BY_ID: (id) => `${ApiConfig.BASE_URL}${ApiConfig.ATHLETE.GET_BY_ID.replace(':id', id)}`,
    UPDATE: (id) => `${ApiConfig.BASE_URL}${ApiConfig.ATHLETE.UPDATE.replace(':id', id)}`,
    DELETE: (id) => `${ApiConfig.BASE_URL}${ApiConfig.ATHLETE.DELETE.replace(':id', id)}`,
    
    // Profile URLs
    PROFILE: {
      GET: (id) => `${ApiConfig.BASE_URL}${ApiConfig.ATHLETE.PROFILE.GET.replace(':id', id)}`,
      UPDATE: (id) => `${ApiConfig.BASE_URL}${ApiConfig.ATHLETE.PROFILE.UPDATE.replace(':id', id)}`,
      UNIVERSAL: (id) => `${ApiConfig.BASE_URL}${ApiConfig.ATHLETE.PROFILE.UNIVERSAL.replace(':id', id)}`,
      TRAINING: (id) => `${ApiConfig.BASE_URL}${ApiConfig.ATHLETE.PROFILE.TRAINING.replace(':id', id)}`,
      MATCHING: (id) => `${ApiConfig.BASE_URL}${ApiConfig.ATHLETE.PROFILE.MATCHING.replace(':id', id)}`,
      EVENT: (id) => `${ApiConfig.BASE_URL}${ApiConfig.ATHLETE.PROFILE.EVENT.replace(':id', id)}`
    }
  },
  
  // System URLs
  SYSTEM: {
    HEALTH: `${ApiConfig.BASE_URL}${ApiConfig.SYSTEM.HEALTH}`,
    STATUS: `${ApiConfig.BASE_URL}${ApiConfig.SYSTEM.STATUS}`,
    VERSION: `${ApiConfig.BASE_URL}${ApiConfig.SYSTEM.VERSION}`
  }
};

// ===== REQUEST EXAMPLES =====
export const RequestExamples = {
  // Create Athlete
  CREATE_ATHLETE: {
    url: ApiUrls.ATHLETE.CREATE,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer <firebase-token>'
    },
    body: {
      firebaseId: 'firebase-user-id',
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      photoURL: 'https://example.com/photo.jpg'
    }
  },

  // Get Athlete by ID
  GET_ATHLETE: {
    url: ApiUrls.ATHLETE.GET_BY_ID('athlete-id'),
    method: 'GET',
    headers: {
      'Authorization': 'Bearer <firebase-token>'
    }
  },

  // Update Athlete Profile
  UPDATE_PROFILE: {
    url: ApiUrls.ATHLETE.PROFILE.UPDATE('athlete-id'),
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer <firebase-token>'
    },
    body: {
      firstName: 'John',
      lastName: 'Doe',
      city: 'Charlotte',
      state: 'NC',
      bio: 'Passionate runner'
    }
  }
};

// ===== RESPONSE FORMATS =====
export const ResponseFormats = {
  SUCCESS: {
    success: true,
    message: 'Operation successful',
    data: null,
    timestamp: new Date().toISOString()
  },
  
  ERROR: {
    success: false,
    error: 'Error message',
    message: 'Operation failed',
    timestamp: new Date().toISOString()
  },
  
  ATHLETE_CREATED: {
    success: true,
    message: 'Athlete created successfully',
    athleteId: 'athlete-id',
    data: {
      id: 'athlete-id',
      firebaseId: 'firebase-user-id',
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      photoURL: 'https://example.com/photo.jpg',
      status: 'active',
      createdAt: '2024-01-01T00:00:00.000Z'
    },
    timestamp: new Date().toISOString()
  }
};

export default ApiConfig;

