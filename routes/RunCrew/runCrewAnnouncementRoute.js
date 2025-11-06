// RunCrew Announcement Route
// POST /api/runcrew/:runCrewId/announcements
// Creates a new announcement (admin only)

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

// Create announcement (admin only)
router.post('/:runCrewId/announcements', verifyFirebaseToken, async (req, res) => {
  const prisma = getPrismaClient();
  const { runCrewId } = req.params;
  const { title, content } = req.body;
  const firebaseId = req.user?.uid;

  // Validation
  if (!title?.trim() || !content?.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Title and content are required'
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

    // Verify RunCrew exists and athlete is admin
    const runCrew = await prisma.runCrew.findUnique({
      where: { id: runCrewId }
    });

    if (!runCrew) {
      return res.status(404).json({
        success: false,
        error: 'RunCrew not found'
      });
    }

    if (runCrew.runcrewAdminId !== athlete.id) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Only admins can create announcements'
      });
    }

    // Create announcement
    const announcement = await prisma.runCrewAnnouncement.create({
      data: {
        runCrewId,
        authorId: athlete.id,
        title: title.trim(),
        content: content.trim()
      },
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
    });

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      data: announcement
    });

  } catch (error) {
    console.error('❌ RUNCREW ANNOUNCEMENT CREATE ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create announcement',
      message: error.message
    });
  }
});

export default router;

