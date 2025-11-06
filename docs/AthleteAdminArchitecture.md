# Athlete Admin Architecture

**Last Updated**: November 2025  
**Purpose**: Complete architecture documentation for athlete admin system - frontend dashboard and backend hydration routes

---

## Overview

The Athlete Admin system provides a **God-view** across the GoFast platform for managing athletes, activities, RunCrews, and other entities. It uses a **local-first hydration pattern** where data is fetched once, stored in localStorage, and used throughout the dashboard.

**Key Principle**: Hydrate once, use everywhere - no redundant API calls.

**Universal Hydration Returns**:
- **All Athletes** - Complete athlete objects with all relations (Garmin, activities, memberships)
- **All RunCrews** - Complete RunCrew objects with all relations (members, messages, leaderboards, runs, events)

**Storage**: Single hydration call → localStorage → All components read from localStorage

---

## Architecture Layers

### 1. Backend Hydration Routes
**Location**: `routes/Admin/adminHydrateRoute.js`

### 2. Frontend Dashboard
**Location**: `gofast-user-dashboard/src/pages/`

### 3. Data Flow
**Data Flow**: API → localStorage → Components

---

## Backend Architecture

### Route Structure

**File**: `routes/Admin/adminHydrateRoute.js`

**Universal Hydration Route** (PRIMARY):
- `GET /api/admin/hydrate?entity=athletes,runcrews` - **Hydrate all entities at once**
  - Returns: `{ athletes: [...], runCrews: [...], count: {...} }`
  - **This is the ONE route to use** - hydrates everything in a single call

**Individual Entity Routes** (for specific needs):
- `GET /api/admin/athletes/hydrate` - List all athletes only
- `GET /api/admin/runcrews/hydrate` - List all RunCrews only
- `GET /api/admin/athletes/:id/hydrate` - Single athlete details (admin view)
- `GET /api/admin/athletes/hydrate/summary` - Summary statistics

**Legacy Routes** (for compatibility):
- `GET /api/athlete/admin/hydrate` → Redirects to `/api/admin/athletes/hydrate`

**Architecture Rule**: Use universal hydration (`?entity=athletes,runcrews`) for dashboard. Individual routes only for specific use cases.

---

## Hydration & Display Calls

### List View Display (Summary)

**Route**: `GET /api/admin/athletes/hydrate`  
**Handler**: `hydrateAthletes()` - Lines 67-100

**What Frontend Should Display**:
- List of all athletes with summary information
- Garmin connection status (connected, userId, scope, hasTokens, tokenStatus)
- Profile completeness indicators
- NO sensitive data (tokens) displayed in list

**Response Structure**:
```javascript
{
  success: true,
  count: 10,
  athletes: [
    {
      athleteId: "xxx",
      email: "user@example.com",
      firstName: "John",
      lastName: "Doe",
      // ... profile fields
      
      // Garmin Integration Status (safe data only - no tokens)
      garmin: {
        connected: true,
        userId: "94d7c995-d7d1-4c2c-856f-5ef41913a6bb",
        connectedAt: "2025-11-05T...",
        lastSyncAt: "2025-11-05T...",
        scope: "PARTNER_WRITE...",
        hasTokens: true,
        tokenStatus: "active"
        // ❌ NO TOKENS (security - don't expose in list view)
      },
      
      // Computed fields
      fullName: "John Doe",
      profileComplete: true,
      daysSinceCreation: 5
    }
  ],
  timestamp: "2025-01-15T..."
}
```

**Garmin Fields** (List View Display):
- ✅ `connected` - Boolean connection status
- ✅ `userId` - Garmin user ID (UUID)
- ✅ `connectedAt` - Connection timestamp
- ✅ `lastSyncAt` - Last sync timestamp
- ✅ `scope` - OAuth scope permissions
- ✅ `hasTokens` - Boolean (computed from token presence)
- ✅ `tokenStatus` - "active" or "none"
- ❌ **NO** `accessToken`, `refreshToken`, `expiresIn` (security)

### Detail View Display (Full Data)

**Route**: `GET /api/admin/athletes/:id/hydrate`  
**Handler**: `GET /api/admin/athletes/:id/hydrate` - Lines 312-402

**What Frontend Should Display**:
- Complete athlete profile with all fields
- Full Garmin integration data including tokens (admin only)
- All computed fields (age, location, etc.)
- Related entities if needed

