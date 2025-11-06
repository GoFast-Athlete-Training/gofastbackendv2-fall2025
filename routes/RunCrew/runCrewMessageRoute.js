// RunCrew Message Route
// POST /api/runcrew/:runCrewId/messages
// Creates a new message in the RunCrew chat (simple text, real-time via socket)

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

// Create message
router.post('/:runCrewId/messages', verifyFirebaseToken, async (req, res) => {
  const prisma = getPrismaClient();
  const { runCrewId } = req.params;
  const { content } = req.body;
  const firebaseId = req.user?.uid;

  // Validation
  if (!content?.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Message content is required'
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
        content: content.trim()
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

