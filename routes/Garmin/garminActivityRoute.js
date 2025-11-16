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
    
    // Check if userId is at root level
    if (payload.userId) {
      console.log(`🔍 Found userId at ROOT level: ${payload.userId}`);
    }
    
    // Process each activity
    for (let i = 0; i < activities.length; i++) {
      const garminActivity = activities[i];
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
    
        console.log(`🔍 Processing activity ${activityId} for userId: ${userId}`);
        
        // Lookup athlete using the service
        const athlete = await findAthleteByGarminUserId(userId);
        
        if (!athlete) {
          console.error(`❌ No athlete found for Garmin user ID: ${userId}`);
          continue;
        }
    
        // Log device info to see what Garmin sends
        console.log(`📱 Device fields check:`);
        console.log(`   - deviceMetaData:`, JSON.stringify(garminActivity.deviceMetaData));
        console.log(`   - deviceName:`, garminActivity.deviceName);
        console.log(`   - device:`, JSON.stringify(garminActivity.device));
        console.log(`   - All keys with 'device':`, Object.keys(garminActivity).filter(k => k.toLowerCase().includes('device')));
        
        // Extract deviceName from multiple possible locations (Garmin may use deviceModel or deviceName)
        const extractedDeviceName = garminActivity.deviceMetaData?.deviceName || 
                                    garminActivity.deviceMetaData?.deviceModel ||
                                    garminActivity.deviceName || 
                                    garminActivity.deviceModel ||
                                    garminActivity.device?.name ||
                                    garminActivity.device?.deviceName ||
                                    garminActivity.device?.deviceModel ||
                                    garminActivity.deviceMetaData?.name ||
                                    null;
        
        console.log(`📱 Extracted deviceName: ${extractedDeviceName || 'NULL'}`);
        
        // Normalize webhook format to mapper expected format
        const normalizedActivity = {
          ...garminActivity,
          // Try multiple field names for activityName
          activityName: garminActivity.activityName || 
                        garminActivity.activity_name || 
                        garminActivity.name || 
                        garminActivity.displayName || 
                        garminActivity.title || 
                        null,
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
          // Ensure deviceMetaData is passed AND explicitly set deviceName
          deviceMetaData: garminActivity.deviceMetaData || null,
          deviceName: extractedDeviceName, // Explicitly set deviceName for mapper
        };
        
        // Map using GarminFieldMapper
        const mappedActivity = GarminFieldMapper.mapActivitySummary(normalizedActivity, athlete.id);
        
        console.log(`✅ Mapped activity: ${mappedActivity.activityName || mappedActivity.activityType || 'Unknown'}`);
        console.log(`✅ Mapped deviceName: ${mappedActivity.deviceName || 'NULL - NOT SAVED!'}`);
        
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
        
        // Log what we're about to save
        console.log(`💾 About to save deviceName: ${activityData.deviceName || 'NULL - WILL BE NULL IN DB!'}`);
    
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
        console.log(`✅ Saved deviceName in DB: ${upsertedActivity.deviceName || 'NULL - CHECK DATABASE!'}`);
        
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
