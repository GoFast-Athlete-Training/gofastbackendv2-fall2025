// Event Result Route
// Handles claiming Garmin activities as race results and leaderboard

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

// CORS preflight handling
router.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Max-Age', '86400');
  res.status(200).end();
});

/**
 * POST /api/event-result/claim
 * Claim Garmin activity as race result
 * Body: { eventCode, youngAthleteId, authorAthleteId, activityId }
 */
router.post('/claim', verifyFirebaseToken, async (req, res) => {
  const prisma = getPrismaClient();
  const firebaseId = req.user?.uid;
  const { eventCode, youngAthleteId, authorAthleteId, activityId } = req.body;

  try {
    // Validation
    if (!eventCode || !youngAthleteId || !authorAthleteId || !activityId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'eventCode, youngAthleteId, authorAthleteId, and activityId are required'
      });
    }

    // Verify authorAthleteId belongs to authenticated Firebase user
    const athlete = await prisma.athlete.findFirst({
      where: {
        id: authorAthleteId,
        firebaseId: firebaseId
      }
    });

    if (!athlete) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Author athlete ID does not match authenticated user'
      });
    }

    // Verify young athlete belongs to parent
    const youngAthlete = await prisma.youngAthlete.findUnique({
      where: { id: youngAthleteId },
      include: { athlete: true }
    });

    if (!youngAthlete) {
      return res.status(404).json({
        success: false,
        error: 'Young athlete not found'
      });
    }

    if (youngAthlete.athleteId !== authorAthleteId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Young athlete does not belong to author athlete'
      });
    }

    // Verify activity exists and belongs to author athlete
    const activity = await prisma.athleteActivity.findUnique({
      where: { id: activityId }
    });

    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }

    if (activity.athleteId !== authorAthleteId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Activity does not belong to author athlete'
      });
    }

    // Upsert event result (one result per young athlete per event)
    const eventResult = await prisma.eventResult.upsert({
      where: {
        youngAthleteId_eventCode: {
          youngAthleteId,
          eventCode
        }
      },
      update: {
        activityId,
        authorAthleteId
      },
      create: {
        eventCode,
        youngAthleteId,
        authorAthleteId,
        activityId
      },
      include: {
        youngAthlete: true,
        activity: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Race result claimed successfully',
      data: eventResult
    });
  } catch (error) {
    console.error('❌ EVENT RESULT CLAIM ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to claim race result',
      message: error.message
    });
  }
});

/**
 * GET /api/events/:eventCode/leaderboard
 * Get leaderboard for event (public - no auth required)
 * Returns all EventResults with Garmin data and goals
 */
router.get('/:eventCode/leaderboard', async (req, res) => {
  const prisma = getPrismaClient();
  const { eventCode } = req.params;

  try {
    const results = await prisma.eventResult.findMany({
      where: { eventCode },
      include: {
        youngAthlete: {
          include: {
            goals: {
              where: { eventCode }
            },
            athlete: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                displayName: true
              }
            }
          }
        },
        activity: {
          select: {
            id: true,
            activityName: true,
            startTime: true,
            duration: true,
            distance: true,
            averageSpeed: true,
            averageHeartRate: true,
            maxHeartRate: true,
            elevationGain: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    console.error('❌ LEADERBOARD ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard',
      message: error.message
    });
  }
});

export default router;

