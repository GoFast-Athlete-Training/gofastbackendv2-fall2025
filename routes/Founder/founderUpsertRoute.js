// Founder Upsert Route
// POST /api/founder/upsert
// Upserts (finds or creates) a Founder record linked to an Athlete
// Special use case: Founder IS an Athlete (Me)

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

/**
 * Upsert Founder (Find or Create)
 * POST /api/founder/upsert
 * Body: { athleteId: string }
 * 
 * Flow:
 * 1. Verify Firebase token
 * 2. Verify athleteId belongs to authenticated user (firebaseId match)
 * 3. Find existing Founder by athleteId
 * 4. If found, return it
 * 5. If not found, create new Founder linked to athleteId
 */
router.post('/upsert', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { athleteId } = req.body;
    const firebaseId = req.user?.uid; // From verified Firebase token
    
    console.log('🚀 FOUNDER UPSERT: ===== UPSERTING FOUNDER =====');
    console.log('🚀 FOUNDER UPSERT: Athlete ID:', athleteId);
    console.log('🚀 FOUNDER UPSERT: Firebase ID:', firebaseId);
    
    // Validation
    if (!athleteId) {
      console.log('❌ FOUNDER UPSERT: Missing athleteId');
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        required: ['athleteId']
      });
    }
    
    // Verify athlete exists and matches Firebase user
    console.log('🔍 FOUNDER UPSERT: Verifying athlete...');
    const athlete = await prisma.athlete.findFirst({
      where: {
        id: athleteId,
        firebaseId: firebaseId
      }
    });
    
    if (!athlete) {
      console.log('❌ FOUNDER UPSERT: Athlete not found or does not match Firebase user');
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Athlete ID does not match authenticated user'
      });
    }
    
    console.log('✅ FOUNDER UPSERT: Athlete verified:', athlete.email);
    
    // Try to find existing Founder
    let founder = await prisma.founder.findUnique({
      where: { athleteId },
      include: {
        athlete: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            photoURL: true
          }
        }
      }
    });
    
    if (founder) {
      console.log('✅ FOUNDER UPSERT: Existing Founder found:', founder.id);
      return res.json({
        success: true,
        message: 'Founder found',
        founder: {
          id: founder.id,
          athleteId: founder.athleteId,
          athlete: founder.athlete,
          createdAt: founder.createdAt,
          updatedAt: founder.updatedAt
        }
      });
    }
    
    // Create new Founder
    console.log('📝 FOUNDER UPSERT: Creating new Founder for athleteId:', athleteId);
    founder = await prisma.founder.create({
      data: {
        athleteId: athleteId
      },
      include: {
        athlete: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            photoURL: true
          }
        }
      }
    });
    
    console.log('✅ FOUNDER UPSERT: ===== FOUNDER CREATED SUCCESSFULLY =====');
    console.log('✅ FOUNDER UPSERT: Founder ID:', founder.id);
    
    res.status(201).json({
      success: true,
      message: 'Founder created successfully',
      founder: {
        id: founder.id,
        athleteId: founder.athleteId,
        athlete: founder.athlete,
        createdAt: founder.createdAt,
        updatedAt: founder.updatedAt
      }
    });
    
  } catch (error) {
    console.error('❌ FOUNDER UPSERT: ===== ERROR =====');
    console.error('❌ FOUNDER UPSERT: Error message:', error.message);
    console.error('❌ FOUNDER UPSERT: Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      error: 'Failed to upsert Founder',
      message: error.message
    });
  }
});

export default router;

