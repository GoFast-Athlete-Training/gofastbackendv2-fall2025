# RunCrewAdmin Hydration Architecture

**Last Updated**: December 2024  
**Status**: ✅ Design Document  
**Purpose**: Define hydration architecture for RunCrew Admin dashboard  
**Related**: `runCrewMembership.md`, `RunCrewArchitecture.md`

---

## Premise

The RunCrewAdmin page (`/crew/crewadmin` or `/runcrew/central/admin`) **MUST** fetch its own data independently. It should **NOT** rely on Welcome hydration or localStorage cache. The admin page requires fresh, real-time data to manage the crew effectively.

---

## Key Principle

**Admin page should NOT rely on Welcome hydration. It must fetch its own data.**

The admin page is an action center that requires:
- Real-time member data
- Current announcements
- Up-to-date leaderboard
- Fresh run schedule
- Accurate invite codes

All data must be fetched directly from the backend APIs on page load.

---

## Required Data Hydration

### 1. RunCrew Core Data
**Endpoint**: `GET /api/runcrew/:id` (with Firebase token)  
**Required Fields**:
- `id` - RunCrew ID
- `name` - Crew name
- `description` - Crew description
- `joinCode` - **REAL invite code** (not hardcoded FAST123)
- `logo` - Logo URL (if exists)
- `icon` - Icon emoji (if exists)
- `createdAt`, `updatedAt` - Timestamps

**Return Shape**:
```json
{
  "success": true,
  "runCrew": {
    "id": "cmhlg0io60001sj1vlqn13vnx",
    "name": "Morning Warriors",
    "description": "5am grind, every day",
    "joinCode": "FAST123",
    "logo": null,
    "icon": "🔥",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "managers": [...],
    "memberships": [...],
    "announcements": [...],
    "runs": [...]
  }
}
```

### 2. Members List
**Endpoint**: `GET /api/runcrew/:id` (includes memberships)  
**Alternative**: Use memberships from `/api/runcrew/:id` response  
**Required Nested Includes**:
- `memberships.athlete` - Full athlete data
- `memberships.athlete.photoURL` - Profile photo
- `memberships.athlete.firstName`, `lastName` - Display name
- `memberships.athlete.email` - Contact info (admin only)

**Return Shape**:
```json
{
  "memberships": [
    {
      "id": "mem_123",
      "athleteId": "ath_456",
      "joinedAt": "2024-01-01T00:00:00Z",
      "athlete": {
        "id": "ath_456",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "photoURL": "https://..."
      }
    }
  ]
}
```

**Note**: Members are included in the main `/api/runcrew/:id` endpoint response. No separate `/members` endpoint is needed.

### 3. Leaderboard Data
**Endpoint**: `GET /api/runcrew/:id/leaderboard`  
**Query Parameters**:
- `metric` - `miles` | `runs` | `calories` (default: `miles`)
- `days` - Number of days to look back (default: `7`)

**Return Shape**:
```json
{
  "success": true,
  "leaderboard": [
    {
      "athlete": {
        "id": "ath_456",
        "firstName": "John",
        "lastName": "Doe",
        "photoURL": "https://..."
      },
      "totalMiles": 45.2,
      "totalRuns": 12,
      "totalCalories": 3450,
      "latestRunAt": "2024-12-15T06:30:00Z"
    }
  ],
  "metric": "miles",
  "days": 7,
  "windowStart": "2024-12-08T00:00:00Z",
  "windowEnd": "2024-12-15T00:00:00Z"
}
```

### 4. Announcements
**Endpoint**: `GET /api/runcrew/:id/announcements`  
**Return Shape**:
```json
{
  "success": true,
  "announcements": [
    {
      "id": "ann_123",
      "title": "Saturday Group Run",
      "content": "Meet at Central Park at 7am...",
      "createdAt": "2024-12-15T10:00:00Z",
      "author": {
        "id": "ath_456",
        "firstName": "John",
        "lastName": "Doe",
        "photoURL": "https://..."
      }
    }
  ]
}
```

### 5. Runs Schedule
**Endpoint**: `GET /api/runcrew/:id` (includes runs)  
**Return Shape**:
```json
{
  "runs": [
    {
      "id": "run_123",
      "title": "Saturday Sunrise Run",
      "date": "2024-12-21T06:30:00Z",
      "startTime": "6:30 AM",
      "meetUpPoint": "Central Park – Bethesda Terrace",
      "totalMiles": 5.0,
      "pace": "8:00-8:30",
      "rsvps": [...]
    }
  ]
}
```

---

## API Endpoints Summary

### Primary Endpoint: GET /api/runcrew/:id
- **Auth**: Firebase token required
- **Returns**: Full RunCrew with all relations
- **Includes**: managers, memberships (with athlete), announcements, runs, messages
- **Use Case**: Initial page load, full crew hydration

### Secondary Endpoints (Independent Loading)

#### GET /api/runcrew/:id/leaderboard
- **Auth**: Firebase token required
- **Query Params**: `metric`, `days`
- **Returns**: Computed leaderboard data
- **Use Case**: Load leaderboard independently, refresh on metric change

