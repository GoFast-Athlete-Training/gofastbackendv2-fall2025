// RunCrew Lookup Route
// POST /api/runcrew/lookup
// Looks up a RunCrew by join code via JoinCode registry

import express from 'express';
import { getPrismaClient } from '../../config/database.js';

const router = express.Router();

/**
 * Lookup RunCrew by Join Code
 * POST /api/runcrew/lookup
 * Body: { joinCode: string }
 * 
 * Flow:
 * 1. Normalize join code
 * 2. Find JoinCode record in registry
 * 3. Verify code is active and not expired
 * 4. Return crew preview (name, city, member count)
 */
router.post('/lookup', async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { joinCode } = req.body;

    console.log('🔍 RUNCREW LOOKUP: Looking up join code:', joinCode);

    if (!joinCode) {
      return res.status(400).json({
        success: false,
        error: 'Missing join code',
        message: 'Please provide a join code'
      });
    }

    // Normalize join code
    const normalizedJoinCode = joinCode.toUpperCase().trim();

    if (!normalizedJoinCode) {
      return res.status(400).json({
        success: false,
        error: 'Invalid join code',
        message: 'Join code cannot be empty'
      });
    }

    // Find JoinCode record in registry
    let joinCodeRecord = await prisma.joinCode.findUnique({
      where: { code: normalizedJoinCode },
      include: {
        runCrew: {
          include: {
            _count: {
              select: { memberships: true }
            },
            managers: {
              where: { role: 'admin' },
              take: 1,
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
        }
      }
    });

    // If not in registry, check RunCrew.joinCode (backward compatibility) and upsert
    if (!joinCodeRecord) {
      console.log('⚠️ RUNCREW LOOKUP: Join code not in registry, checking RunCrew.joinCode...');
      
      const runCrew = await prisma.runCrew.findUnique({
        where: { joinCode: normalizedJoinCode },
        include: {
          _count: {
            select: { memberships: true }
          },
          managers: {
            where: { role: 'admin' },
            take: 1,
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

      if (runCrew) {
        console.log('✅ RUNCREW LOOKUP: Found RunCrew by joinCode, creating JoinCode record...');
        
        // Upsert JoinCode record for this crew
        joinCodeRecord = await prisma.joinCode.upsert({
          where: { code: normalizedJoinCode },
          update: {
            isActive: true, // Reactivate if it was deactivated
            expiresAt: null // Remove expiration if it was set
          },
          create: {
            code: normalizedJoinCode,
            runCrewId: runCrew.id,
            isActive: true
          },
          include: {
            runCrew: {
              include: {
                _count: {
                  select: { memberships: true }
                },
                managers: {
                  where: { role: 'admin' },
                  take: 1,
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
            }
          }
        });
        
        console.log('✅ RUNCREW LOOKUP: JoinCode record created/updated:', joinCodeRecord.id);
      } else {
        console.log('❌ RUNCREW LOOKUP: Join code not found in registry or RunCrew:', normalizedJoinCode);
        return res.status(404).json({
          success: false,
          error: 'Invalid or expired join code',
          message: 'Invalid or expired join code'
        });
      }
    }

    // Check if code is active
    if (!joinCodeRecord.isActive) {
      console.log('❌ RUNCREW LOOKUP: Join code is inactive:', normalizedJoinCode);
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired join code',
        message: 'Invalid or expired join code'
      });
    }

    // Check if code is expired
    if (joinCodeRecord.expiresAt && new Date(joinCodeRecord.expiresAt) < new Date()) {
      console.log('❌ RUNCREW LOOKUP: Join code has expired:', normalizedJoinCode);
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired join code',
        message: 'Invalid or expired join code'
      });
    }

    const crew = joinCodeRecord.runCrew;
    const adminManager = crew.managers?.[0]; // Get first admin manager

    // Return crew preview
    res.json({
      success: true,
      id: crew.id,
      name: crew.name,
      description: crew.description || null,
      icon: crew.icon || null,
      logo: crew.logo || null,
      memberCount: crew._count.memberships,
      joinCode: joinCodeRecord.code,
      admin: adminManager ? {
        firstName: adminManager.athlete.firstName,
        lastName: adminManager.athlete.lastName,
        photoURL: adminManager.athlete.photoURL
      } : null
    });

  } catch (error) {
    console.error('❌ RUNCREW LOOKUP: ===== ERROR =====');
    console.error('❌ RUNCREW LOOKUP: Error message:', error.message);
    console.error('❌ RUNCREW LOOKUP: Error stack:', error.stack);

    res.status(500).json({
      success: false,
      error: 'Failed to lookup RunCrew',
      message: error.message
    });
  }
});

export default router;

