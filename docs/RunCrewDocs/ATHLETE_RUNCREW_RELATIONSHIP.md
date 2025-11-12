# Athlete ↔ RunCrew Relationship Architecture

## Current Architecture

### Schema Design

**Athlete Model**:
```prisma
model Athlete {
  id         String @id @default(cuid())
  firebaseId String @unique
  email      String @unique
  
  // NO direct runCrewId field
  // Junction table handles relationship
  
  // Relations
  runCrewMemberships RunCrewMembership[] // Many-to-many via junction table
  runCrewManagers    RunCrewManager[]    // Admin/manager roles
}
```

**RunCrewMembership (Junction Table)**:
```prisma
model RunCrewMembership {
  id        String @id @default(cuid())
  runCrewId String
  athleteId String
  
  joinedAt  DateTime @default(now())
  
  runCrew RunCrew @relation(...)
  athlete Athlete @relation(...)
  
  @@unique([runCrewId, athleteId]) // One membership per athlete per crew
}
```

### Current Relationship Pattern

**Many-to-Many via Junction Table**:
- ✅ Athlete can be in **multiple crews**
- ✅ RunCrew can have **multiple athletes**
- ✅ Junction table (`RunCrewMembership`) is **source of truth**
- ✅ No direct `runCrewId` on Athlete model

### How It Works

**When athlete joins a crew**:
1. `POST /api/runcrew/join` creates `RunCrewMembership` record
2. Junction table stores: `{ runCrewId, athleteId, joinedAt }`
3. Athlete model has NO direct `runCrewId` field

**To get athlete's crews**:
```javascript
// Query via junction table
const athlete = await prisma.athlete.findUnique({
  where: { id: athleteId },
  include: {
    runCrewMemberships: {
      include: { runCrew: true }
    }
  }
});

// athlete.runCrewMemberships = array of memberships
// Each membership has runCrew property
```

---

## Architectural Question

### Option 1: Current (Junction Table Only)
**Pattern**: Many-to-many via `RunCrewMembership`

**Pros**:
- ✅ Supports multiple crews per athlete (future-proof)
- ✅ Clean separation of concerns
- ✅ Junction table is single source of truth
- ✅ Can track `joinedAt` timestamp per membership
- ✅ Can add metadata per membership (role, status, etc.)

**Cons**:
- ❌ No direct `athlete.runCrewId` field (must query junction table)
- ❌ More complex queries (need joins)
- ❌ MVP1 might only need single crew per athlete

---

### Option 2: Direct Field + Junction Table (Hybrid)
**Pattern**: Add `currentRunCrewId` or `primaryRunCrewId` to Athlete

```prisma
model Athlete {
  id              String @id @default(cuid())
  currentRunCrewId String? // Primary/active crew (for MVP1 single-crew)
  
  runCrewMemberships RunCrewMembership[] // Still junction table for multiple crews
}
```

**Pros**:
- ✅ Fast lookup for "current" crew (no join needed)
- ✅ MVP1 optimization (single crew per athlete)
- ✅ Still supports multiple crews via junction table
- ✅ Can query `athlete.currentRunCrewId` directly

**Cons**:
- ❌ Two sources of truth (field + junction table)
- ❌ Need to keep them in sync
- ❌ More complexity

---

### Option 3: Direct Field Only (Single Crew)
**Pattern**: One crew per athlete

```prisma
model Athlete {
  id         String @id @default(cuid())
  runCrewId  String? // Single crew per athlete
  
  runCrew RunCrew? @relation(...)
}
```

**Pros**:
- ✅ Simplest model
- ✅ Fast queries (direct field)
- ✅ MVP1 matches use case (single crew)

**Cons**:
- ❌ Can't support multiple crews (future limitation)
- ❌ Would need migration to junction table later

---

## Current Implementation Reality

### MVP1: Single Crew Per Athlete (De Facto)

**Hydration V2** flattens to single crew:
```javascript
// From athletepersonhydrateRoute.js
const MyCrew = allCrews.length === 1 
  ? allCrews[0].runCrewId 
  : (allCrews[0]?.runCrewId || null);
```

**Frontend** expects single crew:
- `localStorage.setItem('runCrewId', ...)` - single value
- `useHydratedAthlete` hook returns single `runCrewId`
- Components assume one crew

**But schema supports multiple**:
- Junction table allows many-to-many
- Can join multiple crews
- Just not used in MVP1

---

## Recommendation

### Keep Current Architecture (Junction Table Only)

**Why**:
1. ✅ **Future-proof**: Already supports multiple crews
2. ✅ **Clean**: Single source of truth (junction table)
3. ✅ **Flexible**: Can add membership metadata later
4. ✅ **MVP1 works**: Hydration flattens to single crew for MVP1

**If MVP1 needs optimization**:
- Add `currentRunCrewId` field for fast lookup
- Keep junction table for full relationship
- Sync both on join/leave operations
- Use `currentRunCrewId` for MVP1 queries
- Use junction table for future multi-crew features

---

## Join Flow Impact

**Current**: `POST /api/runcrew/join`
- Creates `RunCrewMembership` record
- Upserts athlete (via `AthleteFindOrCreateService`)
- **Does NOT** set `athlete.runCrewId` (field doesn't exist)

**If we add `currentRunCrewId` field**:
- Would also need to: `athlete.update({ currentRunCrewId: runCrewId })`
- Keep junction table + field in sync

---

## Questions to Answer

1. **MVP1**: Single crew per athlete or multiple?
2. **Future**: Will athletes join multiple crews?
3. **Performance**: Is junction table query slow enough to need optimization?
4. **Simplicity**: Is direct field worth the sync complexity?

---

**Current State**: Junction table only, MVP1 uses single crew via hydration flattening

