# GoFast Architecture

**Last Updated**: January 2025  
**Purpose**: Comprehensive architecture documentation for GoFast platform - athlete-first schema and modular backend patterns

---

## Platform Vision

**GoFast is "Facebook for Runners"** - A comprehensive accountability platform where runners can:
- **Connect** with other runners
- **Share** running goals and achievements
- **Train** together with structured plans and coaching
- **Shop** for running gear
- **Manage** their entire running life in one platform

**Core Value**: **Accountability through community** - Runners stay motivated by connecting with others, sharing goals, and competing in friendly leaderboards.

---

## Phase 1: RunCrew (MVP1)

**Current Focus**: RunCrew functionality - small running groups for accountability and coordination.

**Key Features**:
- Create and join RunCrews via invite codes
- Crew feed for banter and motivation
- Leaderboards (weekly/monthly/all-time)
- Member management and coordination
- Group events and scheduling

**Documentation**: See `docs/RunCrewArchitecture.md` for complete RunCrew implementation details.

**Status**: ✅ Core routes implemented (create, join, hydrate), 🚧 Member management in progress

---

## Core Philosophy: Athlete-First Architecture

GoFast is built on an **athlete-first schema** where the `Athlete` model is the central identity entity. All other models and features link back to `Athlete` as the source of truth.

**Key Principle**: Every user in GoFast is an `Athlete` first. The `Founder` model is **NOT** an athlete extension - it's for GoFast Company employees/founders, which is a separate concern.

### Athlete as Central Entity

```
Athlete (Central Identity)
  ├── Activities (Garmin/Strava sync) → AthleteActivity[]
  ├── RunCrew Memberships (via junction table)
  ├── Training Plans & Races
  └── [Future models: Coach, Investor, etc. - as modular extensions]
```

**Note**: `Founder` is for GoFast Company employees/founders - separate from Athlete identity. See Identity Architecture section below.

---

## Database Schema Architecture

### Athlete Model (Central Identity)

**Location**: `prisma/schema.prisma`

**Core Fields**:
- `id`: Unique identifier (cuid)
- `firebaseId`: Firebase authentication ID (unique)
- `email`: Unique email identifier
- Universal profile fields (firstName, lastName, photoURL, etc.)

**Integration Fields**:
- Garmin OAuth fields (`garmin_user_id`, `garmin_access_token`, etc.)
- Strava OAuth fields (`strava_id`, `strava_access_token`, etc.)
- Training profile fields (currentPace, weeklyMileage, trainingGoal, etc.)

**Relations**:
- `activities`: One-to-many → `AthleteActivity[]`
- `runCrewMemberships`: Many-to-many → `RunCrewMembership[]` (junction table)
- `adminRunCrews`: One-to-many → `RunCrew[]` (crews this athlete created)
- `trainingPlans`: One-to-many → `TrainingPlan[]`
- `founder`: One-to-one → `Founder?` (optional - **only if athlete is also a GoFast Company employee/founder**)

**Design Decisions**:
- ✅ **Athlete is source of truth** - All identity flows through Athlete
- ✅ **Modular extensions** - Additional roles (Coach, Investor) are optional one-to-one relations (future)
- ✅ **Founder is separate** - Founder model is for GoFast Company employees/founders, not an athlete extension
- ✅ **Junction tables** - Many-to-many relationships use junction tables (RunCrewMembership)
- ✅ **Cascade deletes** - Related models cascade delete when athlete is deleted

---

## Modular Architecture Patterns

### 1. Modular Route Organization

**Pattern**: Features organized by domain, not by HTTP method

**Key Concept**: Routes are organized by **feature domain**, not by HTTP method. Each feature domain gets a folder with one or more route files.

**Structure**:
```
routes/
├── Athlete/           # Athlete CRUD & hydration
│   ├── athleteCreateRoute.js
│   ├── athleteUpdateRoute.js
│   ├── athleteHydrateRoute.js
│   └── athleteActivitiesRoute.js
├── RunCrew/           # RunCrew management
│   ├── runCrewCreateRoute.js
│   ├── runCrewJoinRoute.js
│   └── runCrewHydrateRoute.js
├── Garmin/            # Garmin OAuth & webhooks
│   ├── garminUrlGenRoute.js
│   ├── garminCodeCatchRoute.js
│   └── garminActivityRoute.js
├── Founder/           # Founder stack (modular extension)
│   ├── founderUpsertRoute.js
│   ├── founderHydrateRoute.js
│   └── founderTaskRoute.js
├── Admin/             # Admin operations
│   ├── adminHydrateRoute.js
│   └── adminUpsertRoute.js
└── Training/          # Training plans
    ├── trainingRaceRoute.js
    └── trainingPlanRoute.js
```

