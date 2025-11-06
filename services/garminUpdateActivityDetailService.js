import { getPrismaClient } from '../config/database.js';
import GarminFieldMapper from './GarminFieldMapper.js';

/**
 * Update activity detail data from Garmin activity-details webhook
 * @param {string} summaryId - Garmin's activity summaryId (sourceActivityId)
 * @param {Object} garminDetailPayload - Raw Garmin detail webhook payload
 * @returns {Promise<Object|null>} - Updated activity record or null if not found
 */
export async function updateActivityDetail(summaryId, garminDetailPayload) {
  if (!summaryId) {
    console.warn('⚠️ Missing summaryId in updateActivityDetail()');
    return null;
  }

  if (!garminDetailPayload) {
    console.warn('⚠️ Missing garminDetailPayload in updateActivityDetail()');
    return null;
  }

  const prisma = getPrismaClient();

  try {
    console.log(`🔍 Looking up activity by sourceActivityId: ${summaryId.toString()}`);
    console.log(`💡 This summaryId should match the activityId from the summary webhook`);
    
    // Find the matching activity record using summaryId (sourceActivityId is unique)
    const activity = await prisma.athleteActivity.findUnique({
      where: { sourceActivityId: summaryId.toString() },
      select: {
        id: true,
        athleteId: true,
        sourceActivityId: true,
        detailData: true
      }
    });

    if (!activity) {
      console.error(`❌ No matching activity found for summaryId ${summaryId}`);
      console.error(`💡 This means the summary webhook (activityId: ${summaryId}) was not received first, or the IDs don't match`);
      console.error(`💡 The summaryId from details webhook MUST match the activityId from summary webhook`);
      
      // DEBUG: Show recent activities to help debug
      const recentActivities = await prisma.athleteActivity.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, sourceActivityId: true, activityName: true, createdAt: true }
      });
      console.error(`📊 Recent activities (last 5):`, recentActivities);
      return null;
    }
    
    console.log(`✅ MATCH FOUND: summaryId ${summaryId} matches sourceActivityId ${activity.sourceActivityId}`);

    console.log(`✅ Found activity: ${activity.id} for summaryId ${summaryId}`);
    console.log(`📊 Current detailData: ${activity.detailData ? 'EXISTS' : 'NULL'}`);

    // Map detail data using GarminFieldMapper
    const mappedDetailData = GarminFieldMapper.mapActivityDetails(garminDetailPayload);

    console.log(`📊 Mapped detailData:`, mappedDetailData ? 'EXISTS' : 'NULL');
    console.log(`📊 Mapped detailData keys:`, mappedDetailData?.detailData ? Object.keys(mappedDetailData.detailData) : 'null');

    if (!mappedDetailData || !mappedDetailData.detailData) {
      console.warn(`⚠️ No detail data to save (mapActivityDetails returned null or empty)`);
      console.warn(`📊 This might be normal if Garmin didn't send detail data for this activity`);
      return null;
    }

    // Update the activity with mapped detail data
    const updated = await prisma.athleteActivity.update({
      where: { sourceActivityId: summaryId.toString() },
      data: {
        detailData: mappedDetailData.detailData, // Only the mapped detail data
        hydratedAt: mappedDetailData.hydratedAt,
        lastUpdatedAt: mappedDetailData.lastUpdatedAt,
      },
      select: {
        id: true,
        athleteId: true,
        sourceActivityId: true,
        detailData: true,
        hydratedAt: true
      }
    });

    console.log(`✅ Activity detail updated for summaryId ${summaryId}`);
    console.log(`✅ Detail data saved - keys:`, Object.keys(updated.detailData || {}));
    console.log(`✅ hydratedAt: ${updated.hydratedAt}`);

    return updated;

  } catch (error) {
    console.error('❌ Error updating activity detail:', error);
    return null;
  }
}

