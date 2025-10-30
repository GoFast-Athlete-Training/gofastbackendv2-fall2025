import express from 'express';
import { getPrismaClient } from '../../config/database.js';

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
    
    const prisma = getPrismaClient();
    const { summaryId } = req.body;
    
    if (summaryId) {
      // Find the matching activity record using summaryId
      const activity = await prisma.athleteActivity.findFirst({
        where: { sourceActivityId: summaryId.toString() },
      });
      
      if (activity) {
        // Update the activity with detail data
        await prisma.athleteActivity.update({
          where: { sourceActivityId: summaryId.toString() },
          data: {
            detailData: req.body,
            hydratedAt: new Date(),
          },
        });
        
        console.log(`✅ Activity detail linked for summaryId ${summaryId}`);
      } else {
        console.log(`⚠️ No matching activity found for summaryId ${summaryId}`);
      }
    } else {
      console.log('⚠️ No summaryId found in activity details payload');
    }
    
  } catch (err) {
    console.error('❌ Error saving Garmin detail data:', err);
    // Already sent 200 - Garmin test should pass
  }
});

export default router;
