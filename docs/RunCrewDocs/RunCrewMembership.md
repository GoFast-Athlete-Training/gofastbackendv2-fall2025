# RunCrew Membership Architecture

**Last Updated**: November 2025  
**Status**: ✅ Core implementation complete  
**Pattern**: Junction table for many-to-many relationship  
**Related**: `RunCrewArchitecture.md` - Overall RunCrew architecture

---

## Premise

RunCrew Membership is the **junction table** that enables the many-to-many relationship between Athletes and RunCrews. It's the core mechanism for:

1. **Joining** a RunCrew (creates membership)
2. **Displaying members** ("Who's Here" section)
3. **Hydrating** RunCrew data (both admin and member views)
4. **Security** (verifying membership for access)

**Key Concept**: `RunCrewMembership` is the **single source of truth** for who belongs to which RunCrew.

---

## Schema

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

**Key Fields**:
- `runCrewId` + `athleteId` = Composite unique constraint (one membership per athlete per crew)
- `joinedAt` = When athlete joined (useful for sorting, "newest members")
- Cascade delete = If RunCrew deleted, memberships deleted. If Athlete deleted, memberships deleted.

---

## Membership Mutations

### 1. Create Membership (Join RunCrew)

**Route**: `POST /api/runcrew/join`  
**File**: `routes/RunCrew/runCrewJoinRoute.js`

**Flow**:
```
1. User provides joinCode
   ↓
2. Find RunCrew by joinCode
   ↓
3. Check if membership already exists (prevent duplicates)
   ↓
4. Create RunCrewMembership record
   ↓
5. Return hydrated RunCrew with memberships
```

**Code**:
```javascript
// Check for existing membership
const existingMembership = await prisma.runCrewMembership.findUnique({
  where: {
    runCrewId_athleteId: {
      runCrewId: runCrew.id,
      athleteId: athleteId
    }
  }
});

if (existingMembership) {
  return res.status(409).json({
    success: false,
    error: 'Already a member'
  });
}

// Create membership
const membership = await prisma.runCrewMembership.create({
  data: {
    runCrewId: runCrew.id,
    athleteId: athleteId
  }
});
```

**Result**: New `RunCrewMembership` record created in `run_crew_memberships` table

---

### 2. Upsert Membership (Create RunCrew)

**Route**: `POST /api/runcrew/create`  
**File**: `routes/RunCrew/runCrewCreateRoute.js`

**Flow**:
```
1. Admin creates RunCrew
   ↓
2. RunCrew created with runcrewAdminId
   ↓
3. Upsert membership (creator is also a member)
   ↓
4. Return hydrated RunCrew with memberships
```

**Code**:
```javascript
// Upsert membership (creator is also a member)
const membership = await prisma.runCrewMembership.upsert({
  where: {
    runCrewId_athleteId: {
      runCrewId: runCrew.id,
      athleteId: athleteId
    }
  },
  update: {
    joinedAt: new Date() // Reset join date if rejoining
  },
  create: {
    runCrewId: runCrew.id,
    athleteId: athleteId
  }
});
```

**Why Upsert?**: 
- Prevents duplicate if creator somehow already has membership
- Idempotent operation (safe to call multiple times)
- Sets `joinedAt` timestamp

**Result**: `RunCrewMembership` record created/updated in `run_crew_memberships` table

---

## Membership Hydration

### Hydration Pattern

Both **RunCrewAdmin** and **RunCrewCentral** (member view) hydrate from the same `memberships` data.

**Route**: `GET /api/runcrew/:id`  
**File**: `routes/RunCrew/runCrewHydrateRoute.js`

**Hydration Query**:
```javascript
const runCrew = await prisma.runCrew.findUnique({
  where: { id },
  include: {
    memberships: {
      include: {
        athlete: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            photoURL: true
          }
        }
      },
      orderBy: {
        joinedAt: 'desc' // Newest members first
      }
    }
    // ... other relations (messages, runs, etc.)
  }
});
```

**Response Structure**:
```json
{
  "success": true,
  "runCrew": {
    "id": "runcrew_cuid",
    "name": "Morning Warriors",
    "memberships": [
      {
        "id": "membership_cuid",
        "joinedAt": "2025-11-06T...",
        "athlete": {
          "id": "athlete_cuid",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com",
          "photoURL": "https://..."
        }
      }
      // ... more memberships
    ],
    "memberCount": 5
  }
}
```

---

## Frontend Usage

### RunCrewCentral (Member View)

**Component**: `RunCrewCentral.jsx`  
**Data Source**: `runCrew.memberships` from hydration

**Display**:
- Map `memberships` array to display members
- Show member avatars (photoURL or initials)
- Show member names
- Show member count

**Code Pattern**:
```javascript
const crewMembers = runCrew?.memberships?.map(membership => {
  const athlete = membership.athlete;
  const firstName = athlete?.firstName || '';
  const lastName = athlete?.lastName || '';
  const name = `${firstName} ${lastName}`.trim() || athlete?.email || 'Unknown';
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U';
  
  return {
    id: athlete?.id,
    name,
    avatar: athlete?.photoURL || null,
    status: 'Active',
    initials,
    joinedAt: membership.joinedAt
  };
}) || [];
```

