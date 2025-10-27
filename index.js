import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDatabase, getPrismaClient } from './config/database.js';
import { API_ROUTES } from './config/apiConfig.js';

// Import the 3 routes
import athleteCreateRouter from './routes/Athlete/athleteCreateRoute.js';
import athleteHydrateRouter from './routes/Athlete/athleteHydrateRoute.js';
import athleteProfileRouter from './routes/Athlete/athleteProfileRoute.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS
app.use(cors({
  origin: [
    'https://gofastfrontend-demo.vercel.app',
    'https://gofastfrontend-mvp1.vercel.app',
    'https://gofast-user-dashboard.vercel.app',
    'https://athlete.gofastcrushgoals.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// The 3 API calls
app.use('/api/athlete', athleteHydrateRouter);
app.use('/api/athlete', athleteProfileRouter);
app.use('/api/athlete', athleteCreateRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', version: '2.0.0' });
});

// Get all athletes
app.get('/api/athletes', async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const athletes = await prisma.athlete.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, count: athletes.length, athletes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Database setup endpoint
app.post('/api/setup-database', async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const athletes = await prisma.athlete.findMany();
    res.json({
      success: true,
      message: 'Database already set up',
      athletesCount: athletes.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Athletes table does not exist',
      message: 'Run "npx prisma db push" to create tables'
    });
  }
});

// Emergency database push endpoint
app.post('/api/push-database', async (req, res) => {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss');
    
    res.json({
      success: true,
      message: 'Database schema pushed successfully',
      stdout: stdout,
      stderr: stderr
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Database push failed',
      message: error.message
    });
  }
});

// Root
app.get('/', (req, res) => {
  res.json({ 
    message: 'GoFast Backend V2',
    endpoints: {
      createAthlete: API_ROUTES.CREATE_ATHLETE.path,
      hydrateAthletes: API_ROUTES.HYDRATE_ATHLETES.path,
      updateProfile: API_ROUTES.UPDATE_PROFILE.path
    }
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 GoFast Backend V2 running on port ${PORT}`);
  await connectDatabase();
});

export default app;
