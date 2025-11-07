# Upsert Architecture

**Last Updated**: November 2025  
**Status**: 🚧 MVP1 - In Progress

---

## Premise

At GoFast, we aim to be **nimble** - especially in MVP1. There are needs to add new models to add modularity and make calls easier.

As such, given we are **athlete-first architecture**, we will upsert in an athlete-first way.

---

## How It Works - Two Forks

### 1. Upsert Tool at Base of Admin Dashboard
- Standalone upsert tool accessible from main admin dashboard
- Can select any athlete and upsert any model

### 2. Athlete View on Admin Dashboard
- When viewing a specific athlete's details
- Context-aware: athlete is already selected
- Shows list of models available to upsert for that athlete

---

## Flow

1. **Select Athlete** (if not in athlete view context)
2. **List of Models** - Dropdown shows available models from `upsertConfig.js`
3. **Select Model** - User chooses which model to upsert
4. **Upsert** - System creates/updates the model record
5. **Hydration** - User goes back to home to hydrate that ID on next use

---

## Configuration: `upsertConfig.js`

**Location**: `config/upsertConfig.js`

**Purpose**: Defines which models can be upserted and their configuration

**Structure**:
```javascript
export const UPSERT_CONFIG = {
  models: {
    founder: {
      name: 'Founder',
      description: 'Founder profile',
      prismaModel: 'founder',
      linkField: 'athleteId',
      uniqueField: 'athleteId',
      requiresAdditionalFields: false
    },
    runCrewManager: {
      name: 'RunCrew Manager',
      description: 'Assign RunCrew admin/manager role',
      prismaModel: 'runCrewManager',
      linkField: 'athleteId',
      uniqueField: 'runCrewId_athleteId', // Composite unique
      requiresAdditionalFields: true,
      additionalFields: [
        {
          name: 'runCrewId',
          label: 'RunCrew',
          type: 'select', // Dropdown of available RunCrews
          required: true
        },
        {
          name: 'role',
          label: 'Role',
          type: 'select',
          options: [
            { value: 'admin', label: 'Admin (Owner)' },
            { value: 'manager', label: 'Manager' }
          ],
          required: true
        }
      ]
    }
    // ... more models
  },
  
  getAvailableModels() {
    return Object.entries(this.models).map(([key, config]) => ({
      value: key,
      label: config.name,
      description: config.description
    }));
  },
  
  getModelConfig(modelKey) {
    return this.models[modelKey] || null;
  }
};
```

---

## Routing: Upsert Service Mapper

**Location**: `services/upsertService.js`

**Purpose**: Maps string model value to Prisma model and handles mutation

**Flow**:
```
Route → Service (determine table) → Hit Prisma to mutate
```

**Implementation**:
```javascript
import { getPrismaClient } from '../config/database.js';
import { UPSERT_CONFIG } from '../config/upsertConfig.js';

export const upsertModel = async (modelKey, data) => {
  const prisma = getPrismaClient();
  const modelConfig = UPSERT_CONFIG.getModelConfig(modelKey);
  
  if (!modelConfig) {
    throw new Error(`Unknown model: ${modelKey}`);
  }
  
  const { prismaModel, linkField, uniqueField } = modelConfig;
  
  // Build where clause for unique constraint
  const where = {};
  if (uniqueField.includes('_')) {
    // Composite unique (e.g., runCrewId_athleteId)
    const [field1, field2] = uniqueField.split('_');
    where[field1] = data[field1];
    where[field2] = data[field2];
  } else {
    // Single field unique
    where[uniqueField] = data[linkField || uniqueField];
  }
  
  // Upsert (create or update)
  const result = await prisma[prismaModel].upsert({
    where: where,
    update: data,
    create: data
  });
  
  return result;
};
```

---

## Backend Route

**Location**: `routes/Admin/upsertRoute.js`

**Endpoint**: `POST /api/admin/upsert`

**Request Body**:
```json
{
  "model": "runCrewManager",
  "athleteId": "cmh9pl5in0000rj1wkijpxl2t",
  "runCrewId": "clx123...",
  "role": "admin"
}
```

**Response**:
```json
{
  "success": true,
  "message": "RunCrew Manager upserted successfully",
  "data": {
    "id": "clx456...",
    "runCrewId": "clx123...",
    "athleteId": "cmh9pl5in0000rj1wkijpxl2t",
    "role": "admin"
  }
}
```

