import { getPrismaClient } from '../config/database.js';

/**
 * Athlete Find or Create Service
 * 
 * Handles finding existing athletes by firebaseId or creating new ones.
 * Uses Prisma upsert pattern for atomic find-or-create operation.
 * 
 * This service is used by the /create route to handle both:
 * - Existing users hitting signup (returns existing athlete)
 * - New users signing up (creates new athlete)
 */

export class AthleteFindOrCreateService {
  /**
   * Find or create athlete by Firebase ID
   * Upserts all Firebase data (displayName → firstName/lastName, email, photoURL)
   * 
   * @param {Object} firebaseData - Firebase user data from verified token
   * @param {string} firebaseData.firebaseId - Firebase UID (from req.user.uid)
   * @param {string} firebaseData.email - Email from Firebase token
   * @param {string} [firebaseData.displayName] - Display name from Firebase (parsed into firstName/lastName)
   * @param {string} [firebaseData.picture] - Photo URL from Firebase (profileUrl)
   * @returns {Promise<Object>} Athlete object with all fields
   */
  static async findOrCreate(firebaseData) {
    const prisma = getPrismaClient();
    const { firebaseId, email, displayName, picture } = firebaseData;

    if (!firebaseId || !email) {
      throw new Error('firebaseId and email are required');
    }

    console.log('🔍 ATHLETE SERVICE: Finding or creating athlete for firebaseId:', firebaseId);

    // Parse displayName into firstName/lastName if available
    const firstName = displayName?.split(' ')[0] || null;
    const lastName = displayName?.split(' ').slice(1).join(' ') || null;

    // Use Prisma upsert for atomic find-or-create
    // If firebaseId exists, update with Firebase data (sync Firebase profile changes)
    // If not, create new athlete with Firebase data
    const athlete = await prisma.athlete.upsert({
      where: { firebaseId },
      update: {
        // Upsert all Firebase data - sync any changes from Firebase profile
        email, // Update email if changed in Firebase
        firstName, // Update firstName from displayName
        lastName, // Update lastName from displayName
        photoURL: picture || null // Update photoURL from Firebase
      },
      create: {
        firebaseId,
        email,
        firstName,
        lastName,
        photoURL: picture || null
      }
    });

    console.log('✅ ATHLETE SERVICE: Athlete found/created:', athlete.id);

    return athlete;
  }

  /**
   * Format athlete response for frontend
   * 
   * @param {Object} athlete - Prisma athlete object
   * @returns {Object} Formatted athlete response
   */
  static formatResponse(athlete) {
    return {
      success: true,
      message: 'Athlete found or created',
      athleteId: athlete.id,
      data: {
        id: athlete.id,
        firebaseId: athlete.firebaseId,
        email: athlete.email,
        firstName: athlete.firstName,
        lastName: athlete.lastName,
        gofastHandle: athlete.gofastHandle,
        birthday: athlete.birthday,
        gender: athlete.gender,
        city: athlete.city,
        state: athlete.state,
        primarySport: athlete.primarySport,
        photoURL: athlete.photoURL,
        bio: athlete.bio,
        instagram: athlete.instagram,
        status: athlete.status,
        createdAt: athlete.createdAt,
        updatedAt: athlete.updatedAt
      }
    };
  }
}

export default AthleteFindOrCreateService;

