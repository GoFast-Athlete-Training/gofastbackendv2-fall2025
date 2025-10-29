import express from "express";
import { getPrismaClient } from '../../config/database.js';
import GarminFieldMapper from '../../services/GarminFieldMapper.js';

const router = express.Router();

// POST /api/garmin/activity - Handle Garmin activity webhook
router.post("/activity", async (req, res) => {
  try {
    const prisma = getPrismaClient();
    
    // Log the COMPLETE raw body to see what Garmin is actually sending
    console.log('🔍 RAW Garmin webhook body:', JSON.stringify(req.body, null, 2));
    
    // Try multiple possible field names from Garmin webhook
    const garminActivity = req.body;
    
    // Extract data - try different possible field structures
    const userId = garminActivity.userId || garminActivity.user_id || garminActivity.userIdString || garminActivity.garminUserId;
    const activityId = garminActivity.activityId || garminActivity.activity_id || garminActivity.id;
    const activityName = garminActivity.activityName || garminActivity.activity_name || garminActivity.name;
    const activityType = garminActivity.activityType || garminActivity.activity_type;
    const startTimeLocal = garminActivity.startTimeLocal || garminActivity.start_time_local || garminActivity.startTime || garminActivity.start_time;
    const durationInSeconds = garminActivity.durationInSeconds || garminActivity.duration_in_seconds || garminActivity.duration;
    const distanceInMeters = garminActivity.distanceInMeters || garminActivity.distance_in_meters || garminActivity.distance;
    
    console.log('🔍 Parsed Garmin activity webhook:', { 
      userId, 
      activityId, 
      activityName, 
      activityType: activityType?.typeKey || activityType,
      startTimeLocal,
      durationInSeconds,
      distanceInMeters
    });
    
    // Find our athlete by Garmin user ID
    const athlete = await prisma.athlete.findFirst({
      where: { garmin_user_id: userId }
    });
    
    if (!athlete) {
      console.log('⚠️ No athlete found for Garmin user ID:', userId);
      return res.status(404).json({ success: false, error: 'Athlete not found' });
    }
    
    // Check if activity already exists (using sourceActivityId as unique key)
    const existingActivity = await prisma.athleteActivity.findFirst({
      where: { 
        sourceActivityId: activityId?.toString(),
        athleteId: athlete.id // Ensure we're checking within the correct athlete
      }
    });
    
    if (existingActivity) {
      console.log('📝 Updating existing activity summary:', activityId);
      
      // Update existing activity with new summary data - use the parsed garminActivity object
      const mappedData = GarminFieldMapper.mapActivitySummary(garminActivity, athlete.id);
      
      console.log('📝 Updating activity with mapped data:', mappedData);
      
      const updatedActivity = await prisma.athleteActivity.update({
        where: { id: existingActivity.id },
        data: mappedData
      });
      
      console.log('✅ Activity summary updated:', updatedActivity.id);
      
      res.json({ 
        success: true, 
        message: 'Activity summary updated', 
        activityId: updatedActivity.id,
        athleteId: athlete.id,
        action: 'updated',
        phase: 'summary'
      });
    } else {
      console.log('🆕 Creating new activity summary:', activityId);
      
      // Create new activity with summary data - use the parsed garminActivity object
      const mappedData = GarminFieldMapper.mapActivitySummary(garminActivity, athlete.id);
      
      // Ensure sourceActivityId has a value or generate one from activityId
      if (!mappedData.sourceActivityId && activityId) {
        mappedData.sourceActivityId = activityId.toString();
      }
      
      // If still no sourceActivityId, generate a temporary one to avoid null constraint
      if (!mappedData.sourceActivityId) {
        mappedData.sourceActivityId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      console.log('📝 Creating activity with mapped data:', mappedData);
      
      const newActivity = await prisma.athleteActivity.create({
        data: mappedData
      });
      
      console.log('✅ Activity summary created:', newActivity.id);
      
      res.json({ 
        success: true, 
        message: 'Activity summary created', 
        activityId: newActivity.id,
        athleteId: athlete.id,
        action: 'created',
        phase: 'summary'
      });
    }
    
  } catch (error) {
    console.error('❌ Garmin activity webhook error:', error);
    res.status(500).json({ success: false, error: 'Failed to process activity webhook' });
  }
});

// POST /api/garmin/details - Handle Garmin activity details webhook (Phase 2)
router.post("/details", async (req, res) => {
  try {
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