---

### RunCrewCentralAdmin (Admin View)

**Component**: `RunCrewCentralAdmin.jsx`  
**Data Source**: Same `runCrew.memberships` from hydration

**Display**:
- Same member list as member view
- Additional admin actions:
  - Remove member (future)
  - Assign manager (future)
  - View member details

**Code Pattern**: Same as member view, plus admin actions

---

## Membership Operations

### Current Operations

**✅ Create** (Join):
- `POST /api/runcrew/join` - Creates membership

**✅ Upsert** (Create RunCrew):
- `POST /api/runcrew/create` - Upserts membership for creator

**✅ Read** (Hydrate):
- `GET /api/runcrew/:id` - Includes memberships with athlete details
- `GET /api/runcrew/mine` - Includes memberships for user's crews

### Future Operations

**🚧 Remove Member**:
- `DELETE /api/runcrew/:id/members/:athleteId` - Remove membership (admin only)
- Deletes `RunCrewMembership` record
- Athlete can no longer access RunCrew

**🚧 Leave Crew**:
- `POST /api/runcrew/:id/leave` - Remove own membership
- Athlete removes themselves from crew

**🚧 Transfer Membership**:
- Future: Transfer admin role (updates `runcrewAdminId`, keeps membership)

---

## Data Flow

### Join Flow

```
1. User enters join code
   ↓
2. POST /api/runcrew/join { joinCode, athleteId }
   ↓
3. Find RunCrew by joinCode
   ↓
4. Check existing membership (prevent duplicates)
   ↓
5. Create RunCrewMembership record
   ↓
6. Return hydrated RunCrew with memberships
   ↓
7. Frontend saves to localStorage
   ↓
8. Display members in "Who's Here" section
```

### Hydration Flow

```
1. User navigates to RunCrew Central
   ↓
2. GET /api/runcrew/:id (or read from localStorage)
   ↓
3. Backend queries RunCrewMembership table
   ↓
4. Includes athlete details for each membership
   ↓
5. Returns runCrew.memberships[] array
   ↓
6. Frontend maps memberships to display members
   ↓
7. Shows "Who's Here" section with member avatars/names
```

---

## Security & Validation

### Membership Verification

**Access Control**:
- Only members can view RunCrew data
- Hydration endpoint checks membership before returning data
- Admin can view even if not member (via `runcrewAdminId` check)

**Code Pattern**:
```javascript
// Check if athlete is a member
const isMember = runCrew.memberships.some(
  membership => membership.athleteId === athlete.id
);

// Check if athlete is admin
const isAdmin = runCrew.runcrewAdminId === athlete.id;

if (!isMember && !isAdmin) {
  return res.status(403).json({
    success: false,
    error: 'Access denied',
    message: 'You must be a member of this crew to view it'
  });
}
```

### Duplicate Prevention

**Unique Constraint**:
- `@@unique([runCrewId, athleteId])` prevents duplicate memberships
- Database enforces one membership per athlete per crew

**Application-Level Check**:
- Check for existing membership before creating
- Return 409 (Conflict) if already a member

---

## Key Design Principles

1. **Junction Table Pattern**: Many-to-many relationship via `RunCrewMembership`
2. **Single Source of Truth**: `run_crew_memberships` table is authoritative
3. **Athlete-First**: Membership links to `athleteId` (athlete is primary entity)
4. **Idempotent Operations**: Upsert pattern prevents duplicates
5. **Cascade Delete**: Cleanup when RunCrew or Athlete deleted
6. **Shared Hydration**: Both admin and member views use same `memberships` data
7. **Timestamps**: `joinedAt` tracks when athlete joined (useful for sorting)

---

## Database Queries

### Get All Members for RunCrew

```javascript
const memberships = await prisma.runCrewMembership.findMany({
  where: { runCrewId },
  include: {
    athlete: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        photoURL: true
      }
    }
  },
  orderBy: {
    joinedAt: 'desc'
  }
});
```

### Check if Athlete is Member

```javascript
const membership = await prisma.runCrewMembership.findUnique({
  where: {
    runCrewId_athleteId: {
      runCrewId,
      athleteId
    }
  }
});

const isMember = !!membership;
```

### Get Member Count

```javascript
const memberCount = await prisma.runCrewMembership.count({
  where: { runCrewId }
});
```

---

## Related Documentation

- **`RunCrewArchitecture.md`** - Overall RunCrew architecture and schema
- **`RunCrewAdmin.md`** - Admin management (uses memberships for member management)
- **`JoinRunCrew.md`** - Join flow (creates membership)

---

## Implementation Status

### ✅ Completed
- RunCrewMembership schema (junction table)
- Create membership (join flow)
- Upsert membership (create flow)
- Hydration includes memberships
- Frontend displays members from memberships

### 🚧 Future
- Remove member (admin action)
- Leave crew (member action)
- Member management UI in admin view
- Member activity tracking

---

**Last Updated**: November 2025  
**Maintained By**: GoFast Development Team

