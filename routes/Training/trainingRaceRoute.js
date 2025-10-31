// Training Race Route
// Manages race goals and race-related data

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

/**
 * Create a new training race
 * POST /api/training/race/create
 * Body: { athleteId, raceName, raceType, raceDate, goalTime, goalPace, baseline5k, baselineWeeklyMileage, distanceMiles, location }
 */
router.post('/create', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const {
      athleteId,
      raceName,
      raceType,
      raceDate,
      goalTime,
      goalPace,
      baseline5k,
      baselineWeeklyMileage,
      distanceMiles,
      location
    } = req.body;
    const firebaseId = req.user?.uid;

    console.log('🏁 TRAINING RACE CREATE: Creating race:', raceName);

    // Validation
    if (!athleteId || !raceName || !raceType || !raceDate || !goalTime || !baseline5k || !distanceMiles) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['athleteId', 'raceName', 'raceType', 'raceDate', 'goalTime', 'baseline5k', 'distanceMiles']
      });
    }

    // Verify athlete exists and matches Firebase user
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

    // Calculate weeks away
    const raceDateTime = new Date(raceDate);
    const now = new Date();
    const weeksAway = Math.ceil((raceDateTime - now) / (1000 * 60 * 60 * 24 * 7));

    // Create race
    const race = await prisma.trainingRace.create({
      data: {
        athleteId,
        raceName: raceName.trim(),
        raceType,
        raceDate: raceDateTime,
        goalTime,
        goalPace: goalPace || null,
        baseline5k,
        baselineWeeklyMileage: baselineWeeklyMileage || null,
        distanceMiles: parseFloat(distanceMiles),
        weeksAway: weeksAway > 0 ? weeksAway : null,
        location: location || null,
        status: 'planning'
      }
    });

    console.log('✅ TRAINING RACE CREATE: Race created:', race.id);

    res.json({
      success: true,
      race
    });
  } catch (error) {
    console.error('❌ TRAINING RACE CREATE error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create race',
      message: error.message
    });
  }
});

/**
 * Get all races for an athlete
 * GET /api/training/race/all?athleteId=xxx
 */
router.get('/all', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { athleteId } = req.query;
    const firebaseId = req.user?.uid;

    if (!athleteId) {
      return res.status(400).json({
        success: false,
        error: 'athleteId is required'
      });
    }

    // Verify athlete matches Firebase user
    const athlete = await prisma.athlete.findFirst({
      where: {
        id: athleteId,
        firebaseId: firebaseId
      }
    });

    if (!athlete) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // Get all races
    const races = await prisma.trainingRace.findMany({
      where: { athleteId },
      orderBy: { raceDate: 'asc' }
    });

    res.json({
      success: true,
      races
    });
  } catch (error) {
    console.error('❌ TRAINING RACE GET ALL error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch races'
    });
  }
});

/**
 * Get single race by ID
 * GET /api/training/race/:raceId
 */
router.get('/:raceId', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { raceId } = req.params;
    const firebaseId = req.user?.uid;

    const race = await prisma.trainingRace.findUnique({
      where: { id: raceId },
      include: {
        trainingPlans: {
          include: {
            trainingDays: true
          }
        }
      }
    });

    if (!race) {
      return res.status(404).json({
        success: false,
        error: 'Race not found'
      });
    }

    // Verify athlete matches Firebase user
    const athlete = await prisma.athlete.findFirst({
      where: {
        id: race.athleteId,
        firebaseId: firebaseId
      }
    });

    if (!athlete) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    res.json({
      success: true,
      race
    });
  } catch (error) {
    console.error('❌ TRAINING RACE GET error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch race'
    });
  }
});

/**
 * Update race
 * PUT /api/training/race/:raceId
 */
router.put('/:raceId', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { raceId } = req.params;
    const firebaseId = req.user?.uid;
    const updates = req.body;

    // Get existing race
    const race = await prisma.trainingRace.findUnique({
      where: { id: raceId }
    });

    if (!race) {
      return res.status(404).json({
        success: false,
        error: 'Race not found'
      });
    }

    // Verify athlete matches Firebase user
    const athlete = await prisma.athlete.findFirst({
      where: {
        id: race.athleteId,
        firebaseId: firebaseId
      }
    });

    if (!athlete) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // Recalculate weeks away if raceDate updated
    if (updates.raceDate) {
      const raceDateTime = new Date(updates.raceDate);
      const now = new Date();
      updates.weeksAway = Math.ceil((raceDateTime - now) / (1000 * 60 * 60 * 24 * 7));
    }

    // Update race
    const updatedRace = await prisma.trainingRace.update({
      where: { id: raceId },
      data: updates
    });

    res.json({
      success: true,
      race: updatedRace
    });
  } catch (error) {
    console.error('❌ TRAINING RACE UPDATE error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update race'
    });
  }
});

/**
 * Delete race
 * DELETE /api/training/race/:raceId
 */
router.delete('/:raceId', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { raceId } = req.params;
    const firebaseId = req.user?.uid;

    // Get existing race
    const race = await prisma.trainingRace.findUnique({
      where: { id: raceId }
    });

    if (!race) {
      return res.status(404).json({
        success: false,
        error: 'Race not found'
      });
    }

    // Verify athlete matches Firebase user
    const athlete = await prisma.athlete.findFirst({
      where: {
        id: race.athleteId,
        firebaseId: firebaseId
      }
    });

    if (!athlete) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // Delete race (cascade will delete related plans and days)
    await prisma.trainingRace.delete({
      where: { id: raceId }
    });

    res.json({
      success: true,
      message: 'Race deleted successfully'
    });
  } catch (error) {
    console.error('❌ TRAINING RACE DELETE error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete race'
    });
  }
});

export default router;


