# Founder Routes Patterns

## Overview
Standardized patterns for Founder-related routes in the Founder Stack backend.

**Architecture**: See `founderstackarchitecture.md` for full architecture details.

---

## Key Relationships

### Founder ↔ Athlete
- **Founder** links to **Athlete** via `athleteId`
- Founder IS an Athlete (specialized profile)
- One Founder per Athlete (`athleteId` is `@unique`)
- `Athlete` has `firebaseId` for authentication
- `Founder` does NOT have `firebaseId` directly

### Database Query Flow
```javascript
// ❌ WRONG - Founder doesn't have firebaseId
const founder = await prisma.founder.findUnique({
  where: { firebaseId }
});

// ✅ CORRECT - Find Athlete first, then Founder
const athlete = await prisma.athlete.findFirst({
  where: { firebaseId }
});
const founder = await prisma.founder.findUnique({
  where: { athleteId: athlete.id }
});

// ✅ BETTER - Single query with relation
const founder = await prisma.founder.findFirst({
  where: { athlete: { firebaseId } },
  include: { athlete: true }
});
```

---

## Common Patterns

### 1. CREATE (Upsert) Pattern

**Endpoint**: `POST /api/founder/upsert`

**Flow**:
1. Verify Firebase token
2. Verify `athleteId` belongs to authenticated user
3. Find existing Founder by `athleteId`
4. If found: return it
5. If not: create new Founder

**Code Pattern**:
```javascript
router.post('/upsert', verifyFirebaseToken, async (req, res) => {
  const { athleteId } = req.body;
  const firebaseId = req.user?.uid;
  
  // 1. Verify athlete matches Firebase user
  const athlete = await prisma.athlete.findFirst({
    where: { id: athleteId, firebaseId }
  });
  if (!athlete) return res.status(403).json({ error: 'Unauthorized' });
  
  // 2. Try to find existing Founder
  let founder = await prisma.founder.findUnique({
    where: { athleteId }
  });
  
  // 3. Return if found
  if (founder) {
    return res.json({ success: true, founder });
  }
  
  // 4. Create new Founder
  founder = await prisma.founder.create({
    data: { athleteId }
  });
  
  res.status(201).json({ success: true, founder });
});
```

---

### 2. HYDRATE Pattern

**For User-Facing Routes** (Founder Stack frontend):

**Flow**:
1. Verify Firebase token
2. Find Founder via Athlete relation
3. Load related data (tasks, CRM, roadmaps)
4. Return formatted response

**Code Pattern**:
```javascript
router.get('/hydrate', verifyFirebaseToken, async (req, res) => {
  const firebaseId = req.user?.uid;
  
  // Find Founder via Athlete relation
  const founder = await prisma.founder.findFirst({
    where: { athlete: { firebaseId } },
    include: {
      athlete: { select: { id: true, email: true, firstName: true, lastName: true } },
      tasks: { orderBy: { createdAt: 'desc' } },
      crmContacts: { orderBy: { createdAt: 'desc' } },
      roadmapItems: { orderBy: { createdAt: 'desc' } }
    }
  });
  
  if (!founder) {
    return res.status(404).json({ error: 'Founder not found' });
  }
  
  res.json({
    success: true,
    founder: {
      id: founder.id,
      athleteId: founder.athleteId,
      athlete: founder.athlete,
      tasks: founder.tasks,
      crmContacts: founder.crmContacts,
      roadmapItems: founder.roadmapItems
    }
  });
});
```

---

### 3. CRUD Pattern (Tasks, CRM, Roadmaps)

**Common Pattern for Child Entities**:

**Flow**:
1. Verify Firebase token
2. Find Founder via Athlete relation
3. CRUD operation on child entity
4. Return result

**GET Pattern**:
```javascript
router.get('/tasks', verifyFirebaseToken, async (req, res) => {
  const firebaseId = req.user?.uid;
  const { status = 'all' } = req.query;
  
  // Find Founder
  const founder = await prisma.founder.findFirst({
    where: { athlete: { firebaseId } }
  });
  
  if (!founder) {
    return res.status(404).json({ error: 'Founder not found' });
  }
  
  // Build query
  const where = { founderId: founder.id };
  if (status !== 'all') {
    where.status = status;
  }
  
  const tasks = await prisma.founderTask.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });
  
  res.json({ success: true, tasks });
});
```

