# GoFast Navigation Flow / User Experience

## Overview

This document outlines the complete user navigation flow for GoFast, focusing on **Phase 1: RunCrew** functionality. The flow is designed to guide runners through onboarding and into the core RunCrew experience.

**Primary Flows:**
1. **New users (onboarding)**: Signin → Profile Setup → Athlete Home → Create/Join RunCrew → RunCrew Central
2. **Returning users (perfect scenario)**: Signin → Athlete Home → RunCrew Central
3. **RunCrew creation**: Athlete Home → Crew Explainer → Create Form → Success → RunCrew Central
4. **RunCrew joining**: Athlete Home → Crew Explainer → Join Form → Success → RunCrew Central

**Athlete Home is home base** - Once fully set up, users always return to Athlete Home, which provides access to all RunCrews and features.

**Reference**: See `GoFastDevOverview.md` for technical stack details and `RunCrewArchitecture.md` for complete RunCrew implementation.

---

## Entry Point: Splash Page

### Route: `/` (Splash)

**Purpose**: Branding + Authentication Check

**What happens:**
1. Displays branding (GoFast logo, tagline)
2. Shows splash screen briefly
3. Checks for Firebase tokens stored locally
4. Routes based on auth state:
   - **If tokens exist** → Route to `/athlete-home` ⬅️ **PRIMARY FLOW**
   - **If no tokens** → Route to `/athletesignin` ⬅️ **PRIMARY FLOW**

**Key Points:**
- Splash page is the starting point for all users
- Firebase SDK automatically checks for tokens in browser storage
- No API calls at this stage - purely client-side auth check
- Branding-focused experience

---

## Authentication Flow

### Signin (`/athletesignin`) - PRIMARY FLOW

**Purpose**: User authentication (primary path for users without tokens)

**What happens:**
1. User signs in with Firebase (Google OAuth)
2. Frontend calls `POST /api/athlete/create` with Firebase ID
3. Backend finds/creates Athlete record
4. Frontend stores in localStorage:
   - `firebaseId`
   - `athleteId` (Athlete record ID)
   - `firebaseToken` (ID token for API calls)
   - `email`, `firstName`, `lastName`, etc.

**Routing:**
- Success → `/athlete-create-profile` (if profile incomplete) or `/athlete-home` (if complete)

**Key Points:**
- Signin is the starting point for all users
- Firebase handles authentication
- Backend creates/finds athlete automatically
- Routing based on profile completeness

---

## Onboarding Flow

### Profile Setup (`/athlete-create-profile`)

**Why we're here:**
- Athlete record exists but profile is incomplete (missing firstName, lastName, etc.)
- Need to collect runner's personal info

**What happens:**
1. User fills in profile form:
   - First Name (required)
   - Last Name (required)
   - Birthday (optional)
   - Gender (optional)
   - City, State (optional)
   - Primary Sport (optional)
   - Bio (optional)
   - Instagram (optional)
2. Frontend calls `PUT /api/athlete/:id` to update profile
3. Stores updated data in localStorage

**Routing:**
- Success → `/athlete-home` (home base)

**Key Fields:**
- `firstName`, `lastName` - Required for profile completion
- `gofastHandle` - Optional unique handle (@username)
- `photoURL` - Can upload profile picture
- Other fields are optional but enhance profile

---

## Home Base: Athlete Home

### Route: `/athlete-home` - PRIMARY FLOW (Returning Users)

**Purpose**: Main hub for all athlete features - home base for returning users

**Perfect Scenario (Returning Users):**
- User has complete profile → Signin routes directly to Athlete Home
- Athlete Home displays all RunCrews and quick actions
- **Athlete Home is home base** - all returning users land here

**What happens:**
1. On load, calls `GET /api/athlete/:id/hydrate` (or uses cached localStorage data)
2. Displays:
   - Profile summary (name, photo, stats)
   - **My RunCrews** section (if has memberships)
   - **Quick Actions**:
     - "Start Your Crew" (if no memberships)
     - "Join a Crew" (always available)
     - "View My Activities" (if Garmin connected)
     - "Link Garmin" (if not connected)
3. Lists all RunCrews user belongs to (from `runCrewMemberships`)

**RunCrew Cards Display:**
- Crew name, logo/icon
- Member count
- Last activity (if available)
- "View Crew" button → Navigate to `/runcrew-central/:crewId`

