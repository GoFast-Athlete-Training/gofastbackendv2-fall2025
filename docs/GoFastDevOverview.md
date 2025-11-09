# GoFast Development Overview

**Last Updated**: January 2025  
**Purpose**: Complete development guide for GoFast platform - stack, architecture, and schema overview

---

## Premise

**GoFast is "Facebook for Runners"** - A comprehensive accountability platform where runners can connect, share running goals, help each other train, shop for gear, and manage their entire running life in one platform.

**Core Mission**: **Accountability through community** - Runners stay motivated by connecting with others, sharing goals, and competing in friendly leaderboards.

**Phase 1 Focus**: RunCrew functionality - small running groups for accountability and coordination.

---

## Stack Overview

### Frontend: `gofastfrontend-mvp1`
- **Framework**: React 18 with Vite
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **State Management**: React Context API + localStorage
- **HTTP Client**: Axios
- **Authentication**: Firebase Auth (client SDK)
- **Deployment**: Vercel
- **Production URL**: https://gofastfrontend-mvp1.vercel.app
- **Port**: 5173 (development)

### Backend: `gofastbackendv2-fall2025`
- **Runtime**: Node.js 20+ with Express
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Firebase Admin SDK (server-side)
- **File Upload**: Multer (local storage)
- **Deployment**: Render
- **Production URL**: https://gofastbackendv2-fall2025.onrender.com
- **Port**: 3001 (development)

### Database
- **Type**: PostgreSQL
- **ORM**: Prisma
- **Schema**: Athlete-first architecture (see `GOFAST_ARCHITECTURE.md`)
- **Workflow**: Cloud-first schema sync (`prisma db push --accept-data-loss`)

### User Dashboard (Admin): `gofast-user-dashboard`
- **Framework**: React 18 with Vite
- **Purpose**: Admin dashboard for managing athletes and platform
- **URL**: https://dashboard.gofastcrushgoals.com
- **Auth**: Hardcoded admin login (no Firebase)
- **Hydration**: Uses `/api/admin/athletes/hydrate`

### Frontend Demo (UX Source of Truth): `gofastfrontend-demo`
- **Purpose**: Demo/prototype - source of truth for UX patterns
- **Workflow**: Build in demo → Test UX → Port to MVP1 → Connect to backend

---

## Architecture Principles

### Core Architecture Pattern
**Athlete-First Architecture** - The `Athlete` model is the central identity entity. All other models and features link back to `Athlete` as the source of truth.

See `GOFAST_ARCHITECTURE.md` for complete architecture documentation including:
- Athlete-first schema design
- Modular extensions (Founder, Coach, etc.)
- Junction tables for many-to-many relationships
- Universal upsert patterns

### Key Concepts

1. **Athlete-First**: Every user is an `Athlete` first. Additional roles (Coach, Investor) are modular extensions linked via `athleteId`.
2. **Modular Extensions**: Optional one-to-one relations (Coach, Investor) extend athlete capabilities without changing core identity.
3. **Junction Tables**: Many-to-many relationships use junction tables (RunCrewMembership, TrainingPlanExecution).
4. **Identity Separation**: Athletes vs Company people are separate concerns (see `gofast-user-dashboard/IDENTITY_ARCHITECTURE.md`).
5. **Founder is Separate**: Founder model is for GoFast Company employees/founders - literal company people, not athlete extensions.

---

## Database Schema Architecture

### Athlete Model (Central Identity)

**Location**: `prisma/schema.prisma`

