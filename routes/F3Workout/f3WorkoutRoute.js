import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

// CORS preflight handling
router.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Max-Age', '86400');
  res.status(200).end();
});

// GET /api/f3workout -> List all workouts (sorted by date desc)
router.get('/', verifyFirebaseToken, async (req, res) => {
  const prisma = getPrismaClient();

  try {
    const workouts = await prisma.workout.findMany({
      orderBy: { date: 'desc' },
      include: {
        warmup: {
          include: {
            moves: true
          }
        },
        thang: {
          include: {
            blocks: {
              include: {
                moves: {
                  orderBy: { order: 'asc' }
                }
              },
              orderBy: { order: 'asc' }
            }
          }
        },
        mary: {
          include: {
            moves: true
          }
        }
      }
    });

    res.json({
      success: true,
      count: workouts.length,
      data: workouts,
    });
  } catch (error) {
    console.error('❌ F3 WORKOUT LIST ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workouts',
      message: error.message,
    });
  }
});

// GET /api/f3workout/:workoutId -> Get single workout by ID
router.get('/:workoutId', verifyFirebaseToken, async (req, res) => {
  const prisma = getPrismaClient();
  const { workoutId } = req.params;

  try {
    const workout = await prisma.workout.findUnique({
      where: { workoutId },
      include: {
        warmup: {
          include: {
            moves: true
          }
        },
        thang: {
          include: {
            blocks: {
              include: {
                moves: {
                  orderBy: { order: 'asc' }
                }
              },
              orderBy: { order: 'asc' }
            }
          }
        },
        mary: {
          include: {
            moves: true
          }
        }
      }
    });

    if (!workout) {
      return res.status(404).json({
        success: false,
        error: `Workout not found with id: ${workoutId}`,
      });
    }

    res.json({
      success: true,
      data: workout,
    });
  } catch (error) {
    console.error('❌ F3 WORKOUT GET ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workout',
      message: error.message,
    });
  }
});

// POST /api/f3workout -> Create new workout with nested objects
router.post('/', verifyFirebaseToken, async (req, res) => {
  const prisma = getPrismaClient();
  const {
    date,
    ao,
    qId,
    warmup,
    thang,
    mary,
    cot,
  } = req.body || {};
  const firebaseId = req.user?.uid;

  // Basic validation
  if (!date || !qId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      required: ['date', 'qId'],
    });
  }

  try {
    // Create workout with nested creates
    const workout = await prisma.workout.create({
      data: {
        date: new Date(date),
        ao: ao?.trim() || null,
        qId: qId.trim(),
        cot: cot?.trim() || null,
        warmup: warmup ? {
          create: {
            moves: {
              create: warmup.moves?.map(move => ({
                type: move.type,
                count: move.count || null,
              })) || []
            }
          }
        } : undefined,
        thang: thang ? {
          create: {
            blocks: {
              create: thang.blocks?.map((block, blockIndex) => ({
                title: block.title?.trim() || null,
                description: block.description?.trim() || null,
                order: block.order !== undefined ? block.order : blockIndex,
                moves: {
                  create: block.moves?.map((move, moveIndex) => ({
                    type: move.type,
                    distanceYards: move.distanceYards || null,
                    reps: move.reps || null,
                    durationSec: move.durationSec || null,
                    notes: move.notes?.trim() || null,
                    order: move.order !== undefined ? move.order : moveIndex,
                  })) || []
                }
              })) || []
            }
          }
        } : undefined,
        mary: mary ? {
          create: {
            moves: {
              create: mary.moves?.map(move => ({
                type: move.type,
                count: move.count || null,
              })) || []
            }
          }
        } : undefined,
      },
      include: {
        warmup: {
          include: {
            moves: true
          }
        },
        thang: {
          include: {
            blocks: {
              include: {
                moves: {
                  orderBy: { order: 'asc' }
                }
              },
              orderBy: { order: 'asc' }
            }
          }
        },
        mary: {
          include: {
            moves: true
          }
        }
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Workout created successfully',
      data: workout,
    });
  } catch (error) {
    console.error('❌ F3 WORKOUT CREATE ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create workout',
      message: error.message,
    });
  }
});

