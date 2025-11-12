# Young Athlete Refactor Architecture

**Last Updated**: January 2025  
**Status**: Proposed Refactor  
**Purpose**: Separate parent identity from athlete identity, enable separate Garmin app for young athletes

---

## Architecture Overview

### Key Changes

1. **Parent Model** - Universal personhood for parents (separate from Athlete)
2. **YoungAthlete** - Tied to `Parent` (not `Athlete`)
3. **YoungAthleteActivity** - Separate Garmin activity feed for young athletes
4. **Separate Garmin App** - New Garmin application/flow specifically for young athletes

---

## Data Model

### Parent Model

```prisma
model Parent {
  id         String @id @default(cuid())
  firebaseId String @unique // Firebase auth ID

  // Universal Profile
  firstName    String?
  lastName     String?
  email        String    @unique
  phoneNumber  String?
  photoURL     String?

  // Garmin OAuth (for claiming parent's activities as race results - legacy)
  garmin_user_id       String?   @unique
  garmin_access_token  String?
  garmin_refresh_token String?
  garmin_is_connected  Boolean   @default(false)
  // ... other Garmin fields

  // Relations
  youngAthletes YoungAthlete[]

  @@map("parents")
}
```

**Key Points**:
- Separate identity from `Athlete` model
- Parents have their own Firebase auth flow
- Parents can optionally connect Garmin (for legacy "claim parent's activity" flow)
- One parent can have multiple young athletes

### YoungAthlete Model (Updated)

```prisma
model YoungAthlete {
  id             String   @id @default(cuid())
  parentId       String   // Parent ID (NOT athleteId)
  eventCode      String   // Event identifier
  firstName      String
  lastName       String
  grade          String?
  school         String?
  profilePicUrl  String?
  createdAt      DateTime @default(now())

  // Garmin OAuth 2.0 PKCE Integration (separate Garmin app for young athletes)
  garmin_user_id       String?   @unique
  garmin_access_token  String?
  garmin_refresh_token String?
  garmin_is_connected  Boolean   @default(false)
  // ... other Garmin fields

  // Relations
  parent     Parent                @relation(fields: [parentId], references: [id])
  goals      EventGoal[]
  results    EventResult[]
  activities YoungAthleteActivity[] // Young athlete's own Garmin activities

  @@index([parentId])
  @@index([eventCode])
  @@map("young_athletes")
}
```

**Key Changes**:
- `athleteId` → `parentId` (references `Parent`, not `Athlete`)
- Added Garmin OAuth fields (for separate Garmin app)
- Added `activities` relation to `YoungAthleteActivity[]`

### YoungAthleteActivity Model (New)

```prisma
model YoungAthleteActivity {
  id              String @id @default(cuid())
  youngAthleteId String

  // Source Information
  sourceActivityId String @unique // Garmin's unique activity ID
  source           String @default("garmin")

  // Core Activity Data (matches AthleteActivity structure)
  activityType String?
  activityName String?
  startTime    DateTime?
  duration     Int?
  distance     Float?
  averageSpeed Float?
  calories     Int?
  averageHeartRate Int?
  maxHeartRate     Int?
  elevationGain    Float?
  steps            Int?

  // Location Data
  startLatitude   Float?
  startLongitude  Float?
  endLatitude     Float?
  endLongitude    Float?
  summaryPolyline String?

  // Device Information
  deviceName   String?
  garminUserId String? // Garmin user GUID from webhook

  // Hybrid Data Storage
  summaryData Json? // Summary fields from /garmin/activity
  detailData  Json? // Details from /garmin/details
  hydratedAt  DateTime?

  // Timestamps
  syncedAt      DateTime @default(now())
  lastUpdatedAt DateTime @default(now())
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  youngAthlete YoungAthlete @relation(fields: [youngAthleteId], references: [id])
  eventResults EventResult[] @relation("EventResultYoungAthleteActivity")

  @@index([youngAthleteId])
  @@index([garminUserId])
  @@map("young_athlete_activities")
}
```

**Key Points**:
- Mirrors `AthleteActivity` structure but for young athletes
- Separate Garmin webhook endpoint: `/api/garmin/young-athlete/activity`
- Routes to catch pushes from new Garmin app application
- Each young athlete can have their own Garmin connection

### EventResult Model (Updated)

