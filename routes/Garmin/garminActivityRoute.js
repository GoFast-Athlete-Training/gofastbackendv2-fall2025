import express from "express";
import { PrismaClient } from '@prisma/client';
import GarminFieldMapper from '../../services/GarminFieldMapper.js';

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/garmin/activity - Handle Garmin activity webhook
router.post("/activity", async (req, res) => {
  try {
    const { userId, activityId, activityName, activityType, startTimeLocal, durationInSeconds, distanceInMeters, averageSpeed, calories, averageHeartRate, maxHeartRate, elevationGain, steps, startLatitude, startLongitude, endLatitude, endLongitude, summaryPolyline, deviceMetaData } = req.body;
    
    console.log('🔍 DEBUG - Garmin activity webhook received:', { 
      userId, 
      activityId, 
      activityName, 
      activityType: activityType?.typeKey,
      startTimeLocal,
      durationInSeconds,
      distanceInMeters,
      averageSpeed,
      calories,
      averageHeartRate,
      maxHeartRate,
      elevationGain,
      steps,
      deviceName: deviceMetaData?.deviceName
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
        sourceActivityId: activityId?.toString()
      }
    });
    
    if (existingActivity) {
      console.log('📝 Updating existing activity summary:', activityId);
      
      // Update existing activity with new summary data
      const updatedActivity = await prisma.athleteActivity.update({
        where: { id: existingActivity.id },
        data: GarminFieldMapper.mapActivitySummary(req.body, athlete.id)
      });
      
      console.log('✅ Activity summary updated:', updatedActivity.id);
      
      res.json({ 
        success: true, 
        message: 'Activity summary updated', 
        activityId: updatedActivity.id,
        action: 'updated',
        phase: 'summary'
      });
    } else {
      console.log('🆕 Creating new activity summary:', activityId);
      
      // Create new activity with summary data
      const newActivity = await prisma.athleteActivity.create({
        data: GarminFieldMapper.mapActivitySummary(req.body, athlete.id)
      });
      
      console.log('✅ Activity summary created:', newActivity.id);
      
      res.json({ 
        success: true, 
        message: 'Activity summary created', 
        activityId: newActivity.id,
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
