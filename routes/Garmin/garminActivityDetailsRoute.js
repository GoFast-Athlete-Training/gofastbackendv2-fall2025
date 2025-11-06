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
    console.log('📊 Detail payload sample:', JSON.stringify(req.body, null, 2).substring(0, 1000));
    
    // Try different field names for summaryId
    const summaryId = req.body?.summaryId || req.body?.activityId || req.body?.activitySummaryId || req.body?.activity?.summaryId;
    
    console.log(`🔍 Extracted summaryId: ${summaryId} (type: ${typeof summaryId})`);
    
    if (!summaryId) {
      console.error('❌ No summaryId found in activity details payload');
      console.error('📊 Available keys:', Object.keys(req.body));
      console.error('📊 Full payload:', JSON.stringify(req.body, null, 2));
      return;
    }
    
    // Use service to update activity detail
    const updated = await updateActivityDetail(summaryId, req.body);
    
    if (!updated) {
      console.error(`❌ Failed to update activity detail for summaryId ${summaryId}`);
      return;
    }
    
    console.log(`✅ Activity detail updated successfully for summaryId ${summaryId}`);
    
  } catch (err) {
    console.error('❌ Error saving Garmin detail data:', err);
    // Already sent 200 - Garmin test should pass
  }
});

export default router;
