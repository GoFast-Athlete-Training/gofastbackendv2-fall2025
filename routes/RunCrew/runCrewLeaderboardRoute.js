// RunCrew Leaderboard Route
// GET /api/runcrew/:runCrewId/leaderboard
// Returns leaderboard data for a RunCrew with proper calculations

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';
import { getCurrentWeek, getPreviousWeek } from '../../utils/weekUtils.js';

const router = express.Router();

/**
 * Get RunCrew Leaderboard
 * GET /api/runcrew/:runCrewId/leaderboard
 * Query params:
 *   - metric: 'miles' | 'runs' | 'calories' (default: 'miles')
 *   - week: 'current' | 'previous' (default: 'current') - which week to show
 * 
 * Returns:
 *   - Array of leaderboard entries with:
 *     - athlete: { id, firstName, lastName, photoURL }
 *     - totalMiles: number (running activities only)
 *     - totalRuns: number (running activities only)
 *     - totalCalories: number (running activities only)
 *     - latestRunAt: Date | null
 *     - Sorted by selected metric (descending)
 * 
 * Note: 
 *   - Only includes running activities (excludes bikes, wheelchair, etc.)
 *   - Uses Monday-Sunday week boundaries (not rolling 7 days)
 */
router.get('/:runCrewId/leaderboard', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { runCrewId } = req.params;
    const { metric = 'miles', week = 'current' } = req.query;
    const firebaseId = req.user?.uid;

    // Validate metric
    const validMetrics = ['miles', 'runs', 'calories'];
    if (!validMetrics.includes(metric)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid metric',
        message: `Metric must be one of: ${validMetrics.join(', ')}`
      });
    }

    // Validate week parameter
    const validWeeks = ['current', 'previous'];
    if (!validWeeks.includes(week)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid week',
        message: `Week must be one of: ${validWeeks.join(', ')}`
      });
    }

    // Verify athlete exists
    const athlete = await prisma.athlete.findFirst({
      where: { firebaseId }
    });

    if (!athlete) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Athlete not found'
      });
    }

    // Find RunCrew and verify membership
    const runCrew = await prisma.runCrew.findUnique({
      where: { id: runCrewId },
      include: {
        memberships: {
          select: { athleteId: true }
        }
      }
    });

    if (!runCrew) {
      return res.status(404).json({
        success: false,
        error: 'RunCrew not found'
      });
    }

    // Check if athlete is a member
    const isMember = runCrew.memberships.some(
      membership => membership.athleteId === athlete.id
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You must be a member of this crew to view the leaderboard'
      });
    }

    // Calculate week boundaries (Monday-Sunday)
    const weekRange = week === 'previous' 
      ? getPreviousWeek()
      : getCurrentWeek();
    
    const windowStart = weekRange.start;
    const windowEnd = weekRange.end;

    // Get all memberships with their activities
    // MVP1: Filter for running activities only (exclude wheelchair, bikes, etc.)
    const memberships = await prisma.runCrewMembership.findMany({
      where: { runCrewId },
      include: {
        athlete: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoURL: true,
            activities: {
              where: {
                startTime: {
                  gte: windowStart,
                  lte: windowEnd
                },
                // MVP1: Only include running activities (exclude wheelchair)
                AND: [
                  {
                    OR: [
                      { activityType: { equals: 'running', mode: 'insensitive' } },
                      { activityType: { equals: 'run', mode: 'insensitive' } }
                    ]
                  },
                  {
                    NOT: {
                      activityType: { contains: 'wheelchair', mode: 'insensitive' }
                    }
                  }
                ]
              },
              select: {
                activityType: true,
                distance: true,
                duration: true,
                calories: true,
                startTime: true
              },
              orderBy: {
                startTime: 'desc'
              }
            }
          }
        }
      }
    });

    // Calculate leaderboard entries
    const leaderboardEntries = memberships.map((membership) => {
      const allActivities = membership.athlete?.activities || [];
      
      // Safety net: Filter to only running activities (in case query filter missed something)
      const activities = allActivities.filter(activity => {
        if (!activity.activityType) return false;
        const type = activity.activityType.toLowerCase();
        // Include activities with "running" or "run" in the type, but exclude wheelchair
        return (type.includes('running') || type === 'run') && !type.includes('wheelchair');
      });
      
      const totals = activities.reduce(
        (acc, activity) => {
          const distance = activity.distance || 0; // meters
          const calories = activity.calories || 0;

          return {
            distance: acc.distance + distance,
            calories: acc.calories + calories,
            count: acc.count + 1
          };
        },
        { distance: 0, calories: 0, count: 0 }
      );

      const totalMiles = totals.distance / 1609.34; // Convert meters to miles
      const latestRunAt = activities.length > 0 
        ? activities[0].startTime 
        : null;

      return {
        athlete: {
          id: membership.athlete.id,
          firstName: membership.athlete.firstName,
          lastName: membership.athlete.lastName,
          photoURL: membership.athlete.photoURL
        },
        totalMiles: parseFloat(totalMiles.toFixed(2)),
        totalRuns: totals.count,
        totalCalories: totals.calories,
        latestRunAt
      };
    });

    // Sort by selected metric (descending)
    const sortedEntries = leaderboardEntries.sort((a, b) => {
      if (metric === 'runs') {
        return b.totalRuns - a.totalRuns;
      } else if (metric === 'calories') {
        return b.totalCalories - a.totalCalories;
      } else {
        // Default: miles
        return b.totalMiles - a.totalMiles;
      }
    });

    res.json({
      success: true,
      leaderboard: sortedEntries,
      metric,
      week: weekRange.label,
      weekStart: windowStart.toISOString(),
      weekEnd: windowEnd.toISOString()
    });
  } catch (error) {
    console.error('❌ RUNCREW LEADERBOARD ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard',
      message: error.message
    });
  }
});

export default router;