**Naming Convention**:
- **Folder**: PascalCase (`RunCrew/`, `Athlete/`)
- **File**: camelCase + "Route.js" (`runCrewCreateRoute.js`, `athleteHydrateRoute.js`)

**Why This Pattern**:
- ✅ **Grouped by feature** - All related endpoints in one place
- ✅ **Clear naming** - File name describes functionality
- ✅ **Scalable** - Easy to add new route files per feature
- ✅ **No filename conflicts** - PascalCase folder + camelCase file

**Route Registration** (in `index.js`):
```javascript
// index.js

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database.js';

// Import route files
import runCrewCreateRouter from './routes/RunCrew/runCrewCreateRoute.js';
import runCrewJoinRouter from './routes/RunCrew/runCrewJoinRoute.js';
import runCrewHydrateRouter from './routes/RunCrew/runCrewHydrateRoute.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '10mb' }));

// Feature routes - ORDER MATTERS!
// RunCrew routes
app.use('/api/runcrew', runCrewCreateRouter); // /create
app.use('/api/runcrew', runCrewJoinRouter); // /join
app.use('/api/runcrew', runCrewHydrateRouter); // /:id (single crew hydration)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', version: '2.0.2' });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 GoFast Backend V2 running on port ${PORT}`);
  await connectDatabase();
});

export default app;
```

**Key Points for Registration**:
- Import each router at the top
- Register routes with `app.use('/api/[prefix]', router)`
- **ORDER MATTERS** - More specific routes must come before catch-all routes
- Add comments explaining each route block
- **Note**: No `/mine` endpoint - use universal `/api/athlete/hydrate` instead

**Route Organization Principles**:

**Standard Pattern**: One file per feature (start here)
- **Structure**: All CRUD operations for a feature in a single file
- **Example**: `Founder/founderTaskRoute.js` contains:
  - `GET /tasks` - List all tasks
  - `GET /tasks/:id` - Get single task
  - `POST /tasks` - Create task
  - `PUT /tasks/:id` - Update task
  - `DELETE /tasks/:id` - Delete task
- **When to use**: Default for all new features
- **Benefits**: Easy to find all endpoints for a feature, less file navigation

**Extended Pattern**: Split by action (develop as needed)
- **Structure**: Separate files for different action types
- **Example**: Split `founderTaskRoute.js` into:
  - `Founder/founderTaskCreateRoute.js` - Create tasks (POST)
  - `Founder/founderTaskUpdateRoute.js` - Update/delete tasks (PUT, DELETE)
  - `Founder/founderTaskReadRoute.js` - Read tasks (GET)
- **When to evolve**: If file grows > 500 lines, becomes hard to navigate, or has complex logic that benefits from separation
- **Benefits**: Better organization for large features, easier to maintain complex logic

**Guideline**: Always start with Standard Pattern. Evolve to Extended Pattern only when the file becomes unwieldy or complex.

---

### 2. Modular Service Layer

**Location**: `services/`

**Purpose**: Business logic separated from route handlers

**Services**:
- `AthleteUpsertService.js` - Universal athlete upsert logic
- `AthleteUpdateService.js` - Athlete update operations
- `GarminIntegrationService.js` - Garmin OAuth & webhook handling
- `garminFindAthleteService.js` - Find athlete by Garmin user ID

**Pattern**:
```javascript
// Route handler (thin)
router.post('/create', verifyFirebaseToken, async (req, res) => {
  const result = await AthleteUpsertService.upsert(req.body);
  res.json(result);
});

// Service (business logic)
export class AthleteUpsertService {
  static async upsert(data) {
    // Business logic here
    return await prisma.athlete.upsert(...);
  }
}
```

---

### 3. Universal Upsert Pattern

**Location**: `config/modelConfig.js` + `routes/Admin/adminUpsertRoute.js`

**Purpose**: Dynamically upsert modular models linked to `athleteId`

**Supported Models**:
- `Founder` - One-to-one with Athlete
- Future: `Coach`, `Investor`, etc.

**Configuration** (`config/modelConfig.js`):
```javascript
export const MODEL_CONFIG = {
  models: {
    founder: {
      name: 'Founder',
      endpoint: '/api/admin/upsert/founder',
      linkField: 'athleteId',
      relationship: 'one-to-one',
      prismaModel: 'founder',
      uniqueField: 'athleteId'
    }
  }
};
```

**Upsert Flow**:
1. Admin selects model type (e.g., "Founder")
2. Frontend calls `POST /api/admin/upsert/founder` with `athleteId`
3. Backend checks if Founder exists for athleteId
4. Creates or updates Founder record
5. Returns hydrated Founder with Athlete relation

**Benefits**:
- ✅ Modular extensions can be added without route changes
- ✅ Consistent upsert pattern across all models
- ✅ Admin dashboard can dynamically list available models

---

### 4. Database Connection Pattern

**Location**: `config/database.js`

**Pattern**: Centralized Prisma client management

```javascript
// config/database.js
let prismaClient = null;

