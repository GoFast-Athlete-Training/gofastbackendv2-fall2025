# RunCrew Member Outlook

Source of truth for the member-facing run crew experience (`RunCrewCentral.jsx`).  
Derived from the admin dashboard data model but focused entirely on engagement and clarity for everyday crew members.

---

## Premise
- This page **is** the member experience. It should feel welcoming, energetic, and immediately useful.
- Hydrate the crew context once (from `LocalStorageAPI.getRunCrewData()`), then render from that local snapshot.
- Never expose admin tooling here—only interactive elements meant for members (RSVP, reactions, chat, etc.).

---

## Data Hydration Contract
Pull the following from the hydrated crew object:
- `crew.name` → primary heading.
- `crew.description` → short subheading/intro copy.
- `crew.logoUrl` → hero image. If missing, display a default icon/avatar (reuse `RunCrewCentralAdmin` fallback asset).
- `crew.memberships` (or `crew.members`) → member roster + metadata.
- `crew.runs` → upcoming events list.
- `crew.announcements` → hero announcement stream.
- `crew.messages` → chat feed.
- `crew.leaderboardEntries` or derived stats → leaderboard cards.

If any section has no data, show optimistic, action-oriented empty states (“No runs yet—ask your captain to schedule the next meetup!”).

---

## Layout Guidance

### Header
- Left-aligned stack: back button, crew name, member count, description.
- Right-aligned meta: logo/avatar, “See who’s here” quick link.
- Reduce empty padding above the fold—following the admin layout spacing.

### Column Strategy
- **Left Column (engagement-first)**:
  1. Announcements (compact, card-style).
  2. Crew Feed / Chat (scrollable, sticky input at bottom).
  3. Upcoming Runs (detailed cards).
- **Right Column (context + action)**:
  1. Who’s Here (avatars, status dots, view-all button).
  2. RSVP Summary for next run (if any).
  3. Leaderboard (toggle metrics).

---

## Component Requirements

### Announcements
- Show the latest announcement in full; collapse older items under “View all announcements”.
- Each announcement: title, author, timestamp, quick emoji reactions.

### Crew Feed / Chat
- Topic chips (`# General`, `# Runs & Training`, etc.).
- Message row: avatar (initial fallback), first/last name, timestamp (`Today`, `Yesterday`, absolute date).
- Support emoji reactions and message count badges.
- Input: placeholder “Drop a note for the crew…”, send button, optional attachment icon.

### Upcoming Runs
- Card fields (pull from `crew.runs`):
  - Run name (`run.title`).
  - Date + time (`date` in friendly format, `time` string).
  - Distance (`totalMiles` with units).
  - Pace (dropdown value from admin form).
  - Meet-up location (`meetUpPoint` + address tooltip).
  - CTA buttons: `Details` (expand inline panel) and `RSVP` (toggle going).
- Details panel should show description, Strava map preview (if URL), RSVP list with avatars, and contact info for the organizer.

### Who’s Here
- Vertical list with avatars, name, role badge (`Admin`, `Captain`, `Member`), activity status (active/away).
- “View all members” link opens roster modal (future work).

### Leaderboard
- Title: “Leaderboard”.
- Toggle pills for metrics: `Miles`, `Total Runs`, `Avg Pace`.
- Rows: rank icon, member avatar, name, metric value. Encourage crew pride (color-coded badges).

---

## Visual Tweaks
- Tighten vertical spacing between sections; avoid large white voids.
- Use consistent card widths and border radii (match admin design tokens).
- Keep typography hierarchy: `text-2xl` for page title, `text-lg` for section headers, `text-sm` for supporting text.
- Icons: align to left edges, use consistent size (20–24px).

---

## Follow-Up Implementation Notes
- Update `RunCrewCentral.jsx` to match this spec.
- Share design tokens/components between admin and member views where possible.
- After member view is cleaned up, iterate on `RunCrewCentralAdmin` to mirror updated components (shared cards, run detail panel, etc.).


