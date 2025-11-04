import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { connectDatabase, getPrismaClient } from './config/database.js';
import { API_ROUTES } from './config/apiConfig.js';
import { initializeSocket } from './src/socket.js';
import messagesRouter from './src/routes/messagesRoute.js';

// Import Athlete routes
import athleteCreateRouter from './routes/Athlete/athleteCreateRoute.js';
import athletesallhydrateRouter from './routes/Athlete/athletesallhydrateRoute.js';
import athleteProfileRouter from './routes/Athlete/athleteProfileRoute.js';
import athletepersonhydrateRouter from './routes/Athlete/athletepersonhydrateRoute.js';
import athleteActivitiesRouter from './routes/Athlete/athleteActivitiesRoute.js';
import athleteUpdateRouter from './routes/Athlete/athleteUpdateRoute.js';
// Import modular Garmin routes
import garminUrlGenRouter from './routes/Garmin/garminUrlGenRoute.js';
import garminCodeCatchRouter from './routes/Garmin/garminCodeCatchRoute.js';
import garminUserProfileRouter from './routes/Garmin/garminUserProfileRoute.js';
import garminActivityRouter from './routes/Garmin/garminActivityRoute.js';
import garminActivityDetailsRouter from './routes/Garmin/garminActivityDetailsRoute.js';
import garminPermissionsRouter from './routes/Garmin/garminPermissionsRoute.js';
import garminDeregistrationRouter from './routes/Garmin/garminDeregistrationRoute.js';
// Import Strava routes
import stravaUrlRoute from './routes/Strava/stravaUrlRoute.js';
import stravaCallbackRoute from './routes/Strava/stravaCallbackRoute.js';
import stravaTokenRoute from './routes/Strava/stravaTokenRoute.js';
import stravaAthleteRoute from './routes/Strava/stravaAthleteRoute.js';
// RunCrew routes
import runCrewCreateRouter from './routes/RunCrew/runCrewCreateRoute.js';
import runCrewJoinRouter from './routes/RunCrew/runCrewJoinRoute.js';
import runCrewHydrateRouter from './routes/RunCrew/runCrewHydrateRoute.js';
// Training routes
import trainingRaceRouter from './routes/Training/trainingRaceRoute.js';
import trainingPlanRouter from './routes/Training/trainingPlanRoute.js';
import trainingDayRouter from './routes/Training/trainingDayRoute.js';
// Founder routes
import founderTaskRouter from './routes/Founder/founderTaskRoute.js';
import founderCrmRouter from './routes/Founder/founderCrmRoute.js';
import founderProductRouter from './routes/Founder/founderProductRoute.js';
import founderUpsertRouter from './routes/Founder/founderUpsertRoute.js';
import founderHydrateRouter from './routes/Founder/founderHydrateRoute.js';
// Admin routes
import adminHydrateRouter from './routes/Admin/adminHydrateRoute.js';
import adminUpsertRouter from './routes/Admin/adminUpsertRoute.js';
// Company routes
import companyRoadmapRouter from './routes/Company/companyRoadmapRoute.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// --- Profile Picture Upload Setup ---
// Make sure the persistent upload directory exists
const uploadDir = '/data/uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer for storing files on Render's persistent disk
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });
// --- End Upload Setup ---

// CORS - Allow all origins for debugging
app.use(cors({
  origin: true, // Allow all origins - more explicit than '*'
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
}));

app.use(express.json({ limit: '10mb' })); // Increased limit for Garmin activity details
// Serve uploaded files statically
app.use('/uploads', express.static(uploadDir));                                                                        

// Athlete routes - ORDER MATTERS!
app.use('/api/athlete', athletepersonhydrateRouter); // /athletepersonhydrate (FIRST - most specific)
app.use('/api/athlete', athleteActivitiesRouter); // /activities, /:athleteId/activities (BEFORE /:id routes)
app.use('/api/athlete', athletesallhydrateRouter); // /athletesallhydrate (legacy)
app.use('/api/athlete', athleteProfileRouter); // /:id/profile
app.use('/api/athlete', athleteUpdateRouter); // /config, /status/:athleteId, /update/:athleteId, /bulk-update/:athleteId
app.use('/api/athlete', athleteCreateRouter); // /create, /tokenretrieve, /:id, /find (LAST - catch-all /:id)

// Modular Garmin OAuth routes - ORDER MATTERS!
app.use('/api/garmin', garminUrlGenRouter); // /auth-url (FIRST - most specific)
app.use('/api/garmin', garminCodeCatchRouter); // /callback
app.use('/api/garmin', garminUserProfileRouter); // /user
app.use('/api/garmin', garminActivityRouter); // /activity, /activities, /activity/sync
app.use('/api/garmin', garminActivityDetailsRouter); // /activity-details (dedicated file)
app.use('/api/garmin', garminPermissionsRouter); // /permissions, /webhook
app.use('/api/garmin', garminDeregistrationRouter); // /deregistration
// Strava routes
app.use('/api/strava', stravaUrlRoute); // /auth
app.use('/api/strava', stravaCallbackRoute); // /callback
app.use('/api/strava', stravaTokenRoute); // /token
app.use('/api/strava', stravaAthleteRoute); // /activities
// RunCrew routes
app.use('/api/runcrew', runCrewCreateRouter); // /create
app.use('/api/runcrew', runCrewJoinRouter); // /join
app.use('/api/runcrew', runCrewHydrateRouter); // /mine, /:id (more specific /mine must come before /:id)
// Training routes
app.use('/api/training/race', trainingRaceRouter); // /create, /all, /:raceId
app.use('/api/training/plan', trainingPlanRouter); // /race/:raceId, /active, /:planId, /:planId/status
app.use('/api/training/day', trainingDayRouter); // /today, /date/:date, /week/:weekIndex, /:trainingDayId/feedback
// Founder routes
app.use('/api/founder', founderHydrateRouter); // /hydrate (FIRST - most specific)
app.use('/api/founder', founderTaskRouter); // /tasks, /tasks/:taskId
app.use('/api/founder', founderCrmRouter); // /crm, /crm/pipelines, /crm/:contactId
app.use('/api/founder', founderProductRouter); // /product, /gtm, /personal, /roadmap, /roadmap/:itemId
app.use('/api/founder', founderUpsertRouter); // /upsert
// Admin routes
app.use('/api/admin', adminHydrateRouter); // /athletes/hydrate, /athletes/:id/hydrate, /athletes/hydrate/summary
app.use('/api/admin', adminUpsertRouter); // /upsert?model=founder, /upsert/founder
// Legacy admin route compatibility - /api/athlete/admin/hydrate
app.use('/api/athlete/admin', adminHydrateRouter); // /hydrate (redirects to /api/admin/athletes/hydrate)
// Company routes
app.use('/api/company', companyRoadmapRouter); // /:companyId/roadmap, /roadmap/:itemId
// Messages routes (Group Wall Messaging)
app.use('/api/messages', messagesRouter); // /:groupId (GET), / (POST)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', version: '2.0.1' });
});

// POST /api/upload – handles profile picture upload
app.post('/api/upload', upload.single('profilePic'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
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

// Create HTTP server (required for Socket.io)
const httpServer = createServer(app);

// Initialize Socket.io
const io = initializeSocket(httpServer);
console.log('✅ Socket.io initialized');

// Start server
httpServer.listen(PORT, async () => {
  console.log(`🚀 GoFast Backend V2 running on port ${PORT}`);
  console.log(`📡 Socket.io server ready for WebSocket connections`);
  await connectDatabase();
});

// Export for potential use elsewhere
export { io };
export default app;
