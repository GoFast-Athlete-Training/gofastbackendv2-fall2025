// RunCrew Create Route
// POST /api/runcrew/create
// Creates a new RunCrew and automatically adds the creator as admin and member

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';
import { RUNCREW_ROLES } from '../../config/runCrewRoleConfig.js';

const router = express.Router();

router.post('/create', verifyFirebaseToken, async (req, res) => {
  const prisma = getPrismaClient();
  const { name, joinCode, athleteId } = req.body;
  const firebaseId = req.user?.uid;
  
  // Validation
  if (!name?.trim() || !joinCode?.trim() || !athleteId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      required: ['name', 'joinCode', 'athleteId']
    });
  }
  
  // Verify athlete exists and matches Firebase user
  const athlete = await prisma.athlete.findFirst({
    where: { id: athleteId, firebaseId }
  });
  
  if (!athlete) {
    return res.status(403).json({
      success: false,
      error: 'Unauthorized',
      message: 'Athlete ID does not match authenticated user'
    });
  }
  
  // Normalize and validate joinCode
  const normalizedJoinCode = joinCode.toUpperCase().trim();
  if (!normalizedJoinCode) {
    return res.status(400).json({
      success: false,
      error: 'Invalid join code',
      message: 'Join code cannot be empty'
    });
  }
  
  // Check joinCode uniqueness
  const existingCrew = await prisma.runCrew.findUnique({
    where: { joinCode: normalizedJoinCode }
  });
  
  if (existingCrew) {
    return res.status(409).json({
      success: false,
      error: 'Join code already exists',
      message: 'Please choose a different join code'
    });
  }
  
  try {
    // Create RunCrew and upsert membership in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create RunCrew (keep runcrewAdminId for backward compatibility, but use RunCrewManager as primary)
      const runCrew = await tx.runCrew.create({
        data: {
          name: name.trim(),
          joinCode: normalizedJoinCode,
          description: req.body.description?.trim() || null,
          logo: req.body.logo?.trim() || null,
          icon: req.body.icon?.trim() || null,
          runcrewAdminId: athleteId // Backward compatibility - but RunCrewManager is the source of truth
        }
      });
      
      // Create RunCrewManager entry with role="admin" (QUERYABLE MODEL)
      const adminManager = await tx.runCrewManager.create({
        data: {
          runCrewId: runCrew.id,
          athleteId: athleteId,
          role: RUNCREW_ROLES.ADMIN // Primary admin relationship - queryable!
        }
      });
      
      // Upsert membership (creator is also a member)
      const membership = await tx.runCrewMembership.upsert({
        where: {
          runCrewId_athleteId: {
            runCrewId: runCrew.id,
            athleteId: athleteId
          }
        },
        update: {
          joinedAt: new Date() // Reset join date if rejoining
        },
        create: {
          runCrewId: runCrew.id,
          athleteId: athleteId
        }
      });
      
      // Return hydrated RunCrew with creator admin and members
      const hydratedCrew = await tx.runCrew.findUnique({
        where: { id: runCrew.id },
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
            where: { role: 'admin' }, // Include admin managers
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
            }
          }
        }
      });
      
      return { runCrew: hydratedCrew, membership };
    });
    
    res.status(201).json({
      success: true,
      message: 'RunCrew created successfully',
      runCrew: result.runCrew
    });
    
  } catch (error) {
    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Join code already exists',
        message: 'Please choose a different join code'
      });
    }
    
    console.error('❌ RUNCREW CREATE ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create RunCrew',
      message: error.message
    });
  }
});

export default router;

