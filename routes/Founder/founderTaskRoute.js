// Founder Tasks Route
// Handles all task-related endpoints for FounderOutlook

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

/**
 * Get all tasks for a founder
 * GET /api/founder/tasks
 * Query: ?status=pending|completed|all
 */
router.get('/tasks', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const firebaseId = req.user?.uid;
    const { status = 'all' } = req.query;

    // Find founder via athlete relation
    const founder = await prisma.founder.findFirst({
      where: { athlete: { firebaseId } }
    });

    if (!founder) {
      return res.status(404).json({
        success: false,
        error: 'Founder not found'
      });
    }

    // Build where clause
    const where = { founderId: founder.id };
    if (status !== 'all') {
      where.status = status;
    }

    const tasks = await prisma.founderTask.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      count: tasks.length,
      tasks
    });
  } catch (error) {
    console.error('❌ FOUNDER TASKS GET:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Create a new task
 * POST /api/founder/tasks
 * Body: { title: string, description?: string, dueDate?: string, priority?: string }
 */
router.post('/tasks', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const firebaseId = req.user?.uid;
    const { title, description, dueDate, priority = 'medium' } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Title is required'
      });
    }

    // Find founder via athlete relation
    const founder = await prisma.founder.findFirst({
      where: { athlete: { firebaseId } }
    });

    if (!founder) {
      return res.status(404).json({
        success: false,
        error: 'Founder not found'
      });
    }

    const task = await prisma.founderTask.create({
      data: {
        founderId: founder.id,
        title: title.trim(),
        description: description?.trim() || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority,
        status: 'pending'
      }
    });

    res.status(201).json({
      success: true,
      task
    });
  } catch (error) {
    console.error('❌ FOUNDER TASK CREATE:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Update a task
 * PUT /api/founder/tasks/:taskId
 * Body: { title?, description?, dueDate?, priority?, status? }
 */
router.put('/tasks/:taskId', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const firebaseId = req.user?.uid;
    const { taskId } = req.params;
    const { title, description, dueDate, priority, status } = req.body;

    // Find founder via athlete relation
    const founder = await prisma.founder.findFirst({
      where: { athlete: { firebaseId } }
    });

    if (!founder) {
      return res.status(404).json({
        success: false,
        error: 'Founder not found'
      });
    }

    // Verify task belongs to founder
    const existingTask = await prisma.founderTask.findFirst({
      where: {
        id: taskId,
        founderId: founder.id
      }
    });

    if (!existingTask) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Build update data
    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) updateData.status = status;

    const task = await prisma.founderTask.update({
      where: { id: taskId },
      data: updateData
    });

    res.json({
      success: true,
      task
    });
  } catch (error) {
    console.error('❌ FOUNDER TASK UPDATE:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Delete a task
 * DELETE /api/founder/tasks/:taskId
 */
router.delete('/tasks/:taskId', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const firebaseId = req.user?.uid;
    const { taskId } = req.params;

    // Find founder via athlete relation
    const founder = await prisma.founder.findFirst({
      where: { athlete: { firebaseId } }
    });

    if (!founder) {
      return res.status(404).json({
        success: false,
        error: 'Founder not found'
      });
    }

    // Verify task belongs to founder and delete
    await prisma.founderTask.deleteMany({
      where: {
        id: taskId,
        founderId: founder.id
      }
    });

    res.json({
      success: true,
      message: 'Task deleted'
    });
  } catch (error) {
    console.error('❌ FOUNDER TASK DELETE:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