**Core Identity Fields**:
```prisma
model Athlete {
  id         String @id @default(cuid())
  firebaseId String @unique  // Firebase auth ID
  email      String @unique  // Unique email identifier
  
  // Universal Profile (MVP1 Required)
  firstName    String?
  lastName     String?
  gofastHandle String? @unique
  birthday     DateTime?
  gender       String?
  city         String?
  state        String?
  primarySport String?
  photoURL     String?
  bio          String?
  instagram    String?
  
  // Integration Fields
  // Garmin OAuth 2.0 PKCE
  garmin_user_id       String? @unique
  garmin_access_token  String?
  garmin_refresh_token String?
  garmin_is_connected  Boolean @default(false)
  
  // Strava OAuth
  strava_id            Int? @unique
  strava_access_token  String?
  strava_refresh_token String?
  strava_expires_at    Int?
  
  // Training Profile (Future)
  currentPace       String?
  weeklyMileage     Int?
  trainingGoal      String?
  targetRace        String?
  
  // Relations
  activities         AthleteActivity[]          // One-to-many
  runCrewMemberships   RunCrewMembership[]        // Many-to-many (junction table)
  adminRunCrews        RunCrew[]                  // One-to-many (crews created)
  trainingPlans        TrainingPlan[]             // One-to-many
  founder               Founder?                   // One-to-one (optional extension)
  
  @@map("athletes")
}
```

**Key Design Decisions**:
- ✅ **Athlete is source of truth** - All identity flows through Athlete
- ✅ **Modular extensions** - Additional roles (Coach, Investor) are optional one-to-one relations (future)
- ✅ **Founder is separate** - Founder model is for GoFast Company employees/founders, not an athlete extension
- ✅ **Junction tables** - Many-to-many relationships use junction tables
- ✅ **Cascade deletes** - Related models cascade delete when athlete is deleted

---

### RunCrew Models (Phase 1: MVP1)

**Location**: `prisma/schema.prisma`  
**Complete Documentation**: See `docs/RunCrewArchitecture.md`

#### RunCrew Model
```prisma
model RunCrew {
  id             String  @id @default(cuid())
  name           String
  description    String?
  joinCode       String  @unique  // Unique invite code
  logo           String?  // Optional logo/image URL
  icon           String?  // Optional emoji/icon
  runcrewAdminId String  // Athlete ID of creator/admin
  
  // Status & Archive
  isArchived Boolean   @default(false)
  archivedAt DateTime?
  
  // Relations
  admin              Athlete              @relation("RunCrewAdmin")
  memberships        RunCrewMembership[]  // Junction table
  posts              RunCrewPost[]
  leaderboardEntries RunCrewLeaderboard[]
  
  @@map("run_crews")
}
```

#### RunCrewMembership (Junction Table)
```prisma
model RunCrewMembership {
  id        String @id @default(cuid())
  runCrewId String
  athleteId String
  
  joinedAt  DateTime @default(now())
  
  runCrew RunCrew @relation(fields: [runCrewId], references: [id], onDelete: Cascade)
  athlete Athlete @relation(fields: [athleteId], references: [id], onDelete: Cascade)
  
  @@unique([runCrewId, athleteId])  // Prevent duplicate memberships
  @@map("run_crew_memberships")
}
```

**Key Design Decisions**:
- ✅ **Junction table** enables many-to-many (athletes can be in multiple crews)
- ✅ **Unique constraint** prevents duplicate memberships
- ✅ **Athlete is source of truth** - Query `athlete.runCrewMemberships` to get all crews
- ✅ **Cascade deletes** maintain data integrity

**Related Models**:
- `RunCrewPost` - Forum/banter posts
- `RunCrewPostComment` - Threaded comments
- `RunCrewLeaderboard` - Aggregated stats for competition

**Complete Documentation**: See `docs/RunCrewArchitecture.md` for full schema, routes, and implementation details.

---

### AthleteActivity Model (Garmin/Strava Integration)

