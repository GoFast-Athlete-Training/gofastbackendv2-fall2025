# Join RunCrew Architecture

**Last Updated**: November 2025  
**Status**: ✅ Core implementation complete  
**Pattern**: Join code-based invitation system  
**Related**: `RunCrewArchitecture.md` - Overall RunCrew architecture

---

## Premise

New users get invited specifically to join a RunCrew using a **join code**. The join code is created by the admin when they create the RunCrew.

**Core Flow**:
1. Admin creates RunCrew → generates/chooses join code
2. Admin shares join code with invitees
3. New user receives invitation (via link, text, etc.)
4. User goes through regular UX flow
5. User chooses "Run Crew" on Athlete Home (or direct link - future state)
6. User sees "Join or Create" → chooses "Join"
7. User enters join code → joins RunCrew

---

## Join Code System

### Join Code Creation

**When RunCrew is Created**:
- Admin provides join code during creation
- Join code is normalized to uppercase
- Join code must be unique across all RunCrews
- Stored in `RunCrew.joinCode` field (unique constraint)

**Join Code Format**:
- User-defined (admin chooses)
- Case-insensitive (stored as uppercase)
- Examples: "FAST123", "MORNINGRUN", "TEAM2024"

### Join Code Schema

**Current Implementation (MVP1)**:
```prisma
model RunCrew {
  id              String   @id @default(cuid())
  name            String
  joinCode        String   @unique // Unique invite code for joining
  runcrewAdminId String?  // Athlete ID of the creator/admin
  // ... other fields
}
```

**Lookup Pattern (Current)**:
```javascript
// Find RunCrew by joinCode directly
const runCrew = await prisma.runCrew.findUnique({
  where: { joinCode: normalizedJoinCode }
});
```

**Future: RunCrewJoinCode Model (For Array Lookup)**:
```prisma
model RunCrewJoinCode {
  id        String   @id @default(cuid())
  runCrewId String
  code      String   @unique // Unique invite code (normalized uppercase)
  
  // Optional tracking
  isActive  Boolean  @default(true)
  expiresAt DateTime?
  usageCount Int     @default(0)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  runCrew   RunCrew  @relation(fields: [runCrewId], references: [id], onDelete: Cascade)
  
  @@map("run_crew_join_codes")
}

model RunCrew {
  id              String   @id @default(cuid())
  name            String
  joinCode        String?  // Primary join code (backward compatibility)
  joinCodes       RunCrewJoinCode[] // Array of join codes for lookup
  // ... other fields
}
```

**Lookup Pattern (Future)**:
```javascript
// Find join code first, then get RunCrew
const joinCodeRecord = await prisma.runCrewJoinCode.findUnique({
  where: { code: normalizedJoinCode },
  include: { runCrew: true }
});

const runCrew = joinCodeRecord?.runCrew;
```

**Benefits of Separate Model**:
- ✅ Fast lookup by code (indexed)
- ✅ Multiple join codes per RunCrew (array)
- ✅ Track usage, expiration
- ✅ Deactivate codes without deleting
- ✅ Analytics on join code usage

---

## Join Flow

There are **TWO DISTINCT PATHS** for joining a RunCrew:

---

## Path 1: Athlete-First Flow (Existing Organic Flow)

**When**: User is already signed up and authenticated, wants to join a crew

**Flow**:
```
1. User signs in → Athlete Home
2. User clicks "Run Crew" → /runcrew/join-or-start
3. User chooses "Join a Crew" → /runcrew/join (JoinCrewWelcome)
   OR
   User goes directly to /runcrew/join
4. User enters join code → Validates → Joins crew
5. Navigate to RunCrew Central
```

**Components**:
- `JoinOrStartCrew.jsx` - Choice page (`/runcrew/join-or-start`)
- `JoinCrewWelcome.jsx` - Welcome page with lookup (`/runcrew/join`)
- `JoinCrew.jsx` - Detailed join form (`/run-crew-join`)

**Authentication**: ✅ User must be authenticated (Firebase token required)

**API Endpoint**: `POST /api/runcrew/join` (requires Firebase auth)

**Key Features**:
- User already has an athlete account
- Uses existing Firebase authentication
- Immediate join (no signup step)
- Saves to localStorage immediately

---

## Path 2: Join Code-First Flow (New Direct-Invite Flow)

