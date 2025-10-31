# Backend Scaffolding Pattern for GoFast

## Overview
Standardized patterns for scaffolding backend routes, folders, and features in `gofastbackendv2-fall2025`. This is a **single backend** serving all frontend applications.

**Architecture Process**: See `architecturebuildprocess.md` for how architecture docs guide the build process. Architecture docs are **source of truth**, not proposals.

---

## Core Backend Structure

### Root Files
```
gofastbackendv2-fall2025/
├── index.js                       # Main entry point - imports and registers all routes
├── package.json                   # Dependencies
├── .env                           # Environment variables
├── render.yaml                    # Render.com deployment config
├── prisma/
│   └── schema.prisma              # Database schema (source of truth for models)
├── config/
│   ├── database.js                # Prisma client initialization
│   ├── athleteColumnConfig.js     # Athlete field metadata
│   └── modelConfig.js             # Universal upsert config
├── middleware/
│   └── firebaseMiddleware.js      # Firebase auth verification
├── services/                      # Business logic
├── routes/                        # All API routes organized by feature
│   ├── Admin/                     # Admin-only routes
│   ├── Athlete/                   # Athlete CRUD
│   ├── Founder/                   # Founder stack routes
│   ├── Garmin/                    # Garmin OAuth & webhooks
│   ├── Strava/                    # Strava OAuth
│   ├── RunCrew/                   # RunCrew management
│   └── Training/                  # Training plans
└── utils/                         # Helper functions
```

---

## Route Architecture

**Key Concept**: Routes are organized by **feature domain**, not by HTTP method. Each feature domain gets a folder with one or more route files.

### Route Folder Naming Convention

**Standard Pattern**: PascalCase folder names

```
routes/
├── Admin/                    # Admin operations
├── Athlete/                  # Athlete CRUD & hydration
├── Founder/                  # Founder stack
├── Garmin/                   # Garmin integration
├── Strava/                   # Strava integration
├── RunCrew/                  # RunCrew management
├── Training/                 # Training plans
└── Company/                  # Company Outlook (future)
```

### Route File Naming Convention

**Standard Pattern**: `[feature][Action]Route.js` (camelCase file, PascalCase folder)

**Examples**:
- `Admin/adminHydrateRoute.js` - Universal hydration
- `Admin/adminUpsertRoute.js` - Universal upsert
- `Athlete/athleteCreateRoute.js` - Athlete creation
- `Athlete/athleteUpdateRoute.js` - Athlete updates
- `Athlete/athleteActivitiesRoute.js` - Activity endpoints
- `Founder/founderTaskRoute.js` - Founder tasks
- `Founder/founderCrmRoute.js` - Founder CRM
- `Garmin/garminUrlGenRoute.js` - OAuth URL generation
- `Garmin/garminActivityRoute.js` - Activity sync

**Why This Pattern**:
- ✅ **Grouped by feature** - All related endpoints in one place
- ✅ **Clear naming** - File name describes functionality
- ✅ **Scalable** - Easy to add new route files per feature
- ✅ **No filename conflicts** - PascalCase folder + camelCase file

---

## Route File Structure

### Standard Route File Template

```javascript
// [Feature] [Action] Route
// Description of what this route file does

import express from 'express';
import { getPrismaClient } from '../../config/database.js';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js'; // If auth needed

const router = express.Router();

/**
 * GET /api/[feature]/[endpoint]
 * Description of endpoint
 * Query params: ?param1=value1&param2=value2
 */
router.get('/[endpoint]', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const firebaseId = req.user?.uid; // If using Firebase auth
    
    // Your business logic here
    
    res.json({
      success: true,
      message: 'Success message',
      data: result
    });
  } catch (error) {
    console.error('❌ ERROR PREFIX:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/[feature]/[endpoint]
 * Create new record
 * Body: { field1: value1, field2: value2 }
 */
router.post('/[endpoint]', verifyFirebaseToken, async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { field1, field2 } = req.body;
    
    // Validation
    if (!field1) {
      return res.status(400).json({
        success: false,
        error: 'Field1 is required'
      });
    }
    
    // Create record
    const result = await prisma.modelName.create({
      data: { field1, field2 }
    });
    
    res.status(201).json({
      success: true,
      message: 'Created successfully',
      data: result
    });
  } catch (error) {
    console.error('❌ ERROR PREFIX:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
```