export async function connectDatabase() {
  if (!prismaClient) {
    prismaClient = new PrismaClient();
    await prismaClient.$connect();
  }
  return prismaClient;
}

export function getPrismaClient() {
  if (!prismaClient) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return prismaClient;
}
```

**Usage in Routes**:
```javascript
import { getPrismaClient } from '../../config/database.js';

const prisma = getPrismaClient();
const athletes = await prisma.athlete.findMany();
```

**Never Do This**:
```javascript
// ❌ DON'T create new PrismaClient instances
const prisma = new PrismaClient(); // Wrong!
```

**Why This Pattern**:
- ✅ Single connection pool
- ✅ Prevents connection exhaustion
- ✅ Centralized error handling
- ✅ Graceful shutdown support

---

## RunCrew Architecture (Modular Feature)

**Documentation**: See `docs/RunCrewArchitecture.md` for complete details

**Quick Status**:
- ✅ **Schema**: Complete (RunCrew, RunCrewMembership, RunCrewChatter, RunCrewLeaderboard)
- ✅ **Routes**: Create, Join, Hydrate implemented
- ✅ **Upsert Pattern**: Uses Prisma `upsert` for membership management

**Key Implementation**:
```javascript
// runCrewCreateRoute.js - Upsert membership on create
const membership = await tx.runCrewMembership.upsert({
  where: {
    runCrewId_athleteId: {
      runCrewId: runCrew.id,
      athleteId: athleteId
    }
  },
  update: {
    joinedAt: new Date() // Reset if rejoining
  },
  create: {
    runCrewId: runCrew.id,
    athleteId: athleteId
  }
});
```

**Athlete-First Design**:
- Athlete is source of truth for memberships
- Query `athlete.runCrewMemberships` to get all crews
- Junction table enables many-to-many (athlete can be in multiple crews)

---

## Activity Tracking Architecture (Athlete-First)

**Documentation**: See `gofastfrontend-demo/docs/GoFast AthleteActivity-Architecture.md` for complete activity tracking architecture.

**Core Principle**: **Athlete-First** - All activities link to `Athlete` via `athleteId`. Activities are stored in `AthleteActivity` model.

**Quick Summary**:
- **Two-Phase Webhook System**: 
  - `/api/garmin/activity` → Creates activity record with summary data (distance, pace, HR, calories)
  - `/api/garmin/activity-details` → Enriches existing activity with detail data (laps, splits, HR zones)
- **Three Use Cases**: General feed, Training integration, Miles aggregator
- **Data Flow**: Garmin webhook → `athlete_activities` table → Frontend display
- **API Routes**: `GET /api/athlete/:athleteId/activities` - Fetch activities for display
- **Database Table**: `athlete_activities` (Prisma model: `AthleteActivity`)

**Key Difference - Activity vs Activity-Details**:
- **`/activity`** = Creates the activity record in `athlete_activities` table (summary data) - sent immediately after activity
- **`/activity-details`** = Enriches the activity (updates `detailData` JSON field) - sent later with deep metrics

**For complete details**: See `gofastfrontend-demo/docs/GoFast AthleteActivity-Architecture.md`

---

## Identity Architecture

**Location**: `gofast-user-dashboard/IDENTITY_ARCHITECTURE.md`

### Core Principle
**You're either an Athlete OR a Company person - these are separate concerns.**

### Identity Types

#### 1. Athlete (Primary Identity)
- Real users using the app for fitness/training
- Primary identity: `Athlete` model
- Has activities, Garmin integration, RunCrew membership
- Core user type for the fitness platform
- **Athlete-first**: All features link back to Athlete

#### 2. Company Person (Separate Concern)
- **GoFast Company employees, founders, team members**
- NOT athletes (separate identity)
- Has access to company tools (CRM, roadmaps, tasks)
- Identity types: `Founder` (for GoFast Company), `Company` (for GoFast Company)
- **May optionally** have athlete profile (if founder/employee is also a runner)
- **Note**: Founder model is for the literal GoFast Company, not athlete extensions

### Model Relationships

**Athlete (Pure Athlete Identity)**:
```
Athlete
  ├── AthleteActivity (linked via athleteId)
  ├── RunCrewMembership (linked via athleteId)
  ├── GarminIntegration (linked via athleteId)
  ├── TrainingPlans (linked via athleteId)
  └── Founder? (optional one-to-one - if athlete is also a founder)
```

**Company Person (Company Identity)**:
```
Founder/Company
  ├── Company (if company employee)
  ├── Founder (if founder)
  └── (No athlete activities - separate concern)
  └── May have optional athleteId link (for founders who also run)