**When**: User receives a join code invitation but hasn't signed up yet

**Flow**:
```
1. User receives invite link: /joinruncrewwelcome?code=ABC123
2. User validates code → Sees crew info
3. User clicks "Join This Crew" → Stores join context in Redis
4. Redirects to /athletesignup?hasJoinContext=true&sessionId=xxx
5. User signs up with Google → Auto-joins crew during signup
6. Redirects to /precrewpage?crewId=xxx
7. Hydrates athlete + crew → Navigates to RunCrew Central
```

**Components**:
- `JoinRunCrewWelcome.jsx` - Standalone invite page (`/joinruncrewwelcome`)
- `PreCrewPage.jsx` - Hydration checkpoint (`/precrewpage`)
- Modified `AthleteSignup.jsx` - Handles join context during signup

**Authentication**: ❌ User is NOT authenticated (public page)

**API Endpoints**:
- `GET /api/join/validate?code=XXXX` - Validates join code (public)
- `POST /api/join/temp` - Stores join context in Redis (public)
- `POST /api/athlete/create` - Modified to check for join context and auto-join

**Key Features**:
- User doesn't have an account yet
- Join context stored temporarily in Redis (5-minute TTL)
- Auto-joins crew during signup process
- Skips AthleteHome entirely
- Seamless onboarding experience

---

## Comparison Table

| Feature | Athlete-First Flow | Join Code-First Flow |
|---------|-------------------|---------------------|
| **Entry Point** | `/runcrew/join-or-start` or `/runcrew/join` | `/joinruncrewwelcome?code=XXX` |
| **Authentication** | ✅ Required | ❌ Not required |
| **User Status** | Existing athlete | New user (no account) |
| **Join Timing** | Immediate after code entry | During signup process |
| **Context Storage** | N/A (direct join) | Redis (5-min TTL) |
| **Navigation** | Direct to RunCrew Central | Signup → PreCrewPage → RunCrew Central |
| **Components** | JoinCrewWelcome, JoinCrew | JoinRunCrewWelcome, PreCrewPage |

---

## Step-by-Step: Athlete-First Flow

**Step 1: User Navigates to Join**
- User signs in → Athlete Home
- Clicks "Run Crew" → Goes to `/runcrew/join-or-start` (choice page)
- OR goes directly to `/runcrew/join`

**Step 2: Enter Join Code**
- User enters join code in `JoinCrewWelcome.jsx`
- Code is normalized (uppercase)
- Calls `POST /api/runcrew/lookup` to validate

**Step 3: Preview Crew**
- Shows crew preview (name, description, member count)
- User confirms they want to join

**Step 4: Join RunCrew**
- API call: `POST /api/runcrew/join` (with Firebase token)
- Creates `RunCrewMembership` (junction table)
- Returns hydrated RunCrew with members

**Step 5: Success & Navigation**
- RunCrew saved to localStorage
- Navigate to RunCrew Central (member or admin view)

---

## Step-by-Step: Join Code-First Flow

**Step 1: User Receives Invitation**
- Admin shares join code via:
  - Direct link: `https://athlete.gofastcrushgoals.com/joinruncrewwelcome?code=ABC123`
  - Text message with code
  - Email with link

**Step 2: Validate Join Code**
- User lands on `/joinruncrewwelcome` (`JoinRunCrewWelcome.jsx`)
- Code auto-validated if in URL, or user enters code manually
- Calls `GET /api/join/validate?code=XXXX` (public, no auth)
- Shows crew info: name, manager name, member count

**Step 3: Store Join Context**
- User clicks "Join This Crew"
- Calls `POST /api/join/temp` with join code
- Stores join context in Redis with sessionId (5-minute TTL)
- Returns sessionId

**Step 4: Sign Up**
- Redirects to `/athletesignup?hasJoinContext=true&sessionId=xxx`
- User signs up with Google OAuth
- Modified signup flow passes sessionId to `/api/athlete/create`

**Step 5: Auto-Join During Signup**
- `POST /api/athlete/create` checks for join context using sessionId
- If found, automatically creates `RunCrewMembership`
- Returns athlete data with `runCrewId` included
- Cleans up join context from Redis

