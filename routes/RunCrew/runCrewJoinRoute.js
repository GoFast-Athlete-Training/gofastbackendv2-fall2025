// RunCrew Join Route
// POST /api/runcrew/join
// Allows an athlete to join a RunCrew using an invite code

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

/**
 * Join RunCrew
 * POST /api/runcrew/join
 * Body: { joinCode: string, athleteId: string }
 * 
 * Flow:
 * 1. Verify athleteId is provided
 * 2. Verify Firebase token matches athleteId (security)
 * 3. Verify athlete exists
 * 4. Find RunCrew by joinCode
 * 5. Check if athlete is already a member
 * 6. Create RunCrewMembership
 */
router.post('/join', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { joinCode, athleteId } = req.body;
    const firebaseId = req.user?.uid; // From verified Firebase token
    
    console.log('🚀 RUNCREW JOIN: ===== JOINING RUNCREW =====');
    console.log('🚀 RUNCREW JOIN: Join Code:', joinCode);
    console.log('🚀 RUNCREW JOIN: Athlete ID:', athleteId);
    console.log('🚀 RUNCREW JOIN: Firebase ID:', firebaseId);
    
    // Validation
    if (!joinCode || !athleteId) {
      console.log('❌ RUNCREW JOIN: Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['joinCode', 'athleteId'],
        received: {
          joinCode: !!joinCode,
          athleteId: !!athleteId
        }
      });
    }
    
    // Verify athlete exists and matches Firebase user
    console.log('🔍 RUNCREW JOIN: Verifying athlete...');
    const athlete = await prisma.athlete.findFirst({
      where: {
        id: athleteId,
        firebaseId: firebaseId
      }
    });
    
    if (!athlete) {
      console.log('❌ RUNCREW JOIN: Athlete not found or does not match Firebase user');
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Athlete ID does not match authenticated user'
      });
    }
    
    console.log('✅ RUNCREW JOIN: Athlete verified:', athlete.email);
    
    // Normalize joinCode to uppercase and trim (matches how it's stored)
    const normalizedJoinCode = joinCode.toUpperCase().trim();
    
    // Validate joinCode is not empty after normalization
    if (!normalizedJoinCode) {
      console.log('❌ RUNCREW JOIN: Join code is empty after normalization');
      return res.status(400).json({
        success: false,
        error: 'Invalid join code',
        message: 'Join code cannot be empty'
      });
    }
    
    // Find RunCrew by joinCode (using findUnique since joinCode is unique in schema)
    console.log('🔍 RUNCREW JOIN: Finding RunCrew by joinCode:', normalizedJoinCode);
    const runCrew = await prisma.runCrew.findUnique({
      where: { joinCode: normalizedJoinCode } // joinCode is @unique in schema
    });
    
    if (!runCrew) {
      console.log('❌ RUNCREW JOIN: RunCrew not found with joinCode:', normalizedJoinCode);
      return res.status(404).json({
        success: false,
        error: 'RunCrew not found',
        message: 'Invalid join code. Please check the code and try again.'
      });
    }
    
    console.log('✅ RUNCREW JOIN: RunCrew found:', runCrew.name, runCrew.id);
    
    // Check if athlete is already a member (check junction table)
    console.log('🔍 RUNCREW JOIN: Checking for existing membership...');
    const existingMembership = await prisma.runCrewMembership.findUnique({
      where: {
        runCrewId_athleteId: {
          runCrewId: runCrew.id,
          athleteId: athleteId
        }
      }
    });
    
    if (existingMembership) {
      console.log('⚠️ RUNCREW JOIN: Athlete already a member of this crew');
      return res.status(409).json({
        success: false,
        error: 'Already a member',
        message: 'You are already a member of this RunCrew'
      });
    }
    
    // Add athlete to crew via junction table (athlete can be in multiple crews)
    console.log('📝 RUNCREW JOIN: Creating membership via junction table...');
    const membership = await prisma.runCrewMembership.create({
      data: {
        runCrewId: runCrew.id,
        athleteId: athleteId
      }
    });
    
    console.log('✅ RUNCREW JOIN: Membership created:', membership.id);
    console.log('✅ RUNCREW JOIN: ===== JOINED RUNCREW SUCCESSFULLY =====');
    
    // Return RunCrew with members
    const runCrewWithMembers = await prisma.runCrew.findUnique({
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
      message: 'Joined RunCrew successfully',
      runCrew: runCrewWithMembers
    });
    
  } catch (error) {
    console.error('❌ RUNCREW JOIN: ===== ERROR =====');
    console.error('❌ RUNCREW JOIN: Error message:', error.message);
    console.error('❌ RUNCREW JOIN: Error stack:', error.stack);
    
    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Already a member',
        message: 'You are already a member of this RunCrew'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to join RunCrew',
      message: error.message
    });
  }
});

export default router;

