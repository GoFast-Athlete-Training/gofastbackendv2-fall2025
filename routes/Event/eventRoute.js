import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

// CORS preflight handling for event routes
router.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Max-Age', '86400');
  res.status(200).end();
});

// GET /api/event -> List events (filter by athleteId and isActive)
// Frontend sends athleteId from localStorage (hydrated from welcome screen)
// Backend verifies athleteId matches authenticated Firebase user
router.get('/', verifyFirebaseToken, async (req, res) => {
  const prisma = getPrismaClient();
  const { isActive, athleteId } = req.query; // athleteId from localStorage (frontend sends it)
  const firebaseId = req.user?.uid; // From verified Firebase token (axios sends it automatically)

  try {
    if (!athleteId) {
      return res.status(400).json({
        success: false,
        error: 'Missing athleteId',
        message: 'athleteId is required (from localStorage)'
      });
    }

    // Verify athleteId belongs to authenticated Firebase user
    const athlete = await prisma.athlete.findFirst({
      where: {
        id: athleteId,
        firebaseId: firebaseId // Verify athleteId matches authenticated user
      }
    });

    if (!athlete) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Athlete ID does not match authenticated user'
      });
    }

    // Build where clause - filter by athleteId
    const where = {
      athleteId: athleteId // Only show events created by this athlete
    };

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        volunteers: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    res.json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    console.error('❌ EVENT LIST ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events',
      message: error.message,
    });
  }
});

// GET /api/event/:id -> Get single event by ID
// Axios automatically sends Firebase token
router.get('/:id', verifyFirebaseToken, async (req, res) => {
  const prisma = getPrismaClient();
  const { id } = req.params;
  const firebaseId = req.user?.uid; // From verified Firebase token (axios sends it)

  try {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        volunteers: {
          orderBy: { createdAt: 'desc' },
        },
        athlete: {
          select: {
            id: true,
            firebaseId: true
          }
        }
      },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        error: `Event not found with id: ${id}`,
      });
    }

    // Verify event belongs to authenticated athlete (verify athleteId matches firebaseId)
    const athlete = await prisma.athlete.findFirst({
      where: {
        id: event.athleteId,
        firebaseId: firebaseId
      }
    });

    if (!athlete) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Cannot access event created by another athlete'
      });
    }

    res.json({
      success: true,
      data: event,
    });
  } catch (error) {
    console.error('❌ EVENT GET ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event',
      message: error.message,
    });
  }
});

// POST /api/event -> Create new event (with upsert support)
// Frontend sends athleteId from localStorage (hydrated from welcome screen)
// Backend verifies athleteId matches authenticated Firebase user
router.post('/', verifyFirebaseToken, async (req, res) => {
  const prisma = getPrismaClient();
  const {
    title,
    description,
    date,
    startTime,
    location,
    address,
    stravaRouteUrl,
    distance,
    eventType,
    isActive,
    athleteId, // From localStorage (frontend sends it)
  } = req.body || {};
  const firebaseId = req.user?.uid; // From verified Firebase token (axios sends it, middleware extracts it)

  // Basic validation
  if (!title?.trim() || !date) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      required: ['title', 'date'],
    });
  }

  if (!athleteId) {
    return res.status(400).json({
      success: false,
      error: 'Missing athleteId',
      message: 'athleteId is required (from localStorage)'
    });
  }

  try {
    // Verify athleteId belongs to authenticated Firebase user
    const athlete = await prisma.athlete.findFirst({
      where: {
        id: athleteId,
        firebaseId: firebaseId // Verify athleteId matches authenticated user
      }
    });

    if (!athlete) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Athlete ID does not match authenticated user'
      });
    }

    // UPSERT: Check if event exists with same athleteId + title + date
    const eventDate = new Date(date);
    const startOfDay = new Date(eventDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(eventDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingEvent = await prisma.event.findFirst({
      where: {
        athleteId: athleteId, // Use athleteId from request body (from localStorage)
        title: title.trim(),
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    if (existingEvent) {
      // UPDATE existing event
      const updateData = {
        description: description?.trim() || null,
        startTime: startTime?.trim() || null,
        location: location?.trim() || null,
        address: address?.trim() || null,
        stravaRouteUrl: stravaRouteUrl?.trim() || null,
        distance: distance?.trim() || null,
        eventType: eventType?.trim() || null,
        isActive: isActive !== undefined ? isActive : existingEvent.isActive,
        updatedAt: new Date()
      };

      const event = await prisma.event.update({
        where: { id: existingEvent.id },
        data: updateData,
      });

      return res.json({
        success: true,
        message: 'Event updated successfully (upsert)',
        data: event,
        wasUpdated: true
      });
    } else {
      // CREATE new event
      const event = await prisma.event.create({
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          date: eventDate,
          startTime: startTime?.trim() || null,
          location: location?.trim() || null,
          address: address?.trim() || null,
          stravaRouteUrl: stravaRouteUrl?.trim() || null,
          distance: distance?.trim() || null,
          eventType: eventType?.trim() || null,
          isActive: isActive !== undefined ? isActive : true,
          athleteId: athleteId, // Use athleteId from request body (from localStorage, already verified)
        },
      });

      return res.status(201).json({
        success: true,
        message: 'Event created successfully',
        data: event,
        wasUpdated: false
      });
    }
  } catch (error) {
    console.error('❌ EVENT CREATE ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create event',
      message: error.message,
    });
  }
});

