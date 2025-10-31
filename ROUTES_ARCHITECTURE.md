# Routes Architecture

## Overview
Clean, organized route structure following feature-based folder organization.

## Route Structure

```
routes/
├── Admin/                    # Admin-only routes
│   └── adminHydrateRoute.js  # Admin hydration endpoints
├── Athlete/                  # Athlete CRUD operations
│   ├── athleteCreateRoute.js       # Create/find athlete
│   ├── athleteUpdateRoute.js       # Update athlete (moved from root)
│   ├── athleteProfileRoute.js      # Profile endpoints
│   ├── athleteActivitiesRoute.js   # Activity endpoints
│   ├── athletepersonhydrateRoute.js # User-facing hydrate (Firebase)
│   └── athletesallhydrateRoute.js  # Legacy hydrate (redirects)
├── Founder/                  # Founder stack routes
│   ├── founderTaskRoute.js         # Tasks CRUD
│   ├── founderCrmRoute.js          # CRM CRUD
│   ├── founderProductRoute.js      # Roadmaps CRUD
│   └── founderUpsertRoute.js       # Founder upsert
├── Garmin/                   # Garmin OAuth & webhooks
│   ├── garminUrlGenRoute.js
│   ├── garminCodeCatchRoute.js
│   ├── garminUserProfileRoute.js
│   ├── garminActivityRoute.js
│   ├── garminActivityDetailsRoute.js
│   ├── garminPermissionsRoute.js
│   └── garminDeregistrationRoute.js
├── Strava/                   # Strava OAuth (moved from root)
│   ├── stravaUrlRoute.js
│   ├── stravaCallbackRoute.js
│   ├── stravaTokenRoute.js
│   └── stravaAthleteRoute.js
├── RunCrew/                  # RunCrew management
│   ├── runCrewCreateRoute.js
│   └── runCrewJoinRoute.js
└── Training/                 # Training plans
    ├── trainingRaceRoute.js
    ├── trainingPlanRoute.js
    └── trainingDayRoute.js
```

## Route Registration (index.js)

### Athlete Routes
```javascript
/api/athlete
  ├── /athletepersonhydrate     → User hydrate (Firebase token)
  ├── /activities               → All activities
  ├── /:athleteId/activities    → Athlete's activities
  ├── /athletesallhydrate       → Legacy (redirects)
  ├── /:id/profile              → Profile endpoints
  ├── /config                   → Update config
  ├── /status/:athleteId        → Update status
  ├── /update/:athleteId        → PATCH update
  ├── /bulk-update/:athleteId   → POST bulk update
  ├── /create                   → Create/find athlete
  ├── /tokenretrieve            → Get tokens
  ├── /:id                      → Get/Update/Delete athlete
  └── /find                     → Find athlete only
```

### Admin Routes (Universal Hydration System)
```javascript
/api/admin
  ├── /hydrate?entity=athletes        → Universal hydrate entry point
  ├── /hydrate?entity=activities     → Hydrate activities
  ├── /hydrate?entity=runcrews       → Hydrate RunCrews
  ├── /hydrate?entity=founders       → Hydrate Founders
  ├── /athletes/hydrate              → Direct athletes hydration
  ├── /activities/hydrate            → Direct activities hydration
  ├── /runcrews/hydrate              → Direct RunCrews hydration
  ├── /founders/hydrate              → Direct Founders hydration
  ├── /athletes/:id/hydrate         → Hydrate single athlete
  └── /athletes/hydrate/summary      → Summary stats

/api/athlete/admin (legacy)
  └── /hydrate                       → Auto-defaults to athletes hydration
```

**Universal Hydration Pattern:**
- **Entry Point**: `/api/admin/hydrate?entity=<type>` - One route to hydrate any entity
- **Dispatches to**: Entity-specific handlers (`hydrateAthletes`, `hydrateActivities`, etc.)
- **Direct Access**: Each entity also has its own route (`/api/admin/athletes/hydrate`) for direct calls
- **Legacy Support**: `/api/athlete/admin/hydrate` automatically defaults to `entity=athletes`

**How It Works:**
1. Universal route (`/hydrate`) receives `entity` query param
2. Dispatcher checks entity type and calls appropriate handler function
3. Each handler function can also be called directly via entity-specific route
4. Easy to extend: Add new entity handler + update switch statement

