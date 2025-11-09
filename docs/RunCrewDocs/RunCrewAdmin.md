# RunCrew Admin Architecture

**Last Updated**: November 2025  
**Status**: 🚧 In Development  
**Pattern**: Facebook Page / Eventbrite-style admin console – action oriented around runs & events  
**Related**: `RunCrewArchitecture.md` - General RunCrew architecture

---

## Premise

RunCrew Admin behaves like a **Facebook Page admin center** or **Eventbrite organizer dashboard**:
- Splash in, instantly see what you can *create* (runs, events, announcements) that move the crew forward.
- Manage the crew’s brand (logo, description, meet-up point defaults) from the Settings surface.
- Delegate responsibility (managers) so crews remain healthy without bottlenecking on one admin.

**Authentication note**: RunCrew remains an athlete-first identity model. Pages themselves never mint tokens. Every admin action still arrives with the athlete’s Firebase token; the backend rehydrates the crew using `runCrewId` + that athlete. This is deliberate—moving to crew-issued tokens would require new identity flows (`runCrewId + athleteId` combos, additional lookups) and is outside the MVP scope. `verifyFirebaseToken` is strictly an authentication check; crew membership and role gating always happen inside each RunCrew route via Prisma lookups.

"Do stuff, not just see stuff" still applies, but the context is about **programming the calendar** and **keeping members engaged**, not managing a sales pipeline.

---

## Hydration Flow (Current Implementation)

- Admin surfaces fetch fresh data per module via backend routes scoped to the active `runCrewId` (no localStorage cache).
- Entry point: `/crew/crewadmin` (no URL params). Page reads `athleteId`, `runCrewId`, and `runCrewAdminId` from `LocalStorageAPI` (`src/config/LocalStorageConfig.js`). When the admin wants fresh data it posts to `POST /api/runcrew/hydrate` with `{ runCrewId }`, caches the response, and then renders.
- Uses `useHydratedAthlete()` to pull the cached athlete profile and elevate the first `runCrews[0]` entry into `runCrewId`/`runCrewAdminId`. That keeps the backend response athlete-first while the frontend derives the single-crew context it needs for routing.
- `verifyFirebaseToken` only validates the Firebase token; each route enforces membership/admin rights with Prisma before returning data.

---

## Admin Capabilities

### 1. Admin Assignment & Transfer

**Initial Assignment**:
- Admin assigned automatically on RunCrew creation (via `runcrewAdminId`)
- Creator becomes admin by default

**Transfer Admin (Settings UX)**:
- Settings page surfaces **Transfer Admin** CTA
- Admin selects new admin from existing members
- Confirmation modal → updates `runcrewAdminId`
- Previous admin remains member/manager (can be demoted or elevated via roles panel)

### 2. Manager Assignment

**Manager Model**: `RunCrewManager`
- Admin can promote/demote managers through **RunCrewAdminRoles.jsx** (new dedicated UX)
- Managers can create runs/events, post announcements, manage RSVP data (read-only where appropriate)
- Roles UX groups people similar to a Facebook page roles modal (Admin, Manager, Analyst – future)

**Manager Actions**:
- `POST /api/runcrew/:id/managers` - Assign/update manager role
- `DELETE /api/runcrew/:id/managers/:athleteId` - Remove manager role
- Roles panel hydrates managers + members list, supports search and filters

### 3. Settings Hub (Hydration & Brand Control)

`/runcrew-settings/:id` hydrates and updates:
- **Crew Identity**: name, logo (image upload), banner/icon, description, color theme (future)
- **Join Details**: join code (read-only for now), copy invite link, regenerate code (future)
- **Meet-Up Defaults**: preferred meet-up point, city, timezone
- **Transfer Admin**: described above
- **Manager Roles**: quick launch to `RunCrewAdminRoles.jsx`
- **Archive Crew**: soft delete / restore actions (future)

Hydration must include `logo`, `description`, `joinCode`, `meetUpPoint` (future renamed field), and role metadata so the page renders even if no members are present.

### 4. Archive RunCrew (Future)
- Archive from Settings (soft delete)
- Sets `isArchived: true` and `archivedAt`
- Restore action lives alongside archive button

---

## Admin Interface Structure

### Core Admin Actions (Eventbrite-style)

**1. Create Run (RunCrewRun)**
- Title-first layout, then scheduling fork (single vs recurring)
- Requires meet-up point, start time, optional distance/pace
- Inline form inside Run tab (MVP1)

**2. Create Event (RunCrewEvent)**
- Reuses run scheduling primitives once runs stabilized
- Social/non-run activities use same map + meet-up data model (future)

**3. Post Announcement**
- Quick composer (title + content)
- Publishes to crew feed

