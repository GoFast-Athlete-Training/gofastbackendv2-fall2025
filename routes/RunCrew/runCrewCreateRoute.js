// RunCrew Create Route
// POST /api/runcrew/create
// Creates a new RunCrew and automatically adds the creator as admin and member

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

/**
 * Create RunCrew
 * POST /api/runcrew/create
 * Body: { name: string, joinCode: string, athleteId: string }
 * 
 * Flow:
 * 1. Verify athleteId is provided
 * 2. Optional: Verify Firebase token matches athleteId (security)
 * 3. Verify athlete exists
 * 4. Check joinCode uniqueness
 * 5. Create RunCrew with runcrewAdminId = athleteId
 * 6. Create RunCrewMembership for admin
 */
router.post('/create', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { name, joinCode, athleteId } = req.body;
    const firebaseId = req.user?.uid; // From verified Firebase token
    
    console.log('🚀 RUNCREW CREATE: ===== CREATING RUNCREW =====');
    console.log('🚀 RUNCREW CREATE: Name:', name);
    console.log('🚀 RUNCREW CREATE: Join Code:', joinCode);
    console.log('🚀 RUNCREW CREATE: Athlete ID:', athleteId);
    console.log('🚀 RUNCREW CREATE: Firebase ID:', firebaseId);
    
    // Validation
    if (!name || !joinCode || !athleteId) {
      console.log('❌ RUNCREW CREATE: Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['name', 'joinCode', 'athleteId'],
        received: {
          name: !!name,
          joinCode: !!joinCode,
          athleteId: !!athleteId
        }
      });
    }
    
    // Verify athlete exists and matches Firebase user
    console.log('🔍 RUNCREW CREATE: Verifying athlete...');
    const athlete = await prisma.athlete.findFirst({
      where: {
        id: athleteId,
        firebaseId: firebaseId
      }
    });
    
    if (!athlete) {
      console.log('❌ RUNCREW CREATE: Athlete not found or does not match Firebase user');
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Athlete ID does not match authenticated user'
      });
    }
    
    console.log('✅ RUNCREW CREATE: Athlete verified:', athlete.email);
    
    // Normalize joinCode to uppercase and trim
    const normalizedJoinCode = joinCode.toUpperCase().trim();
    
    // Validate joinCode is not empty after normalization
    if (!normalizedJoinCode) {
      console.log('❌ RUNCREW CREATE: Join code is empty after normalization');
      return res.status(400).json({
        success: false,
        error: 'Invalid join code',
        message: 'Join code cannot be empty'
      });
    }
    
    // Check if joinCode already exists (uniqueness check)
    console.log('🔍 RUNCREW CREATE: Checking joinCode uniqueness...');
    const existingCrew = await prisma.runCrew.findUnique({
      where: { joinCode: normalizedJoinCode }
    });
    
    if (existingCrew) {
      console.log('❌ RUNCREW CREATE: Join code already exists:', normalizedJoinCode);
      return res.status(409).json({
        success: false,
        error: 'Join code already exists',
        message: 'Please choose a different join code'
      });
    }
    
    // Create RunCrew with normalized joinCode
    console.log('📝 RUNCREW CREATE: Creating RunCrew with joinCode:', normalizedJoinCode);
    const runCrew = await prisma.runCrew.create({
      data: {
        name: name.trim(),
        joinCode: normalizedJoinCode, // Stored as uppercase, unique constraint enforced by Prisma
        runcrewAdminId: athleteId
      }
    });
    
    console.log('✅ RUNCREW CREATE: RunCrew created:', runCrew.id);
    
    // Create membership for admin (automatically add admin as member)
    console.log('📝 RUNCREW CREATE: Creating admin membership...');
    const membership = await prisma.runCrewMembership.create({
      data: {
        runCrewId: runCrew.id,
        athleteId: athleteId,
        status: 'active'
      }
    });
    
    console.log('✅ RUNCREW CREATE: Admin membership created:', membership.id);
    console.log('✅ RUNCREW CREATE: ===== RUNCREW CREATED SUCCESSFULLY =====');
    
    // Return created RunCrew with admin info
    const createdCrew = await prisma.runCrew.findUnique({
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
        memberships: {
          where: { status: 'active' },
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
    
    res.status(201).json({
      success: true,
      message: 'RunCrew created successfully',
      runCrew: createdCrew
    });
    
  } catch (error) {
    console.error('❌ RUNCREW CREATE: ===== ERROR =====');
    console.error('❌ RUNCREW CREATE: Error message:', error.message);
    console.error('❌ RUNCREW CREATE: Error stack:', error.stack);
    
    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Join code already exists',
        message: 'Please choose a different join code'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create RunCrew',
      message: error.message
    });
  }
});

export default router;

