# Founder Stack Architecture

## Overview
The Founder Stack is a comprehensive backend system for managing founder operations, including tasks, CRM, product management, and roadmaps. This document outlines the architecture, database models, API endpoints, and integration patterns.

## Frontend Application
**Repository**: `gofastfounderoutlook`
**Stack**: React 18 + Vite, Tailwind CSS, shadcn/ui components
**Purpose**: Founder-facing dashboard for managing operations

**Pages**:
- `/` - FounderDashboard (stats, tasks, roadmap links)
- `/personal` - Personal Roadmap (Mindset, Habits, Networking)
- `/gtm` - GTM Roadmap (Go-to-market milestones)
- `/product` - Product Roadmap (Quarterly milestones)
- `/crm` - My CRM (Contact pipelines)

---

## Database Models

### Founder Model
Core user model for founders using Firebase authentication.

```prisma
model Founder {
  id        String @id @default(cuid())
  firebaseId String @unique
  
  // Profile
  firstName String?
  lastName  String?
  email     String @unique
  photoURL  String?
  
  // System
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  tasks         FounderTask[]
  crmContacts   CrmContact[]
  roadmapItems  RoadmapItem[]
}
```

### FounderTask Model
Tasks management for founders - daily, weekly, and long-term tasks.

```prisma
model FounderTask {
  id          String   @id @default(cuid())
  founderId   String
  
  // Task Details
  title       String
  description String?
  status      String   @default("pending") // pending, in_progress, completed, cancelled
  priority    String   @default("medium") // low, medium, high, urgent
  dueDate     DateTime?
  
  // Completion
  completedAt DateTime?
  
  // System
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  founder Founder @relation(fields: [founderId], references: [id], onDelete: Cascade)
}
```

### CrmContact Model
CRM system for managing contacts across different pipelines.

```prisma
model CrmContact {
  id        String @id @default(cuid())
  founderId String
  
  // Contact Info
  name      String
  role      String? // "Founder @ AcmeAI", "CTO @ BetaCo", "Angel", etc.
  email     String?
  company   String?
  
  // Pipeline Management
  pipeline  String // Founders, Collaborators, Funders, Advisors
  status    String @default("New") // New, Warm, Active, Exploring, Cold
  
  // Next Steps
  nextStep  String? // "Coffee chat Thu", "Send 1-pager", "Bi-weekly sync"
  
  // Notes
  notes     String?
  
  // System
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  founder Founder @relation(fields: [founderId], references: [id], onDelete: Cascade)
}
```

### RoadmapItem Model
Unified roadmap system for Product, GTM, and Personal roadmaps.

```prisma
model RoadmapItem {
  id          String @id @default(cuid())
  founderId   String
  
  // Roadmap Classification
  roadmapType String // product, gtm, personal
  
  // Product Roadmap Fields
  quarter     String? // "Q4 2025", "Q1 2026", "Q2 2026"
  
  // Personal Roadmap Fields
  category    String? // Mindset, Habits, Networking
  
  // Item Details
  title       String
  description String?
  status      String @default("pending") // pending, in_progress, completed, cancelled
  
  // Dates
  dueDate     DateTime?
  completedAt DateTime?
  
  // System
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  founder Founder @relation(fields: [founderId], references: [id], onDelete: Cascade)
}
```

---

## API Endpoints

### Base URL
All Founder endpoints are under `/api/founder/*`

### Authentication
All endpoints require Firebase token authentication via `verifyFirebaseToken` middleware.

---

## Tasks API (`/api/founder/tasks`)

### GET `/api/founder/tasks`
Get all tasks for the authenticated founder.

**Query Parameters**:
- `status` (optional): `pending|completed|all` - Filter by status

**Response**:
```json
{
  "success": true,
  "count": 5,
  "tasks": [
    {
      "id": "clx...",
      "title": "Email 3 investor intros",
      "description": "Follow up on yesterday's list",
      "status": "pending",
      "priority": "high",
      "dueDate": "2025-01-15T00:00:00Z",
      "createdAt": "2025-01-10T12:00:00Z"
    }
  ]
}
```

### POST `/api/founder/tasks`
Create a new task.