```prisma
model AthleteActivity {
  id        String @id @default(cuid())
  athleteId String
  
  // Source Information
  sourceActivityId String @unique  // Garmin's unique activity ID
  source           String @default("garmin")
  
  // Core Activity Data
  activityType String?  // running, cycling, swimming
  activityName String?  // "Morning Run"
  startTime    DateTime?
  duration     Int?     // seconds
  distance     Float?   // meters
  averageSpeed Float?   // m/s
  calories     Int?
  
  // Performance Metrics
  averageHeartRate Int?
  maxHeartRate     Int?
  elevationGain    Float?  // meters
  steps            Int?
  
  // Location Data
  startLatitude   Float?
  startLongitude  Float?
  summaryPolyline String?  // Encoded route
  
  // Hybrid Data Storage
  summaryData Json?  // Summary fields from webhook
  detailData  Json?  // Details from /garmin/details
  hydratedAt  DateTime?
  
  // Relations
  athlete Athlete @relation(fields: [athleteId], references: [id], onDelete: Cascade)
  
  @@map("athlete_activities")
}
```

**Key Design Decisions**:
- ✅ **Source-agnostic** - Can store Garmin or Strava activities
- ✅ **Hybrid storage** - Summary fields + JSON for flexibility
- ✅ **Lazy hydration** - Details fetched on-demand
- ✅ **Cascade deletes** - Activities deleted when athlete deleted

---

### Training Models (Future Phases)

**Location**: `prisma/schema.prisma`  
**Complete Documentation**: See `docs/TrainingArchitecture.md`

**Models**:
- `Race` - Race event details (public, like a hotel in travel)
- `TrainingPlan` - Structured training plan for a race
- `TrainingDayPlanned` - Planned workouts (the blueprint)
- `TrainingPlanExecution` - Active execution of a plan
- `TrainingDayExecuted` - Completed workouts (links to AthleteActivity)

**Key Design**:
- Training plans link to `Race` and `Athlete`
- Execution tracks actual vs planned performance
- Links to `AthleteActivity` for real activity data

---

### Founder Model (GoFast Company - Separate Concern)

```prisma
model Founder {
  id        String @id @default(cuid())
  athleteId String @unique  // Links to Athlete - founder IS an athlete (if they also use the app)
  
  // Relations
  athlete         Athlete          @relation(fields: [athleteId], references: [id], onDelete: Cascade)
  tasks           FounderTask[]
  crmContacts     CrmContact[]
  roadmapItems    RoadmapItem[]
  
  @@map("founders")
}
```

**Key Design**:
- ✅ **For GoFast Company employees/founders** - Literal company employees, not athlete extensions
- ✅ **Separate concern** - Company people vs Athletes are separate identities
- ✅ **Optional athlete link** - If founder/employee is also a runner, they can have athlete profile
- ✅ **Universal upsert** - Can be added via admin dashboard
- ⚠️ **NOT a modular extension** - This is for GoFast Company people, separate from athlete identity

---

## Route Architecture

### Route Organization

**Pattern**: Features organized by domain, not by HTTP method

**Structure**:
```
routes/
├── Athlete/           # Athlete CRUD & hydration
│   ├── athleteCreateRoute.js
│   ├── athleteUpdateRoute.js
│   ├── athleteHydrateRoute.js
│   └── athleteActivitiesRoute.js
├── RunCrew/           # RunCrew management (Phase 1)
│   ├── runCrewCreateRoute.js      ✅
│   ├── runCrewJoinRoute.js        ✅
│   └── runCrewHydrateRoute.js     ✅
├── Garmin/            # Garmin OAuth & webhooks
│   ├── garminUrlGenRoute.js
│   ├── garminCodeCatchRoute.js
│   └── garminActivityRoute.js
├── Strava/            # Strava OAuth
├── Founder/           # Founder stack (modular extension)
├── Admin/             # Admin operations
│   ├── adminHydrateRoute.js
│   └── adminUpsertRoute.js
└── Training/          # Training plans (future)
```

**Naming Convention**:
- **Folder**: PascalCase (`RunCrew/`, `Athlete/`)
- **File**: camelCase + "Route.js" (`runCrewCreateRoute.js`)

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

## API Endpoints

### Athlete Routes
```
POST   /api/athlete/create              → Find or create athlete by Firebase ID
GET    /api/athlete/:id                 → Get athlete by ID
PUT    /api/athlete/:id                 → Update athlete
DELETE /api/athlete/:id                 → Delete athlete
GET    /api/athlete/:id/hydrate         → Hydrate athlete with all relations
GET    /api/athlete/admin/hydrate       → Admin: Hydrate all athletes
```

