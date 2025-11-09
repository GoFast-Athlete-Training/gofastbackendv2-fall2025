import { getPrismaClient } from '../config/database.js';

/**
 * Compute leaderboard metrics for a RunCrew on the fly.
 * Aggregates athlete activities over the last `days` days (default 7).
 * Returns sorted list by total miles (desc) with activity counts and calories.
 */
export async function computeCrewLeaderboard(runCrewId, days = 7) {
  if (!runCrewId) {
    return [];
  }

  const prisma = getPrismaClient();
  const now = new Date();
  const windowStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

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
                    lte: now
                  }
                },
                select: {
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
    const activities = membership.athlete?.activities || [];
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


