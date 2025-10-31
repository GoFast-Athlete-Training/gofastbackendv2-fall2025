# RunCrew Architecture

## Conceptual Analysis

### Premise & Vision
RunCrew is an **early beta for group management** - a "club-lite" solution that allows users to join up and form small running groups. This serves as a stepping stone leading downstream to more complex management with **RunClubs** (larger, organized clubs).

**Key Philosophy**: RunCrew should be more **club-lite than just dudes with leader scores**. It's about building community, coordination, and group unity - not just competition.

### Split Concerns: Joiners vs Creators

The RunCrew system is architected around two distinct user roles:

#### **Creators (Full Admins)**
- Can create RunCrews
- Full administrative control
- Can delegate other admins (multi-admin support)
- Manage crew settings, broadcast messages, remove members
- Access to RunCrew Settings page

#### **Joiners (Members)**
- Join existing crews via invite code
- Participate in crew activities (feed, leaderboard, events)
- Can leave crew (self-removal)
- Limited management capabilities (member-level only)

**Fork Architecture**: Admins can delegate admin privileges to other members, enabling multi-admin management for active crews.

### Core Value Proposition
RunCrew succeeds through **group unity** features, not just leaderboards:
- **Banter & Community**: Forum/posts for motivation and fun
- **Coordination**: Run times, events, scheduling
- **Engagement**: Polls, messages, shared experiences
- **Competition**: Leaderboards (supporting feature, not primary)

This balance ensures RunCrew feels like a community hub, not just a stat tracker.

---

## Overview
RunCrew is a feature that allows athletes to create and join small running groups for accountability and coordination. This is different from RunClubs (larger, organized clubs) - RunCrews are more intimate, like "Life360 circles for runners."

**Key Differentiator**: RunCrews need **banter and fun** - not just leaderboards. Features include:
- **Forum/Posts**: Text + images for crew banter and motivation
- **Leaderboards**: Weekly/monthly/all-time stats from aggregated activities
- **Description & Logo/Icon**: Crew branding and identity (icon option so users don't need to find pictures)
- **Archive**: Soft delete for preserving data
- **Member Count**: Real-time count from junction table
- **Group Unity Tools**: Run times, messages, polls (MVP planning)

---

## RunCrew Container - What's Inside

### Core Fields
- `name`: Display name (e.g., "Morning Warriors")
- `description`: Optional motto/description (e.g., "5am grind, every day")
- `logo`: Optional image URL for crew branding
- `icon`: Optional emoji/icon string (alternative to logo - simpler option)
- `joinCode`: Unique invite code (case-insensitive, uppercase stored)

### Status & Lifecycle
- `isArchived`: Boolean flag for soft delete
- `archivedAt`: Timestamp when archived (preserves data)
- `createdAt` / `updatedAt`: Standard timestamps

### Derived Data
- **Member Count**: Query `memberships.count` (real-time from junction table)
- **Admin**: Single creator admin + delegated admins (via `RunCrewAdmin` junction table)

### Related Data (Relations)
- **Memberships**: Junction table entries (many-to-many)
- **Posts**: Forum/banter posts
- **Leaderboards**: Aggregated stats for competition
- **Admins**: Multiple admins via delegation (planned)

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
  runcrewAdminId  String   // Athlete ID of the creator/admin
  
  // Status & Archive
  isArchived      Boolean  @default(false) // Soft delete - archive crew instead of deleting
  archivedAt      DateTime? // When crew was archived
  
  // System fields
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  admin     Athlete  @relation("RunCrewAdmin") // Creator admin
  memberships RunCrewMembership[] // Junction table for members
  posts     RunCrewPost[] // Forum posts/banter
  leaderboardEntries RunCrewLeaderboard[] // Leaderboard stats
  // Future: delegatedAdmins RunCrewAdmin[] // Multi-admin support
}
```

**Key Fields:**
- `id`: Unique identifier (cuid)
- `name`: Display name of the crew
- `description`: Optional crew description/motto (e.g., "Morning Warriors - 5am grind")
- `joinCode`: Unique invite code (user-created, validated for uniqueness)
- `logo`: Optional logo/image URL for crew branding
- `icon`: Optional emoji/icon string (simpler alternative to logo upload)
- `runcrewAdminId`: Foreign key to Athlete who created the crew (creator admin)
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

### Future: RunCrewAdmin Model (Multi-Admin Support)
**Table**: `run_crew_admins` (planned)

```prisma
model RunCrewAdmin {
  id        String   @id @default(cuid())
  runCrewId String
  athleteId String
  isCreator Boolean  @default(false) // True for original creator
  delegatedAt DateTime? // When admin was delegated (null for creator)
  
  // Relations
  runCrew   RunCrew  @relation(...)
  athlete   Athlete  @relation(...)
  
  @@unique([runCrewId, athleteId]) // Prevent duplicate admin entries
}
```

**Purpose**: Enable multi-admin management
- Creator automatically gets admin entry with `isCreator: true`
- Creator can delegate admin privileges to other members
- All admins have same permissions (manage crew, broadcast, remove members)

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
  adminRunCrews RunCrew[] @relation("RunCrewAdmin") // Crews this athlete created/admin
  runCrewMemberships RunCrewMembership[] // All crew memberships (junction table)
  runCrewPosts RunCrewPost[] // Posts authored by this athlete
  runCrewPostComments RunCrewPostComment[] // Comments authored by this athlete
  runCrewLeaderboards RunCrewLeaderboard[] // Leaderboard entries for this athlete
  // Future: runCrewAdmins RunCrewAdmin[] // Admin roles (when delegated)
}
```

