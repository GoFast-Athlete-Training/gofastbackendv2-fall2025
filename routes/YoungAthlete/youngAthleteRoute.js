// Young Athlete Route
// Handles registration, goal setting, and hydration for young athletes

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

// CORS preflight handling
router.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Max-Age', '86400');
  res.status(200).end();
});

/**
 * POST /api/young-athlete/register
 * Create youth record tied to parent athlete
 * Body: { athleteId, eventCode, firstName, lastName, grade?, school?, profilePicUrl? }
 */
router.post('/register', verifyFirebaseToken, async (req, res) => {
  const prisma = getPrismaClient();
  const firebaseId = req.user?.uid;
  const { athleteId, eventCode, firstName, lastName, grade, school, profilePicUrl } = req.body;

  try {
    // Validation
    if (!athleteId || !eventCode || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'athleteId, eventCode, firstName, and lastName are required'
      });
    }

    // Verify athleteId belongs to authenticated Firebase user
    const athlete = await prisma.athlete.findFirst({
      where: {
        id: athleteId,
        firebaseId: firebaseId
      }
    });

    if (!athlete) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Athlete ID does not match authenticated user'
      });
    }

    // Create young athlete
    const youngAthlete = await prisma.youngAthlete.create({
      data: {
        athleteId,
        eventCode,
        firstName,
        lastName,
        grade: grade || null,
        school: school || null,
        profilePicUrl: profilePicUrl || null
      }
    });

    res.status(201).json({
      success: true,
      message: 'Young athlete registered successfully',
      data: youngAthlete
    });
  } catch (error) {
    console.error('❌ YOUNG ATHLETE REGISTER ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register young athlete',
      message: error.message
    });
  }
});

/**
 * POST /api/young-athlete/:id/goal
 * Upsert goal for young athlete
 * Body: { eventCode, targetPace?, targetDistance?, motivation?, feeling? }
 */
router.post('/:id/goal', verifyFirebaseToken, async (req, res) => {
  const prisma = getPrismaClient();
  const firebaseId = req.user?.uid;
  const { id } = req.params;
  const { eventCode, targetPace, targetDistance, motivation, feeling } = req.body;

  try {
    // Validation
    if (!eventCode) {
      return res.status(400).json({
        success: false,
        error: 'Missing eventCode'
      });
    }

    // Verify young athlete belongs to authenticated parent
    const youngAthlete = await prisma.youngAthlete.findUnique({
      where: { id },
      include: { athlete: true }
    });

    if (!youngAthlete) {
      return res.status(404).json({
        success: false,
        error: 'Young athlete not found'
      });
    }

    if (youngAthlete.athlete.firebaseId !== firebaseId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Young athlete does not belong to authenticated user'
      });
    }

    // Upsert goal (create or update)
    const goal = await prisma.eventGoal.upsert({
      where: {
        youngAthleteId_eventCode: {
          youngAthleteId: id,
          eventCode
        }
      },
      update: {
        targetPace: targetPace || null,
        targetDistance: targetDistance || null,
        motivation: motivation || null,
        feeling: feeling || null
      },
      create: {
        youngAthleteId: id,
        eventCode,
        targetPace: targetPace || null,
        targetDistance: targetDistance || null,
        motivation: motivation || null,
        feeling: feeling || null
      }
    });

    res.json({
      success: true,
      message: 'Goal saved successfully',
      data: goal
    });
  } catch (error) {
    console.error('❌ YOUNG ATHLETE GOAL ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save goal',
      message: error.message
    });
  }
});

/**
 * GET /api/young-athlete/:id
 * Hydrate youth profile with goals and results
 */
router.get('/:id', verifyFirebaseToken, async (req, res) => {
  const prisma = getPrismaClient();
  const firebaseId = req.user?.uid;

  try {
    const { id } = req.params;

    // Get young athlete with relations
    const youngAthlete = await prisma.youngAthlete.findUnique({
      where: { id },
      include: {
        athlete: true,
        goals: {
          orderBy: { createdAt: 'desc' }
        },
        results: {
          include: {
            activity: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!youngAthlete) {
      return res.status(404).json({
        success: false,
        error: 'Young athlete not found'
      });
    }

    // Verify belongs to authenticated parent
    if (youngAthlete.athlete.firebaseId !== firebaseId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Young athlete does not belong to authenticated user'
      });
    }

    res.json({
      success: true,
      data: youngAthlete
    });
  } catch (error) {
    console.error('❌ YOUNG ATHLETE HYDRATE ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to hydrate young athlete',
      message: error.message
    });
  }
});

export default router;