```

### Upsert Strategy

**For Athletes**:
- Athletes stay as athletes
- Optional: Can upsert Founder if athlete is also a GoFast Company employee/founder
- Athlete is the source of truth

**For Company People (GoFast Company)**:
- Create Founder or Company records
- These are separate from athlete identity
- **Founder model is for GoFast Company employees/founders** - literal company employees
- May or may not have athlete profile (if founder/employee is also a runner)

**Admin Dashboard**:
- Allows upserting Founder/Company to athletes
- Use case: When an athlete user is also a GoFast Company employee/founder
- Or: Creating company-only users (GoFast Company employees who don't use the app as runners)

---

## Frontend Applications

### 1. MVP1 Frontend (Athlete App)
**Repository**: `gofastfrontend-mvp1`  
**URL**: `https://gofastfrontend-mvp1.vercel.app`  
**Purpose**: Main athlete-facing application - **Phase 1: RunCrew**

**Architecture** (See `gofastfrontend-mvp1/docs/FRONTEND_ARCHITECTURE.md`):
- **Core Philosophy**: Wire first, build second - No overbuilding until features are connected
- Firebase Authentication (Google OAuth)
- Calls `/api/athlete/create` (find-or-create pattern)
- Stores athlete data in localStorage
- Redirects based on profile completeness

**Phase 1 Focus (RunCrew)**:
- Crew creation and joining
- Crew dashboard with member management
- Leaderboards (miles, pace, calories)
- Crew sharing and invites
- Activity tracking (Garmin integration) - See Activity Tracking Architecture below

**Implementation Strategy**:
1. Copy proven demo structure
2. Set up routing and basic components
3. Connect to backend APIs
4. Add authentication flow
5. Integrate Garmin for real data

**Key Features**:
- RunCrew management (create, join, dashboard)
- Activity tracking (Garmin sync)
- Personal stats and records
- Dashboard hub for all features

### 2. User Dashboard (Admin App)
**Repository**: `gofast-user-dashboard`  
**URL**: `https://dashboard.gofastcrushgoals.com`  
**Purpose**: Admin dashboard for managing athletes and platform

**Architecture**:
- Hardcoded admin login (no Firebase)
- Hydrates athletes via `/api/admin/athletes/hydrate`
- Stores in localStorage for fast navigation
- God-view across GoFast platform

**Current Features**:
- ✅ Athlete management (view, edit, delete)
- ✅ Activity management (view all activities)
- ✅ Admin upsert wizard (add Founder/Company to athletes)
- ❌ **RunCrew management** - TODO: Add RunCrew management card

**RunCrew Integration Status**:
- **Documented**: `dashboardmanagement.md` mentions RunCrew as TODO
- **Routes Available**: Backend has `/api/runcrew/:id` (single crew hydration)
- **Universal Hydrate**: `/api/athlete/hydrate` returns RunCrew object in response
- **Frontend**: No RunCrew card in `DashboardNavOptions.jsx`
- **Next Step**: Add RunCrew management option to dashboard navigation

### 3. Frontend Demo (UX Source of Truth)
**Repository**: `gofastfrontend-demo`  
**Purpose**: Demo/prototype - source of truth for UX patterns

**Workflow**: Build in demo → Test UX → Port to MVP1 → Connect to backend

**Key Role**: 
- Provides proven UX patterns
- MVP1 references demo when building new features
- If demo breaks: Fix demo first (restore source of truth), then port fixes to MVP1

---

## Database Workflow: Cloud-First Schema Sync

**Philosophy**: No local migrations, no version files - cloud-first deployment

**Build Command**:
```json
"build": "npm install && npx prisma generate && npx prisma db push --accept-data-loss"
```

**Deployment Flow**:
1. Code Push → Git push to repository
2. Render Build → Runs `npm run build`
3. Prisma Generate → Creates Prisma Client from schema
4. Database Push → Syncs schema to PostgreSQL
5. Server Start → Backend starts with updated database

**Why `db push --accept-data-loss`?**:
- Auto-sync without prompts
- Cloud-first approach
- No migration versioning conflicts
- Safe for additive changes (new fields/tables)

**⚠️ PRODUCTION DATA PROTECTION**:
- ✅ **SAFE**: Adding new tables, fields (nullable), indexes
- ❌ **DANGEROUS**: Renaming columns, deleting columns, changing types

---

## Route Implementation Patterns

### Standard Route File Template

