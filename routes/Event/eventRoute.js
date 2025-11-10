import express from 'express';
import { getPrismaClient } from '../../config/database.js';

const router = express.Router();

// GET /api/event -> List all events (filter by isActive)
router.get('/', async (req, res) => {
  const prisma = getPrismaClient();
  const { isActive } = req.query;

  try {
    const where = {};
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
router.get('/:id', async (req, res) => {
  const prisma = getPrismaClient();
  const { id } = req.params;

  try {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        volunteers: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        error: `Event not found with id: ${id}`,
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

// POST /api/event -> Create new event
router.post('/', async (req, res) => {
  const prisma = getPrismaClient();
  const {
    title,
    description,
    date,
    startTime,
    location,
    address,
    stravaRouteUrl,
    stravaRouteId,
    distance,
    eventType,
    isActive,
  } = req.body || {};

  // Basic validation - eventId is primary identifier (auto-generated)
  if (!title?.trim() || !date) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      required: ['title', 'date'],
    });
  }

  try {
    const event = await prisma.event.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        date: new Date(date),
        startTime: startTime?.trim() || null,
        location: location?.trim() || null,
        address: address?.trim() || null,
        stravaRouteUrl: stravaRouteUrl?.trim() || null,
        stravaRouteId: stravaRouteId?.trim() || null,
        distance: distance?.trim() || null,
        eventType: eventType?.trim() || null,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: event,
    });
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
router.put('/:id', async (req, res) => {
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
    stravaRouteId,
    distance,
    eventType,
    isActive,
  } = req.body || {};

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

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (date !== undefined) updateData.date = new Date(date);
    if (startTime !== undefined) updateData.startTime = startTime?.trim() || null;
    if (location !== undefined) updateData.location = location?.trim() || null;
    if (address !== undefined) updateData.address = address?.trim() || null;
    if (stravaRouteUrl !== undefined) updateData.stravaRouteUrl = stravaRouteUrl?.trim() || null;
    if (stravaRouteId !== undefined) updateData.stravaRouteId = stravaRouteId?.trim() || null;
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
router.delete('/:id', async (req, res) => {
  const prisma = getPrismaClient();
  const { id } = req.params;

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

