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

### Current Flow (MVP1)

**Step 1: User Receives Invitation**
- Admin shares join code via:
  - Text message
  - Email
  - Direct link (future state)
  - Social media

**Step 2: User Navigates to Join**
- **Option A**: Via Athlete Home
  - User signs in → Athlete Home
  - Sees "Run Crew" card/option
  - Clicks → Goes to "Join or Create" page
- **Option B**: Direct Link (Future State)
  - `https://athlete.gofastcrushgoals.com/runcrew/join?code=FAST123`
  - Pre-fills join code
  - Direct join flow

**Step 3: Join or Create Decision**
- User sees "Join or Create" page (`JoinOrStartCrew.jsx`)
- Two options:
  - **Join a Crew** → Enter join code
  - **Create a Crew** → Create new RunCrew

**Step 4: Enter Join Code**
- User enters join code
- Code is normalized (uppercase)
- Validated against existing RunCrews

**Step 5: Join RunCrew**
- API call: `POST /api/runcrew/join`
- Creates `RunCrewMembership` (junction table)
- Returns hydrated RunCrew with members

**Step 6: Success & Navigation**
- User sees success message
- RunCrew added to their account
- Navigate to RunCrew Central (member or admin view)

---

## API Endpoints

### Join RunCrew

**Route**: `POST /api/runcrew/join`  
**File**: `routes/RunCrew/runCrewJoinRoute.js`  
**Auth**: `verifyFirebaseToken` middleware

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

## Frontend Components

### JoinOrStartCrew.jsx

**Purpose**: Entry point for joining or creating RunCrew  
**Route**: `/runcrew/join`

**Features**:
- Two-button layout:
  - "Join a Crew" → Navigate to join form
  - "Create a Crew" → Navigate to create form

### JoinCrew.jsx

**Purpose**: Join form for entering join code  
**Route**: `/run-crew-join`

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
- Join code creation on RunCrew creation
- Join code normalization (uppercase)
- Join API endpoint (`POST /api/runcrew/join`)
- Duplicate membership prevention
- Frontend join form (`JoinCrew.jsx`) with validation
- Join code client-side validation (format, length)
- athleteId from localStorage (validated)
- Firebase token authentication
- Error handling and user feedback
- Success navigation (admin vs member view)
- Join or Create page (`JoinOrStartCrew.jsx`)
- URL parameter support (`?code=XXX`)

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

