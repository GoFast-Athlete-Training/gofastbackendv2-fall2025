# RunCrew Architecture

## Overview
RunCrew is a feature that allows athletes to create and join small running groups for accountability and coordination. This is different from RunClubs (larger, organized clubs) - RunCrews are more intimate, like "Life360 circles for runners."

**Key Differentiator**: RunCrews need **banter and fun** - not just leaderboards. Features include:
- **Forum/Posts**: Text + images for crew banter and motivation
- **Leaderboards**: Weekly/monthly/all-time stats from aggregated activities
- **Description & Logo**: Crew branding and identity
- **Archive**: Soft delete for preserving data
- **Member Count**: Real-time count from junction table

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

## API Endpoints (Planned)

### RunCrew Management

**Create RunCrew**
- `POST /api/runcrew/create`
- Body: `{ name: string, joinCode: string }`
- Auth: Firebase token (adminId from token)
- Returns: `{ success: true, runCrew: RunCrew }`

**Get RunCrew Details**
- `GET /api/runcrew/:id`
- Auth: Firebase token
- Returns: `{ runCrew: RunCrew, members: Athlete[], admin: Athlete }`

**Join RunCrew**
- `POST /api/runcrew/join`
- Body: `{ joinCode: string }`
- Auth: Firebase token (athleteId from token)
- Returns: `{ success: true, membership: RunCrewMembership }`

**Leave RunCrew**
- `DELETE /api/runcrew/:id/leave`
- Auth: Firebase token
- Returns: `{ success: true }`

**Get My RunCrews**
- `GET /api/runcrew/mine`
- Auth: Firebase token
- Returns: `{ runCrews: RunCrew[] }` (all crews athlete belongs to)
- Implementation: Query `RunCrewMembership` where `athleteId = athleteId` and include `runCrew`

### Membership Management

**Get RunCrew Members**
- `GET /api/runcrew/:id/members`
- Auth: Firebase token
- Returns: `{ members: Athlete[], admin: Athlete }`
- Implementation: Query `RunCrewMembership` where `runCrewId = :id` and include athlete

**Leave RunCrew**
- `DELETE /api/runcrew/:id/leave` or `PUT /api/runcrew/leave`
- Auth: Firebase token
- Body: `{ athleteId: string }`
- Deletes: `RunCrewMembership` record where `runCrewId = :id` and `athleteId = athleteId`
- Returns: `{ success: true }`

**Remove Member** (Admin only)
- `DELETE /api/runcrew/:id/members/:athleteId`
- Auth: Firebase token (must be admin)
- Deletes: `RunCrewMembership` record where `runCrewId = :id` and `athleteId = :athleteId`
- Returns: `{ success: true }`

## Business Logic

### Join Code Validation
- Must be unique across all RunCrews
- Validation on creation: Check if `joinCode` already exists
- Case-insensitive comparison recommended
- Suggested format: Alphanumeric, 4-12 characters

### Membership Rules
- **Multiple crews per athlete**: Athlete can be in multiple RunCrews (via junction table)
- Athlete cannot join same RunCrew twice (enforced by `@@unique([runCrewId, athleteId])`)
- Admin is automatically added as a member (create `RunCrewMembership` on crew creation)
- When athlete leaves, delete `RunCrewMembership` record
- When admin removes member, delete `RunCrewMembership` record
- **Athlete is source of truth**: Query `athlete.runCrewMemberships` to get all crews

### Access Control
- **View RunCrew**: Must be a member or admin
- **Update RunCrew**: Admin only
- **Delete RunCrew**: Admin only
- **Join RunCrew**: Any authenticated athlete (if joinCode is valid)
- **Leave RunCrew**: Member themselves
- **Remove Member**: Admin only

## Frontend Integration

### Frontend Pages (Demo Repo)

**Location**: `gofastfrontend-demo/src/Pages/RunCrew/`

#### Onboarding Flow (6 pages)
1. **`CrewExplainer.jsx`** - `/crew-explainer`
   - Purpose: Explains what RunCrews are and why to join
   - Intent: Onboarding/education page
   - Status: Built

2. **`JoinOrStartCrew.jsx`** - `/join-or-start-crew`
   - Purpose: Decision point - join existing or start new
   - Intent: Entry point for RunCrew feature
   - Status: Built

3. **`StartRunCrew.jsx`** - `/start-run-crew`
   - Purpose: Entry point for starting a crew
   - Intent: Create flow initiation
   - Status: Built

4. **`FormRunCrew.jsx`** - `/form-run-crew`
   - Purpose: Form to create a new RunCrew (name, code, description, logo)
   - Intent: Primary create crew form
   - Status: Built (has mock data for demo)

5. **`CreateCrew.jsx`** - `/create-crew`
   - Purpose: Alternative create crew page
   - Intent: Alternative create flow
   - Status: Built (basic scaffold)

6. **`RunCrewSuccess.jsx`** - `/run-crew-success`
   - Purpose: Success page after creating crew
   - Intent: Confirmation with share code instructions
   - Status: Built

