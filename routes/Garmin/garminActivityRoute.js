import express from "express";
import { getPrismaClient } from '../../config/database.js';
import GarminFieldMapper from '../../services/GarminFieldMapper.js';
import { findAthleteByGarminUserId } from '../../services/garminFindAthleteService.js';

const router = express.Router();

// GET /api/garmin/ping - Garmin health check endpoint
router.get('/ping', (req, res) => {
  console.log('📡 Garmin Ping received:', new Date().toISOString());
  res.status(200).send('pong');
});

// POST /api/garmin/activity - Handle Garmin activity webhook
router.post("/activity", async (req, res) => {
  try {
    const prisma = getPrismaClient();
    
    // Validate payload structure
    const payload = req.body;
    if (!payload.activities || !Array.isArray(payload.activities)) {
      console.warn('⚠️ Invalid payload structure - expected { activities: [...] }');
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid payload structure - expected { activities: [...] }' 
      });
    }
    
    const activities = payload.activities;
    console.log(`📩 Garmin webhook received (${activities.length} activities)`);
    console.log(`📊 Webhook payload root keys:`, Object.keys(payload));
    
    // Check if userId is at root level
    if (payload.userId) {
      console.log(`🔍 Found userId at ROOT level: ${payload.userId}`);
    }
    
    // Process each activity
    for (const garminActivity of activities) {
      try {
        // Extract userId and activityId - try multiple field name variations
        // Also check payload root level (userId might be at root, not in each activity)
        const userId = garminActivity.userId || garminActivity.user_id || garminActivity.userIdString || garminActivity.garminUserId || payload.userId;
        const activityId = garminActivity.activityId || garminActivity.summaryId || garminActivity.activitySummaryId;
        
        if (!userId) {
          console.warn('⚠️ No userId found in activity:', Object.keys(garminActivity));
          console.warn('📊 Activity sample:', JSON.stringify(garminActivity, null, 2).substring(0, 300));
          continue;
    }
    
        if (!activityId) {
          console.warn('⚠️ No activityId found in activity:', Object.keys(garminActivity));
          continue;
        }
    
        console.log(`🔍 Looking up athlete for Garmin userId: ${userId} (type: ${typeof userId})`);
        
        // DEBUG: Check what's actually in the database
        const allAthletesWithGarmin = await prisma.athlete.findMany({
          where: { garmin_user_id: { not: null } },
          select: { id: true, email: true, garmin_user_id: true }
        });
        console.log(`📊 DEBUG: All athletes with garmin_user_id in database:`, allAthletesWithGarmin.map(a => ({ id: a.id, email: a.email, garmin_user_id: a.garmin_user_id })));
        console.log(`📊 DEBUG: Webhook userId value: "${userId}"`);
        
        // Lookup athlete using the service
        const athlete = await findAthleteByGarminUserId(userId);
        
        if (!athlete) {
          console.error(`❌ No athlete found for Garmin user ID: ${userId}`);
          console.error(`❌ Webhook userId type: ${typeof userId}, value: "${userId}"`);
          console.error(`❌ Available garmin_user_ids in DB:`, allAthletesWithGarmin.map(a => `"${a.garmin_user_id}"`));
          console.error(`💡 Check if garmin_user_id format matches (UUID string vs number, whitespace, etc.)`);
          continue;
        }
    
        // Normalize webhook format to mapper expected format
        const normalizedActivity = {
          ...garminActivity,
          // Convert activityType string to object format if needed
          activityType: typeof garminActivity.activityType === 'string' 
            ? { typeKey: garminActivity.activityType }
            : garminActivity.activityType,
          // Convert startTimeInSeconds to startTimeLocal if needed
          startTimeLocal: garminActivity.startTimeLocal || 
            (garminActivity.startTimeInSeconds 
              ? new Date(garminActivity.startTimeInSeconds * 1000).toISOString()
              : null),
          // Map field name variations
          averageSpeed: garminActivity.averageSpeed || garminActivity.averageSpeedInMetersPerSecond,
          calories: garminActivity.calories || garminActivity.activeKilocalories,
          averageHeartRate: garminActivity.averageHeartRate || garminActivity.averageHeartRateInBeatsPerMinute,
          maxHeartRate: garminActivity.maxHeartRate || garminActivity.maxHeartRateInBeatsPerMinute,
          elevationGain: garminActivity.elevationGain || garminActivity.totalElevationGainInMeters,
        };
        
        // Map using GarminFieldMapper
        const mappedActivity = GarminFieldMapper.mapActivitySummary(normalizedActivity, athlete.id);
        
        // Validate the mapped activity
        const validation = GarminFieldMapper.validateActivity(mappedActivity);
        if (!validation.isValid) {
          console.error(`❌ Activity validation failed for activityId ${activityId}:`, validation.errors);
          continue;
        }
        
        if (validation.warnings.length > 0) {
          console.warn(`⚠️ Activity validation warnings for activityId ${activityId}:`, validation.warnings);
        }
        
        // Remove timestamps from mapped activity (we set them in upsert)
        const { syncedAt, lastUpdatedAt, ...activityData } = mappedActivity;
    
        // Upsert into athleteActivity
        const upsertedActivity = await prisma.athleteActivity.upsert({
          where: { sourceActivityId: mappedActivity.sourceActivityId },
          update: {
            ...activityData,
            lastUpdatedAt: new Date()
          },
          create: {
            ...activityData,
            syncedAt: new Date(),
            lastUpdatedAt: new Date()
          }
    });
    
        console.log(`✅ Saved Garmin activity ${activityId} for athlete ${athlete.id}`);
        
      } catch (activityError) {
        console.error('❌ Error processing individual activity:', activityError);
        // Continue with next activity
      }
    }
    
    // Return 200 OK
    res.status(200).json({ success: true, message: 'Webhook processed' });
    
  } catch (error) {
    console.error('❌ Garmin activity webhook processing error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process webhook',
      message: error.message 
    });
  }
});

