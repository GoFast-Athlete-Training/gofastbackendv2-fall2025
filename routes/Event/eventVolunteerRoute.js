import express from 'express';
import { getPrismaClient } from '../../config/database.js';

const router = express.Router();

// POST /api/event-volunteer -> Create a new volunteer signup
router.post('/', async (req, res) => {
  const prisma = getPrismaClient();
  const { eventSlug, name, email, role, notes } = req.body || {};

  // Basic validation
  if (!eventSlug?.trim() || !name?.trim() || !email?.trim() || !role?.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      required: ['eventSlug', 'name', 'email', 'role'],
    });
  }

  try {
    const signup = await prisma.eventVolunteer.create({
      data: {
        eventSlug: eventSlug.trim(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: role.trim(),
        notes: notes?.trim() || null,
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

// GET /api/event-volunteer?eventSlug=xyz -> List signups for an event
router.get('/', async (req, res) => {
  const prisma = getPrismaClient();
  const { eventSlug } = req.query;

  if (!eventSlug?.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Missing required query param: eventSlug',
    });
  }

  try {
    const volunteers = await prisma.eventVolunteer.findMany({
      where: { eventSlug: eventSlug.trim() },
      orderBy: { createdAt: 'desc' },
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



