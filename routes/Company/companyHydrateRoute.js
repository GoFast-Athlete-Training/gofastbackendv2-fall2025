// Company Hydrate Route - Pattern B (Hydration)
// GET /api/company/hydrate
// Auth: verifyFirebaseToken middleware required
// Hydrate GoFastCompany with all relations (single company)

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

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
    
    // Find CompanyStaff first
    const staff = await prisma.companyStaff.findUnique({
      where: { firebaseId },
      include: {
        company: {
          include: {
            roadmapItems: {
              orderBy: [
                { orderNumber: 'asc' },
                { createdAt: 'desc' }
              ]
            },
            contacts: {
              orderBy: { createdAt: 'desc' },
              take: 100 // Limit to recent contacts
            },
            tasks: {
              where: {
                companyId: { not: null } // Company-wide tasks only
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
        }
      }
    });
    
    if (!staff) {
      console.log('❌ COMPANY HYDRATE: Staff not found');
      return res.status(404).json({
        success: false,
        error: 'Staff not found',
        message: 'CompanyStaff record not found. Please create staff first.'
      });
    }
    
    // Company can be null - staff might not have company yet
    // Return staff info even if company doesn't exist (frontend will redirect to company settings)
    if (!staff.company) {
      console.log('⚠️ COMPANY HYDRATE: Company not found for staff');
      return res.status(200).json({
        success: true,
        company: null, // No company yet
        staff: {
          id: staff.id,
          firebaseId: staff.firebaseId,
          firstName: staff.firstName,
          lastName: staff.lastName,
          email: staff.email,
          photoURL: staff.photoURL,
          role: staff.role,
          companyId: null
        },
        message: 'Company not found. Please create company first.'
      });
    }
    
    console.log('✅ COMPANY HYDRATE: Company found:', staff.company.id);
    console.log('✅ COMPANY HYDRATE: Company Name:', staff.company.companyName);
    console.log('✅ COMPANY HYDRATE: Roadmap Items:', staff.company.roadmapItems?.length || 0);
    console.log('✅ COMPANY HYDRATE: Contacts:', staff.company.contacts?.length || 0);
    
    // Format response
    const response = {
      success: true,
      company: {
        id: staff.company.id,
        containerId: staff.company.containerId,
        companyName: staff.company.companyName,
        address: staff.company.address,
        city: staff.company.city,
        state: staff.company.state,
        website: staff.company.website,
        description: staff.company.description,
        createdAt: staff.company.createdAt,
        updatedAt: staff.company.updatedAt,
        roadmapItems: staff.company.roadmapItems || [],
        contacts: staff.company.contacts || [],
        tasks: staff.company.tasks || [],
        productPipelineItems: staff.company.productPipelineItems || [],
        financialSpends: staff.company.financialSpends || [],
        financialProjections: staff.company.financialProjections || [],
        staff: staff.company.staff || []
      },
      staff: {
        id: staff.id,
        firebaseId: staff.firebaseId,
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: staff.email,
        photoURL: staff.photoURL,
        role: staff.role,
        companyId: staff.companyId
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