**Template for new route files**:
```javascript
// [Feature] [Action] Route
// Description of what this route file does

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js'; // If auth needed

const router = express.Router();

/**
 * GET /api/[feature]/[endpoint]
 * Description of endpoint
 * Query params: ?param1=value1&param2=value2
 */
router.get('/[endpoint]', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const firebaseId = req.user?.uid; // If using Firebase auth
    
    // Your business logic here
    
    res.json({
      success: true,
      message: 'Success message',
      data: result
    });
  } catch (error) {
    console.error('❌ ERROR PREFIX:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/[feature]/[endpoint]
 * Create new record
 * Body: { field1: value1, field2: value2 }
 */
router.post('/[endpoint]', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { field1, field2 } = req.body;
    
    // Validation
    if (!field1) {
      return res.status(400).json({
        success: false,
        error: 'Field1 is required'
      });
    }
    
    // Create record
    const result = await prisma.modelName.create({
      data: { field1, field2 }
    });
    
    res.status(201).json({
      success: true,
      message: 'Created successfully',
      data: result
    });
  } catch (error) {
    console.error('❌ ERROR PREFIX:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
```

### Common Route Patterns

#### 1. CRUD Routes

**Standard CRUD Pattern**:
```javascript
GET    /api/feature          → List all
GET    /api/feature/:id      → Get one
POST   /api/feature          → Create
PUT    /api/feature/:id      → Update full
PATCH  /api/feature/:id      → Update partial
DELETE /api/feature/:id      → Delete
```

#### 2. Universal Hydration Pattern (Local-First Architecture)

**Core Principle**: **Hydrate once, save to localStorage, use everywhere**

**Universal Hydration Route**:
```javascript
GET /api/athlete/hydrate
→ Returns complete athlete profile with all relations
→ Frontend saves to localStorage
→ Downstream components read from localStorage (no API calls)
```

**What Gets Stored in localStorage**:
```javascript
{
  athlete: {
    id: "athlete123",
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    photoURL: "...",
    // ... all athlete fields
  },
  runCrew: {  // MVP1: Single RunCrew (limit to 1)
    id: "runcrew456",
    name: "Morning Warriors",
    runCrewId: "runcrew456",  // ← Use this directly, no API calls!
    isAdmin: true,
    memberships: [...],
    chatter: [...],
    runs: [...],
    leaderboardEntries: [...]
  },
  // Future: runCrews: [...] (array for multiple crews)
}
```

**Local-First Flow**:
1. **App Load** → `GET /api/athlete/hydrate` (with Firebase token)
2. **Save to localStorage** → `localStorage.setItem('athleteData', JSON.stringify(data))`
3. **Downstream Components** → Read from `localStorage.getItem('athleteData')`
4. **No API Calls Needed** → `runCrewId` is already in localStorage, use it directly!

**Example Usage**:
```javascript
// ❌ DON'T DO THIS (unnecessary API call)
const response = await fetch('/api/runcrew/mine');
const crews = await response.json();

// ✅ DO THIS (read from localStorage)
const athleteData = JSON.parse(localStorage.getItem('athleteData'));
const runCrewId = athleteData.runCrew.id;  // Already there!
const runCrew = athleteData.runCrew;  // Full object already hydrated!
```

**MVP1 RunCrew Limit**:
- **Single RunCrew**: MVP1 limits to 1 RunCrew per athlete
- **Future**: `RunCrewSelection.jsx` component for multiple crews
- **Hydration**: Universal hydrate returns `runCrew` object (not array for MVP1)

**Hydration Pattern Example**: `GET /api/athlete/hydrate`
```javascript
const athlete = await prisma.athlete.findUnique({
  where: { firebaseId },
  include: {
    runCrewMemberships: {
      include: {
        runCrew: {
          include: {
            admin: { select: { id: true, firstName: true, ... } },
            memberships: {
              include: { athlete: { select: {...} } }
            },
            chatter: { include: { athlete: {...}, comments: {...} } },
            runs: { include: { organizer: {...}, rsvps: {...} } },
            leaderboardEntries: { include: { athlete: {...} } }
          }
        }
      },
      take: 1  // MVP1: Limit to 1 crew
    }
  }
});

// Transform to single runCrew object (MVP1)
const runCrew = athlete.runCrewMemberships[0]?.runCrew || null;

return {
  athlete: { ...athlete, runCrewMemberships: undefined },
  runCrew  // Single object, not array
};
```

**Admin Hydration** (Separate Pattern):
```javascript
GET /api/admin/hydrate?entity=athletes|founders|activities
→ Dispatches to entity-specific handler
```

**Direct Admin Hydration**:
```javascript
GET /api/admin/athletes/hydrate        → All athletes
GET /api/admin/founders/hydrate        → All founders
GET /api/admin/athletes/:id/hydrate    → Single athlete
```

#### 3. Upsert Routes (Admin)

**Universal Upsert**:
```javascript
POST /api/admin/upsert?model=founder
Body: { athleteId: 'xxx' }
→ Dispatches to model-specific handler
```

