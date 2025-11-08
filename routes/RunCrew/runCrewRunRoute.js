// RunCrew Run Route
// POST /api/runcrew/:runCrewId/runs
// Creates a new run (admin only - MVP1)

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

// Create run (allows admin, managers, or members)
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

    const runCrew = await prisma.runCrew.findUnique({
      where: { id: runCrewId },
      include: {
        managers: true,
        memberships: {
          select: {
            athleteId: true
          }
        }
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
    const isMember = runCrew.memberships?.some(membership => membership.athleteId === athlete.id);

    if (!isAdmin && !isManager && !isMember) {
      console.warn('🚫 RUN CREATE UNAUTHORIZED', {
        runCrewId,
        requestingAthleteId: athlete.id,
        runcrewAdminId: runCrew.runcrewAdminId,
        managers: runCrew.managers.map(m => ({ athleteId: m.athleteId, role: m.role })),
        membershipCount: runCrew.memberships.length
      });
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'You must belong to this crew to create runs'
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

// Get runs for a crew
router.get('/:runCrewId/runs', verifyFirebaseToken, async (req, res) => {
  const prisma = getPrismaClient();
  const { runCrewId } = req.params;
  const firebaseId = req.user?.uid;

  try {
    const athlete = await prisma.athlete.findFirst({
      where: { firebaseId }
    });

    if (!athlete) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

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
      return res.status(404).json({
        success: false,
        error: 'RunCrew not found'
      });
    }

    const isAdmin = runCrew.runcrewAdminId === athlete.id;
    const isManager = runCrew.managers?.some(manager => manager.athleteId === athlete.id);
    const isMember = runCrew.memberships.some(member => member.athleteId === athlete.id);

    if (!isAdmin && !isManager && !isMember) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const runs = await prisma.runCrewRun.findMany({
      where: { runCrewId },
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
      },
      orderBy: {
        date: 'asc'
      }
    });

    res.json({
      success: true,
      runs
    });
  } catch (error) {
    console.error('❌ RUNCREW RUN LIST ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch runs',
      message: error.message
    });
  }
});

// Update run
router.patch('/runs/:runId', verifyFirebaseToken, async (req, res) => {
  const prisma = getPrismaClient();
  const { runId } = req.params;
  const firebaseId = req.user?.uid;
  const {
    title,
    runType,
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
    description,
    recurrenceRule,
    recurrenceEndsOn,
    recurrenceNote
  } = req.body;

  try {
    const athlete = await prisma.athlete.findFirst({
      where: { firebaseId }
    });

    if (!athlete) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const run = await prisma.runCrewRun.findUnique({
      where: { id: runId },
      include: {
        runCrew: {
          include: {
            managers: true
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

    const isAdmin = run.runCrew.runcrewAdminId === athlete.id;
    const isManager = run.runCrew.managers?.some(manager => manager.athleteId === athlete.id);
    const isCreator = run.createdById === athlete.id;

    if (!isAdmin && !isManager && !isCreator) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const data = {};
    if (title !== undefined) data.title = title.trim();
    if (runType !== undefined) data.runType = runType;
    if (date !== undefined) {
      const parsedDate = new Date(date);
      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({ success: false, error: 'Invalid date format' });
      }
      data.date = parsedDate;
    }
    if (startTime !== undefined) data.startTime = startTime.trim();
    if (timezone !== undefined) data.timezone = timezone?.trim() || null;
    if (meetUpPoint !== undefined) data.meetUpPoint = meetUpPoint.trim();
    if (meetUpAddress !== undefined) data.meetUpAddress = meetUpAddress?.trim() || null;
    if (meetUpPlaceId !== undefined) data.meetUpPlaceId = meetUpPlaceId?.trim() || null;
    if (meetUpLat !== undefined) data.meetUpLat = meetUpLat !== '' ? parseFloat(meetUpLat) : null;
    if (meetUpLng !== undefined) data.meetUpLng = meetUpLng !== '' ? parseFloat(meetUpLng) : null;
    if (totalMiles !== undefined) {
      const parsedMiles = totalMiles !== '' ? parseFloat(totalMiles) : null;
      data.totalMiles = Number.isNaN(parsedMiles) ? null : parsedMiles;
    }
    if (pace !== undefined) data.pace = pace?.trim() || null;
    if (stravaMapUrl !== undefined) data.stravaMapUrl = stravaMapUrl?.trim() || null;
    if (description !== undefined) data.description = description?.trim() || null;
    if (recurrenceRule !== undefined) data.recurrenceRule = recurrenceRule?.trim() || null;
    if (recurrenceNote !== undefined) data.recurrenceNote = recurrenceNote?.trim() || null;
    if (recurrenceEndsOn !== undefined) {
      const parsedEnd = recurrenceEndsOn ? new Date(recurrenceEndsOn) : null;
      if (parsedEnd && Number.isNaN(parsedEnd.getTime())) {
        return res.status(400).json({ success: false, error: 'Invalid recurrence end date' });
      }
      data.recurrenceEndsOn = parsedEnd;
    }

    const updatedRun = await prisma.runCrewRun.update({
      where: { id: runId },
      data,
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

    res.json({
      success: true,
      message: 'Run updated successfully',
      data: updatedRun
    });
  } catch (error) {
    console.error('❌ RUNCREW RUN UPDATE ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update run',
      message: error.message
    });
  }
});

// Delete run
router.delete('/runs/:runId', verifyFirebaseToken, async (req, res) => {
  const prisma = getPrismaClient();
  const { runId } = req.params;
  const firebaseId = req.user?.uid;

  try {
    const athlete = await prisma.athlete.findFirst({
      where: { firebaseId }
    });

    if (!athlete) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const run = await prisma.runCrewRun.findUnique({
      where: { id: runId },
      include: {
        runCrew: {
          include: {
            managers: true
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

    const isAdmin = run.runCrew.runcrewAdminId === athlete.id;
    const isManager = run.runCrew.managers?.some(manager => manager.athleteId === athlete.id);
    const isCreator = run.createdById === athlete.id;

    if (!isAdmin && !isManager && !isCreator) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    await prisma.runCrewRun.delete({
      where: { id: runId }
    });

    res.json({
      success: true,
      message: 'Run deleted successfully'
    });
  } catch (error) {
    console.error('❌ RUNCREW RUN DELETE ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete run',
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

