import express from 'express';
import { updateActivityDetail } from '../../services/garminUpdateActivityDetailService.js';

const router = express.Router();

// Top-level middleware logger for all Garmin webhooks
router.use((req, res, next) => {
  console.log(`📡 Garmin webhook incoming: ${req.method} ${req.originalUrl}`);
  next();
});

// POST /api/garmin/activity-details - Handle Garmin's activity detail webhook
// Dedicated file for activity details webhook
router.post("/activity-details", async (req, res) => {
  // 1️⃣ Acknowledge Garmin immediately for test compliance
  res.sendStatus(200);

  try {
    console.log('📊 Garmin activity detail received');
    console.log('📊 Detail payload keys:', Object.keys(req.body));
    
    // Garmin sends { activityDetails: [...] } - an array of activity details
    const activityDetails = req.body?.activityDetails || (Array.isArray(req.body) ? req.body : [req.body]);
    
    if (!Array.isArray(activityDetails) || activityDetails.length === 0) {
      console.error('❌ Invalid payload structure - expected { activityDetails: [...] } or array');
      console.error('📊 Available keys:', Object.keys(req.body));
      return;
    }
    
    console.log(`📊 Processing ${activityDetails.length} activity detail(s)`);
    
    // Process each activity detail
    for (const activityDetail of activityDetails) {
      try {
        // Extract activityId (this should match sourceActivityId from summary webhook)
        // Note: summaryId has "-detail" suffix, so use activityId instead
        const activityId = activityDetail.activityId || activityDetail.summaryId?.replace('-detail', '') || activityDetail.summary?.activityId;
        
        console.log(`🔍 Processing activity detail - activityId: ${activityId}, summaryId: ${activityDetail.summaryId}`);
        console.log(`📊 Activity detail keys:`, Object.keys(activityDetail));
        
        if (!activityId) {
          console.error('❌ No activityId found in activity detail');
          console.error('📊 Activity detail:', JSON.stringify(activityDetail, null, 2).substring(0, 500));
          continue;
        }
        
        // Use service to update activity detail (pass the activityId, not summaryId)
        const updated = await updateActivityDetail(activityId.toString(), activityDetail);
        
        if (!updated) {
          console.error(`❌ Failed to update activity detail for activityId ${activityId}`);
          continue;
        }
        
        console.log(`✅ Activity detail updated successfully for activityId ${activityId}`);
        
      } catch (detailError) {
        console.error('❌ Error processing individual activity detail:', detailError);
        // Continue with next activity detail
      }
    }
    
  } catch (err) {
    console.error('❌ Error saving Garmin detail data:', err);
    // Already sent 200 - Garmin test should pass
  }
});

export default router;
