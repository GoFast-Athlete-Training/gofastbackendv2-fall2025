import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDatabase, getPrismaClient } from './config/database.js';
import { API_ROUTES } from './config/apiConfig.js';

// Import the 4 routes
import athleteCreateRouter from './routes/Athlete/athleteCreateRoute.js';
import athletesallhydrateRouter from './routes/Athlete/athletesallhydrateRoute.js';
import athleteProfileRouter from './routes/Athlete/athleteProfileRoute.js';
import athletepersonhydrateRouter from './routes/Athlete/athletepersonhydrateRoute.js';
import athleteActivitiesRouter from './routes/Athlete/athleteActivitiesRoute.js';
// Import modular Garmin routes
import garminUrlGenRouter from './routes/Garmin/garminUrlGenRoute.js';
import garminCodeCatchRouter from './routes/Garmin/garminCodeCatchRoute.js';
import garminUserProfileRouter from './routes/Garmin/garminUserProfileRoute.js';
import garminActivityRouter from './routes/Garmin/garminActivityRoute.js';
import garminActivityDetailsRouter from './routes/Garmin/garminActivityDetailsRoute.js';
import garminPermissionsRouter from './routes/Garmin/garminPermissionsRoute.js';
import garminDeregistrationRouter from './routes/Garmin/garminDeregistrationRoute.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS - Allow all origins for debugging
app.use(cors({
  origin: true, // Allow all origins - more explicit than '*'
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
}));

app.use(express.json({ limit: '10mb' })); // Increased limit for Garmin activity details

// The 4 API calls - ORDER MATTERS!
app.use('/api/athlete', athletepersonhydrateRouter); // /athletepersonhydrate (FIRST - most specific)
app.use('/api/athlete', athleteActivitiesRouter); // /activities, /:athleteId/activities (BEFORE /:id routes)
app.use('/api/athlete', athletesallhydrateRouter); // /athletesallhydrate, /hydrate/summary, /:id/hydrate
app.use('/api/athlete', athleteProfileRouter); // /:id/profile
app.use('/api/athlete', athleteCreateRouter); // /create, /tokenretrieve, /:id, /find

// Modular Garmin OAuth routes - ORDER MATTERS!
app.use('/api/garmin', garminUrlGenRouter); // /auth-url (FIRST - most specific)
app.use('/api/garmin', garminCodeCatchRouter); // /callback
app.use('/api/garmin', garminUserProfileRouter); // /user
app.use('/api/garmin', garminActivityRouter); // /activity, /activities, /activity/sync
app.use('/api/garmin', garminActivityDetailsRouter); // /activity-details (dedicated file)
app.use('/api/garmin', garminPermissionsRouter); // /permissions, /webhook
app.use('/api/garmin', garminDeregistrationRouter); // /deregistration

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', version: '2.0.1' });
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


// Root
app.get('/', (req, res) => {
  res.json({ 
    message: 'GoFast Backend V2',
    endpoints: {
      athletepersonhydrate: '/api/athlete/athletepersonhydrate',
      athletesallhydrate: '/api/athlete/athletesallhydrate',
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
