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
  ├── Activities (Garmin/Strava sync)
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

**Route Registration** (in `index.js`):
```javascript
// RunCrew routes
import runCrewCreateRouter from './routes/RunCrew/runCrewCreateRoute.js';
import runCrewJoinRouter from './routes/RunCrew/runCrewJoinRoute.js';
import runCrewHydrateRouter from './routes/RunCrew/runCrewHydrateRoute.js';

app.use('/api/runcrew', runCrewCreateRouter); // /create
app.use('/api/runcrew', runCrewJoinRouter); // /join
app.use('/api/runcrew', runCrewHydrateRouter); // /mine, /:id
```

**Order Matters**: More specific routes must be registered before catch-all routes (`/mine` before `/:id`)

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
- ✅ **Schema**: Complete (RunCrew, RunCrewMembership, RunCrewPost, RunCrewLeaderboard)
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
- Activity tracking (Garmin integration)

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
- **Routes Available**: Backend has `/api/runcrew/mine` and `/api/runcrew/:id`
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

### Hydration Pattern

**Purpose**: Fetch complete data with all relations

**Example**: `GET /api/runcrew/:id`
```javascript
const runCrew = await prisma.runCrew.findUnique({
  where: { id },
  include: {
    admin: { select: { id: true, firstName: true, ... } },
    memberships: {
      include: { athlete: { select: {...} } }
    },
    posts: { include: { athlete: {...}, comments: {...} } },
    leaderboardEntries: { include: { athlete: {...} } }
  }
});
```

### Upsert Pattern

**Purpose**: Create or update based on unique constraint

**Example**: RunCrew membership
```javascript
const membership = await prisma.runCrewMembership.upsert({
  where: {
    runCrewId_athleteId: { runCrewId, athleteId }
  },
  update: { joinedAt: new Date() },
  create: { runCrewId, athleteId }
});
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

---

## Environment Configuration

### Required Environment Variables

**Backend**:
- `DATABASE_URL` - PostgreSQL connection string
- `FIREBASE_SERVICE_ACCOUNT` - Firebase admin SDK JSON
- `PORT` - Server port (default: 3001)

**Deployment** (Render.com):
- Build command: `npm run build`
- Start command: `npm start`
- Auto-deploy: On git push

---

## File Structure

```
gofastbackendv2-fall2025/
├── index.js                    # Main entry - route registration
├── package.json                # Dependencies & scripts
├── prisma/
│   └── schema.prisma          # Database schema (source of truth)
├── config/
│   ├── database.js            # Prisma client management
│   ├── modelConfig.js         # Universal upsert config
│   └── apiConfig.js           # API route constants
├── middleware/
│   └── firebaseMiddleware.js  # Firebase auth verification
├── services/
│   ├── AthleteUpsertService.js
│   ├── GarminIntegrationService.js
│   └── ...
├── routes/
│   ├── Athlete/              # Athlete CRUD
│   ├── RunCrew/              # RunCrew management
│   ├── Garmin/               # Garmin integration
│   ├── Founder/              # Founder stack
│   ├── Admin/                # Admin operations
│   └── Training/             # Training plans
└── docs/
    ├── RunCrewArchitecture.md
    ├── TrainingArchitecture.md
    └── ...
```

---

## Key Design Principles

1. **Athlete-First**: All models link back to Athlete as central identity
2. **Modular Extensions**: Additional roles (Founder, Coach) are optional one-to-one relations
3. **Junction Tables**: Many-to-many relationships use junction tables
4. **Cloud-First**: Schema sync via `db push`, no local migrations
5. **Centralized Services**: Business logic in services, routes are thin
6. **Universal Upsert**: Consistent pattern for modular model creation
7. **Database Connection**: Single Prisma client instance, shared across routes

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
- 🚧 Profile setup API endpoints (draft saving, completion tracking, picture upload)

### Frontend (MVP1)
- 🚧 Connect RunCrew pages to backend APIs
- 🚧 Implement Garmin activity sync
- 🚧 Add real leaderboard data
- 🚧 Crew feed with posts and comments
- 🚧 Profile setup flow (see `gofastfrontend-mvp1/profile_ux_architecture.md`)
- 🚧 Profile picture upload (camera/gallery support)
- 🚧 Profile completion reminder system

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

## Related Documentation

- **`docs/GoFastDevOverview.md`** - Complete development guide and stack overview
- **`docs/RunCrewArchitecture.md`** - Complete RunCrew implementation details
- **`docs/TrainingArchitecture.md`** - Training plans architecture
- **`gofastfrontend-mvp1/profile_ux_architecture.md`** - Profile setup UX architecture, completion flow, reminder system, and profile picture upload strategy

---

**Last Updated**: January 2025  
**Maintained By**: GoFast Development Team

