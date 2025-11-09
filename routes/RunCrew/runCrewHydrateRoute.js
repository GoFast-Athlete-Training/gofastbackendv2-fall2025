// RunCrew Hydrate Route
// GET /api/runcrew/:id - Get single RunCrew with all relations
// GET /api/runcrew/mine - Get all crews for authenticated athlete

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';
import { computeCrewLeaderboard } from '../../services/crewLeaderboard.js';

const router = express.Router();

/**
 * Hydrate RunCrew by ID (local-context driven)
 * POST /api/runcrew/hydrate
 * Body: { runCrewId }
 * Returns: Fully hydrated RunCrew without requiring Firebase token.
 */
router.post('/hydrate', async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { runCrewId, athleteId } = req.body || {};

    if (!runCrewId) {
      return res.status(400).json({
        success: false,
        error: 'runCrewId is required from localStorage context'
      });
    }

    console.log('🚀 RUNCREW HYDRATE (LOCAL-FIRST):', runCrewId);

    const runCrew = await prisma.runCrew.findUnique({
      where: { id: runCrewId },
      include: {
        managers: {
          include: {
            athlete: true
          }
        },
        memberships: {
          include: {
            athlete: true
          },
          orderBy: {
            joinedAt: 'desc'
          }
        },
        messages: {
          include: {
            athlete: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 50
        },
        announcements: {
          include: {
            author: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        },
        runs: {
          include: {
            createdBy: true,
            rsvps: {
              include: {
                athlete: true
              }
            }
          },
          orderBy: {
            date: 'asc'
          }
        }
      }
    });

    if (!runCrew) {
      return res.status(404).json({
        success: false,
        error: 'RunCrew not found'
      });
    }

    // HYDRATION V2: Determine admin status from RunCrewManager junction table
    const managerRecord = athleteId
      ? (runCrew.managers || []).find(
          (manager) => manager.athleteId === athleteId && manager.role === 'admin'
        )
      : null;
    const isAdmin = Boolean(managerRecord);

    const leaderboardDynamic = await computeCrewLeaderboard(runCrewId);

    const runCrewForResponse = {
      ...runCrew,
      isAdmin,
      currentManagerId: managerRecord?.id || null,
      leaderboardDynamic
    };

    res.json({
      success: true,
      runCrew: runCrewForResponse
    });
  } catch (error) {
    console.error('❌ RUNCREW HYDRATE (LOCAL-FIRST):', error);
    res.status(500).json({
      success: false,
      error: 'Failed to hydrate RunCrew',
      message: error.message
    });
  }
});

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
            managers: {
              select: {
                id: true,
                athleteId: true,
                role: true,
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
    });
    
    // Transform to include member count and admin status (HYDRATION V2)
    const runCrews = memberships.map(membership => {
      const isAdmin = (membership.runCrew.managers || []).some(
        m => m.athleteId === athlete.id && m.role === 'admin'
      );
      
      return {
        ...membership.runCrew,
        memberCount: membership.runCrew.memberships.length,
        isAdmin,
        joinedAt: membership.joinedAt,
        messageCount: membership.runCrew._count?.messages ?? 0
      };
    });
    
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
        managers: {
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
    
    // HYDRATION V2: Check if athlete is the admin via RunCrewManager
    const isAdmin = (runCrew.managers || []).some(
      m => m.athleteId === athlete.id && m.role === 'admin'
    );
    
    if (!isMember && !isAdmin) {
      console.log('❌ RUNCREW HYDRATE: Athlete is not a member or admin');
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You must be a member of this crew to view it'
      });
    }
    
    console.log('✅ RUNCREW HYDRATE: Successfully hydrated crew');

    const leaderboardDynamic = await computeCrewLeaderboard(id);
    const managerRecord = (runCrew.managers || []).find(
      (manager) => manager.athleteId === athlete.id && manager.role === 'admin'
    );
    
    res.json({
      success: true,
      runCrew: {
        ...runCrew,
        memberCount: runCrew.memberships.length,
        isAdmin: isAdmin,
        currentManagerId: managerRecord?.id || null,
        leaderboardDynamic
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

export default router;




