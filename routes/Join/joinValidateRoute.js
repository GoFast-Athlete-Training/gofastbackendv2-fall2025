// Join Validate Route
// GET /api/join/validate?code=XXXX
// Validates a join code and returns crew info (PUBLIC - no auth required)

import express from 'express';
import { getPrismaClient } from '../../config/database.js';

const router = express.Router();

/**
 * Validate Join Code
 * GET /api/join/validate?code=XXXX
 * 
 * Flow:
 * 1. Normalize join code from query param
 * 2. Find JoinCode record in registry
 * 3. Verify code is active and not expired
 * 4. Return crew info (name, manager name, member count)
 */
router.get('/validate', async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { code } = req.query;

    console.log('🔍 JOIN VALIDATE: Validating join code:', code);

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Missing join code',
        message: 'Please provide a join code'
      });
    }

    // Normalize join code
    const normalizedJoinCode = code.toUpperCase().trim();

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
            },
            managers: {
              where: { role: 'admin' },
              include: {
                athlete: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              },
              take: 1
            }
          }
        }
      }
    });

    if (!joinCodeRecord) {
      console.log('❌ JOIN VALIDATE: Join code not found:', normalizedJoinCode);
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired join code',
        message: 'Invalid or expired join code'
      });
    }

    // Check if code is active
    if (!joinCodeRecord.isActive) {
      console.log('❌ JOIN VALIDATE: Join code is inactive:', normalizedJoinCode);
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired join code',
        message: 'Invalid or expired join code'
      });
    }

    // Check if code is expired
    if (joinCodeRecord.expiresAt && new Date(joinCodeRecord.expiresAt) < new Date()) {
      console.log('❌ JOIN VALIDATE: Join code has expired:', normalizedJoinCode);
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired join code',
        message: 'Invalid or expired join code'
      });
    }

    const crew = joinCodeRecord.runCrew;
    const adminManager = crew.managers?.[0];
    const managerName = adminManager?.athlete 
      ? `${adminManager.athlete.firstName} ${adminManager.athlete.lastName}`.trim()
      : 'Admin';

    // Return crew info for invite card
    res.json({
      success: true,
      crewName: crew.name,
      managerName: managerName,
      memberCount: crew._count.memberships,
      description: crew.description || null,
      runCrewId: crew.id,
      joinCode: normalizedJoinCode
    });

  } catch (error) {
    console.error('❌ JOIN VALIDATE: ===== ERROR =====');
    console.error('❌ JOIN VALIDATE: Error message:', error.message);
    console.error('❌ JOIN VALIDATE: Error stack:', error.stack);

    res.status(500).json({
      success: false,
      error: 'Failed to validate join code',
      message: error.message
    });
  }
});

export default router;

