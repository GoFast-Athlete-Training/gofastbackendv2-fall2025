import { getPrismaClient } from '../config/database.js';

/**
 * Find athlete by Garmin userId
 * @param {string} garminUserId - Garmin's unique userId
 * @returns {Promise<Object|null>} - The athlete record or null
 */
export async function findAthleteByGarminUserId(garminUserId) {
  if (!garminUserId) {
    console.warn('⚠️ Missing garminUserId in findAthleteByGarminUserId()');
    return null;
  }

  const prisma = getPrismaClient();

  try {
    const athlete = await prisma.athlete.findFirst({
      where: { garmin_user_id: garminUserId },
      select: {
        id: true,
        garmin_user_id: true,
        garmin_access_token: true,
        garmin_refresh_token: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    if (!athlete) {
      console.warn(`⚠️ No athlete found for garmin_user_id: ${garminUserId}`);
      return null;
    }

    console.log(`✅ Found athlete ${athlete.id} for garmin_user_id ${garminUserId}`);
    return athlete;

  } catch (error) {
    console.error('❌ Error finding athlete by garmin_user_id:', error);
    return null;
  }
}
