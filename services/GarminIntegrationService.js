/**
 * Garmin Integration Service
 * Handles Garmin OAuth, data fetching, and activity processing
 */

import { PrismaClient } from '@prisma/client';
import { fetchGarminUserId, fetchGarminUserProfile } from '../config/garminUserIdConfig.js';
import { GarminFieldMapper } from './GarminFieldMapper.js';

const prisma = new PrismaClient();

export class GarminIntegrationService {
  
  /**
   * Process OAuth callback and save tokens
   * @param {Object} tokenData - OAuth token response from Garmin
   * @param {string} athleteId - Our athlete's ID
   * @returns {Promise<Object>} Processing result
   */
  static async processOAuthCallback(tokenData, athleteId) {
    try {
      console.log('🔄 GARMIN INTEGRATION: Processing OAuth callback for athlete:', athleteId);
      
      // Fetch Garmin User ID using the dedicated config function
      const userResult = await fetchGarminUserId(tokenData.access_token);
      const garminUserId = userResult.success ? userResult.userId : 'unknown';
      
      console.log('✅ GARMIN INTEGRATION: User ID result:', {
        success: userResult.success,
        userId: garminUserId,
        error: userResult.error
      });
      
      // Save Garmin tokens to database
      const updatedAthlete = await prisma.athlete.update({
        where: { id: athleteId },
        data: {
          garmin_user_id: garminUserId,
          garmin_access_token: tokenData.access_token,
          garmin_refresh_token: tokenData.refresh_token,
          garmin_expires_in: tokenData.expires_in,
          garmin_scope: tokenData.scope,
          garmin_connected_at: new Date(),
          garmin_last_sync_at: new Date(),
          garmin_is_connected: true,
          garmin_permissions: {
            read: tokenData.scope?.includes('READ') || false,
            write: tokenData.scope?.includes('WRITE') || false,
            scope: tokenData.scope,
            grantedAt: new Date(),
            lastChecked: new Date()
          }
        }
      });
      
      console.log('✅ GARMIN INTEGRATION: Tokens saved successfully');
      
      return {
        success: true,
        athlete: {
          id: updatedAthlete.id,
          email: updatedAthlete.email,
          garmin: {
            userId: garminUserId,
            connected: true,
            connectedAt: updatedAthlete.garmin_connected_at,
            scope: tokenData.scope,
            hasTokens: true
          }
        }
      };
      
    } catch (error) {
      console.error('❌ GARMIN INTEGRATION: OAuth callback error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Fetch and save Garmin user profile data
   * @param {string} athleteId - Our athlete's ID
   * @returns {Promise<Object>} Profile fetch result
   */
  static async fetchAndSaveUserProfile(athleteId) {
    try {
      console.log('🔄 GARMIN INTEGRATION: Fetching user profile for athlete:', athleteId);
      
      // Get athlete with Garmin tokens
      const athlete = await prisma.athlete.findUnique({
        where: { id: athleteId },
        select: {
          id: true,
          email: true,
          garmin_access_token: true,
          garmin_is_connected: true
        }
      });
      
      if (!athlete || !athlete.garmin_access_token || !athlete.garmin_is_connected) {
        return {
          success: false,
          error: 'Athlete not connected to Garmin'
        };
      }
      
      // Fetch profile data using config
      const profileResult = await fetchGarminUserProfile(athlete.garmin_access_token);
      
      if (!profileResult.success) {
        return {
          success: false,
          error: profileResult.error
        };
      }
      
      // Save profile data to database
      await prisma.athlete.update({
        where: { id: athleteId },
        data: {
          garmin_user_profile: profileResult.profile.userData,
          garmin_user_sleep: profileResult.profile.userSleep,
          garmin_user_preferences: {
            measurementSystem: profileResult.profile.userData.measurementSystem,
            timeFormat: profileResult.profile.userData.timeFormat,
            intensityMinutesCalcMethod: profileResult.profile.userData.intensityMinutesCalcMethod,
            availableTrainingDays: profileResult.profile.userData.availableTrainingDays,
            preferredLongTrainingDays: profileResult.profile.userData.preferredLongTrainingDays
          },
          garmin_last_sync_at: new Date()
        }
      });
      
      console.log('✅ GARMIN INTEGRATION: User profile saved successfully');
      
      return {
        success: true,
        profile: profileResult.profile
      };
      
    } catch (error) {
      console.error('❌ GARMIN INTEGRATION: Profile fetch error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Process Garmin activity webhook data
   * @param {Object} garminActivity - Raw Garmin activity data
   * @param {string} garminUserId - Garmin user ID from webhook
   * @returns {Promise<Object>} Activity processing result
   */
  static async processActivityWebhook(garminActivity, garminUserId) {
    try {
      console.log('🔄 GARMIN INTEGRATION: Processing activity webhook:', garminActivity.activityId);
      
      // Find athlete by Garmin user ID
      const athlete = await prisma.athlete.findFirst({
        where: { 
          garmin_user_id: garminUserId,
          garmin_is_connected: true
        }
      });
      
      if (!athlete) {
        console.log('⚠️ GARMIN INTEGRATION: No athlete found for Garmin user ID:', garminUserId);
        return {
          success: false,
          error: 'Athlete not found for Garmin user ID'
        };
      }
      
      // Use GarminFieldMapper to map activity data
      const mappedActivity = GarminFieldMapper.mapActivitySummary(garminActivity, athlete.id);
      
      // Validate mapped data
      const validation = GarminFieldMapper.validateActivity(mappedActivity);
      if (!validation.isValid) {
        console.log('❌ GARMIN INTEGRATION: Activity validation failed:', validation.errors);
        return {
          success: false,
          error: 'Activity validation failed',
          details: validation.errors
        };
      }
      
      // Save or update activity in database
      const existingActivity = await prisma.athleteActivity.findUnique({
        where: { sourceActivityId: mappedActivity.sourceActivityId }
      });
      
      if (existingActivity) {
        // Update existing activity
        const updatedActivity = await prisma.athleteActivity.update({
          where: { sourceActivityId: mappedActivity.sourceActivityId },
          data: {
            ...mappedActivity,
            lastUpdatedAt: new Date()
          }
        });
        
        console.log('✅ GARMIN INTEGRATION: Activity updated:', updatedActivity.id);
        
        return {
          success: true,
          action: 'updated',
          activityId: updatedActivity.id,
          phase: 'summary'
        };
      } else {
        // Create new activity
        const newActivity = await prisma.athleteActivity.create({
          data: mappedActivity
        });
        
        console.log('✅ GARMIN INTEGRATION: Activity created:', newActivity.id);
        
        return {
          success: true,
          action: 'created',
          activityId: newActivity.id,
          phase: 'summary'
        };
      }
      
    } catch (error) {
      console.error('❌ GARMIN INTEGRATION: Activity processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Process Garmin activity details webhook data
   * @param {Object} garminDetails - Raw Garmin details data
   * @param {string} activityId - Garmin activity ID
   * @returns {Promise<Object>} Details processing result
   */
  static async processActivityDetailsWebhook(garminDetails, activityId) {
    try {
      console.log('🔄 GARMIN INTEGRATION: Processing activity details webhook:', activityId);
      
      // Find existing activity
      const existingActivity = await prisma.athleteActivity.findUnique({
        where: { sourceActivityId: activityId.toString() }
      });
      
      if (!existingActivity) {
        console.log('⚠️ GARMIN INTEGRATION: Activity not found for details:', activityId);
        return {
          success: false,
          error: 'Activity not found for details processing'
        };
      }
      
      // Use GarminFieldMapper to map details data
      const mappedDetails = GarminFieldMapper.mapActivityDetails(garminDetails);
      
      // Update activity with details
      const updatedActivity = await prisma.athleteActivity.update({
        where: { sourceActivityId: activityId.toString() },
        data: mappedDetails
      });
      
      console.log('✅ GARMIN INTEGRATION: Activity details updated:', updatedActivity.id);
      
      return {
        success: true,
        action: 'hydrated',
        activityId: updatedActivity.id,
        phase: 'details'
      };
      
    } catch (error) {
      console.error('❌ GARMIN INTEGRATION: Details processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get Garmin integration status for an athlete
   * @param {string} athleteId - Our athlete's ID
   * @returns {Promise<Object>} Integration status
   */
  static async getIntegrationStatus(athleteId) {
    try {
      const athlete = await prisma.athlete.findUnique({
        where: { id: athleteId },
        select: {
          id: true,
          email: true,
          garmin_user_id: true,
          garmin_access_token: true,
          garmin_refresh_token: true,
          garmin_expires_in: true,
          garmin_scope: true,
          garmin_connected_at: true,
          garmin_last_sync_at: true,
          garmin_is_connected: true,
          garmin_user_profile: true,
          garmin_user_sleep: true,
          garmin_user_preferences: true
        }
      });
      
      if (!athlete) {
        return {
          success: false,
          error: 'Athlete not found'
        };
      }
      
      return {
        success: true,
        athlete: {
          id: athlete.id,
          email: athlete.email,
          garmin: {
            connected: athlete.garmin_is_connected || false,
            userId: athlete.garmin_user_id || null,
            connectedAt: athlete.garmin_connected_at || null,
            lastSyncAt: athlete.garmin_last_sync_at || null,
            scope: athlete.garmin_scope || null,
            hasTokens: !!(athlete.garmin_access_token && athlete.garmin_refresh_token),
            tokenStatus: athlete.garmin_access_token ? 'active' : 'none',
            hasProfile: !!athlete.garmin_user_profile,
            hasSleep: !!athlete.garmin_user_sleep,
            hasPreferences: !!athlete.garmin_user_preferences,
            profile: athlete.garmin_user_profile,
            sleep: athlete.garmin_user_sleep,
            preferences: athlete.garmin_user_preferences
          }
        }
      };
      
    } catch (error) {
      console.error('❌ GARMIN INTEGRATION: Status check error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default GarminIntegrationService;
