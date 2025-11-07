// RunCrew Message Route
// POST /api/runcrew/:runCrewId/messages - Create a new message
// GET /api/runcrew/:runCrewId/messages - Get all messages (for hydration)

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

// Get messages (for hydration)
router.get('/:runCrewId/messages', verifyFirebaseToken, async (req, res) => {
  const prisma = getPrismaClient();
  const { runCrewId } = req.params;
  const { limit = 100, before } = req.query;
  const firebaseId = req.user?.uid;

  try {
    // Get athlete from Firebase ID
    const athlete = await prisma.athlete.findFirst({
      where: { firebaseId }
    });

    if (!athlete) {
      return res.status(404).json({
        success: false,
        error: 'Athlete not found'
      });
    }

    // Verify athlete is a member of the RunCrew
    const membership = await prisma.runCrewMembership.findFirst({
      where: {
        runCrewId,
        athleteId: athlete.id
      }
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'You must be a member of this RunCrew to view messages'
      });
    }

    // Build query
    const limitNum = Math.min(parseInt(limit) || 100, 500);
    const where = { runCrewId };
    
    if (before) {
      where.createdAt = { lt: new Date(before) };
    }

    // Get messages (oldest first for chronological display)
    const messages = await prisma.runCrewMessage.findMany({
      where,
      take: limitNum,
      orderBy: { createdAt: 'asc' },
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
    });

    res.status(200).json({
      success: true,
      data: messages
    });

  } catch (error) {
    console.error('❌ RUNCREW MESSAGE GET ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages',
      message: error.message
    });
  }
});

// Create message
router.post('/:runCrewId/messages', verifyFirebaseToken, async (req, res) => {
  const prisma = getPrismaClient();
  const { runCrewId } = req.params;
  const { content } = req.body;
  const firebaseId = req.user?.uid;

  // Validation
  const trimmedContent = content?.trim();
  if (!trimmedContent) {
    return res.status(400).json({
      success: false,
      error: 'Message content is required'
    });
  }

  if (trimmedContent.length > 2000) {
    return res.status(400).json({
      success: false,
      error: 'Message content exceeds maximum length of 2000 characters'
    });
  }

  try {
    // Get athlete from Firebase ID
    const athlete = await prisma.athlete.findFirst({
      where: { firebaseId }
    });

    if (!athlete) {
      return res.status(404).json({
        success: false,
        error: 'Athlete not found'
      });
    }

    // Verify athlete is a member of the RunCrew
    const membership = await prisma.runCrewMembership.findFirst({
      where: {
        runCrewId,
        athleteId: athlete.id
      }
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'You must be a member of this RunCrew to post messages'
      });
    }

    // Create message
    const message = await prisma.runCrewMessage.create({
      data: {
        runCrewId,
        athleteId: athlete.id,
        content: trimmedContent
      },
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
    });

    // TODO: Emit socket event for real-time updates
    // socket.emit('runcrew:message', { runCrewId, message });

    res.status(201).json({
      success: true,
      message: 'Message created successfully',
      data: message
    });

  } catch (error) {
    console.error('❌ RUNCREW MESSAGE CREATE ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create message',
      message: error.message
    });
  }
});

export default router;