**4. Manage Members & Roles**
- Members list (left rail) with actions: remove, promote, message (future)
- `RunCrewAdminRoles.jsx` handles role elevation/demotion flows

**5. RSVP Intelligence (Future)**
- View who’s going/maybe/not going per run
- Export RSVP list, message attendees (future)

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
- `POST /api/runcrew/runs/:runId/rsvp`
- Body: `{ status: "going" | "maybe" | "not-going" }`
- Auth: `verifyFirebaseToken`
- Upsert pattern

**Get RSVPs for Run** 🚧:
- `GET /api/runcrew/runs/:runId/rsvps`
- Needed for admin RSVP tab

**Delete RSVP** 🚧:
- `DELETE /api/runcrew/runs/:runId/rsvp`
- Athlete removes their own RSVP

### RSVP Status Values
- `"going"`
- `"maybe"`
- `"not-going"`

---

## Run Lifecycle & Cleanup

**Create**
- `POST /api/runcrew/:runCrewId/runs` creates a run (admin/manager/creator, gating handled in route). The admin UI immediately re-fetches `GET /api/runcrew/:id` and `GET /api/runcrew/:id/runs` to reflect server truth.

**Edit**
- `PATCH /api/runcrew/runs/:runId` updates run logistics (admin, manager, or run creator). Route reconfirms membership/admin role before persisting changes.

**Delete**
- `DELETE /api/runcrew/runs/:runId` removes the run (and cascades RSVPs). The frontend rehydrates runs afterwards so listings collapse without relying on stale caches.

**Auto cleanup (after date)**
- MVP behaviour filters past runs client-side (`RunCrewCentralAdmin.jsx` only renders runs whose `date` is in the future).
- Future enhancement: add a scheduled worker or soft-delete flag to archive historical runs so hydration routes only return upcoming inventory.

---

## Run Creation UX Details (Admin Tab)

### Layout & Fields
- **Title**: first input (standalone) – required
- **Date/Time**: friendly picker with AM/PM toggle (`06:30 AM`)
- **Run Type Fork**:
  - `Single Day` (default)
  - `Recurring` (weekly / custom); collects start date, optional end date, recurrence note
- **Meet-Up Point** (was `location`): primary required field; rename in schema (`meetUpPoint`) during next migration
- **Address Notes**: optional (parking, suite)
- **Distance & Pace**: optional metadata fields remain
- **Map Preview** (future): integrate Google Places + static map post selection

### Future Enhancements
- Save **Recurrence Template** for quick reuse
- Auto-post announcement when run is created
- Export to calendar / generate ICS link

---

## Settings vs Admin Tabs

- **RunCrewCentralAdmin.jsx**: landing hub for runs/events/announcements + members snapshot (Members block left, actions right)
- **RunCrewSettings.jsx** (future): brand/identity + administrative controls
- **RunCrewAdminRoles.jsx**: standalone modal/page invoked from both hub and settings

---

## Implementation Priority (Updated)

### Phase 1: Runs & RSVPs (Active)
1. ✅ Schema ready (`RunCrewRun`, `RunCrewRunRSVP`)
2. 🚧 Inline run creation form redesign (title-first, fork)
3. 🚧 Time picker + AM/PM clarity
4. 🚧 Meet-Up Point rename + Google Places integration (future)
5. 🚧 RSVP admin view

### Phase 2: Settings Hydration & Roles
1. 🚧 Hydrate logo, description, join code, meet-up defaults in settings
2. 🚧 Transfer admin UX
3. 🚧 `RunCrewAdminRoles.jsx` – role management flows
4. 🚧 Manager permissions gating in backend routes

### Phase 3: Events & Announcements Enhancements
1. 🚧 Event creation reuse of run scheduling UX
2. 🚧 Announcement composer polish + scheduling
3. 🚧 Archive crew / restore flows

---

## Key Design Principles

1. **Event Programming First**: Everything orbits around runs & meetups.
2. **Brand Ownership**: Crews feel like pages – logo, description, meet-up defaults.
3. **Delegated Roles**: Admins spread responsibility via managers.
4. **Modular UIs**: Distinct surfaces for hub, settings, roles while sharing hydration payloads.
5. **Soft Delete**: Archive instead of delete (preserve data).

---

## Related Documentation

- **`RunCrewArchitecture.md`** – Overall RunCrew architecture and schema
- **`JoinRunCrew.md`** – Join code invitation system
- **`RunCrewMembership.md`** – Membership capability (used for member management)
- **`../GOFAST_ARCHITECTURE.md`** – Main architecture document

---

**Last Updated**: November 2025  
**Maintained By**: GoFast Development Team