// PUT /api/event/:id -> Update event
// Axios automatically sends Firebase token
router.put('/:id', verifyFirebaseToken, async (req, res) => {
  const prisma = getPrismaClient();
  const { id } = req.params;
  const {
    title,
    description,
    date,
    startTime,
    location,
    address,
    stravaRouteUrl,
    distance,
    eventType,
    isActive,
  } = req.body || {};
  const firebaseId = req.user?.uid; // From verified Firebase token (axios sends it)

  try {
    // Check if event exists
    const existing = await prisma.event.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: `Event not found with id: ${id}`,
      });
    }

    // Verify event belongs to authenticated athlete (verify athleteId matches firebaseId)
    const athlete = await prisma.athlete.findFirst({
      where: {
        id: existing.athleteId,
        firebaseId: firebaseId
      }
    });

    if (!athlete) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Cannot update event created by another athlete'
      });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (date !== undefined) updateData.date = new Date(date);
    if (startTime !== undefined) updateData.startTime = startTime?.trim() || null;
    if (location !== undefined) updateData.location = location?.trim() || null;
    if (address !== undefined) updateData.address = address?.trim() || null;
    if (stravaRouteUrl !== undefined) updateData.stravaRouteUrl = stravaRouteUrl?.trim() || null;
    if (distance !== undefined) updateData.distance = distance?.trim() || null;
    if (eventType !== undefined) updateData.eventType = eventType?.trim() || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const event = await prisma.event.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: event,
    });
  } catch (error) {
    console.error('❌ EVENT UPDATE ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update event',
      message: error.message,
    });
  }
});

// DELETE /api/event/:id -> Delete event (soft delete by setting isActive=false)
// Axios automatically sends Firebase token
router.delete('/:id', verifyFirebaseToken, async (req, res) => {
  const prisma = getPrismaClient();
  const { id } = req.params;
  const firebaseId = req.user?.uid; // From verified Firebase token (axios sends it)

  try {
    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        error: `Event not found with id: ${id}`,
      });
    }

    // Verify event belongs to authenticated athlete (verify athleteId matches firebaseId)
    const athlete = await prisma.athlete.findFirst({
      where: {
        id: event.athleteId,
        firebaseId: firebaseId
      }
    });

    if (!athlete) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Cannot delete event created by another athlete'
      });
    }

    // Soft delete by setting isActive=false
    const updated = await prisma.event.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: 'Event deactivated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('❌ EVENT DELETE ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete event',
      message: error.message,
    });
  }
});

export default router;
