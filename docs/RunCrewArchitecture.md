# RunCrew Architecture

**Last Updated**: November 2025  
**Schema Status**: ✅ Complete (RunCrew, RunCrewMembership, RunCrewMessage, RunCrewAnnouncement, RunCrewLeaderboard, RunCrewRun, RunCrewRunRSVP, RunCrewEvent, RunCrewEventRSVP)  
**Route Status**: Core routes implemented (create, join, hydrate)  
**Pattern**: Following `GOFAST_ARCHITECTURE.md`  
**Architecture**: Athlete-first schema - all RunCrew features link back to Athlete model

---

## Premise

RunCrew is a way for runners to form groups and share the things that are organic to running communities:

1. **Running Together** - Prescribed time, place, meetups with RSVP capability
2. **Chatter** - Dynamic, interactive chat for banter and motivation
3. **Leaderboard** - Friendly competition tracking miles, pace, and calories

**Core Value**: Accountability through community - runners stay motivated by connecting with others, coordinating runs, and competing in friendly leaderboards.

---

## Architecture Philosophy

### Crew ID as Primary Relationship Manager

**Key Concept**: Once a crew is selected, the `runCrewId` becomes the primary relationship manager for all crew features.

**Lookup Flow**:
1. **Start with athleteId** → `GET /api/runcrew` (finds all crews for authenticated athlete)
2. **Transition to runCrewId** → `GET /api/runcrew/:id` (runCrewId becomes primary relationship manager)

**Why This Matters**:
- Initial lookup uses `athleteId` (from Firebase token) to find crews
- Once in crew context, `runCrewId` is primary
- All relationships within crew (members, chatter, runs, leaderboards) use `runCrewId`
- Security checks still use `athleteId` for auth verification

### Modular Frontend Architecture

**Entry Point**: Universal hydration → localStorage → route based on admin status

**Admin Routing Logic** (All from localStorage):
```javascript
// Read from localStorage (already hydrated from /api/athlete/hydrate)
const athleteData = JSON.parse(localStorage.getItem('athleteData'));
const runCrew = athleteData.runCrew;
const currentAthleteId = athleteData.athlete.id;

// Check if adminId exists and matches current athlete
const isAdmin = runCrew.runcrewAdminId === currentAthleteId;
const runCrewId = runCrew.id;

// Route appropriately
if (isAdmin) {
  navigate(`/runcrew/admin/${runCrewId}`);
} else {
  navigate(`/runcrew/${runCrewId}`);
}
```

**Routing**:
- Admin crews → `/runcrew/admin/:id` (admin view with special UX)
- Member crews → `/runcrew/:id` (member view)

**Component Responsibilities**:
- Universal hydration saves to localStorage on app load
- Components read from localStorage (no API calls)
- `RunCrewAdmin.jsx` - Admin view, reads from localStorage
- `RunCrewCentral.jsx` - Member view, reads from localStorage

---

## Database Schema

### RunCrew Model
**Table**: `run_crews`

```prisma
model RunCrew {
  id              String   @id @default(cuid())
  name            String
  description     String?  // Optional crew description/motto
  joinCode        String   @unique // Unique invite code for joining
  logo            String?  // Optional logo/image URL
  icon            String?  // Optional emoji/icon (alternative to logo)
  runcrewAdminId String?  // Athlete ID of the creator/admin
  
  // Status & Archive
  isArchived      Boolean  @default(false) // Soft delete - archive crew instead of deleting
  archivedAt      DateTime? // When crew was archived
  
  // System fields
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  admin         Athlete?              @relation("RunCrewAdmin", fields: [runcrewAdminId], references: [id])
  memberships   RunCrewMembership[]    // Junction table for members
  messages      RunCrewMessage[]       // Simple chat messages (real-time via socket)
  announcements RunCrewAnnouncement[]  // Admin announcements
  leaderboardEntries RunCrewLeaderboard[] // Leaderboard stats (calculated cache)
  runs          RunCrewRun[]           // Runs with RSVP (MVP1: admin/manager only)
  events        RunCrewEvent[]         // General events (future - happy hour, social, etc.)
  managers      RunCrewManager[]       // Delegated managers (future)
  
  @@map("run_crews")
}
```

