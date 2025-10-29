import { getPrismaClient } from '../config/database.js';

/**
 * Firebase ID Athlete Lookup Service
 * Finds an athlete by Firebase ID
 * Separation of concerns: Route handlers call this service instead of querying DB directly
 * 
 * @param {string} firebaseId - Firebase user ID (uid)
 * @returns {Promise<Object|null>} - Athlete record or null if not found
 */
export async function findAthleteByFirebaseId(firebaseId) {
  if (!firebaseId) {
    console.warn('⚠️ FIREBASE LOOKUP: Missing firebaseId parameter');
    return null;
  }

  const prisma = getPrismaClient();

  try {
    console.log(`🔍 FIREBASE LOOKUP: Finding athlete by firebaseId: ${firebaseId}`);
    
    const athlete = await prisma.athlete.findUnique({
      where: { firebaseId }
    });

    if (!athlete) {
      console.log(`⚠️ FIREBASE LOOKUP: No athlete found for firebaseId: ${firebaseId}`);
      return null;
    }

    console.log(`✅ FIREBASE LOOKUP: Found athlete ${athlete.id} for firebaseId ${firebaseId}`);
    return athlete;

  } catch (error) {
    console.error('❌ FIREBASE LOOKUP: Error finding athlete by firebaseId:', error);
    return null;
  }
}

export default {
  findAthleteByFirebaseId
};