**Step 6: Hydration Checkpoint**
- Redirects to `/precrewpage?crewId=xxx`
- `PreCrewPage.jsx` hydrates athlete and crew data in parallel
- Saves to localStorage
- Navigates to `/runcrew/:id` (RunCrew Central)

**Step 7: Success**
- User lands directly in RunCrew Central
- Skipped AthleteHome entirely
- Seamless onboarding experience

---

## API Endpoints

### Athlete-First Flow Endpoints

#### Join RunCrew

**Route**: `POST /api/runcrew/join`  
**File**: `routes/RunCrew/runCrewJoinRoute.js`  
**Auth**: `verifyFirebaseToken` middleware  
**Flow**: Athlete-First

**Request Body**:
```json
{
  "joinCode": "FAST123",
  "athleteId": "athlete_cuid"
}
```

**Frontend athleteId Source**:
- ✅ **Primary**: `localStorage.getItem('athleteId')` (set on signin/signup/welcome)
- ✅ **Fallback**: `athleteProfile.id` from `localStorage.getItem('athleteProfile')`
- ✅ **Validation**: Backend verifies `athleteId` matches Firebase token's `firebaseId`

**Join Code Validation**:
- ✅ **Client-side**: Format validation (3-20 chars, alphanumeric + hyphens/underscores)
- ✅ **Server-side**: Normalized to uppercase, checked against database
- ✅ **Error handling**: Clear error messages for invalid codes, already member, etc.

**Response** (Success):
```json
{
  "success": true,
  "message": "Joined RunCrew successfully",
  "runCrew": {
    "id": "runcrew_cuid",
    "name": "Morning Warriors",
    "joinCode": "FAST123",
    "admin": { ... },
    "memberships": [ ... ]
  }
}
```

**Response** (Error - Invalid Code):
```json
{
  "success": false,
  "error": "RunCrew not found",
  "message": "Invalid join code. Please check the code and try again."
}
```

**Response** (Error - Already Member):
```json
{
  "success": false,
  "error": "Already a member",
  "message": "You are already a member of this RunCrew"
}
```

**Validation** (Backend):
- ✅ Join code normalized to uppercase and trimmed
- ✅ Checks for existing membership (prevents duplicates)
- ✅ Verifies athlete exists and matches Firebase token (`athleteId` + `firebaseId` match)
- ✅ Returns 404 if RunCrew not found
- ✅ Returns 409 if already a member
- ✅ Returns 400 if missing required fields (`joinCode` or `athleteId`)

**Validation** (Frontend):
- ✅ Format validation: 3-20 characters
- ✅ Character validation: Alphanumeric + hyphens/underscores only
- ✅ Auto-uppercase on input
- ✅ Real-time error display
- ✅ athleteId validation: Must exist in localStorage
- ✅ Firebase auth check: Must be signed in

---

### Join Code-First Flow Endpoints

#### Validate Join Code

**Route**: `GET /api/join/validate?code=XXXX`  
**File**: `routes/Join/joinValidateRoute.js`  
**Auth**: ❌ Public (no auth required)  
**Flow**: Join Code-First

**Purpose**: Validates a join code and returns crew info for invite card

**Response** (Success):
```json
{
  "success": true,
  "crewName": "Morning Warriors",
  "managerName": "John Doe",
  "memberCount": 5,
  "description": "Early morning running crew",
  "runCrewId": "runcrew_cuid",
  "joinCode": "FAST123"
}
```

**Response** (Error):
```json
{
  "success": false,
  "error": "Invalid or expired join code",
  "message": "Invalid or expired join code"
}
```

#### Store Join Context Temporarily

**Route**: `POST /api/join/temp`  
**File**: `routes/Join/joinTempRoute.js`  
**Auth**: ❌ Public (no auth required)  
**Flow**: Join Code-First

**Purpose**: Stores join context in Redis for later use during signup

**Request Body**:
```json
{
  "joinCode": "FAST123",
  "sessionId": "optional-session-id"
}
```

**Response**:
```json
{
  "success": true,
  "sessionId": "uuid-session-id",
  "message": "Join context stored successfully"
}
```

**Storage**: Redis key `joinctx:{sessionId}` with 5-minute TTL

#### Modified: Create Athlete (with Join Context)

**Route**: `POST /api/athlete/create`  
**File**: `routes/Athlete/athleteCreateRoute.js`  
**Auth**: `verifyFirebaseToken` middleware  
**Flow**: Join Code-First (modified)