**Key Fields**:
- `id`: Unique identifier (cuid)
- `name`: Display name of the crew
- `description`: Optional motto/description
- `joinCode`: Unique invite code (case-insensitive, uppercase stored)
- `runcrewAdminId`: Direct foreign key to `athletes.id` - the athlete who created the crew

### RunCrewMembership Model
**Table**: `run_crew_memberships`

```prisma
model RunCrewMembership {
  id        String @id @default(cuid())
  runCrewId String
  athleteId String // ATHLETE-FIRST: Foreign key to Athlete
  
  // Timestamps
  joinedAt  DateTime @default(now())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  runCrew RunCrew @relation(fields: [runCrewId], references: [id], onDelete: Cascade)
  athlete Athlete @relation("AthleteRunCrewMemberships", fields: [athleteId], references: [id], onDelete: Cascade)
  
  @@unique([runCrewId, athleteId]) // Prevent duplicate memberships
  @@map("run_crew_memberships")
}
```

**Purpose**: Junction table enabling many-to-many relationship (athlete can be in multiple crews)

### RunCrewMessage Model (Simple Chat)
**Table**: `run_crew_messages`

```prisma
model RunCrewMessage {
  id        String @id @default(cuid())
  runCrewId String
  athleteId String // Message author
  
  content   String // Message text (just content, no images/likes)
  
  createdAt DateTime @default(now())
  
  // Relations
  runCrew   RunCrew  @relation(fields: [runCrewId], references: [id], onDelete: Cascade)
  athlete   Athlete  @relation(fields: [athleteId], references: [id], onDelete: Cascade)
  
  @@map("run_crew_messages")
}
```

**Purpose**: Simple chat box for RunCrews
- Crew-specific (only members can see)
- Just text messages - no images, likes, or threaded comments
- Real-time via socket.io
- Messages saved to database for history
- **MVP1**: Simple chronological chat box

### RunCrewAnnouncement Model
**Table**: `run_crew_announcements`

```prisma
model RunCrewAnnouncement {
  id        String   @id @default(cuid())
  runCrewId String
  authorId  String   // Admin who created it
  
  title     String
  content   String
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  runCrew   RunCrew  @relation(fields: [runCrewId], references: [id], onDelete: Cascade)
  author    Athlete  @relation(fields: [authorId], references: [id], onDelete: Cascade)
  
  @@map("run_crew_announcements")
}
```

**Purpose**: Admin announcements for RunCrew
- Modular - can have multiple announcements
- Unique ID on save
- Track author, timestamps
- Future: Can archive old announcements

### RunCrewRun Model (Runs) - MVP1
**Table**: `run_crew_runs`

```prisma
model RunCrewRun {
  id           String   @id @default(cuid())
  runCrewId    String
  createdById  String   // Admin or manager who created the run (MVP1: admin only)
  
  title        String
  date         DateTime
  startTime    String   // "6:00 AM"
  location     String
  address      String?
  
  // Run-specific fields
  totalMiles   Float?   // Total miles for the run
  pace         String?  // Target pace (e.g., "8:00-9:00 min/mile")
  stravaMapUrl String?  // Strava map URL for route visualization
  
  description  String?
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  runCrew      RunCrew  @relation(fields: [runCrewId], references: [id], onDelete: Cascade)
  createdBy    Athlete  @relation("RunCrewRunCreator", fields: [createdById], references: [id], onDelete: Cascade)
  rsvps        RunCrewRunRSVP[]
  
  @@map("run_crew_runs")
}
```

**Purpose**: Coordinate group runs (specific to running activities)
- **MVP1**: Only admin can create runs (via `createdById` - tied to `runcrewAdminId`)
- **Future**: Managers can also create runs (when `RunCrewManager` model added)
- Run-specific fields: totalMiles, pace, stravaMapUrl, startTime
- RSVP system for attendance tracking (tied to athleteId)
- **Hydration**: `createdBy` relation shows who created the run

### RunCrewRunRSVP Model
**Table**: `run_crew_run_rsvps`

```prisma
model RunCrewRunRSVP {
  id        String   @id @default(cuid())
  runId     String
  athleteId String   // RSVP tied to athleteId
  
  status    String   // "going", "maybe", "not-going"
  
  createdAt DateTime @default(now())
  
  run       RunCrewRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  athlete   Athlete    @relation("RunCrewRunRSVP", fields: [athleteId], references: [id], onDelete: Cascade)
  
  @@unique([runId, athleteId]) // One RSVP per athlete per run
  @@map("run_crew_run_rsvps")
}
```

