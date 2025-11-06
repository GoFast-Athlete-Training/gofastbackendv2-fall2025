// RunCrew Run Route
// POST /api/runcrew/:runCrewId/runs
// Creates a new run (admin only - MVP1)

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

// Create run (admin only - MVP1)
router.post('/:runCrewId/runs', verifyFirebaseToken, async (req, res) => {
  const prisma = getPrismaClient();
  const { runCrewId } = req.params;
  const { title, date, startTime, location, address, totalMiles, pace, stravaMapUrl, description } = req.body;
  const firebaseId = req.user?.uid;

  // Validation
  if (!title?.trim() || !date || !startTime?.trim() || !location?.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      required: ['title', 'date', 'startTime', 'location']
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
        message: 'Only admins can create runs (MVP1)'
      });
    }

    // Parse date
    const runDate = new Date(date);

    // Create run
    const run = await prisma.runCrewRun.create({
      data: {
        runCrewId,
        createdById: athlete.id, // Admin who created it
        title: title.trim(),
        date: runDate,
        startTime: startTime.trim(),
        location: location.trim(),
        address: address?.trim(),
        totalMiles: totalMiles ? parseFloat(totalMiles) : null,
        pace: pace?.trim(),
        stravaMapUrl: stravaMapUrl?.trim(),
        description: description?.trim()
      },
      include: {
        createdBy: {
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
      message: 'Run created successfully',
      data: run
    });

  } catch (error) {
    console.error('❌ RUNCREW RUN CREATE ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create run',
      message: error.message
    });
  }
});

// RSVP to run
router.post('/runs/:runId/rsvp', verifyFirebaseToken, async (req, res) => {
  const prisma = getPrismaClient();
  const { runId } = req.params;
  const { status } = req.body; // "going", "maybe", "not-going"
  const firebaseId = req.user?.uid;

  // Validation
  if (!status || !['going', 'maybe', 'not-going'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status',
      validStatuses: ['going', 'maybe', 'not-going']
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

    // Verify run exists and athlete is a member of the RunCrew
    const run = await prisma.runCrewRun.findUnique({
      where: { id: runId },
      include: {
        runCrew: {
          include: {
            memberships: {
              where: {
                athleteId: athlete.id
              }
            }
          }
        }
      }
    });

    if (!run) {
      return res.status(404).json({
        success: false,
        error: 'Run not found'
      });
    }

    if (run.runCrew.memberships.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'You must be a member of this RunCrew to RSVP'
      });
    }

    // Upsert RSVP
    const rsvp = await prisma.runCrewRunRSVP.upsert({
      where: {
        runId_athleteId: {
          runId,
          athleteId: athlete.id
        }
      },
      update: {
        status
      },
      create: {
        runId,
        athleteId: athlete.id,
        status
      },
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
    });

    res.json({
      success: true,
      message: 'RSVP updated successfully',
      data: rsvp
    });

  } catch (error) {
    console.error('❌ RUNCREW RUN RSVP ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update RSVP',
      message: error.message
    });
  }
});

export default router;

