// Staff Create Route - Pattern A (Universal Personhood)
// POST /api/staff/create
// NO middleware required - happens after Firebase auth, before protected routes
// Find or create CompanyStaff by Firebase ID

import express from 'express';
import { getPrismaClient } from '../../config/database.js';

const router = express.Router();

/**
 * Find or Create CompanyStaff
 * POST /api/staff/create
 * Body: { firebaseId, email, firstName, lastName, photoURL, role }
 * 
 * Flow:
 * 1. Find existing CompanyStaff by firebaseId
 * 2. If found, return it (with companyRoles if they exist)
 * 3. If not found, create new CompanyStaff
 * 4. If role provided and no companyRoles exist, create GoFastCompany and CompanyStaffRole
 * 
 * Note: This is Pattern A - NO middleware. Happens after Firebase auth on frontend.
 */
router.post('/create', async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { firebaseId, email, firstName, lastName, photoURL, role } = req.body;
    
    console.log('🚀 STAFF CREATE: ===== FINDING/CREATING STAFF =====');
    console.log('🚀 STAFF CREATE: Firebase ID:', firebaseId);
    console.log('🚀 STAFF CREATE: Email:', email);
    console.log('🚀 STAFF CREATE: Role:', role);
    
    // Validation
    if (!firebaseId || !email) {
      console.log('❌ STAFF CREATE: Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['firebaseId', 'email']
      });
    }
    
    // Build name from firstName/lastName
    const name = firstName && lastName 
      ? `${firstName} ${lastName}`.trim()
      : firstName || lastName || null;
    
    // Try to find existing CompanyStaff
    let staff = await prisma.companyStaff.findUnique({
      where: { firebaseId },
      include: {
        companyRoles: {
          include: {
            company: true
          }
        }
      }
    });
    
    if (staff) {
      console.log('✅ STAFF CREATE: Existing staff found:', staff.id);
      return res.json({
        success: true,
        message: 'Staff found',
        staff: {
          id: staff.id,
          firebaseId: staff.firebaseId,
          name: staff.name,
          email: staff.email,
          photoURL: staff.photoURL,
          companyRoles: staff.companyRoles
        }
      });
    }
    
    // Create new CompanyStaff
    console.log('📝 STAFF CREATE: Creating new CompanyStaff...');
    staff = await prisma.companyStaff.create({
      data: {
        firebaseId,
        email,
        name,
        photoURL
      },
      include: {
        companyRoles: {
          include: {
            company: true
          }
        }
      }
    });
    
    console.log('✅ STAFF CREATE: CompanyStaff created:', staff.id);
    
    // If role provided and no company exists, create GoFastCompany and link via CompanyStaffRole
    if (role && (!staff.companyRoles || staff.companyRoles.length === 0)) {
      console.log('📝 STAFF CREATE: Creating GoFastCompany and CompanyStaffRole with role:', role);
      
      // Check if GoFastCompany already exists (should only be one)
      let company = await prisma.goFastCompany.findFirst();
      
      if (!company) {
        // Create GoFastCompany with default values
        company = await prisma.goFastCompany.create({
          data: {
            containerId: `gofast-${Date.now()}`, // Unique containerId
            companyName: 'GoFast Inc',
            address: '2604 N. George Mason Dr.',
            city: 'Arlington',
            state: 'VA',
            website: 'gofastcrushgoals.com'
          }
        });
        console.log('✅ STAFF CREATE: GoFastCompany created:', company.id);
      } else {
        console.log('✅ STAFF CREATE: GoFastCompany already exists:', company.id);
      }
      
      // Create CompanyStaffRole junction
      const staffRole = await prisma.companyStaffRole.create({
        data: {
          companyId: company.id,
          staffId: staff.id,
          role: role || 'founder', // Default to founder if not provided
          department: null // Can be set later
        },
        include: {
          company: true
        }
      });
      
      console.log('✅ STAFF CREATE: CompanyStaffRole created:', staffRole.id);
      
      // Reload staff with new role
      staff = await prisma.companyStaff.findUnique({
        where: { firebaseId },
        include: {
          companyRoles: {
            include: {
              company: true
            }
          }
        }
      });
    }
    
    console.log('✅ STAFF CREATE: ===== STAFF CREATED SUCCESSFULLY =====');
    
    res.status(201).json({
      success: true,
      message: 'Staff created successfully',
      staff: {
        id: staff.id,
        firebaseId: staff.firebaseId,
        name: staff.name,
        email: staff.email,
        photoURL: staff.photoURL,
        companyRoles: staff.companyRoles
      }
    });
    
  } catch (error) {
    console.error('❌ STAFF CREATE: ===== ERROR =====');
    console.error('❌ STAFF CREATE: Error message:', error.message);
    console.error('❌ STAFF CREATE: Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      error: 'Failed to create staff',
      message: error.message
    });
  }
});

export default router;