### Garmin Routes
```javascript
/api/garmin
  ├── /auth-url              → Generate OAuth URL
  ├── /callback              → OAuth callback
  ├── /user                  → User profile
  ├── /activity               → Activity webhook
  ├── /activities             → List activities
  ├── /activity/sync          → Sync activities
  ├── /activity-details      → Get activity details
  ├── /permissions           → Get permissions
  ├── /webhook               → Webhook handler
  └── /deregistration        → Deregister user
```

### Strava Routes
```javascript
/api/strava
  ├── /auth          → Generate OAuth URL
  ├── /callback       → OAuth callback
  ├── /token          → Refresh/get token
  └── /activities     → Fetch activities
```

### RunCrew Routes
```javascript
/api/runcrew
  ├── /create         → Create RunCrew
  └── /join           → Join RunCrew
```

### Training Routes
```javascript
/api/training/race
  ├── /create         → Create race
  ├── /all            → List races
  └── /:raceId        → Get/Update race

/api/training/plan
  ├── /race/:raceId   → Get plan for race
  ├── /active         → Get active plan
  ├── /:planId        → Get/Update plan
  └── /:planId/status → Update plan status

/api/training/day
  ├── /today          → Today's workout
  ├── /date/:date     → Get day by date
  ├── /week/:weekIndex → Get week
  └── /:trainingDayId/feedback → Submit feedback
```

### Founder Routes
```javascript
/api/founder
  ├── /tasks                   → Tasks CRUD
  ├── /tasks/:taskId           → Update/Delete task
  ├── /crm                     → CRM contacts
  ├── /crm/pipelines           → Grouped by pipeline
  ├── /crm/:contactId          → Update/Delete contact
  ├── /product                 → Product roadmap
  ├── /gtm                     → GTM roadmap
  ├── /personal                → Personal roadmap
  ├── /roadmap                 → Create roadmap item
  └── /roadmap/:itemId         → Update/Delete item
```

## Key Changes

### ✅ Completed Refactoring

1. **Created Admin folder**
   - Moved admin hydrate routes from `Athlete/athletesallhydrateRoute.js`
   - New: `routes/Admin/adminHydrateRoute.js`
   - Endpoints: `/api/admin/athletes/hydrate`, `/api/admin/athletes/:id/hydrate`, `/api/admin/athletes/hydrate/summary`

2. **Moved athleteUpdateRoute.js**
   - From: `routes/athleteUpdateRoute.js` (root)
   - To: `routes/Athlete/athleteUpdateRoute.js`
   - Fixed imports: `../services` → `../../services`

3. **Created Strava folder**
   - Moved all Strava routes from root to `routes/Strava/`
   - Fixed imports: `../services` → `../../services`
   - Files: `stravaUrlRoute.js`, `stravaCallbackRoute.js`, `stravaTokenRoute.js`, `stravaAthleteRoute.js`

4. **Updated index.js**
   - Added `athleteUpdateRouter` import from Athlete folder
   - Updated Strava imports to use Strava folder
   - Added `adminHydrateRouter` import
   - Registered routes in correct order

## Route Separation

### User-Facing Routes (Athlete folder)
- `/api/athlete/athletepersonhydrate` - User hydrates their own data (Firebase token)
- Used by: MVP1 frontend (AthleteHome)

### Admin Routes (Admin folder)
- **Universal Route**: `/api/admin/hydrate?entity=<type>` - Hydrates any entity type
- **Direct Routes**: `/api/admin/athletes/hydrate`, `/api/admin/activities/hydrate`, etc.
- Used by: Admin dashboard (gofast-user-dashboard)
- Legacy compatibility: `/api/athlete/admin/hydrate` still works (defaults to athletes)

**Supported Entities:**
- `athletes` - All athletes for admin view
- `activities` - All activities across all users
- `runcrews` - All RunCrews with memberships
- `founders` - All Founders with task/CRM/roadmap counts

## Legacy Route Compatibility

- `/api/athlete/athletesallhydrate` → Redirects to `/api/admin/athletes/hydrate`
- `/api/athlete/admin/hydrate` → Same handler as `/api/admin/athletes/hydrate`

Both legacy routes still work but redirect/use new endpoints internally.

---

**Last Updated**: January 2025
**Status**: ✅ Architecture refactored and organized

