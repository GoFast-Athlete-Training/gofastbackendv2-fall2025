import express from "express";
import { getPrismaClient } from '../../config/database.js';
import GarminFieldMapper from '../../services/GarminFieldMapper.js';

const router = express.Router();

// POST /api/garmin/activity - Handle Garmin activity webhook
router.post("/activity", async (req, res) => {
  // Immediately return 200 OK to stop Garmin retries
  res.status(200).json({ success: true, message: 'Webhook received' });
  
  try {
    const prisma = getPrismaClient();
    
    // Log the raw payload for debugging
    console.log('🔍 Garmin activity webhook received:', JSON.stringify(req.body, null, 2));
    
    // Handle both single activity and array of activities
    const payload = req.body;
    const activities = payload.activities || [payload]; // Support both formats
    
    console.log(`🔍 Processing ${activities.length} activities from webhook`);
    
    // Process each activity
    for (const activityPayload of activities) {
      try {
        // Extract userId from activity (Garmin sends this in various formats)
        const garminUserId = activityPayload.userId || activityPayload.user_id || activityPayload.userIdString || activityPayload.garminUserId;
        
        if (!garminUserId) {
          console.warn('⚠️ No userId found in activity:', activityPayload);
          continue; // Skip this activity
        }
        
        console.log('🔍 Looking for athlete with garmin_user_id:', garminUserId);
        
        // Find the corresponding athlete
        const athlete = await prisma.athlete.findUnique({
          where: { garmin_user_id: garminUserId },
        });
        
        if (!athlete) {
          console.warn('⚠️ No athlete found for Garmin user ID:', garminUserId);
          continue; // Skip this activity
        }
        
        // Use garminMapper to parse and normalize the activity
        const mappedData = GarminFieldMapper.mapActivitySummary(activityPayload, null);
        
        // Prepare activity data with proper field mappings
        const activityData = {
          athleteId: athlete.id,
          source: 'garmin',
          sourceActivityId: activityPayload.activityId?.toString() || mappedData.sourceActivityId || null,
          activityType: mappedData.activityType || activityPayload.activityType || 'UNKNOWN',
          duration: mappedData.duration || activityPayload.durationInSeconds || 0,
          distance: mappedData.distance || activityPayload.distanceInMeters || 0,
          averageSpeed: mappedData.averageSpeed || activityPayload.averageSpeedInMetersPerSecond || null,
          calories: mappedData.calories || activityPayload.activeKilocalories || null,
          averageHeartRate: mappedData.averageHeartRate || activityPayload.averageHeartRateInBeatsPerMinute || null,
          maxHeartRate: mappedData.maxHeartRate || activityPayload.maxHeartRateInBeatsPerMinute || null,
          elevationGain: mappedData.elevationGain || activityPayload.totalElevationGainInMeters || null,
          steps: mappedData.steps || activityPayload.steps || activityPayload.pushes || null,
          garminUserId: garminUserId,
          syncedAt: new Date(),
          lastUpdatedAt: new Date(),
          // Include additional mapped fields
          activityName: mappedData.activityName || activityPayload.activityName || null,
          startTime: mappedData.startTime || (activityPayload.startTimeInSeconds ? new Date(activityPayload.startTimeInSeconds * 1000) : null),
          startLatitude: mappedData.startLatitude || activityPayload.startLatitude || null,
          startLongitude: mappedData.startLongitude || activityPayload.startLongitude || null,
          endLatitude: mappedData.endLatitude || activityPayload.endLatitude || null,
          endLongitude: mappedData.endLongitude || activityPayload.endLongitude || null,
          summaryPolyline: mappedData.summaryPolyline || activityPayload.summaryPolyline || null,
          deviceName: mappedData.deviceName || activityPayload.deviceMetaData?.deviceName || null,
          summaryData: mappedData.summaryData || activityPayload,
        };
        
        // Create new record in athleteActivity
        const newActivity = await prisma.athleteActivity.create({
          data: activityData
        });
        
        console.log('✅ Activity created:', {
          id: newActivity.id,
          athleteId: athlete.id,
          sourceActivityId: activityData.sourceActivityId,
          activityType: activityData.activityType,
          activityName: activityData.activityName
        });
        
      } catch (activityError) {
        console.error('❌ Error processing individual activity:', activityError);
        // Continue with next activity
      }
    }
    
  } catch (error) {
    console.error('❌ Garmin activity webhook processing error:', error);
    // Don't send error response - already sent 200 OK
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
