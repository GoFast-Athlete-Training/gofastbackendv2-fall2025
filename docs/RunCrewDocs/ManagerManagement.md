# RunCrew Manager & Role Management

**Last Updated**: November 2025  
**Status**: 🚧 Planned (Not Built)  
**Pattern**: Role-based access control for crew management  
**Related**: `RunCrewAdmin.md`, `RunCrewArchitecture.md`

---

## Premise

Admins need to delegate responsibility without giving up control.

**Roles**:
- **Admin** - Full control (create/edit/delete runs, manage roles, transfer admin)
- **Manager** - Can create/edit runs, post announcements (no role management)
- **Member** - Can RSVP, view runs, read announcements

**Key Rule**: Only one admin per crew. Managers can be promoted to admin (which demotes current admin to manager).

---

## Role Assignment UX

### Where It Lives

**Settings Page** (future: `/crew/settings`):
- Tab: "Members & Roles"
- List of all members
- Each member shows current role
- Admin can change roles via dropdown

### UX Flow

1. Admin clicks "Settings" from admin dashboard
2. Goes to "Members & Roles" tab
3. Sees list of members with role badges
4. Click member → dropdown: `Member | Manager | Admin`
5. Select new role → confirmation modal
6. Role updates → member gets notification (future)

### Role Change Confirmation

**Promote to Manager**:
```
Make [Name] a manager?

Managers can:
- Create and edit runs
- Post announcements
- Manage RSVPs

[Cancel] [Make Manager]
```

**Promote to Admin** (Transfer):
```
Transfer admin to [Name]?

⚠️ You will become a manager.
[Name] will have full control of the crew.

This cannot be undone without their approval.

[Cancel] [Transfer Admin]
```

**Demote Manager**:
```
Remove [Name] as manager?

They will become a regular member.

[Cancel] [Remove Manager]
```

---

## Transfer Admin Flow

### Current State

**Problem**: No way to transfer admin without backend intervention

**Schema**: `RunCrewManager` junction table tracks roles
```prisma
model RunCrewManager {
  id         String   @id @default(cuid())
  athleteId  String
  runCrewId  String
  role       String   // "admin" | "manager"
  
  athlete    Athlete  @relation(fields: [athleteId], references: [id])
  runCrew    RunCrew  @relation(fields: [runCrewId], references: [id])
  
  @@unique([runCrewId, athleteId, role])
}
```

### Transfer UX (Planned)

**Step 1: Promote to Manager First**
- Admin must first make target member a manager
- This ensures they understand crew management

**Step 2: Transfer Admin**
- From "Members & Roles" tab
- Click current manager → "Promote to Admin"
- Confirmation modal (see above)
- Backend upserts:
  - Target: `role = "admin"`
  - Current admin: `role = "manager"`

**Backend Route** (to build):
```javascript
PATCH /api/runcrew/:runCrewId/transfer-admin
Body: { newAdminAthleteId }

// Validation:
// 1. Current user is admin
// 2. Target is a manager (not just member)
// 3. Target is in the crew
// 4. Atomically swap roles
```

### Edge Cases

**What if target rejects?**
- Future: Add "pending transfer" state
- Target must accept before transfer completes
- Current admin retains control until accepted

**What if current admin leaves?**
- Must transfer admin first
- Cannot leave crew while admin
- Error: "Transfer admin before leaving"

**What if only member?**
- Admin can delete crew
- Or: System auto-promotes oldest member (future)

---

## Manager Permissions

### What Managers Can Do

✅ **Runs**:
- Create runs
- Edit their own runs
- Edit any run (if admin allows - future setting)
- Delete their own runs

✅ **Announcements**:
- Post announcements
- Edit their own announcements

✅ **RSVPs**:
- View RSVP lists
- Export RSVP data (future)

✅ **Members**:
- View member list
- See member details

### What Managers CANNOT Do

❌ **Roles**:
- Change member roles
- Promote/demote managers
- Transfer admin

❌ **Settings**:
- Change crew name
- Change join code
- Delete crew
- Archive crew

❌ **Permissions**:
- Edit other managers' runs (unless admin allows)
- Delete other managers' announcements

---

## Backend Implementation

### Role Check Middleware

```javascript
// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  const { runCrewId } = req.params;
  const { athleteId } = req.user; // from Firebase token
  
  const manager = await prisma.runCrewManager.findFirst({
    where: {
      runCrewId,
      athleteId,
      role: 'admin'
    }
  });
  
  if (!manager) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
  
  next();
};

// Middleware to check if user is manager or admin
const requireManager = async (req, res, next) => {
  const { runCrewId } = req.params;
  const { athleteId } = req.user;
  
  const manager = await prisma.runCrewManager.findFirst({
    where: {
      runCrewId,
      athleteId,
      role: { in: ['admin', 'manager'] }
    }
  });
  
  if (!manager) {
    return res.status(403).json({
      success: false,
      error: 'Manager access required'
    });
  }
  
  next();
};
```

