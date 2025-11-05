// RunCrew Hydrate Route
// GET /api/runcrew/:id - Get single RunCrew with all relations
// GET /api/runcrew/mine - Get all crews for authenticated athlete

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

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
        posts: {
          include: {
            athlete: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photoURL: true
              }
            },
            comments: {
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
                createdAt: 'asc'
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 20 // Limit to most recent 20 posts
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
    
    if (!isMember && runCrew.runcrewAdminId !== athlete.id) {
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
        isAdmin: runCrew.runcrewAdminId === athlete.id
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
    });
    
    // Transform to include member count and admin status
    const runCrews = memberships.map(membership => ({
      ...membership.runCrew,
      memberCount: membership.runCrew.memberships.length,
      isAdmin: membership.runCrew.runcrewAdminId === athlete.id,
      joinedAt: membership.joinedAt,
      postCount: membership.runCrew._count.posts,
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

export default router;


