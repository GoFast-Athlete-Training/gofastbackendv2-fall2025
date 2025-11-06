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
 * 3. Check if staff has founder role (or create role if first user)
 * 4. Find existing GoFastCompany (should only be one)
 * 5. If exists, update it
 * 6. If not exists, create it
 * 7. Ensure CompanyStaffRole exists linking staff to company
 * 
 * Note: This is Pattern C - requires middleware. Only founder can create company.
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
        companyRoles: {
          include: {
            company: true
          }
        }
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
    
    // Check if staff has founder role (or is first user - auto-assign founder)
    let staffRole = staff.companyRoles?.find(r => r.role === 'founder');
    
    // If no role exists and this is the first staff member, create founder role
    if (!staffRole) {
      // Check if any company exists
      const existingCompany = await prisma.goFastCompany.findFirst();
      
      if (!existingCompany) {
        // First user - auto-assign founder role
        console.log('📝 COMPANY CREATE: First user - auto-assigning founder role');
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
      
      // Create CompanyStaffRole if it doesn't exist
      if (!staffRole) {
        staffRole = await prisma.companyStaffRole.create({
          data: {
            companyId: company.id,
            staffId: staff.id,
            role: 'founder',
            department: null
          }
        });
        console.log('✅ COMPANY CREATE: CompanyStaffRole created:', staffRole.id);
      }
    }
    
    // Ensure CompanyStaffRole exists (in case company existed but role didn't)
    if (!staffRole) {
      staffRole = await prisma.companyStaffRole.findFirst({
        where: {
          companyId: company.id,
          staffId: staff.id
        }
      });
      
      if (!staffRole) {
        staffRole = await prisma.companyStaffRole.create({
          data: {
            companyId: company.id,
            staffId: staff.id,
            role: 'founder',
            department: null
          }
        });
        console.log('✅ COMPANY CREATE: CompanyStaffRole created:', staffRole.id);
      }
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

