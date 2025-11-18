import { getPrismaClient } from '../config/database.js';
import { getCurrentWeek } from '../utils/weekUtils.js';

/**
 * Compute leaderboard metrics for a RunCrew on the fly.
 * Aggregates athlete activities for the current week (Monday-Sunday).
 * Returns sorted list by total miles (desc) with activity counts and calories.
 * 
 * Note: 
 *   - Only includes running activities (excludes bikes, wheelchair, etc.)
 *   - Uses Monday-Sunday week boundaries (not rolling 7 days)
 */
export async function computeCrewLeaderboard(runCrewId) {
  if (!runCrewId) {
    return [];
  }

  const prisma = getPrismaClient();
  const weekRange = getCurrentWeek();
  const windowStart = weekRange.start;
  const windowEnd = weekRange.end;

  const crew = await prisma.runCrew.findUnique({
    where: { id: runCrewId },
    include: {
      memberships: {
        include: {
          athlete: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              photoURL: true,
              activities: {
                where: {
                  startTime: {
                    gte: windowStart,
                    lte: windowEnd
                  },
                  // MVP1: Only include running activities (exclude wheelchair)
                  AND: [
                    {
                      OR: [
                        { activityType: { equals: 'running', mode: 'insensitive' } },
                        { activityType: { equals: 'run', mode: 'insensitive' } }
                      ]
                    },
                    {
                      NOT: {
                        activityType: { contains: 'wheelchair', mode: 'insensitive' }
                      }
                    }
                  ]
                },
                select: {
                  activityType: true,
                  distance: true,
                  duration: true,
                  calories: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!crew) {
    return [];
  }

  const leaderboard = crew.memberships.map((membership) => {
    const allActivities = membership.athlete?.activities || [];
    
    // Safety net: Filter to only running activities (in case query filter missed something)
    const activities = allActivities.filter(activity => {
      if (!activity.activityType) return false;
      const type = activity.activityType.toLowerCase();
      // Include activities with "running" or "run" in the type, but exclude wheelchair
      return (type.includes('running') || type === 'run') && !type.includes('wheelchair');
    });
    
    const totals = activities.reduce(
      (acc, activity) => {
        const distance = activity.distance || 0;
        const duration = activity.duration || 0;
        const calories = activity.calories || 0;

        return {
          distance: acc.distance + distance,
          duration: acc.duration + duration,
          calories: acc.calories + calories
        };
      },
      { distance: 0, duration: 0, calories: 0 }
    );

    const totalMiles = totals.distance / 1609.34;

    return {
      athlete: {
        id: membership.athlete.id,
        firstName: membership.athlete.firstName,
        lastName: membership.athlete.lastName,
        photoURL: membership.athlete.photoURL
      },
      totalDistanceMiles: parseFloat(totalMiles.toFixed(2)),
      totalDuration: totals.duration,
      totalCalories: totals.calories,
      activityCount: activities.length
    };
  });

  const sorted = leaderboard.sort(
    (a, b) => b.totalDistanceMiles - a.totalDistanceMiles
  );

  console.log(`🏃 Crew leaderboard computed: ${sorted.length} members`);
  return sorted;
}