---

## Route Registration in index.js

**Key Points**:
- Import each router at the top
- Register routes with `app.use('/api/[prefix]', router)`
- **ORDER MATTERS** - More specific routes must come before catch-all routes (e.g., `/:id`)
- Add comments explaining each route block

### Registration Pattern

```javascript
// index.js

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import route files
import featureRouter from './routes/Feature/featureRoute.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '10mb' }));

// Feature routes - ORDER MATTERS!
app.use('/api/feature', specificRouter); // Most specific first
app.use('/api/feature', genericRouter);   // Generic /:id routes last

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', version: '2.0.2' });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 GoFast Backend V2 running on port ${PORT}`);
  await connectDatabase();
});

export default app;
```

---

## Route Organization Principles

### 1. Feature-Based Grouping

All routes for a feature belong in the same folder:
```
routes/
├── Admin/
│   ├── adminHydrateRoute.js    # Universal hydration
│   └── adminUpsertRoute.js     # Universal upsert
├── Athlete/
│   ├── athleteCreateRoute.js   # Athlete CRUD
│   ├── athleteUpdateRoute.js
│   ├── athleteActivitiesRoute.js
│   └── athleteProfileRoute.js
├── Founder/
│   ├── founderTaskRoute.js
│   ├── founderCrmRoute.js
│   └── founderProductRoute.js
```

### 2. One File Per Feature Domain (or Split by Action)

**Option A**: One file per feature (recommended for simple features)
- `Founder/founderTaskRoute.js` - All task endpoints (GET, POST, PUT, DELETE)

**Option B**: Split by action (for complex features)
- `Founder/founderTaskCreateRoute.js` - Create tasks
- `Founder/founderTaskUpdateRoute.js` - Update/delete tasks
- `Founder/founderTaskReadRoute.js` - Read tasks

**Recommended**: Start with Option A, split only if file gets > 500 lines

### 3. Universal Routes

**Admin Routes**: Use universal dispatchers for hydration and upsert

```javascript
// Admin/adminHydrateRoute.js
router.get('/hydrate', async (req, res) => {
  const { entity } = req.query;
  
  // Dispatch to entity-specific handler
  switch (entity) {
    case 'athletes':
      return hydrateAthletes(req, res);
    case 'founders':
      return hydrateFounders(req, res);
    // ... more entities
  }
});

// Also expose direct routes
router.get('/athletes/hydrate', hydrateAthletes);
router.get('/founders/hydrate', hydrateFounders);
```

---

## Common Route Patterns

### 1. CRUD Routes

**Standard CRUD Pattern**:
```javascript
GET    /api/feature          → List all
GET    /api/feature/:id      → Get one
POST   /api/feature          → Create
PUT    /api/feature/:id      → Update full
PATCH  /api/feature/:id      → Update partial
DELETE /api/feature/:id      → Delete
```

### 2. Hydration Routes (Admin)

**Universal Hydration**:
```javascript
GET /api/admin/hydrate?entity=athletes|founders|activities
→ Dispatches to entity-specific handler
```

**Direct Hydration**:
```javascript
GET /api/admin/athletes/hydrate        → All athletes
GET /api/admin/founders/hydrate        → All founders
GET /api/admin/athletes/:id/hydrate    → Single athlete
```

### 3. Upsert Routes (Admin)

**Universal Upsert**:
```javascript
POST /api/admin/upsert?model=founder
Body: { athleteId: 'xxx' }
→ Dispatches to model-specific handler
```

**Direct Upsert**:
```javascript
POST /api/admin/upsert/founder
Body: { athleteId: 'xxx' }
```

### 4. OAuth Routes

**Garmin OAuth Flow**:
```javascript
GET  /api/garmin/auth-url        → Generate OAuth URL
GET  /api/garmin/callback        → OAuth callback
GET  /api/garmin/user            → Get user profile
GET  /api/garmin/activities      → Sync activities
POST /api/garmin/webhook         → Webhook handler
```

---

## Authentication Patterns

### Firebase Middleware

**For User-Facing Routes**:
```javascript
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