---

## Relationships

### One-to-Many: RunCrew → Creator Admin (Athlete)
- Each RunCrew has **one** creator admin (who created it)
- An Athlete can be creator of **multiple** RunCrews
- Relationship: `RunCrew.runcrewAdminId → Athlete.id`

### Future: Many-to-Many: RunCrew ↔ Admin (Athlete) via RunCrewAdmin
- Each RunCrew can have **multiple** admins (via delegation)
- Each Athlete can be admin of **multiple** RunCrews
- Junction table: `RunCrewAdmin`
- Relationship: `RunCrewAdmin.runCrewId → RunCrew.id` and `RunCrewAdmin.athleteId → Athlete.id`

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

**Total**: 10 RunCrew pages (cleaned up from 14, removed duplicates)

#### 1. Onboarding Flow (5 pages)

##### 1.1 Crew Explainer (`/crew-explainer`)
- **File**: `CrewExplainer.jsx`
- **Purpose**: Educational page explaining what RunCrews are
- **Content**: Benefits, use cases, social proof
- **Actions**: 
  - "Start Your Own Crew" → `/form-run-crew`
  - "Join an Existing Crew" → `/run-crew-join`
- **Status**: ✅ Built

##### 1.2 Join or Start Crew - No Explainer (`/join-or-start-crew`)
- **File**: `JoinOrStartCrewNoExplainer.jsx`
- **Purpose**: Decision point for users (without explainer context)
- **Note**: Potentially deprecated in demo/MVP since it doesn't include explainer
- **Use Case**: Useful if explainer is on HTML landing page and this leads into UX fork
- **Flow**:
  - User chooses: "Join Crew" OR "Start Crew"
  - Join → `/run-crew-join`
  - Start → `/form-run-crew`
- **Status**: ✅ Built (kept for potential HTML landing page integration)

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
  - Logo upload (optional) OR Icon picker (10 icon options)
- **Demo Mode**: Pre-filled with `FAST123` for easy navigation
- **On Submit**:
  - `POST /api/runcrew/create` (or skip in demo mode)
  - Store crew data in localStorage
  - Navigate to `/run-crew-success`
- **Status**: ✅ Built (has demo mode, icon picker added)

##### 1.5 RunCrew Success (`/run-crew-success`)
- **File**: `RunCrewSuccess.jsx`
- **Purpose**: Confirmation page after creating crew
- **Content**:
  - Success message
  - Join code display (copyable)
  - Share instructions
  - "Go to Run Crew Central" button
- **Actions**: 
  - Copy code to clipboard
  - Share via message
  - Navigate to `/runcrew-central`
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
  - Navigate to `/run-crew-join-success`
- **Status**: ✅ Built (has demo mode)

##### 2.2 Join Success (`/run-crew-join-success`)
- **File**: `RunCrewJoinSuccess.jsx`
- **Purpose**: Confirmation page after joining crew
- **Content**: Success message, next steps, navigation to Central
- **Status**: ✅ Built

#### 3. Crew Views (3 pages)

