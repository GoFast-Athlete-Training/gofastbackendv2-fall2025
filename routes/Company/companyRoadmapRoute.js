// Company Roadmap Route
// Handles all roadmap item endpoints for GoFast Company Stack (single-tenant)

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

/**
 * Get all roadmap items for GoFastCompany (single-tenant)
 * GET /api/company/roadmap
 * Auth: verifyFirebaseToken required
 * Query: ?status=Not Started|In Progress|Done, ?roadmapType=Product|GTM|Operations, ?parentArchitecture=RunCrew|Profile|etc
 */
router.get('/roadmap', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const firebaseId = req.user?.uid; // From verified Firebase token
    const { status, roadmapType, parentArchitecture, itemType } = req.query;

    // Find staff to get company
    const staff = await prisma.companyStaff.findUnique({
      where: { firebaseId },
      include: { company: true }
    });

    if (!staff || !staff.company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found',
        message: 'GoFastCompany record not found. Please create company first.'
      });
    }

    // Build where clause - use goFastCompanyId for GoFastCompany
    const where = { goFastCompanyId: staff.company.id };
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
 * Auth: verifyFirebaseToken required
 */
router.get('/roadmap/:itemId', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const firebaseId = req.user?.uid;
    const { itemId } = req.params;

    // Verify staff and company
    const staff = await prisma.companyStaff.findUnique({
      where: { firebaseId },
      include: { company: true }
    });

    if (!staff || !staff.company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    const item = await prisma.companyRoadmapItem.findFirst({
      where: { 
        id: itemId,
        goFastCompanyId: staff.company.id // Ensure it belongs to this company
      }
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
 * POST /api/company/roadmap
 * Auth: verifyFirebaseToken required
 * Body: { title, itemType?, parentArchitecture?, roadmapType?, category?, whatItDoes?, howItHelps?, fieldsData?, howToGet?, prerequisites?, visual?, hoursEstimated?, targetDate?, priority?, status? }
 */
router.post('/roadmap', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const firebaseId = req.user?.uid;
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

    // Find staff to get company (single-tenant)
    const staff = await prisma.companyStaff.findUnique({
      where: { firebaseId },
      include: { company: true }
    });

    if (!staff || !staff.company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found',
        message: 'GoFastCompany record not found. Please create company first.'
      });
    }

    // Auto-assign orderNumber if not provided
    const lastItem = await prisma.companyRoadmapItem.findFirst({
      where: { goFastCompanyId: staff.company.id },
      orderBy: { orderNumber: 'desc' }
    });

    const orderNumber = lastItem ? (lastItem.orderNumber || 0) + 1 : 1;

    const roadmapItem = await prisma.companyRoadmapItem.create({
      data: {
        goFastCompanyId: staff.company.id, // Use goFastCompanyId for GoFastCompany
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
 * Auth: verifyFirebaseToken required
 * Body: { title?, itemType?, ... any fields to update }
 */
router.put('/roadmap/:itemId', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const firebaseId = req.user?.uid;
    const { itemId } = req.params;
    const updateData = req.body;

    // Verify staff and company
    const staff = await prisma.companyStaff.findUnique({
      where: { firebaseId },
      include: { company: true }
    });

    if (!staff || !staff.company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    // Verify item belongs to this company
    const existingItem = await prisma.companyRoadmapItem.findFirst({
      where: {
        id: itemId,
        goFastCompanyId: staff.company.id
      }
    });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        error: 'Roadmap item not found'
      });
    }

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
 * Auth: verifyFirebaseToken required
 */
router.delete('/roadmap/:itemId', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const firebaseId = req.user?.uid;
    const { itemId } = req.params;

    // Verify staff and company
    const staff = await prisma.companyStaff.findUnique({
      where: { firebaseId },
      include: { company: true }
    });

    if (!staff || !staff.company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found'
      });
    }

    // Verify item belongs to this company
    const existingItem = await prisma.companyRoadmapItem.findFirst({
      where: {
        id: itemId,
        goFastCompanyId: staff.company.id
      }
    });

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        error: 'Roadmap item not found'
      });
    }

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

