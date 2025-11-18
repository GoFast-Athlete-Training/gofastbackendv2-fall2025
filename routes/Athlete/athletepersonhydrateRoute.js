import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';
import { findAthleteByFirebaseId } from '../../services/firebaseidathletelookup.js';
import { getCurrentWeek } from '../../utils/weekUtils.js';

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

// Handle preflight OPTIONS requests for CORS (handled by main CORS middleware)
router.options('/hydrate', (req, res) => {
  res.sendStatus(200);
});

// Universal athlete hydration handler (shared logic)
async function hydrateAthlete(req, res) {
  // CORS headers handled by main middleware
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
    
    // Find athlete with RunCrew memberships and manager roles included
    // ATHLETE-FIRST: Query athlete by firebaseId, then hydrate all relations via athleteId
    let athlete = await prisma.athlete.findFirst({
      where: { firebaseId }, // Find by Firebase ID (auth)
      include: {
        // ATHLETE-FIRST: RunCrew memberships relation - explicitly included
        runCrewMemberships: {
          include: {
            runCrew: {
              include: {
                managers: {
                  // QUERYABLE MODEL - Include ALL managers (admin and manager roles)
                  // Frontend needs full managers array to check admin status
                  include: {
                    athlete: {
                      select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        photoURL: true
                      }
                    }
                  }
                },
                memberships: {
                  select: {
                    athleteId: true
                  }
                },
                _count: {
                  select: {
                    messages: true
                  }
                }
              }
            }
          },
          orderBy: {
            joinedAt: 'desc'
          }
        },
        runCrewManagers: {
          include: {
            runCrew: {
              include: {
                managers: true,
                memberships: {
                  select: {
                    athleteId: true
                  }
                },
                _count: {
                  select: {
                    messages: true
                  }
                }
              }
            }
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
    
    // Get athleteId - ATHLETE-FIRST ARCHITECTURE: Everything flows from athleteId
    const athleteId = athlete.id;
    console.log('✅ ATHLETE PERSON HYDRATE: Found athlete - athleteId:', athleteId, 'email:', athlete.email);
    
    // Sync photoURL from Firebase if available and different
    const firebasePhotoURL = req.user?.picture;
    if (firebasePhotoURL && firebasePhotoURL !== athlete.photoURL) {
      console.log('🔄 ATHLETE PERSON HYDRATE: Updating photoURL from Firebase for athleteId:', athleteId);
      athlete = await prisma.athlete.update({
        where: { id: athleteId }, // ATHLETE-FIRST: Use athleteId
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
                  managers: {
                    // QUERYABLE MODEL - Include ALL managers (admin and manager roles)
                    // Frontend needs full managers array to check admin status
                    include: {
                      athlete: {
                        select: {
                          id: true,
                          firstName: true,
                          lastName: true,
                          email: true,
                          photoURL: true
                        }
                      }
                    }
                  },
                  memberships: {
                    select: {
                      athleteId: true
                    }
                  },
                  _count: {
                    select: {
                    messages: true
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
          },
          runCrewManagers: true
        }
      });
      console.log('✅ ATHLETE PERSON HYDRATE: photoURL updated from Firebase');
    }
    
    // Transform RunCrew memberships to include hydrated crew data
    // ATHLETE-FIRST: All RunCrew data flows from athleteId via junction table
    console.log('🔍 ATHLETE PERSON HYDRATE: Checking RunCrew memberships for athleteId:', athleteId);
    console.log('🔍 ATHLETE PERSON HYDRATE: Found', athlete.runCrewMemberships?.length || 0, 'memberships');
    
    if (!athlete.runCrewMemberships) {
      console.warn('⚠️ ATHLETE PERSON HYDRATE: runCrewMemberships is null/undefined - relation may not be working!');
    }
    
    const runCrews = (athlete.runCrewMemberships || []).map(membership => {
      if (!membership.runCrew) {
        console.warn('⚠️ ATHLETE PERSON HYDRATE: Membership found but runCrew relation is null:', membership.id);
        return null;
      }
      
      // QUERYABLE MODEL: Check RunCrewManager for admin status (not just runcrewAdminId field)
      const crewFromDB = membership.runCrew;
      const allManagers = crewFromDB.managers || [];
      
      // Transform managers to include athleteId and role directly (not nested in athlete relation)
      const managers = allManagers.map(m => ({
        id: m.id,
        athleteId: m.athleteId, // Direct field from RunCrewManager
        role: m.role, // Direct field from RunCrewManager
        athlete: m.athlete // Include athlete details for display
      }));
      
      // Check if current athlete is admin
      const isAdminFromManager = managers.some(m => m.athleteId === athleteId && m.role === 'admin');
      
      // Fallback: Check runcrewAdminId for backward compatibility
      const runcrewAdminId = crewFromDB.runcrewAdminId;
      const isAdminFromField = runcrewAdminId === athleteId;
      
      // Primary: Use RunCrewManager model (queryable!)
      const isAdmin = isAdminFromManager || isAdminFromField;
      
      console.log('🔍 ATHLETE PERSON HYDRATE: Admin check for crew (QUERYABLE MODEL):', {
        crewId: crewFromDB.id,
        crewName: crewFromDB.name,
        athleteId: athleteId,
        isAdminFromManager: isAdminFromManager,
        isAdminFromField: isAdminFromField,
        isAdmin: isAdmin,
        managers: managers.map(m => ({ athleteId: m.athleteId, role: m.role })),
        runcrewAdminId: runcrewAdminId
      });
      
      // If no admin found, log a warning
      if (!isAdmin && !runcrewAdminId && managers.length === 0) {
        console.warn('⚠️ ATHLETE PERSON HYDRATE: No admin found for crew:', crewFromDB.id, crewFromDB.name);
      }
      
      return {
        ...membership.runCrew,
        memberCount: membership.runCrew.memberships?.length || 0,
        isAdmin: isAdmin, // QUERYABLE MODEL: From RunCrewManager (queryable!) or runcrewAdminId fallback
        runcrewAdminId: runcrewAdminId, // Backward compatibility
        managers: managers, // QUERYABLE MODEL: Include ALL managers array with athleteId and role for frontend
        joinedAt: membership.joinedAt,
        messageCount: membership.runCrew._count?.messages || 0
      };
    }).filter(Boolean); // Remove null entries
    
    console.log('✅ ATHLETE PERSON HYDRATE: Successfully hydrated', runCrews.length, 'RunCrews');
    
    // HYDRATION V2: Flatten all crews with role/managerId for clean frontend context
    const allCrews = [
      // Manager/Admin crews (from runCrewManagers)
      ...(athlete.runCrewManagers || []).map(m => ({
        runCrewId: m.runCrewId,
        role: m.role,
        managerId: m.id,
        runCrew: m.runCrew || null
      })),
      // Member crews (from runCrewMemberships) - only if not already in managers
      ...(athlete.runCrewMemberships || [])
        .filter(membership => {
          // Don't duplicate if already in managers
          return !(athlete.runCrewManagers || []).some(m => m.runCrewId === membership.runCrewId);
        })
        .map(m => ({
          runCrewId: m.runCrewId,
          role: 'member',
          managerId: null,
          runCrew: m.runCrew || null
        }))
    ];

    // MVP1: Single crew per athlete - get the primary crew
    const MyCrew = allCrews.length === 1 ? allCrews[0].runCrewId : (allCrews[0]?.runCrewId || null);
    const MyCrewManagerId = allCrews.find(c => c.role === 'admin')?.managerId || null;

    console.log('✅ ATHLETE PERSON HYDRATE: Flattened crews context - MyCrew:', MyCrew, 'MyCrewManagerId:', MyCrewManagerId);
    
    // Fetch weekly activities (last 7 days) for this athlete
    console.log('🔍 ATHLETE PERSON HYDRATE: Fetching weekly activities for athleteId:', athleteId);
    
    // Use Monday-Sunday week boundaries (not rolling 7 days)
    const weekRange = getCurrentWeek();
    const windowStart = weekRange.start;
    const windowEnd = weekRange.end;
    
    console.log(`📅 Weekly range (Monday-Sunday): ${windowStart.toISOString()} to ${windowEnd.toISOString()}`);
    
    // MVP1: Filter for running activities only (case-insensitive)
    const weeklyActivities = await prisma.athleteActivity.findMany({
      where: {
        athleteId: athleteId,
        startTime: {
          gte: windowStart,
          lte: windowEnd
        },
        // MVP1: Only show running activities (exclude wheelchair)
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
      orderBy: {
        startTime: 'desc'
      },
      select: {
        id: true,
        activityName: true,
        activityType: true,
        sourceActivityId: true,
        startTime: true,
        duration: true,
        distance: true,
        calories: true,
        averageHeartRate: true,
        maxHeartRate: true,
        elevationGain: true,
        averageSpeed: true,
        deviceName: true,
        detailData: true,
        summaryData: true
      }
    });
    
    console.log(`✅ Found ${weeklyActivities.length} running activities (current week: Monday-Sunday)`);
    
    // Calculate weekly totals
    const weeklyTotals = {
      totalDistance: 0,
      totalDuration: 0,
      totalCalories: 0,
      activityCount: weeklyActivities.length
    };
    
    weeklyActivities.forEach(activity => {
      if (activity.distance) weeklyTotals.totalDistance += activity.distance;
      if (activity.duration) weeklyTotals.totalDuration += activity.duration;
      if (activity.calories) weeklyTotals.totalCalories += activity.calories;
    });
    
    // Convert distance from meters to miles
    weeklyTotals.totalDistanceMiles = (weeklyTotals.totalDistance / 1609.34).toFixed(2);
    
    console.log(`✅ ATHLETE PERSON HYDRATE: Found ${weeklyActivities.length} weekly activities`);
    console.log(`📊 Weekly totals: ${weeklyTotals.totalDistanceMiles} miles, ${weeklyTotals.totalDuration}s, ${weeklyTotals.totalCalories} cal`);
    
    // Format athlete data for frontend consumption
    // ATHLETE-FIRST: athleteId is the central identifier
    const hydratedAthlete = {
      athleteId: athleteId, // ATHLETE-FIRST: Central identifier
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
      
      // RunCrew Memberships (hydrated) - LEGACY
      runCrews: runCrews,
      runCrewCount: runCrews.length,
      runCrewManagers: athlete.runCrewManagers || [],
      
      // HYDRATION V2: Clean crew context for frontend
      crews: allCrews, // Flattened array with role/managerId
      MyCrew: MyCrew, // Primary crew ID for MVP1
      MyCrewManagerId: MyCrewManagerId, // Manager record ID if admin
      
      // Weekly Activities (last 7 days)
      weeklyActivities: weeklyActivities || [],
      weeklyActivityCount: weeklyActivities.length,
      weeklyTotals: weeklyTotals,
      
      // Computed fields
      fullName: athlete.firstName && athlete.lastName 
        ? `${athlete.firstName} ${athlete.lastName}` 
        : 'No Name Set',
      profileComplete: !!(athlete.firstName && athlete.lastName),
      hasLocation: !!(athlete.city && athlete.state),
      hasSport: !!athlete.primarySport,
      hasBio: !!athlete.bio
    };
    
    // Count admin crews from runCrews array (where isAdmin === true)
    const adminCrewsFromRunCrews = runCrews.filter(crew => crew.isAdmin === true);
    
    console.log('🎯 ATHLETE PERSON HYDRATE: Returning hydrated athlete data for athleteId:', athleteId);
    console.log('🎯 ATHLETE PERSON HYDRATE: RunCrews count:', runCrews.length);
    console.log('🎯 ATHLETE PERSON HYDRATE: Admin crews (from runCrews.isAdmin):', adminCrewsFromRunCrews.length);
    console.log('🎯 ATHLETE PERSON HYDRATE: Admin crews (from adminRunCrews relation):', athlete.adminRunCrews?.length || 0);
    
    // Log each crew's admin status
    runCrews.forEach((crew, index) => {
      console.log(`🎯 ATHLETE PERSON HYDRATE: Crew ${index + 1} - ${crew.name}:`, {
        id: crew.id,
        isAdmin: crew.isAdmin,
        runcrewAdminId: crew.runcrewAdminId,
        athleteId: athleteId
      });
    });
    
    // CORS handled by main middleware
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
router.post('/hydrate', verifyFirebaseToken, hydrateAthlete);

// Legacy route - kept for backward compatibility
router.get('/athletepersonhydrate', verifyFirebaseToken, hydrateAthlete);

export default router;