**Modifications**:
- ✅ Accepts optional `sessionId` in request body
- ✅ Checks Redis for join context using sessionId
- ✅ If join context found:
  - Auto-creates `RunCrewMembership`
  - Returns `runCrewId` in response
  - Cleans up join context from Redis
- ✅ Returns normal athlete response with optional `runCrewId` field

**Request Body** (with join context):
```json
{
  "sessionId": "uuid-session-id"
}
```

**Response** (with join context):
```json
{
  "success": true,
  "athleteId": "athlete_cuid",
  "data": { ... },
  "runCrewId": "runcrew_cuid",
  "joinedRunCrew": true
}
```

---

## Frontend Components

### Athlete-First Flow Components

#### JoinCrewWelcome.jsx

**Purpose**: Welcome page for authenticated users joining a RunCrew  
**Route**: `/runcrew/join`  
**Flow**: Athlete-First (existing organic flow)

**Features**:
- ✅ Welcome message and join code input
- ✅ Join code lookup via `POST /api/runcrew/lookup`
- ✅ Crew preview after lookup (name, description, member count)
- ✅ Auto sign-in with Google if not authenticated
- ✅ Direct join flow (no preview step)
- ✅ Saves RunCrew to localStorage on success
- ✅ Navigates to `/runcrew/central` on success

**Flow**:
1. User enters join code
2. Clicks "Find My Crew" → Calls `/api/runcrew/lookup`
3. Shows crew preview (name, description, members)
4. Clicks "Join Crew" → Calls `/api/runcrew/join` (with Firebase token)
5. Auto-signs in if needed (Google OAuth)
6. Saves to localStorage → Navigates to RunCrew Central

#### JoinOrStartCrew.jsx

**Purpose**: Entry point for choosing to join or create RunCrew  
**Route**: `/runcrew/join-or-start`  
**Flow**: Athlete-First (existing organic flow)

**Features**:
- Two-button layout:
  - "Enter Invite Code" → Navigate to `/run-crew-join`
  - "Start Your Crew" → Navigate to `/form-run-crew`
- URL parameter support (`?code=XXX`) → redirects to `/run-crew-join?code=XXX`

#### JoinCrew.jsx

**Purpose**: Detailed join form with preview functionality  
**Route**: `/run-crew-join`  
**Flow**: Athlete-First (existing organic flow)

**Features**:
- ✅ Join code input field with validation
- ✅ Client-side format validation (3-20 chars, alphanumeric)
- ✅ Auto-uppercase normalization
- ✅ URL parameter support (`?code=FAST123` for direct links)
- ✅ athleteId from localStorage (validated)
- ✅ Firebase token authentication
- ✅ Error handling (invalid code, already member, network errors)
- ✅ Success redirect to RunCrew Central (admin or member view)
- ✅ Saves RunCrew to localStorage on success

**Join Code Validation**:
```javascript
// Client-side validation
const validateJoinCode = (code) => {
  const normalized = code.toUpperCase().trim();
  // Min 3 chars, max 20 chars
  // Alphanumeric + hyphens/underscores only
  // Returns { valid: boolean, normalized: string, message?: string }
};
```

**athleteId Flow**:
```javascript
// Get athleteId from localStorage (set on signin/signup/welcome)
const athleteId = localStorage.getItem('athleteId');
if (!athleteId) {
  // Redirect to sign in
  navigate('/athlete-home');
  return;
}

// Send to backend with joinCode
POST /api/runcrew/join {
  joinCode: normalizedCode,
  athleteId: athleteId
}
```

**Flow**:
1. User enters join code (or from URL param)
2. Client-side validation (format check)
3. Get athleteId from localStorage
4. Get Firebase token
5. API call to `POST /api/runcrew/join` with joinCode + athleteId
6. Backend validates:
   - Join code exists
   - athleteId matches Firebase token
   - Not already a member
7. On success → Save to localStorage → Navigate to RunCrew Central
8. On error → Show error message

---

### Join Code-First Flow Components

#### JoinRunCrewWelcome.jsx

**Purpose**: Standalone invite page for unauthenticated users  
**Route**: `/joinruncrewwelcome?code=ABC123`  
**Flow**: Join Code-First (new direct-invite flow)

