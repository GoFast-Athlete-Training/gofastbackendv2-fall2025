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
  const {
    title,
    runType = 'single',
    date,
    startTime,
    timezone,
    meetUpPoint,
    meetUpAddress,
    meetUpPlaceId,
    meetUpLat,
    meetUpLng,
    totalMiles,
    pace,
    stravaMapUrl,
    stravaPolyline, // reserved for future use (ignored for now)
    description,
    recurrenceRule,
    recurrenceEndsOn,
    recurrenceNote,
    // Legacy fallback fields (pre-migration)
    location: legacyLocation,
    address: legacyAddress
  } = req.body;
  const firebaseId = req.user?.uid;

  const normalizedPoint = (meetUpPoint || legacyLocation || '').trim();
  const normalizedAddress = (meetUpAddress || legacyAddress || '')?.trim?.() || null;

  // Validation
  if (!title?.trim() || !date || !startTime?.trim() || !normalizedPoint) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      required: ['title', 'date', 'startTime', 'meetUpPoint']
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
      where: { id: runCrewId },
      include: {
        managers: true
      }
    });

    if (!runCrew) {
      return res.status(404).json({
        success: false,
        error: 'RunCrew not found'
      });
    }

    const isAdmin = runCrew.runcrewAdminId === athlete.id;
    const isManager = runCrew.managers?.some(manager => (
      manager.athleteId === athlete.id && ['admin', 'manager'].includes(manager.role)
    ));

    if (!isAdmin && !isManager) {
      console.warn('🚫 RUN CREATE UNAUTHORIZED', {
        runCrewId,
        requestingAthleteId: athlete.id,
        runcrewAdminId: runCrew.runcrewAdminId,
        managers: runCrew.managers.map(m => ({ athleteId: m.athleteId, role: m.role }))
      });
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Only admins or managers can create runs'
      });
    }

    // Parse date
    const runDate = new Date(date);
    if (Number.isNaN(runDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format'
      });
    }

    let recurrenceEndsDate = null;
    if (recurrenceEndsOn) {
      const parsedEnd = new Date(recurrenceEndsOn);
      recurrenceEndsDate = Number.isNaN(parsedEnd.getTime()) ? null : parsedEnd;
    }

    const parsedMiles = totalMiles ? parseFloat(totalMiles) : null;
    const parsedLat = meetUpLat !== undefined && meetUpLat !== null && meetUpLat !== '' ? parseFloat(meetUpLat) : null;
    const parsedLng = meetUpLng !== undefined && meetUpLng !== null && meetUpLng !== '' ? parseFloat(meetUpLng) : null;

    // Create run
    const run = await prisma.runCrewRun.create({
      data: {
        runCrewId,
        createdById: athlete.id, // Admin who created it
        title: title.trim(),
        runType,
        date: runDate,
        startTime: startTime.trim(),
        timezone: timezone?.trim() || null,
        meetUpPoint: normalizedPoint,
        meetUpAddress: normalizedAddress,
        meetUpPlaceId: meetUpPlaceId?.trim() || null,
        meetUpLat: parsedLat,
        meetUpLng: parsedLng,
        recurrenceRule: recurrenceRule?.trim() || null,
        recurrenceEndsOn: recurrenceEndsDate,
        recurrenceNote: recurrenceNote?.trim() || null,
        totalMiles: Number.isNaN(parsedMiles) ? null : parsedMiles,
        pace: pace?.trim() || null,
        stravaMapUrl: stravaMapUrl?.trim() || null,
        description: description?.trim() || null
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