**Direct Upsert**:
```javascript
POST /api/admin/upsert/founder
Body: { athleteId: 'xxx' }
```

**Upsert Pattern Example**: RunCrew membership
```javascript
const membership = await prisma.runCrewMembership.upsert({
  where: {
    runCrewId_athleteId: { runCrewId, athleteId }
  },
  update: { joinedAt: new Date() },
  create: { runCrewId, athleteId }
});
```

#### 4. OAuth Routes

**Garmin OAuth Flow**:
```javascript
GET  /api/garmin/auth-url        → Generate OAuth URL
GET  /api/garmin/callback        → OAuth callback
GET  /api/garmin/user            → Get user profile
GET  /api/garmin/activities      → Sync activities
POST /api/garmin/webhook         → Webhook handler
```

### Transaction Pattern

**Purpose**: Ensure atomic operations across multiple models

**Example**: Create RunCrew + Membership
```javascript
const result = await prisma.$transaction(async (tx) => {
  const runCrew = await tx.runCrew.create({...});
  const membership = await tx.runCrewMembership.upsert({...});
  return { runCrew, membership };
});
```

### Prisma Query Patterns

**Standard Prisma Queries**:
```javascript
const prisma = getPrismaClient();

// Find many
const records = await prisma.modelName.findMany({
  where: { field: value },
  orderBy: { createdAt: 'desc' }
});

// Find one
const record = await prisma.modelName.findUnique({
  where: { id }
});

// Create
const record = await prisma.modelName.create({
  data: { field1: value1, field2: value2 }
});

// Update
const record = await prisma.modelName.update({
  where: { id },
  data: { field1: newValue }
});

// Delete
await prisma.modelName.delete({
  where: { id }
});
```

### Error Handling Pattern

**Standard Error Response**:
```javascript
try {
  // Business logic
  res.json({ success: true, data: result });
} catch (error) {
  console.error('❌ ERROR PREFIX:', error);
  res.status(500).json({
    success: false,
    error: error.message
  });
}
```

**Validation Errors** (400 Bad Request):
```javascript
if (!requiredField) {
  return res.status(400).json({
    success: false,
    error: 'Required field is missing'
  });
}
```

**Not Found Errors** (404):
```javascript
if (!record) {
  return res.status(404).json({
    success: false,
    error: 'Record not found'
  });
}
```

---

## Authentication & Authorization

### Firebase Token Verification

**Middleware**: `middleware/firebaseMiddleware.js`

**Pattern**:
```javascript
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

router.post('/create', verifyFirebaseToken, async (req, res) => {
  const firebaseId = req.user?.uid; // From verified token
  // Verify athlete matches Firebase user
});
```

**Flow**:
1. Frontend sends Firebase token in `Authorization` header
2. Middleware verifies token with Firebase Admin SDK
3. Extracts `firebaseId` and attaches to `req.user`
4. Route handler verifies `athleteId` matches `firebaseId`

**For User-Facing Routes**:
```javascript
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

router.get('/protected-route', verifyFirebaseToken, async (req, res) => {
  const firebaseId = req.user?.uid; // Extracted by middleware
  // Use firebaseId to find user
});
```

**For Admin Routes**:
- Admin routes typically **don't use Firebase** - they're internal/dashboard only
- Use CORS to restrict access
- Add admin verification if needed (future enhancement)

---

## Environment Configuration

### Required Environment Variables

**Backend**:
- `DATABASE_URL` - PostgreSQL connection string
- `FIREBASE_SERVICE_ACCOUNT` - Firebase admin SDK JSON (set in Render environment variables)
- `PORT` - Server port (default: 3001)

**Deployment** (Render.com):
- Build command: `npm run build`
- Start command: `npm start`
- Auto-deploy: On git push

---

## File Structure

**Core Backend Structure**:
```
gofastbackendv2-fall2025/
├── index.js                       # Main entry point - imports and registers all routes
├── package.json                   # Dependencies & scripts
├── .env                           # Environment variables
├── render.yaml                    # Render.com deployment config
├── prisma/
│   └── schema.prisma              # Database schema (source of truth for models)
├── config/
│   ├── database.js                # Prisma client initialization
│   ├── athleteColumnConfig.js     # Athlete field metadata
│   ├── modelConfig.js             # Universal upsert config
│   └── apiConfig.js               # API route constants
├── middleware/
│   └── firebaseMiddleware.js      # Firebase auth verification
├── services/                      # Business logic
│   ├── AthleteUpsertService.js
│   ├── GarminIntegrationService.js
│   └── ...
├── routes/                        # All API routes organized by feature
│   ├── Admin/                     # Admin-only routes
│   ├── Athlete/                   # Athlete CRUD
│   ├── Founder/                   # Founder stack routes
│   ├── Garmin/                    # Garmin OAuth & webhooks
│   ├── Strava/                    # Strava OAuth
│   ├── RunCrew/                   # RunCrew management
│   └── Training/                  # Training plans
├── utils/                         # Helper functions
└── docs/
    ├── RunCrewArchitecture.md
    ├── TrainingArchitecture.md
    └── ...
```

