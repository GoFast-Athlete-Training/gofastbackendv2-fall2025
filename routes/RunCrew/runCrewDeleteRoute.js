// RunCrew Delete Route
// DELETE /api/runcrew/:id - Soft delete (archive) RunCrew (admin only)

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
 * 5. Soft delete: Set isArchived = true, archivedAt = now
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

    // Check if already archived
    if (runCrew.isArchived) {
      return res.status(400).json({
        success: false,
        error: 'Already archived',
        message: 'This RunCrew has already been deleted'
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

    // Soft delete: Archive the RunCrew
    await prisma.runCrew.update({
      where: { id: runCrewId },
      data: {
        isArchived: true,
        archivedAt: new Date()
      }
    });

    console.log('✅ RUNCREW DELETE: RunCrew archived successfully:', runCrewId);

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

