// RunCrew Delete Route
// DELETE /api/runcrew/:id - Hard delete RunCrew and all related records (admin only)

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';
import { isAthleteAdmin } from '../../services/runCrewManagerMapService.js';

const router = express.Router();

/**
 * Delete (Archive) RunCrew
 * DELETE /api/runcrew/:id
 * 
 * Flow:
 * 1. Verify Firebase token
 * 2. Find athlete by firebaseId
 * 3. Find RunCrew by id
 * 4. Check if athlete is admin (via RunCrewManager or runcrewAdminId)
 * 5. Hard delete: Delete RunCrew (cascades to all related records via Prisma)
 * 6. Return success
 */
router.delete('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { id: runCrewId } = req.params;
    const firebaseId = req.user?.uid;

    console.log('🗑️ RUNCREW DELETE: Attempting to delete RunCrew:', runCrewId);

    if (!firebaseId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Firebase token required'
      });
    }

    // Find athlete
    const athlete = await prisma.athlete.findFirst({
      where: { firebaseId }
    });

    if (!athlete) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Athlete not found'
      });
    }

    // Find RunCrew with managers
    const runCrew = await prisma.runCrew.findUnique({
      where: { id: runCrewId },
      include: {
        managers: true,
        _count: {
          select: { memberships: true }
        }
      }
    });

    if (!runCrew) {
      return res.status(404).json({
        success: false,
        error: 'RunCrew not found',
        message: 'RunCrew does not exist'
      });
    }

    // Check if athlete is admin
    const isAdmin = isAthleteAdmin(runCrew, athlete.id);

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Only admins can delete RunCrew'
      });
    }

    // Hard delete: Delete the RunCrew (Prisma will cascade delete all related records)
    // This will delete:
    // - RunCrewRun (runs)
    // - RunCrewRunRSVP (RSVPs)
    // - RunCrewAnnouncement (announcements)
    // - RunCrewEvent (events)
    // - RunCrewEventRSVP (event RSVPs)
    // - RunCrewMessage (messages)
    // - RunCrewMembership (memberships)
    // - RunCrewManager (managers)
    // - JoinCode (join codes)
    await prisma.runCrew.delete({
      where: { id: runCrewId }
    });

    console.log('✅ RUNCREW DELETE: RunCrew and all related records deleted successfully:', runCrewId);

    res.json({
      success: true,
      message: 'RunCrew deleted successfully',
      runCrewId: runCrewId
    });

  } catch (error) {
    console.error('❌ RUNCREW DELETE ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete RunCrew',
      message: error.message
    });
  }
});

export default router;