**Response Structure**:
```javascript
{
  success: true,
  athlete: {
    athleteId: "xxx",
    email: "user@example.com",
    // ... all profile fields
    
    // Garmin Integration Status (FULL DATA - includes tokens)
    garmin: {
      connected: true,
      userId: "94d7c995-d7d1-4c2c-856f-5ef41913a6bb",
      connectedAt: "2025-11-05T...",
      lastSyncAt: "2025-11-05T...",
      scope: "PARTNER_WRITE...",
      hasTokens: true,
      tokenStatus: "active",
      // ✅ TOKENS INCLUDED (admin detail view only)
      accessToken: "eyJhbGciOiJSUzI1NiIsI...",
      refreshToken: "eyJyZWZyZXNoVG9rZW5WYW...",
      expiresIn: 86399
    },
    
    // Computed fields
    fullName: "John Doe",
    profileComplete: true,
    daysSinceCreation: 5,
    age: 30,
    location: "San Francisco, CA"
  },
  timestamp: "2025-01-15T..."
}
```

**Garmin Fields** (Detail View Display):
- ✅ All list view fields
- ✅ `accessToken` - OAuth access token (admin only)
- ✅ `refreshToken` - OAuth refresh token (admin only)
- ✅ `expiresIn` - Token expiration in seconds

---

## Architecture Principles

### 1. Consistent Field Structure

**Rule**: All hydration routes should return the same field structure for the same entity type.

**Exception**: Security-sensitive fields (tokens) only in detail views, not list views.

### 2. Display Call Levels

**List View Display** (Summary)
- Core fields
- Status indicators
- Computed fields
- **NO sensitive data** (tokens, passwords)

**Detail View Display** (Full)
- All list view fields
- Sensitive data (tokens for admin)
- Related entities (activities, memberships)
- Full metadata

### 3. Field Naming Convention

**Database Fields** (snake_case):
- `garmin_user_id`
- `garmin_access_token`
- `garmin_is_connected`
- `garmin_scope`

**Hydrated Fields** (camelCase):
- `garmin.userId`
- `garmin.accessToken` (detail only)
- `garmin.connected`
- `garmin.scope`

**Mapping**: Always convert snake_case → camelCase in hydration layer

### 4. Security Rules

**List View**:
- ❌ Never expose tokens
- ❌ Never expose passwords
- ✅ Status indicators only
- ✅ Computed boolean flags

**Detail View**:
- ✅ Tokens allowed (admin only)
- ✅ Full metadata
- ✅ Related entities

---

## Frontend Architecture

### ⚠️ CRITICAL: Local-First Pattern

**Core Principle**: **Hydrate ONCE, save to localStorage, use EVERYWHERE. NO API calls for display.**

**Rule**: If data exists in localStorage, use it. **NO API calls needed for display.**

**When API Calls Are Required**:
1. **Initial Hydration** - Only if localStorage is empty (first load)
2. **Mutations** - CREATE, UPDATE, DELETE operations (these change data)
3. **Explicit Refresh** - User clicks "Refresh" button

**When API Calls Are NOT Needed**:
- ❌ Displaying athlete list (read from localStorage)
- ❌ Displaying athlete details (read from localStorage)
- ❌ Displaying RunCrew list (read from localStorage)
- ❌ Displaying RunCrew details (read from localStorage)
- ❌ Filtering/searching (filter localStorage data)
- ❌ Navigation between pages (all data already in localStorage)

### Home Screen Hydration

**Location**: `/` (AdminHome.jsx)

**Flow**:
1. **Check localStorage first** → If `athletesData` and `runCrewsData` exist, use them (NO API CALL)
2. **Only if missing** → Hit universal hydration route ONCE
3. **Save response to localStorage** → Store both athletes and runCrews
4. **All downstream components** → Read from localStorage (ZERO API CALLS for display)

**Hydration Route**: 
- `GET /api/admin/athletes/hydrate` (or legacy `/api/athlete/admin/hydrate`)

**localStorage Keys**:
- `athletesData` - Full athlete objects array (all athletes, all objects)
- `athletesCount` - Total count
- `runCrewsData` - Full RunCrew objects array (all runcrews, all objects)
- `runCrewsCount` - Total RunCrew count
- `athletesLastUpdated` - Timestamp
- `runCrewsLastUpdated` - Timestamp
- `dashboardHydrated` - Status flag

**Universal Hydration Response Structure**:
```javascript
{
  success: true,
  athletes: [
    {
      athleteId: "xxx",
      email: "user@example.com",
      // ... all athlete fields
      garmin: { ... }, // Full Garmin data
      // ... all relations
    }
    // ... all athletes
  ],
  runCrews: [
    {
      id: "runcrew123",
      name: "Morning Warriors",
      // ... all RunCrew fields
      admin: { ... }, // Admin athlete
      memberships: [ ... ], // All members
      messages: [ ... ], // All messages
      leaderboardEntries: [ ... ], // All leaderboards
      runs: [ ... ], // All runs
      events: [ ... ] // All events
    }
    // ... all RunCrews
  ],
  count: {
    athletes: 10,
    runCrews: 5
  },
  timestamp: "2025-11-15T..."
}
```