##### 3.1 Run Crew Central (`/runcrew-central`)
- **File**: `RunCrewCentral.jsx`
- **Purpose**: **Main crew experience hub** (not a management dashboard)
- **Philosophy**: This is the shared space where crew members experience community, not manage settings
- **Tabs for Group Unity**:
  - **Feed (Posts & Messages)**: Forum/banter placeholders (MVP planning)
  - **Members**: View crew members list
  - **Leaderboard**: Weekly/monthly/all-time stats
  - **Run Times & Events**: Schedule group runs, coordinate meetups (MVP planning)
- **Content**:
  - Crew header (name, logo/icon, member count)
  - Tabbed interface for group unity features
  - Share crew code section
- **Navigation**:
  - "Return to Athlete Home" (not "Dashboard" - lives inside athlete experience)
  - "Crew Settings" button (admin only)
- **Removed**: Personal stats section (this is shared space, not personal dashboard)
- **Status**: ✅ Built (refactored from CrewDashboard)

##### 3.2 RunCrew Settings (`/runcrew-settings`)
- **File**: `RunCrewSettings.jsx`
- **Purpose**: Admin-only settings page for crew management
- **Access**: Only visible to admins (creator + delegated admins)
- **Tabs**:
  - **General**: Crew info, description, join code, broadcast messages
  - **Admins**: View/manage admins, delegate admin privileges
  - **Members**: View/manage members, remove members
- **Features**:
  - Delegate admins (promote members to admin)
  - Broadcast messages to all crew members
  - Regenerate join code
  - Remove members (admin action)
- **Status**: ✅ Built

##### 3.3 Membership Manage (`/runcrew-membership-manage`)
- **File**: `RunCrewMembershipManage.jsx`
- **Purpose**: Manage crew memberships (could be integrated as admin card in Settings)
- **Actions**:
  - Leave crew (for members)
  - Remove member (for admin)
  - View membership details
- **Status**: ✅ Built (consider moving to Settings as admin card)

#### 4. Demo Navigation

##### 4.1 RunCrew Demo Nav (`/runcrew-demo-nav`)
- **File**: `RunCrewDemoNav.jsx`
- **Purpose**: Central navigation hub for all RunCrew pages
- **Content**: Organized by category with descriptions and paths
- **Status**: ✅ Built (updated to reflect cleanup)

---

## Complete User Flows

### Flow 1: Create a RunCrew (Creator Path)

**Entry Points:**
- `Connect.jsx` → "Start a Run Crew" button
- `AthleteHome.jsx` → "Start Your Crew" card (if no memberships)

**Flow Steps:**
1. User clicks "Start a Run Crew"
2. Navigate to `/crew-explainer` (optional education)
3. Navigate to `/form-run-crew`
4. User fills form:
   - Crew Name: "Morning Warriors"
   - Join Code: "FAST123" (validated for uniqueness)
   - Description: "5am grind, every day" (optional)
   - Logo: Upload image (optional) OR Icon: Choose from 10 emoji options
5. Submit form → `POST /api/runcrew/create`
   - Backend creates `RunCrew` record
   - Backend creates `RunCrewMembership` for creator (creator is member)
   - Backend creates `RunCrewAdmin` entry for creator (with `isCreator: true`)
   - Returns hydrated crew with members
6. Navigate to `/run-crew-success`
7. User sees success message and join code
8. User can:
    - Copy code to clipboard
    - Share via message
    - Navigate to `/runcrew-central`

**Data Flow:**
```
Frontend → POST /api/runcrew/create
{
  name: "Morning Warriors",
  joinCode: "FAST123",
  description: "5am grind, every day",
  logo: "https://..." OR icon: "🔥",
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

### Flow 2: Join a RunCrew (Joiner Path)

**Entry Points:**
- `Connect.jsx` → "Join a Run Crew" button
- `CrewExplainer.jsx` → "Join an Existing Crew"
- Direct link with code: `/run-crew-join?code=FAST123`

**Flow Steps:**
1. User navigates to `/crew-explainer` or `/run-crew-join`
2. User enters join code (e.g., "FAST123")
3. Submit → `POST /api/runcrew/join`
   - Backend finds RunCrew by joinCode
   - Backend checks if athlete already a member
   - Backend creates `RunCrewMembership`
   - Returns hydrated crew with members
4. Navigate to `/run-crew-join-success`
5. Navigate to `/runcrew-central`

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
Frontend navigates to success page, then central
```

### Flow 3: Experience Crew (Central Hub)

