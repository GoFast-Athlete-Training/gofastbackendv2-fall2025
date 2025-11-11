// RunCrew Update Route
// PATCH /api/runcrew/:id - Update RunCrew name and description (admin only)

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';
import { isAthleteAdmin } from '../../services/runCrewManagerMapService.js';

const router = express.Router();

/**
 * Update RunCrew
 * PATCH /api/runcrew/:id
 * 
 * Flow:
 * 1. Verify Firebase token
 * 2. Find athlete by firebaseId
 * 3. Find RunCrew by id
 * 4. Check if athlete is admin
 * 5. Update name and/or description
 * 6. Return updated RunCrew
 */
router.patch('/:id', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { id: runCrewId } = req.params;
    const firebaseId = req.user?.uid;
    const { name, description, logo, icon } = req.body;

    console.log('✏️ RUNCREW UPDATE: Updating RunCrew:', runCrewId);

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
        managers: true
      }
    });

    if (!runCrew) {
      return res.status(404).json({
        success: false,
        error: 'RunCrew not found',
        message: 'RunCrew does not exist'
      });
    }

    // Check if archived
    if (runCrew.isArchived) {
      return res.status(400).json({
        success: false,
        error: 'Cannot update archived crew',
        message: 'This RunCrew has been deleted'
      });
    }

    // Check if athlete is admin
    const isAdmin = isAthleteAdmin(runCrew, athlete.id);

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'Only admins can update RunCrew'
      });
    }

    // Build update data
    const updateData = {};
    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          error: 'Invalid name',
          message: 'Name cannot be empty'
        });
      }
      updateData.name = trimmedName;
    }
    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }
    if (logo !== undefined) {
      updateData.logo = logo?.trim() || null;
    }
    if (icon !== undefined) {
      updateData.icon = icon?.trim() || null;
    }

    // If no fields to update, return error
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update',
        message: 'Provide at least one field to update (name or description)'
      });
    }

    // Update RunCrew
    const updatedCrew = await prisma.runCrew.update({
      where: { id: runCrewId },
      data: updateData,
      include: {
        managers: {
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
        },
        memberships: {
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
        }
      }
    });

    console.log('✅ RUNCREW UPDATE: RunCrew updated successfully:', runCrewId);

    res.json({
      success: true,
      message: 'RunCrew updated successfully',
      runCrew: updatedCrew
    });

  } catch (error) {
    console.error('❌ RUNCREW UPDATE ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update RunCrew',
      message: error.message
    });
  }
});

export default router;

