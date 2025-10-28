import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDatabase, getPrismaClient } from './config/database.js';
import { API_ROUTES } from './config/apiConfig.js';

// Import the 4 routes
import athleteCreateRouter from './routes/Athlete/athleteCreateRoute.js';
import athleteHydrateRouter from './routes/Athlete/athleteHydrateRoute.js';
import athleteProfileRouter from './routes/Athlete/athleteProfileRoute.js';
import athleteUniversalHydrateRouter from './routes/Athlete/athleteUniversalHydrateRoute.js';
import tokenRetrieveRouter from './routes/Athlete/tokenRetrieveRoute.js';
// Import modular Garmin routes
import garminAuthRouter from './routes/Garmin/garminAuthRoute.js';
import garminActivityRouter from './routes/Garmin/garminActivityRoute.js';
import garminPermissionsRouter from './routes/Garmin/garminPermissionsRoute.js';
import garminUserRouter from './routes/Garmin/garminUserRoute.js';

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

app.use(express.json());

// The 4 API calls - ORDER MATTERS!
app.use('/api/athlete', athleteUniversalHydrateRouter); // /retrieve (FIRST - most specific)
app.use('/api/athlete', athleteHydrateRouter); // /admin/hydrate, /hydrate/summary, /:id/hydrate
app.use('/api/athlete', athleteProfileRouter); // /:id/profile
app.use('/api/athlete', athleteCreateRouter); // /create, /, /:id, /find
app.use('/api/athlete', tokenRetrieveRouter); // /tokenretrieve

// Modular Garmin OAuth routes
app.use('/api/garmin', garminAuthRouter); // /auth, /callback, /refresh
app.use('/api/garmin', garminActivityRouter); // /activity, /activities, /activity/sync
app.use('/api/garmin', garminPermissionsRouter); // /permissions, /deregister, /webhook
app.use('/api/garmin', garminUserRouter); // /user, /user/connect

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
      universalHydrate: '/api/athlete/retrieve',
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
