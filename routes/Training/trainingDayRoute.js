// Training Day Route
// Manages daily workout plans and actual workout data

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

/**
 * Get today's workout
 * GET /api/training/day/today?athleteId=xxx
 */
router.get('/today', verifyFirebaseToken, async (req, res) => {
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

    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's workout
    const workout = await prisma.trainingDay.findFirst({
      where: {
        athleteId,
        date: today
      },
      include: {
        race: true,
        trainingPlan: true,
        sessions: {
          orderBy: { startTime: 'desc' }
        }
      }
    });

    if (!workout) {
      return res.json({
        success: true,
        workout: null,
        message: 'No workout scheduled for today'
      });
    }

    res.json({
      success: true,
      workout
    });
  } catch (error) {
    console.error('❌ TRAINING DAY TODAY error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch today\'s workout'
    });
  }
});

/**
 * Get workout for specific date
 * GET /api/training/day/date/:date?athleteId=xxx
 * Date format: YYYY-MM-DD
 */
router.get('/date/:date', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { date, athleteId } = req.params;
    const { athleteId: queryAthleteId } = req.query;
    const firebaseId = req.user?.uid;
    const finalAthleteId = athleteId || queryAthleteId;

    if (!finalAthleteId) {
      return res.status(400).json({
        success: false,
        error: 'athleteId is required'
      });
    }

    // Verify athlete matches Firebase user
    const athlete = await prisma.athlete.findFirst({
      where: {
        id: finalAthleteId,
        firebaseId: firebaseId
      }
    });

    if (!athlete) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // Parse date
    const workoutDate = new Date(date);
    workoutDate.setHours(0, 0, 0, 0);

    // Get workout for this date
    const workout = await prisma.trainingDay.findFirst({
      where: {
        athleteId: finalAthleteId,
        date: workoutDate
      },
      include: {
        race: true,
        trainingPlan: true,
        sessions: {
          orderBy: { startTime: 'desc' }
        }
      }
    });

    if (!workout) {
      return res.status(404).json({
        success: false,
        error: 'No workout found for this date'
      });
    }

    res.json({
      success: true,
      workout
    });
  } catch (error) {
    console.error('❌ TRAINING DAY BY DATE error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workout'
    });
  }
});

/**
 * Get all workouts for a week
 * GET /api/training/day/week/:weekIndex?athleteId=xxx&planId=xxx
 */
router.get('/week/:weekIndex', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { weekIndex } = req.params;
    const { athleteId, planId } = req.query;
    const firebaseId = req.user?.uid;

    if (!athleteId || !planId) {
      return res.status(400).json({
        success: false,
        error: 'athleteId and planId are required'
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

    // Get workouts for this week
    const workouts = await prisma.trainingDay.findMany({
      where: {
        athleteId,
        trainingPlanId: planId,
        weekIndex: parseInt(weekIndex)
      },
      orderBy: { dayIndex: 'asc' }
    });

    res.json({
      success: true,
      workouts
    });
  } catch (error) {
    console.error('❌ TRAINING DAY WEEK error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch week workouts'
    });
  }
});

/**
 * Submit feedback for a workout
 * POST /api/training/day/:trainingDayId/feedback
 * Body: { mood, effort, injuryFlag, notes }
 */
router.post('/:trainingDayId/feedback', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { trainingDayId } = req.params;
    const { mood, effort, injuryFlag, notes } = req.body;
    const firebaseId = req.user?.uid;

    // Get existing training day
    const trainingDay = await prisma.trainingDay.findUnique({
      where: { id: trainingDayId }
    });

    if (!trainingDay) {
      return res.status(404).json({
        success: false,
        error: 'Training day not found'
      });
    }

    // Verify athlete matches Firebase user
    const athlete = await prisma.athlete.findFirst({
      where: {
        id: trainingDay.athleteId,
        firebaseId: firebaseId
      }
    });

    if (!athlete) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // Update feedback
    const feedbackData = {
      mood: mood || null,
      effort: effort || null,
      injuryFlag: injuryFlag || false,
      notes: notes || null,
      submittedAt: new Date()
    };

    const updated = await prisma.trainingDay.update({
      where: { id: trainingDayId },
      data: {
        feedback: feedbackData
      }
    });

    res.json({
      success: true,
      workout: updated
    });
  } catch (error) {
    console.error('❌ TRAINING DAY FEEDBACK error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback'
    });
  }
});

/**
 * Update actual workout data (from Garmin sync)
 * PUT /api/training/day/:trainingDayId/actual
 * Body: { actualData: {...} }
 */
router.put('/:trainingDayId/actual', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { trainingDayId } = req.params;
    const { actualData } = req.body;
    const firebaseId = req.user?.uid;

    // Get existing training day
    const trainingDay = await prisma.trainingDay.findUnique({
      where: { id: trainingDayId }
    });

    if (!trainingDay) {
      return res.status(404).json({
        success: false,
        error: 'Training day not found'
      });
    }

    // Verify athlete matches Firebase user
    const athlete = await prisma.athlete.findFirst({
      where: {
        id: trainingDay.athleteId,
        firebaseId: firebaseId
      }
    });

    if (!athlete) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // Update actual data
    const updated = await prisma.trainingDay.update({
      where: { id: trainingDayId },
      data: {
        actualData
      }
    });

    res.json({
      success: true,
      workout: updated
    });
  } catch (error) {
    console.error('❌ TRAINING DAY ACTUAL UPDATE error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update actual data'
    });
  }
});

export default router;


