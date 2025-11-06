// garminTokenSaveRoute.js - Internal service for saving tokens to database
import { getPrismaClient } from '../../config/database.js';
import { fetchGarminUserInfo, fetchGarminProfile } from '../../services/garminUtils.js';

// Internal service function to save Garmin tokens
export const saveGarminTokens = async (athleteId, tokens) => {
  try {
    console.log(`💾 Saving Garmin tokens for athleteId: ${athleteId}`);
    
    // Get database client from container
    const prisma = getPrismaClient();
    
    // Step 1: Save tokens to database
    const updatedAthlete = await prisma.athlete.update({
      where: { id: athleteId },
      data: {
        garmin_access_token: tokens.access_token,
        garmin_refresh_token: tokens.refresh_token,
        garmin_expires_in: tokens.expires_in,
        garmin_scope: tokens.scope,
        garmin_connected_at: new Date(),
        garmin_last_sync_at: new Date(),
        garmin_is_connected: true,
        garmin_permissions: {
          read: tokens.scope?.includes('READ') || false,
          write: tokens.scope?.includes('WRITE') || false,
          scope: tokens.scope,
          grantedAt: new Date(),
          lastChecked: new Date()
        }
      }
    });
    
    console.log(`✅ Tokens saved to database for athleteId: ${athleteId}`);
    
    // Step 2: Fetch and save user info from Garmin API
    const userInfoResult = await fetchGarminUserInfo(tokens.access_token);
    
    if (userInfoResult.success) {
      const garminUserId = userInfoResult.userData.userId;
      
      console.log(`🔍 Fetched Garmin user info - userId: ${garminUserId}`);
      console.log(`📊 Full userData keys:`, Object.keys(userInfoResult.userData));
      
      if (garminUserId) {
        // Update with Garmin user ID
        const updated = await prisma.athlete.update({
          where: { id: athleteId },
          data: {
            garmin_user_id: garminUserId,
            garmin_user_profile: userInfoResult.userData,
            garmin_last_sync_at: new Date()
          },
          select: {
            id: true,
            garmin_user_id: true,
            email: true
          }
        });
        
        console.log(`✅ Garmin user ID saved successfully!`);
        console.log(`✅ Verification - athleteId: ${updated.id}, garmin_user_id: ${updated.garmin_user_id}, email: ${updated.email}`);
      } else {
        console.warn(`⚠️ No userId found in userData response`);
        console.warn(`📊 userData:`, JSON.stringify(userInfoResult.userData, null, 2));
      }
    } else {
      console.log(`⚠️ Could not fetch user info: ${userInfoResult.error}`);
    }
    
    // Step 3: If no user_id in token response, fetch profile data
    if (!tokens.user_id) {
      try {
        console.log(`🔍 No user_id in token response, fetching profile for athleteId: ${athleteId}`);
        
        const profileData = await fetchGarminProfile(tokens.access_token);
        
        console.log(`🔍 Fetched Garmin profile - userId: ${profileData.userId}`);
        console.log(`📊 Profile data keys:`, Object.keys(profileData));
        
        if (profileData.userId) {
          // Update with profile data
          const updated = await prisma.athlete.update({
            where: { id: athleteId },
            data: {
              garmin_user_id: profileData.userId,
              garmin_last_sync_at: new Date()
            },
            select: {
              id: true,
              garmin_user_id: true,
              email: true
            }
          });
          
          console.log(`✅ Profile data saved for athleteId: ${athleteId}`);
          console.log(`✅ Verification - athleteId: ${updated.id}, garmin_user_id: ${updated.garmin_user_id}, email: ${updated.email}`);
        } else {
          console.warn(`⚠️ No userId found in profileData`);
          console.warn(`📊 profileData:`, JSON.stringify(profileData, null, 2));
        }
        
      } catch (profileError) {
        console.log(`⚠️ Could not fetch profile data: ${profileError.message}`);
      }
    }
    
    return {
      success: true,
      athleteId: athleteId,
      garminUserId: userInfoResult.success ? userInfoResult.userData.userId : null,
      message: 'Tokens and user info saved successfully'
    };
    
  } catch (error) {
    console.error(`❌ Failed to save tokens for athleteId ${athleteId}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default { saveGarminTokens };
