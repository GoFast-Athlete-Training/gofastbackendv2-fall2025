import { getPrismaClient } from '../config/database.js';
import { validateRole } from '../config/roleConfig.js';

/**
 * CompanyStaff Find or Create Service
 *
 * Handles finding existing CompanyStaff by firebaseId or creating new ones.
 * Mirrors the Pattern A service used on other builds (e.g. AthleteFindOrCreateService).
 */
export class CompanyStaffFindOrCreateService {
  /**
   * Find or create CompanyStaff by Firebase ID
   * @param {Object} staffData
   * @returns {Promise<{ staff: Object, created: boolean }>}
   */
  static async findOrCreate(staffData) {
    const prisma = getPrismaClient();
    const {
      firebaseId,
      email,
      firstName = null,
      lastName = null,
      photoURL = null,
      role,
      startDate = null,
      salary = null,
    } = staffData;

    if (!firebaseId || !email) {
      throw new Error('firebaseId and email are required');
    }

    const finalRole = role || 'Founder';
    if (finalRole) {
      validateRole(finalRole);
    }

    // Check if staff already exists
    let staff = await prisma.companyStaff.findUnique({
      where: { firebaseId },
      include: { company: true },
    });

    if (staff) {
      return { staff, created: false };
    }

    // Staff doesn't exist - create without companyId (company will be created separately)
    // companyId is now optional - staff can exist without company initially
    staff = await prisma.companyStaff.create({
      data: {
        firebaseId,
        email,
        firstName,
        lastName,
        photoURL,
        companyId: null, // Allow staff without company - company created via /api/company/create
        role: finalRole,
        startDate: startDate ? new Date(startDate) : null,
        salary: salary !== null && salary !== undefined ? Number(salary) : null,
      },
      include: { company: true },
    });

    return { staff, created: true };
  }

  /**
   * Format staff response for frontend consumption
   * @param {Object} staff - Prisma CompanyStaff object (with company relation)
   * @returns {Object}
   */
  static formatResponse(staff) {
    return {
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
      company: staff.company,
      createdAt: staff.createdAt,
      updatedAt: staff.updatedAt,
    };
  }
}

export default CompanyStaffFindOrCreateService;
