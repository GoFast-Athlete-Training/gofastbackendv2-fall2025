# RunCrew MVP1 Requirements

**Last Updated**: January 2025  
**Status**: Planning Phase

## MVP1 Feature Breakdown

Based on the hardcoded UX, here's what we need to build:

### 1. Announcements ✅ Simple String Field

**Decision**: Add `announcement` field to `RunCrew` model (simple string, admin-only)

**Schema Addition**:
```prisma
model RunCrew {
  // ... existing fields ...
  announcement String? // Admin-only announcement (simple string for MVP1)
}
```

**Why String?**
- MVP1: Single announcement, simple text
- Admin can update it
- Future: Could become separate model if we need multiple announcements, timestamps, etc.

**API**:
- `PUT /api/runcrew/:id` - Update announcement (admin only)
- Included in `GET /api/runcrew/:id` hydration

---

### 2. Who's Here ✅ Already Have This

**Status**: ✅ Already implemented via memberships hydration

**What We Have**:
- `GET /api/runcrew/:id` returns `memberships` with `athlete` details
- Each membership includes: `athlete.firstName`, `athlete.lastName`, `athlete.photoURL`

**Frontend Display**:
- Show member avatars (photoURL or initials)
- Show member names
- Show member count

**No Additional Work Needed** - just display the hydrated data

---

### 3. Messaging (Chat) - MVP1: No Topics

**Decision**: Use existing `RunCrewChatter` model, no topic filtering for MVP1

**Current Schema**:
```prisma
model RunCrewChatter {
  id        String @id @default(cuid())
  runCrewId String
  athleteId String
  content   String
  imageUrl  String?
  likes     Int @default(0)
  createdAt DateTime @default(now())
  // ... relations
}
```

**MVP1 Approach**:
- ✅ All chatter goes to "general" (no topic field needed)
- ✅ Hydrate from `runCrewId` - get all chatter for crew
- ✅ Show chatter from all members (already linked via `athleteId`)
- ✅ Display: author (from `athlete` relation), content, timestamp, likes
- ✅ Comments: Use existing `RunCrewChatterComment` model

**API**:
- `GET /api/runcrew/:id` - Already includes `chatter` with `athlete` and `comments`
- `POST /api/runcrew/:id/chatter` - Create chatter message (needs implementation)
- `POST /api/runcrew/:id/chatter/:chatterId/comments` - Add comment (needs implementation)

**Future Enhancement**:
- Add `topic` field to `RunCrewChatter` for topic filtering (general, tips, social, etc.)

---

### 4. RunCrewRun (Events) - Needs RSVP

**Decision**: Create `RunCrewEvent` model with `RunCrewEventRSVP` junction table

**Schema Addition**:
```prisma
model RunCrewEvent {
  id           String   @id @default(cuid())
  runCrewId    String
  organizerId  String   // Athlete ID who created the event
  
  title        String
  date         DateTime
  time         String   // "6:00 AM"
  location     String
  address      String?
  distance     String?  // "5-8 miles"
  pace         String?  // "8:00-9:00 min/mile"
  description  String?
  stravaRouteId String? // Strava activity ID (optional)
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  // Relations
  runCrew      RunCrew  @relation(fields: [runCrewId], references: [id], onDelete: Cascade)
  organizer    Athlete  @relation(fields: [organizerId], references: [id], onDelete: Cascade)
  rsvps        RunCrewEventRSVP[]
  
  @@map("run_crew_events")
}

model RunCrewEventRSVP {
  id        String   @id @default(cuid())
  eventId   String
  athleteId String   // RSVP tied to athleteId
  
  status    String   // "going", "maybe", "not-going"
  
  createdAt DateTime @default(now())
  
  // Relations
  event      RunCrewEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)
  athlete    Athlete      @relation(fields: [athleteId], references: [id], onDelete: Cascade)
  
  @@unique([eventId, athleteId]) // One RSVP per athlete per event
  @@map("run_crew_event_rsvps")
}
```

**Key Points**:
- ✅ RSVP tied to `athleteId` (one RSVP per athlete per event)
- ✅ Status: "going", "maybe", "not-going"
- ✅ Event linked to `runCrewId` (crew context)
- ✅ Organizer is `athleteId` (who created the event)

**API Endpoints Needed**:
- `POST /api/runcrew/:id/events` - Create event (admin or member)
- `GET /api/runcrew/:id/events` - List events for crew
- `GET /api/runcrew/events/:eventId` - Get event details with RSVPs
- `POST /api/runcrew/events/:eventId/rsvp` - RSVP to event (athleteId from auth)
- `PUT /api/runcrew/events/:eventId/rsvp` - Update RSVP status
- `DELETE /api/runcrew/events/:eventId/rsvp` - Remove RSVP

**Hydration**:
- Include `events` in `GET /api/runcrew/:id` response
- Each event includes `rsvps` with `athlete` details

---

## Implementation Priority

### Phase 1: Core Display (No New Schema)
1. ✅ **Who's Here** - Already works, just display
2. ✅ **Messaging** - Use existing `RunCrewChatter`, no topics
3. 🚧 **Post Creation** - Need `POST /api/runcrew/:id/posts` route

### Phase 2: Simple Additions
4. 🚧 **Announcements** - Add `announcement` string field to `RunCrew`
5. 🚧 **Update Announcement** - `PUT /api/runcrew/:id` route

### Phase 3: Events & RSVP (Schema Addition)
6. 🚧 **RunCrewEvent Model** - Add to schema
7. 🚧 **RunCrewEventRSVP Model** - Add to schema
8. 🚧 **Event Routes** - Full CRUD + RSVP endpoints

---

## Frontend Components Needed

### RunCrewCentral (Member View)
- **Who's Here Section**: Display members from `crew.memberships`
- **Chat Section**: Display posts from `crew.posts` (no topic filtering)
- **Post Input**: Create new post (calls `POST /api/runcrew/:id/posts`)
- **Runs Section**: Display events from `crew.events` (when model ready)
- **RSVP Buttons**: Going/Maybe/Not Going (when model ready)

### RunCrewCentralAdmin (Admin View)
- **Announcements Section**: Display `crew.announcement` (if exists)
- **Update Announcement**: Form to update announcement
- **All Member View Features**: Plus admin actions

---

## Data Flow Summary

```
1. GET /api/runcrew/mine (athleteId lookup)
   ↓
2. User clicks crew → GET /api/runcrew/:id (crew ID becomes primary)
   ↓
3. Response includes:
   - memberships[] (with athlete details) → "Who's Here"
   - posts[] (with athlete, comments) → "Chat"
   - announcement (string) → "Announcements"
   - events[] (with rsvps[]) → "Runs" (when model ready)
```

---

## Next Steps

1. ✅ Document requirements (this file)
2. 🚧 Add `announcement` field to RunCrew schema
3. 🚧 Create post creation route
4. 🚧 Add RunCrewEvent models to schema
5. 🚧 Create event routes
6. 🚧 Update frontend to display all features

