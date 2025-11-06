import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import GarminFieldMapper from '../../services/GarminFieldMapper.js';

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
    console.log('📊 Detail payload sample:', JSON.stringify(req.body, null, 2).substring(0, 500));
    
    const prisma = getPrismaClient();
    // Try different field names for summaryId
    const summaryId = req.body?.summaryId || req.body?.activityId || req.body?.activitySummaryId || req.body?.activity?.summaryId;
    
    if (!summaryId) {
      console.log('⚠️ No summaryId found in activity details payload');
      console.log('📊 Available keys:', Object.keys(req.body));
      return;
    }
    
    // Find the matching activity record using summaryId (sourceActivityId is unique)
    const activity = await prisma.athleteActivity.findUnique({
      where: { sourceActivityId: summaryId.toString() },
    });
    
    if (!activity) {
      console.log(`⚠️ No matching activity found for summaryId ${summaryId}`);
      return;
    }
    
    // Map detail data using GarminFieldMapper
    const mappedDetailData = GarminFieldMapper.mapActivityDetails(req.body);
    
    // Update the activity with mapped detail data
    await prisma.athleteActivity.update({
      where: { sourceActivityId: summaryId.toString() },
      data: {
        detailData: mappedDetailData.detailData, // Only the mapped detail data
        hydratedAt: mappedDetailData.hydratedAt,
        lastUpdatedAt: mappedDetailData.lastUpdatedAt,
      },
    });
    
    console.log(`✅ Activity detail linked for summaryId ${summaryId}`);
    console.log(`✅ Detail data keys:`, mappedDetailData.detailData ? Object.keys(mappedDetailData.detailData) : 'null');
    
  } catch (err) {
    console.error('❌ Error saving Garmin detail data:', err);
    // Already sent 200 - Garmin test should pass
  }
});

export default router;
