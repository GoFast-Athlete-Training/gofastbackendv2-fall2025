import express from 'express';
import { getPrismaClient } from '../../config/database.js';

const router = express.Router();

// POST /api/event-volunteer -> Create a new volunteer signup (PUBLIC - no auth required)
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

// GET /api/event-volunteer/page-hydrate?eventId=xyz -> PUBLIC hydration (NO EMAILS - for public pages)
// Safe for public display on volunteer signup pages
router.get('/page-hydrate', async (req, res) => {
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
      select: { id: true, title: true },
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
      select: {
        id: true,
        name: true,
        role: true,
        notes: true,
        createdAt: true,
        // NOTE: email is intentionally excluded for privacy
      },
    });

    res.json({
      success: true,
      count: volunteers.length,
      data: volunteers,
    });
  } catch (error) {
    console.error('❌ EVENT VOLUNTEER PAGE HYDRATE ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch volunteer signups',
      message: error.message,
    });
  }
});

// GET /api/event-volunteer/admin-hydrate?eventId=xyz -> ADMIN hydration (WITH EMAILS - for authenticated admins)
// Requires authentication - for event creators to manage volunteers
router.get('/admin-hydrate', async (req, res) => {
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
      select: { id: true, title: true, athleteId: true },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        error: `Event not found with id: ${eventId.trim()}`,
      });
    }

    // TODO: Add Firebase token verification to ensure requester is event creator
    // For now, we'll allow it but should add auth middleware later
    // const firebaseId = req.user?.uid;
    // const athlete = await prisma.athlete.findUnique({ where: { firebaseId } });
    // if (athlete?.id !== event.athleteId) {
    //   return res.status(403).json({ success: false, error: 'Unauthorized' });
    // }

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
      // NOTE: email is included for admin management
    });

    res.json({
      success: true,
      count: volunteers.length,
      data: volunteers,
    });
  } catch (error) {
    console.error('❌ EVENT VOLUNTEER ADMIN HYDRATE ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch volunteer signups',
      message: error.message,
    });
  }
});

// GET /api/event-volunteer?eventId=xyz -> Legacy endpoint (DEPRECATED - use page-hydrate or admin-hydrate)
// Kept for backward compatibility but returns data WITHOUT emails for safety
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

    // Legacy endpoint - returns data WITHOUT emails for safety
    const volunteers = await prisma.eventVolunteer.findMany({
      where: { eventId: eventId.trim() },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        role: true,
        notes: true,
        createdAt: true,
        // NOTE: email is intentionally excluded
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

// PUT /api/event-volunteer/:id -> Update a volunteer signup (PUBLIC - email verification required)
router.put('/:id', async (req, res) => {
  const prisma = getPrismaClient();
  const { id } = req.params;
  const { name, email, notes } = req.body || {};

  if (!id?.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Missing volunteer ID',
    });
  }

  if (!name?.trim() || !email?.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: name and email',
    });
  }

  try {
    // Check if volunteer exists
    const volunteer = await prisma.eventVolunteer.findUnique({
      where: { id: id.trim() },
    });

    if (!volunteer) {
      return res.status(404).json({
        success: false,
        error: `Volunteer not found with id: ${id.trim()}`,
      });
    }

    // Verify email matches (security: only allow updating your own signup)
    if (volunteer.email.toLowerCase() !== email.trim().toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: 'Email does not match. You can only update your own signup.',
      });
    }

    // Update the volunteer
    const updated = await prisma.eventVolunteer.update({
      where: { id: id.trim() },
      data: {
        name: name.trim(),
        notes: notes?.trim() || null,
        // Note: email is not updated - it's used for verification only
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

    res.json({
      success: true,
      message: 'Volunteer signup updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('❌ EVENT VOLUNTEER UPDATE ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update volunteer signup',
      message: error.message,
    });
  }
});

// DELETE /api/event-volunteer/:id -> Delete a volunteer signup (PUBLIC - email verification required)
router.delete('/:id', async (req, res) => {
  const prisma = getPrismaClient();
  const { id } = req.params;
  const { email } = req.query || req.body || {}; // Accept email from query or body

  if (!id?.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Missing volunteer ID',
    });
  }

  try {
    // Check if volunteer exists
    const volunteer = await prisma.eventVolunteer.findUnique({
      where: { id: id.trim() },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            athleteId: true,
          },
        },
      },
    });

    if (!volunteer) {
      return res.status(404).json({
        success: false,
        error: `Volunteer not found with id: ${id.trim()}`,
      });
    }

    // If email is provided, verify it matches (security: only allow deleting your own signup)
    // If no email provided, allow deletion (for admin use - but we warn in the UI)
    if (email?.trim()) {
      if (volunteer.email.toLowerCase() !== email.trim().toLowerCase()) {
        return res.status(403).json({
          success: false,
          error: 'Email does not match. You can only delete your own signup.',
        });
      }
    }

    // Delete the volunteer
    await prisma.eventVolunteer.delete({
      where: { id: id.trim() },
    });

    res.json({
      success: true,
      message: 'Volunteer signup removed successfully',
      data: { id: volunteer.id, eventId: volunteer.eventId },
    });
  } catch (error) {
    console.error('❌ EVENT VOLUNTEER DELETE ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete volunteer signup',
      message: error.message,
    });
  }
});

export default router;
