## Overview
Hydration V2 keeps the GoFast platform fast, privacy-safe, and predictable across three layers of data:

- **Athlete Hydration** (Welcome / `/api/athlete/hydrate`) primes the logged-in user with their profile, weekly activity totals, and crew context.
- **Crew Hydration** (`/api/runcrew/hydrate`) delivers a trimmed, aggregate-only snapshot of the active crew for local-first rendering.
- **Roster Hydration** surfaces only the information a member is allowed to see about their teammates, with server-side membership checks before loading profiles.

The result is a consistent contract between backend responses, local storage, and UI modules so every page can render instantly while respecting member privacy.

## LocalStorageConfig Changes
`src/config/LocalStorageConfig.js` now exposes two new helpers that wrap crew hydration:

```javascript
LocalStorageAPI.setCrewHydration(runCrewId, crewData);
LocalStorageAPI.getCrewHydration(runCrewId);
```

Key behaviors:
- Validates `runCrewId` and `crewData` before persisting.
- Sanitises incoming crew payloads:
  - Keeps only top-level crew metadata (`id`, `name`, `description`, `logo`, `icon`, `isAdmin`, `currentManagerId`).
  - Stores `leaderboardDynamic` as aggregated totals per athlete (miles, duration, calories, activity count).
  - Slices runs to the top 5 and messages to the top 10 before persisting.
  - Converts memberships into `memberPreviews` `{ athleteId, name, photoURL }`.
  - Trims every RSVP to `{ athleteId, name, photoURL, status }`.
  - Normalises announcement authors to name + avatar only.
- Writes the sanitized payload to `localStorage` under the key `crew_${runCrewId}_hydration`.
- `getCrewHydration(runCrewId)` reads and parses the trimmed object safely, returning `null` if parsing fails.

All existing athlete hydration helpers (`setFullHydrationModel`, `getFullHydrationModel`, etc.) remain unchanged.

## Crew Hydration Payload
After sanitisation, the object cached per crew looks like:

```json
{
  "id": "cmhlg0io60001sj1vlqn13vnx",
  "name": "Morning Warriors",
  "description": "Clarendon’s 6am crew.",
  "logo": "https://cdn.gofast.run/morning-warriors.png",
  "icon": "☕️",
  "isAdmin": true,
  "currentManagerId": "cmhlhv3w9000jrj1hphe5sbnv",
  "leaderboardDynamic": [
    {
      "athleteId": "ath_123",
      "firstName": "Adam",
      "lastName": "Cole",
      "photoURL": "https://cdn.gofast.run/adam.jpg",
      "totalDistanceMiles": 38.2,
      "totalDuration": 15430,
      "totalCalories": 4250,
      "activityCount": 6
    }
  ],
  "memberPreviews": [
    { "athleteId": "ath_123", "name": "Adam C.", "photoURL": "https://cdn.gofast.run/adam.jpg" },
    { "athleteId": "ath_456", "name": "Sarah J.", "photoURL": null }
  ],
  "runs": [
    {
      "id": "run_001",
      "title": "Friday Tempo",
      "date": "2025-11-14T11:00:00.000Z",
      "time": "6:00 AM",
      "meetUpPoint": "Blue Bottle Coffee",
      "meetUpAddress": "4069 Wilson Blvd, Arlington, VA",
      "totalMiles": 6,
      "pace": "7:45-8:15 min/mi",
      "description": "Tempo miles with a coffee cool-down.",
      "stravaMapUrl": "https://strava.com/routes/123",
      "rsvps": [
        { "athleteId": "ath_123", "name": "Adam C.", "photoURL": "https://...", "status": "going" }
      ]
    }
  ],
  "messages": [
    {
      "id": "msg_004",
      "content": "Anyone up for hill repeats next week?",
      "createdAt": "2025-11-08T12:30:00.000Z",
      "author": { "athleteId": "ath_456", "name": "Sarah J.", "photoURL": null }
    }
  ],
  "announcements": [
    {
      "id": "ann_001",
      "title": "Group Run Tomorrow!",
      "content": "Meet at the trailhead. Bring water!",
      "createdAt": "2025-11-08T10:00:00.000Z",
      "author": { "id": "ath_123", "name": "Adam C.", "photoURL": "https://..." }
    }
  ]
}
```

