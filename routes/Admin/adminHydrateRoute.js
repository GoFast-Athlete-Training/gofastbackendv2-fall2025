// Admin Hydration Routes
// Universal admin hydration system - hydrates any entity type
// Pattern: Universal entry point → dispatches to entity-specific handlers

import express from 'express';
import { getPrismaClient } from '../../config/database.js';

const router = express.Router();

// Handle preflight OPTIONS requests for CORS
router.options('/hydrate', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.status(200).end();
});

/**
 * Entity-specific hydration handlers
 * These can be called directly or via universal route
 */

// Athletes hydration handler
async function hydrateAthletes(req, res) {
  try {
    // Set CORS headers explicitly
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    const prisma = getPrismaClient();
    console.log('🔄 ADMIN HYDRATE: Loading all athletes for admin dashboard (SQL/Prisma)...');
    
    // SQL equivalent of MongoDB find() with sort
    const athletes = await prisma.athlete.findMany({
      orderBy: { createdAt: 'desc' }
      // No include needed yet - single table for now
    });
    
    console.log('✅ ADMIN HYDRATE: Found', athletes.length, 'athletes');
    
    // Format for frontend consumption
    const hydratedAthletes = athletes.map(athlete => ({
      athleteId: athlete.id,
      firebaseId: athlete.firebaseId,
      email: athlete.email,
      firstName: athlete.firstName,
      lastName: athlete.lastName,
      gofastHandle: athlete.gofastHandle,
      birthday: athlete.birthday,
      gender: athlete.gender,
      city: athlete.city,
      state: athlete.state,
      primarySport: athlete.primarySport,
      photoURL: athlete.photoURL,
      bio: athlete.bio,
      instagram: athlete.instagram,
      status: athlete.status,
      createdAt: athlete.createdAt,
      updatedAt: athlete.updatedAt,
      
      // Garmin Integration Status (safe data only - no tokens)
      garmin: {
        connected: athlete.garmin_is_connected || false,
        connectedAt: athlete.garmin_connected_at || null,
        lastSyncAt: athlete.garmin_last_sync_at || null
      },
      
      // Computed fields for admin display
      fullName: athlete.firstName && athlete.lastName 
        ? `${athlete.firstName} ${athlete.lastName}` 
        : 'No Name Set',
      profileComplete: !!(athlete.firstName && athlete.lastName && athlete.city),
      daysSinceCreation: athlete.createdAt 
        ? Math.ceil((new Date() - new Date(athlete.createdAt)) / (1000 * 60 * 60 * 24))
        : 0
    }));
    
    res.json({
      success: true,
      message: `Hydrated ${hydratedAthletes.length} athletes`,
      count: hydratedAthletes.length,
      athletes: hydratedAthletes, // Admin dashboard expects 'athletes' field
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ ADMIN HYDRATE: Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to hydrate athletes',
      message: error.message
    });
  }
}

/**
 * UNIVERSAL HYDRATE ROUTE
 * GET /api/admin/hydrate?entity=athletes|activities|runcrews|founders
 * GET /api/athlete/admin/hydrate (legacy - defaults to athletes)
 * Universal entry point - dispatches to entity-specific handlers
 */
router.get('/hydrate', async (req, res) => {
  let { entity } = req.query;
  
  // Legacy route compatibility: /api/athlete/admin/hydrate defaults to athletes
  if (!entity && req.originalUrl?.includes('/api/athlete/admin/hydrate')) {
    entity = 'athletes';
    console.log('🔄 LEGACY HYDRATE: /api/athlete/admin/hydrate → defaulting to athletes');
  }
  
  if (!entity) {
    return res.status(400).json({
      success: false,
      error: 'Entity parameter required',
      message: 'Specify entity: ?entity=athletes|activities|runcrews|founders',
      availableEntities: ['athletes', 'activities', 'runcrews', 'founders']
    });
  }

  console.log(`🔄 UNIVERSAL HYDRATE: Requested entity: ${entity}`);

  // Dispatch to entity-specific handler
  switch (entity) {
    case 'athletes':
      return hydrateAthletes(req, res);
    case 'activities':
      return hydrateActivities(req, res);
    case 'runcrews':
      return hydrateRunCrews(req, res);
    case 'founders':
      return hydrateFounders(req, res);
    default:
      return res.status(400).json({
        success: false,
        error: 'Unknown entity',
        message: `Entity '${entity}' not supported`,
        availableEntities: ['athletes', 'activities', 'runcrews', 'founders']
      });
  }
});