**Purpose**: RSVP system for run attendance tracking

### RunCrewLeaderboard Model
**Table**: `run_crew_leaderboards`

```prisma
model RunCrewLeaderboard {
  id        String @id @default(cuid())
  runCrewId String
  athleteId String
  
  // Time period
  period      String // 'week', 'month', 'allTime'
  periodStart DateTime // Start of period
  periodEnd   DateTime // End of period
  
  // Stats
  totalMiles     Float   @default(0)
  totalRuns      Int     @default(0)
  bestPace       String? // Best pace achieved (e.g., "6:25/mi")
  totalCalories  Int     @default(0)
  totalElevation Float   @default(0) // In meters
  
  // Timestamps
  calculatedAt DateTime @default(now())
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  // Relations
  runCrew RunCrew @relation(fields: [runCrewId], references: [id], onDelete: Cascade)
  athlete Athlete @relation(fields: [athleteId], references: [id], onDelete: Cascade)
  
  @@unique([runCrewId, athleteId, period, periodStart]) // Prevent duplicate entries for same period
  @@map("run_crew_leaderboards")
}
```

**Purpose**: **CALCULATED CACHE** for friendly competition
- **NOT a direct relationship** - this is **calculated data**
- **Input**: Members (via `RunCrewMembership`) + Activities (via `AthleteActivity`)
- **Calculation Service**: Aggregates activities by crew membership
- **Output**: Cached in this model for performance
- Periods: week, month, allTime
- Tracks: miles, runs, pace, calories, elevation
- **MVP1**: Start with single calculation (total mileage - pick week/month/allTime)

### RunCrewEvent Model (General Events) - Future
**Table**: `run_crew_events`

```prisma
model RunCrewEvent {
  id           String   @id @default(cuid())
  runCrewId    String
  organizerId  String   // Athlete ID who created the event
  
  title        String
  date         DateTime
  time         String   // "6:00 PM"
  location     String
  address      String?
  description  String?
  eventType    String?  // "happy-hour", "social", "meetup", etc.
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  runCrew      RunCrew  @relation(fields: [runCrewId], references: [id], onDelete: Cascade)
  organizer    Athlete  @relation("RunCrewEventOrganizer", fields: [organizerId], references: [id], onDelete: Cascade)
  rsvps        RunCrewEventRSVP[]
  
  @@map("run_crew_events")
}
```

**Purpose**: Coordinate general events (happy hour, social meetups, etc.)
- Separate from runs - for non-running activities
- **Status**: 🚧 Future - Schema ready but not MVP1 priority

### RunCrewManager Model (Future)
**Table**: `run_crew_managers`

```prisma
model RunCrewManager {
  id        String @id @default(cuid())
  runCrewId String
  athleteId String
  role      String // "admin" or "manager"
  
  createdAt DateTime @default(now())
  
  runCrew   RunCrew @relation(fields: [runCrewId], references: [id], onDelete: Cascade)
  athlete   Athlete @relation(fields: [athleteId], references: [id], onDelete: Cascade)
  
  @@unique([runCrewId, athleteId])
  @@map("run_crew_managers")
}
```

**Purpose**: Delegated managers for RunCrew
- **MVP1**: Single admin only (via `runcrewAdminId`)
- **Future**: Multiple managers via this junction table
- Permissions: Managers can create runs, manage members, post announcements
- **Status**: 🚧 Future - MVP1 uses single admin only

---

## API Endpoints & Route Structure

**Route Organization**: Following `GOFAST_ARCHITECTURE.md`
- **Folder**: `routes/RunCrew/` (PascalCase)
- **Files**: camelCase + "Route.js" (e.g., `runCrewCreateRoute.js`)
- **Registration**: All routes registered with `app.use('/api/runcrew', router)` in `index.js`

### Implemented Routes ✅