### Role Assignment Route

```javascript
// PATCH /api/runcrew/:runCrewId/members/:athleteId/role
router.patch(
  '/:runCrewId/members/:athleteId/role',
  verifyFirebaseToken,
  requireAdmin, // Only admin can change roles
  async (req, res) => {
    const { runCrewId, athleteId } = req.params;
    const { role } = req.body; // "member" | "manager" | "admin"
    
    // Validation
    if (!['member', 'manager', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role'
      });
    }
    
    // If promoting to admin, use transfer flow
    if (role === 'admin') {
      return res.status(400).json({
        success: false,
        error: 'Use /transfer-admin endpoint to promote to admin'
      });
    }
    
    // Update or create manager record
    if (role === 'manager') {
      await prisma.runCrewManager.upsert({
        where: {
          runCrewId_athleteId_role: {
            runCrewId,
            athleteId,
            role: 'manager'
          }
        },
        create: {
          runCrewId,
          athleteId,
          role: 'manager'
        },
        update: {}
      });
    } else {
      // Demote to member (delete manager record)
      await prisma.runCrewManager.deleteMany({
        where: {
          runCrewId,
          athleteId,
          role: 'manager'
        }
      });
    }
    
    res.json({
      success: true,
      message: `Role updated to ${role}`
    });
  }
);
```

### Transfer Admin Route

```javascript
// PATCH /api/runcrew/:runCrewId/transfer-admin
router.patch(
  '/:runCrewId/transfer-admin',
  verifyFirebaseToken,
  requireAdmin,
  async (req, res) => {
    const { runCrewId } = req.params;
    const { newAdminAthleteId } = req.body;
    const currentAdminId = req.user.athleteId;
    
    // Validate target is a manager
    const targetManager = await prisma.runCrewManager.findFirst({
      where: {
        runCrewId,
        athleteId: newAdminAthleteId,
        role: 'manager'
      }
    });
    
    if (!targetManager) {
      return res.status(400).json({
        success: false,
        error: 'Target must be a manager first'
      });
    }
    
    // Atomic swap
    await prisma.$transaction([
      // Demote current admin to manager
      prisma.runCrewManager.update({
        where: {
          runCrewId_athleteId_role: {
            runCrewId,
            athleteId: currentAdminId,
            role: 'admin'
          }
        },
        data: { role: 'manager' }
      }),
      // Promote target to admin
      prisma.runCrewManager.update({
        where: {
          runCrewId_athleteId_role: {
            runCrewId,
            athleteId: newAdminAthleteId,
            role: 'manager'
          }
        },
        data: { role: 'admin' }
      })
    ]);
    
    res.json({
      success: true,
      message: 'Admin transferred successfully'
    });
  }
);
```

---

## Frontend Components (To Build)

### RunCrewSettings.jsx

**Route**: `/crew/settings`

**Tabs**:
- General (name, description, join code)
- Members & Roles (role management)
- Permissions (future: granular manager permissions)
- Danger Zone (delete crew, archive)

### RoleManagementTab Component

**Features**:
- List all members
- Show current role badges
- Dropdown to change roles (admin only)
- Confirmation modals
- Real-time role updates

**State**:
```javascript
const [members, setMembers] = useState([]);
const [editingMember, setEditingMember] = useState(null);
const [newRole, setNewRole] = useState(null);
const [showConfirmModal, setShowConfirmModal] = useState(false);
```

---

## Future Enhancements

### Granular Permissions

**Admin Settings** (future):
- "Managers can edit any run" (default: own runs only)
- "Managers can delete runs" (default: own runs only)
- "Managers can remove members" (default: no)

### Role Notifications

**Email/Push** (future):
- "You've been promoted to manager!"
- "You're now the admin of [Crew Name]"
- "Your role has been changed to member"

### Pending Transfers

**Two-Step Transfer** (future):
1. Current admin initiates transfer
2. Target receives notification
3. Target accepts/declines
4. Transfer completes on acceptance

### Audit Log

**Track Role Changes** (future):
- Who changed what role when
- Transfer history
- Admin succession log

---

## Related Docs

- `RunCrewAdmin.md` - Admin dashboard features
- `RunCrewArchitecture.md` - Overall architecture
- `JoinRunCrew.md` - Join code system

---

**Last Updated**: November 2025  
**Status**: 🚧 Planned - Not yet implemented

