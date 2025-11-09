# RunCrew Leaderboard

Holistic view of the data pipeline, metrics, and UI expectations for leaderboard surfaces across admin and member experiences.

---

## Premise
- Showcase top performers inside each RunCrew and motivate friendly competition.
- Surface at-a-glance stats (miles, run count, pace) directly in member view (`RunCrewCentral.jsx`) and admin view (`RunCrewCentralAdmin.jsx`).
- Pull real activity data from Garmin (and future sources) via the `athleteActivity` table and pre-aggregated `RunCrewLeaderboard` records.

---

## Data Sources

### 1. `athleteActivity` (raw workouts)
- Populated by Garmin webhooks (`/api/garmin/activity` + `/api/garmin/details`).
- Schema documented in `docs/athleteactivity-usage.md`.
- Key fields: `athleteId`, `startTime`, `distance`, `duration`, `summaryData`, `detailData`.
- Relationship: many activities per athlete. Used for personal stats (weekly totals, recent runs).

### 2. `RunCrewLeaderboard` (aggregated stats)
- Prisma model `RunCrewLeaderboard`:
  - Keys: `runCrewId`, `athleteId`, `period`, `periodStart`, `periodEnd`.
  - Metrics: `totalMiles`, `totalRuns`, `bestPace`, `totalCalories`, `totalElevation`.
  - Unique index prevents duplicate rows per period.
- Populated by leaderboard jobs or backend services (future automation).
- Included in `/api/runcrew/hydrate` response under `runCrew.leaderboardEntries`.

---

## Hydration Touchpoints

### Athlete Welcome Hydration (`POST /api/athlete/hydrate`)
- Middleware: `verifyFirebaseToken` → attaches `req.user.uid`.
- Returns `athlete`, `weeklyActivities`, `weeklyTotals`.
- Frontend stores via `LocalStorageAPI.setFullHydrationModel({ athlete, weeklyActivities, weeklyTotals })`.
- Weekly data = last 7 days of running activities (`prisma.athleteActivity.findMany` with date window).
- `weeklyTotals` derived client-side friendly stats (distance miles, duration, calories, count).

### RunCrew Hydration (`POST /api/runcrew/hydrate`)
- Request body: `{ runCrewId }` (trusted from local context).
- Includes `leaderboardEntries` with nested `athlete` info for display (name, photo).
- Stored via `LocalStorageAPI.setRunCrewData(runCrew)`.
- Used by both `RunCrewCentralAdmin.jsx` and `RunCrewCentral.jsx` for local-first rendering.

---

## Frontend Consumption

### Local Storage Keys
- `weeklyActivities`, `weeklyTotals` → athlete-level stats.
- `runCrewData.leaderboardEntries` → crew-level leaderboard rows.
- `runCrewData.memberships` → roster (needed for fallback if leaderboard empty).

### Member View (`RunCrewCentral.jsx`)
- Display leaderboard card pulling from `crew.leaderboardEntries`.
- Fallback: derive simple ranking from `crew.memberships` and each member’s `weeklyTotals` (if available).
- Toggle between metrics (`Miles`, `Total Runs`, `Avg Pace`) using the same dataset.

### Admin View (`RunCrewCentralAdmin.jsx`)
- Mirror leaderboard display for preview.
- Provide admin call-to-action to “Refresh Leaderboard” (future API trigger).

---

## Metric Definitions
- **Total Miles**: `leaderboardEntry.totalMiles`. Stored as float (miles). If data comes from `athleteActivity.distance` (meters), convert via `distanceMeters / 1609.34`.
- **Total Runs**: `leaderboardEntry.totalRuns`. Should match count of activities in period.
- **Average Pace**: Format `leaderboardEntry.bestPace` or compute `duration / distance` (convert to min/mile).
- **Calories / Elevation**: optional secondary metrics from leaderboard table.

---

## Implementation Notes
- Respect `period` field (e.g., `'week'`, `'month'`, `'allTime'`). UI can default to `'week'` and provide tabs.
- If `leaderboardEntries` is empty, show an optimistic empty state encouraging members to connect Garmin.
- Ensure avatar fallbacks use member initials when `athlete.photoURL` is missing.
- For weekly totals, reuse `LocalStorageAPI.getFullHydrationModel().weeklyTotals` to show personal progress in athlete home.
- When we add manual sync or Strava support, extend `athleteActivity` ingestion without changing leaderboard contract.

---

## Next Steps
- Build backend cron/worker to populate `RunCrewLeaderboard` from `athleteActivity`.
- Expose API endpoint (e.g., `POST /api/runcrew/leaderboard/recalculate`) for admin-triggered refresh.
- Expand member view leaderboard component to support period switching and tooltips for detailed stats.


