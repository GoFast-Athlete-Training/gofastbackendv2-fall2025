# RunCrew Admin Dashboard

**Last Updated**: November 2025  
**Status**: ✅ MVP1 Complete  
**Pattern**: Engagement-first admin console  
**Related**: `RunCrewArchitecture.md`, `JoinRunCrew.md`

---

## Premise

Your members need **runs to show up to** and **updates to stay connected**.

**Admin's job**: Program the calendar. Keep the energy high.

**Member View** (`/runcrew/central`):
- See upcoming runs
- RSVP to runs
- Read announcements
- See who's in the crew

**Admin View** (`/crew/crewadmin`):
- Everything members see, PLUS:
- **Create runs** (the heart of the crew)
- **Post announcements** (keep crew engaged)
- **Invite members** (copy/paste invite message)

Not a settings panel. It's an action center.

---

## How It Works

1. **Sign in** → Athlete data loads to `localStorage`
2. **Click "Go to RunCrew"** → Full crew object loads via `POST /api/runcrew/hydrate`
3. **Page renders** → Reads from `localStorage` (instant)
4. **Re-sync button** → Refresh data from backend if needed

**Key Files**:
- `LocalStorageAPI` - centralized storage
- `useHydratedAthlete()` - reads athlete + crew context
- `RunCrewCentralAdmin.jsx` - admin dashboard
- `RunCrewCentral.jsx` - member view

---

## Dashboard Modules

### 1. Announcements

**Purpose**: Engage your crew

**UX**:
- Text box: "What's happening next?"
- Post button
- Recent announcements below (newest first)

**Backend**:
- `POST /api/runcrew/announcements`
- Stored in `crew.announcements`

---

### 2. Create a Run (The Heart)

**Purpose**: Give your crew something to show up to

**Form Fields**:
- **Title** * - "Saturday Sunrise Run"
- **Date** * - date picker
- **Start Time** * - dropdown (5:00 AM - 8:00 PM, 30-min intervals)
- **Meet-Up Point** * - "Central Park – Bethesda Terrace"
- **Meetup Address** - Google Places autocomplete
- **Total Miles** - number
- **Pace** - dropdown (6:00-6:30 Fast → 11:00+ Recovery)
- **Strava Route URL** - inline map preview when pasted
- **Description** - textarea

**How It Works**:
1. Fill form → "Add Run"
2. Run appears immediately (local-first)
3. Backend persists async
4. Edit → modal popup (no scroll, no overlap)

**Backend**:
- `POST /api/runcrew/runs` - create
- `PATCH /api/runcrew/runs/:id` - edit
- `DELETE /api/runcrew/runs/:id` - delete

**Built Features**:
- ✅ Google Places autocomplete
- ✅ Inline Strava map preview
- ✅ Pace dropdown (structured)
- ✅ Time dropdown (no confusing clock icon)
- ✅ Edit modal (clean, no page jump)
- ✅ RSVP count ("X going")
- ✅ Inline details expansion

---

### 3. Upcoming Runs

**Display**:
- Run cards (soonest first)
- Title, date, time, meet-up point
- "X going" RSVP count
- Details button (expands inline)
- Edit button (admin only, modal)

**Inline Details**:
- Distance, pace, address
- Description
- Strava map
- RSVP list with avatars

**Backend**:
- Included in hydrate
- `POST /api/runcrew/runs/:id/rsvp` - RSVP

---

### 4. Members (Left Rail)

**Display**:
- Member count
- Avatar grid
- Admin badge
- "No members yet" state

**Invite UX**:
- "Invite Members" button
- Copy/paste message:
  ```
  Join [Crew Name]!
  
  Go to: athlete.gofastcrushgoals.com/runcrew/join
  Code: [JOIN-CODE]
  ```

**Backend**:
- `crew.memberships` (hydrated)
- `crew.joinCode`

---

### 5. Messages

**Display**:
- Text box to post
- Recent messages below
- Name + timestamp

**Backend**:
- `POST /api/runcrew/messages`
- `crew.messages`

---

## RSVP System

### RunCrewRunRSVP Model
```prisma
model RunCrewRunRSVP {
  id        String   @id @default(cuid())
  runId     String
  athleteId String   // RSVP tied to athleteId
  
  status    String   // "going", "maybe", "not-going"
  
  createdAt DateTime @default(now())
  
  run       RunCrewRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  athlete   Athlete    @relation("RunCrewRunRSVP", fields: [athleteId], references: [id], onDelete: Cascade)
  
  @@unique([runId, athleteId]) // One RSVP per athlete per run
  @@map("run_crew_run_rsvps")
}
```

### Routes

**RSVP**:
- `POST /api/runcrew/runs/:runId/rsvp`
- Body: `{ status: "going" | "maybe" | "not-going" }`
- Upsert pattern

**Status Values**:
- `going`
- `maybe`
- `not-going`

---

## Run Lifecycle

**Create**: `POST /api/runcrew/runs` - Local-first, backend persists async

**Edit**: `PATCH /api/runcrew/runs/:id` - Modal popup, updates local + backend

**Delete**: `DELETE /api/runcrew/runs/:id` - Removes run + cascades RSVPs

**Auto-cleanup**: Client-side filter (only show future runs)

---

## What's Next

See `ManagerManagement.md` for:
- Role assignment UX
- Transfer admin flow
- Manager permissions

---

## Related Docs

- `RunCrewArchitecture.md` - Overall architecture
- `JoinRunCrew.md` - Join code system
- `ManagerManagement.md` - Roles & permissions

---

**Last Updated**: November 2025