**Routing Options:**
- **If no RunCrews**: Shows "Start Your Crew" card → `/crew-explainer` or `/form-run-crew`
- **If has RunCrews**: Shows "My Crews" list → Click crew → `/runcrew-central/:crewId`
- **Always available**: "Join a Crew" button → `/run-crew-join`

**Key Points:**
- Athlete Home is the central hub (like Events CRM Welcome page)
- **Perfect scenario**: Complete profile → Direct to Athlete Home
- **Onboarding needed**: Routes to Profile Setup if incomplete
- Displays all user's RunCrews for quick access
- Provides quick actions for common tasks

---

## RunCrew Creation Flow

### Entry Points
- `AthleteHome.jsx` → "Start Your Crew" card (if no memberships)
- `Connect.jsx` → "Start a Run Crew" button
- Direct navigation to `/crew-explainer` or `/form-run-crew`

### Flow Steps

#### 1. Crew Explainer (`/crew-explainer`) - Optional
**Purpose**: Educational page explaining what RunCrews are

**Content**:
- Benefits of RunCrews
- Use cases and examples
- Social proof

**Actions**:
- "Start Your Own Crew" → `/form-run-crew`
- "Join an Existing Crew" → `/run-crew-join`
- "Back to Home" → `/athlete-home`

**Status**: ✅ Built (optional - can skip to form)

---

#### 2. Create Crew Form (`/form-run-crew`)
**Purpose**: Primary form for creating a RunCrew

**Fields**:
- Crew Name (required) - e.g., "Morning Warriors"
- Join Code (required, unique) - e.g., "FAST123"
- Description (optional) - e.g., "5am grind, every day"
- Logo upload (optional) OR Icon picker (10 emoji options)

**On Submit**:
1. Frontend calls `POST /api/runcrew/create` with:
   ```json
   {
     "name": "Morning Warriors",
     "joinCode": "FAST123",
     "description": "5am grind, every day",
     "icon": "🔥",
     "athleteId": "athlete-id-from-localStorage"
   }
   ```
2. Backend:
   - Validates joinCode uniqueness
   - Creates RunCrew record
   - Auto-creates RunCrewMembership for creator (creator is member)
   - Returns hydrated crew with admin and members
3. Frontend stores crew data in localStorage
4. Navigate to `/run-crew-success`

**Validation**:
- Join code must be unique (checked by backend)
- Join code format: Alphanumeric, 4-12 characters, case-insensitive
- Name is required

**Status**: ✅ Built (has demo mode, icon picker added)

---

#### 3. RunCrew Success (`/run-crew-success`)
**Purpose**: Confirmation page after creating crew

**Content**:
- Success message
- Crew name and details
- Join code display (copyable)
- Share instructions
- "Go to Run Crew Central" button

**Actions**:
- Copy code to clipboard
- Share via message (if available)
- Navigate to `/runcrew-central/:crewId` → RunCrew Central

**Status**: ✅ Built

---

## RunCrew Join Flow

### Entry Points
- `AthleteHome.jsx` → "Join a Crew" button (always available)
- `Connect.jsx` → "Join a Run Crew" button
- `CrewExplainer.jsx` → "Join an Existing Crew"
- Direct link with code: `/run-crew-join?code=FAST123`

### Flow Steps

#### 1. RunCrew Join (`/run-crew-join`)
**Purpose**: Primary interface for joining a crew

**Fields**:
- Join code input (e.g., "FAST123")
- Can accept query param: `?code=FAST123` (pre-fills input)

**On Submit**:
1. Frontend calls `POST /api/runcrew/join` with:
   ```json
   {
     "joinCode": "FAST123",
     "athleteId": "athlete-id-from-localStorage"
   }
   ```
2. Backend:
   - Normalizes joinCode (uppercase)
   - Finds RunCrew by joinCode
   - Checks if athlete already a member (prevents duplicates)
   - Creates RunCrewMembership via junction table
   - Returns hydrated crew with members
3. Navigate to `/run-crew-join-success`

**Validation**:
- Join code must exist (checked by backend)
- Athlete cannot join same crew twice (enforced by unique constraint)
- Returns 409 if already a member

**Status**: ✅ Built (has demo mode)

---

#### 2. Join Success (`/run-crew-join-success`)
**Purpose**: Confirmation page after joining crew

**Content**:
- Success message
- Crew name and details
- Member count
- "Go to Run Crew Central" button

**Actions**:
- Navigate to `/runcrew-central/:crewId` → RunCrew Central
- "Return to Home" → `/athlete-home`

**Status**: ✅ Built

---

## RunCrew Central (Main Experience Hub)

