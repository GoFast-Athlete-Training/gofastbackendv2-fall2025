// Training Plan Route
// Manages training plans for races

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

/**
 * Get training plans for a race
 * GET /api/training/plan/race/:raceId
 */
router.get('/race/:raceId', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { raceId } = req.params;
    const firebaseId = req.user?.uid;

    // Get race to verify ownership
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

    // Get all plans for this race
    const plans = await prisma.trainingPlan.findMany({
      where: { raceId },
      include: {
        trainingDays: {
          orderBy: { date: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      plans
    });
  } catch (error) {
    console.error('❌ TRAINING PLAN GET error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch training plans'
    });
  }
});

/**
 * Get active training plan for athlete
 * GET /api/training/plan/active?athleteId=xxx
 */
router.get('/active', verifyFirebaseToken, async (req, res) => {
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

    // Get active plan
    const plan = await prisma.trainingPlan.findFirst({
      where: {
        athleteId,
        status: 'active'
      },
      include: {
        race: true,
        trainingDays: {
          orderBy: { date: 'asc' }
        }
      }
    });

    if (!plan) {
      return res.json({
        success: true,
        plan: null,
        message: 'No active training plan found'
      });
    }

    res.json({
      success: true,
      plan
    });
  } catch (error) {
    console.error('❌ TRAINING PLAN ACTIVE error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active plan'
    });
  }
});

/**
 * Get single plan by ID
 * GET /api/training/plan/:planId
 */
router.get('/:planId', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { planId } = req.params;
    const firebaseId = req.user?.uid;

    const plan = await prisma.trainingPlan.findUnique({
      where: { id: planId },
      include: {
        race: true,
        trainingDays: {
          orderBy: { date: 'asc' }
        }
      }
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Training plan not found'
      });
    }

    // Verify athlete matches Firebase user
    const athlete = await prisma.athlete.findFirst({
      where: {
        id: plan.athleteId,
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
      plan
    });
  } catch (error) {
    console.error('❌ TRAINING PLAN GET error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch training plan'
    });
  }
});

/**
 * Update plan status (activate, complete, archive)
 * PUT /api/training/plan/:planId/status
 * Body: { status: 'active' | 'completed' | 'archived' }
 */
router.put('/:planId/status', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { planId } = req.params;
    const { status } = req.body;
    const firebaseId = req.user?.uid;

    if (!status || !['active', 'completed', 'archived'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    // Get existing plan
    const plan = await prisma.trainingPlan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Training plan not found'
      });
    }

    // Verify athlete matches Firebase user
    const athlete = await prisma.athlete.findFirst({
      where: {
        id: plan.athleteId,
        firebaseId: firebaseId
      }
    });

    if (!athlete) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // If activating a plan, deactivate all other plans for this athlete
    if (status === 'active') {
      await prisma.trainingPlan.updateMany({
        where: {
          athleteId: plan.athleteId,
          status: 'active'
        },
        data: {
          status: 'archived'
        }
      });
    }

    // Update plan
    const updatedPlan = await prisma.trainingPlan.update({
      where: { id: planId },
      data: { status }
    });

    res.json({
      success: true,
      plan: updatedPlan
    });
  } catch (error) {
    console.error('❌ TRAINING PLAN STATUS UPDATE error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update plan status'
    });
  }
});

export default router;