#### Join Flow (2 pages)
7. **`RunCrewJoin.jsx`** - `/run-crew-join`
   - Purpose: Join an existing crew by entering join code
   - Intent: Primary join interface
   - Status: Built (has demo mode)

8. **`JoinCrew.jsx`** - `/join-crew`
   - Purpose: Alternative join page
   - Intent: Alternative join interface
   - Status: Built

#### Crew Views (4 pages)
9. **`CrewDashboard.jsx`** - `/crew-dashboard`
   - Purpose: Main crew dashboard with members, leaderboard, stats
   - Intent: Central hub for crew management and viewing
   - Status: Built (has mock data)

10. **`RunCrewHome.jsx`** - `/runcrew-home`
    - Purpose: Crew home/chat view
    - Intent: Placeholder for forum/chat feature
    - Status: Scaffolded (needs implementation)

11. **`RunCrewMembers.jsx`** - `/runcrew-members`
    - Purpose: View list of crew members
    - Intent: Members list view
    - Status: Built

12. **`RunCrewMembershipManage.jsx`** - `/runcrew-membership-manage`
    - Purpose: Manage crew memberships (leave, remove)
    - Intent: Membership management interface
    - Status: Built

#### Demo Navigation
13. **`RunCrewDemoNav.jsx`** - `/runcrew-demo-nav`
    - Purpose: Central navigation hub to view all RunCrew pages
    - Intent: Quick access to all pages for demo/testing
    - Status: Built (comprehensive navigation)

### Data Flow

1. **Create Crew Flow**:
   - User clicks "Start Your Crew" → `CrewExplainer.jsx` or `JoinOrStartCrew.jsx`
   - Navigates to `StartRunCrew.jsx` or `FormRunCrew.jsx`
   - Enters name and joinCode (optional: description, logo)
   - `POST /api/runcrew/create`
   - Redirects to `RunCrewSuccess.jsx` → `CrewDashboard.jsx`

2. **Join Crew Flow**:
   - User clicks "Join Crew" → `JoinOrStartCrew.jsx` or `RunCrewJoin.jsx`
   - Enters joinCode
   - `POST /api/runcrew/join`
   - Redirects to `CrewDashboard.jsx` or `RunCrewHome.jsx`

3. **Display Crew Status**:
   - `AthleteHome.jsx` checks if athlete has any active memberships
   - If no memberships: Show "Join RunCrew" card
   - If has memberships: Show "RunCrew Dashboard" card

### Demo Mode
- Many pages include demo mode with mock data
- Allows navigation through flows without backend connection
- Pre-filled forms (e.g., `FormRunCrew.jsx` has `FAST123` code pre-filled)

## Core Features

### Forum/Posts (Banter & Community)
- **Posts**: Text + optional images per crew
- **Comments**: Threaded replies on posts
- **Likes**: Engagement metrics
- **Purpose**: Create banter, motivation, and community within crew
- **Access**: Members only (crew-specific)

### Leaderboards (Competition)
- **Multiple Periods**: Weekly, monthly, all-time
- **Metrics**: Total miles, runs, best pace, calories, elevation
- **Data Source**: Aggregated from `AthleteActivity` (Garmin/Strava)
- **Purpose**: Friendly competition and motivation
- **Updates**: Calculated periodically from member activities

### Crew Management
- **Description**: Optional crew motto/description
- **Logo**: Optional branding/image
- **Archive**: Soft delete (preserve data)
- **Member Count**: Derived from `memberships` count

## Future Enhancements

- **Events**: Schedule runs within a crew
- **Activity Sharing**: Share specific Garmin activities with crew
- **Notifications**: Alert crew members of activities/posts
- **Admin Transfer**: Transfer admin role to another member
- **Crew Analytics**: Advanced stats and insights
- **Reactions**: Emoji reactions beyond likes
- **Mentions**: @mention members in posts

## Questions to Resolve

1. **Admin as Member**: Should admin automatically be a member, or separate admin role?
   - **Decision**: Admin is automatically a member (upsert membership on create)

2. **Multiple Admins**: Can a RunCrew have multiple admins?
   - **Decision**: Single admin for MVP, add co-admins later if needed

3. **Join Code Format**: Any restrictions on join code format?
   - **Decision**: Alphanumeric, 4-12 chars, case-insensitive, unique constraint

4. **Member Limit**: Maximum members per crew?
   - **Decision**: No limit for MVP, add later if needed

5. **Deleted Crews**: Soft delete or hard delete?
   - **Decision**: Soft delete (archive) - `isArchived` flag preserves data

## Migration Notes

- **Junction table**: `RunCrewMembership` enables many-to-many relationship
- New tables: `run_crews`, `run_crew_memberships`
- **Athlete can be in multiple crews**: Query memberships via `athlete.runCrewMemberships`
- Unique constraint prevents duplicate memberships: `@@unique([runCrewId, athleteId])`