### RunCrew Routes (Phase 1)
```
POST   /api/runcrew/create              → Create RunCrew (creates membership for creator)
POST   /api/runcrew/join                → Join RunCrew via joinCode
POST   /api/runcrew/hydrate             → Hydrate single crew (local-first, no auth required)
GET    /api/runcrew/:id                 → Hydrate single crew (members, posts, leaderboard)
GET    /api/runcrew/mine                → Get all crews for authenticated athlete
DELETE /api/runcrew/:id/leave           → Leave a crew (TODO)
DELETE /api/runcrew/:id/members/:athleteId → Remove member (admin only, TODO)
```

**RunCrew Run Management**:
```
POST   /api/runcrew/:runCrewId/runs     → Create run (admin/manager/member)
GET    /api/runcrew/:runCrewId/runs     → Get all runs for crew
PATCH  /api/runcrew/runs/:runId         → Update run (admin/manager/creator)
DELETE /api/runcrew/runs/:runId         → Delete run (admin/manager/creator)
POST   /api/runcrew/runs/:runId/rsvp    → RSVP to run (going/maybe/not-going)
```

**Complete Documentation**: See `docs/RunCrewArchitecture.md` for full API documentation.

### RunCrew Admin Dashboard

**Location**: `gofastfrontend-mvp1/src/Pages/RunCrew/RunCrewCentralAdmin.jsx`

**Purpose**: Single-page admin dashboard for managing a RunCrew (announcements, runs, members, messages)

**Features**:
- ✅ **Local-First Rendering** - Loads from `LocalStorageAPI`, renders instantly
- ✅ **Announcement Creator** - Post announcements with author attribution
- ✅ **Run Creator** - Full form with all model fields:
  - Required: Title, Date, Start Time, Meet-Up Point
  - Optional: Address, Total Miles, Pace, Strava URL, Description
- ✅ **Run Management** - Edit/delete runs with inline expandable details
- ✅ **RSVP Display** - Shows accurate "X going" counts
- ✅ **Member Roster** - Grid view with admin badges
- ✅ **Message Feed** - Recent crew messages
- ✅ **Re-sync Button** - Explicit refresh from backend

**Run Details (Inline Expansion)**:
- Distance & Pace
- Full Address
- Strava Map Link
- Description
- Map Placeholder (if coordinates exist)
- RSVP List with avatars

**Form Alignment**:
The Create Run form is fully aligned with the `RunCrewRun` Prisma model and backend `POST /api/runcrew/:runCrewId/runs` route, supporting all fields including recurrence (future-ready).

### Garmin Routes
```
GET    /api/garmin/auth-url             → Generate OAuth URL
GET    /api/garmin/callback             → OAuth callback
POST   /api/garmin/webhook/activity     → Garmin webhook (activity sync)
GET    /api/garmin/activity/:activityId → Get activity details
```

### Admin Routes
```
GET    /api/admin/athletes/hydrate      → Admin: Hydrate all athletes
POST   /api/admin/upsert/founder        → Upsert Founder model (universal upsert)
```

---

## Authentication & User Management

### Firebase Authentication Standard

**Pattern A: Entity Creation** (`POST /api/athlete/create`)
- Find or create athlete by Firebase ID
- Called after Firebase sign-in
- No token required (public route, but validates Firebase ID)

**Pattern B: Entity Hydration** (`GET /api/athlete/:id/hydrate`)
- Load full athlete profile with all relations
- Requires Firebase token verification
- Used for dashboard/homepage hydration

**Middleware**: `verifyFirebaseToken` - Verifies Firebase ID token and attaches `req.user.uid`

**Frontend Flow**:
1. User signs in with Firebase (Google OAuth)
2. Frontend calls `POST /api/athlete/create` with Firebase ID
3. Backend finds/creates Athlete record
4. Frontend stores `athleteId` in localStorage
5. For hydration: `GET /api/athlete/:id/hydrate` with Bearer token