**POST Pattern**:
```javascript
router.post('/tasks', verifyFirebaseToken, async (req, res) => {
  const firebaseId = req.user?.uid;
  const { title, description, dueDate, priority } = req.body;
  
  // Validate
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  
  // Find Founder
  const founder = await prisma.founder.findFirst({
    where: { athlete: { firebaseId } }
  });
  
  if (!founder) {
    return res.status(404).json({ error: 'Founder not found' });
  }
  
  // Create
  const task = await prisma.founderTask.create({
    data: {
      founderId: founder.id,
      title: title.trim(),
      description: description?.trim() || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority: priority || 'medium',
      status: 'pending'
    }
  });
  
  res.status(201).json({ success: true, task });
});
```

**UPDATE Pattern**:
```javascript
router.put('/tasks/:taskId', verifyFirebaseToken, async (req, res) => {
  const firebaseId = req.user?.uid;
  const { taskId } = req.params;
  const { title, description, dueDate, priority, status } = req.body;
  
  // Find Founder
  const founder = await prisma.founder.findFirst({
    where: { athlete: { firebaseId } }
  });
  
  if (!founder) {
    return res.status(404).json({ error: 'Founder not found' });
  }
  
  // Verify task belongs to founder
  const existingTask = await prisma.founderTask.findFirst({
    where: { id: taskId, founderId: founder.id }
  });
  
  if (!existingTask) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  // Build update data
  const updateData = {};
  if (title !== undefined) updateData.title = title.trim();
  if (description !== undefined) updateData.description = description?.trim() || null;
  if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
  if (priority !== undefined) updateData.priority = priority;
  if (status !== undefined) updateData.status = status;
  
  // Update
  const task = await prisma.founderTask.update({
    where: { id: taskId },
    data: updateData
  });
  
  res.json({ success: true, task });
});
```

**DELETE Pattern**:
```javascript
router.delete('/tasks/:taskId', verifyFirebaseToken, async (req, res) => {
  const firebaseId = req.user?.uid;
  const { taskId } = req.params;
  
  // Find Founder
  const founder = await prisma.founder.findFirst({
    where: { athlete: { firebaseId } }
  });
  
  if (!founder) {
    return res.status(404).json({ error: 'Founder not found' });
  }
  
  // Delete
  await prisma.founderTask.deleteMany({
    where: { id: taskId, founderId: founder.id }
  });
  
  res.json({ success: true, message: 'Task deleted' });
});
```

---

## Helper Function Pattern

**Create reusable helper** to avoid repeating Founder lookup:

```javascript
// Helper function
async function findFounderByFirebase(firebaseId) {
  const prisma = getPrismaClient();
  return await prisma.founder.findFirst({
    where: { athlete: { firebaseId } },
    include: { athlete: { select: { id: true, email: true, firstName: true, lastName: true } } }
  });
}

// Usage
router.get('/tasks', verifyFirebaseToken, async (req, res) => {
  const firebaseId = req.user?.uid;
  const founder = await findFounderByFirebase(firebaseId);
  
  if (!founder) {
    return res.status(404).json({ error: 'Founder not found' });
  }
  
  // Continue with founder...
});
```

---

## Route Organization

### Files in `routes/Founder/`:

1. **`founderUpsertRoute.js`**
   - `POST /api/founder/upsert` - Create/Find Founder

2. **`founderTaskRoute.js`**
   - `GET /api/founder/tasks` - List tasks
   - `POST /api/founder/tasks` - Create task
   - `PUT /api/founder/tasks/:taskId` - Update task
   - `DELETE /api/founder/tasks/:taskId` - Delete task

3. **`founderCrmRoute.js`**
   - `GET /api/founder/crm` - List contacts
   - `GET /api/founder/crm/pipelines` - Grouped by pipeline
   - `POST /api/founder/crm` - Create contact
   - `PUT /api/founder/crm/:contactId` - Update contact
   - `DELETE /api/founder/crm/:contactId` - Delete contact

4. **`founderProductRoute.js`**
   - `GET /api/founder/product` - Product roadmap
   - `GET /api/founder/gtm` - GTM roadmap
   - `GET /api/founder/personal` - Personal roadmap
   - `POST /api/founder/roadmap` - Create roadmap item
   - `PUT /api/founder/roadmap/:itemId` - Update item
   - `DELETE /api/founder/roadmap/:itemId` - Delete item

---

## Testing Checklist

For each route:
- [ ] Firebase auth verification works
- [ ] Founder lookup via Athlete relation works
- [ ] 404 if Founder not found
- [ ] 403 if athleteId doesn't match Firebase user
- [ ] CRUD operations succeed
- [ ] Data validation works
- [ ] Error handling works

---

**Last Updated**: January 2025  
**Pattern Status**: ✅ Documented

