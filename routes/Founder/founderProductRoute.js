// Founder Product Management Route
// Handles product roadmap, GTM roadmap, and personal roadmap endpoints

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

/**
 * Get product roadmap
 * GET /api/founder/product
 * Query: ?quarter=Q4-2025|Q1-2026|Q2-2026
 */
router.get('/product', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const firebaseId = req.user?.uid;
    const { quarter } = req.query;

    // Find founder by firebaseId
    const founder = await prisma.founder.findUnique({
      where: { firebaseId }
    });

    if (!founder) {
      return res.status(404).json({
        success: false,
        error: 'Founder not found'
      });
    }

    // Build where clause
    const where = { founderId: founder.id, roadmapType: 'product' };
    if (quarter) {
      where.quarter = quarter;
    }

    const items = await prisma.roadmapItem.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      count: items.length,
      items
    });
  } catch (error) {
    console.error('❌ FOUNDER PRODUCT GET:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get GTM roadmap
 * GET /api/founder/gtm
 */
router.get('/gtm', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const firebaseId = req.user?.uid;

    // Find founder by firebaseId
    const founder = await prisma.founder.findUnique({
      where: { firebaseId }
    });

    if (!founder) {
      return res.status(404).json({
        success: false,
        error: 'Founder not found'
      });
    }

    const items = await prisma.roadmapItem.findMany({
      where: {
        founderId: founder.id,
        roadmapType: 'gtm'
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      count: items.length,
      items
    });
  } catch (error) {
    console.error('❌ FOUNDER GTM GET:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get personal roadmap
 * GET /api/founder/personal
 * Query: ?category=Mindset|Habits|Networking
 */
router.get('/personal', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const firebaseId = req.user?.uid;
    const { category } = req.query;

    // Find founder by firebaseId
    const founder = await prisma.founder.findUnique({
      where: { firebaseId }
    });

    if (!founder) {
      return res.status(404).json({
        success: false,
        error: 'Founder not found'
      });
    }

    // Build where clause
    const where = { founderId: founder.id, roadmapType: 'personal' };
    if (category) {
      where.category = category;
    }

    const items = await prisma.roadmapItem.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      count: items.length,
      items
    });
  } catch (error) {
    console.error('❌ FOUNDER PERSONAL GET:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Create roadmap item
 * POST /api/founder/roadmap
 * Body: { roadmapType: 'product'|'gtm'|'personal', quarter?: string, category?: string, title: string, description?: string, status?: string }
 */
router.post('/roadmap', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const firebaseId = req.user?.uid;
    const { roadmapType, quarter, category, title, description, status = 'pending' } = req.body;

    if (!roadmapType || !title) {
      return res.status(400).json({
        success: false,
        error: 'Roadmap type and title are required'
      });
    }

    // Validate roadmap type
    const validTypes = ['product', 'gtm', 'personal'];
    if (!validTypes.includes(roadmapType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid roadmap type',
        validTypes
      });
    }

    // Find founder by firebaseId
    const founder = await prisma.founder.findUnique({
      where: { firebaseId }
    });

    if (!founder) {
      return res.status(404).json({
        success: false,
        error: 'Founder not found'
      });
    }

    const item = await prisma.roadmapItem.create({
      data: {
        founderId: founder.id,
        roadmapType,
        quarter: quarter?.trim() || null,
        category: category?.trim() || null,
        title: title.trim(),
        description: description?.trim() || null,
        status
      }
    });

    res.status(201).json({
      success: true,
      item
    });
  } catch (error) {
    console.error('❌ FOUNDER ROADMAP CREATE:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Update roadmap item
 * PUT /api/founder/roadmap/:itemId
 * Body: { quarter?, category?, title?, description?, status? }
 */
router.put('/roadmap/:itemId', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const firebaseId = req.user?.uid;
    const { itemId } = req.params;
    const { quarter, category, title, description, status } = req.body;

    // Find founder
    const founder = await prisma.founder.findUnique({
      where: { firebaseId }
    });

    if (!founder) {
      return res.status(404).json({
        success: false,
        error: 'Founder not found'
      });
    }

    // Verify item belongs to founder
    const existingItem = await prisma.roadmapItem.findFirst({
      where: {
        id: itemId,
        founderId: founder.id
      }
    });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        error: 'Roadmap item not found'
      });
    }

    // Build update data
    const updateData = {};
    if (quarter !== undefined) updateData.quarter = quarter?.trim() || null;
    if (category !== undefined) updateData.category = category?.trim() || null;
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (status !== undefined) updateData.status = status;

    const item = await prisma.roadmapItem.update({
      where: { id: itemId },
      data: updateData
    });

    res.json({
      success: true,
      item
    });
  } catch (error) {
    console.error('❌ FOUNDER ROADMAP UPDATE:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Delete roadmap item
 * DELETE /api/founder/roadmap/:itemId
 */
router.delete('/roadmap/:itemId', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const firebaseId = req.user?.uid;
    const { itemId } = req.params;

    // Find founder
    const founder = await prisma.founder.findUnique({
      where: { firebaseId }
    });

    if (!founder) {
      return res.status(404).json({
        success: false,
        error: 'Founder not found'
      });
    }

    // Verify item belongs to founder and delete
    await prisma.roadmapItem.deleteMany({
      where: {
        id: itemId,
        founderId: founder.id
      }
    });

    res.json({
      success: true,
      message: 'Roadmap item deleted'
    });
  } catch (error) {
    console.error('❌ FOUNDER ROADMAP DELETE:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