**Note**: This is a **single backend** serving all frontend applications. Architecture docs are **source of truth**, not proposals. See `architecturebuildprocess.md` for how architecture docs guide the build process.

---

## Schema-First Development

**CRITICAL**: Always define schema FIRST, then routes follow

**Process**:
1. Define Prisma models in `schema.prisma`
2. Run `npx prisma generate` to create Prisma Client
3. Create route files using Prisma models
4. Test routes

**See**: `architecturebuildprocess.md` for full schema-first process

---

## Adding a New Feature

### Step 1: Define Schema
```prisma
// prisma/schema.prisma
model NewFeature {
  id        String @id @default(cuid())
  name      String
  // ... fields
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Step 2: Generate Prisma Client
```bash
npx prisma generate
```

### Step 3: Create Route File
```bash
# Create folder (if new feature domain)
mkdir routes/NewFeature

# Create route file
touch routes/NewFeature/newFeatureRoute.js
```

### Step 4: Implement Routes
- Copy template from "Route Implementation Patterns" section
- Implement CRUD endpoints
- Add authentication if needed

### Step 5: Register in index.js
```javascript
// Import
import newFeatureRouter from './routes/NewFeature/newFeatureRoute.js';

// Register
app.use('/api/newfeature', newFeatureRouter);
```

**Key Points for Registration**:
- Import each router at the top
- Register routes with `app.use('/api/[prefix]', router)`
- **ORDER MATTERS** - More specific routes must come before catch-all routes (e.g., `/:id`)
- Add comments explaining each route block

### Step 6: Test
```bash
npm run dev
# Test endpoints
```

### Checklist for New Routes
- [ ] Created Prisma model in `schema.prisma`
- [ ] Ran `npx prisma generate`
- [ ] Created route file following naming convention
- [ ] Implemented CRUD endpoints
- [ ] Added authentication (Firebase) if needed
- [ ] Added error handling
- [ ] Added validation
- [ ] Registered route in `index.js`
- [ ] Tested endpoints

---

## File Naming Quick Reference

| What | Pattern | Example |
|------|---------|---------|
| Route folder | PascalCase | `Admin/`, `Founder/` |
| Route file | camelCase + "Route.js" | `adminHydrateRoute.js` |
| Service file | camelCase + "Service.js" | `garminSyncService.js` |
| Config file | camelCase + "Config.js" | `athleteColumnConfig.js` |
| Middleware | camelCase + "Middleware.js" | `firebaseMiddleware.js` |
| Utils | camelCase + ".js" | `redis.js`, `helpers.js` |

### Working Examples

**Simple Feature** (Founder tasks):
- Folder: `routes/Founder/`
- File: `founderTaskRoute.js`
- Routes: GET /tasks, POST /tasks, PUT /tasks/:id, DELETE /tasks/:id

**Complex Feature** (Admin hydration):
- Folder: `routes/Admin/`
- File: `adminHydrateRoute.js`
- Routes: Universal `/hydrate?entity=X` + direct routes per entity

**OAuth Feature** (Garmin):
- Folder: `routes/Garmin/`
- Files: Multiple route files (one per OAuth step)
- Routes: /auth-url, /callback, /user, /activities, /webhook

---

## Key Design Principles

1. **Athlete-First**: All models link back to Athlete as central identity
2. **Local-First Architecture**: Hydrate once via `/api/athlete/hydrate` (or `/api/admin/athletes/hydrate` for admin), save to localStorage, use everywhere
3. **NO UNNECESSARY API CALLS**: ⚠️ **CRITICAL** - If data is in localStorage, use it directly. NO `/mine` endpoints, NO per-component API calls, NO redundant fetches. Read from localStorage first, only call API if data missing.
4. **Modular Extensions**: Additional roles (Founder, Coach) are optional one-to-one relations
5. **Junction Tables**: Many-to-many relationships use junction tables
6. **Cloud-First**: Schema sync via `db push`, no local migrations
7. **Centralized Services**: Business logic in services, routes are thin
8. **Universal Upsert**: Consistent pattern for modular model creation
9. **Database Connection**: Single Prisma client instance, shared across routes
10. **MVP1 RunCrew Limit**: Single RunCrew per athlete (future: `RunCrewSelection.jsx` for multiple)

---

## Platform Roadmap

### Phase 1: RunCrew (MVP1) - Current Focus ✅
**Status**: Core routes implemented, member management in progress

**Features**:
- ✅ Create and join RunCrews
- ✅ Hydrate crews with members, posts, leaderboards
- 🚧 Member management (leave, remove)
- 🚧 Admin operations (update, delegate, broadcast)
- 🚧 Leaderboard calculation service
- 🚧 Events & RSVP (schema addition needed)

### Phase 2: Training Plans (Future)
**Features**:
- Structured training plans
- Race goals and targets
- Daily workout tracking
- Performance analysis

### Phase 3: Matching (Future)
**Features**:
- Find running partners
- Pace and location matching
- Group runs coordination

### Phase 4: Shopping (Future)
**Features**:
- Running gear marketplace
- Product recommendations
- Gear reviews and ratings

---

## Next Steps & Immediate Priorities

### Backend
- ✅ RunCrew hydration routes implemented
- 🚧 RunCrew member management (leave, remove)
- 🚧 RunCrew admin operations (update, delegate, broadcast)
- 🚧 RunCrew leaderboard calculation service
- 🚧 RunCrew events & RSVP (schema addition needed)
- ✅ Profile update route (`PUT /api/athlete/:id/profile`)
- ✅ Profile hydration route (`GET /api/athlete/hydrate`)
- ✅ Profile picture upload endpoint (`POST /api/upload`)
- 🚧 Profile completion calculation and tracking
- 🚧 Draft saving mechanism
- 🚧 Image processing (resize, compress)
- 🚧 Cloudinary/S3 integration for image storage

### Frontend (MVP1)
- 🚧 Connect RunCrew pages to backend APIs
- 🚧 Implement Garmin activity sync
- 🚧 Add real leaderboard data
- 🚧 Crew feed with posts and comments
- ✅ Profile setup component (`AthleteCreateProfile.jsx`)
- ✅ Profile display component (`AthleteProfile.jsx`)
- ✅ Settings component (`Settings.jsx`)
- ✅ Profile hydration on app load
- 🚧 Profile picture upload integration (basic upload exists, needs camera/gallery)
- 🚧 Draft saving (auto-save on blur)
- 🚧 Profile completion indicator
- 🚧 Reminder banner on home page
- 🚧 Profile picture click recovery
- 🚧 Hub icons component (navigation icons)

### Admin Dashboard
- 🚧 Add RunCrew management card to `DashboardNavOptions.jsx`
- 🚧 Create RunCrew admin page (view all crews, manage members)
- 🚧 Add RunCrew to hydration endpoint

### Long Term
- 🚧 Coach model (modular extension for athletes)
- 🚧 Investor model (modular extension for athletes)
- 🚧 Multi-admin RunCrew support (RunCrewAdmin junction table)

**Note**: Founder model is for GoFast Company employees/founders (separate concern), not an athlete extension.

---

## Profile Architecture

**Documentation**: See `gofastfrontend-mvp1/docs/GoFastProfile_architecture.md` for complete profile architecture details.

**Quick Summary**:
- **Schema**: All profile fields stored in `Athlete` model (no separate Profile model)
- **Universal Profile**: Core identity fields (firstName, lastName, email, gofastHandle, etc.)
- **Feature-Specific Fields**: Training and Match profile fields stored in `Athlete` model
- **Routes**: 
  - `PUT /api/athlete/:id/profile` - Update profile
  - `GET /api/athlete/hydrate` - Universal hydration (includes profile)
  - `POST /api/upload` - Profile picture upload
- **Frontend**: `AthleteCreateProfile.jsx` (setup), `AthleteProfile.jsx` (display hub), `Settings.jsx` (device connections)
- **Status**: ✅ Core profile system implemented, 🚧 Profile completion tracking and reminders pending

**Key Implementation**:
- Profile data flows through `Athlete` model (athlete-first architecture)
- Universal hydration pattern: Frontend calls `/api/athlete/hydrate`, saves to localStorage, uses everywhere
- Profile setup is progressive: Users fill out what they need for features they use
- Settings page exists for device connections (Garmin, Strava)
- Hub icons for future preferences (not yet implemented)

**For complete details**: See `gofastfrontend-mvp1/docs/GoFastProfile_architecture.md`

---

## Related Documentation

- **`docs/GoFastDevOverview.md`** - Complete development guide and stack overview
- **`docs/RunCrewArchitecture.md`** - Complete RunCrew implementation details
- **`docs/TrainingArchitecture.md`** - Training plans architecture
- **`gofastfrontend-demo/docs/GoFast AthleteActivity-Architecture.md`** - Complete activity tracking architecture (Garmin/Strava integration, use cases, data flow, API routes)
- **`gofastfrontend-mvp1/docs/GoFastProfile_architecture.md`** - Complete profile architecture (schema, routes, frontend, completion tracking, downstream features)

---

**Last Updated**: January 2025  
**Maintained By**: GoFast Development Team

