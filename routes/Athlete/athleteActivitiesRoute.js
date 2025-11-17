import express from 'express';
import { getPrismaClient } from '../../config/database.js';

const router = express.Router();

// GET /api/athlete/activities - Fetch ALL activities (all athletes)
router.get('/activities', async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { limit = 100, offset = 0, sortBy = 'startTime', sortOrder = 'desc' } = req.query;
    
    console.log('🔍 Fetching ALL activities:', { limit, offset, sortBy, sortOrder });
    
    // Fetch all activities with athlete relation
    const activities = await prisma.athleteActivity.findMany({
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: {
        [sortBy]: sortOrder
      },
      include: {
        athlete: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            gofastHandle: true
          }
        }
      }
    });
    
    // Get total count
    const totalCount = await prisma.athleteActivity.count();
    
    console.log(`✅ Found ${activities.length} activities (total: ${totalCount})`);
    
    res.json({
      success: true,
      activities: activities,
      count: activities.length,
      totalCount: totalCount,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
  } catch (error) {
    console.error('❌ Error fetching all activities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activities',
      message: error.message
    });
  }
});

// GET /api/athlete/:athleteId/activities/weekly - Fetch weekly activities (last 7 days) by athleteId
router.get('/:athleteId/activities/weekly', async (req, res) => {
  try {
    const { athleteId } = req.params;
    
    console.log('🔍 Fetching weekly activities for athleteId:', athleteId);
    
    // Verify athlete exists
    const prisma = getPrismaClient();
    const athlete = await prisma.athlete.findUnique({
      where: { id: athleteId },
      select: { id: true, firstName: true, lastName: true, email: true }
    });
    
    if (!athlete) {
      return res.status(404).json({
        success: false,
        error: 'Athlete not found',
        athleteId: athleteId
      });
    }
    
    // Calculate date range: last 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    console.log(`📅 Weekly range: ${sevenDaysAgo.toISOString()} to ${now.toISOString()}`);
    
    // Fetch ALL activities for this athlete from last 7 days (for reference)
    const allActivities = await prisma.athleteActivity.findMany({
      where: {
        athleteId: athleteId,
        startTime: {
          gte: sevenDaysAgo,
          lte: now
        }
      },
      orderBy: {
        startTime: 'desc'
      }
    });
    
    // Filter to only running activities (exclude wheelchair)
    const activities = allActivities.filter(activity => {
      if (!activity.activityType) return false;
      const type = activity.activityType.toLowerCase();
      // Include activities with "running" or "run" in the type, but exclude wheelchair
      return (type.includes('running') || type === 'run') && !type.includes('wheelchair');
    });
    
    console.log(`📊 Filtered ${activities.length} running activities from ${allActivities.length} total activities`);
    
    // Calculate weekly totals ONLY for runs
    const weeklyTotals = {
      totalDistance: 0,
      totalDuration: 0,
      totalCalories: 0,
      activityCount: activities.length
    };
    
    activities.forEach(activity => {
      if (activity.distance) weeklyTotals.totalDistance += activity.distance;
      if (activity.duration) weeklyTotals.totalDuration += activity.duration;
      if (activity.calories) weeklyTotals.totalCalories += activity.calories;
    });
    
    // Convert distance from meters to miles
    weeklyTotals.totalDistanceMiles = (weeklyTotals.totalDistance / 1609.34).toFixed(2);
    
    console.log(`✅ Found ${activities.length} running activities for athleteId ${athleteId} (last 7 days)`);
    console.log(`📊 Weekly run totals: ${weeklyTotals.totalDistanceMiles} miles, ${weeklyTotals.totalDuration}s, ${weeklyTotals.totalCalories} cal`);
    
    res.json({
      success: true,
      athleteId: athleteId,
      athlete: {
        id: athlete.id,
        firstName: athlete.firstName,
        lastName: athlete.lastName,
        email: athlete.email
      },
      activities: activities,
      weeklyTotals: weeklyTotals,
      dateRange: {
        start: sevenDaysAgo.toISOString(),
        end: now.toISOString()
      },
      count: activities.length
    });
    
  } catch (error) {
    console.error('❌ Error fetching weekly activities by athleteId:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch weekly activities',
      message: error.message
    });
  }
});

// GET /api/athlete/:athleteId/activities - Fetch activities by specific athleteId
router.get('/:athleteId/activities', async (req, res) => {
  try {
    const { athleteId } = req.params;
    const { limit = 100, offset = 0, sortBy = 'startTime', sortOrder = 'desc' } = req.query;
    
    console.log('🔍 Fetching activities for athleteId:', athleteId, { limit, offset, sortBy, sortOrder });
    
    // Verify athlete exists
    const prisma = getPrismaClient();
    const athlete = await prisma.athlete.findUnique({
      where: { id: athleteId },
      select: { id: true, firstName: true, lastName: true, email: true }
    });
    
    if (!athlete) {
      return res.status(404).json({
        success: false,
        error: 'Athlete not found',
        athleteId: athleteId
      });
    }
    
    // Fetch activities for this athlete
    const activities = await prisma.athleteActivity.findMany({
      where: {
        athleteId: athleteId
      },
      take: parseInt(limit),
      skip: parseInt(offset),
      orderBy: {
        [sortBy]: sortOrder
      }
    });
    
    // Get total count for this athlete
    const totalCount = await prisma.athleteActivity.count({
      where: {
        athleteId: athleteId
      }
    });
    
    console.log(`✅ Found ${activities.length} activities for athleteId ${athleteId} (total: ${totalCount})`);
    
    res.json({
      success: true,
      athleteId: athleteId,
      athlete: {
        id: athlete.id,
        firstName: athlete.firstName,
        lastName: athlete.lastName,
        email: athlete.email
      },
      activities: activities,
      count: activities.length,
      totalCount: totalCount,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
  } catch (error) {
    console.error('❌ Error fetching activities by athleteId:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activities',
      message: error.message
    });
  }
});

export default router;

