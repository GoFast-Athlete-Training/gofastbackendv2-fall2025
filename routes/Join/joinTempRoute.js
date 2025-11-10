// Join Temp Route
// POST /api/join/temp
// Stores join context in Redis for later use during signup (PUBLIC - no auth required)

import express from 'express';
import { randomUUID } from 'crypto';
import { getPrismaClient } from '../../config/database.js';
import { storeJoinContext } from '../../utils/redis.js';

const router = express.Router();

/**
 * Store Join Context Temporarily
 * POST /api/join/temp
 * Body: { joinCode: string }
 * 
 * Flow:
 * 1. Validate join code exists and is active
 * 2. Generate session ID (or use provided one)
 * 3. Store join context in Redis with 5-minute TTL
 * 4. Return session ID for frontend to use during signup
 */
router.post('/temp', async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { joinCode, sessionId } = req.body;

    console.log('💾 JOIN TEMP: Storing join context for code:', joinCode);

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
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!joinCodeRecord) {
      console.log('❌ JOIN TEMP: Join code not found:', normalizedJoinCode);
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired join code',
        message: 'Invalid or expired join code'
      });
    }

    // Check if code is active
    if (!joinCodeRecord.isActive) {
      console.log('❌ JOIN TEMP: Join code is inactive:', normalizedJoinCode);
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired join code',
        message: 'Invalid or expired join code'
      });
    }

    // Check if code is expired
    if (joinCodeRecord.expiresAt && new Date(joinCodeRecord.expiresAt) < new Date()) {
      console.log('❌ JOIN TEMP: Join code has expired:', normalizedJoinCode);
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired join code',
        message: 'Invalid or expired join code'
      });
    }

    // Generate or use provided session ID
    const finalSessionId = sessionId || randomUUID();

    // Store join context in Redis (5 minutes TTL)
    const joinContext = {
      joinCode: normalizedJoinCode,
      runCrewId: joinCodeRecord.runCrew.id,
      runCrewName: joinCodeRecord.runCrew.name,
      createdAt: new Date().toISOString()
    };

    await storeJoinContext(finalSessionId, joinContext, 300); // 5 minutes

    console.log('✅ JOIN TEMP: Join context stored for sessionId:', finalSessionId);

    res.json({
      success: true,
      sessionId: finalSessionId,
      message: 'Join context stored successfully'
    });

  } catch (error) {
    console.error('❌ JOIN TEMP: ===== ERROR =====');
    console.error('❌ JOIN TEMP: Error message:', error.message);
    console.error('❌ JOIN TEMP: Error stack:', error.stack);

    res.status(500).json({
      success: false,
      error: 'Failed to store join context',
      message: error.message
    });
  }
});

export default router;

