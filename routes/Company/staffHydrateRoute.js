// Staff Hydrate Route - Pattern B (Hydration)
// GET /api/staff/hydrate
// Auth: verifyFirebaseToken middleware required
// Hydrate CompanyStaff with full data including company and roles

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

/**
 * Hydrate CompanyStaff
 * GET /api/staff/hydrate
 * Auth: verifyFirebaseToken required
 * 
 * Flow:
 * 1. Verify Firebase token (middleware)
 * 2. Find CompanyStaff by firebaseId
 * 3. Include companyRoles with company data
 * 4. Return full staff profile
 * 
 * Note: This is Pattern B - requires middleware. Used for hydration after auth.
 */
router.get('/hydrate', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const firebaseId = req.user?.uid; // From verified Firebase token
    
    console.log('🚀 STAFF HYDRATE: ===== HYDRATING STAFF =====');
    console.log('🚀 STAFF HYDRATE: Firebase ID:', firebaseId);
    
    // Find CompanyStaff with all relations
    const staff = await prisma.companyStaff.findUnique({
      where: { firebaseId },
      include: {
        companyRoles: {
          include: {
            company: true
          },
          orderBy: {
            joinedAt: 'desc'
          }
        }
      }
    });
    
    if (!staff) {
      console.log('❌ STAFF HYDRATE: Staff not found');
      return res.status(404).json({
        success: false,
        error: 'Staff not found',
        message: 'CompanyStaff record not found. Please create staff first.'
      });
    }
    
    console.log('✅ STAFF HYDRATE: Staff found:', staff.id);
    console.log('✅ STAFF HYDRATE: Company roles:', staff.companyRoles?.length || 0);
    
    // Format response
    const response = {
      success: true,
      staff: {
        id: staff.id,
        firebaseId: staff.firebaseId,
        name: staff.name,
        email: staff.email,
        photoURL: staff.photoURL,
        companyRoles: staff.companyRoles.map(role => ({
          id: role.id,
          role: role.role,
          department: role.department,
          joinedAt: role.joinedAt,
          company: {
            id: role.company.id,
            containerId: role.company.containerId,
            companyName: role.company.companyName,
            address: role.company.address,
            city: role.company.city,
            state: role.company.state,
            website: role.company.website,
            description: role.company.description,
            createdAt: role.company.createdAt,
            updatedAt: role.company.updatedAt
          }
        })),
        createdAt: staff.createdAt,
        updatedAt: staff.updatedAt
      }
    };
    
    console.log('✅ STAFF HYDRATE: ===== STAFF HYDRATED SUCCESSFULLY =====');
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ STAFF HYDRATE: ===== ERROR =====');
    console.error('❌ STAFF HYDRATE: Error message:', error.message);
    console.error('❌ STAFF HYDRATE: Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      error: 'Failed to hydrate staff',
      message: error.message
    });
  }
});

export default router;