---

## Hydration Architecture (V2)

### Core Principle
**Athlete-First, Context-Based Hydration** - Welcome hydrates athlete only. Feature pages hydrate their specific context on-demand and cache locally.

### Hydration Strategy

#### 1. Athlete Hydration (Welcome Flow)
**Endpoint**: `POST /api/athlete/hydrate`

**Purpose**: Initial hydration at welcome/login - loads athlete profile and basic context

**Backend Response**:
```javascript
{
  success: true,
  athlete: {
    // Full Prisma athlete object
    id, firebaseId, email, firstName, lastName, ...
    
    // HYDRATION V2: Clean crew context
    crews: [
      {
        runCrewId: "crew-id",
        role: "admin" | "manager" | "member",
        managerId: "manager-record-id" | null,
        runCrew: { /* full crew object */ }
      }
    ],
    MyCrew: "primary-crew-id",  // MVP1: Single crew per athlete
    MyCrewManagerId: "manager-record-id"  // If admin/manager
  },
  weeklyActivities: [...],
  weeklyTotals: { totalMiles, totalRuns, ... }
}
```

**Key Changes (V2)**:
- ✅ Removed deprecated `runcrewAdminId` field
- ✅ Admin status determined via `RunCrewManager` junction table
- ✅ Flattened `crews` array with role/managerId for clean frontend context
- ✅ `MyCrew` and `MyCrewManagerId` for direct access (MVP1: one crew per athlete)

**Frontend Storage** (`LocalStorageAPI`):
```javascript
{
  athleteProfile: { /* full athlete object */ },
  athleteId: "athlete-id",
  MyCrew: "crew-id",
  MyCrewManagerId: "manager-id",
  weeklyActivities: [...],
  weeklyTotals: {...},
  hydrationVersion: "hydration-v2"
}
```

#### 2. RunCrew Hydration (Feature Context)
**Endpoint**: `POST /api/runcrew/hydrate`

**Purpose**: Hydrate full crew context when entering RunCrew features (admin dashboard, member view)

**Request**:
```javascript
{
  runCrewId: "crew-id",
  athleteId: "athlete-id"  // Optional, for isAdmin computation
}
```

**Backend Response**:
```javascript
{
  success: true,
  runCrew: {
    // Full crew with all relations
    id, name, description, joinCode, logo, icon,
    managers: [
      { id, athleteId, role, athlete: {...} }
    ],
    memberships: [
      { id, athleteId, joinedAt, athlete: {...} }
    ],
    runs: [
      {
        id, title, date, startTime, meetUpPoint, meetUpAddress,
        totalMiles, pace, stravaMapUrl, description,
        createdBy: {...},
        rsvps: [{ id, athleteId, status, athlete: {...} }]
      }
    ],
    announcements: [
      { id, content, createdAt, author: {...} }
    ],
    messages: [
      { id, content, createdAt, athlete: {...} }
    ],
    leaderboardEntries: [...],
    isAdmin: true,  // Computed from managers table
    currentManagerId: "manager-id"
  }
}
```

**Frontend Storage**:
```javascript
LocalStorageAPI.setRunCrewData(runCrew);  // Cache full crew object
```

### Local-First Pattern

**Principle**: Frontend renders immediately from `localStorage`, backend calls only on explicit user action.

**Flow**:
1. **Welcome** → Hydrate athlete → Store in `LocalStorageAPI`
2. **Athlete Home** → Read from `LocalStorageAPI` → Render immediately
3. **"Go to RunCrew" click** → Call `POST /runcrew/hydrate` → Cache crew → Navigate
4. **RunCrew Admin** → Read from `LocalStorageAPI` → Render immediately
5. **"Re-sync" button** → Call `POST /runcrew/hydrate` → Update cache

**Benefits**:
- ✅ Instant UI rendering (no loading spinners)
- ✅ Reduced backend calls
- ✅ Offline-capable (cached data)
- ✅ Explicit refresh (user-controlled)

