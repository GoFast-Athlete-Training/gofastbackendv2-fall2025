// RunCrew Join Route
// POST /api/runcrew/join
// Allows an athlete to join a RunCrew using an invite code via JoinCode registry

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';
import { AthleteFindOrCreateService } from '../../services/AthleteFindOrCreateService.js';

const router = express.Router();

/**
 * Join RunCrew
 * POST /api/runcrew/join
 * Body: { joinCode: string, athleteProfile?: object }
 * 
 * Flow:
 * 1. Verify joinCode via JoinCode registry
 * 2. Verify Firebase token (user must be authenticated)
 * 3. Upsert athlete (auto-create if new)
 * 4. Check if athlete is already a member
 * 5. Create RunCrewMembership
 * 6. Return full hydrated runCrew
 */
router.post('/join', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { joinCode, athleteProfile } = req.body;
    const userId = req.user?.uid; // From verified Firebase token
    const email = req.user?.email;
    const displayName = req.user?.name;
    const picture = req.user?.picture;
    
    console.log('🚀 RUNCREW JOIN: ===== JOINING RUNCREW =====');
    console.log('🚀 RUNCREW JOIN: Join Code:', joinCode);
    console.log('🚀 RUNCREW JOIN: Firebase ID:', userId);
    
    // Validation
    if (!joinCode) {
      console.log('❌ RUNCREW JOIN: Missing join code');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['joinCode'],
        received: {
          joinCode: !!joinCode
        }
      });
    }
    
    if (!userId || !email) {
      console.log('❌ RUNCREW JOIN: Missing Firebase authentication');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Firebase authentication required'
      });
    }
    
    // Normalize joinCode to uppercase and trim
    const normalizedJoinCode = joinCode.toUpperCase().trim();
    
    if (!normalizedJoinCode) {
      console.log('❌ RUNCREW JOIN: Join code is empty after normalization');
      return res.status(400).json({
        success: false,
        error: 'Invalid join code',
        message: 'Join code cannot be empty'
      });
    }
    
    // Find JoinCode record in registry
    console.log('🔍 RUNCREW JOIN: Looking up join code in registry:', normalizedJoinCode);
    const joinCodeRecord = await prisma.joinCode.findUnique({
      where: { code: normalizedJoinCode },
      include: { runCrew: true }
    });
    
    if (!joinCodeRecord) {
      console.log('❌ RUNCREW JOIN: Join code not found in registry:', normalizedJoinCode);
      return res.status(400).json({
        success: false,
        error: 'Invalid join code',
        message: 'Invalid or expired join code'
      });
    }
    
    // Check if code is active
    if (!joinCodeRecord.isActive) {
      console.log('❌ RUNCREW JOIN: Join code is inactive:', normalizedJoinCode);
      return res.status(400).json({
        success: false,
        error: 'Invalid join code',
        message: 'Invalid or expired join code'
      });
    }
    
    // Check if code is expired
    if (joinCodeRecord.expiresAt && new Date(joinCodeRecord.expiresAt) < new Date()) {
      console.log('❌ RUNCREW JOIN: Join code has expired:', normalizedJoinCode);
      return res.status(400).json({
        success: false,
        error: 'Invalid join code',
        message: 'Invalid or expired join code'
      });
    }
    
    const { runCrewId } = joinCodeRecord;
    console.log('✅ RUNCREW JOIN: Join code validated, runCrewId:', runCrewId);
    
    // Upsert athlete (auto-create if new)
    console.log('🔍 RUNCREW JOIN: Upserting athlete...');
    const athlete = await AthleteFindOrCreateService.findOrCreate({
      firebaseId: userId,
      email,
      displayName,
      picture
    });
    
    // Update athlete profile if provided
    if (athleteProfile && Object.keys(athleteProfile).length > 0) {
      await prisma.athlete.update({
        where: { id: athlete.id },
        data: athleteProfile
      });
    }
    
    console.log('✅ RUNCREW JOIN: Athlete upserted:', athlete.id);
    
    // Check if athlete is already a member
    console.log('🔍 RUNCREW JOIN: Checking for existing membership...');
    const existingMembership = await prisma.runCrewMembership.findUnique({
      where: {
        runCrewId_athleteId: {
          runCrewId: runCrewId,
          athleteId: athlete.id
        }
      }
    });
    
    if (existingMembership) {
      console.log('⚠️ RUNCREW JOIN: Athlete already a member of this crew');
      // Still return success with hydrated crew
    } else {
      // Create membership
      console.log('📝 RUNCREW JOIN: Creating membership...');
      await prisma.runCrewMembership.create({
      data: {
          runCrewId: runCrewId,
          athleteId: athlete.id
      }
    });
      console.log('✅ RUNCREW JOIN: Membership created');
    }
    
    // Return full hydrated RunCrew (including description, logo, icon)
    console.log('🔍 RUNCREW JOIN: Hydrating RunCrew...');
    const runCrew = await prisma.runCrew.findUnique({
      where: { id: runCrewId },
      select: {
        // Core fields (including description, logo, icon)
        id: true,
        name: true,
        description: true,
        logo: true,
        icon: true,
        joinCode: true,
        createdAt: true,
        updatedAt: true,
        // Relations
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
        },
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
        runs: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 50,
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
        },
        announcements: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photoURL: true
              }
            }
          }
        }
      }
    });
    
    console.log('✅ RUNCREW JOIN: ===== JOINED RUNCREW SUCCESSFULLY =====');
    
    res.status(201).json({
      success: true,
      athleteId: athlete.id,
      runCrew
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

