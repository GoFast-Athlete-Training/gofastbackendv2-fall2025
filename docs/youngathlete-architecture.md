# Young Athlete Architecture

**Last Updated**: January 2025  
**Purpose**: Architecture for young athlete participation system - parent-managed profiles, goal setting, and race result tracking

---

## Overview

The Young Athlete system enables parents to create profiles for their children, set pre-race goals, and track race results. This system is designed to support:

1. **Parent-managed profiles** - Parents authenticate via Firebase and create young athlete profiles
2. **Goal setting** - Pre-race goal setting (pace, distance, motivation, feeling)
3. **Race result tracking** - Link Garmin activities to race results and display on leaderboards
4. **Event-scoped participation** - Each young athlete is tied to a specific event via `eventCode`

**Key Principle**: Parents manage their children's profiles. Young athletes don't have their own accounts - everything flows through the parent's authenticated session.

---

## Data Model

### YoungAthlete Model

```prisma
model YoungAthlete {
  id             String   @id @default(cuid())
  athleteId      String   // Parent athlete ID
  eventCode      String   // Event identifier (e.g., eventId from Event model)
  firstName      String
  lastName       String
  grade          String?
  school         String?
  profilePicUrl  String?
  createdAt      DateTime @default(now())

  // Relations
  athlete Athlete      @relation(fields: [athleteId], references: [id], onDelete: Cascade)
  goals   EventGoal[]
  results EventResult[]

  @@index([athleteId])
  @@index([eventCode])
  @@map("young_athletes")
}
```

**Key Points**:
- `athleteId` = **Required** - Links to parent Athlete (who created/manages this profile)
- `eventCode` = **Required** - Event identifier (currently using Event.id, but stored as string for flexibility)
- One young athlete can have multiple entries for different events (same kid, different races)
- Profile is scoped to both parent (`athleteId`) and event (`eventCode`)

### EventGoal Model

```prisma
model EventGoal {
  id              String   @id @default(cuid())
  youngAthleteId  String
  eventCode       String
  targetDistance  String?
  targetPace      String?
  motivation      String?
  feeling         String?
  createdAt       DateTime @default(now())

  // Relations
  youngAthlete YoungAthlete @relation(fields: [youngAthleteId], references: [id], onDelete: Cascade)

  @@unique([youngAthleteId, eventCode]) // One goal per young athlete per event
  @@index([eventCode])
  @@map("event_goals")
}
```

**Key Points**:
- One goal per young athlete per event (unique constraint)
- All fields are optional - flexible goal setting
- `motivation` = "Who are you running for?"
- `feeling` = "How do you want to feel?"

### EventResult Model

```prisma
model EventResult {
  id                String   @id @default(cuid())
  eventCode         String
  youngAthleteId    String
  authorAthleteId   String   // Parent Garmin-linked athlete
  activityId        String   // Links to AthleteActivity.id
  createdAt         DateTime @default(now())

  // Relations
  youngAthlete YoungAthlete @relation(fields: [youngAthleteId], references: [id], onDelete: Cascade)
  activity     AthleteActivity @relation("EventResultActivity", fields: [activityId], references: [id], onDelete: Cascade)

  @@unique([youngAthleteId, eventCode]) // One result per young athlete per event
  @@index([eventCode])
  @@index([activityId])
  @@map("event_results")
}
```

**Key Points**:
- Links young athlete to parent's Garmin activity
- `authorAthleteId` = Parent who "claims" the activity as the race result
- `activityId` = Links to `AthleteActivity` (Garmin sync spine)
- One result per young athlete per event (can be updated/reclaimed)

---

## Relationships Summary

```
Athlete (parent)
 ├── YoungAthlete (child profile, event-scoped)
 │     ├── EventGoal (pre-race goals)
 │     └── EventResult (post-race result)
 └── AthleteActivity (Garmin sync spine)
       └── EventResult (claimed as race result)
```

**Key Relationships**:
- `YoungAthlete.athleteId` → `Athlete.id` (parent)
- `EventGoal.youngAthleteId` → `YoungAthlete.id` (one-to-many)
- `EventResult.youngAthleteId` → `YoungAthlete.id` (one-to-many)
- `EventResult.activityId` → `AthleteActivity.id` (links to Garmin data)

---

## API Routes

### Young Athlete Routes (`/api/young-athlete`)

**All routes require Firebase authentication** (`verifyFirebaseToken` middleware)

```
POST   /api/young-athlete/register
       → Create young athlete profile
       Body: { athleteId, eventCode, firstName, lastName, grade?, school?, profilePicUrl? }
       Returns: { success, data: { id, ... } }
       Requires: Firebase token + athleteId belongs to authenticated user
       
POST   /api/young-athlete/:id/goal
       → Upsert goal for young athlete
       Body: { eventCode, targetPace?, targetDistance?, motivation?, feeling? }
       Returns: { success, data: goal }
       Requires: Firebase token + young athlete belongs to authenticated parent
       
GET    /api/young-athlete/:id
       → Hydrate young athlete profile with goals and results
       Returns: { success, data: { youngAthlete, goals[], results[] } }
       Requires: Firebase token + young athlete belongs to authenticated parent
```

