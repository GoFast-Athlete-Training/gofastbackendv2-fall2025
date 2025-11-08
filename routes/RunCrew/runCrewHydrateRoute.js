// RunCrew Hydrate Route
// GET /api/runcrew/:id - Get single RunCrew with all relations
// GET /api/runcrew/mine - Get all crews for authenticated athlete

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

/**
 * Get My RunCrews
 * GET /api/runcrew/mine
 * Returns: All crews the authenticated athlete belongs to
 * 
 * Flow:
 * 1. Verify Firebase token
 * 2. Find athlete by Firebase ID
 * 3. Query RunCrewMembership for all crews
 * 4. Return hydrated crews with admin and member count
 */
router.get('/mine', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const firebaseId = req.user?.uid;
    
    console.log('🔍 RUNCREW MINE: Fetching crews for athlete');
    console.log('🔍 RUNCREW MINE: Firebase ID:', firebaseId);
    
    // Verify athlete exists
    const athlete = await prisma.athlete.findFirst({
      where: { firebaseId }
    });
    
    if (!athlete) {
      console.log('❌ RUNCREW MINE: Athlete not found');
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Athlete not found'
      });
    }
    
    // Find all memberships for this athlete
    const memberships = await prisma.runCrewMembership.findMany({
      where: {
        athleteId: athlete.id
      },
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
                messages: true,
                leaderboardEntries: true
              }
            }
          }
        }
      },
      orderBy: {
        joinedAt: 'desc'
      }
    });
    
    // Transform to include member count and admin status
    const runCrews = memberships.map(membership => ({
      ...membership.runCrew,
      memberCount: membership.runCrew.memberships.length,
      isAdmin: membership.runCrew.runcrewAdminId === athlete.id,
      joinedAt: membership.joinedAt,
      messageCount: membership.runCrew._count.messages,
      leaderboardCount: membership.runCrew._count.leaderboardEntries
    }));
    
    console.log('✅ RUNCREW MINE: Found', runCrews.length, 'crews');
    
    res.json({
      success: true,
      runCrews,
      count: runCrews.length
    });
    
  } catch (error) {
    console.error('❌ RUNCREW MINE: ===== ERROR =====');
    console.error('❌ RUNCREW MINE: Error message:', error.message);
    console.error('❌ RUNCREW MINE: Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch RunCrews',
      message: error.message
    });
  }
});

/**
 * Get RunCrew by ID
 * GET /api/runcrew/:id
 * Returns: Fully hydrated RunCrew with admin, members, posts, leaderboard
 * 
 * Flow:
 * 1. Verify Firebase token
 * 2. Find RunCrew by ID
 * 3. Verify athlete is a member (security check)
 * 4. Return hydrated RunCrew with all relations
 */
router.get('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { id } = req.params;
    const firebaseId = req.user?.uid;
    
    console.log('🔍 RUNCREW HYDRATE: Fetching crew:', id);
    console.log('🔍 RUNCREW HYDRATE: Firebase ID:', firebaseId);
    
    // Verify athlete exists
    const athlete = await prisma.athlete.findFirst({
      where: { firebaseId }
    });
    
    if (!athlete) {
      console.log('❌ RUNCREW HYDRATE: Athlete not found');
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Athlete not found'
      });
    }
    
    // Find RunCrew by ID
    const runCrew = await prisma.runCrew.findUnique({
      where: { id },
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
          },
          orderBy: {
            joinedAt: 'desc'
          }
        },
        messages: {
          include: {
            athlete: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photoURL: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 20 // Limit to most recent 20 messages
        },
        announcements: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photoURL: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        leaderboardEntries: {
          include: {
            athlete: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photoURL: true
              }
            }
          },
          orderBy: [
            { period: 'asc' },
            { totalMiles: 'desc' }
          ]
        },
        runs: {
          include: {
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photoURL: true
              }
            },
            rsvps: {
              include: {
                athlete: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    photoURL: true
                  }
                }
              }
            }
          },
          orderBy: {
            date: 'asc' // Upcoming runs first
          }
        }
      }
    });
    
    if (!runCrew) {
      console.log('❌ RUNCREW HYDRATE: Crew not found');
      return res.status(404).json({
        success: false,
        error: 'RunCrew not found',
        message: 'Invalid crew ID'
      });
    }
    
    // Check if athlete is a member (security: only members can view crew)
    const isMember = runCrew.memberships.some(
      membership => membership.athleteId === athlete.id
    );
    
    // Check if athlete is the admin (proper relationship)
    const isAdmin = runCrew.runcrewAdminId === athlete.id;
    
    if (!isMember && !isAdmin) {
      console.log('❌ RUNCREW HYDRATE: Athlete is not a member or admin');
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You must be a member of this crew to view it'
      });
    }
    
    console.log('✅ RUNCREW HYDRATE: Successfully hydrated crew');
    
    res.json({
      success: true,
      runCrew: {
        ...runCrew,
        memberCount: runCrew.memberships.length,
        isAdmin: isAdmin
      }
    });
    
  } catch (error) {
    console.error('❌ RUNCREW HYDRATE: ===== ERROR =====');
    console.error('❌ RUNCREW HYDRATE: Error message:', error.message);
    console.error('❌ RUNCREW HYDRATE: Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      error: 'Failed to hydrate RunCrew',
      message: error.message
    });
  }
});

/**
 * RunCrew context verification
 * GET /api/runcrew/:runCrewId/context/:athleteId
 * Confirms that the athlete belongs to the crew and returns a lightweight payload.
 */
router.get('/:runCrewId/context/:athleteId', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { runCrewId, athleteId } = req.params;
    const firebaseId = req.user?.uid;

    console.log('🔍 RUNCREW CONTEXT: crew', runCrewId, 'athlete', athleteId);

    // Verify athlete via firebase
    const athlete = await prisma.athlete.findFirst({
      where: { firebaseId }
    });

    if (!athlete || athlete.id !== athleteId) {
      console.log('❌ RUNCREW CONTEXT: Athlete mismatch or not found');
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Athlete mismatch'
      });
    }

    const membership = await prisma.runCrewMembership.findFirst({
      where: {
        athleteId,
        runCrewId
      },
      include: {
        runCrew: {
          select: {
            id: true,
            name: true,
            description: true,
            runcrewAdminId: true,
            managers: {
              select: {
                athleteId: true,
                role: true
              }
            }
          }
        }
      }
    });

    if (!membership) {
      console.log('❌ RUNCREW CONTEXT: Membership not found');
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Athlete is not a member of this crew'
      });
    }

    const runCrew = membership.runCrew;
    const isAdmin =
      runCrew.runcrewAdminId === athleteId ||
      (runCrew.managers || []).some(manager => manager.athleteId === athleteId && manager.role === 'admin');

    res.json({
      success: true,
      runCrew: {
        id: runCrew.id,
        name: runCrew.name,
        description: runCrew.description,
        runcrewAdminId: runCrew.runcrewAdminId,
        isAdmin
      }
    });
  } catch (error) {
    console.error('❌ RUNCREW CONTEXT: Error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify crew context',
      message: error.message
    });
  }
});

export default router;




