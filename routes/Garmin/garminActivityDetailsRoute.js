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
        // Log all key IDs for debugging
        console.log(`📊 ID EXTRACTION - All available IDs:`);
        console.log(`   - userId: ${activityDetail.userId}`);
        console.log(`   - summaryId: ${activityDetail.summaryId}`);
        console.log(`   - activityId (top-level): ${activityDetail.activityId}`);
        console.log(`   - summary.activityId: ${activityDetail.summary?.activityId}`);
        
        // Summary webhook saves: sourceActivityId = activityId (top-level from summary webhook)
        // Details webhook has: activityId (top-level) and summary.activityId (nested)
        // CRITICAL: Try top-level activityId FIRST (this is what summary webhook saved!)
        if (!activityDetail.activityId && !activityDetail.summary?.activityId) {
          console.error('❌ No activityId found in activity detail');
          console.error('📊 Activity detail:', JSON.stringify(activityDetail, null, 2).substring(0, 500));
          continue;
        }
        
        // Try top-level activityId FIRST (matches what summary webhook saved)
        let updated = null;
        let matchedActivityId = null;
        
        if (activityDetail.activityId) {
          console.log(`🔍 Attempting match with top-level activityId: ${activityDetail.activityId} (what summary webhook saved)`);
          updated = await updateActivityDetail(activityDetail.activityId.toString(), activityDetail);
          if (updated) {
            matchedActivityId = activityDetail.activityId;
            console.log(`✅ Match successful with top-level activityId: ${matchedActivityId}`);
          }
        }
        
        // If that fails, try summary.activityId as fallback
        if (!updated && activityDetail.summary?.activityId) {
          console.warn(`⚠️ Top-level activityId (${activityDetail.activityId}) didn't match, trying summary.activityId: ${activityDetail.summary.activityId}`);
          updated = await updateActivityDetail(activityDetail.summary.activityId.toString(), activityDetail);
          if (updated) {
            matchedActivityId = activityDetail.summary.activityId;
            console.log(`✅ Fallback match successful with summary.activityId: ${matchedActivityId}`);
          }
        }
        
        if (!updated) {
          console.error(`❌ Failed to match with both activityId (${activityDetail.activityId}) and summary.activityId (${activityDetail.summary?.activityId})`);
          console.error(`💡 Summary webhook may not have been received for these activities yet`);
          continue;
        }
        
        console.log(`✅ Activity detail updated successfully for activityId ${matchedActivityId}`);
        
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
