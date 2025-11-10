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
 * 3. Include company relation (direct, no junction table)
 * 4. Return full staff profile with company and role
 * 
 * Note: This is Pattern B - requires middleware. Used for hydration after auth.
 * CompanyStaff is universal personhood - direct companyId and role (no junction table).
 */
router.get('/hydrate', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const firebaseId = req.user?.uid; // From verified Firebase token
    
    if (!firebaseId) {
      console.log('❌ STAFF HYDRATE: No Firebase ID in token');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Firebase token missing or invalid'
      });
    }
    
    console.log('🚀 STAFF HYDRATE: ===== HYDRATING STAFF =====');
    console.log('🚀 STAFF HYDRATE: Firebase ID:', firebaseId);
    
    // Find CompanyStaff with company relation (direct, no junction table)
    const staff = await prisma.companyStaff.findUnique({
      where: { firebaseId },
      include: {
        company: true
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
    console.log('✅ STAFF HYDRATE: Role:', staff.role);
    console.log('✅ STAFF HYDRATE: Company:', staff.company?.companyName || 'None');
    console.log('✅ STAFF HYDRATE: CompanyId:', staff.companyId || 'None');
    
    // Format response - company can be null if staff doesn't have company yet
    const response = {
      success: true,
      staff: {
        id: staff.id,
        firebaseId: staff.firebaseId,
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: staff.email,
        photoURL: staff.photoURL,
        companyId: staff.companyId || null, // Can be null
        role: staff.role,
        startDate: staff.startDate,
        salary: staff.salary,
        company: staff.company ? {
          id: staff.company.id,
          companyName: staff.company.companyName,
          address: staff.company.address,
          city: staff.company.city,
          state: staff.company.state,
          website: staff.company.website,
          description: staff.company.description,
          createdAt: staff.company.createdAt,
          updatedAt: staff.company.updatedAt
        } : null, // Company can be null
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

