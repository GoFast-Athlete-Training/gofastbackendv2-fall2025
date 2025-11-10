import express from 'express';
import { getPrismaClient } from '../../config/database.js';

const router = express.Router();

// POST /api/event-volunteer -> Create a new volunteer signup
router.post('/', async (req, res) => {
  const prisma = getPrismaClient();
  const { eventId, name, email, role, notes } = req.body || {};

  // Basic validation - eventId is required (primary identifier)
  if (!eventId?.trim() || !name?.trim() || !email?.trim() || !role?.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      required: ['eventId', 'name', 'email', 'role'],
    });
  }

  try {
    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId.trim() },
      select: { id: true, title: true },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        error: `Event not found with id: ${eventId.trim()}`,
      });
    }

    const signup = await prisma.eventVolunteer.create({
      data: {
        eventId: eventId.trim(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: role.trim(),
        notes: notes?.trim() || null,
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Volunteer signup received',
      data: signup,
    });
  } catch (error) {
    console.error('❌ EVENT VOLUNTEER CREATE ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create volunteer signup',
      message: error.message,
    });
  }
});

// GET /api/event-volunteer?eventId=xyz -> List signups for an event
router.get('/', async (req, res) => {
  const prisma = getPrismaClient();
  const { eventId } = req.query;

  if (!eventId?.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Missing required query param: eventId',
    });
  }

  try {
    // Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId.trim() },
      select: { id: true },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        error: `Event not found with id: ${eventId.trim()}`,
      });
    }

    const volunteers = await prisma.eventVolunteer.findMany({
      where: { eventId: eventId.trim() },
      orderBy: { createdAt: 'desc' },
      include: {
        event: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    res.json({
      success: true,
      count: volunteers.length,
      data: volunteers,
    });
  } catch (error) {
    console.error('❌ EVENT VOLUNTEER LIST ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch volunteer signups',
      message: error.message,
    });
  }
});

export default router;



