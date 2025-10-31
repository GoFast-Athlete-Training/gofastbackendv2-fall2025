# RunCrew Architecture

## Overview
RunCrew is a feature that allows athletes to create and join small running groups for accountability and coordination. This is different from RunClubs (larger, organized clubs) - RunCrews are more intimate, like "Life360 circles for runners."

**Key Differentiator**: RunCrews need **banter and fun** - not just leaderboards. Features include:
- **Forum/Posts**: Text + images for crew banter and motivation
- **Leaderboards**: Weekly/monthly/all-time stats from aggregated activities
- **Description & Logo**: Crew branding and identity
- **Archive**: Soft delete for preserving data
- **Member Count**: Real-time count from junction table

---

## RunCrew Container - What's Inside

### Core Fields
- `name`: Display name (e.g., "Morning Warriors")
- `description`: Optional motto/description (e.g., "5am grind, every day")
- `logo`: Optional image URL for crew branding
- `joinCode`: Unique invite code (case-insensitive, uppercase stored)

### Status & Lifecycle
- `isArchived`: Boolean flag for soft delete
- `archivedAt`: Timestamp when archived (preserves data)
- `createdAt` / `updatedAt`: Standard timestamps

### Derived Data
- **Member Count**: Query `memberships.count` (real-time from junction table)
- **Admin**: Single admin via `runcrewAdminId` relation