**Implementation**:
```javascript
router.post('/upsert', async (req, res) => {
  const { model, athleteId, ...additionalFields } = req.body;
  
  // Validate model exists in config
  const modelConfig = UPSERT_CONFIG.getModelConfig(model);
  if (!modelConfig) {
    return res.status(400).json({
      success: false,
      error: 'Unknown model',
      availableModels: UPSERT_CONFIG.getAvailableModels()
    });
  }
  
  // Build data object
  const data = {
    [modelConfig.linkField]: athleteId,
    ...additionalFields
  };
  
  // Validate required additional fields
  if (modelConfig.requiresAdditionalFields) {
    const required = modelConfig.additionalFields
      .filter(f => f.required)
      .map(f => f.name);
    
    for (const field of required) {
      if (!data[field]) {
        return res.status(400).json({
          success: false,
          error: `Missing required field: ${field}`
        });
      }
    }
  }
  
  // Upsert via service
  try {
    const result = await upsertModel(model, data);
    res.json({
      success: true,
      message: `${modelConfig.name} upserted successfully`,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Upsert failed',
      message: error.message
    });
  }
});
```

---

## Frontend Implementation

### 1. Upsert Tool Component

**Location**: `src/components/UpsertTool.jsx` (or similar)

**Features**:
- Athlete selector (if not in athlete view context)
- Model dropdown (from `upsertConfig.js`)
- Dynamic form fields (based on `additionalFields` in config)
- Submit button

**Flow**:
1. User selects athlete (or athlete is pre-selected in context)
2. User selects model from dropdown
3. If model requires additional fields, show form fields
4. User fills in required fields
5. Submit → Call `POST /api/admin/upsert`
6. Success → User goes back to home to hydrate

### 2. Integration Points

**Admin Dashboard Base**:
- Add "Upsert Tool" button/section
- Opens upsert modal/tool

**Athlete Details View**:
- Add "Add to Model" button
- Opens upsert modal with athlete pre-selected
- Shows available models for that athlete

---

## RunCrewManager Example

**Config Entry**:
```javascript
runCrewManager: {
  name: 'RunCrew Manager',
  description: 'Assign RunCrew admin/manager role',
  prismaModel: 'runCrewManager',
  linkField: 'athleteId',
  uniqueField: 'runCrewId_athleteId', // Composite unique
  requiresAdditionalFields: true,
  additionalFields: [
    {
      name: 'runCrewId',
      label: 'RunCrew',
      type: 'select',
      required: true,
      // Frontend will fetch available RunCrews
      fetchOptions: '/api/runcrew/mine' // Or admin endpoint
    },
    {
      name: 'role',
      label: 'Role',
      type: 'select',
      options: [
        { value: 'admin', label: 'Admin (Owner)' },
        { value: 'manager', label: 'Manager' }
      ],
      required: true
    }
  ]
}
```

**Usage**:
1. Admin selects athlete
2. Selects "RunCrew Manager" from model dropdown
3. System shows:
   - RunCrew dropdown (fetched from API)
   - Role dropdown (admin/manager)
4. Admin fills in and submits
5. System upserts RunCrewManager record
6. User goes back to home to hydrate

---

## Key Design Principles

1. **Athlete-First**: All upserts link back to `athleteId`
2. **Config-Driven**: Models defined in `upsertConfig.js` - no hardcoding
3. **Universal Pattern**: Same flow for all models
4. **Context-Aware**: Can work standalone or in athlete view
5. **Hydration Required**: After upsert, user must hydrate to see changes

---

## Implementation Status

### ✅ Completed
- Basic universal upsert pattern exists (`adminUpsertRoute.js`)
- `MODEL_CONFIG` exists (needs to be renamed/refactored to `upsertConfig.js`)

### 🚧 In Progress
- Refactor `MODEL_CONFIG` → `upsertConfig.js`
- Create `upsertService.js` mapper
- Add RunCrewManager to config
- Frontend upsert tool component
- Integration into admin dashboard

### 📋 TODO
- Build `upsertConfig.js` with RunCrewManager
- Build `upsertService.js` mapper
- Build frontend upsert tool component
- Add to admin dashboard base
- Add to athlete details view
- Test end-to-end flow

---

## Related Documentation

- **[AthleteAdminArchitecture.md](./AthleteAdminArchitecture.md)** - Admin dashboard architecture
- **[RunCrewArchitecture.md](./RunCrewDocs/RunCrewArchitecture.md)** - RunCrew system architecture
- **[RunCrewAdmin.md](./RunCrewDocs/RunCrewAdmin.md)** - RunCrew admin capabilities

---

**Last Updated**: November 2025  
**Maintained By**: GoFast Development Team