```prisma
model EventResult {
  id                String   @id @default(cuid())
  eventCode         String
  youngAthleteId    String
  parentId          String?  // Parent who claimed this (optional - for legacy)
  activityId        String?  // Links to YoungAthleteActivity.id (primary)
  parentActivityId  String?  // Links to AthleteActivity.id (legacy - parent's activity)
  createdAt         DateTime @default(now())

  // Relations
  youngAthlete YoungAthlete         @relation(fields: [youngAthleteId], references: [id])
  activity     YoungAthleteActivity? @relation("EventResultYoungAthleteActivity", fields: [activityId], references: [id])
  parentActivity AthleteActivity?    @relation("EventResultParentActivity", fields: [parentActivityId], references: [id])

  @@unique([youngAthleteId, eventCode])
  @@index([eventCode])
  @@index([activityId])
  @@index([parentActivityId])
  @@map("event_results")
}
```

**Key Changes**:
- `authorAthleteId` → `parentId` (optional, for legacy)
- `activityId` → Primary link to `YoungAthleteActivity` (young athlete's own activity)
- `parentActivityId` → Legacy link to `AthleteActivity` (parent's activity claimed as result)

---

## Relationships Summary

```
Parent (universal personhood)
 ├── youngAthletes: YoungAthlete[] (one-to-many)
 │     ├── goals: EventGoal[]
 │     ├── results: EventResult[]
 │     └── activities: YoungAthleteActivity[] (separate Garmin feed)
 │           └── eventResults: EventResult[] (claimed as race result)
 └── (optional) Garmin connection (for legacy "claim parent activity" flow)

Athlete (separate - for RunCrew, training, etc.)
 └── activities: AthleteActivity[] (separate Garmin feed)
       └── eventResults: EventResult[] (legacy - parent's activity claimed as result)
```

---

## Garmin Integration

### Separate Garmin App for Young Athletes

**New Webhook Endpoint**: `/api/garmin/young-athlete/activity`

**Flow**:
1. Young athlete connects Garmin (separate OAuth flow)
2. Garmin pushes activities to `/api/garmin/young-athlete/activity`
3. Webhook routes to `YoungAthleteActivity` model
4. Activities appear in young athlete's feed
5. Parent/young athlete can claim activity as race result

**Webhook Handler**:
- Lookup `YoungAthlete` by `garmin_user_id`
- Map activity data using `GarminFieldMapper`
- Save to `YoungAthleteActivity` table
- Similar to existing `AthleteActivity` webhook flow

---

## Migration Strategy

### Phase 1: Add New Models
1. Add `Parent` model
2. Add `YoungAthleteActivity` model
3. Update `YoungAthlete` to reference `Parent` instead of `Athlete`
4. Update `EventResult` to support both `activityId` and `parentActivityId`

### Phase 2: Data Migration
1. Create `Parent` records from existing `Athlete` records (where they have `youngAthletes`)
2. Update `YoungAthlete.athleteId` → `YoungAthlete.parentId`
3. Migrate existing `EventResult.authorAthleteId` → `EventResult.parentId` (optional)

### Phase 3: API Updates
1. Create `/api/parent/*` routes (separate from `/api/athlete/*`)
2. Create `/api/garmin/young-athlete/activity` webhook endpoint
3. Update existing routes to use `parentId` instead of `athleteId`

### Phase 4: Frontend Updates
1. Update frontend to use `parentId` instead of `athleteId`
2. Create separate parent auth/signup flow
3. Create separate Garmin OAuth flow for young athletes

---

## Benefits

1. **Separation of Concerns**: Parents have separate identity from Athletes
2. **Cleaner Architecture**: Young athletes have their own Garmin feed
3. **Scalability**: Can support multiple Garmin apps (athletes, young athletes, etc.)
4. **Future-Proof**: Easier to add parent-specific features without affecting athlete flow

---

## Key Takeaways

1. ✅ **Parent Model** - Universal personhood, separate from Athlete
2. ✅ **YoungAthlete** - Tied to `Parent`, not `Athlete`
3. ✅ **YoungAthleteActivity** - Separate Garmin activity feed
4. ✅ **Separate Garmin App** - New Garmin application for young athletes
5. ✅ **Backward Compatible** - `EventResult` supports both new and legacy flows

---

**Last Updated**: January 2025  
**Status**: Proposed Refactor - Ready for Implementation

