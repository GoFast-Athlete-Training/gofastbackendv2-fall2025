# RunCrew Admin Architecture

**Last Updated**: November 2025  
**Status**: 🚧 In Development  
**Pattern**: CRM-style admin interface - "Do stuff, not just see stuff"  
**Related**: `RunCrewArchitecture.md` - General RunCrew architecture

---

## Premise

RunCrew Admin provides a **God's eye view** and **functional control** over the RunCrew - the heartbeat of the entire app.

**Core Philosophy**: Admin is a **CRM-style control center** - focused on actions and management, not just viewing data.

---

## Admin Capabilities

### 1. Admin Assignment & Transfer

**Initial Assignment**:
- Admin assigned automatically on RunCrew creation (via `runcrewAdminId`)
- Creator becomes admin by default

**Transfer Admin** (Future):
- Admin can transfer admin role to another member
- Requires confirmation
- Updates `runcrewAdminId` in RunCrew model
- Previous admin becomes regular member

### 2. Manager Assignment

**Manager Model**: `RunCrewManager` (Future - Schema ready)
- Admin can assign managers from existing members
- Managers have delegated permissions:
  - Create runs
  - Post announcements
  - Manage members (add/remove)
  - View admin dashboard (read-only)
- Admin can remove managers

**Manager Actions**:
- `POST /api/runcrew/:id/managers` - Assign manager
- `DELETE /api/runcrew/:id/managers/:athleteId` - Remove manager
- Managers appear in separate list in admin view

### 3. Archive RunCrew

**Archive Functionality**:
- Admin can archive entire RunCrew (soft delete)
- Sets `isArchived: true` and `archivedAt: timestamp`
- Archived crews:
  - Hidden from member lists
  - Can be restored by admin
  - All data preserved
- Archive action in Settings page

**Archive Route**:
- `POST /api/runcrew/:id/archive` - Archive crew (admin only)
- `POST /api/runcrew/:id/unarchive` - Restore crew (admin only)

---

## Admin Interface Structure

### Core Admin Actions (CRM-Style)

**1. Create Run (RunCrewRun)**
- Form: Title, Date, Start Time, Location, Address, Total Miles, Pace, Strava Map URL, Description
- Action: `POST /api/runcrew/:runCrewId/runs`
- Admin-only (MVP1), Managers can create (Future)

**2. Create Event (RunCrewEvent)**
- Form: Title, Date, Time, Location, Address, Description, Event Type
- Action: `POST /api/runcrew/:runCrewId/events`
- For non-running activities (happy hour, social, etc.)

**3. Post Announcement**
- Form: Title, Content
- Action: `POST /api/runcrew/:runCrewId/announcements`
- Admin-only announcements visible to all members

**4. Manage Members**
- View all members
- Remove member: `DELETE /api/runcrew/:id/members/:athleteId`
- Assign manager: `POST /api/runcrew/:id/managers` (Future)

**5. Run RSVP Management**
- View RSVPs for each run
- See who's going, maybe, not going
- Can manually adjust if needed (Future)

---

## Run RSVP System (Priority 1)

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

### RSVP Routes

**Create/Update RSVP** ✅:
- `POST /api/runcrew/runs/:runId/rsvp` - Create or update RSVP
  - Body: `{ status: "going" | "maybe" | "not-going" }`
  - Auth: `verifyFirebaseToken` (athleteId from token)
  - Upsert pattern: Creates if doesn't exist, updates if exists
  - **Status**: ✅ Implemented in `runCrewRunRoute.js`

**Get RSVPs for Run** 🚧:
- `GET /api/runcrew/runs/:runId/rsvps` - Get all RSVPs for a run
  - Returns: Array of RSVPs with athlete details
  - Includes: athlete name, photo, status, createdAt
  - **Status**: 🚧 TODO - Currently included in run hydration

**Delete RSVP** 🚧:
- `DELETE /api/runcrew/runs/:runId/rsvp` - Remove RSVP
  - Auth: `verifyFirebaseToken` (athleteId from token)
  - Only athlete can remove their own RSVP
  - **Status**: 🚧 TODO

