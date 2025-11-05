import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';
import { findAthleteByFirebaseId } from '../../services/firebaseidathletelookup.js';

const router = express.Router();

// GET /api/athlete/by-id - Get athlete by ID (no auth required for GarminConnectSuccess)
router.get('/by-id', async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { athleteId } = req.query;
    
    if (!athleteId) {
      return res.status(400).json({
        success: false,
        error: 'athleteId is required'
      });
    }
    
    console.log('🔍 BY-ID: Finding athlete by ID:', athleteId);
    
    // Find athlete by ID
    const athlete = await prisma.athlete.findUnique({
      where: { id: athleteId }
    });
    
    if (!athlete) {
      console.log('❌ BY-ID: No athlete found for ID:', athleteId);
      return res.status(404).json({
        success: false,
        error: 'Athlete not found'
      });
    }
    
    console.log('✅ BY-ID: Found athlete:', athlete.id, athlete.email);
    
    // Format for frontend consumption
    const hydratedAthlete = {
      id: athlete.id,
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
      
      // Garmin Integration Status - ENTIRE MODEL
      garmin: {
        // Connection Status
        connected: athlete.garmin_is_connected || false,
        userId: athlete.garmin_user_id || null,
        connectedAt: athlete.garmin_connected_at || null,
        lastSyncAt: athlete.garmin_last_sync_at || null,
        disconnectedAt: athlete.garmin_disconnected_at || null,
        
        // OAuth Tokens
        accessToken: athlete.garmin_access_token || null,
        refreshToken: athlete.garmin_refresh_token || null,
        expiresIn: athlete.garmin_expires_in || null,
        scope: athlete.garmin_scope || null,
        
        // Permissions & Profile Data
        permissions: athlete.garmin_permissions || null,
        userProfile: athlete.garmin_user_profile || null,
        userSleep: athlete.garmin_user_sleep || null,
        userPreferences: athlete.garmin_user_preferences || null,
        
        // Computed Fields
        hasTokens: !!(athlete.garmin_access_token && athlete.garmin_refresh_token),
        tokenStatus: athlete.garmin_access_token ? 'active' : 'none'
      }
    };
    
    res.json({
      success: true,
      athlete: hydratedAthlete
    });
    
  } catch (error) {
    console.error('❌ BY-ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Handle preflight OPTIONS requests for CORS
router.options('/hydrate', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

// Universal athlete hydration handler (shared logic)
async function hydrateAthlete(req, res) {
  // Set CORS headers explicitly
  res.header('Access-Control-Allow-Origin', '*');
  try {
    // Get firebaseId from verified token (set by middleware)
    const firebaseId = req.user?.uid;
    
    if (!firebaseId) {
      return res.status(401).json({
        success: false,
        error: 'Firebase authentication required',
        message: 'Unable to get Firebase ID from token'
      });
    }
    
    console.log('🚀 ATHLETE PERSON HYDRATE: Finding athlete by Firebase ID:', firebaseId);
    
    const prisma = getPrismaClient();
    
    // Find athlete with RunCrew memberships included
    let athlete = await prisma.athlete.findFirst({
      where: { firebaseId },
      include: {
        runCrewMemberships: {
          include: {
            runCrew: {
              include: {
                admin: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    photoURL: true
                  }
                },
                memberships: {
                  select: {
                    athleteId: true
                  }
                },
                _count: {
                  select: {
                    posts: true,
                    leaderboardEntries: true
                  }
                }
              }
            }
          },
          orderBy: {
            joinedAt: 'desc'
          }
        },
        adminRunCrews: {
          select: {
            id: true,
            name: true,
            description: true,
            joinCode: true,
            logo: true,
            icon: true,
            createdAt: true
          }
        }
      }
    });
    
    if (!athlete) {
      console.log('❌ ATHLETE PERSON HYDRATE: No athlete found for Firebase ID:', firebaseId);
      return res.status(404).json({
        success: false,
        error: 'Athlete not found',
        message: 'No athlete found for this Firebase ID.',
        code: 'ATHLETE_NOT_FOUND'
      });
    }
    
    console.log('✅ ATHLETE PERSON HYDRATE: Found athlete:', athlete.id, athlete.email);
    
    // Sync photoURL from Firebase if available and different
    const firebasePhotoURL = req.user?.picture;
    if (firebasePhotoURL && firebasePhotoURL !== athlete.photoURL) {
      console.log('🔄 ATHLETE PERSON HYDRATE: Updating photoURL from Firebase');
      athlete = await prisma.athlete.update({
        where: { id: athlete.id },
        data: { photoURL: firebasePhotoURL },
        include: {
          runCrewMemberships: {
            include: {
              runCrew: {
                include: {
                  admin: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      email: true,
                      photoURL: true
                    }
                  },
                  memberships: {
                    select: {
                      athleteId: true
                    }
                  },
                  _count: {
                    select: {
                      posts: true,
                      leaderboardEntries: true
                    }
                  }
                }
              }
            },
            orderBy: {
              joinedAt: 'desc'
            }
          },
          adminRunCrews: {
            select: {
              id: true,
              name: true,
              description: true,
              joinCode: true,
              logo: true,
              icon: true,
              createdAt: true
            }
          }
        }
      });
      console.log('✅ ATHLETE PERSON HYDRATE: photoURL updated from Firebase');
    }
    
    // Transform RunCrew memberships to include hydrated crew data
    const runCrews = athlete.runCrewMemberships.map(membership => ({
      ...membership.runCrew,
      memberCount: membership.runCrew.memberships.length,
      isAdmin: membership.runCrew.runcrewAdminId === athlete.id,
      joinedAt: membership.joinedAt,
      postCount: membership.runCrew._count.posts,
      leaderboardCount: membership.runCrew._count.leaderboardEntries
    }));
    
    // Format athlete data for frontend consumption
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
      
      // Garmin Integration Status (safe data only)
      garmin: {
        connected: athlete.garmin_is_connected || false,
        connectedAt: athlete.garmin_connected_at || null,
        lastSyncAt: athlete.garmin_last_sync_at || null
      },
      
      // RunCrew Memberships (hydrated)
      runCrews: runCrews,
      runCrewCount: runCrews.length,
      
      // Admin RunCrews (crews this athlete created)
      adminRunCrews: athlete.adminRunCrews || [],
      adminRunCrewCount: athlete.adminRunCrews?.length || 0,
      
      // Computed fields
      fullName: athlete.firstName && athlete.lastName 
        ? `${athlete.firstName} ${athlete.lastName}` 
        : 'No Name Set',
      profileComplete: !!(athlete.firstName && athlete.lastName),
      hasLocation: !!(athlete.city && athlete.state),
      hasSport: !!athlete.primarySport,
      hasBio: !!athlete.bio
    };
    
    console.log('🎯 ATHLETE PERSON HYDRATE: Returning hydrated athlete data');
    
    // Ensure CORS headers are set before sending response
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    res.json({
      success: true,
      message: 'Athlete hydrated successfully',
      athlete: hydratedAthlete,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ ATHLETE PERSON HYDRATE: Error:', error);
    res.status(500).json({
      success: false,
      error: 'Database error',
      message: error.message
    });
  }
}

// UNIVERSAL ATHLETE HYDRATE - Find athlete by Firebase ID (from verified token) and return full data
// This is the SINGLE universal endpoint - includes RunCrews, activities, everything
// Mirror of Ignite's /api/owner/hydrate pattern
// Uses Firebase middleware to verify token and get firebaseId from req.user.uid
router.get('/hydrate', verifyFirebaseToken, hydrateAthlete);

// Legacy route - kept for backward compatibility
router.get('/athletepersonhydrate', verifyFirebaseToken, hydrateAthlete);

export default router;