**Body**:
```json
{
  "title": "Email 3 investor intros",
  "description": "Follow up on yesterday's list",
  "dueDate": "2025-01-15T00:00:00Z",
  "priority": "high"
}
```

**Response**:
```json
{
  "success": true,
  "task": { ... }
}
```

### PUT `/api/founder/tasks/:taskId`
Update a task.

**Body** (all fields optional):
```json
{
  "title": "Updated title",
  "status": "completed",
  "priority": "medium"
}
```

### DELETE `/api/founder/tasks/:taskId`
Delete a task.

---

## CRM API (`/api/founder/crm`)

### GET `/api/founder/crm`
Get all CRM contacts.

**Query Parameters**:
- `pipeline` (optional): `Founders|Collaborators|Funders|Advisors`
- `status` (optional): `New|Warm|Active|Exploring|Cold`

**Response**:
```json
{
  "success": true,
  "count": 8,
  "contacts": [
    {
      "id": "clx...",
      "name": "Alex Rivera",
      "role": "Founder @ AcmeAI",
      "pipeline": "Founders",
      "status": "Warm",
      "nextStep": "Coffee chat Thu",
      "email": "alex@acmeai.com",
      "company": "AcmeAI"
    }
  ]
}
```

### GET `/api/founder/crm/pipelines`
Get contacts grouped by pipeline.

**Response**:
```json
{
  "success": true,
  "pipelines": {
    "Founders": [...],
    "Collaborators": [...],
    "Funders": [...],
    "Advisors": [...]
  }
}
```

### POST `/api/founder/crm`
Create a new CRM contact.

**Body**:
```json
{
  "name": "Alex Rivera",
  "role": "Founder @ AcmeAI",
  "pipeline": "Founders",
  "status": "Warm",
  "nextStep": "Coffee chat Thu",
  "email": "alex@acmeai.com",
  "company": "AcmeAI",
  "notes": "Met at conference"
}
```

**Required**: `name`, `pipeline`
**Optional**: `role`, `status`, `nextStep`, `email`, `company`, `notes`

### PUT `/api/founder/crm/:contactId`
Update a CRM contact.

### DELETE `/api/founder/crm/:contactId`
Delete a CRM contact.

---

## Product Management API (`/api/founder/product`, `/api/founder/gtm`, `/api/founder/personal`)

### GET `/api/founder/product`
Get product roadmap items.

**Query Parameters**:
- `quarter` (optional): `Q4-2025|Q1-2026|Q2-2026`

### GET `/api/founder/gtm`
Get GTM roadmap items.

### GET `/api/founder/personal`
Get personal roadmap items.

**Query Parameters**:
- `category` (optional): `Mindset|Habits|Networking`

### POST `/api/founder/roadmap`
Create a roadmap item (works for product, GTM, and personal).

**Body**:
```json
{
  "roadmapType": "product",
  "quarter": "Q4 2025",
  "title": "Garmin auth hardcoded flow",
  "description": "Implement OAuth flow",
  "status": "pending"
}
```

**Product Roadmap Example**:
```json
{
  "roadmapType": "product",
  "quarter": "Q4 2025",
  "title": "Dashboard scaffolding"
}
```

**GTM Roadmap Example**:
```json
{
  "roadmapType": "gtm",
  "title": "Launch beta program",
  "description": "Onboard 20 early adopters"
}
```

**Personal Roadmap Example**:
```json
{
  "roadmapType": "personal",
  "category": "Mindset",
  "title": "Daily reflection (5 min)"
}
```

### PUT `/api/founder/roadmap/:itemId`
Update a roadmap item.

### DELETE `/api/founder/roadmap/:itemId`
Delete a roadmap item.

---

## Route Files Structure

```
routes/Founder/
├── founderTaskRoute.js      # Tasks CRUD
├── founderCrmRoute.js        # CRM contacts CRUD
└── founderProductRoute.js    # Roadmaps (product, GTM, personal)
```

**Pattern**: Follows standard `[feature]Route.js` naming convention.

---

## Data Flow

### Task Creation Flow
```
Frontend → POST /api/founder/tasks
  → verifyFirebaseToken middleware
  → Get founder by firebaseId
  → Create FounderTask
  → Return task
```

