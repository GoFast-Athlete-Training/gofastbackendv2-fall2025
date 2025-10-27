// GoFast Keys Configuration
// All endpoints, keys, and configuration for GoFast ecosystem

export const GoFastConfig = {
  // ===== BACKEND ENDPOINTS =====
  BACKEND: {
    // Main Backend V2 (Active)
    BASE_URL: 'https://gofastbackendv2-fall2025.onrender.com',
    API_BASE: 'https://gofastbackendv2-fall2025.onrender.com/api',
    
    // Health Check
    HEALTH: 'https://gofastbackendv2-fall2025.onrender.com/api/health',
    
    // Athlete Endpoints (NEW STRUCTURE)
    ATHLETES: {
      BASE: 'https://gofastbackendv2-fall2025.onrender.com/api/athlete',
      CREATE: 'https://gofastbackendv2-fall2025.onrender.com/api/athlete/create',
      GET_ALL: 'https://gofastbackendv2-fall2025.onrender.com/api/athlete',
      GET_BY_ID: 'https://gofastbackendv2-fall2025.onrender.com/api/athlete/:id',
      UPDATE: 'https://gofastbackendv2-fall2025.onrender.com/api/athlete/:id',
      DELETE: 'https://gofastbackendv2-fall2025.onrender.com/api/athlete/:id',
      
      // Profile Management
      PROFILE: {
        GET: 'https://gofastbackendv2-fall2025.onrender.com/api/athlete/:id/profile',
        UPDATE: 'https://gofastbackendv2-fall2025.onrender.com/api/athlete/:id/profile',
        UNIVERSAL: 'https://gofastbackendv2-fall2025.onrender.com/api/athlete/:id/universal',
        TRAINING: 'https://gofastbackendv2-fall2025.onrender.com/api/athlete/:id/training',
        MATCHING: 'https://gofastbackendv2-fall2025.onrender.com/api/athlete/:id/matching',
        EVENT: 'https://gofastbackendv2-fall2025.onrender.com/api/athlete/:id/event'
      }
    },
    
    // Auth Endpoints (DEPRECATED - Use ATHLETES.CREATE)
    AUTH: {
      ATHLETE_USER: 'https://gofastbackendv2-fall2025.onrender.com/api/athlete/create'
    }
  },

  // ===== FRONTEND ENDPOINTS =====
  FRONTEND: {
    // Demo Frontend
    DEMO: 'https://gofastfrontend-demo.vercel.app',
    
    // MVP1 Frontend
    MVP1: 'https://gofastfrontend-mvp1.vercel.app',
    
    // User Dashboard
    DASHBOARD: 'https://gofast-user-dashboard.vercel.app',
    
    // Marketing Site
    LANDING: 'https://gofastcrushgoals.com'
  },

  // ===== DATABASE CONFIG =====
  DATABASE: {
    PROVIDER: 'postgresql',
    ENV_VAR: 'DATABASE_URL',
    HOST: 'Render PostgreSQL',
    URL: 'DATABASE_URL' // Environment variable for Prisma connection
  },

  // ===== FIREBASE CONFIG =====
  FIREBASE: {
    // Environment Variable Names
    SERVICE_ACCOUNT: 'FIREBASE_SERVICE_ACCOUNT',
    
    // Frontend Firebase Config (add your actual config)
    FRONTEND_CONFIG: {
      apiKey: "your-api-key",
      authDomain: "your-project.firebaseapp.com",
      projectId: "your-project-id",
      storageBucket: "your-project.appspot.com",
      messagingSenderId: "your-sender-id",
      appId: "your-app-id"
    }
  },

  // ===== CORS CONFIG =====
  CORS: {
    ALLOWED_ORIGINS: [
      'https://gofastfrontend-demo.vercel.app',
      'https://gofastfrontend-mvp1.vercel.app',
      'https://gofast-user-dashboard.vercel.app',
      /^https:\/\/gofastfrontend-demo-.*\.vercel\.app$/,
      /^https:\/\/gofastfrontend-mvp1-.*\.vercel\.app$/,
      /^https:\/\/gofast-user-dashboard-.*\.vercel\.app$/,
      /^https:\/\/gofast-.*\.vercel\.app$/
    ],
    METHODS: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    HEADERS: ['Content-Type', 'Authorization'],
    CREDENTIALS: true
  },

  // ===== ENVIRONMENT VARIABLES =====
  ENV_VARS: {
    // Database
    DATABASE_URL: 'DATABASE_URL',
    
    // Firebase
    FIREBASE_SERVICE_ACCOUNT: 'FIREBASE_SERVICE_ACCOUNT',
    
    // Server
    PORT: 'PORT',
    NODE_ENV: 'NODE_ENV'
  },

  // ===== API RESPONSE FORMATS =====
  RESPONSES: {
    SUCCESS: {
      success: true,
      message: 'Operation successful',
      data: null
    },
    ERROR: {
      success: false,
      error: 'Error message',
      message: 'Operation failed'
    },
    ATHLETE_CREATED: {
      success: true,
      message: 'Athlete created successfully',
      athleteId: 'athlete-id',
      id: 'athlete-id',
      firebaseId: 'firebase-id',
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      photoURL: 'https://...',
      status: 'active',
      createdAt: '2024-01-01T00:00:00.000Z'
    }
  },

  // ===== DEBUG CONFIG =====
  DEBUG: {
    LOG_LEVEL: 'debug',
    LOG_AUTH: true,
    LOG_DATABASE: true,
    LOG_REQUESTS: true
  }
};

// ===== USAGE EXAMPLES =====
export const UsageExamples = {
  // Backend API Calls
  BACKEND_CALLS: {
    // Health Check
    healthCheck: `${GoFastConfig.BACKEND.HEALTH}`,
    
    // Get All Athletes
    getAllAthletes: `${GoFastConfig.BACKEND.ATHLETES.GET_ALL}`,
    
    // Create Athlete
    createAthlete: `${GoFastConfig.BACKEND.AUTH.ATHLETE_USER}`,
    
    // Get Athlete by ID
    getAthleteById: `${GoFastConfig.BACKEND.ATHLETES.GET_BY_ID.replace(':id', 'athlete-id')}`
  },

  // Frontend URLs
  FRONTEND_URLS: {
    // Demo App
    demoApp: `${GoFastConfig.FRONTEND.DEMO}`,
    
    // MVP1 App
    mvp1App: `${GoFastConfig.FRONTEND.MVP1}`,
    
    // User Dashboard
    userDashboard: `${GoFastConfig.FRONTEND.DASHBOARD}`,
    
    // Marketing Site
    landingPage: `${GoFastConfig.FRONTEND.LANDING}`
  }
};

export default GoFastConfig;
