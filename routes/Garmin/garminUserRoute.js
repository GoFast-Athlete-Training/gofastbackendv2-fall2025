import express from "express";
import { PrismaClient } from '@prisma/client';
import { fetchGarminUserProfile } from '../../config/garminUserIdConfig.js';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/garmin/user - Get current user's Garmin status
router.get("/user", async (req, res) => {
  try {
    // TODO: Get user ID from JWT token/auth middleware
    const userId = req.user?.id; // This should come from your auth middleware
    
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    // Get user's Garmin connection status
    const athlete = await prisma.athlete.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        garmin_user_id: true,
        garmin_access_token: true,
        garmin_connected_at: true,
        garmin_last_sync_at: true,
        garmin_scope: true,
        garmin_is_connected: true
      }
    });
    
    if (!athlete) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // If connected, try to fetch fresh data from Garmin API using config
    let garminApiData = null;
    if (athlete.garmin_access_token && athlete.garmin_is_connected) {
      const profileResult = await fetchGarminUserProfile(athlete.garmin_access_token);
      
      if (profileResult.success) {
        garminApiData = profileResult.profile;
        
        // Save rich user data to database
        try {
          await prisma.athlete.update({
            where: { id: userId },
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
          console.log('✅ Rich Garmin user data saved to database');
        } catch (dbError) {
          console.error('❌ Failed to save rich Garmin data:', dbError);
        }
      } else {
        console.log('⚠️ Could not fetch fresh Garmin data, using stored data');
        console.log('⚠️ Profile fetch error:', profileResult.error);
      }
    }
    
    res.json({
      success: true,
      user: {
        id: athlete.id,
        email: athlete.email,
        garmin: {
          connected: athlete.garmin_is_connected && !!athlete.garmin_user_id,
          userId: athlete.garmin_user_id,
          connectedAt: athlete.garmin_connected_at,
          lastSyncAt: athlete.garmin_last_sync_at,
          scope: athlete.garmin_scope,
          // Fresh API data if available
          apiData: garminApiData
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Garmin user route error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get user Garmin status' 
    });
  }
});

// POST /api/garmin/user/connect - Connect user to Garmin (called after OAuth success)
router.post("/user/connect", async (req, res) => {
  try {
    const { userId, garminUserId, accessToken, refreshToken, expiresIn, scope } = req.body;
    
    if (!userId || !garminUserId || !accessToken) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    // Update user's Garmin connection
    const updatedAthlete = await prisma.athlete.update({
      where: { id: userId },
      data: {
        garmin_user_id: garminUserId,
        garmin_access_token: accessToken,
        garmin_refresh_token: refreshToken,
        garmin_expires_in: expiresIn,
        garmin_scope: scope,
        garmin_connected_at: new Date(),
        garmin_last_sync_at: new Date()
      },
      select: {
        id: true,
        email: true,
        garmin_user_id: true,
        garmin_connected_at: true,
        garmin_scope: true
      }
    });
    
    console.log('✅ Garmin connection saved for user:', userId);
    
    res.json({
      success: true,
      message: 'Garmin connected successfully',
      user: {
        id: updatedAthlete.id,
        email: updatedAthlete.email,
        garmin: {
          userId: updatedAthlete.garmin_user_id,
          connectedAt: updatedAthlete.garmin_connected_at,
          scope: updatedAthlete.garmin_scope
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Garmin user connect error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to save Garmin connection' 
    });
  }
});

export default router;
