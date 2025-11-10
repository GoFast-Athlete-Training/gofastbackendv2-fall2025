// Company Hydrate Route - Pattern B (Hydration)
// GET /api/company/hydrate
// Auth: verifyFirebaseToken middleware required
// Hydrate GoFastCompany with all relations (single company)

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';
import { getGoFastCompanyId } from '../../config/goFastCompanyConfig.js';

const router = express.Router();

/**
 * Hydrate GoFastCompany
 * GET /api/company/hydrate
 * Auth: verifyFirebaseToken required
 * 
 * Flow:
 * 1. Verify Firebase token (middleware)
 * 2. Find CompanyStaff by firebaseId
 * 3. Get GoFastCompany by staff.companyId (single-tenant)
 * 4. Include all relations (roadmapItems, contacts, tasks, etc.)
 * 5. Return full company data
 * 
 * Note: This is Pattern B - requires middleware. Used for hydration after auth.
 * Single-tenant architecture - one GoFastCompany record.
 */
router.get('/hydrate', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const firebaseId = req.user?.uid; // From verified Firebase token
    
    console.log('🚀 COMPANY HYDRATE: ===== HYDRATING COMPANY =====');
    console.log('🚀 COMPANY HYDRATE: Firebase ID:', firebaseId);
    
    // Verify staff exists
    const staff = await prisma.companyStaff.findUnique({
      where: { firebaseId }
    });
    
    if (!staff) {
      console.log('❌ COMPANY HYDRATE: Staff not found');
      return res.status(404).json({
        success: false,
        error: 'Staff not found',
        message: 'CompanyStaff record not found. Please create staff first.'
      });
    }
    
    console.log('✅ COMPANY HYDRATE: Staff found:', staff.id);
    console.log('✅ COMPANY HYDRATE: Staff role:', staff.role);
    
    // SINGLE TENANT: Use hardcoded companyId from config
    const goFastCompanyId = getGoFastCompanyId();
    
    // Get company by hardcoded ID
    const company = await prisma.goFastCompany.findUnique({
      where: { id: goFastCompanyId },
      include: {
        roadmapItems: {
          orderBy: [
            { orderNumber: 'asc' },
            { createdAt: 'desc' }
          ]
        },
        contacts: {
          orderBy: { createdAt: 'desc' },
          take: 100
        },
        tasks: {
          where: {
            companyId: { not: null }
          },
          orderBy: { createdAt: 'desc' },
          take: 100
        },
        productPipelineItems: {
          orderBy: { createdAt: 'desc' },
          take: 100
        },
        financialSpends: {
          orderBy: { date: 'desc' },
          take: 100
        },
        financialProjections: {
          orderBy: { periodStart: 'desc' },
          take: 50
        },
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            photoURL: true
          }
        }
      }
    });
    
    // Company might not exist yet (first-time setup)
    if (!company) {
      console.log('⚠️ COMPANY HYDRATE: Company not found (not created yet)');
      return res.status(200).json({
        success: true,
        company: null,
        staff: {
          id: staff.id,
          firebaseId: staff.firebaseId,
          firstName: staff.firstName,
          lastName: staff.lastName,
          email: staff.email,
          photoURL: staff.photoURL,
          role: staff.role,
          companyId: staff.companyId || null
        },
        message: 'Company not found. Please create company first.'
      });
    }
    
    console.log('✅ COMPANY HYDRATE: Company found:', company.id);
    console.log('✅ COMPANY HYDRATE: Company Name:', company.companyName);
    console.log('✅ COMPANY HYDRATE: Roadmap Items:', company.roadmapItems?.length || 0);
    console.log('✅ COMPANY HYDRATE: Contacts:', company.contacts?.length || 0);
    
    // Format response (removed containerId - not needed)
    const response = {
      success: true,
      company: {
        id: company.id,
        companyName: company.companyName,
        address: company.address,
        city: company.city,
        state: company.state,
        website: company.website,
        description: company.description,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
        roadmapItems: company.roadmapItems || [],
        contacts: company.contacts || [],
        tasks: company.tasks || [],
        productPipelineItems: company.productPipelineItems || [],
        financialSpends: company.financialSpends || [],
        financialProjections: company.financialProjections || [],
        staff: company.staff || []
      },
      staff: {
        id: staff.id,
        firebaseId: staff.firebaseId,
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: staff.email,
        photoURL: staff.photoURL,
        role: staff.role,
        companyId: staff.companyId || company.id
      }
    };
    
    console.log('✅ COMPANY HYDRATE: ===== COMPANY HYDRATED SUCCESSFULLY =====');
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ COMPANY HYDRATE: ===== ERROR =====');
    console.error('❌ COMPANY HYDRATE: Error message:', error.message);
    console.error('❌ COMPANY HYDRATE: Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      error: 'Failed to hydrate company',
      message: error.message
    });
  }
});

export default router;