### Route: `/runcrew-central` (or `/runcrew-central/:crewId` if crew ID passed)

**Purpose**: **Main crew experience hub** (not a management dashboard) - the shared space where crew members experience community

**Philosophy**: This is the shared space where crew members experience community, not manage settings. Personal stats belong in Athlete Home.

**What happens:**
1. On load, calls `GET /api/runcrew/:crewId` with Firebase token
2. Backend returns fully hydrated crew:
   - Crew info (name, description, logo/icon, joinCode)
   - Admin (creator info)
   - Members (all members with athlete details)
   - Posts (most recent 20 posts with comments)
   - Leaderboard entries (weekly/monthly/all-time)
3. Frontend displays tabbed interface

**Tabs for Group Unity:**

#### Feed Tab (Posts & Messages)
- **Purpose**: Forum/banter for motivation and community
- **Content**: Posts with text and optional images
- **Features**: 
  - Create post (members only)
  - View comments/replies
  - Like posts
- **Status**: 🚧 Placeholder in Central, full implementation planned

#### Members Tab
- **Purpose**: View all crew members
- **Content**: 
  - Member list with profile info
  - Member stats (contribution to crew)
  - Click to view member details
- **Status**: ✅ Fully functional

#### Leaderboard Tab
- **Purpose**: Friendly competition and motivation
- **Content**: 
  - Weekly stats (total miles, runs, best pace)
  - Monthly stats
  - All-time stats
  - Ranked by total miles
- **Data Source**: Aggregated from `AthleteActivity` (Garmin/Strava)
- **Status**: ✅ Fully functional (display ready, calculation service planned)

#### Events Tab (Run Times & Scheduling)
- **Purpose**: Coordinate group runs and meetups
- **Content**: 
  - Upcoming run events
  - RSVP system (going/maybe/not-going)
  - Event details (date, time, location, distance, pace)
- **Status**: 🚧 Placeholder in Central, full implementation planned (schema addition needed)

**Navigation:**
- "Return to Athlete Home" (not "Dashboard" - lives inside athlete experience)
- "Crew Settings" button (admin only) → `/runcrew-settings/:crewId`

**Content Display:**
- Crew header (name, logo/icon, member count)
- Share crew code section (copyable)
- Tabbed interface for group unity features

**Removed**: Personal stats section (this is shared space, not personal dashboard)

**Status**: ✅ Built (refactored from CrewDashboard)

---

## RunCrew Settings (Admin Only)

### Route: `/runcrew-settings` (crew ID from context or localStorage)

**Purpose**: Admin-only settings page for crew management

**Access**: Only visible to admins (creator + delegated admins - future feature)

**What happens:**
1. On load, calls `GET /api/runcrew/:crewId` to verify admin status
2. Checks if `runcrewAdminId === athleteId` (current user)
3. If not admin, redirects to RunCrew Central with error message

**Tabs:**

#### General Tab
- Crew info (name, description)
- Join code (display and regenerate)
- Logo/icon management
- Broadcast messages (send to all members)

#### Admins Tab (Future)
- Current admins list
- Delegate admin privileges (promote members to admin)
- Multi-admin support

#### Members Tab
- Member list
- Remove members (admin action)
- View member details

**Features:**
- Delegate admins (promote members to admin) - 🚧 Planned
- Broadcast messages to all crew members - 🚧 Planned
- Regenerate join code - 🚧 Planned
- Remove members (admin action) - 🚧 Planned

**Navigation:**
- "Back to Crew Central" → `/runcrew-central/:crewId`
- "Return to Home" → `/athlete-home`

**Status**: ✅ Built (UI complete, admin operations in progress)

---

## Activity & Settings Flow

### Garmin Connection (`/settings` or `/link-garmin`)

**Purpose**: Connect Garmin account for activity tracking

**What happens:**
1. User clicks "Link Garmin"
2. Frontend calls `GET /api/garmin/auth-url`
3. Backend generates OAuth URL
4. User redirected to Garmin OAuth
5. Garmin redirects back to `/api/garmin/callback`
6. Backend stores tokens in Athlete record
7. Frontend updates athlete data

**Routing:**
- Success → `/athlete-home` (with Garmin connected status)
- Error → `/settings` with error message

---

### Activity Feed (`/activities`)

**Purpose**: View personal activity history

**What happens:**
1. Calls `GET /api/athlete/:athleteId/activities`
2. Displays list of activities (from Garmin/Strava)
3. Shows activity details (distance, pace, time, etc.)

**Navigation:**
- "Return to Home" → `/athlete-home`

