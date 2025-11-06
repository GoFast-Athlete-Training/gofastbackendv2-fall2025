import { getPrismaClient } from '../config/database.js';
import GarminFieldMapper from './GarminFieldMapper.js';

/**
 * Update activity detail data from Garmin activity-details webhook
 * @param {string|number} activityId - Garmin's activityId (matches sourceActivityId from summary webhook)
 * @param {Object} garminDetailPayload - Raw Garmin detail webhook payload
 * @returns {Promise<Object|null>} - Updated activity record or null if not found
 */
export async function updateActivityDetail(activityId, garminDetailPayload) {
  if (!activityId) {
    console.warn('⚠️ Missing activityId in updateActivityDetail()');
    return null;
  }

  if (!garminDetailPayload) {
    console.warn('⚠️ Missing garminDetailPayload in updateActivityDetail()');
    return null;
  }

  const prisma = getPrismaClient();

  try {
    console.log(`🔍 Looking up activity by sourceActivityId: ${activityId.toString()}`);
    console.log(`💡 This activityId should match the sourceActivityId saved from summary webhook`);
    console.log(`💡 Note: Garmin's summaryId has "-detail" suffix, but we use activityId (number) to match`);
    
    // DEBUG: Show recent sourceActivityIds to help verify matching
    const recentSourceIds = await prisma.athleteActivity.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, sourceActivityId: true, activityName: true, createdAt: true }
    });
    console.log(`📊 Recent sourceActivityIds in DB:`, recentSourceIds.map(a => ({ sourceActivityId: a.sourceActivityId, name: a.activityName })));
    
    // Find the matching activity record using activityId (sourceActivityId is unique)
    const activity = await prisma.athleteActivity.findUnique({
      where: { sourceActivityId: activityId.toString() },
      select: {
        id: true,
        athleteId: true,
        sourceActivityId: true,
        detailData: true
      }
    });

    if (!activity) {
      console.error(`❌ No matching activity found for activityId ${activityId}`);
      console.error(`💡 This means the summary webhook (activityId: ${activityId}) was not received first, or the IDs don't match`);
      console.error(`💡 The activityId from details webhook MUST match the sourceActivityId from summary webhook`);
      
      // DEBUG: Show recent activities to help debug
      const recentActivities = await prisma.athleteActivity.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, sourceActivityId: true, activityName: true, createdAt: true }
      });
      console.error(`📊 Recent activities (last 5):`, recentActivities);
      return null;
    }
    
    console.log(`✅ MATCH FOUND: activityId ${activityId} matches sourceActivityId ${activity.sourceActivityId}`);

    console.log(`✅ Found activity: ${activity.id} for activityId ${activityId}`);
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
      where: { sourceActivityId: activityId.toString() },
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

    console.log(`✅ Activity detail updated for activityId ${activityId}`);
    console.log(`✅ Detail data saved - keys:`, Object.keys(updated.detailData || {}));
    console.log(`✅ hydratedAt: ${updated.hydratedAt}`);

    return updated;

  } catch (error) {
    console.error('❌ Error updating activity detail:', error);
    return null;
  }
}

