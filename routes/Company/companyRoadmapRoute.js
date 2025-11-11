// Company Roadmap Route
// Handles all roadmap item endpoints for GoFast Company Stack (single-tenant)

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';
import { getGoFastCompanyId } from '../../config/goFastCompanyConfig.js';

const router = express.Router();

/**
 * Get all roadmap items for GoFastCompany (single-tenant)
 * GET /api/company/roadmap
 * Auth: verifyFirebaseToken required
 * Query: ?status=Not Started|In Progress|Done, ?primaryRepo=mvp1|eventslanding|etc, ?itemType=Dev Work|Product Milestone, ?category=Core Feature|Frontend Demo|etc
 */
router.get('/roadmap', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const firebaseId = req.user?.uid; // From verified Firebase token
    const { status, primaryRepo, itemType, category } = req.query;

    // Verify staff exists
    const staff = await prisma.companyStaff.findUnique({
      where: { firebaseId }
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff not found',
        message: 'CompanyStaff record not found.'
      });
    }

    // SINGLE TENANT: Use hardcoded companyId from config
    const goFastCompanyId = getGoFastCompanyId();

    // Build where clause - use goFastCompanyId for GoFastCompany
    const where = { goFastCompanyId };
    if (status) where.status = status;
    if (primaryRepo) where.primaryRepo = primaryRepo;
    if (itemType) where.itemType = itemType;
    if (category) where.category = category;

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

    // Verify staff exists
    const staff = await prisma.companyStaff.findUnique({
      where: { firebaseId }
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff not found'
      });
    }

    // SINGLE TENANT: Use hardcoded companyId from config
    const goFastCompanyId = getGoFastCompanyId();

    const item = await prisma.companyRoadmapItem.findFirst({
      where: { 
        id: itemId,
        goFastCompanyId // Ensure it belongs to this company
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
 * Body: { title, itemType?, primaryRepo?, category?, whatItDoes?, howItHelps?, quickModelScaffolding?, relationalMapping?, apiIntegration?, prerequisites?, hoursEstimated?, targetDate?, priority?, status? }
 * Note: Supports backward compatibility with old field names (parentArchitecture -> primaryRepo, fieldsData -> quickModelScaffolding, howToGet -> apiIntegration)
 */
router.post('/roadmap', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const firebaseId = req.user?.uid;
    const {
      title,
      itemType = 'Dev Work',
      primaryRepo,
      parentArchitecture, // Backward compatibility
      category = 'Core Feature',
      whatItDoes,
      howItHelps,
      quickModelScaffolding,
      fieldsData, // Backward compatibility
      relationalMapping,
      apiIntegration,
      howToGet, // Backward compatibility
      prerequisites,
      hoursEstimated,
      targetDate,
      priority = 'Enhanced User Feature',
      status = 'Not Started'
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Title is required'
      });
    }

    // Verify staff exists
    const staff = await prisma.companyStaff.findUnique({
      where: { firebaseId }
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff not found',
        message: 'CompanyStaff record not found.'
      });
    }

    // SINGLE TENANT: Use hardcoded companyId from config
    const goFastCompanyId = getGoFastCompanyId();

    // Auto-assign orderNumber if not provided
    const lastItem = await prisma.companyRoadmapItem.findFirst({
      where: { goFastCompanyId },
      orderBy: { orderNumber: 'desc' }
    });

    const orderNumber = lastItem ? (lastItem.orderNumber || 0) + 1 : 1;

    const roadmapItem = await prisma.companyRoadmapItem.create({
      data: {
        goFastCompanyId, // Use hardcoded companyId from config
        title,
        itemType,
        primaryRepo: primaryRepo || parentArchitecture || null, // Support backward compatibility
        category,
        whatItDoes,
        howItHelps,
        quickModelScaffolding: quickModelScaffolding || fieldsData || null, // Support backward compatibility
        relationalMapping: relationalMapping || null,
        apiIntegration: apiIntegration || howToGet || null, // Support backward compatibility
        prerequisites,
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

    // Verify staff exists
    const staff = await prisma.companyStaff.findUnique({
      where: { firebaseId }
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff not found'
      });
    }

    // SINGLE TENANT: Use hardcoded companyId from config
    const goFastCompanyId = getGoFastCompanyId();

    // Verify item belongs to this company
    const existingItem = await prisma.companyRoadmapItem.findFirst({
      where: {
        id: itemId,
        goFastCompanyId
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

    // Verify staff exists
    const staff = await prisma.companyStaff.findUnique({
      where: { firebaseId }
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff not found'
      });
    }

    // SINGLE TENANT: Use hardcoded companyId from config
    const goFastCompanyId = getGoFastCompanyId();

    // Verify item belongs to this company
    const existingItem = await prisma.companyRoadmapItem.findFirst({
      where: {
        id: itemId,
        goFastCompanyId
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

