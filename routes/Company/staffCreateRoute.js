// Staff Create Route - Pattern A (Universal Personhood)
// POST /api/staff/create
// NO middleware required - happens after Firebase auth, before protected routes
// Find or create CompanyStaff by Firebase ID

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { validateRole, getRoleConfig } from '../../config/roleConfig.js';

const router = express.Router();

/**
 * Find or Create CompanyStaff
 * POST /api/staff/create
 * Body: { firebaseId, email, firstName, lastName, photoURL, role, startDate, salary }
 * 
 * Flow:
 * 1. Find existing CompanyStaff by firebaseId
 * 2. If found, return it (with company relation if it exists)
 * 3. If not found, create new CompanyStaff
 * 4. If role provided, validate against roleConfig and ensure GoFastCompany exists
 * 5. Assign companyId + role directly (no junction table)
 * 
 * Note: This is Pattern A - NO middleware. Happens after Firebase auth on frontend.
 * CompanyStaff is universal personhood - direct companyId and role (no junction table).
 * Role validated against config/roleConfig.js (Founder, CFO, Sales, Marketing, Community Manager).
 */
router.post('/create', async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { firebaseId, email, firstName, lastName, photoURL, role, startDate, salary } = req.body;
    
    console.log('🚀 STAFF CREATE: ===== FINDING/CREATING STAFF =====');
    console.log('🚀 STAFF CREATE: Firebase ID:', firebaseId);
    console.log('🚀 STAFF CREATE: Email:', email);
    console.log('🚀 STAFF CREATE: First Name:', firstName);
    console.log('🚀 STAFF CREATE: Last Name:', lastName);
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
    
    // Validate role against config (if provided)
    const finalRole = role || 'Founder'; // Default to Founder if not provided
    try {
      validateRole(finalRole);
    } catch (error) {
      console.log('❌ STAFF CREATE: Invalid role:', error.message);
      return res.status(400).json({
        success: false,
        error: 'Invalid role',
        message: error.message
      });
    }
    
    // Check if GoFastCompany exists (should only be one)
    let company = await prisma.goFastCompany.findFirst();
    
    if (!company) {
      // Create GoFastCompany with default values if it doesn't exist
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
    
    // Try to find existing CompanyStaff
    let staff = await prisma.companyStaff.findUnique({
      where: { firebaseId },
      include: {
        company: true
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
          firstName: staff.firstName,
          lastName: staff.lastName,
          email: staff.email,
          photoURL: staff.photoURL,
          companyId: staff.companyId,
          role: staff.role,
          startDate: staff.startDate,
          salary: staff.salary,
          company: staff.company
        }
      });
    }
    
    // Create new CompanyStaff with direct companyId and role (no junction table)
    console.log('📝 STAFF CREATE: Creating new CompanyStaff with role:', finalRole);
    staff = await prisma.companyStaff.create({
      data: {
        firebaseId,
        email,
        firstName,
        lastName,
        photoURL,
        companyId: company.id, // Direct relation
        role: finalRole, // Direct role field (validated against config)
        startDate: startDate ? new Date(startDate) : null,
        salary: salary ? parseFloat(salary) : null
      },
      include: {
        company: true
      }
    });
    
    console.log('✅ STAFF CREATE: CompanyStaff created:', staff.id);
    
    console.log('✅ STAFF CREATE: ===== STAFF CREATED SUCCESSFULLY =====');
    
    res.status(201).json({
      success: true,
      message: 'Staff created successfully',
      staff: {
        id: staff.id,
        firebaseId: staff.firebaseId,
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: staff.email,
        photoURL: staff.photoURL,
        companyId: staff.companyId,
        role: staff.role,
        startDate: staff.startDate,
        salary: staff.salary,
        company: staff.company
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

