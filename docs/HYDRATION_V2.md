# Hydration V2: Athlete-First + RunCrew Manager Context

## Overview

Hydration V2 is a complete refactor of our athlete and crew context management system. It eliminates ghost fields, leverages the `RunCrewManager` junction table as the source of truth, and provides clean, flat context keys for the frontend.

## Key Changes

### 1. Removed Ghost Fields

**DELETED:**
- `runcrewAdminId` field from `RunCrew` model
- `adminRunCrews` relation from `Athlete` model  
- `admin` relation from `RunCrew` model

**WHY:** These fields created a 1-to-1 admin relationship that conflicted with our many-to-many manager system and couldn't be queried efficiently.

### 2. Source of Truth: `RunCrewManager`

The `RunCrewManager` junction table is now the **single source of truth** for all crew roles:

```prisma
model RunCrewManager {
  id        String @id @default(cuid())
  athleteId String
  runCrewId String
  role      String // "admin" | "manager" | "member"
  
  createdAt DateTime @default(now())
  
  athlete Athlete @relation(fields: [athleteId], references: [id])
  runCrew RunCrew @relation(fields: [runCrewId], references: [id])
  
  @@unique([runCrewId, athleteId])
}
```

**Benefits:**
- ✅ Queryable (can find all crews where athlete is admin)
- ✅ Supports multiple roles per athlete
- ✅ No ghost fields or derived state
- ✅ Future-proof for many-to-many expansion

### 3. Backend Hydration

**Endpoint:** `POST /api/athlete/hydrate`

**Prisma Query:**
```javascript
const athlete = await prisma.athlete.findFirst({
  where: { firebaseId },
  include: {
    runCrewMemberships: {
      include: {
        runCrew: {
          include: {
            managers: true,
            memberships: true,
            _count: true
          }
        }
      }
    },
    runCrewManagers: {
      include: {
        runCrew: {
          include: {
            managers: true,
            memberships: true,
            _count: true
          }
        }
      }
    }
  }
});
```

**Response Flattening:**
```javascript
const allCrews = [
  // Manager/Admin crews
  ...athlete.runCrewManagers.map(m => ({
    runCrewId: m.runCrewId,
    role: m.role,
    managerId: m.id,
    runCrew: m.runCrew
  })),
  // Member-only crews (not already in managers)
  ...athlete.runCrewMemberships
    .filter(membership => 
      !athlete.runCrewManagers.some(m => m.runCrewId === membership.runCrewId)
    )
    .map(m => ({
      runCrewId: m.runCrewId,
      role: 'member',
      managerId: null,
      runCrew: m.runCrew
    }))
];

// MVP1: Single crew per athlete
const MyCrew = allCrews[0]?.runCrewId || null;
const MyCrewManagerId = allCrews.find(c => c.role === 'admin')?.managerId || null;
```

**Response Structure:**
```json
{
  "success": true,
  "athlete": {
    "athleteId": "...",
    "email": "...",
    "firstName": "...",
    
    "crews": [...],           // Flattened array with role/managerId
    "MyCrew": "crew123",      // Primary crew ID (MVP1)
    "MyCrewManagerId": "mgr456", // Manager record ID if admin
    
    "runCrews": [...],        // LEGACY: for backward compatibility
    "runCrewManagers": [...], // LEGACY: for backward compatibility
    
    "weeklyActivities": [...],
    "weeklyTotals": {...}
  }
}
```

### 4. Frontend Storage

**LocalStorageAPI Keys:**
```javascript
export const STORAGE_KEYS = {
  athleteId: 'athleteId',
  MyCrew: 'MyCrew',                     // ← NEW: Primary crew ID
  MyCrewManagerId: 'MyCrewManagerId',   // ← NEW: Manager record ID
  // Legacy keys for backward compatibility
  runCrewId: 'runCrewId',
  runCrewManagerId: 'runCrewManagerId'
};
```

**Hydration Flow:**
```javascript
// In Welcome.jsx or AthleteWelcome.jsx
const { success, athlete, weeklyActivities, weeklyTotals } = response.data;

LocalStorageAPI.setFullHydrationModel({
  athlete,
  weeklyActivities,
  weeklyTotals
});

// This stores:
// - athleteId
// - MyCrew (from athlete.MyCrew)
// - MyCrewManagerId (from athlete.MyCrewManagerId)
// - runCrewId (legacy, same as MyCrew)
// - runCrewManagerId (legacy, same as MyCrewManagerId)
```

**Reading Context:**
```javascript
// New V2 way
const myCrew = LocalStorageAPI.getMyCrew();
const myManagerId = LocalStorageAPI.getMyCrewManagerId();

// Legacy way (still works)
const runCrewId = LocalStorageAPI.getRunCrewId();
const managerId = LocalStorageAPI.getRunCrewManagerId();
```

### 5. Migration Path

**Phase 1: Schema Migration (Database)**
```bash
# Remove runcrewAdminId column
npx prisma migrate dev --name remove-runcrew-admin-id

# This will:
# 1. Drop the admin relation
# 2. Remove runcrewAdminId column
# 3. Keep RunCrewManager as source of truth
```

**Phase 2: Code Deployment**
- Backend: Deploy new hydration logic
- Frontend: Deploy V2 LocalStorageAPI
- Both support legacy keys during transition

**Phase 3: Cleanup (Future)**
- Remove legacy `runCrewId` / `runCrewManagerId` keys
- Remove legacy `runCrews` array from response
- Keep only V2 keys (`MyCrew`, `MyCrewManagerId`)

## Benefits

### Before (V1)
❌ Ghost field `runcrewAdminId` not queryable  
❌ Conflicting admin sources (field vs manager table)  
❌ Frontend derived IDs from nested objects  
❌ Fragile localStorage hydration  

### After (V2)
✅ Single source of truth: `RunCrewManager`  
✅ Clean, flat context keys from backend  
✅ Queryable admin/manager relationships  
✅ Future-proof for many-to-many expansion  
✅ Backward compatible during migration  

## Example Usage

### Backend: Check if Athlete is Admin
```javascript
const isAdmin = await prisma.runCrewManager.findFirst({
  where: {
    athleteId: 'athlete123',
    runCrewId: 'crew456',
    role: 'admin'
  }
});
```

### Frontend: Navigate to Admin Dashboard
```javascript
const myCrew = LocalStorageAPI.getMyCrew();
const myManagerId = LocalStorageAPI.getMyCrewManagerId();

if (myCrew && myManagerId) {
  // User is an admin/manager
  navigate('/crew/crewadmin');
} else if (myCrew) {
  // User is a member
  navigate(`/runcrew/${myCrew}`);
} else {
  // User has no crew
  navigate('/runcrew/join');
}
```

## Version History

- **V1 (Legacy):** Used `runcrewAdminId` field + derived context
- **V2 (Current):** Uses `RunCrewManager` table + flat context keys
- **V3 (Future):** Remove all legacy keys, full many-to-many support

---

**Last Updated:** 2025-11-09  
**Status:** ✅ Implemented, Ready for Testing

