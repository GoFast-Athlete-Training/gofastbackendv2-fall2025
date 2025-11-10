import express from 'express';
import { getPrismaClient } from '../../config/database.js';

const router = express.Router();

// POST /api/event-volunteer -> Create a new volunteer signup
router.post('/', async (req, res) => {
  const prisma = getPrismaClient();
  const { eventId, eventSlug, name, email, role, notes } = req.body || {};

  // Basic validation
  if ((!eventId?.trim() && !eventSlug?.trim()) || !name?.trim() || !email?.trim() || !role?.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      required: ['eventId or eventSlug', 'name', 'email', 'role'],
    });
  }

  try {
    let finalEventId = eventId?.trim();
    let finalEventSlug = eventSlug?.trim();

    // If eventSlug provided, look up event to get eventId
    if (!finalEventId && finalEventSlug) {
      const event = await prisma.event.findUnique({
        where: { eventSlug: finalEventSlug },
        select: { id: true },
      });

      if (!event) {
        return res.status(404).json({
          success: false,
          error: `Event not found with slug: ${finalEventSlug}`,
        });
      }

      finalEventId = event.id;
    } else if (finalEventId && !finalEventSlug) {
      // If eventId provided, get eventSlug for backward compatibility
      const event = await prisma.event.findUnique({
        where: { id: finalEventId },
        select: { eventSlug: true },
      });

      if (!event) {
        return res.status(404).json({
          success: false,
          error: `Event not found with id: ${finalEventId}`,
        });
      }

      finalEventSlug = event.eventSlug;
    }

    const signup = await prisma.eventVolunteer.create({
      data: {
        eventId: finalEventId,
        eventSlug: finalEventSlug, // Keep for backward compatibility
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: role.trim(),
        notes: notes?.trim() || null,
      },
      include: {
        event: {
          select: {
            id: true,
            eventSlug: true,
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

// GET /api/event-volunteer?eventId=xyz OR ?eventSlug=xyz -> List signups for an event
router.get('/', async (req, res) => {
  const prisma = getPrismaClient();
  const { eventId, eventSlug } = req.query;

  if (!eventId?.trim() && !eventSlug?.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Missing required query param: eventId or eventSlug',
    });
  }

  try {
    let whereClause = {};

    if (eventId?.trim()) {
      whereClause = { eventId: eventId.trim() };
    } else if (eventSlug?.trim()) {
      // Look up event by slug to get eventId
      const event = await prisma.event.findUnique({
        where: { eventSlug: eventSlug.trim() },
        select: { id: true },
      });

      if (!event) {
        return res.status(404).json({
          success: false,
          error: `Event not found with slug: ${eventSlug.trim()}`,
        });
      }

      whereClause = { eventId: event.id };
    }

    const volunteers = await prisma.eventVolunteer.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        event: {
          select: {
            id: true,
            eventSlug: true,
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



