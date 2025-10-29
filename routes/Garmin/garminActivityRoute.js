import express from "express";
import { getPrismaClient } from '../../config/database.js';
import GarminFieldMapper from '../../services/GarminFieldMapper.js';

const router = express.Router();

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
    
    // Process each activity
    for (const garminActivity of activities) {
      try {
        // Extract userId and activityId
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
        
        // Lookup athlete by garmin_user_id
        const athlete = await prisma.athlete.findFirst({
          where: { garmin_user_id: userId },
        });
        
        if (!athlete) {
          console.warn(`⚠️ No athlete found for Garmin user ID: ${userId}`);
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

// POST /api/garmin/details - Handle Garmin activity details webhook (Phase 2)
router.post("/details", async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { activityId, lapSummaries, splitSummaries, averageRunCadence, maxRunCadence, averagePower, maxPower, aerobicTrainingEffect, anaerobicTrainingEffect, trainingEffectLabel, timeInHeartRateZones, samples } = req.body;
    
    console.log('🔍 DEBUG - Garmin activity details webhook received:', { 
      activityId, 
      lapCount: lapSummaries?.length,
      splitCount: splitSummaries?.length,
      hasCadence: !!averageRunCadence,
      hasPower: !!averagePower,
      hasTrainingEffect: !!aerobicTrainingEffect,
      hasHeartRateZones: !!timeInHeartRateZones,
      hasSamples: !!samples
    });
    
    // Find existing activity by sourceActivityId
    const existingActivity = await prisma.athleteActivity.findFirst({
      where: { 
        sourceActivityId: activityId?.toString()
      }
    });
    
    if (!existingActivity) {
      console.log('⚠️ No activity found for Garmin activity ID:', activityId);
      return res.status(404).json({ success: false, error: 'Activity not found' });
    }
    
    console.log('📊 Hydrating activity details:', existingActivity.id);
    
    // Update existing activity with detail data (Phase 2)
    const updatedActivity = await prisma.athleteActivity.update({
      where: { id: existingActivity.id },
      data: GarminFieldMapper.mapActivityDetails(req.body)
    });
    
    console.log('✅ Activity details hydrated:', updatedActivity.id);
    
    res.json({ 
      success: true, 
      message: 'Activity details hydrated', 
      activityId: updatedActivity.id,
      action: 'hydrated',
      phase: 'details'
    });
    
  } catch (error) {
    console.error('❌ Garmin activity details webhook error:', error);
    res.status(500).json({ success: false, error: 'Failed to process activity details webhook' });
  }
});

// GET /api/garmin/activities - Fetch user activities
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
