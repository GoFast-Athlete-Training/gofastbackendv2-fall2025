// RunCrew Lookup Route
// POST /api/runcrew/lookup
// Looks up a RunCrew by join code via JoinCode registry

import express from 'express';
import { getPrismaClient } from '../../config/database.js';

const router = express.Router();

/**
 * Lookup RunCrew by Join Code
 * POST /api/runcrew/lookup
 * Body: { joinCode: string }
 * 
 * Flow:
 * 1. Normalize join code
 * 2. Find JoinCode record in registry
 * 3. Verify code is active and not expired
 * 4. Return crew preview (name, city, member count)
 */
router.post('/lookup', async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { joinCode } = req.body;

    console.log('🔍 RUNCREW LOOKUP: Looking up join code:', joinCode);

    if (!joinCode) {
      return res.status(400).json({
        success: false,
        error: 'Missing join code',
        message: 'Please provide a join code'
      });
    }

    // Normalize join code
    const normalizedJoinCode = joinCode.toUpperCase().trim();

    if (!normalizedJoinCode) {
      return res.status(400).json({
        success: false,
        error: 'Invalid join code',
        message: 'Join code cannot be empty'
      });
    }

    // Find JoinCode record in registry
    const joinCodeRecord = await prisma.joinCode.findUnique({
      where: { code: normalizedJoinCode },
      include: {
        runCrew: {
          include: {
            _count: {
              select: { memberships: true }
            }
          }
        }
      }
    });

    if (!joinCodeRecord) {
      console.log('❌ RUNCREW LOOKUP: Join code not found:', normalizedJoinCode);
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired join code',
        message: 'Invalid or expired join code'
      });
    }

    // Check if code is active
    if (!joinCodeRecord.isActive) {
      console.log('❌ RUNCREW LOOKUP: Join code is inactive:', normalizedJoinCode);
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired join code',
        message: 'Invalid or expired join code'
      });
    }

    // Check if code is expired
    if (joinCodeRecord.expiresAt && new Date(joinCodeRecord.expiresAt) < new Date()) {
      console.log('❌ RUNCREW LOOKUP: Join code has expired:', normalizedJoinCode);
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired join code',
        message: 'Invalid or expired join code'
      });
    }

    const crew = joinCodeRecord.runCrew;

    // Return crew preview
    res.json({
      success: true,
      id: crew.id,
      name: crew.name,
      description: crew.description || null,
      memberCount: crew._count.memberships,
      joinCode: joinCodeRecord.code
    });

  } catch (error) {
    console.error('❌ RUNCREW LOOKUP: ===== ERROR =====');
    console.error('❌ RUNCREW LOOKUP: Error message:', error.message);
    console.error('❌ RUNCREW LOOKUP: Error stack:', error.stack);

    res.status(500).json({
      success: false,
      error: 'Failed to lookup RunCrew',
      message: error.message
    });
  }
});

export default router;

