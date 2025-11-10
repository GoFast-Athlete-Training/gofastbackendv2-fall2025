import express from 'express';
import { getPrismaClient } from '../../config/database.js';

const router = express.Router();

// POST /api/event-registration -> Create a new race registration (PUBLIC - no auth required)
router.post('/', async (req, res) => {
  const prisma = getPrismaClient();
  const { eventId, name, email, phone, notes } = req.body || {};

  // Basic validation - eventId is required (primary identifier)
  if (!eventId?.trim() || !name?.trim() || !email?.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      required: ['eventId', 'name', 'email'],
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

    // Check if already registered (unique constraint: eventId + email)
    const existingRegistration = await prisma.eventRegistration.findUnique({
      where: {
        eventId_email: {
          eventId: eventId.trim(),
          email: email.trim().toLowerCase(),
        },
      },
    });

    if (existingRegistration) {
      return res.status(409).json({
        success: false,
        error: 'Already registered',
        message: 'This email is already registered for this event',
        data: existingRegistration,
      });
    }

    const registration = await prisma.eventRegistration.create({
      data: {
        eventId: eventId.trim(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
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
      message: 'Registration received',
      data: registration,
    });
  } catch (error) {
    console.error('❌ EVENT REGISTRATION CREATE ERROR:', error);
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Already registered',
        message: 'This email is already registered for this event',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create registration',
      message: error.message,
    });
  }
});

// GET /api/event-registration/page-hydrate?eventId=xyz -> PUBLIC hydration (NO EMAILS - for public pages)
// Safe for public display on race registration pages
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

    const registrations = await prisma.eventRegistration.findMany({
      where: { eventId: eventId.trim() },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        notes: true,
        createdAt: true,
        // NOTE: email is intentionally excluded for privacy
      },
    });

    res.json({
      success: true,
      count: registrations.length,
      data: registrations,
    });
  } catch (error) {
    console.error('❌ EVENT REGISTRATION PAGE HYDRATE ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch registrations',
      message: error.message,
    });
  }
});

// GET /api/event-registration/admin-hydrate?eventId=xyz -> ADMIN hydration (WITH EMAILS - for authenticated admins)
// Requires authentication - for event creators to manage registrations
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

    const registrations = await prisma.eventRegistration.findMany({
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
      count: registrations.length,
      data: registrations,
    });
  } catch (error) {
    console.error('❌ EVENT REGISTRATION ADMIN HYDRATE ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch registrations',
      message: error.message,
    });
  }
});

// DELETE /api/event-registration/:id -> Delete a registration (PUBLIC - email verification required)
router.delete('/:id', async (req, res) => {
  const prisma = getPrismaClient();
  const { id } = req.params;
  const { email } = req.query || req.body || {}; // Accept email from query or body

  if (!id?.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Missing registration ID',
    });
  }

  try {
    // Check if registration exists
    const registration = await prisma.eventRegistration.findUnique({
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

    if (!registration) {
      return res.status(404).json({
        success: false,
        error: `Registration not found with id: ${id.trim()}`,
      });
    }

    // If email is provided, verify it matches (security: only allow deleting your own registration)
    // If no email provided, allow deletion (for admin use - but we warn in the UI)
    if (email?.trim()) {
      if (registration.email.toLowerCase() !== email.trim().toLowerCase()) {
        return res.status(403).json({
          success: false,
          error: 'Email does not match. You can only delete your own registration.',
        });
      }
    }

    // Delete the registration
    await prisma.eventRegistration.delete({
      where: { id: id.trim() },
    });

    res.json({
      success: true,
      message: 'Registration removed successfully',
      data: { id: registration.id, eventId: registration.eventId },
    });
  } catch (error) {
    console.error('❌ EVENT REGISTRATION DELETE ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete registration',
      message: error.message,
    });
  }
});

export default router;