**Features**:
- ✅ Public page (no authentication required)
- ✅ Validates join code via `GET /api/join/validate?code=XXXX`
- ✅ Shows crew info: name, manager name, member count, description
- ✅ Stores join context in Redis via `POST /api/join/temp`
- ✅ Redirects to signup with join context flag
- ✅ Auto-validates code if present in URL

**Flow**:
1. User lands on page (with or without code in URL)
2. If code in URL → Auto-validates
3. If no code → User enters join code → Validates
4. Shows crew invitation card with details
5. User clicks "Join This Crew"
6. Stores join context in Redis (5-minute TTL)
7. Redirects to `/athletesignup?hasJoinContext=true&sessionId=xxx`

#### PreCrewPage.jsx

**Purpose**: Hydration checkpoint before RunCrew Central  
**Route**: `/precrewpage?crewId=xxx`  
**Flow**: Join Code-First (new direct-invite flow)

**Features**:
- ✅ Lightweight hydration checkpoint
- ✅ Fetches athlete and crew data in parallel
- ✅ Saves to localStorage
- ✅ Shows loading spinner during hydration
- ✅ Redirects to RunCrew Central on success
- ✅ Error handling with fallback to AthleteHome

**Flow**:
1. Receives crewId from URL or localStorage
2. Parallel fetch: `/api/athlete/create` + `/api/runcrew/:id`
3. Saves athlete and crew data to localStorage
4. Updates athlete profile with crew info
5. Navigates to `/runcrew/:id` (RunCrew Central)

#### Modified AthleteSignup.jsx

**Purpose**: Signup page with join context support  
**Route**: `/athletesignup?hasJoinContext=true&sessionId=xxx`  
**Flow**: Join Code-First (new direct-invite flow)

**Modifications**:
- ✅ Checks for `hasJoinContext` query param
- ✅ Retrieves `sessionId` from URL or localStorage
- ✅ Passes `sessionId` to `POST /api/athlete/create`
- ✅ Checks response for `runCrewId` (indicates auto-join)
- ✅ Redirects to `/precrewpage?crewId=xxx` if joined crew
- ✅ Otherwise follows normal signup flow

---

## Future Enhancements

### Direct Link Join (Future State)

**URL Format**:
```
https://athlete.gofastcrushgoals.com/runcrew/join?code=FAST123
```

**Implementation**:
- Pre-fill join code from URL parameter
- Auto-submit if user is authenticated
- Redirect to sign-in if not authenticated
- After sign-in → auto-join with code

**Benefits**:
- One-click join experience
- Shareable links via text/email
- Better UX for invited users

### Join Code Generation

**Current**: Admin manually chooses join code  
**Future**: Auto-generate unique codes
- Format: `RUN-XXXX` (e.g., `RUN-A3B7`)
- Random alphanumeric
- Guaranteed uniqueness
- Easier to share

### Invitation System

**Future**: Built-in invitation system
- Admin can send invitations via email
- Invitation contains direct link
- Tracks invitation status
- Reminder notifications

---

## Join Code Validation & Checking

### Client-Side Validation

**Format Rules**:
- Minimum 3 characters
- Maximum 20 characters
- Alphanumeric characters (A-Z, 0-9)
- Hyphens and underscores allowed (-, _)
- Case-insensitive (normalized to uppercase)

**Validation Function**:
```javascript
const validateJoinCode = (code) => {
  const normalized = code.toUpperCase().trim();
  
  // Length check
  if (!normalized || normalized.length < 3) {
    return { valid: false, message: 'Join code must be at least 3 characters' };
  }
  if (normalized.length > 20) {
    return { valid: false, message: 'Join code must be 20 characters or less' };
  }
  
  // Character check
  if (!/^[A-Z0-9-_]+$/.test(normalized)) {
    return { valid: false, message: 'Join code can only contain letters, numbers, hyphens, and underscores' };
  }
  
  return { valid: true, normalized };
};
```

### Server-Side Validation

**Backend Checks**:
1. Join code normalized to uppercase
2. Join code exists in database (find RunCrew by joinCode)
3. athleteId provided and matches Firebase token
4. Athlete not already a member (check RunCrewMembership)

**Error Responses**:
- `400`: Missing `joinCode` or `athleteId`
- `403`: athleteId doesn't match Firebase token
- `404`: RunCrew not found (invalid join code)
- `409`: Already a member (duplicate membership)

