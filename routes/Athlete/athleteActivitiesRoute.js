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

