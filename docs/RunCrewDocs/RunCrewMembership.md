# RunCrew Membership Hydration

**Last Updated**: December 2024  
**Status**: ✅ Design Document  
**Purpose**: Document membership hydration architecture for RunCrew  
**Related**: `runCrewAdmin-hydration.md`, `RunCrewArchitecture.md`

---

## Premise

RunCrew memberships are the junction table connecting Athletes to RunCrews. Members are hydrated via the main RunCrew endpoint and do NOT require a separate `/members` endpoint. The membership data structure includes nested athlete information for display purposes.

---

## Prisma Relations

### RunCrewMembership Model
```prisma
model RunCrewMembership {
  id        String @id @default(cuid())
  runCrewId String
  athleteId String // ATHLETE-FIRST: Foreign key to Athlete

  // Timestamps
  joinedAt  DateTime @default(now())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations - ATHLETE-FIRST: Explicitly tied to athleteId
  runCrew RunCrew @relation(fields: [runCrewId], references: [id], onDelete: Cascade)
  athlete Athlete @relation("AthleteRunCrewMemberships", fields: [athleteId], references: [id], onDelete: Cascade)

  @@unique([runCrewId, athleteId]) // Prevent duplicate memberships
  @@map("run_crew_memberships")
}
```

### Athlete Model Relation
```prisma
model Athlete {
  // ... other fields
  runCrewMemberships RunCrewMembership[] @relation("AthleteRunCrewMemberships")
}
```

### RunCrew Model Relation
```prisma
model RunCrew {
  // ... other fields
  memberships RunCrewMembership[] // Junction table for members
}
```

---

## Required Nested Includes

### Full Member Hydration Query
```javascript
const runCrew = await prisma.runCrew.findUnique({
  where: { id: runCrewId },
  include: {
    memberships: {
      include: {
        athlete: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            photoURL: true,
            activities: {
              where: {
                startTime: {
                  gte: windowStart,
                  lte: now
                }
              },
              select: {
                distance: true,
                duration: true,
                calories: true,
                startTime: true
              }
            }
          }
        }
      },
      orderBy: {
        joinedAt: 'desc' // Newest members first
      }
    }
  }
});
```

### Minimal Member Display Query
```javascript
const runCrew = await prisma.runCrew.findUnique({
  where: { id: runCrewId },
  include: {
    memberships: {
      include: {
        athlete: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoURL: true
            // email only for admin view
          }
        }
      },
      orderBy: {
        joinedAt: 'desc'
      }
    }
  }
});
```

---

## Correct Shape for Member List

### Response Shape from GET /api/runcrew/:id
```json
{
  "success": true,
  "runCrew": {
    "id": "cmhlg0io60001sj1vlqn13vnx",
    "name": "Morning Warriors",
    "memberships": [
      {
        "id": "mem_abc123",
        "runCrewId": "cmhlg0io60001sj1vlqn13vnx",
        "athleteId": "ath_xyz789",
        "joinedAt": "2024-01-15T06:30:00Z",
        "createdAt": "2024-01-15T06:30:00Z",
        "updatedAt": "2024-01-15T06:30:00Z",
        "athlete": {
          "id": "ath_xyz789",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com",
          "photoURL": "https://lh3.googleusercontent.com/..."
        }
      },
      {
        "id": "mem_def456",
        "runCrewId": "cmhlg0io60001sj1vlqn13vnx",
        "athleteId": "ath_uvw321",
        "joinedAt": "2024-01-20T07:00:00Z",
        "athlete": {
          "id": "ath_uvw321",
          "firstName": "Jane",
          "lastName": "Smith",
          "email": "jane@example.com",
          "photoURL": null
        }
      }
    ]
  }
}
```

### Frontend Consumption
```javascript
// Extract members from RunCrew response
const members = runCrew.memberships || [];
const memberships = members.map(membership => ({
  id: membership.id,
  athleteId: membership.athleteId,
  joinedAt: membership.joinedAt,
  athlete: membership.athlete,
  // Helper: Full name
  fullName: `${membership.athlete.firstName} ${membership.athlete.lastName}`.trim(),
  // Helper: Display name
  displayName: membership.athlete.firstName || 'Athlete',
  // Helper: Initials for avatar
  initials: `${membership.athlete.firstName?.[0] || 'A'}${membership.athlete.lastName?.[0] || ''}`.toUpperCase()
}));
```

---

## Membership Management

### Roles (via RunCrewManager)
Membership itself does NOT have a role field. Roles are managed via the `RunCrewManager` junction table:

```prisma
model RunCrewManager {
  id        String @id @default(cuid())
  runCrewId String
  athleteId String
  role      String // "admin" or "manager"

  createdAt DateTime @default(now())

  // Relations
  runCrew RunCrew @relation(fields: [runCrewId], references: [id], onDelete: Cascade)
  athlete Athlete @relation("RunCrewManager", fields: [athleteId], references: [id], onDelete: Cascade)

  @@unique([runCrewId, athleteId])
  @@map("run_crew_managers")
}
```

