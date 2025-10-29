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
    
    // Just use the raw body - let the mapper handle parsing
    const garminActivity = req.body;
    
    // Extract userId from various possible locations
    const userId = garminActivity.userId || garminActivity.user_id || garminActivity.userIdString || garminActivity.garminUserId || garminActivity.userIdString;
    
    console.log('🔍 Looking for athlete with garmin_user_id:', userId);
    
    // Find our athlete by Garmin user ID
    const athlete = await prisma.athlete.findFirst({
      where: { garmin_user_id: userId }
    });
    
    if (!athlete) {
      console.log('⚠️ No athlete found for Garmin user ID:', userId);
      return res.status(404).json({ success: false, error: 'Athlete not found' });
    }
    
    // Generate our own unique sourceActivityId - don't rely on Garmin
    // Use combination of athleteId + timestamp + random to ensure uniqueness
    const sourceActivityId = `garmin_${athlete.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('🔍 Generated sourceActivityId:', sourceActivityId);
    
    // Check if activity already exists (shouldn't happen with unique IDs, but safety check)
    const existingActivity = null; // Always create new since we generate unique IDs
    
    if (existingActivity) {
      console.log('📝 Updating existing activity summary:', activityId);
      
      // This shouldn't happen since we generate unique IDs, but if it does, update
      const mappedData = GarminFieldMapper.mapActivitySummary(garminActivity, athlete.id);
      mappedData.sourceActivityId = sourceActivityId; // Ensure it matches
      
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
      
      // Create new activity with summary data - use the raw garminActivity object
      const mappedData = GarminFieldMapper.mapActivitySummary(garminActivity, athlete.id);
      
      // CRITICAL: Override sourceActivityId with our generated unique ID
      mappedData.sourceActivityId = sourceActivityId;
      
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