### Event Result Routes (`/api/event-result`)

```
POST   /api/event-result/claim
       → Claim Garmin activity as race result
       Body: { eventCode, youngAthleteId, authorAthleteId, activityId }
       Returns: { success, data: eventResult }
       Requires: Firebase token + all IDs belong to authenticated user
       
GET    /api/events/:eventCode/leaderboard
       → Public leaderboard (no auth required)
       Returns: { success, data: [ { youngAthlete, activity, goals[] } ] }
       Public: Shows name, grade, school, results, goals (no email)
```

---

## Frontend Flow

### Auth Flow & localStorage Tracking

1. **ParentWelcome** (`/engagement`)
   - Checks Firebase auth
   - Creates/finds athlete via `/api/athlete/create`
   - Stores `athleteId` in localStorage

2. **ParentProfile** (`/engagement/parent-profile`)
   - Updates parent profile
   - Stores `athleteId` + `eventId` in localStorage

3. **YouthRegistration** (`/engagement/youth-registration`)
   - Creates young athlete via `/api/young-athlete/register`
   - Stores `youngAthleteId` + ensures `eventId` in localStorage

4. **PreRaceGoals** (`/engagement/goals`)
   - Sets goal via `/api/young-athlete/:id/goal`
   - Uses `youngAthleteId` + `eventId` from localStorage

5. **YoungAthleteHome** (`/engagement/home`)
   - Hydrates profile via `/api/young-athlete/:id`
   - Shows goals, parent's Garmin activities
   - "Make this my 5K" button → claims activity

6. **Leaderboard** (`/engagement/leaderboard`)
   - Public view via `/api/events/:eventCode/leaderboard`
   - Shows all results for event

### localStorage Keys

- `athleteId` - Parent athlete ID (set after ParentWelcome/ParentProfile)
- `youngAthleteId` - Young athlete ID (set after YouthRegistration)
- `eventId` - Event ID (set after ParentProfile, used as `eventCode` in API calls)

---

## Security & Access Control

### Protected Routes (Firebase Auth Required)
- All `/api/young-athlete/*` routes
- `/api/event-result/claim`
- Frontend pages: ParentProfile, YouthRegistration, PreRaceGoals, YoungAthleteHome

### Public Routes (No Auth Required)
- `/api/events/:eventCode/leaderboard`
- Frontend page: Leaderboard

### Authorization Checks
- Backend verifies `athleteId` belongs to authenticated Firebase user
- Backend verifies `youngAthleteId` belongs to authenticated parent
- Backend verifies `activityId` belongs to authenticated parent
- All checks use `verifyFirebaseToken` middleware

---

## Event Code vs Event ID

**Current Implementation**:
- Database field name: `eventCode` (string)
- Value stored: `eventId` from Event model (e.g., `'cmht9p0800001p21xn5tjp5nc'`)
- Frontend: Uses `getBGR5KEventId()` → returns Event.id
- API: Sends as `eventCode` parameter, backend stores as `eventCode` field

**Why This Design**:
- Flexible - can use Event.id now, but could use event codes/slugs later
- Consistent with existing Event model (Event.id is the primary identifier)
- Future-proof - can migrate to event codes without schema changes

---

## Future Enhancements

1. **Week-to-Week Tracking**
   - Standard flow for young athletes will include weekly progress tracking
   - Training logs, weekly goals, progress metrics
   - This BGR5K use case is "starting at the end" (race day)

2. **Event Config Mapper Service**
   - Centralized event configuration
   - Map event codes to event details
   - Support multiple events with different configs

3. **Multiple Young Athletes**
   - Parents can register multiple children
   - Dashboard showing all young athletes
   - Per-athlete goal tracking

4. **Goal Templates**
   - Pre-defined goal templates per event type
   - Age-appropriate goal suggestions
   - Coach/parent guidance prompts

---

## Key Takeaways

1. ✅ **Parent-managed** - Young athletes don't have accounts, parents manage everything
2. ✅ **Event-scoped** - Each young athlete profile is tied to a specific event
3. ✅ **Goal setting** - Pre-race goals stored in EventGoal model
4. ✅ **Garmin integration** - Race results link to parent's Garmin activities
5. ✅ **Public leaderboard** - Results visible to all (name only, no email)
6. ✅ **localStorage tracking** - `athleteId`, `youngAthleteId`, `eventId` tracked through flow
7. ✅ **Relationships verified** - EventGoal → YoungAthlete relation exists and works

---

**Last Updated**: January 2025  
**Status**: MVP Implementation  
**Next Steps**: Add week-to-week tracking, event config mapper service