### Checking if Member is Admin
```javascript
const isAdmin = (runCrew.managers || []).some(
  manager => manager.athleteId === athleteId && manager.role === 'admin'
);
```

### Checking if Athlete is Member
```javascript
const isMember = (runCrew.memberships || []).some(
  membership => membership.athleteId === athleteId
);
```

---

## Removing Members

### Delete Membership
```javascript
// DELETE /api/runcrew/:runCrewId/members/:athleteId (future endpoint)
await prisma.runCrewMembership.delete({
  where: {
    runCrewId_athleteId: {
      runCrewId: runCrewId,
      athleteId: athleteId
    }
  }
});
```

### Cascade Behavior
- Deleting a RunCrew → All memberships are deleted (CASCADE)
- Deleting an Athlete → All memberships are deleted (CASCADE)
- Deleting a membership → Athlete and RunCrew remain (safe)

---

## Promoting Members to Admin

### Create Manager Record
```javascript
// POST /api/runcrew/:runCrewId/managers
await prisma.runCrewManager.create({
  data: {
    runCrewId: runCrewId,
    athleteId: athleteId,
    role: 'admin'
  }
});
```

**Note**: Athlete must be a member first (have a RunCrewMembership record).

---

## "No Members" Fallback

### Empty State UI
```jsx
{memberships.length === 0 ? (
  <div className="border border-dashed border-gray-300 rounded-xl p-6 text-center text-sm text-gray-500">
    <p className="mb-2">No members yet.</p>
    <p>Share your invite code to build the crew.</p>
    {/* Show invite panel below */}
  </div>
) : (
  <div className="space-y-3">
    {memberships.map(membership => (
      <MemberCard key={membership.id} membership={membership} />
    ))}
  </div>
)}
```

### Loading State
```jsx
{loadingMembers ? (
  <div className="flex items-center justify-center p-6">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
    <span className="ml-2 text-sm text-gray-500">Loading members...</span>
  </div>
) : (
  // ... member list
)}
```

### Error State
```jsx
{memberError ? (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
    <p className="text-red-800 text-sm mb-2">
      Failed to load members
    </p>
    <button 
      onClick={handleRetryMembers}
      className="text-red-600 text-sm underline"
    >
      Retry
    </button>
  </div>
) : (
  // ... member list
)}
```

---

## Member Display Components

### Member Card (Admin View)
```jsx
function MemberCard({ membership }) {
  const { athlete, joinedAt } = membership;
  const isAdmin = checkIfAdmin(athlete.id); // Check RunCrewManager

  return (
    <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
      {athlete.photoURL ? (
        <img
          src={athlete.photoURL}
          alt={`${athlete.firstName} ${athlete.lastName}`}
          className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white font-semibold text-sm">
          {`${athlete.firstName?.[0] || 'A'}${athlete.lastName?.[0] || ''}`.toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">
          {athlete.firstName} {athlete.lastName}
          {isAdmin && (
            <span className="text-orange-600 text-xs font-bold ml-1">Admin</span>
          )}
        </p>
        {athlete.email && (
          <p className="text-xs text-gray-500 truncate">{athlete.email}</p>
        )}
        <p className="text-xs text-gray-400">
          Joined {new Date(joinedAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
```

---

## Testing Checklist

### Membership Hydration
- [ ] Members load from `/api/runcrew/:id` response
- [ ] Member list shows all athletes in crew
- [ ] Athlete data includes firstName, lastName, photoURL
- [ ] Email is visible for admin view only
- [ ] Joined date displays correctly
- [ ] Admin badge shows for admin members

### Empty States
- [ ] "No members" state displays when array is empty
- [ ] Invite panel is visible in empty state
- [ ] Loading state shows while fetching
- [ ] Error state shows on fetch failure

### Role Display
- [ ] Admin badge appears for admin members
- [ ] Regular members show no badge
- [ ] Role check uses RunCrewManager table

### Member Management (Future)
- [ ] Remove member button works (future endpoint)
- [ ] Promote to admin button works (future endpoint)
- [ ] Cascade delete works correctly
- [ ] Duplicate membership prevented

### Data Integrity
- [ ] Unique constraint prevents duplicate memberships
- [ ] Cascade deletes work on RunCrew/Athlete delete
- [ ] Timestamps update correctly
- [ ] Relations are properly loaded

---

## API Endpoint Notes

**Important**: There is NO separate `/api/runcrew/:id/members` endpoint. Members are included in the main `/api/runcrew/:id` response via the `memberships` relation.

If a separate members endpoint is needed in the future, it should follow this pattern:
```
GET /api/runcrew/:id/members
Returns: Array of memberships with nested athlete data
```

---

## Related Documentation

- `runCrewAdmin-hydration.md` - Full admin page hydration
- `RunCrewArchitecture.md` - Overall RunCrew architecture
- `HYDRATION_ROSTER_V2.md` - Hydration patterns
