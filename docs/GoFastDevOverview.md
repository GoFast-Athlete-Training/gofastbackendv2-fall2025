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
GET    /api/runcrew/:id                 → Hydrate single crew (members, posts, leaderboard)
GET    /api/runcrew/mine                → Get all crews for authenticated athlete
DELETE /api/runcrew/:id/leave           → Leave a crew (TODO)
DELETE /api/runcrew/:id/members/:athleteId → Remove member (admin only, TODO)
```

**Complete Documentation**: See `docs/RunCrewArchitecture.md` for full API documentation.

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
# FIREBASE_SERVICE_ACCOUNT="{\"type\":\"service_account\",...}"

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

