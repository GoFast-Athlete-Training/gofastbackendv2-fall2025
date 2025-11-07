// RunCrew Event Route
// POST /api/runcrew/:runCrewId/events
// Creates a new event (admin/manager only - MVP1: admin only)

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

// Create event (admin only - MVP1)
router.post('/:runCrewId/events', verifyFirebaseToken, async (req, res) => {
  const prisma = getPrismaClient();
  const { runCrewId } = req.params;
  const { title, date, time, location, address, description, eventType } = req.body;
  const firebaseId = req.user?.uid;

  // Validation
  if (!title?.trim() || !date || !time?.trim() || !location?.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      required: ['title', 'date', 'time', 'location']
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

    // Verify RunCrew exists and athlete is admin (MVP1: admin only)
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
        message: 'Only admins can create events (MVP1)'
      });
    }

    // Parse date
    const eventDate = new Date(date);

    // Create event
    const event = await prisma.runCrewEvent.create({
      data: {
        runCrewId,
        organizerId: athlete.id, // Admin who created it
        title: title.trim(),
        date: eventDate,
        time: time.trim(),
        location: location.trim(),
        address: address?.trim(),
        description: description?.trim(),
        eventType: eventType?.trim()
      },
      include: {
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoURL: true
          }
        },
        rsvps: {
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
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: event
    });

  } catch (error) {
    console.error('❌ RUNCREW EVENT CREATE ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create event',
      message: error.message
    });
  }
});

export default router;

