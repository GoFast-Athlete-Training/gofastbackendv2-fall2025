import { getPrismaClient } from '../config/database.js';

/**
 * Athlete Upsert Service
 * 
 * Handles creating/updating athletes with proper field handling.
 * This service ensures that existing users get new fields added
 * without data loss, and new users get created with all fields.
 */

export class AthleteUpsertService {
  constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Upsert athlete with Garmin data
   * Handles both new users and existing users with missing fields
   */
  async upsertAthleteWithGarmin(athleteData) {
    try {
      const { firebaseId, email, garminData } = athleteData;
      
      // Check if athlete exists
      const existingAthlete = await this.prisma.athlete.findUnique({
        where: { firebaseId }
      });

      if (existingAthlete) {
        // Update existing athlete with Garmin fields
        return await this.updateExistingAthlete(existingAthlete.id, athleteData);
      } else {
        // Create new athlete with all fields
        return await this.createNewAthlete(athleteData);
      }
    } catch (error) {
      console.error('❌ Upsert failed:', error);
      throw error;
    }
  }

  /**
   * Update existing athlete - preserves existing data, adds new fields
   */
  async updateExistingAthlete(athleteId, athleteData) {
    const { garminData, ...otherData } = athleteData;
    
    // Build update data - only include fields that exist
    const updateData = {
      ...otherData,
      // Add Garmin fields if they don't exist
      ...(garminData && {
        garmin_user_id: garminData.user_id || null,
        garmin_access_token: garminData.access_token || null,
        garmin_refresh_token: garminData.refresh_token || null,
        garmin_expires_in: garminData.expires_in || null,
        garmin_scope: garminData.scope || null,
        garmin_connected_at: garminData.connected_at || new Date(),
        garmin_last_sync_at: garminData.last_sync_at || new Date(),
        garmin_permissions: garminData.permissions || null,
        garmin_is_connected: garminData.is_connected || true,
        garmin_user_profile: garminData.user_profile || null,
        garmin_user_sleep: garminData.user_sleep || null,
        garmin_user_preferences: garminData.user_preferences || null
      })
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const updatedAthlete = await this.prisma.athlete.update({
      where: { id: athleteId },
      data: updateData
    });

    console.log(`✅ Updated existing athlete: ${updatedAthlete.email}`);
    return updatedAthlete;
  }

  /**
   * Create new athlete with all fields
   */
  async createNewAthlete(athleteData) {
    const { garminData, ...otherData } = athleteData;
    
    const newAthleteData = {
      ...otherData,
      // Initialize Garmin fields
      garmin_user_id: garminData?.user_id || null,
      garmin_access_token: garminData?.access_token || null,
      garmin_refresh_token: garminData?.refresh_token || null,
      garmin_expires_in: garminData?.expires_in || null,
      garmin_scope: garminData?.scope || null,
      garmin_connected_at: garminData?.connected_at || null,
      garmin_last_sync_at: garminData?.last_sync_at || null,
      garmin_permissions: garminData?.permissions || null,
      garmin_is_connected: garminData?.is_connected || false,
      garmin_disconnected_at: null,
      garmin_user_profile: garminData?.user_profile || null,
      garmin_user_sleep: garminData?.user_sleep || null,
      garmin_user_preferences: garminData?.user_preferences || null
    };

    const newAthlete = await this.prisma.athlete.create({
      data: newAthleteData
    });

    console.log(`✅ Created new athlete: ${newAthlete.email}`);
    return newAthlete;
  }

  /**
   * Handle Garmin webhook upsert
   * This is the main method called by Garmin webhooks
   */
  async handleGarminWebhook(webhookData) {
    try {
      const { user_id, access_token, refresh_token, expires_in, scope } = webhookData;
      
      // Find athlete by Garmin user ID or create new one
      let athlete = await this.prisma.athlete.findFirst({
        where: { garmin_user_id: user_id }
      });

      if (!athlete) {
        // Create new athlete from Garmin data
        athlete = await this.createNewAthlete({
          firebaseId: `garmin_${user_id}`, // Temporary Firebase ID
          email: `garmin_${user_id}@garmin.local`, // Temporary email
          garminData: {
            user_id,
            access_token,
            refresh_token,
            expires_in,
            scope,
            is_connected: true,
            connected_at: new Date(),
            last_sync_at: new Date()
          }
        });
      } else {
        // Update existing athlete with new Garmin data
        athlete = await this.updateExistingAthlete(athlete.id, {
          garminData: {
            user_id,
            access_token,
            refresh_token,
            expires_in,
            scope,
            is_connected: true,
            connected_at: new Date(),
            last_sync_at: new Date()
          }
        });
      }

      return athlete;
    } catch (error) {
      console.error('❌ Garmin webhook upsert failed:', error);
      throw error;
    }
  }

  /**
   * Connect existing Firebase user to Garmin
   */
  async connectGarminToFirebaseUser(firebaseId, garminData) {
    try {
      const athlete = await this.prisma.athlete.findUnique({
        where: { firebaseId }
      });

      if (!athlete) {
        throw new Error(`Athlete with Firebase ID ${firebaseId} not found`);
      }

      return await this.updateExistingAthlete(athlete.id, { garminData });
    } catch (error) {
      console.error('❌ Connect Garmin to Firebase user failed:', error);
      throw error;
    }
  }
}

export default AthleteUpsertService;