### LocalStorageAPI

**Location**: `gofastfrontend-mvp1/src/config/LocalStorageConfig.js`

**Purpose**: Centralized localStorage management with consistent keys and helpers

**Key Methods**:
```javascript
// Athlete context
LocalStorageAPI.getAthleteProfile()
LocalStorageAPI.getAthleteId()
LocalStorageAPI.getMyCrew()
LocalStorageAPI.getMyCrewManagerId()

// Full model hydration
LocalStorageAPI.setFullHydrationModel({ athlete, weeklyActivities, weeklyTotals })
LocalStorageAPI.getFullHydrationModel()

// RunCrew context
LocalStorageAPI.setRunCrewData(runCrew)
LocalStorageAPI.getRunCrewData()
LocalStorageAPI.setRunCrewId(id)
LocalStorageAPI.getRunCrewId()

// Clear all
LocalStorageAPI.clearAll()
```

### useHydratedAthlete Hook

**Location**: `gofastfrontend-mvp1/src/hooks/useHydratedAthlete.js`

**Purpose**: Local-only context reader - pulls athlete and crew context from `LocalStorageAPI`

**Usage**:
```javascript
const { athlete, athleteId, runCrewId, runCrewManagerId, runCrew } = useHydratedAthlete();
```

**Returns**:
- `athlete` - Full athlete profile object
- `athleteId` - Athlete ID string
- `runCrewId` - Primary crew ID (from `MyCrew`)
- `runCrewManagerId` - Manager record ID (from `MyCrewManagerId`)
- `runCrew` - Cached crew data (from `runCrewData`)

### Migration from V1 to V2

**Key Changes**:
1. **Removed**: `runcrewAdminId` field from `RunCrew` model
2. **Removed**: `adminRunCrews` relation from `Athlete` model
3. **Added**: `RunCrewManager` junction table as source of truth for roles
4. **Added**: `MyCrew` and `MyCrewManagerId` in athlete hydration response
5. **Updated**: All backend routes to use `managers` table for admin checks
6. **Updated**: Frontend to use `LocalStorageAPI` for all context access

**Admin Status Check (V2)**:
```javascript
// OLD (V1):
const isAdmin = runCrew.runcrewAdminId === athlete.id;

// NEW (V2):
const isAdmin = (runCrew.managers || []).some(
  m => m.athleteId === athlete.id && m.role === 'admin'
);
```

---

## Development Setup

### Prerequisites
- Node.js 20+
- PostgreSQL database
- Firebase project (for authentication)
- Git

### Backend Setup

```bash
cd gofastbackendv2-fall2025

# Install dependencies
npm install

# Copy environment template
cp env.example .env

# Set up environment variables
# DATABASE_URL="postgresql://..."
# FIREBASE_SERVICE_ACCOUNT="{\"type\":\"service_account\",...}" (matches Render env var name)

# Generate Prisma client
npx prisma generate

# Push schema to database (cloud-first workflow)
npx prisma db push --accept-data-loss

# Run development server
npm run dev
```

**Backend runs on**: http://localhost:3001

### Frontend Setup

```bash
cd gofastfrontend-mvp1

# Install dependencies
npm install

# Firebase config is in src/firebase.js

# Run development server
npm run dev
```

**Frontend runs on**: http://localhost:5173

### Database Workflow

**Cloud-First Schema Sync**:
```bash
# Generate Prisma client (after schema changes)
npx prisma generate

# Push schema to database (cloud-first - no migrations)
npx prisma db push --accept-data-loss

# Open Prisma Studio (database GUI)
npx prisma studio
```

**Build Command** (Render):
```json
"build": "npm install && npx prisma generate && npx prisma db push --accept-data-loss"
```

---

## Deployment Architecture