/**
 * ENTITY-SPECIFIC ROUTES (for direct access)
 * These can be called directly without going through universal route
 */

// Athletes
router.get('/athletes/hydrate', hydrateAthletes);

// Activities hydration handler
async function hydrateActivities(req, res) {
  try {
    const prisma = getPrismaClient();
    console.log('🔄 ADMIN HYDRATE: Loading all activities for admin dashboard...');
    
    const { limit = 100, offset = 0, sortBy = 'startTime', sortOrder = 'desc' } = req.query;
    
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
    
    const totalCount = await prisma.athleteActivity.count();
    
    console.log(`✅ ADMIN HYDRATE: Found ${activities.length} activities (total: ${totalCount})`);
    
    res.json({
      success: true,
      message: `Hydrated ${activities.length} activities`,
      count: activities.length,
      totalCount: totalCount,
      activities: activities,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ ADMIN HYDRATE ACTIVITIES: Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to hydrate activities',
      message: error.message
    });
  }
}

router.get('/activities/hydrate', hydrateActivities);

// RunCrews hydration handler
async function hydrateRunCrews(req, res) {
  try {
    const prisma = getPrismaClient();
    console.log('🔄 ADMIN HYDRATE: Loading all RunCrews for admin dashboard...');
    
    const runCrews = await prisma.runCrew.findMany({
      include: {
        admin: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        memberships: {
          include: {
            athlete: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`✅ ADMIN HYDRATE: Found ${runCrews.length} RunCrews`);
    
    res.json({
      success: true,
      message: `Hydrated ${runCrews.length} RunCrews`,
      count: runCrews.length,
      runCrews: runCrews,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ ADMIN HYDRATE RUNCREWS: Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to hydrate RunCrews',
      message: error.message
    });
  }
}

router.get('/runcrews/hydrate', hydrateRunCrews);

// Founders hydration handler
async function hydrateFounders(req, res) {
  try {
    const prisma = getPrismaClient();
    console.log('🔄 ADMIN HYDRATE: Loading all Founders for admin dashboard...');
    
    const founders = await prisma.founder.findMany({
      include: {
        athlete: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        _count: {
          select: {
            tasks: true,
            crmContacts: true,
            roadmapItems: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`✅ ADMIN HYDRATE: Found ${founders.length} Founders`);
    
    res.json({
      success: true,
      message: `Hydrated ${founders.length} Founders`,
      count: founders.length,
      founders: founders,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ ADMIN HYDRATE FOUNDERS: Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to hydrate Founders',
      message: error.message
    });
  }
}

router.get('/founders/hydrate', hydrateFounders);

/**
 * GET /api/admin/athletes/:id/hydrate
 * Hydrate frontend with single athlete details (admin view)
 * Used by: Admin athlete details page
 * Pattern: Individual athlete hydration (SQL/Prisma version)
 */
router.get('/athletes/:id/hydrate', async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { id } = req.params;
    
    console.log('🔄 ADMIN HYDRATE: Loading athlete details for ID:', id, '(SQL/Prisma)');
    
    // SQL equivalent of MongoDB findOne()
    const athlete = await prisma.athlete.findUnique({
      where: { id }
      // No include needed yet - single table for now
    });
    
    if (!athlete) {
      console.log('❌ ADMIN HYDRATE: Athlete not found:', id);
      return res.status(404).json({
        success: false,
        error: 'Athlete not found',
        message: `No athlete found with ID: ${id}`
      });
    }
    
    console.log('✅ ADMIN HYDRATE: Athlete found:', athlete.email);
    
    // Format for frontend consumption with detailed info
    const hydratedAthlete = {
      athleteId: athlete.id,
      firebaseId: athlete.firebaseId,
      email: athlete.email,
      firstName: athlete.firstName,
      lastName: athlete.lastName,
      gofastHandle: athlete.gofastHandle,
      birthday: athlete.birthday,
      gender: athlete.gender,
      city: athlete.city,
      state: athlete.state,
      primarySport: athlete.primarySport,
      photoURL: athlete.photoURL,
      bio: athlete.bio,
      instagram: athlete.instagram,
      status: athlete.status,
      createdAt: athlete.createdAt,
      updatedAt: athlete.updatedAt,
      
      // Garmin Integration Status (admin can see tokens)
      garmin: {
        connected: athlete.garmin_is_connected || false,
        userId: athlete.garmin_user_id || null,
        connectedAt: athlete.garmin_connected_at || null,
        lastSyncAt: athlete.garmin_last_sync_at || null,
        scope: athlete.garmin_scope || null,
        hasTokens: !!(athlete.garmin_access_token && athlete.garmin_refresh_token),
        tokenStatus: athlete.garmin_access_token ? 'active' : 'none',
        // Include actual tokens for localStorage (admin only)
        accessToken: athlete.garmin_access_token || null,
        refreshToken: athlete.garmin_refresh_token || null,
        expiresIn: athlete.garmin_expires_in || null
      },
      
      // Computed fields for detailed view
      fullName: athlete.firstName && athlete.lastName 
        ? `${athlete.firstName} ${athlete.lastName}` 
        : 'No Name Set',
      profileComplete: !!(athlete.firstName && athlete.lastName && athlete.city),
      daysSinceCreation: athlete.createdAt 
        ? Math.ceil((new Date() - new Date(athlete.createdAt)) / (1000 * 60 * 60 * 24))
        : 0,
      age: athlete.birthday 
        ? Math.floor((new Date() - new Date(athlete.birthday)) / (1000 * 60 * 60 * 24 * 365))
        : null,
      location: athlete.city && athlete.state 
        ? `${athlete.city}, ${athlete.state}`
        : 'Location not set'
    };
    
    res.json({
      success: true,
      message: 'Athlete hydrated successfully',
      athlete: hydratedAthlete,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ ADMIN HYDRATE: Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to hydrate athlete',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/athletes/hydrate/summary
 * Get summary statistics for admin dashboard
 * Used by: Admin dashboard home screen
 * Pattern: Container query with aggregated data (SQL/Prisma version)
 */
router.get('/athletes/hydrate/summary', async (req, res) => {
  try {
    const prisma = getPrismaClient();
    console.log('🔄 ADMIN HYDRATE: Loading summary statistics (SQL/Prisma)...');
    
    // SQL equivalent of MongoDB count()
    const totalAthletes = await prisma.athlete.count();
    
    // SQL equivalent of MongoDB aggregate with $group
    const statusCounts = await prisma.athlete.groupBy({
      by: ['status'],
      _count: { status: true }
    });
    
    // SQL equivalent of MongoDB count with complex where
    const profileCompleteCount = await prisma.athlete.count({
      where: {
        AND: [
          { firstName: { not: null } },
          { lastName: { not: null } },
          { city: { not: null } }
        ]
      }
    });
    
    // Get recent signups (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentSignups = await prisma.athlete.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo
        }
      }
    });
    
    // Get athletes by primary sport
    const sportCounts = await prisma.athlete.groupBy({
      by: ['primarySport'],
      _count: { primarySport: true },
      where: {
        primarySport: { not: null }
      }
    });
    
    const summary = {
      totalAthletes,
      profileCompleteCount,
      profileIncompleteCount: totalAthletes - profileCompleteCount,
      recentSignups,
      statusBreakdown: statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {}),
      sportBreakdown: sportCounts.reduce((acc, item) => {
        acc[item.primarySport] = item._count.primarySport;
        return acc;
      }, {})
    };
    
    console.log('✅ ADMIN HYDRATE: Summary loaded:', summary);
    
    res.json({
      success: true,
      message: 'Athlete summary hydrated successfully',
      summary,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ ADMIN HYDRATE: Summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to hydrate athlete summary',
      message: error.message
    });
  }
});

export default router;