// PUT /api/f3workout/:workoutId -> Update workout
router.put('/:workoutId', verifyFirebaseToken, async (req, res) => {
  const prisma = getPrismaClient();
  const { workoutId } = req.params;
  const {
    date,
    ao,
    qId,
    warmup,
    thang,
    mary,
    cot,
  } = req.body || {};

  try {
    // Check if workout exists
    const existing = await prisma.workout.findUnique({
      where: { workoutId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: `Workout not found with id: ${workoutId}`,
      });
    }

    // Delete existing nested objects if new ones are provided
    if (warmup !== undefined) {
      await prisma.warmUp.deleteMany({
        where: { workoutId }
      });
    }
    if (thang !== undefined) {
      await prisma.thang.deleteMany({
        where: { workoutId }
      });
    }
    if (mary !== undefined) {
      await prisma.mary.deleteMany({
        where: { workoutId }
      });
    }

    // Update workout
    const updateData = {};
    if (date !== undefined) updateData.date = new Date(date);
    if (ao !== undefined) updateData.ao = ao?.trim() || null;
    if (qId !== undefined) updateData.qId = qId.trim();
    if (cot !== undefined) updateData.cot = cot?.trim() || null;

    // Recreate nested objects if provided
    if (warmup) {
      updateData.warmup = {
        create: {
          moves: {
            create: warmup.moves?.map(move => ({
              type: move.type,
              count: move.count || null,
            })) || []
          }
        }
      };
    }
    if (thang) {
      updateData.thang = {
        create: {
          blocks: {
            create: thang.blocks?.map((block, blockIndex) => ({
              title: block.title?.trim() || null,
              description: block.description?.trim() || null,
              order: block.order !== undefined ? block.order : blockIndex,
              moves: {
                create: block.moves?.map((move, moveIndex) => ({
                  type: move.type,
                  distanceYards: move.distanceYards || null,
                  reps: move.reps || null,
                  durationSec: move.durationSec || null,
                  notes: move.notes?.trim() || null,
                  order: move.order !== undefined ? move.order : moveIndex,
                })) || []
              }
            })) || []
          }
        }
      };
    }
    if (mary) {
      updateData.mary = {
        create: {
          moves: {
            create: mary.moves?.map(move => ({
              type: move.type,
              count: move.count || null,
            })) || []
          }
        }
      };
    }

    const workout = await prisma.workout.update({
      where: { workoutId },
      data: updateData,
      include: {
        warmup: {
          include: {
            moves: true
          }
        },
        thang: {
          include: {
            blocks: {
              include: {
                moves: {
                  orderBy: { order: 'asc' }
                }
              },
              orderBy: { order: 'asc' }
            }
          }
        },
        mary: {
          include: {
            moves: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Workout updated successfully',
      data: workout,
    });
  } catch (error) {
    console.error('❌ F3 WORKOUT UPDATE ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update workout',
      message: error.message,
    });
  }
});

// POST /api/f3workout/:workoutId/backblast -> Generate backblast text
router.post('/:workoutId/backblast', verifyFirebaseToken, async (req, res) => {
  const prisma = getPrismaClient();
  const { workoutId } = req.params;

  try {
    const workout = await prisma.workout.findUnique({
      where: { workoutId },
      include: {
        warmup: {
          include: {
            moves: true
          }
        },
        thang: {
          include: {
            blocks: {
              include: {
                moves: {
                  orderBy: { order: 'asc' }
                }
              },
              orderBy: { order: 'asc' }
            }
          }
        },
        mary: {
          include: {
            moves: true
          }
        }
      }
    });

    if (!workout) {
      return res.status(404).json({
        success: false,
        error: `Workout not found with id: ${workoutId}`,
      });
    }

    // Format date
    const dateStr = new Date(workout.date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Build backblast
    let backblast = `Backblast: ${workout.ao || 'AO'} (${dateStr})\n\n`;

    // Warm-Up
    if (workout.warmup && workout.warmup.moves.length > 0) {
      backblast += 'Warm-Up:\n';
      workout.warmup.moves.forEach(move => {
        const countStr = move.count ? ` x${move.count}` : '';
        backblast += `- ${move.type}${countStr}\n`;
      });
      backblast += '\n';
    }

    // The Thang
    if (workout.thang && workout.thang.blocks.length > 0) {
      backblast += 'The Thang:\n';
      workout.thang.blocks.forEach(block => {
        if (block.title) {
          backblast += `\n${block.title}\n`;
        }
        if (block.description) {
          backblast += `${block.description}\n`;
        }
        block.moves.forEach(move => {
          let moveStr = `- ${move.type}`;
          if (move.reps) moveStr += ` x${move.reps}`;
          if (move.distanceYards) moveStr += ` (${move.distanceYards} yards)`;
          if (move.durationSec) moveStr += ` (${move.durationSec}s)`;
          if (move.notes) moveStr += ` - ${move.notes}`;
          backblast += moveStr + '\n';
        });
      });
      backblast += '\n';
    }

    // Mary
    if (workout.mary && workout.mary.moves.length >  0) {
      backblast += 'Mary:\n';
      workout.mary.moves.forEach(move => {
        const countStr = move.count ? ` x${move.count}` : '';
        backblast += `- ${move.type}${countStr}\n`;
      });
      backblast += '\n';
    }

    // COT
    if (workout.cot) {
      backblast += 'COT:\n';
      backblast += workout.cot + '\n';
    }

    res.json({
      success: true,
      data: {
        backblast: backblast.trim(),
      },
    });
  } catch (error) {
    console.error('❌ F3 WORKOUT BACKBLAST ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate backblast',
      message: error.message,
    });
  }
});

export default router;