#### GET /api/runcrew/:id/announcements
- **Auth**: Firebase token required
- **Returns**: List of announcements
- **Use Case**: Load announcements independently, refresh after posting

**Note**: There is no separate `/members` endpoint. Members are included in the main `/api/runcrew/:id` response via `memberships` relation.

---

## Removal of Hardcoded Values

### ❌ DO NOT USE:
- `FAST123` - Hardcoded invite code
- `runCrewId: "cmhlg0io60001sj1vlqn13vnx"` - Hardcoded ID
- `athleteId: "ath_123"` - Hardcoded athlete ID
- Static invite links like `https://athlete.gofastcrushgoals.com/join?code=FAST123`
- Placeholder leaderboard data

### ✅ MUST USE:
- `runCrew.joinCode` - Real invite code from API
- `runCrewId` from URL params or `useParams()`
- `athleteId` from `useHydratedAthlete()` hook
- `generateUniversalInviteLink(runCrew.joinCode)` - Dynamic invite link builder
- Server-computed leaderboard from `/api/runcrew/:id/leaderboard`

---

## Fallback States

### 1. RunCrew Hydration Failed
**Scenario**: `GET /api/runcrew/:id` returns 404 or 500  
**UI Response**:
```jsx
<div className="bg-red-50 border border-red-200 rounded-lg p-6">
  <h3 className="text-red-800 font-semibold mb-2">Failed to Load Crew</h3>
  <p className="text-red-700 text-sm mb-4">
    Unable to load crew data. Please check your connection and try again.
  </p>
  <button onClick={handleRetry} className="bg-red-600 text-white px-4 py-2 rounded">
    Retry
  </button>
</div>
```

### 2. Member Hydration Failed
**Scenario**: `memberships` array is empty or undefined  
**UI Response**:
```jsx
<div className="border border-dashed border-gray-300 rounded-xl p-6 text-center text-sm text-gray-500">
  No members yet. Share your invite code to build the crew.
</div>
```

**Note**: If memberships fail to load but RunCrew loads, show empty state with invite panel.

### 3. Leaderboard Hydration Failed
**Scenario**: `GET /api/runcrew/:id/leaderboard` returns error or empty array  
**UI Response**:
```jsx
<div className="text-center py-6">
  <p className="text-sm text-gray-500 mb-2">No leaderboard data yet.</p>
  <p className="text-xs text-gray-400">
    Stats will appear once your crew syncs activities from Garmin.
  </p>
</div>
```

### 4. Announcements Hydration Failed
**Scenario**: `GET /api/runcrew/:id/announcements` returns error  
**UI Response**:
```jsx
<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
  <p className="text-yellow-800 text-sm">
    Unable to load announcements. Please refresh the page.
  </p>
</div>
```

---

## Hydration Flow

### Page Load Sequence

1. **Mount** → Check URL for `crewId` or `id` param
2. **Fetch RunCrew** → `GET /api/runcrew/:id` (with Firebase token)
   - If 404/403 → Show error state
   - If success → Store in state, proceed
3. **Fetch Leaderboard** → `GET /api/runcrew/:id/leaderboard?metric=miles&days=7`
   - Independent request (don't wait for RunCrew)
   - On error → Show empty state
4. **Fetch Announcements** → `GET /api/runcrew/:id/announcements`
   - Independent request (don't wait for RunCrew)
   - On error → Show error message
5. **Extract Members** → From `runCrew.memberships` array
   - If empty → Show "No members" state

### Refresh Flow

- **Manual Sync Button** → Calls `handleResync()`
  - Re-fetches all data independently
  - Updates state for each component
- **Metric Change** → Only reloads leaderboard
- **Announcement Posted** → Only reloads announcements

---

## Implementation Checklist

- [ ] Remove all hardcoded invite codes (FAST123)
- [ ] Remove hardcoded runCrewId/athleteId
- [ ] Use `runCrew.joinCode` for invite panel
- [ ] Use `generateUniversalInviteLink()` for invite links
- [ ] Fetch RunCrew from `/api/runcrew/:id` on mount
- [ ] Fetch leaderboard from `/api/runcrew/:id/leaderboard` independently
- [ ] Fetch announcements from `/api/runcrew/:id/announcements` independently
- [ ] Extract members from `runCrew.memberships` (no separate endpoint)
- [ ] Add error states for each hydration failure
- [ ] Remove dependency on Welcome hydration
- [ ] Remove dependency on localStorage cache (use as fallback only)

---

## Testing Checklist

- [ ] Page loads with real runCrew data from URL param
- [ ] Members list shows all real members from API
- [ ] Invite panel shows correct invite code from API
- [ ] Leaderboard populates once activities exist
- [ ] Leaderboard updates when metric changes
- [ ] Announcements load independently
- [ ] Error states display correctly for failed requests
- [ ] Manual sync button refreshes all data
- [ ] No hardcoded values in UI

---

## Related Documentation

- `runCrewMembership.md` - Membership data structure
- `RunCrewArchitecture.md` - Overall RunCrew architecture
- `LeaderBoard.md` - Leaderboard computation details

