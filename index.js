import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import database connection
import { connectDatabase, getPrismaClient } from './config/database.js';

// Import routes
import athleteProfileRouter from './routes/Athlete/athleteProfileRoute.js';
import athleteRouter from './routes/Athlete/athleteRoute.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    'https://gofastfrontend-demo.vercel.app',
    'https://gofastfrontend-mvp1.vercel.app',
    'https://gofast-user-dashboard.vercel.app',
    /^https:\/\/gofastfrontend-demo-.*\.vercel\.app$/,
    /^https:\/\/gofastfrontend-mvp1-.*\.vercel\.app$/,
    /^https:\/\/gofast-user-dashboard-.*\.vercel\.app$/,
    /^https:\/\/gofast-.*\.vercel\.app$/
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

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'GoFast Backend V2 API',
    version: '2.0.0',
    endpoints: {
      health: '/api/health',
      athletes: '/api/athletes',
      athleteCreate: '/api/athlete/create'
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
