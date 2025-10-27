import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import database connection
import { connectDatabase, getPrismaClient } from './config/database.js';

// Import API configuration
import { API_ROUTES, ROUTE_ORDER } from './config/apiConfig.js';

// Import routes
import athleteProfileRouter from './routes/Athlete/athleteProfileRoute.js';
import athleteCreateRouter from './routes/Athlete/athleteCreateRoute.js';
import athleteHydrateRouter from './routes/Athlete/athleteHydrateRoute.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    'https://gofastfrontend-demo.vercel.app',
    'https://gofastfrontend-mvp1.vercel.app',
    'https://gofast-user-dashboard.vercel.app',
    'https://athlete.gofastcrushgoals.com',
    /^https:\/\/gofastfrontend-demo-.*\.vercel\.app$/,
    /^https:\/\/gofastfrontend-mvp1-.*\.vercel\.app$/,
    /^https:\/\/gofast-user-dashboard-.*\.vercel\.app$/,
    /^https:\/\/gofast-.*\.vercel\.app$/,
    /^https:\/\/athlete\.gofastcrushgoals\.com$/
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CLEAN ROUTES - ORDER MATTERS!
// 1. Specific routes FIRST
app.use('/api/athlete', athleteHydrateRouter); // /admin/hydrate, /hydrate/summary, /:id/hydrate
// 2. Profile routes SECOND  
app.use('/api/athlete', athleteProfileRouter); // /:id/profile
// 3. General routes LAST
app.use('/api/athlete', athleteCreateRouter); // /create, /, /:id, /find

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    message: 'GoFast Backend V2 is running!'
  });
});

// Basic athletes endpoint (with Prisma)
app.get('/api/athletes', async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const athletes = await prisma.athlete.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({
      success: true,
      count: athletes.length,
      athletes: athletes,
      message: 'Athletes from database'
    });
  } catch (error) {
    console.error('Error fetching athletes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch athletes',
      message: error.message
    });
  }
});

// Root endpoint with CONFIG routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'GoFast Backend V2 API',
    version: '2.0.0',
    endpoints: {
      health: '/api/health',
      athletes: '/api/athletes',
      // THE 3 ACTUAL API CALLS FROM CONFIG:
      createAthlete: API_ROUTES.CREATE_ATHLETE.path,
      hydrateAthletes: API_ROUTES.HYDRATE_ATHLETES.path,
      updateProfile: API_ROUTES.UPDATE_PROFILE.path
    },
    config: API_ROUTES
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 GoFast Backend V2 running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`👥 Athletes: http://localhost:${PORT}/api/athletes`);
  
  // Connect to database
  await connectDatabase();
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  const prisma = getPrismaClient();
  await prisma.$disconnect();
  process.exit(0);
});

export default app;