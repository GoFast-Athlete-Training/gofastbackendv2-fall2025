// garminUserProfileRoute.js - Retrieve and save Garmin user profile data
import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { fetchGarminProfile } from '../../services/garminUtils.js';

const router = express.Router();

// GET /api/garmin/user?athleteId=<id>
router.get('/user', async (req, res) => {
  try {
    const { athleteId } = req.query;
    
    if (!athleteId) {
      return res.status(400).json({ 
        success: false,
        error: 'athleteId is required' 
      });
    }
    
    console.log(`🔍 Fetching Garmin profile for athleteId: ${athleteId}`);
    
    // Get database client from container
    const prisma = getPrismaClient();
    
    // Step 1: Retrieve athlete's saved access_token from DB
    const athlete = await prisma.athlete.findUnique({
      where: { id: athleteId },
      select: {
        id: true,
        garmin_access_token: true,
        garmin_user_id: true
      }
    });
    
    if (!athlete) {
      return res.status(404).json({ 
        success: false,
        error: 'Athlete not found' 
      });
    }
    
    if (!athlete.garmin_access_token) {
      return res.status(400).json({ 
        success: false,
        error: 'No Garmin access token found' 
      });
    }
    
    // Step 2: Call Garmin Connect API
    const profileData = await fetchGarminProfile(athlete.garmin_access_token);
    
    console.log(`✅ Garmin profile received for athleteId: ${athleteId}`, {
      userId: profileData.userId,
      displayName: profileData.displayName,
      profileId: profileData.profileId
    });
    
    // Step 3: Update athlete record
    const updatedAthlete = await prisma.athlete.update({
      where: { id: athleteId },
      data: {
        garmin_user_id: profileData.userId,
        garmin_user_name: profileData.displayName || profileData.userName,
        garmin_profile_id: profileData.profileId,
        garmin_last_sync_at: new Date()
      },
      select: {
        id: true,
        garmin_user_id: true,
        garmin_user_name: true,
        garmin_profile_id: true,
        garmin_last_sync_at: true
      }
    });
    
    console.log(`✅ Profile data saved for athleteId: ${athleteId}`);
    
    res.json({
      success: true,
      profile: profileData,
      athlete: updatedAthlete
    });
    
  } catch (error) {
    console.error(`❌ Garmin profile fetch error for athleteId ${req.query.athleteId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Garmin profile',
      details: error.message
    });
  }
});

export default router;