---

## Complete User Flows

### Flow 1: New User Onboarding
```
Signin → Profile Setup → Athlete Home → Crew Explainer → Create Crew → Success → RunCrew Central
```

**Steps:**
1. User signs in with Firebase
2. Backend creates/finds Athlete
3. If profile incomplete → Profile Setup
4. Profile Setup → Update profile
5. Navigate to Athlete Home
6. See "Start Your Crew" card
7. Navigate to Crew Explainer (optional)
8. Navigate to Create Crew Form
9. Fill form and submit
10. Navigate to Success page
11. Navigate to RunCrew Central

---

### Flow 2: Returning User (Perfect Scenario)
```
Signin → Athlete Home → RunCrew Central
```

**Steps:**
1. User signs in (has tokens)
2. Backend finds Athlete
3. Profile complete → Navigate directly to Athlete Home
4. See "My Crews" list
5. Click crew → Navigate to RunCrew Central

---

### Flow 3: Join Existing Crew
```
Athlete Home → Crew Explainer → Join Form → Join Success → RunCrew Central
```

**Steps:**
1. User at Athlete Home
2. Click "Join a Crew"
3. Navigate to Crew Explainer (optional)
4. Navigate to Join Form
5. Enter join code
6. Submit → Backend creates membership
7. Navigate to Join Success
8. Navigate to RunCrew Central

---

### Flow 4: Connect Garmin & View Activities
```
Athlete Home → Settings → Link Garmin → OAuth Flow → Athlete Home → Activities
```

**Steps:**
1. User at Athlete Home
2. Click "Link Garmin" (if not connected)
3. Navigate to Settings/Garmin Connection
4. OAuth flow with Garmin
5. Backend stores tokens
6. Return to Athlete Home
7. Click "View Activities"
8. Navigate to Activity Feed

---

## Edge Cases & Error Handling

### Join Code Not Found
- **Error**: 404 from backend
- **UI**: Display error message "Invalid join code. Please check and try again."
- **Action**: User can retry or navigate back

### Already a Member
- **Error**: 409 from backend
- **UI**: Display message "You are already a member of this RunCrew"
- **Action**: Navigate to RunCrew Central for that crew

### Join Code Already Exists (Create)
- **Error**: 409 from backend
- **UI**: Display error message "Join code already exists. Please choose a different code."
- **Action**: User can retry with different code

### Unauthorized (Not Member)
- **Error**: 403 from backend (trying to view crew)
- **UI**: Display error message "You must be a member to view this crew"
- **Action**: Navigate to Join Form or Athlete Home

### Admin Only (Settings)
- **Error**: User is not admin
- **UI**: Display error message "Only admins can access crew settings"
- **Action**: Redirect to RunCrew Central

---

## Navigation Patterns

### Primary Navigation
- **Athlete Home** - Home base (always accessible)
- **RunCrew Central** - Crew experience hub
- **Settings** - Account and integrations
- **Activities** - Personal activity history

### RunCrew Navigation
- **Create Flow**: Athlete Home → Explainer → Form → Success → Central
- **Join Flow**: Athlete Home → Explainer → Join → Success → Central
- **Settings**: Central → Settings (admin only)

### Quick Actions (Athlete Home)
- Start Your Crew (if no memberships)
- Join a Crew (always available)
- View Activities (if connected)
- Link Garmin (if not connected)

---

## LocalStorage Data

**Stored Data:**
- `firebaseId` - Firebase UID
- `athleteId` - Athlete record ID
- `firebaseToken` - ID token for API calls
- `email`, `firstName`, `lastName`, etc. - Profile data
- `currentCrew` - Temporary storage of created crew data
- `joinedCrew` - Temporary storage after joining crew

**Usage:**
- Fast navigation (no loading delays)
- Single source of truth
- Reduced API calls
- Works offline (using cached data)

---

## Related Documentation

- **`GoFastDevOverview.md`** - Complete development guide and stack overview
- **`RunCrewArchitecture.md`** - Complete RunCrew implementation (schema, routes, flows)
- **`GOFAST_ARCHITECTURE.md`** - Complete architecture and design principles
- **`gofastfrontend-mvp1/docs/FRONTEND_ARCHITECTURE.md`** - Frontend structure and patterns

---

**Last Updated**: January 2025  
**Phase**: 1 (RunCrew MVP1)  
**Navigation Pattern**: Athlete Home as Home Base  
**Primary Flows**: New User Onboarding, Returning User, Create Crew, Join Crew

