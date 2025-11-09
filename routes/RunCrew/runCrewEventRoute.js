// RunCrew Event Route
// POST /api/runcrew/:runCrewId/events
// Creates a new event (admin/manager only - MVP1: admin only)

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

const authorizeCrewAccess = async (prisma, runCrewId, athleteId) => {
  const runCrew = await prisma.runCrew.findUnique({
    where: { id: runCrewId },
    include: {
      managers: true,
      memberships: {
        select: { athleteId: true }
      }
    }
  });

  if (!runCrew) {
    return { authorized: false, reason: 'RunCrew not found', runCrew: null };
  }

  const isAdmin = runCrew.runcrewAdminId === athleteId;
  const isManager = runCrew.managers?.some(manager => manager.athleteId === athleteId);
  const isMember = runCrew.memberships?.some(member => member.athleteId === athleteId);

  return {
    authorized: isAdmin || isManager || isMember,
    canManage: isAdmin || isManager,
    runCrew
  };
};

// Create event (admin/manager/member - crew level gate handled in frontend)
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

    const { authorized, runCrew } = await authorizeCrewAccess(prisma, runCrewId, athlete.id);
    if (!runCrew) {
      return res.status(404).json({ success: false, error: 'RunCrew not found' });
    }

    if (!authorized) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'You must belong to this crew to create events'
      });
    }

    // Parse date
    const eventDate = new Date(date);

    // Create event
    const event = await prisma.runCrewEvent.create({
      data: {
        runCrewId,
        organizerId: athlete.id, // Creator of the event
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

// Get events for a crew
router.get('/:runCrewId/events', verifyFirebaseToken, async (req, res) => {
  const prisma = getPrismaClient();
  const { runCrewId } = req.params;
  const firebaseId = req.user?.uid;

  try {
    const athlete = await prisma.athlete.findFirst({ where: { firebaseId } });
    if (!athlete) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { authorized } = await authorizeCrewAccess(prisma, runCrewId, athlete.id);
    if (!authorized) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const events = await prisma.runCrewEvent.findMany({
      where: { runCrewId },
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
      },
      orderBy: {
        date: 'asc'
      }
    });

    res.json({
      success: true,
      events
    });
  } catch (error) {
    console.error('❌ RUNCREW EVENT LIST ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events',
      message: error.message
    });
  }
});

// Update event
router.patch('/events/:eventId', verifyFirebaseToken, async (req, res) => {
  const prisma = getPrismaClient();
  const { eventId } = req.params;
  const firebaseId = req.user?.uid;
  const {
    title,
    date,
    time,
    location,
    address,
    description,
    eventType
  } = req.body;

  try {
    const athlete = await prisma.athlete.findFirst({ where: { firebaseId } });
    if (!athlete) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const event = await prisma.runCrewEvent.findUnique({
      where: { id: eventId },
      include: {
        runCrew: {
          include: {
            managers: true
          }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const isAdmin = event.runCrew.runcrewAdminId === athlete.id;
    const isManager = event.runCrew.managers?.some(manager => manager.athleteId === athlete.id);
    const isOrganizer = event.organizerId === athlete.id;

    if (!isAdmin && !isManager && !isOrganizer) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const data = {};
    if (title !== undefined) data.title = title.trim();
    if (date !== undefined) {
      const parsedDate = new Date(date);
      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({ success: false, error: 'Invalid date format' });
      }
      data.date = parsedDate;
    }
    if (time !== undefined) data.time = time.trim();
    if (location !== undefined) data.location = location.trim();
    if (address !== undefined) data.address = address?.trim() || null;
    if (description !== undefined) data.description = description?.trim() || null;
    if (eventType !== undefined) data.eventType = eventType?.trim() || null;

    const updatedEvent = await prisma.runCrewEvent.update({
      where: { id: eventId },
      data,
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

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: updatedEvent
    });
  } catch (error) {
    console.error('❌ RUNCREW EVENT UPDATE ERROR:', error);
    res.status(500).json({ success: false, error: 'Failed to update event', message: error.message });
  }
});

// Delete event
router.delete('/events/:eventId', verifyFirebaseToken, async (req, res) => {
  const prisma = getPrismaClient();
  const { eventId } = req.params;
  const firebaseId = req.user?.uid;

  try {
    const athlete = await prisma.athlete.findFirst({ where: { firebaseId } });
    if (!athlete) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const event = await prisma.runCrewEvent.findUnique({
      where: { id: eventId },
      include: {
        runCrew: {
          include: {
            managers: true
          }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const isAdmin = event.runCrew.runcrewAdminId === athlete.id;
    const isManager = event.runCrew.managers?.some(manager => manager.athleteId === athlete.id);
    const isOrganizer = event.organizerId === athlete.id;

    if (!isAdmin && !isManager && !isOrganizer) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    await prisma.runCrewEvent.delete({ where: { id: eventId } });

    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    console.error('❌ RUNCREW EVENT DELETE ERROR:', error);
    res.status(500).json({ success: false, error: 'Failed to delete event', message: error.message });
  }
});

export default router;

