// Company Create Route - Pattern C (Protected Entity Creation)
// POST /api/company/create
// Auth: verifyFirebaseToken middleware required
// Create GoFastCompany record (founder only - during onboarding)

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

const router = express.Router();

/**
 * Create GoFastCompany
 * POST /api/company/create
 * Auth: verifyFirebaseToken required
 * Body: { companyName, address, city, state, website, description }
 * 
 * Flow:
 * 1. Verify Firebase token (middleware)
 * 2. Find CompanyStaff by firebaseId
 * 3. Check if staff has founder role (direct field, no junction table)
 * 4. Find existing GoFastCompany (should only be one)
 * 5. If exists, update it
 * 6. If not exists, create it
 * 7. Ensure staff.companyId is set (direct relation, no junction table)
 * 
 * Note: This is Pattern C - requires middleware. Only founder can create company.
 * CompanyStaff is universal personhood - direct companyId and role (no junction table).
 */
router.post('/create', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const firebaseId = req.user?.uid; // From verified Firebase token
    const { companyName, address, city, state, website, description } = req.body;
    
    console.log('🚀 COMPANY CREATE: ===== CREATING COMPANY =====');
    console.log('🚀 COMPANY CREATE: Firebase ID:', firebaseId);
    console.log('🚀 COMPANY CREATE: Company Name:', companyName);
    
    // Find CompanyStaff
    const staff = await prisma.companyStaff.findUnique({
      where: { firebaseId },
      include: {
        company: true
      }
    });
    
    if (!staff) {
      console.log('❌ COMPANY CREATE: Staff not found');
      return res.status(404).json({
        success: false,
        error: 'Staff not found',
        message: 'CompanyStaff record not found. Please create staff first.'
      });
    }
    
    console.log('✅ COMPANY CREATE: Staff found:', staff.id);
    console.log('✅ COMPANY CREATE: Staff role:', staff.role);
    
    // Check if staff has founder role (direct field, no junction table)
    // If no role exists and this is the first staff member, auto-assign founder role
    const existingCompany = await prisma.goFastCompany.findFirst();
    
    if (!staff.role || staff.role !== 'founder') {
      if (!existingCompany) {
        // First user - auto-assign founder role
        console.log('📝 COMPANY CREATE: First user - auto-assigning founder role');
        await prisma.companyStaff.update({
          where: { id: staff.id },
          data: { role: 'founder' }
        });
        staff.role = 'founder';
      } else {
        // Company exists but user doesn't have founder role
        console.log('❌ COMPANY CREATE: User does not have founder role');
        return res.status(403).json({
          success: false,
          error: 'Unauthorized',
          message: 'Only founders can create company details'
        });
      }
    }
    
    // Find or create GoFastCompany
    let company = await prisma.goFastCompany.findFirst();
    
    const companyData = {
      companyName: companyName || 'GoFast Inc',
      address: address || '2604 N. George Mason Dr.',
      city: city || 'Arlington',
      state: state || 'VA',
      website: website || 'gofastcrushgoals.com',
      description: description || null
    };
    
    if (company) {
      // Update existing company
      console.log('📝 COMPANY CREATE: Updating existing company:', company.id);
      company = await prisma.goFastCompany.update({
        where: { id: company.id },
        data: companyData
      });
      console.log('✅ COMPANY CREATE: Company updated');
    } else {
      // Create new company
      console.log('📝 COMPANY CREATE: Creating new company...');
      company = await prisma.goFastCompany.create({
        data: {
          containerId: `gofast-${Date.now()}`, // Unique containerId
          ...companyData
        }
      });
      console.log('✅ COMPANY CREATE: Company created:', company.id);
    }
    
    // Ensure staff.companyId is set (direct relation, no junction table)
    if (!staff.companyId || staff.companyId !== company.id) {
      console.log('📝 COMPANY CREATE: Updating staff.companyId to:', company.id);
      await prisma.companyStaff.update({
        where: { id: staff.id },
        data: { companyId: company.id }
      });
      console.log('✅ COMPANY CREATE: Staff companyId updated');
    }
    
    console.log('✅ COMPANY CREATE: ===== COMPANY CREATED SUCCESSFULLY =====');
    
    res.json({
      success: true,
      message: 'Company created successfully',
      company: {
        id: company.id,
        containerId: company.containerId,
        companyName: company.companyName,
        address: company.address,
        city: company.city,
        state: company.state,
        website: company.website,
        description: company.description,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt
      }
    });
    
  } catch (error) {
    console.error('❌ COMPANY CREATE: ===== ERROR =====');
    console.error('❌ COMPANY CREATE: Error message:', error.message);
    console.error('❌ COMPANY CREATE: Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      error: 'Failed to create company',
      message: error.message
    });
  }
});

export default router;

