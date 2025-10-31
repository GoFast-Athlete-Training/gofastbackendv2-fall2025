# RunCrew Architecture

## Overview
RunCrew is a feature that allows athletes to create and join small running groups for accountability and coordination. This is different from RunClubs (larger, organized clubs) - RunCrews are more intimate, like "Life360 circles for runners."

## Database Schema

### RunCrew Model
**Table**: `run_crews`

```prisma
model RunCrew {
  id              String   @id @default(cuid())
  name            String
  joinCode        String   @unique // Unique invite code for joining
  runcrewAdminId  String   // Athlete ID of the admin/creator (using runcrewAdminId to avoid conflict with master adminId)
  
  // System fields
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  admin     Athlete            @relation("RunCrewAdmin")
  memberships RunCrewMembership[]
}
```

**Key Fields:**
- `id`: Unique identifier (cuid)
- `name`: Display name of the crew
- `joinCode`: Unique invite code (user-created, validated for uniqueness)
- `adminId`: Foreign key to Athlete who created/manages the crew

### RunCrewMembership Model
**Table**: `run_crew_memberships`

```prisma
model RunCrewMembership {
  id        String   @id @default(cuid())
  runCrewId String
  athleteId String
  
  // Membership status
  status    String   @default("active") // active, left, removed
  
  // Timestamps
  joinedAt  DateTime @default(now())
  leftAt    DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  runCrew   RunCrew  @relation(fields: [runCrewId], references: [id])
  athlete   Athlete  @relation(fields: [athleteId], references: [id])
  
  @@unique([runCrewId, athleteId]) // Prevent duplicate memberships
}
```

**Key Fields:**
- `runCrewId`: Foreign key to RunCrew
- `athleteId`: Foreign key to Athlete
- `status`: Membership state (active, left, removed)
- `joinedAt`: When athlete joined
- `leftAt`: When athlete left (if applicable)
- Unique constraint prevents same athlete joining same crew twice

### Athlete Relations

```prisma
model Athlete {
  // ... existing fields ...
  
  // RunCrew Relations
  adminRunCrews RunCrew[] @relation("RunCrewAdmin") // Crews this athlete admins
  runCrewMemberships RunCrewMembership[] // Crew memberships
}
```

## Relationships

### One-to-Many: RunCrew → Admin (Athlete)
- Each RunCrew has **one** admin (creator)
- An Athlete can be admin of **multiple** RunCrews
- Relationship: `RunCrew.runcrewAdminId → Athlete.id`

### Many-to-Many: RunCrew ↔ Athlete (via RunCrewMembership)
- Each RunCrew can have **many** members
- Each Athlete can belong to **many** RunCrews
- Junction table: `RunCrewMembership`
- Relationship: `RunCrewMembership.runCrewId → RunCrew.id` and `RunCrewMembership.athleteId → Athlete.id`

## API Endpoints (Planned)

### RunCrew Management

**Create RunCrew**
- `POST /api/runcrew/create`
- Body: `{ name: string, joinCode: string }`
- Auth: Firebase token (adminId from token)
- Returns: `{ success: true, runCrew: RunCrew }`

**Get RunCrew Details**
- `GET /api/runcrew/:id`
- Auth: Firebase token
- Returns: `{ runCrew: RunCrew, members: Athlete[], admin: Athlete }`

**Join RunCrew**
- `POST /api/runcrew/join`
- Body: `{ joinCode: string }`
- Auth: Firebase token (athleteId from token)
- Returns: `{ success: true, membership: RunCrewMembership }`

**Leave RunCrew**
- `DELETE /api/runcrew/:id/leave`
- Auth: Firebase token
- Returns: `{ success: true }`

**Get My RunCrews**
- `GET /api/runcrew/mine`
- Auth: Firebase token
- Returns: `{ runCrews: RunCrew[], memberships: RunCrewMembership[] }`

### Membership Management

**Get RunCrew Members**
- `GET /api/runcrew/:id/members`
- Auth: Firebase token
- Returns: `{ members: Athlete[], admin: Athlete }`

**Remove Member** (Admin only)
- `DELETE /api/runcrew/:id/members/:athleteId`
- Auth: Firebase token (must be admin)
- Returns: `{ success: true }`

## Business Logic

### Join Code Validation
- Must be unique across all RunCrews
- Validation on creation: Check if `joinCode` already exists
- Case-insensitive comparison recommended
- Suggested format: Alphanumeric, 4-12 characters

### Membership Rules
- Athlete can join multiple RunCrews
- Athlete cannot join same RunCrew twice (enforced by unique constraint)
- Admin is automatically added as a member (or separate admin-only role?)
- When athlete leaves, set `status = "left"` and `leftAt = now()`
- When admin removes member, set `status = "removed"` and `leftAt = now()`

### Access Control
- **View RunCrew**: Must be a member or admin
- **Update RunCrew**: Admin only
- **Delete RunCrew**: Admin only
- **Join RunCrew**: Any authenticated athlete (if joinCode is valid)
- **Leave RunCrew**: Member themselves
- **Remove Member**: Admin only

## Frontend Integration

### Data Flow

1. **Create Crew Flow**:
   - User clicks "Start Your Crew" → `CreateCrew.jsx`
   - Enters name and joinCode
   - `POST /api/runcrew/create`
   - Redirects to `RunCrewHome.jsx`

2. **Join Crew Flow**:
   - User clicks "Enter Invite Code" → `JoinCrew.jsx`
   - Enters joinCode
   - `POST /api/runcrew/join`
   - Redirects to `RunCrewHome.jsx`

3. **Display Crew Status**:
   - `AthleteHome.jsx` checks if athlete has any active memberships
   - If no memberships: Show "Join RunCrew" card
   - If has memberships: Show "RunCrew Dashboard" card

## Future Enhancements

- **Events**: Schedule runs within a crew
- **Chat**: In-crew messaging
- **Activity Sharing**: Share Garmin activities with crew
- **Leaderboards**: Track crew performance
- **Notifications**: Alert crew members of activities
- **Admin Transfer**: Transfer admin role to another member
- **Crew Analytics**: Stats on crew performance

## Questions to Resolve

1. **Admin as Member**: Should admin automatically be a member, or separate admin role?
   - **Decision**: Admin is NOT automatically a member - need separate membership record if admin wants to participate

2. **Multiple Admins**: Can a RunCrew have multiple admins?
   - **Decision**: Single admin for MVP, add co-admins later if needed

3. **Join Code Format**: Any restrictions on join code format?
   - **Decision**: Alphanumeric, 4-12 chars, case-insensitive

4. **Member Limit**: Maximum members per crew?
   - **Decision**: No limit for MVP, add later if needed

5. **Deleted Crews**: Soft delete or hard delete?
   - **Decision**: Hard delete for MVP (cascade to memberships)

## Migration Notes

- Old `athlete.runCrewId` field removed (replaced with membership table)
- Existing data migration needed if any athletes had `runCrewId` set
- New tables: `run_crews`, `run_crew_memberships`