```
┌─────────────────────────────────┐
│   gofastfrontend-mvp1.vercel.app│
│   (React App - Vercel)          │
│   Main athlete app               │
└────────────┬────────────────────┘
             │
             │ API calls
             ▼
┌─────────────────────────────────┐
│   gofastbackendv2-fall2025.     │
│        onrender.com             │
│   (Express API - Render)        │
└────────────┬────────────────────┘
             │
             │ Database queries
             ▼
┌─────────────────────────────────┐
│   PostgreSQL Database           │
│   (Prisma ORM)                  │
└─────────────────────────────────┘
```

### Production URLs
- **Frontend (Main App)**: https://gofastfrontend-mvp1.vercel.app
- **Backend API**: https://gofastbackendv2-fall2025.onrender.com
- **Admin Dashboard**: https://dashboard.gofastcrushgoals.com

---

## Key Development Patterns

### 1. Athlete Creation/Hydration

**Create Athlete**:
```javascript
POST /api/athlete/create
Body: {
  firebaseId: "firebase-uid",
  email: "user@example.com",
  firstName: "John",
  lastName: "Doe"
}
```

**Hydrate Athlete**:
```javascript
GET /api/athlete/:id/hydrate
Headers: {
  Authorization: "Bearer <firebase-token>"
}
Returns: {
  athlete: {...},
  activities: [...],
  runCrewMemberships: [...],
  trainingPlans: [...]
}
```

### 2. RunCrew Management (Phase 1)

**Create RunCrew**:
```javascript
POST /api/runcrew/create
Body: {
  name: "Morning Warriors",
  joinCode: "FAST123",
  description: "5am grind, every day",
  athleteId: "athlete-id"
}
```

**Join RunCrew**:
```javascript
POST /api/runcrew/join
Body: {
  joinCode: "FAST123",
  athleteId: "athlete-id"
}
```

**Hydrate RunCrew**:
```javascript
GET /api/runcrew/:id
Returns: {
  runCrew: {...},
  members: [...],
  admin: {...},
  posts: [...],
  leaderboard: [...]
}
```

### 3. Universal Upsert Pattern

**Upsert Modular Extension**:
```javascript
POST /api/admin/upsert/founder
Body: {
  athleteId: "athlete-id"
}
```

**Configuration**: `config/modelConfig.js` defines which models can be upserted

---

## Platform Roadmap

### Phase 1: RunCrew (MVP1) - Current Focus ✅
**Status**: Core routes implemented, admin dashboard operational

**Features**:
- ✅ Create and join RunCrews
- ✅ Hydrate crews with members, posts, leaderboards
- ✅ Admin dashboard (RunCrewCentralAdmin) with full CRUD
- ✅ Run management (create, edit, delete with inline details)
- ✅ Announcement system
- ✅ Member roster display
- ✅ RSVP tracking
- 🚧 Member management (leave, remove)
- 🚧 Admin operations (delegate, broadcast)
- 🚧 Leaderboard calculation service

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

## Related Documentation

- **`GOFAST_ARCHITECTURE.md`** - Complete architecture, modular patterns, and design principles
- **`docs/RunCrewArchitecture.md`** - Complete RunCrew implementation (schema, routes, flows)
- **`docs/TrainingArchitecture.md`** - Training plans architecture (future phases)
- **`gofast-architecture.md`** - Repository structure and deployment patterns (operational/deployment focus)
- **`BACKEND_SCAFFOLDING_PATTERN.md`** - Route organization and naming conventions
- **`gofast-user-dashboard/IDENTITY_ARCHITECTURE.md`** - Athlete vs Company identity separation
- **`gofastfrontend-mvp1/docs/FRONTEND_ARCHITECTURE.md`** - Frontend structure and patterns
- **`gofastfrontend-mvp1/profile_ux_architecture.md`** - Profile setup UX architecture, completion flow, reminder system, and profile picture upload strategy

---

**Last Updated**: January 2025  
**Stack Version**: 2.0  
**Architecture**: Athlete-First  
**Schema Pattern**: Central Identity + Modular Extensions  
**Phase**: 1 (RunCrew MVP1)

