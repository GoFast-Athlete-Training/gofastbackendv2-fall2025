// GoFast Athlete Hydration Routes
// Pattern: Query container athlete + hydrate frontend

import express from 'express';
import { getPrismaClient } from '../../config/database.js';

const router = express.Router();

// Handle preflight OPTIONS requests for CORS
router.options('/admin/hydrate', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.status(200).end();
});

/**
 * GET /api/athlete/hydrate
 * Hydrate frontend with all athletes (admin view)
 * Pattern: Query container athlete (SQL/Prisma version)
 */
router.get('/admin/hydrate', async (req, res) => {
  try {
    // Set CORS headers explicitly
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    const prisma = getPrismaClient();
    console.log('🔄 ATHLETE HYDRATE: Loading all athletes for admin (SQL/Prisma) - DEPLOY TEST...');
    
    // SQL equivalent of MongoDB find() with sort
    const athletes = await prisma.athlete.findMany({
      orderBy: { createdAt: 'desc' }
      // No include needed yet - single table for now
    });
    
    console.log('✅ ATHLETE HYDRATE: Found', athletes.length, 'athletes');
    
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
      
      // Garmin Integration Status
      garmin: {
        connected: athlete.garmin_is_connected || false,
        userId: athlete.garmin_user_id || null,
        connectedAt: athlete.garmin_connected_at || null,
        lastSyncAt: athlete.garmin_last_sync_at || null,
        scope: athlete.garmin_scope || null,
        hasTokens: !!(athlete.garmin_access_token && athlete.garmin_refresh_token),
        tokenStatus: athlete.garmin_access_token ? 'active' : 'none'
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
      athletes: hydratedAthletes,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ ATHLETE HYDRATE: Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to hydrate athletes',
      message: error.message
    });
  }
});

/**
 * GET /api/athlete/:id/hydrate
 * Hydrate frontend with single athlete details
 * Pattern: Individual athlete hydration (SQL/Prisma version)
 */
router.get('/:id/hydrate', async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { id } = req.params;
    
    console.log('🔄 ATHLETE HYDRATE: Loading athlete details for ID:', id, '(SQL/Prisma)');
    
    // SQL equivalent of MongoDB findOne()
    const athlete = await prisma.athlete.findUnique({
      where: { id }
      // No include needed yet - single table for now
    });
    
    if (!athlete) {
      console.log('❌ ATHLETE HYDRATE: Athlete not found:', id);
      return res.status(404).json({
        success: false,
        error: 'Athlete not found',
        message: `No athlete found with ID: ${id}`
      });
    }
    
    console.log('✅ ATHLETE HYDRATE: Athlete found:', athlete.email);
    
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
      
      // Garmin Integration Status
      garmin: {
        connected: athlete.garmin_is_connected || false,
        userId: athlete.garmin_user_id || null,
        connectedAt: athlete.garmin_connected_at || null,
        lastSyncAt: athlete.garmin_last_sync_at || null,
        scope: athlete.garmin_scope || null,
        hasTokens: !!(athlete.garmin_access_token && athlete.garmin_refresh_token),
        tokenStatus: athlete.garmin_access_token ? 'active' : 'none'
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
    console.error('❌ ATHLETE HYDRATE: Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to hydrate athlete',
      message: error.message
    });
  }
});

/**
 * GET /api/athlete/hydrate/summary
 * Get summary statistics for admin dashboard
 * Pattern: Container query with aggregated data (SQL/Prisma version)
 */
router.get('/hydrate/summary', async (req, res) => {
  try {
    const prisma = getPrismaClient();
    console.log('🔄 ATHLETE HYDRATE: Loading summary statistics (SQL/Prisma)...');
    
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
    
    console.log('✅ ATHLETE HYDRATE: Summary loaded:', summary);
    
    res.json({
      success: true,
      message: 'Athlete summary hydrated successfully',
      summary,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ ATHLETE HYDRATE: Summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to hydrate athlete summary',
      message: error.message
    });
  }
});

export default router;
