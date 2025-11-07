// Staff Create Route - Pattern A (Universal Personhood)
// POST /api/staff/create
// NO middleware required - happens after Firebase auth, before protected routes
// Find or create CompanyStaff by Firebase ID

import express from 'express';
import CompanyStaffFindOrCreateService from '../../services/CompanyStaffFindOrCreateService.js';

const router = express.Router();

/**
 * Find or Create CompanyStaff
 * POST /api/staff/create
 * Body: { firebaseId, email, firstName, lastName, photoURL, role, startDate, salary }
 *
 * Flow:
 * 1. Find existing CompanyStaff by firebaseId (Pattern A service)
 * 2. If found, return it (with company relation)
 * 3. If not found, create new CompanyStaff (upserts GoFastCompany if missing)
 *
 * Note: This is Pattern A - NO middleware. Happens after Firebase auth on frontend.
 * CompanyStaff is universal personhood - direct companyId and role (no junction table).
 * Role validated against config/roleConfig.js (Founder, CFO, Sales, Marketing, Community Manager).
 */
router.post('/create', async (req, res) => {
  try {
    const { firebaseId, email } = req.body;

    if (!firebaseId || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['firebaseId', 'email'],
      });
    }

    const { staff, created } = await CompanyStaffFindOrCreateService.findOrCreate(req.body);

    res.status(created ? 201 : 200).json({
      success: true,
      message: created ? 'Staff created successfully' : 'Staff found',
      staff: CompanyStaffFindOrCreateService.formatResponse(staff),
    });
  } catch (error) {
    console.error('❌ STAFF CREATE: ===== ERROR =====');
    console.error('❌ STAFF CREATE: Error message:', error.message);
    console.error('❌ STAFF CREATE: Error stack:', error.stack);

    res.status(500).json({
      success: false,
      error: 'Failed to create staff',
      message: error.message,
    });
  }
});

export default router;

