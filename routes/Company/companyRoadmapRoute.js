// Company Roadmap Route
// Handles all roadmap item endpoints for CompanyOutlook

import express from 'express';
import { getPrismaClient } from '../../config/database.js';

const router = express.Router();

/**
 * Get all roadmap items for a company
 * GET /api/company/:companyId/roadmap
 * Query: ?status=Not Started|In Progress|Done, ?roadmapType=Product|GTM|Operations, ?parentArchitecture=RunCrew|Profile|etc
 */
router.get('/:companyId/roadmap', async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { companyId } = req.params;
    const { status, roadmapType, parentArchitecture, itemType } = req.query;

    // Build where clause
    const where = { companyId };
    if (status) where.status = status;
    if (roadmapType) where.roadmapType = roadmapType;
    if (parentArchitecture) where.parentArchitecture = parentArchitecture;
    if (itemType) where.itemType = itemType;

    const roadmapItems = await prisma.companyRoadmapItem.findMany({
      where,
      orderBy: [
        { orderNumber: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    res.json({
      success: true,
      count: roadmapItems.length,
      roadmapItems
    });
  } catch (error) {
    console.error('❌ COMPANY ROADMAP GET:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get single roadmap item
 * GET /api/company/roadmap/:itemId
 */
router.get('/roadmap/:itemId', async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { itemId } = req.params;

    const item = await prisma.companyRoadmapItem.findUnique({
      where: { id: itemId }
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Roadmap item not found'
      });
    }

    res.json({
      success: true,
      roadmapItem: item
    });
  } catch (error) {
    console.error('❌ COMPANY ROADMAP GET SINGLE:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Create a new roadmap item
 * POST /api/company/:companyId/roadmap
 * Body: { title, itemType?, parentArchitecture?, roadmapType?, category?, whatItDoes?, howItHelps?, fieldsData?, howToGet?, prerequisites?, visual?, hoursEstimated?, targetDate?, priority?, status? }
 */
router.post('/:companyId/roadmap', async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { companyId } = req.params;
    const {
      title,
      itemType = 'Feature',
      parentArchitecture,
      roadmapType = 'Product',
      category = 'Frontend Demo',
      whatItDoes,
      howItHelps,
      fieldsData,
      howToGet,
      prerequisites,
      visual = 'List',
      hoursEstimated,
      targetDate,
      priority = 'P1',
      status = 'Not Started'
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Title is required'
      });
    }

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    // Auto-assign orderNumber if not provided
    const lastItem = await prisma.companyRoadmapItem.findFirst({
      where: { companyId },
      orderBy: { orderNumber: 'desc' }
    });

    const orderNumber = lastItem ? (lastItem.orderNumber || 0) + 1 : 1;

    const roadmapItem = await prisma.companyRoadmapItem.create({
      data: {
        companyId,
        title,
        itemType,
        parentArchitecture,
        roadmapType,
        category,
        whatItDoes,
        howItHelps,
        fieldsData,
        howToGet,
        prerequisites,
        visual,
        hoursEstimated,
        targetDate: targetDate ? new Date(targetDate) : null,
        priority,
        status,
        orderNumber
      }
    });

    console.log('✅ COMPANY ROADMAP CREATE: Created roadmap item:', roadmapItem.id);

    res.status(201).json({
      success: true,
      message: 'Roadmap item created successfully',
      roadmapItem
    });
  } catch (error) {
    console.error('❌ COMPANY ROADMAP CREATE:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Update a roadmap item
 * PUT /api/company/roadmap/:itemId
 * Body: { title?, itemType?, ... any fields to update }
 */
router.put('/roadmap/:itemId', async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { itemId } = req.params;
    const updateData = req.body;

    // Convert targetDate string to Date if provided
    if (updateData.targetDate) {
      updateData.targetDate = new Date(updateData.targetDate);
    }

    const roadmapItem = await prisma.companyRoadmapItem.update({
      where: { id: itemId },
      data: updateData
    });

    console.log('✅ COMPANY ROADMAP UPDATE: Updated item:', itemId);

    res.json({
      success: true,
      message: 'Roadmap item updated successfully',
      roadmapItem
    });
  } catch (error) {
    console.error('❌ COMPANY ROADMAP UPDATE:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Delete a roadmap item
 * DELETE /api/company/roadmap/:itemId
 */
router.delete('/roadmap/:itemId', async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { itemId } = req.params;

    await prisma.companyRoadmapItem.delete({
      where: { id: itemId }
    });

    console.log('✅ COMPANY ROADMAP DELETE: Deleted item:', itemId);

    res.json({
      success: true,
      message: 'Roadmap item deleted successfully'
    });
  } catch (error) {
    console.error('❌ COMPANY ROADMAP DELETE:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