router.get('/protected-route', verifyFirebaseToken, async (req, res) => {
  const firebaseId = req.user?.uid; // Extracted by middleware
  // Use firebaseId to find user
});
```

**For Admin Routes**:
- Admin routes typically **don't use Firebase** - they're internal/dashboard only
- Use CORS to restrict access
- Add admin verification if needed (future enhancement)

---

## Error Handling Pattern

**Standard Error Response**:
```javascript
try {
  // Business logic
  res.json({ success: true, data: result });
} catch (error) {
  console.error('❌ ERROR PREFIX:', error);
  res.status(500).json({
    success: false,
    error: error.message
  });
}
```

**Validation Errors** (400 Bad Request):
```javascript
if (!requiredField) {
  return res.status(400).json({
    success: false,
    error: 'Required field is missing'
  });
}
```

**Not Found Errors** (404):
```javascript
if (!record) {
  return res.status(404).json({
    success: false,
    error: 'Record not found'
  });
}
```

---

## Prisma Patterns

### Standard Prisma Query

```javascript
const prisma = getPrismaClient();

// Find many
const records = await prisma.modelName.findMany({
  where: { field: value },
  orderBy: { createdAt: 'desc' }
});

// Find one
const record = await prisma.modelName.findUnique({
  where: { id }
});

// Create
const record = await prisma.modelName.create({
  data: { field1: value1, field2: value2 }
});

// Update
const record = await prisma.modelName.update({
  where: { id },
  data: { field1: newValue }
});

// Delete
await prisma.modelName.delete({
  where: { id }
});
```

---

## Schema-First Development

**CRITICAL**: Always define schema FIRST, then routes follow

**Process**:
1. Define Prisma models in `schema.prisma`
2. Run `npx prisma generate` to create Prisma Client
3. Create route files using Prisma models
4. Test routes

**See**: `architecturebuildprocess.md` for full schema-first process

---

## Adding a New Feature

### Step 1: Define Schema
```prisma
// prisma/schema.prisma
model NewFeature {
  id        String @id @default(cuid())
  name      String
  // ... fields
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Step 2: Generate Prisma Client
```bash
npx prisma generate
```

### Step 3: Create Route File
```bash
# Create folder (if new feature domain)
mkdir routes/NewFeature

# Create route file
touch routes/NewFeature/newFeatureRoute.js
```

### Step 4: Implement Routes
- Copy template from this document
- Implement CRUD endpoints
- Add authentication if needed

### Step 5: Register in index.js
```javascript
// Import
import newFeatureRouter from './routes/NewFeature/newFeatureRoute.js';

// Register
app.use('/api/newfeature', newFeatureRouter);
```

### Step 6: Test
```bash
npm run dev
# Test endpoints
```

---

## File Naming Quick Reference

| What | Pattern | Example |
|------|---------|---------|
| Route folder | PascalCase | `Admin/`, `Founder/` |
| Route file | camelCase + "Route.js" | `adminHydrateRoute.js` |
| Service file | camelCase + "Service.js" | `garminSyncService.js` |
| Config file | camelCase + "Config.js" | `athleteColumnConfig.js` |
| Middleware | camelCase + "Middleware.js" | `firebaseMiddleware.js` |
| Utils | camelCase + ".js" | `redis.js`, `helpers.js` |

---

## Examples

### Working Examples

**Simple Feature** (Founder tasks):
- Folder: `routes/Founder/`
- File: `founderTaskRoute.js`
- Routes: GET /tasks, POST /tasks, PUT /tasks/:id, DELETE /tasks/:id

**Complex Feature** (Admin hydration):
- Folder: `routes/Admin/`
- File: `adminHydrateRoute.js`
- Routes: Universal `/hydrate?entity=X` + direct routes per entity

**OAuth Feature** (Garmin):
- Folder: `routes/Garmin/`
- Files: Multiple route files (one per OAuth step)
- Routes: /auth-url, /callback, /user, /activities, /webhook

---

## Checklist for New Routes

- [ ] Created Prisma model in `schema.prisma`
- [ ] Ran `npx prisma generate`
- [ ] Created route file following naming convention
- [ ] Implemented CRUD endpoints
- [ ] Added authentication (Firebase) if needed
- [ ] Added error handling
- [ ] Added validation
- [ ] Registered route in `index.js`
- [ ] Tested endpoints

---

**Last Updated**: January 2025  
**Pattern Status**: ✅ Standardized and documented  
**Working Examples**: All routes in `routes/` folder