### Related Data (Relations)
- **Memberships**: Junction table entries (many-to-many)
- **Posts**: Forum/banter posts
- **Leaderboards**: Aggregated stats for competition

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
  runcrewAdminId  String   // Athlete ID of the admin/creator
  
  // Status & Archive
  isArchived      Boolean  @default(false) // Soft delete - archive crew instead of deleting
  archivedAt      DateTime? // When crew was archived
  
  // System fields
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  admin     Athlete  @relation("RunCrewAdmin")
  memberships RunCrewMembership[] // Junction table for members
  posts     RunCrewPost[] // Forum posts/banter
  leaderboardEntries RunCrewLeaderboard[] // Leaderboard stats
}
```

**Key Fields:**
- `id`: Unique identifier (cuid)
- `name`: Display name of the crew
- `description`: Optional crew description/motto (e.g., "Morning Warriors - 5am grind")
- `joinCode`: Unique invite code (user-created, validated for uniqueness)
- `logo`: Optional logo/image URL for crew branding
- `runcrewAdminId`: Foreign key to Athlete who created/manages the crew
- `isArchived`: Soft delete flag (archive instead of hard delete)
- `archivedAt`: Timestamp when crew was archived

### RunCrewMembership Model (Junction Table)
**Table**: `run_crew_memberships`

```prisma
model RunCrewMembership {
  id        String   @id @default(cuid())
  runCrewId String
  athleteId String
  
  // Timestamps
  joinedAt  DateTime @default(now())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  runCrew   RunCrew  @relation(fields: [runCrewId], references: [id])
  athlete   Athlete  @relation(fields: [athleteId], references: [id])
  
  @@unique([runCrewId, athleteId]) // Prevent duplicate memberships
}
```

**Key Design Decisions:**
- **Junction table**: Enables many-to-many relationship (athletes can be in multiple crews)
- **Unique constraint**: Prevents duplicate memberships (same athlete + same crew)
- **Athlete is source of truth**: Query `runCrewMemberships` via `athleteId` to get all crews
- **Timestamps**: Track when athlete joined each crew

### RunCrewPost Model (Forum/Banter)
**Table**: `run_crew_posts`

```prisma
model RunCrewPost {
  id        String   @id @default(cuid())
  runCrewId String
  athleteId String   // Post author
  
  // Content
  content   String   // Post text/content
  imageUrl  String?  // Optional image attachment
  
  // Engagement
  likes     Int      @default(0) // Like count
  
  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  runCrew   RunCrew  @relation(...)
  athlete   Athlete  @relation(...)
  comments  RunCrewPostComment[] // Post comments/replies
}
```

**Purpose**: Enable banter, messaging, and community within RunCrews
- Posts are crew-specific (only members can see)
- Supports text and optional images
- Comments/replies for threaded discussions
- Like system for engagement

### RunCrewPostComment Model
**Table**: `run_crew_post_comments`

```prisma
model RunCrewPostComment {
  id        String   @id @default(cuid())
  postId    String
  athleteId String   // Comment author
  content   String   // Comment text
  
  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  post      RunCrewPost @relation(...)
  athlete   Athlete     @relation(...)
}
```

**Purpose**: Threaded comments on posts for discussions

### RunCrewLeaderboard Model
**Table**: `run_crew_leaderboards`

```prisma
model RunCrewLeaderboard {
  id        String   @id @default(cuid())
  runCrewId String
  athleteId String
  
  // Time period
  period    String   // 'week', 'month', 'allTime'
  periodStart DateTime
  periodEnd   DateTime
  
  // Stats (aggregated from AthleteActivity)
  totalMiles       Float    @default(0)
  totalRuns        Int      @default(0)
  bestPace         String?  // Best pace achieved (e.g., "6:25/mi")
  totalCalories    Int      @default(0)
  totalElevation   Float    @default(0) // In meters
  
  // Timestamps
  calculatedAt     DateTime @default(now())
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

**Purpose**: Aggregated stats for leaderboards (replaces real-time Strava leaderboard)
- Multiple time periods: weekly, monthly, all-time
- Stats calculated from `AthleteActivity` for crew members
- Unique constraint prevents duplicate entries per period

### Athlete Relations

```prisma
model Athlete {
  // ... existing fields ...
  
  // RunCrew Relations
  adminRunCrews RunCrew[] @relation("RunCrewAdmin") // Crews this athlete admins
  runCrewMemberships RunCrewMembership[] // All crew memberships (junction table)
  runCrewPosts RunCrewPost[] // Posts authored by this athlete
  runCrewPostComments RunCrewPostComment[] // Comments authored by this athlete
  runCrewLeaderboards RunCrewLeaderboard[] // Leaderboard entries for this athlete
}
```

---

## Relationships

### One-to-Many: RunCrew → Admin (Athlete)
- Each RunCrew has **one** admin (creator)
- An Athlete can be admin of **multiple** RunCrews
- Relationship: `RunCrew.runcrewAdminId → Athlete.id`

### Many-to-Many: RunCrew ↔ Athlete (via RunCrewMembership)
- Each RunCrew can have **many** members
- Each Athlete can belong to **many** RunCrews
- Junction table: `RunCrewMembership`
- Relationship: `RunCrewMembership.runCrewId → RunCrew.id` and `RunCrewMembership.athleteId → Athlete.id`
- **Athlete is source of truth**: Query memberships via `athlete.runCrewMemberships` to get all crews

---

## Frontend Architecture & User Flows

### Frontend Pages Inventory

**Location**: `gofastfrontend-demo/src/Pages/RunCrew/`

**Total**: 12 RunCrew pages (excluding RunClub which is separate)

#### 1. Onboarding Flow (6 pages)

##### 1.1 Crew Explainer (`/crew-explainer`)
- **File**: `CrewExplainer.jsx`
- **Purpose**: Educational page explaining what RunCrews are
- **Content**: Benefits, use cases, social proof
- **Actions**: 
  - "Start Your Own Crew" → `/form-run-crew`
  - "Join an Existing Crew" → `/join-or-start-crew`
- **Status**: ✅ Built

##### 1.2 Join or Start Crew (`/join-or-start-crew`)
- **File**: `JoinOrStartCrew.jsx`
- **Purpose**: Decision point for users
- **Flow**:
  - User chooses: "Join Crew" OR "Start Crew"
  - Join → `/run-crew-join`
  - Start → `/form-run-crew`
- **Status**: ✅ Built

##### 1.3 Start RunCrew (`/start-run-crew`)
- **File**: `StartRunCrew.jsx`
- **Purpose**: Entry point for creation flow
- **Actions**: Navigate to form or explainer
- **Status**: ✅ Built

##### 1.4 Create Crew Form (`/form-run-crew`)
- **File**: `FormRunCrew.jsx`
- **Purpose**: Primary form for creating a RunCrew
- **Fields**:
  - Crew Name (required)
  - Join Code (required, unique)
  - Description (optional)
  - Logo upload (optional)
- **Demo Mode**: Pre-filled with `FAST123` for easy navigation
- **On Submit**:
  - `POST /api/runcrew/create` (or skip in demo mode)
  - Store crew data in localStorage
  - Navigate to `/run-crew-success`
- **Status**: ✅ Built (has demo mode)

##### 1.5 Create Crew (`/create-crew`)
- **File**: `CreateCrew.jsx`
- **Purpose**: Alternative create page
- **Status**: ✅ Built (basic scaffold)

##### 1.6 RunCrew Success (`/run-crew-success`)
- **File**: `RunCrewSuccess.jsx`
- **Purpose**: Confirmation page after creating crew
- **Content**:
  - Success message
  - Join code display (copyable)
  - Share instructions
  - "Go to Crew Dashboard" button
- **Actions**: 
  - Copy code to clipboard
  - Share via message
  - Navigate to `/crew-dashboard`
- **Status**: ✅ Built

#### 2. Join Flow (2 pages)

##### 2.1 RunCrew Join (`/run-crew-join`)
- **File**: `RunCrewJoin.jsx`
- **Purpose**: Primary interface for joining a crew
- **Fields**: Join code input
- **Demo Mode**: Pre-filled demo code available
- **On Submit**:
  - `POST /api/runcrew/join`
  - Validate join code
  - Create `RunCrewMembership`
  - Navigate to `/crew-dashboard`
- **Status**: ✅ Built (has demo mode)

##### 2.2 Join Crew (`/join-crew`)
- **File**: `JoinCrew.jsx`
- **Purpose**: Alternative join interface
- **Status**: ✅ Built

#### 3. Crew Views (4 pages)

##### 3.1 Crew Dashboard (`/crew-dashboard`)
- **File**: `CrewDashboard.jsx`
- **Purpose**: Central hub for crew management
- **Content**:
  - Crew header (name, logo, member count)
  - Crew members list
  - Leaderboard (weekly/monthly/all-time)
  - Personal stats within crew
  - Share crew code section
- **Actions**:
  - View members
  - View leaderboard
  - Share join code
  - Navigate to RunCrew Home
- **Status**: ✅ Built (has mock data)

##### 3.2 RunCrew Home (`/runcrew-home`)
- **File**: `RunCrewHome.jsx`
- **Purpose**: Crew home/chat view
- **Content**: Placeholder for forum/posts feature
- **Status**: ⚠️ Scaffolded (needs implementation)

##### 3.3 RunCrew Members (`/runcrew-members`)
- **File**: `RunCrewMembers.jsx`
- **Purpose**: View list of all crew members
- **Content**: Member cards with photos, names, stats
- **Status**: ✅ Built

##### 3.4 Membership Manage (`/runcrew-membership-manage`)
- **File**: `RunCrewMembershipManage.jsx`
- **Purpose**: Manage crew memberships
- **Actions**:
  - Leave crew (for members)
  - Remove member (for admin)
  - View membership details
- **Status**: ✅ Built

#### 4. Demo Navigation

##### 4.1 RunCrew Demo Nav (`/runcrew-demo-nav`)
- **File**: `RunCrewDemoNav.jsx`
- **Purpose**: Central navigation hub for all RunCrew pages
- **Content**: Organized by category with descriptions and paths
- **Status**: ✅ Built (comprehensive navigation)

---

## Complete User Flows

### Flow 1: Create a RunCrew

**Entry Points:**
- `Connect.jsx` → "Start a Run Crew" button
- `AthleteHome.jsx` → "Start Your Crew" card (if no memberships)

**Flow Steps:**
1. User clicks "Start a Run Crew"
2. Navigate to `/crew-explainer` (optional education)
3. Navigate to `/join-or-start-crew`
4. User selects "Start Your Crew"
5. Navigate to `/form-run-crew`
6. User fills form:
   - Crew Name: "Morning Warriors"
   - Join Code: "FAST123" (validated for uniqueness)
   - Description: "5am grind, every day" (optional)
   - Logo: Upload image (optional)
7. Submit form → `POST /api/runcrew/create`
   - Backend creates `RunCrew` record
   - Backend creates `RunCrewMembership` for admin
   - Returns hydrated crew with members
8. Navigate to `/run-crew-success`
9. User sees success message and join code
10. User can:
    - Copy code to clipboard
    - Share via message
    - Navigate to `/crew-dashboard`

**Data Flow:**
```
Frontend → POST /api/runcrew/create
{
  name: "Morning Warriors",
  joinCode: "FAST123",
  description: "5am grind, every day",
  logo: "https://...",
  athleteId: "athlete-id-from-localStorage"
}
↓
Backend validates & creates
↓
Returns: {
  success: true,
  runCrew: { id, name, joinCode, memberships: [...], admin: {...} }
}
↓
Frontend stores in localStorage & navigates
```

### Flow 2: Join a RunCrew

**Entry Points:**
- `Connect.jsx` → "Join a Run Crew" button
- `JoinOrStartCrew.jsx` → "Join Crew" option
- Direct link with code: `/run-crew-join?code=FAST123`

**Flow Steps:**
1. User navigates to `/join-or-start-crew` or `/run-crew-join`
2. User enters join code (e.g., "FAST123")
3. Submit → `POST /api/runcrew/join`
   - Backend finds RunCrew by joinCode
   - Backend checks if athlete already a member
   - Backend creates `RunCrewMembership`
   - Returns hydrated crew with members
4. Navigate to `/crew-dashboard`

**Data Flow:**
```
Frontend → POST /api/runcrew/join
{
  joinCode: "FAST123",
  athleteId: "athlete-id-from-localStorage"
}
↓
Backend finds RunCrew by joinCode
Backend checks membership (prevents duplicates)
Backend creates RunCrewMembership
↓
Returns: {
  success: true,
  runCrew: { id, name, memberships: [...], admin: {...} }
}
↓
Frontend navigates to dashboard
```

### Flow 3: View & Manage Crew

**Entry Points:**
- `AthleteHome.jsx` → "My Crew" card (if has memberships)
- Direct navigation to `/crew-dashboard`

**Flow Steps:**
1. User navigates to `/crew-dashboard`
2. Frontend calls `GET /api/runcrew/mine` (get all crews user belongs to)
   - OR `GET /api/runcrew/:id` (get specific crew)
3. Display:
   - Crew info (name, description, logo)
   - Member list with stats
   - Leaderboard (weekly/monthly/all-time)
   - Personal rank in crew
4. User can:
   - View members → `/runcrew-members`
   - Manage memberships → `/runcrew-membership-manage`
   - Navigate to crew home/forum → `/runcrew-home`

**Data Flow:**
```
Frontend → GET /api/runcrew/:id
↓
Backend queries:
- RunCrew by ID
- RunCrewMemberships with Athlete includes
- RunCrewPosts (for forum)
- RunCrewLeaderboards (for stats)
↓
Returns: {
  runCrew: {...},
  members: [{...}],
  admin: {...},
  posts: [...],
  leaderboard: [...]
}
↓
Frontend renders dashboard
```

---

## API Endpoints

### Implemented

**Create RunCrew** ✅
- `POST /api/runcrew/create`
- Body: `{ name: string, joinCode: string, description?: string, logo?: string, athleteId: string }`
- Auth: Firebase token required
- Returns: `{ success: true, runCrew: RunCrew }`
- **Implementation**: `routes/RunCrew/runCrewCreateRoute.js`

**Join RunCrew** ✅
- `POST /api/runcrew/join`
- Body: `{ joinCode: string, athleteId: string }`
- Auth: Firebase token required
- Returns: `{ success: true, runCrew: RunCrew }`
- **Implementation**: `routes/RunCrew/runCrewJoinRoute.js`

### Planned

**Get RunCrew Details**
- `GET /api/runcrew/:id`
- Auth: Firebase token
- Returns: `{ runCrew: RunCrew, members: Athlete[], admin: Athlete }`

**Get My RunCrews**
- `GET /api/runcrew/mine`
- Auth: Firebase token
- Returns: `{ runCrews: RunCrew[] }`
- Implementation: Query `RunCrewMembership` where `athleteId = athleteId` and include `runCrew`

**Get RunCrew Members**
- `GET /api/runcrew/:id/members`
- Auth: Firebase token
- Returns: `{ members: Athlete[], admin: Athlete }`

**Leave RunCrew**
- `DELETE /api/runcrew/:id/leave` or `PUT /api/runcrew/leave`
- Auth: Firebase token
- Body: `{ athleteId: string }`
- Deletes: `RunCrewMembership` record

**Remove Member** (Admin only)
- `DELETE /api/runcrew/:id/members/:athleteId`
- Auth: Firebase token (must be admin)
- Deletes: `RunCrewMembership` record

**Archive RunCrew** (Admin only)
- `PUT /api/runcrew/:id/archive`
- Auth: Firebase token (must be admin)
- Sets: `isArchived: true`, `archivedAt: now()`

---

## Business Logic

### Join Code Validation
- Must be unique across all RunCrews
- Validation on creation: Check if `joinCode` already exists
- Case-insensitive comparison (normalize to uppercase)
- Format: Alphanumeric, 4-12 characters
- User-created (not auto-generated)

### Membership Rules
- **Multiple crews per athlete**: Athlete can be in multiple RunCrews (via junction table)
- Athlete cannot join same RunCrew twice (enforced by `@@unique([runCrewId, athleteId])`)
- Admin is automatically added as a member (upsert `RunCrewMembership` on crew creation)
- When athlete leaves, delete `RunCrewMembership` record
- When admin removes member, delete `RunCrewMembership` record
- **Athlete is source of truth**: Query `athlete.runCrewMemberships` to get all crews

### Access Control
- **View RunCrew**: Must be a member or admin
- **Update RunCrew**: Admin only (name, description, logo)
- **Archive RunCrew**: Admin only
- **Join RunCrew**: Any authenticated athlete (if joinCode is valid)
- **Leave RunCrew**: Member themselves
- **Remove Member**: Admin only
- **Create Posts**: Members only
- **View Posts**: Members only

---

## Frontend State Management

### Local Storage
- `athleteId`: Stored after athlete hydration (source of truth for backend calls)
- `currentCrew`: Temporary storage of created crew data
- `joinedCrew`: Temporary storage after joining a crew

### Demo Mode
- Many pages include demo mode logic
- Skips API calls if `localStorage.getItem('athleteId')` is missing
- Pre-fills forms with mock data
- Allows navigation through flows without backend connection
- Example: `FormRunCrew.jsx` has `FAST123` pre-filled

---

## Core Features

### Forum/Posts (Banter & Community) - Planned
- **Posts**: Text + optional images per crew
- **Comments**: Threaded replies on posts
- **Likes**: Engagement metrics
- **Purpose**: Create banter, motivation, and community within crew
- **Access**: Members only (crew-specific)
- **Implementation**: `RunCrewHome.jsx` is scaffolded for this

### Leaderboards (Competition) - Planned
- **Multiple Periods**: Weekly, monthly, all-time
- **Metrics**: Total miles, runs, best pace, calories, elevation
- **Data Source**: Aggregated from `AthleteActivity` (Garmin/Strava)
- **Purpose**: Friendly competition and motivation
- **Updates**: Calculated periodically from member activities
- **Display**: Currently shown in `CrewDashboard.jsx` with mock data

### Crew Management
- **Description**: Optional crew motto/description
- **Logo**: Optional branding/image
- **Archive**: Soft delete (preserve data)
- **Member Count**: Derived from `memberships` count
- **Admin**: Single admin per crew

---

## Future Enhancements

- **Events**: Schedule runs within a crew
- **Activity Sharing**: Share specific Garmin activities with crew
- **Notifications**: Alert crew members of activities/posts
- **Admin Transfer**: Transfer admin role to another member
- **Crew Analytics**: Advanced stats and insights
- **Reactions**: Emoji reactions beyond likes
- **Mentions**: @mention members in posts
- **Invite Links**: Generate shareable invite links (alternative to codes)

---

## Decisions & Questions Resolved

1. **Admin as Member**: Admin is automatically a member (upsert membership on create)
2. **Multiple Admins**: Single admin for MVP, add co-admins later if needed
3. **Join Code Format**: Alphanumeric, 4-12 chars, case-insensitive, unique constraint
4. **Member Limit**: No limit for MVP, add later if needed
5. **Deleted Crews**: Soft delete (archive) - `isArchived` flag preserves data
6. **RunClub Separation**: RunClub is a separate feature with its own architecture

---

## Migration Notes

- **Junction table**: `RunCrewMembership` enables many-to-many relationship
- New tables: `run_crews`, `run_crew_memberships`
- **Athlete can be in multiple crews**: Query memberships via `athlete.runCrewMemberships`
- Unique constraint prevents duplicate memberships: `@@unique([runCrewId, athleteId])`
- Future tables: `run_crew_posts`, `run_crew_post_comments`, `run_crew_leaderboards` (schema ready, not yet implemented)

---

## Testing & Demo

### Demo Navigation
- **URL**: `/runcrew-demo-nav`
- **Purpose**: Quick access to all 12 RunCrew pages
- **Organization**: By category (Onboarding, Join Flow, Crew Views)
- **Use Case**: UX review, testing flows, architecture reference

### Demo Mode
- Pre-filled forms for quick navigation
- Skips API calls when `athleteId` not in localStorage
- Mock data in `CrewDashboard.jsx` for visual testing
- Allows full flow testing without backend connection
