/**
 * Garmin User ID Configuration
 * 
 * This file contains the correct Garmin API endpoints for fetching user information
 * and user IDs after OAuth authentication.
 */

export const GARMIN_USER_ENDPOINTS = {
  // OAuth User Info - Gets the Partner API UUID
  USER_INFO: 'https://connectapi.garmin.com/oauth-service/oauth/user-info',
  
  // User Profile - Gets detailed user profile data
  USER_PROFILE: 'https://connectapi.garmin.com/userprofile-service/userprofile'
};

/**
 * Fetch Garmin User ID from OAuth user-info endpoint
 * @param {string} accessToken - OAuth access token
 * @returns {Promise<{success: boolean, userId?: string, error?: string}>}
 */
export async function fetchGarminUserId(accessToken) {
  try {
    console.log('🔍 Fetching Garmin User ID from:', GARMIN_USER_ENDPOINTS.USER_INFO);
    
    const userInfoResponse = await fetch(GARMIN_USER_ENDPOINTS.USER_INFO, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      const userId = userInfo.userId || 'unknown';
      
      console.log('✅ Garmin API User ID fetched:', userId);
      console.log('✅ Garmin user info:', {
        userId: userInfo.userId,
        garminUserName: userInfo.garminUserName,
        garminUserEmail: userInfo.garminUserEmail,
        scopes: userInfo.scopes
      });
      
      return {
        success: true,
        userId: userId,
        userInfo: userInfo
      };
    } else {
      const errorText = await userInfoResponse.text();
      console.log('⚠️ Could not fetch Garmin user info');
      console.log('⚠️ User-info response status:', userInfoResponse.status);
      console.log('⚠️ User-info response text:', errorText);
      console.log('⚠️ User-info response headers:', Object.fromEntries(userInfoResponse.headers.entries()));
      
      return {
        success: false,
        error: `HTTP ${userInfoResponse.status}: ${errorText}`
      };
    }
  } catch (error) {
    console.error('❌ Error fetching Garmin user info:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Fetch Garmin User Profile from userprofile-service endpoint
 * @param {string} accessToken - OAuth access token
 * @returns {Promise<{success: boolean, profile?: object, error?: string}>}
 */
export async function fetchGarminUserProfile(accessToken) {
  try {
    console.log('🔍 Fetching Garmin User Profile from:', GARMIN_USER_ENDPOINTS.USER_PROFILE);
    
    const profileResponse = await fetch(GARMIN_USER_ENDPOINTS.USER_PROFILE, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      console.log('✅ Fresh Garmin API profile data fetched:', profileData);
      
      // Parse the rich user data
      const parsedData = {
        userId: profileData.id,
        userData: {
          gender: profileData.userData?.gender,
          weight: profileData.userData?.weight,
          height: profileData.userData?.height,
          timeFormat: profileData.userData?.timeFormat,
          birthDate: profileData.userData?.birthDate,
          measurementSystem: profileData.userData?.measurementSystem,
          activityLevel: profileData.userData?.activityLevel,
          handedness: profileData.userData?.handedness,
          vo2MaxRunning: profileData.userData?.vo2MaxRunning,
          vo2MaxCycling: profileData.userData?.vo2MaxCycling,
          lactateThresholdSpeed: profileData.userData?.lactateThresholdSpeed,
          lactateThresholdHeartRate: profileData.userData?.lactateThresholdHeartRate,
          intensityMinutesCalcMethod: profileData.userData?.intensityMinutesCalcMethod,
          moderateIntensityMinutesHrZone: profileData.userData?.moderateIntensityMinutesHrZone,
          vigorousIntensityMinutesHrZone: profileData.userData?.vigorousIntensityMinutesHrZone,
          hydrationMeasurementUnit: profileData.userData?.hydrationMeasurementUnit,
          firstbeatMaxStressScore: profileData.userData?.firstbeatMaxStressScore,
          thresholdHeartRateAutoDetected: profileData.userData?.thresholdHeartRateAutoDetected,
          ftpAutoDetected: profileData.userData?.ftpAutoDetected,
          availableTrainingDays: profileData.userData?.availableTrainingDays,
          preferredLongTrainingDays: profileData.userData?.preferredLongTrainingDays
        },
        userSleep: {
          sleepTime: profileData.userSleep?.sleepTime,
          defaultSleepTime: profileData.userSleep?.defaultSleepTime,
          wakeTime: profileData.userSleep?.wakeTime,
          defaultWakeTime: profileData.userSleep?.defaultWakeTime
        },
        connectDate: profileData.connectDate,
        sourceType: profileData.sourceType
      };
      
      console.log('✅ Parsed Garmin user profile data:', parsedData);
      
      return {
        success: true,
        profile: parsedData
      };
    } else {
      const errorText = await profileResponse.text();
      console.log('⚠️ Could not fetch fresh Garmin profile data');
      console.log('⚠️ Userprofile response status:', profileResponse.status);
      console.log('⚠️ Userprofile response text:', errorText);
      
      return {
        success: false,
        error: `HTTP ${profileResponse.status}: ${errorText}`
      };
    }
  } catch (error) {
    console.error('❌ Error fetching Garmin user profile:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export default {
  GARMIN_USER_ENDPOINTS,
  fetchGarminUserId,
  fetchGarminUserProfile
};