### Pre-Validation Endpoint (Future)

**Proposed Route**: `GET /api/runcrew/check/:joinCode`

**Purpose**: Check if join code exists before user submits form

**Response**:
```json
{
  "success": true,
  "exists": true,
  "runCrew": {
    "name": "Morning Warriors",
    "memberCount": 5
  }
}
```

**Benefits**:
- Real-time feedback as user types
- Show crew name before joining
- Better UX (know if code is valid before submitting)

---

## Security Considerations

### Join Code Security

**Current**:
- Join code is public (shared by admin)
- Anyone with code can join
- No expiration (code works indefinitely)

**Future Considerations**:
- Optional expiration dates
- One-time use codes
- Invitation-only mode (code + email verification)
- Rate limiting on join attempts

### Membership Validation

**Current**:
- Checks for existing membership (prevents duplicates)
- Verifies athlete matches Firebase token
- Validates RunCrew exists

**Future**:
- Admin approval required (optional)
- Maximum member limits
- Member verification

---

## Data Flow

### Join Process

```
1. User enters join code
   ↓
2. Frontend normalizes code (uppercase)
   ↓
3. POST /api/runcrew/join { joinCode, athleteId }
   ↓
4. Backend validates:
   - Athlete exists and matches Firebase token
   - Join code exists (find RunCrew by joinCode)
   - Athlete not already a member
   ↓
5. Create RunCrewMembership (junction table)
   ↓
6. Return hydrated RunCrew
   ↓
7. Frontend saves to localStorage
   ↓
8. Navigate to RunCrew Central
```

---

## Key Design Principles

1. **Simple Join Code**: Easy to share, easy to enter
2. **Case-Insensitive**: User-friendly (FAST123 = fast123 = Fast123)
3. **Unique Codes**: One code per RunCrew, no conflicts
4. **Junction Table**: Many-to-many relationship (athlete can join multiple crews)
5. **Idempotent**: Prevents duplicate memberships
6. **Secure**: Verifies athlete identity via Firebase token

---

## Related Documentation

- **`RunCrewArchitecture.md`** - Overall RunCrew architecture and schema
- **`RunCrewAdmin.md`** - Admin management and capabilities
- **`RunCrewMembership.md`** - Membership capability (join creates membership)
- **`../GOFAST_ARCHITECTURE.md`** - Main architecture document

---

## Implementation Status

### ✅ Completed

#### Athlete-First Flow
- Join code creation on RunCrew creation
- Join code normalization (uppercase)
- Join API endpoint (`POST /api/runcrew/join`)
- Duplicate membership prevention
- Frontend join components:
  - `JoinCrewWelcome.jsx` - Welcome page (`/runcrew/join`)
  - `JoinCrew.jsx` - Detailed join form (`/run-crew-join`)
  - `JoinOrStartCrew.jsx` - Choice page (`/runcrew/join-or-start`)
- Join code client-side validation (format, length)
- athleteId from localStorage (validated)
- Firebase token authentication
- Error handling and user feedback
- Success navigation (admin vs member view)
- URL parameter support (`?code=XXX`)

#### Join Code-First Flow
- Join code validation endpoint (`GET /api/join/validate`)
- Join context storage endpoint (`POST /api/join/temp`)
- Redis join context storage (5-minute TTL)
- Modified athlete create endpoint (auto-join support)
- Frontend components:
  - `JoinRunCrewWelcome.jsx` - Standalone invite page (`/joinruncrewwelcome`)
  - `PreCrewPage.jsx` - Hydration checkpoint (`/precrewpage`)
  - Modified `AthleteSignup.jsx` - Join context support
- Direct-invite flow (signup → auto-join → RunCrew Central)
- Skip AthleteHome for invite signups

### 🚧 Future
- **RunCrewJoinCode Model**: Separate model for join code lookup (array of codes per crew)
- Direct link join with auto-submit (`/runcrew/join?code=XXX`)
- Join code pre-validation endpoint (`GET /api/runcrew/check/:joinCode`)
- Auto-generated join codes
- Multiple join codes per RunCrew (array)
- Join code tracking (usage count, expiration)
- Invitation system
- Admin approval workflow

---

**Last Updated**: November 2025  
**Maintained By**: GoFast Development Team

