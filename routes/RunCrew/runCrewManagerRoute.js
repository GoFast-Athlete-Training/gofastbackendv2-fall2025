// RunCrew Manager Route
// POST /api/runcrew/:runCrewId/managers - Upsert manager (assign role)
// DELETE /api/runcrew/:runCrewId/managers/:athleteId - Remove manager

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';
import { RUNCREW_ROLES } from '../../config/runCrewRoleConfig.js';

const router = express.Router();

// Upsert manager (assign/update role)
router.post('/:runCrewId/managers', verifyFirebaseToken, async (req, res) => {
  const prisma = getPrismaClient();
  const { runCrewId } = req.params;
  const { athleteId, role } = req.body;
  const firebaseId = req.user?.uid;

  // Validation
  if (!athleteId || !role) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      required: ['athleteId', 'role']
    });
  }

  // Validate role
  if (role !== RUNCREW_ROLES.ADMIN && role !== RUNCREW_ROLES.MANAGER) {
    return res.status(400).json({
      success: false,
      error: 'Invalid role',
      allowed: [RUNCREW_ROLES.ADMIN, RUNCREW_ROLES.MANAGER]
    });
  }

  try {
    // Get athlete from Firebase ID
    const currentAthlete = await prisma.athlete.findFirst({
      where: { firebaseId }
    });

    if (!currentAthlete) {
      return res.status(404).json({
        success: false,
        error: 'Athlete not found'
      });
    }

    // Verify RunCrew exists
    const runCrew = await prisma.runCrew.findUnique({
      where: { id: runCrewId }
    });

    if (!runCrew) {
      return res.status(404).json({
        success: false,
        error: 'RunCrew not found'
      });
    }

    // Verify current athlete is admin (only admins can assign managers)
    const isCurrentUserAdmin = await prisma.runCrewManager.findFirst({
      where: {
        runCrewId,
        athleteId: currentAthlete.id,
        role: RUNCREW_ROLES.ADMIN
      }
    });

    // Fallback: Check runcrewAdminId
    const isAdminFromField = runCrew.runcrewAdminId === currentAthlete.id;

    if (!isCurrentUserAdmin && !isAdminFromField) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Only admins can assign managers'
      });
    }

    // Verify target athlete exists and is a member
    const targetAthlete = await prisma.athlete.findUnique({
      where: { id: athleteId }
    });

    if (!targetAthlete) {
      return res.status(404).json({
        success: false,
        error: 'Target athlete not found'
      });
    }

    const membership = await prisma.runCrewMembership.findFirst({
      where: {
        runCrewId,
        athleteId
      }
    });

    if (!membership) {
      return res.status(400).json({
        success: false,
        error: 'Athlete must be a member before being assigned a manager role'
      });
    }

    // Upsert manager (create or update role)
    const manager = await prisma.runCrewManager.upsert({
      where: {
        runCrewId_athleteId: {
          runCrewId,
          athleteId
        }
      },
      update: {
        role: role // Update role if exists
      },
      create: {
        runCrewId,
        athleteId,
        role: role
      },
      include: {
        athlete: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            photoURL: true
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      message: `Manager role assigned successfully`,
      data: manager
    });

  } catch (error) {
    console.error('❌ RUNCREW MANAGER UPSERT ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign manager role',
      message: error.message
    });
  }
});

// Remove manager (delete role)
router.delete('/:runCrewId/managers/:athleteId', verifyFirebaseToken, async (req, res) => {
  const prisma = getPrismaClient();
  const { runCrewId, athleteId } = req.params;
  const firebaseId = req.user?.uid;

  try {
    // Get athlete from Firebase ID
    const currentAthlete = await prisma.athlete.findFirst({
      where: { firebaseId }
    });

    if (!currentAthlete) {
      return res.status(404).json({
        success: false,
        error: 'Athlete not found'
      });
    }

    // Verify RunCrew exists
    const runCrew = await prisma.runCrew.findUnique({
      where: { id: runCrewId }
    });

    if (!runCrew) {
      return res.status(404).json({
        success: false,
        error: 'RunCrew not found'
      });
    }

    // Verify current athlete is admin (only admins can remove managers)
    const isCurrentUserAdmin = await prisma.runCrewManager.findFirst({
      where: {
        runCrewId,
        athleteId: currentAthlete.id,
        role: RUNCREW_ROLES.ADMIN
      }
    });

    // Fallback: Check runcrewAdminId
    const isAdminFromField = runCrew.runcrewAdminId === currentAthlete.id;

    if (!isCurrentUserAdmin && !isAdminFromField) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Only admins can remove managers'
      });
    }

    // Prevent removing yourself as admin (must have at least one admin)
    if (athleteId === currentAthlete.id) {
      const adminCount = await prisma.runCrewManager.count({
        where: {
          runCrewId,
          role: RUNCREW_ROLES.ADMIN
        }
      });

      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          error: 'Cannot remove last admin',
          message: 'RunCrew must have at least one admin'
        });
      }
    }

    // Delete manager entry
    await prisma.runCrewManager.delete({
      where: {
        runCrewId_athleteId: {
          runCrewId,
          athleteId
        }
      }
    });

    res.status(200).json({
      success: true,
      message: 'Manager role removed successfully'
    });

  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Manager entry not found'
      });
    }

    console.error('❌ RUNCREW MANAGER DELETE ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove manager role',
      message: error.message
    });
  }
});

export default router;