**Create RunCrew**
- **Route**: `POST /api/runcrew/create`
- **File**: `routes/RunCrew/runCrewCreateRoute.js`
- **Auth**: `verifyFirebaseToken` middleware
- **Body**: `{ name, description?, joinCode, logo?, icon? }`
- **Returns**: `{ success: true, runCrew: RunCrew }` (hydrated with admin and membership)
- **Status**: ✅ Fully implemented
  - Creates RunCrew with `runcrewAdminId` set to creator
  - Creates membership via junction table (upsert pattern)
  - Returns hydrated crew with admin and membership

**Join RunCrew**
- **Route**: `POST /api/runcrew/join`
- **File**: `routes/RunCrew/runCrewJoinRoute.js`
- **Auth**: `verifyFirebaseToken` middleware
- **Body**: `{ joinCode }`
- **Returns**: `{ success: true, runCrew: RunCrew }` (hydrated with members)
- **Status**: ✅ Fully implemented
  - Normalizes joinCode (uppercase)
  - Checks for existing membership before creating (prevents duplicates)
  - Creates RunCrewMembership via junction table
  - Returns hydrated crew with relations

**Note**: No `/mine` endpoint needed - use universal `/api/athlete/hydrate` instead!
- Universal hydration returns `runCrew` object in localStorage
- Frontend reads from localStorage (no API call needed)
- `isAdmin` flag computed from `runCrew.runcrewAdminId === athlete.id`

**Hydrate RunCrew**
- **Route**: `GET /api/runcrew/:id`
- **File**: `routes/RunCrew/runCrewHydrateRoute.js`
- **Auth**: `verifyFirebaseToken` middleware
- **Returns**: `{ success: true, runCrew: RunCrew }` (fully hydrated with admin, members, chatter, runs, leaderboard)
- **Status**: ✅ Fully implemented (MVP1 ready)
  - **Crew ID is primary relationship manager** - once in crew context, all relationships use crew ID
  - Includes admin, memberships with athlete details (for "Who's Here")
  - Includes announcements (admin-only, with author details)
  - Includes messages (limited to 20 most recent, simple chat)
  - Includes runs with RSVPs (MVP1: RunCrewRun model, admin-only creation)
  - Includes leaderboard entries (calculated cache) with athlete details
  - **Security**: Verifies athlete is member or admin before returning data (uses athleteId for auth check)
  - Returns `memberCount` and `isAdmin` flags
  - **Used by**: Both `RunCrewCentral.jsx` (member view) and `RunCrewCentralAdmin.jsx` (admin view)

### Planned Routes 🚧

**Runs & RSVP** (MVP1 - Schema Ready)
- `POST /api/runcrew/:runCrewId/runs` - Create run (admin only - MVP1)
- `GET /api/runcrew/:runCrewId/runs` - List upcoming runs (included in hydration)
- `GET /api/runcrew/runs/:runId` - Get run details with RSVPs
- `POST /api/runcrew/runs/:runId/rsvp` - RSVP to run (athleteId from auth)
- `PUT /api/runcrew/runs/:runId/rsvp` - Update RSVP status
- `DELETE /api/runcrew/runs/:runId/rsvp` - Remove RSVP
- **File**: `routes/RunCrew/runCrewRunRoute.js` (run management)
- **Schema**: ✅ `RunCrewRun` and `RunCrewRunRSVP` models ready
- **Run-Specific Fields**: totalMiles, pace, stravaMapUrl, startTime
- **Creation**: MVP1 - admin only (via `createdById` tied to `runcrewAdminId`)
- **Future**: Managers can create runs (when `RunCrewManager` model added)

**Messages** (MVP1 - Schema Ready)
- `POST /api/runcrew/:runCrewId/messages` - Create message (real-time via socket)
- **File**: `routes/RunCrew/runCrewMessageRoute.js` (chat management)
- **Schema**: ✅ `RunCrewMessage` model ready (simple chat, no comments/likes/images)
- **Real-time**: Socket.io integration for live chat

**Announcements** (MVP1 - Schema Ready)
- `POST /api/runcrew/:runCrewId/announcements` - Create announcement (admin only)
- `GET /api/runcrew/:runCrewId/announcements` - List announcements (included in hydration)
- **File**: `routes/RunCrew/runCrewAnnouncementRoute.js` (announcement management)
- **Schema**: ✅ `RunCrewAnnouncement` model ready