// POST /api/garmin/activities - Handle manually updated activities webhook
router.post("/activities", async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const payload = req.body;
    
    console.log('📩 Garmin manually updated activities webhook received');
    
    // Validate payload structure - expect { activities: [...] }
    if (!payload.activities || !Array.isArray(payload.activities)) {
      console.warn('⚠️ Invalid payload structure - expected { activities: [...] }');
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid payload structure - expected { activities: [...] }' 
      });
    }
    
    const activities = payload.activities;
    console.log(`📝 Processing ${activities.length} manually updated activities`);
    
    // Process each activity (same as /activity route)
    for (const garminActivity of activities) {
      try {
        const userId = garminActivity.userId || garminActivity.user_id || garminActivity.userIdString || garminActivity.garminUserId;
        const activityId = garminActivity.activityId || garminActivity.summaryId;
        
        if (!userId) {
          console.warn('⚠️ No userId found in activity:', garminActivity);
          continue;
        }
        
        if (!activityId) {
          console.warn('⚠️ No activityId found in activity:', garminActivity);
          continue;
        }
        
        // Lookup athlete using the service
        const athlete = await findAthleteByGarminUserId(userId);
        
        if (!athlete) {
          console.warn(`⚠️ No athlete found for Garmin user ID: ${userId}`);
          continue;
        }
        
        // Normalize webhook format to mapper expected format
        const normalizedActivity = {
          ...garminActivity,
          activityType: typeof garminActivity.activityType === 'string' 
            ? { typeKey: garminActivity.activityType }
            : garminActivity.activityType,
          startTimeLocal: garminActivity.startTimeLocal || 
            (garminActivity.startTimeInSeconds 
              ? new Date(garminActivity.startTimeInSeconds * 1000).toISOString()
              : null),
          averageSpeed: garminActivity.averageSpeed || garminActivity.averageSpeedInMetersPerSecond,
          calories: garminActivity.calories || garminActivity.activeKilocalories,
          averageHeartRate: garminActivity.averageHeartRate || garminActivity.averageHeartRateInBeatsPerMinute,
          maxHeartRate: garminActivity.maxHeartRate || garminActivity.maxHeartRateInBeatsPerMinute,
          elevationGain: garminActivity.elevationGain || garminActivity.totalElevationGainInMeters,
        };
        
        // Map using GarminFieldMapper
        const mappedActivity = GarminFieldMapper.mapActivitySummary(normalizedActivity, athlete.id);
        
        // Validate the mapped activity
        const validation = GarminFieldMapper.validateActivity(mappedActivity);
        if (!validation.isValid) {
          console.error(`❌ Activity validation failed for activityId ${activityId}:`, validation.errors);
          continue;
        }
        
        if (validation.warnings.length > 0) {
          console.warn(`⚠️ Activity validation warnings for activityId ${activityId}:`, validation.warnings);
        }
        
        // Remove timestamps from mapped activity (we set them in upsert)
        const { syncedAt, lastUpdatedAt, ...activityData } = mappedActivity;
        
        // Upsert into athleteActivity (updates existing manually updated activities)
        await prisma.athleteActivity.upsert({
          where: { sourceActivityId: mappedActivity.sourceActivityId },
          update: {
            ...activityData,
            lastUpdatedAt: new Date()
          },
          create: {
            ...activityData,
            syncedAt: new Date(),
            lastUpdatedAt: new Date()
          }
        });
        
        console.log(`✅ Saved manually updated Garmin activity ${activityId} for athlete ${athlete.id}`);
        
      } catch (activityError) {
        console.error('❌ Error processing individual activity:', activityError);
        // Continue with next activity
      }
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Manually updated activities webhook processed' 
    });
    
  } catch (error) {
    console.error('❌ Garmin manually updated activities webhook error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process manually updated activities webhook',
      message: error.message 
    });
  }
});

// GET /api/garmin/activities - Fetch user activities (API endpoint)
router.get("/activities", async (req, res) => {
  try {
    const { userId, accessToken, limit = 10 } = req.query;
    
    if (!userId || !accessToken) {
      return res.status(400).json({ error: "userId and accessToken are required" });
    }
    
    // TODO: Use accessToken to fetch activities from Garmin API
    // TODO: Filter and format activity data
    // TODO: Return formatted activities
    
    res.json({
      success: true,
      message: 'Activities fetched',
      activities: [], // TODO: Return actual activities
      count: 0
    });
    
  } catch (error) {
    console.error('Garmin activities fetch error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch activities' 
    });
  }
});

// POST /api/garmin/activity/sync - Manual activity sync
router.post("/activity/sync", async (req, res) => {
  try {
    const { userId, accessToken } = req.body;
    
    if (!userId || !accessToken) {
      return res.status(400).json({ error: "userId and accessToken are required" });
    }
    
    console.log('Manual activity sync requested for user:', userId);
    
    // TODO: Trigger manual sync with Garmin API
    // TODO: Fetch latest activities
    // TODO: Update user's activity data
    
    res.json({
      success: true,
      message: 'Activity sync initiated',
      userId: userId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Garmin activity sync error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to sync activities' 
    });
  }
});

export default router;