### RSVP Status Values

- `"going"` - Athlete is attending
- `"maybe"` - Athlete might attend
- `"not-going"` - Athlete is not attending

---

## Event Creation (RunCrewEvent)

### Event Schema

```prisma
model RunCrewEvent {
  id           String   @id @default(cuid())
  runCrewId    String
  organizerId  String   // Athlete ID who created the event
  
  title        String
  date         DateTime
  time         String   // "6:00 PM"
  location     String
  address      String?
  description  String?
  eventType    String?  // "happy-hour", "social", "meetup", etc.
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  runCrew      RunCrew  @relation(fields: [runCrewId], references: [id], onDelete: Cascade)
  organizer    Athlete  @relation("RunCrewEventOrganizer", fields: [organizerId], references: [id], onDelete: Cascade)
  rsvps        RunCrewEventRSVP[]
  
  @@map("run_crew_events")
}
```

### Event Creation Flow

**Admin Interface**:
- Fill-in form: Title, Date, Time, Location, Address, Description, Event Type
- Save action: `POST /api/runcrew/:runCrewId/events`
- Simple form → save → done (CRM-style)

**Event Routes**:
- `POST /api/runcrew/:runCrewId/events` - Create event (admin/manager)
- `GET /api/runcrew/:runCrewId/events` - List events (included in hydration)
- `PUT /api/runcrew/events/:eventId` - Update event (admin/organizer)
- `DELETE /api/runcrew/events/:eventId` - Delete event (admin/organizer)

---

## Admin View Components

### RunCrewCentralAdmin.jsx Structure

**Admin Actions Section**:
- Create Run button → Opens form → Save
- Create Event button → Opens form → Save
- Post Announcement button → Opens form → Save

**Management Sections**:
- Members List (with remove action)
- Runs List (with RSVP counts)
- Events List
- Announcements List

**Settings**:
- Archive Crew
- Transfer Admin (Future)
- Manager Management (Future)

---

## Implementation Priority

### Phase 1: Run RSVP (Current Priority)
1. ✅ Schema ready (`RunCrewRunRSVP`)
2. ✅ RSVP create/update route implemented (`POST /api/runcrew/runs/:runId/rsvp`)
3. 🚧 Admin view shows RSVPs for runs (frontend)
4. 🚧 Members can RSVP to runs (frontend)
5. 🚧 GET RSVPs route (`GET /api/runcrew/runs/:runId/rsvps`)
6. 🚧 DELETE RSVP route (`DELETE /api/runcrew/runs/:runId/rsvp`)

### Phase 2: Event Creation
1. ✅ Schema ready (`RunCrewEvent`)
2. 🚧 Implement event routes
3. 🚧 Admin form for creating events
4. 🚧 Event list in admin view

### Phase 3: Manager System
1. ✅ Schema ready (`RunCrewManager`)
2. 🚧 Manager assignment routes
3. 🚧 Manager permissions
4. 🚧 Manager UI in admin view

### Phase 4: Archive & Transfer
1. 🚧 Archive route
2. 🚧 Archive UI in settings
3. 🚧 Transfer admin route
4. 🚧 Transfer admin UI

---

## Key Design Principles

1. **CRM-Style**: Focus on actions (create, manage, control) not just viewing
2. **Fill-in & Save**: Simple forms, immediate actions
3. **God's Eye View**: Admin sees everything and can control everything
4. **Modular Actions**: Each admin action is independent (create run, create event, etc.)
5. **Manager Delegation**: Admin can delegate specific permissions to managers
6. **Soft Delete**: Archive instead of delete (preserve data)

---

## Related Documentation

- **`RunCrewArchitecture.md`** - Overall RunCrew architecture and schema
- **`JoinRunCrew.md`** - Join code invitation system
- **`RunCrewMembership.md`** - Membership capability (used for member management)
- **`../GOFAST_ARCHITECTURE.md`** - Main architecture document

---

**Last Updated**: November 2025  
**Maintained By**: GoFast Development Team