**Admin Operations** (Future)
- `PUT /api/runcrew/:id` - Update crew settings (name, description)
- `POST /api/runcrew/:id/broadcast` - Broadcast message to all members
- `DELETE /api/runcrew/:id/members/:athleteId` - Remove member (admin only)
- `POST /api/runcrew/:id/leave` - Leave crew (member)
- `POST /api/runcrew/:id/managers` - Delegate manager (future)

**Leaderboard Calculation** (Service Layer)
- **Input**: Members (via `RunCrewMembership`) + Activities (via `AthleteActivity`)
- **Calculation**: Aggregate activities by crew membership
- **Output**: Cache in `RunCrewLeaderboard` for performance
- **MVP1**: Single calculation (total mileage - pick week/month/allTime)
- Calculate periods: week, month, allTime
- Update `RunCrewLeaderboard` entries (calculated cache)

---

## Frontend Architecture

### Component Structure

**Entry Point**: Universal hydration → localStorage → route based on admin status
- No separate list component needed for MVP1 (single RunCrew)
- Read from localStorage, route directly to crew view

**Member View**: `RunCrewCentral.jsx`
- Route: `/runcrew/:id`
- Reads from localStorage (no API call)
- Displays: Who's Here (members), Messages (chat), Runs, Leaderboard

**Admin View**: `RunCrewAdmin.jsx`
- Route: `/runcrew/admin/:id`
- Reads from localStorage (no API call)
- Special UX: Announcements, Settings, "See as Member" option
- All member view features plus admin actions

### Routing Pattern

```javascript
// App.jsx
<Route path="/runcrew/:id" element={<RunCrewCentral />} />
<Route path="/runcrew/admin/:id" element={<RunCrewAdmin />} />
```

**Navigation Flow**:
1. App loads → Universal hydration saves to localStorage
2. Check admin status from localStorage → route to `/runcrew/admin/:id` or `/runcrew/:id`
3. Component reads from localStorage (no API call)
4. Crew ID becomes primary relationship manager for all features

---

## Data Flow

### Initial Lookup (athleteId → localStorage)
```
1. GET /api/athlete/hydrate (with Firebase token)
   ↓
2. Response: { athlete: {...}, runCrew: {...} }
   ↓
3. Save to localStorage: localStorage.setItem('athleteData', JSON.stringify(data))
   ↓
4. Check admin status: runCrew.runcrewAdminId === athlete.id
   ↓
5. Route: /runcrew/admin/:id or /runcrew/:id
```

### Crew Context (runCrewId from localStorage)
```
1. Read from localStorage: JSON.parse(localStorage.getItem('athleteData'))
   ↓
2. Data includes:
   - runCrew.memberships[] (with athlete details) → "Who's Here"
   - runCrew.messages[] (simple chat) → "Messages"
   - runCrew.announcements[] (with author) → "Announcements" (admin)
   - runCrew.runs[] (with rsvps[]) → "Runs"
   - runCrew.leaderboardEntries[] (calculated cache) → "Leaderboard"
   ↓
3. No API call needed - everything in localStorage!
```

---

## Key Design Principles

1. **Athlete-First**: All RunCrew features link back to Athlete as central identity
2. **Local-First Architecture**: Hydrate once via `/api/athlete/hydrate`, save to localStorage, use everywhere
3. **Crew ID as Primary**: Once in crew context, `runCrewId` is the primary relationship manager
4. **Junction Tables**: Many-to-many relationships use junction tables (RunCrewMembership)
5. **Calculated Data**: Leaderboard is calculated from members + activities, cached in `RunCrewLeaderboard`
6. **Simple Chat**: Messages are simple text (no images/likes/comments), real-time via socket
7. **Modular Announcements**: Separate model for announcements (title, content, author, timestamps)
8. **Admin-Only Runs**: MVP1 - only admin can create runs (via `createdById` tied to `runcrewAdminId`)
9. **Conditional Routing**: Admin vs member views based on localStorage check (no service needed)
10. **No Unnecessary API Calls**: If data is in localStorage, use it directly

---

## Related Documentation

- **`GOFAST_ARCHITECTURE.md`** - Main architecture document
- **`docs/RUNCREW_MVP1_REQUIREMENTS.md`** - MVP1 feature requirements

---

**Last Updated**: November 2025  
**Maintained By**: GoFast Development Team
