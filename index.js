import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import database connection
import { connectDatabase, getPrismaClient } from './config/database.js';

// Import routes
import athleteProfileRouter from './routes/Athlete/athleteProfileRoute.js';
import athleteRouter from './routes/Athlete/athleteRoute.js';
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

// Routes
app.use('/api/athlete', athleteProfileRouter);
app.use('/api/athlete', athleteRouter);
app.use('/api/athlete', athleteHydrateRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    message: 'GoFast Backend V2 is running!'
  });
});

// Database setup endpoint (for creating tables)
app.post('/api/setup-database', async (req, res) => {
  try {
    console.log('🔧 SETUP: Starting database setup...');
    
    const prisma = getPrismaClient();
    
    // Test if athletes table exists
    try {
      const athletes = await prisma.athlete.findMany();
      console.log('✅ SETUP: Athletes table exists with', athletes.length, 'records');
      
      res.json({
        success: true,
        message: 'Database already set up',
        athletesCount: athletes.length,
        timestamp: new Date().toISOString()
      });
      
    } catch (tableError) {
      console.log('❌ SETUP: Athletes table does not exist, need to create it');
      console.log('❌ SETUP: Error:', tableError.message);
      
      res.status(500).json({
        success: false,
        error: 'Athletes table does not exist',
        message: 'Run "npx prisma db push" to create tables',
        details: tableError.message,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('❌ SETUP: Database setup error:', error);
    res.status(500).json({
      success: false,
      error: 'Database setup failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Manual database push endpoint (for emergency table creation)
app.post('/api/push-database', async (req, res) => {
  try {
    console.log('🚀 PUSH: Attempting to push Prisma schema to database...');
    
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    // Run prisma db push
    const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss');
    
    console.log('✅ PUSH: Prisma db push completed');
    console.log('STDOUT:', stdout);
    if (stderr) console.log('STDERR:', stderr);
    
    res.json({
      success: true,
      message: 'Database schema pushed successfully',
      stdout: stdout,
      stderr: stderr,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ PUSH: Database push failed:', error);
    res.status(500).json({
      success: false,
      error: 'Database push failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
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

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'GoFast Backend V2 API',
    version: '2.0.0',
    endpoints: {
      health: '/api/health',
      athletes: '/api/athletes',
      athleteCreate: '/api/athlete/create',
      athleteHydrate: '/api/athlete/hydrate',
      athleteHydrateSummary: '/api/athlete/hydrate/summary',
      athleteHydrateById: '/api/athlete/:id/hydrate'
    }
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