**Benefits**:
- Fast navigation (no loading delays)
- Single source of truth
- **ZERO redundant API calls**
- Works offline (using cached data)

**Incorrect Display Calls** (DON'T DO THIS):
```javascript
// ❌ DON'T: Make API call on every component mount
useEffect(() => {
  fetch('/api/admin/athletes/hydrate').then(...) // WRONG - data already in localStorage
}, []);

// ❌ DON'T: Call API when displaying list
const athletes = await fetch('/api/admin/athletes/hydrate'); // WRONG - read from localStorage

// ❌ DON'T: Make API call for detail view
const athlete = await fetch(`/api/admin/athletes/${id}/hydrate`); // WRONG - read from localStorage

// ❌ DON'T: Call API for filtering
const filtered = await fetch('/api/admin/athletes/hydrate?filter=...'); // WRONG - filter localStorage
```

**Correct Display Calls** (DO THIS):
```javascript
// ✅ DO: Read from localStorage (NO API CALL)
const getAthletes = () => {
  const stored = localStorage.getItem('athletesData');
  return stored ? JSON.parse(stored) : []; // NO API CALL - just read
};

// ✅ DO: Read athlete details from localStorage (NO API CALL)
const getAthleteDetails = (athleteId) => {
  const athletes = JSON.parse(localStorage.getItem('athletesData') || '[]');
  return athletes.find(a => a.athleteId === athleteId); // NO API CALL
};

// ✅ DO: Read RunCrew from localStorage (NO API CALL)
const getRunCrewDetails = (runCrewId) => {
  const runCrews = JSON.parse(localStorage.getItem('runCrewsData') || '[]');
  return runCrews.find(rc => rc.id === runCrewId); // NO API CALL
};

// ✅ DO: Filter localStorage data (NO API CALL)
const filterAthletes = (searchTerm) => {
  const athletes = JSON.parse(localStorage.getItem('athletesData') || '[]');
  return athletes.filter(a => 
    a.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  ); // NO API CALL - filter in memory
};

// ✅ DO: Initial hydration (ONLY if localStorage is empty)
const hydrateDashboard = async () => {
  // Check if already hydrated
  if (localStorage.getItem('dashboardHydrated') === 'true') {
    return; // Already hydrated - NO API CALL
  }
  
  // Only call API if localStorage is empty
  const response = await fetch('/api/admin/hydrate?entity=athletes,runcrews');
  const data = await response.json();
  
  // Store all entities in localStorage
  localStorage.setItem('athletesData', JSON.stringify(data.athletes));
  localStorage.setItem('athletesCount', data.count.athletes);
  localStorage.setItem('runCrewsData', JSON.stringify(data.runCrews));
  localStorage.setItem('runCrewsCount', data.count.runCrews);
  localStorage.setItem('dashboardHydrated', 'true');
  
  return data;
};
```

### Dashboard Hub

**URL**: `https://dashboard.gofastcrushgoals.com/admin`  
**Component**: `DashboardNavOptions.jsx`

**Purpose**: God-view hub with options to navigate to different management areas.

**Current Options**:
- ✅ **Athletes** - Links to `/athlete-admin`
- ✅ **Activities** - Links to `/all-activities`
- ❌ **RunCrew** - TODO: Add RunCrew management option

**Architecture**:
```
/admin
  ├── Hydrate all entities (athletes, activities, runcrews)
  ├── Show hydration status
  ├── Navigation cards to:
  │   ├── /athlete-admin
  │   ├── /all-activities
  │   └── /runcrew-admin (TODO)
  └── Quick stats (total users, etc.)
```

### Athlete Management

**URL**: `https://dashboard.gofastcrushgoals.com/athlete-admin`  
**Component**: `AdminAthletes.jsx`

**Purpose**: Primary athlete management interface.

**Features**:
- ✅ List all athletes - **Read from localStorage, ZERO API CALLS**
- ✅ View athlete details (`/athlete/:athleteId`) - **Read from localStorage, ZERO API CALLS**
- ✅ Filter/search athletes - **Filter localStorage data, ZERO API CALLS**
- ✅ View activities (`/athlete/:athleteId/activities`) - **Read from localStorage if available, otherwise API call**
- ✅ Delete athlete - **API call required (mutation)**
- ✅ Modify athlete (PUT to `/api/athlete/:id`) - **API call required (mutation)**

**Routes Used for Display**:
- ~~`GET /api/admin/hydrate?entity=athletes,runcrews`~~ - **ONLY on initial load if localStorage empty**
- ~~`GET /api/admin/athletes/hydrate`~~ - **NOT NEEDED - read from localStorage**
- ~~`GET /api/admin/athletes/:id/hydrate`~~ - **NOT NEEDED - read from localStorage**
- ~~`GET /api/admin/runcrews/hydrate`~~ - **NOT NEEDED - read from localStorage**

**Routes Used for Mutations** (API calls required):
- `PUT /api/athlete/:id` - Update athlete (mutation)
- `DELETE /api/athlete/:id` - Delete athlete (mutation)
- `POST /api/athlete/:id/activities` - Create activity (mutation)

**Athlete Detail Page** (`/athlete/:athleteId`):
- **Read athlete from localStorage** → `athletesData.find(a => a.athleteId === athleteId)` - **ZERO API CALLS**
- View full athlete profile (from localStorage)
- Edit athlete fields (from localStorage, save via PUT mutation)
- View Garmin integration status (from localStorage - `garmin.userId`, `garmin.scope`, `garmin.hasTokens`, `garmin.tokenStatus`)
- View activities count (from localStorage if available)
- **All display data from localStorage** - NO API calls needed
- **TODO**: "Upsert New Model" button (mutation - API call required)

### Activities Management

**Individual Athlete Activities**: `/athlete/:athleteId/activities`  
**Component**: `AthleteActivities.jsx`

**Status**: ✅ Working - shows activities for specific athlete

**All Activities (Debug/God View)**: `/all-activities`  
**Component**: `AllActivities.jsx`

**Route**: `GET /api/admin/activities/hydrate`  
**Features**:
- ✅ List all activities (all athletes)
- ✅ Filter by athlete
- ✅ Filter by date range
- ✅ Filter by activity type
- ✅ See which athlete owns each activity

---

## Database-First Architecture

**Philosophy**: Athlete-first database management

**Core Entity**: `Athlete` (central user identity)

**Linked Models**:
- `Founder` → linked via `athleteId`
- `Investor` → linked via `athleteId` (future)
- `Coach` → linked via `athleteId` (future)
- `AthleteActivity` → linked via `athleteId`
- `RunCrewMembership` → linked via `athleteId`

**Upsert Flow**:
1. All models link back to Athlete
2. Upsert ensures one record per athlete per model type
3. Unique constraints prevent duplicates
4. Cascade deletes maintain data integrity

---

## Route Organization

### Current Structure

```
/api/admin/
  ├── /athletes/hydrate          → List all athletes
  ├── /athletes/:id/hydrate       → Single athlete details
  ├── /athletes/hydrate/summary   → Summary statistics
  ├── /activities/hydrate         → All activities
  ├── /runcrews/hydrate           → All RunCrews
  └── /founders/hydrate           → All Founders

/api/athlete/
  ├── /admin/hydrate              → Legacy (redirects to /api/admin/athletes/hydrate)
  ├── /:id                        → Get/Update/Delete athlete
  ├── /:athleteId/activities      → Get athlete activities
  └── /create                     → Create athlete (not used by admin)

/api/garmin/                      → Garmin integration
/api/runcrew/                     → RunCrew operations
```

### Proposed Admin Routes

```
/api/admin/
  ├── /upsert-model               → Universal model upsert
  ├── /athletes/hydrate           → List all athletes
  ├── /athletes/:id/hydrate       → Single athlete details
  ├── /activities/hydrate         → All activities
  └── /activities/:id/delete      → Delete activity
```

---

## Model Upsert Architecture

**Location**: Activities page (`/athlete/:athleteId/activities`) or Athlete Details page

**Button**: "Upsert New Model"

**Flow**:
1. Admin clicks "Upsert New Model" button
2. Modal opens: "Select model to upsert"
   - Dropdown: Founder | Investor | Coach | (future models)
3. Admin selects model
4. Frontend calls: `POST /api/admin/upsert/founder` (or other model)
   ```json
   {
     "athleteId": "cmh9pl5in0000rj1wkijpxl2t"
   }
   ```
5. Backend:
   - Validates athleteId exists
   - Uses universal upsert service
   - Creates/updates model record with unique ID
   - Returns created/updated model

**Route Structure**:
```
routes/Admin/
  ├── adminUpsertRoute.js
  │   └── POST /api/admin/upsert/founder
  ├── adminHydrateRoute.js
  │   └── GET /api/admin/athletes/hydrate
  └── adminActivityRoute.js
      └── GET /api/admin/activities/hydrate
```

---

## Field Mapping Reference

### Garmin Integration Fields

| Database Field | Hydrated Field | List View | Detail View |
|---------------|----------------|-----------|-------------|
| `garmin_user_id` | `garmin.userId` | ✅ | ✅ |
| `garmin_is_connected` | `garmin.connected` | ✅ | ✅ |
| `garmin_connected_at` | `garmin.connectedAt` | ✅ | ✅ |
| `garmin_last_sync_at` | `garmin.lastSyncAt` | ✅ | ✅ |
| `garmin_scope` | `garmin.scope` | ✅ | ✅ |
| `garmin_access_token` | `garmin.accessToken` | ❌ | ✅ |
| `garmin_refresh_token` | `garmin.refreshToken` | ❌ | ✅ |
| `garmin_expires_in` | `garmin.expiresIn` | ❌ | ✅ |
| (computed) | `garmin.hasTokens` | ✅ | ✅ |
| (computed) | `garmin.tokenStatus` | ✅ | ✅ |

---

## Testing Checklist

### Backend
- [x] List hydration returns all Garmin fields (except tokens)
- [x] Single athlete hydration includes tokens
- [x] Field naming consistent (snake_case → camelCase)
- [x] No tokens exposed in list view (security check)

### Frontend - Local-First Pattern
- [ ] **CRITICAL**: Components read from localStorage ONLY (ZERO API calls for display)
- [ ] **CRITICAL**: Only ONE hydration API call on initial load (if localStorage empty)
- [ ] **CRITICAL**: Athlete detail page reads from localStorage (ZERO API calls)
- [ ] **CRITICAL**: List view reads from localStorage (ZERO API calls)
- [ ] **CRITICAL**: Filter/search uses localStorage (ZERO API calls)
- [ ] Frontend displays Garmin status correctly in list view (from localStorage)
- [ ] Frontend displays Garmin status correctly in detail view (from localStorage)
- [ ] Database has data → Frontend shows data (end-to-end test)
- [ ] localStorage hydration works correctly
- [ ] Refresh functionality clears and re-hydrates
- [ ] **ZERO API calls for display** - Check Network tab, should see:
  - ONE hydration call on initial load (if localStorage empty)
  - Only mutation calls (PUT, DELETE, POST) when user makes changes
  - NO GET calls for displaying data

### Integration
- [ ] List route → Frontend list view (from localStorage)
- [ ] Detail view → Frontend detail view (from localStorage, NO API call)
- [ ] Garmin fields display correctly (from localStorage)
- [ ] Activities link works
- [ ] Update athlete works (mutation - API call required)
- [ ] Delete athlete works (mutation - API call required)

---

## Related Documentation

- **Main Architecture**: `GOFAST_ARCHITECTURE.md`
- **Route Patterns**: `BACKEND_SCAFFOLDING_PATTERN.md`
- **RunCrew Architecture**: `docs/RunCrewArchitecture.md`

---

## Next Steps

### Immediate (Architecture Fixes):
1. ✅ Fix list hydration to include all Garmin fields
2. ✅ Document architecture and display calls
3. ⏳ **CRITICAL**: Fix frontend to use localStorage (NO redundant API calls)
4. ⏳ **CRITICAL**: Remove `/api/admin/athletes/:id/hydrate` calls from detail page
5. ⏳ **CRITICAL**: Ensure all components read from localStorage first

### Short Term:
6. ⏳ Add "Refresh Users" button to navbar (clears localStorage, re-hydrates)
7. ⏳ Add filter/search to AdminAthletes (filter localStorage data, NO API call)
8. ⏳ Add delete function to Activities page
9. ⏳ Add "Upsert New Model" button to Athlete Details

### Medium Term:
10. ⏳ Add RunCrew option to DashboardNavOptions
11. ⏳ Create RunCrew admin page
12. ⏳ Model upsert modal component

## ⚠️ CRITICAL FIXES NEEDED

**Problem**: Frontend is making too many API calls instead of using localStorage.

**Required Changes**:
1. **AdminAthletes.jsx**: Read from `localStorage.getItem('athletesData')` on mount (ZERO API calls)
2. **AthleteDetails.jsx**: Read athlete from `athletesData` array (ZERO API calls)
3. **All display components**: Read from localStorage ONLY - NO API calls for display
4. **Network tab**: Should show:
   - ONE hydration call on initial load (if localStorage empty)
   - ZERO GET calls for displaying data
   - Only mutation calls (PUT, DELETE, POST) when user makes changes

---

**Last Updated**: November 2025  
**Status**: ✅ Architecture documented and routes fixed