**Entry Points:**
- `AthleteHome.jsx` → "My Crew" card (if has memberships)
- Direct navigation to `/runcrew-central`

**Flow Steps:**
1. User navigates to `/runcrew-central`
2. Frontend calls `GET /api/runcrew/mine` (get all crews user belongs to)
   - OR `GET /api/runcrew/:id` (get specific crew)
3. Display:
   - Crew info (name, description, logo/icon)
   - Tabbed interface:
     - **Feed**: Posts and messages (MVP placeholder)
     - **Members**: Member list with stats
     - **Leaderboard**: Weekly/monthly/all-time competition
     - **Events**: Run times and scheduling (MVP placeholder)
4. User can:
   - View feed/posts (when implemented)
   - View members → Members tab
   - View leaderboard → Leaderboard tab
   - Schedule runs → Events tab (when implemented)
   - Navigate to settings (if admin) → `/runcrew-settings`

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
Frontend renders Run Crew Central with tabs
```

### Flow 4: Admin Management (Creator/Delegated Admin)

**Entry Points:**
- `/runcrew-central` → "Crew Settings" button (admin only)

**Flow Steps:**
1. Admin navigates to `/runcrew-settings`
2. Frontend calls `GET /api/runcrew/:id` (verify admin status)
3. Display tabs:
   - **General**: Crew info, broadcast messages
   - **Admins**: Current admins list, delegate new admin
   - **Members**: Member list, remove members
4. Admin actions:
   - Delegate admin: Select member → `POST /api/runcrew/:id/delegate-admin`
   - Broadcast message: `POST /api/runcrew/:id/broadcast`
   - Remove member: `DELETE /api/runcrew/:id/members/:athleteId`
   - Regenerate join code: `PUT /api/runcrew/:id/regenerate-code`

---

## API Endpoints

### Implemented

**Create RunCrew** ✅
- `POST /api/runcrew/create`
- Body: `{ name: string, joinCode: string, description?: string, logo?: string, icon?: string, athleteId: string }`
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
- Returns: `{ runCrew: RunCrew, members: Athlete[], admin: Athlete, posts: RunCrewPost[], leaderboard: RunCrewLeaderboard[] }`

**Get My RunCrews**
- `GET /api/runcrew/mine`
- Auth: Firebase token
- Returns: `{ runCrews: RunCrew[] }`
- Implementation: Query `RunCrewMembership` where `athleteId = athleteId` and include `runCrew`

**Leave RunCrew**
- `DELETE /api/runcrew/:id/leave` or `PUT /api/runcrew/leave`
- Auth: Firebase token
- Body: `{ athleteId: string }`
- Deletes: `RunCrewMembership` record

**Remove Member** (Admin only)
- `DELETE /api/runcrew/:id/members/:athleteId`
- Auth: Firebase token (must be admin)
- Deletes: `RunCrewMembership` record

**Delegate Admin** (Creator/Admin only)
- `POST /api/runcrew/:id/delegate-admin`
- Auth: Firebase token (must be creator or admin)
- Body: `{ athleteId: string }`
- Creates: `RunCrewAdmin` entry (or updates existing)

**Broadcast Message** (Admin only)
- `POST /api/runcrew/:id/broadcast`
- Auth: Firebase token (must be admin)
- Body: `{ message: string }`
- Sends: Notification/message to all crew members

**Regenerate Join Code** (Admin only)
- `PUT /api/runcrew/:id/regenerate-code`
- Auth: Firebase token (must be admin)
- Updates: `joinCode` with new unique code

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
- Creator is automatically added as a member (create `RunCrewMembership` on crew creation)
- Creator is automatically an admin (create `RunCrewAdmin` entry with `isCreator: true`)
- When athlete leaves, delete `RunCrewMembership` record
- When admin removes member, delete `RunCrewMembership` record
- **Athlete is source of truth**: Query `athlete.runCrewMemberships` to get all crews

### Admin Rules
- **Creator**: Original creator has full admin privileges
- **Delegation**: Creator can delegate admin privileges to other members
- **Multi-Admin**: Multiple admins can manage a crew (via `RunCrewAdmin` junction table)
- **Permissions**: All admins have same permissions (manage crew, broadcast, remove members)
- **Delegation**: Only creator/admins can delegate admin privileges

### Access Control
- **View RunCrew**: Must be a member or admin
- **Update RunCrew**: Admin only (name, description, logo/icon)
- **Archive RunCrew**: Admin only
- **Join RunCrew**: Any authenticated athlete (if joinCode is valid)
- **Leave RunCrew**: Member themselves
- **Remove Member**: Admin only
- **Create Posts**: Members only
- **View Posts**: Members only
- **Delegate Admin**: Creator/Admin only
- **Broadcast Message**: Admin only
- **Access Settings**: Admin only

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

## Group Unity Features (MVP Planning)

### Run Crew Central Tabs

#### Feed (Posts & Messages) - Planned
- **Posts**: Text + optional images per crew
- **Comments**: Threaded replies on posts
- **Likes**: Engagement metrics
- **Purpose**: Create banter, motivation, and community within crew
- **Access**: Members only (crew-specific)
- **MVP Status**: Placeholder in Central, full implementation planned

#### Run Times & Events - Planned
- **Schedule Runs**: Admin/members can create run events
- **RSVP System**: Members can confirm/pending/decline
- **Location Sharing**: Coordinate meetup spots
- **Recurring Events**: Weekly runs, monthly challenges
- **Purpose**: Coordinate group activities and build accountability
- **MVP Status**: Placeholder in Central, full implementation planned

#### Leaderboard - Current
- **Multiple Periods**: Weekly, monthly, all-time
- **Metrics**: Total miles, runs, best pace, calories, elevation
- **Data Source**: Aggregated from `AthleteActivity` (Garmin/Strava)
- **Purpose**: Friendly competition and motivation
- **Updates**: Calculated periodically from member activities
- **Display**: Fully functional in Central

#### Members - Current
- **Member List**: View all crew members with stats
- **Member Profiles**: Click to view individual member details
- **Member Stats**: See each member's contribution to crew
- **Purpose**: Build community and recognize members
- **Display**: Fully functional in Central

---

## Future Enhancements

- **Polls**: Create polls for crew decisions (what time to run, where to meet, etc.)
- **Notifications**: Alert crew members of activities/posts/events
- **Activity Sharing**: Share specific Garmin activities with crew
- **Admin Transfer**: Transfer creator role to another admin
- **Crew Analytics**: Advanced stats and insights
- **Reactions**: Emoji reactions beyond likes
- **Mentions**: @mention members in posts
- **Invite Links**: Generate shareable invite links (alternative to codes)
- **Crew Challenges**: Create crew-wide challenges and goals

---

## Decisions & Questions Resolved

1. **Admin as Member**: Creator is automatically a member (upsert membership on create)
2. **Multiple Admins**: Multi-admin support via `RunCrewAdmin` junction table (planned)
3. **Join Code Format**: Alphanumeric, 4-12 chars, case-insensitive, unique constraint
4. **Member Limit**: No limit for MVP, add later if needed
5. **Deleted Crews**: Soft delete (archive) - `isArchived` flag preserves data
6. **RunClub Separation**: RunClub is a separate feature with its own architecture
7. **Icon vs Logo**: Support both - icon picker for simplicity, logo upload for customization
8. **Central vs Dashboard**: Run Crew Central is experience hub (shared space), not management dashboard
9. **Personal Stats**: Removed from Central - this is shared space, personal stats belong in Athlete Home
10. **Admin Delegation**: Yes - creator can delegate admin privileges (planned feature)

---

## Migration Notes

- **Junction table**: `RunCrewMembership` enables many-to-many relationship
- New tables: `run_crews`, `run_crew_memberships`
- **Athlete can be in multiple crews**: Query memberships via `athlete.runCrewMemberships`
- Unique constraint prevents duplicate memberships: `@@unique([runCrewId, athleteId])`
- Future tables: `run_crew_posts`, `run_crew_post_comments`, `run_crew_leaderboards`, `run_crew_admins` (schema ready, implementation planned)
- **Icon field**: Added to `RunCrew` model for simpler branding option

---

## Testing & Demo

### Demo Navigation
- **URL**: `/runcrew-demo-nav`
- **Purpose**: Quick access to all 10 RunCrew pages
- **Organization**: By category (Onboarding, Join Flow, Crew Views)
- **Use Case**: UX review, testing flows, architecture reference

### Demo Mode
- Pre-filled forms for quick navigation
- Skips API calls when `athleteId` not in localStorage
- Mock data in `RunCrewCentral` for visual testing
- Allows full flow testing without backend connection