Only consumable presentation data is stored; sensitive attributes are stripped before caching.

## Roster Hydration Flow
1. **Initial Render** – Member tab reads `memberPreviews` from `LocalStorageAPI.getCrewHydration(runCrewId)` for instant roster display.
2. **Profile Click** – Frontend requests `GET /api/athlete/profile/:athleteId` with the current crew ID in the headers (or body).
3. **Backend Membership Check** – Route enforces same-crew visibility:

```javascript
const membership = await prisma.runCrewMembership.findFirst({
  where: { athleteId: requesterId, runCrewId },
  select: { id: true }
});

if (!membership) {
  return res.status(403).json({ success: false, error: 'Not a crew member' });
}
```

4. **Limited Profile Response** – Only the essentials are returned:

```json
{
  "id": "ath_456",
  "firstName": "Sarah",
  "lastName": "Johnson",
  "photoURL": "https://cdn.gofast.run/sarah.jpg",
  "totalMiles": 142.7,
  "recentActivities": [
    { "id": "act_001", "date": "2025-11-07", "distanceMiles": 5.2, "pace": "7:48" }
  ]
}
```

5. **Caching Rules** – The logged-in athlete’s full hydration stays in `localStorage`. Any teammate profile fetched via the roster is held temporarily in `sessionStorage` to avoid persistent storage of other members’ data.

## Leaderboard Dynamic Computation
Back-end aggregation lives in `services/crewLeaderboard.js`:

```javascript
export async function computeCrewLeaderboard(runCrewId, days = 7) {
  const now = new Date();
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

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
                where: { startTime: { gte: start, lte: now } },
                select: { distance: true, duration: true, calories: true }
              }
            }
          }
        }
      }
    }
  });
```

The helper sums distance/duration/calories, converts meters → miles, sorts by miles, and returns:

```json
[
  {
    "athleteId": "ath_123",
    "firstName": "Adam",
    "lastName": "Cole",
    "photoURL": "https://...",
    "totalDistanceMiles": 38.2,
    "totalDuration": 15430,
    "totalCalories": 4250,
    "activityCount": 6
  }
]
```

Frontend usage:

```jsx
leaderboard.map((entry) => (
  <LeaderboardRow
    key={entry.athleteId}
    avatar={entry.photoURL}
    name={`${entry.firstName} ${entry.lastName?.charAt(0) || ''}.`}
    miles={entry.totalDistanceMiles.toFixed(1)}
    runs={`${entry.activityCount} runs`}
  />
));
```

No raw GPS tracks or per-activity details are exposed.

## Event RSVPs Handling
- Each run in the hydrate payload carries a lightweight RSVP array:

```json
[
  { "athleteId": "ath_123", "name": "Adam C.", "photoURL": "https://...", "status": "going" },
  { "athleteId": "ath_456", "name": "Sarah J.", "photoURL": null, "status": "interested" }
]
```

- The frontend renders avatars, short names, and status chips (`Going`, `Interested`, `Maybe`).
- No email addresses, totals, or private stats are cached in the crew snapshot.

## Privacy & Safety Rules
- Only aggregated metrics (miles, duration, calories, counts) are cached; raw activity streams stay server-side.
- Member previews show first name + last initial and avatar only.
- Cross-member profile access requires the requesting athlete to be a verified member of the same crew.
- Other members’ profiles are **not** written to persistent storage; they live in `sessionStorage` for the duration of the tab.
- Sensitive identifiers (emails, Garmin IDs, OAuth tokens) never leave the backend hydration response.

## Benefits & Next Steps
- **Performance**: Local-first rendering with sanitised objects keeps RunCrew pages snappy and offline-friendly.
- **Scalability**: Aggregates are computed on demand; no more maintaining cached leaderboard tables.
- **Privacy**: Strict data trimming and membership checks prevent oversharing between athletes.

Next steps:
- Adopt `LocalStorageAPI.setCrewHydration` inside RunCrew admin/member pages.
- Add sessionStorage helpers for on-demand teammate profile caching.
- Expand the roster API to support additional public stats (badges, streaks) once privacy rules are finalised.

