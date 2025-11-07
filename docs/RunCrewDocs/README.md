# RunCrew Documentation

**Last Updated**: November 2025  
**Status**: RunCrew is the heartbeat of the GoFast app

---

## Documentation Structure

### 📋 [RunCrewArchitecture.md](./RunCrewArchitecture.md)
**Overall premise, schema, and architecture**

- RunCrew premise and core value
- Complete database schema (all models)
- API endpoints and route structure
- Frontend architecture
- Data flow patterns
- Key design principles

**Use this for**: Understanding the overall RunCrew system, schema relationships, and general architecture.

---

### 👑 [RunCrewAdmin.md](./RunCrewAdmin.md)
**Admin management and control center**

- Admin capabilities (God's eye view)
- Manager assignment system
- Archive functionality
- Run RSVP system
- Event creation
- CRM-style admin interface

**Use this for**: Understanding admin functionality, how to manage RunCrews, and admin-specific features.

---

### 🔗 [JoinRunCrew.md](./JoinRunCrew.md)
**Join code invitation system**

- Join code creation and management
- Join flow (current and future)
- API endpoints for joining
- Frontend components
- Security considerations
- Future enhancements (direct links, etc.)

**Use this for**: Understanding how users join RunCrews, join code system, and invitation flow.

---

### 👥 [RunCrewMembership.md](./RunCrewMembership.md)
**Membership capability and junction table**

- RunCrewMembership schema (junction table)
- Membership mutations (create, upsert)
- Hydration pattern (how memberships are loaded)
- Frontend usage (both admin and member views)
- Security and validation
- Database queries

**Use this for**: Understanding how membership works, how to query members, and how both admin and member views hydrate from the same membership data.

---

### 💬 [RunCrewMessaging.md](./RunCrewMessaging.md)
**WhatsApp-style group messaging**

- RunCrewMessage schema
- API endpoints (create, get messages)
- Frontend implementation (cursor-in-box-and-type)
- Real-time updates (polling/WebSocket)
- Security and validation
- UI/UX design (WhatsApp aesthetic)

**Use this for**: Understanding how RunCrew messaging works, implementing the chat interface, and real-time message updates.

---

## Quick Reference

### Key Concepts

**RunCrew**: A running group/community for accountability and coordination

**Admin**: Creator/manager of RunCrew with full control

**Join Code**: Unique code for inviting members (created by admin)

**Membership**: Junction table linking athletes to RunCrews (many-to-many)

**Hydration**: Single API call that returns all RunCrew data (local-first architecture)

---

## Related Documentation

- **`../GOFAST_ARCHITECTURE.md`** - Main GoFast architecture document
- **`../AthleteAdminArchitecture.md`** - Admin-level RunCrew management

---

**Last Updated**: November 2025  
**Maintained By**: GoFast Development Team