### CRM Contact Creation Flow
```
Frontend → POST /api/founder/crm
  → verifyFirebaseToken middleware
  → Get founder by firebaseId
  → Validate pipeline
  → Create CrmContact
  → Return contact
```

### Roadmap Item Creation Flow
```
Frontend → POST /api/founder/roadmap
  → verifyFirebaseToken middleware
  → Get founder by firebaseId
  → Validate roadmapType
  → Create RoadmapItem
  → Return item
```

---

## Frontend Integration

### Tasks Hydration
```javascript
// Fetch all tasks
const response = await fetch('/api/founder/tasks', {
  headers: {
    'Authorization': `Bearer ${firebaseToken}`
  }
});
const { tasks } = await response.json();

// Create task
await fetch('/api/founder/tasks', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${firebaseToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Email 3 investor intros',
    priority: 'high',
    dueDate: new Date().toISOString()
  })
});
```

### CRM Hydration
```javascript
// Fetch contacts by pipeline
const response = await fetch('/api/founder/crm/pipelines', {
  headers: {
    'Authorization': `Bearer ${firebaseToken}`
  }
});
const { pipelines } = await response.json();

// Create contact
await fetch('/api/founder/crm', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${firebaseToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Alex Rivera',
    role: 'Founder @ AcmeAI',
    pipeline: 'Founders',
    status: 'Warm',
    nextStep: 'Coffee chat Thu'
  })
});
```

### Roadmap Hydration
```javascript
// Fetch product roadmap
const response = await fetch('/api/founder/product', {
  headers: {
    'Authorization': `Bearer ${firebaseToken}`
  }
});
const { items } = await response.json();

// Create roadmap item
await fetch('/api/founder/roadmap', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${firebaseToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    roadmapType: 'product',
    quarter: 'Q4 2025',
    title: 'Dashboard scaffolding'
  })
});
```

---

## Database Schema Migration

### Adding Founder Models to Prisma

After adding models to `prisma/schema.prisma`, deploy to production:

1. **Commit changes**:
```bash
git add prisma/schema.prisma
git commit -m "Add Founder models (Task, CRM, Roadmap)"
git push
```

2. **Render automatically**:
   - Runs `npm run build` (includes `npx prisma db push --accept-data-loss`)
   - Creates new tables: `founders`, `founder_tasks`, `crm_contacts`, `roadmap_items`

3. **Verify tables**:
```bash
npx prisma studio
```

---

## Founder Creation Flow

When a founder first logs in via Firebase:

1. Frontend gets Firebase token
2. Calls `/api/founder/create` (similar to `/api/athlete/create`)
3. Backend finds or creates Founder record
4. Returns founder data

**TODO**: Implement `/api/founder/create` endpoint following the athlete pattern.

---

## Security

### Authentication
- All endpoints require Firebase token via `verifyFirebaseToken` middleware
- Founder records linked to `firebaseId` for authentication

### Authorization
- All queries filter by `founderId` to ensure data isolation
- Founders can only access their own tasks, contacts, and roadmaps

### Validation
- Pipeline values validated: `Founders|Collaborators|Funders|Advisors`
- Roadmap types validated: `product|gtm|personal`
- Task priorities validated: `low|medium|high|urgent`

---

## Future Enhancements

### Phase 1: Core Functionality ✅
- [x] Tasks CRUD
- [x] CRM contacts CRUD
- [x] Roadmap items CRUD
- [x] Pipeline grouping

### Phase 2: Enhanced Features
- [ ] Task recurring patterns
- [ ] CRM activity logging (calls, emails, meetings)
- [ ] Roadmap milestones and dependencies
- [ ] Dashboard stats aggregation
- [ ] Notifications and reminders

### Phase 3: Advanced Features
- [ ] CRM email integration
- [ ] Task templates
- [ ] Roadmap templates
- [ ] Analytics and reporting
- [ ] Export functionality

---

## Testing

### Test Tasks Endpoints
```bash
# Get tasks
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/founder/tasks

# Create task
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test task","priority":"high"}' \
  http://localhost:3001/api/founder/tasks
```

### Test CRM Endpoints
```bash
# Get contacts
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/founder/crm

# Create contact
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Contact","pipeline":"Founders"}' \
  http://localhost:3001/api/founder/crm
```

---

*Last updated: January 2025*
*Author: AI Assistant*

