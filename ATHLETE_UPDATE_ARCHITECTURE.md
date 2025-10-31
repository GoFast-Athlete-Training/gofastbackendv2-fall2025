# Athlete Update Architecture

## Overview
System for updating existing athlete records in the admin dashboard. Focuses on **updating** existing records (not creating new ones). Separate from upsert functionality.

## UX Flow

### Admin Dashboard Flow
1. **List View** (`AdminAthletes.jsx`):
   - View all athletes in a list
   - Click "View" → Navigate to detail page (`/athlete/:id`)
   - Click "Activities" → Navigate to activities page (`/athlete/:id/activities`)
   - Click "Delete" → Delete athlete (with confirmation)

2. **Detail View** (`AthleteDetails.jsx`):
   - View full athlete profile
   - Click "Edit Athlete" → Enter edit mode
   - Make changes → Click "Save Changes"
   - Updates athlete via `PUT /api/athlete/:id`

**Key UX Decision**: Edit happens on detail page, not inline in list. This provides:
- More space for editing fields
- Better context (see full profile while editing)
- Cleaner list view (less clutter)

## Backend Architecture

### Routes (`routes/Athlete/athleteUpdateRoute.js`)

#### PATCH `/api/athlete/update/:athleteId`
- Updates athlete fields
- Uses `AthleteUpdateService` for value-based logic
- Only updates non-null values
- Validates columns against config

#### POST `/api/athlete/bulk-update/:athleteId`
- Bulk update multiple columns at once
- Filters data to only include selected columns
- Uses same validation as single update

#### GET `/api/athlete/config`
- Returns list of updatable columns
- Shows column metadata (type, displayName, description)
- Filters to only `upsertable: true` columns

#### GET `/api/athlete/status/:athleteId`
- Returns status of which fields are populated
- Shows `{ populated: boolean, value: any }` for each column
- Useful for seeing completion status

### Update Service (`services/AthleteUpdateService.js`)

**Value-Based Update Logic:**
1. **Filter Valid Values**: Removes null, undefined, empty strings, empty objects
2. **Validate Columns**: Checks against `athleteColumnConfig` - only `upsertable: true` columns allowed
3. **Update Record**: Uses Prisma `update()` to modify athlete

**Protected Fields:**
- `id` - Primary key (never updatable)
- `firebaseId` - Authentication link (never updatable)
- `createdAt` - System timestamp (never updatable)
- `updatedAt` - Auto-managed by Prisma

**Updatable Fields:**
- Profile fields: `firstName`, `lastName`, `email`, `phoneNumber`, `gofastHandle`, `birthday`, `gender`, `city`, `state`, `primarySport`, `photoURL`, `bio`, `instagram`
- Training fields: `currentPace`, `weeklyMileage`, `trainingGoal`, `targetRace`, `trainingStartDate`
- Match fields: `preferredDistance`, `timePreference`, `paceRange`, `runningGoals`
- Garmin integration fields: `garmin_user_id`, `garmin_access_token`, `garmin_refresh_token`, etc.
- Status: `status` field

### Column Configuration (`config/athleteColumnConfig.js`)

**Purpose**: Centralized configuration of which columns can be updated.

**Structure:**
```javascript
{
  name: 'firstName',
  upsertable: true,
  type: 'string',
  required: false,
  displayName: 'First Name',
  description: 'Athlete first name'
}
```

**Helper Functions:**
- `getUpdatableColumns()` - Returns all columns where `upsertable: true`
- `getAthleteColumnConfig(tableName, columnName)` - Get config for specific column
- `isAthleteUpsertEnabled(tableName)` - Check if upsert is enabled for table
- `getAthletePrimaryKey(tableName)` - Get primary key field name

## Frontend Implementation

### Admin Dashboard (`gofast-user-dashboard`)

**List View (`AdminAthletes.jsx`):**
- Hydrates athletes from `/api/admin/athletes/hydrate`
- Stores in localStorage for caching
- Actions: View, Activities, Edit (navigates to detail), Delete

**Detail View (`AthleteDetails.jsx`):**
- Hydrates single athlete from `/api/admin/athletes/:id/hydrate`
- Edit mode toggles between view/edit
- Updates via `PUT /api/athlete/:id`
- Updates localStorage cache after save

**Update Flow:**
```javascript
// 1. User clicks "Edit Athlete"
handleEdit() → setEditing(true)

// 2. User modifies fields
editData state updates

// 3. User clicks "Save Changes"
handleSave() → PUT /api/athlete/:id with editData

// 4. Backend updates
AthleteUpdateService.updateAthlete() → Prisma update()

// 5. Frontend updates cache
localStorage.setItem('athletesData', updatedData)
```

## API Endpoints

### Primary Update Route
```
PUT /api/athlete/:id
Body: { firstName: "John", lastName: "Doe", ... }
Response: { success: true, athlete: { ... } }
```

### Alternative Routes (via update router)
```
PATCH /api/athlete/update/:athleteId
POST /api/athlete/bulk-update/:athleteId
GET /api/athlete/config
GET /api/athlete/status/:athleteId
```

## Bulk Update

**Current Status**: Backend supports bulk updates via `POST /api/athlete/bulk-update/:athleteId`, but UX not fully explored yet.

**How It Works:**
```javascript
POST /api/athlete/bulk-update/:athleteId
Body: {
  columns: ['firstName', 'lastName', 'email'],
  data: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' }
}
```

**Future UX Considerations:**
- Multi-select columns to update
- Bulk edit form for multiple athletes
- Batch operations from list view

## Security & Validation

1. **Column Validation**: Only `upsertable: true` columns can be updated
2. **Value Filtering**: Null/empty values are ignored
3. **Type Safety**: Column config defines expected types
4. **Protected Fields**: System fields (id, firebaseId, timestamps) cannot be updated

## Differences from Upsert

| Feature | Update | Upsert |
|---------|--------|--------|
| **Purpose** | Modify existing records | Create or update |
| **Assumes** | Record exists | Record may not exist |
| **Use Case** | Admin editing athlete profile | Linking new models to athletes |
| **Route** | `PUT /api/athlete/:id` | `POST /api/[model]/upsert` |
| **Error if missing** | Returns 404 if athlete not found | Creates new record if not found |

## Editable Fields vs. Protected Fields

### ✅ CAN BE EDITED (upsertable: true)

**Profile Information:**
- `firstName` - First name
- `lastName` - Last name
- ~~`email`~~ - Email address ❌ **PROTECTED** (see note below)
- `phoneNumber` - Phone number
- `gofastHandle` - Username/handle
- `birthday` - Date of birth
- `gender` - Gender identity
- `city` - City location
- `state` - State location
- `primarySport` - Primary sport
- `photoURL` - Profile photo URL
- `bio` - Biography
- `instagram` - Instagram handle

**Training & Match Fields:**
- `currentPace`, `weeklyMileage`, `trainingGoal`, `targetRace`, `trainingStartDate`
- `preferredDistance`, `timePreference`, `paceRange`, `runningGoals`

**Integration Fields:**
- `runCrewId` - RunCrew membership
- All Garmin fields (tokens, permissions, sync timestamps)

**Status:**
- `status` - Custom status field

### ❌ CANNOT BE EDITED (upsertable: false)

**System Fields (Protected):**
1. **`id`** - Primary key
   - **Why Protected**: Unique identifier, never changes
   - Changing would break all relationships

2. **`firebaseId`** - Firebase authentication ID
   - **Why Protected**: Links athlete to Firebase auth account
   - Changing would disconnect user from authentication
   - This is the user's authentication identity

3. **`createdAt`** - Record creation timestamp
   - **Why Protected**: Historical record, should never change
   - System-managed timestamp

4. **`updatedAt`** - Last update timestamp
   - **Why Protected**: Auto-managed by Prisma
   - Updates automatically when any field changes

### ⚠️ Email Field - Special Consideration

**Backend Status**: Email IS editable (`upsertable: true`)

**Frontend Status**: Email is NOT editable in UI (read-only display)

**Why Email is Protected in UI:**
- Email is tied to Firebase authentication
- Changing email could disconnect user from auth system
- Email is often used for account recovery
- Changing email requires verification workflow

**Current Implementation:**
- Backend: Email field accepts updates (for future flexibility)
- Frontend: Email shown as read-only text (not editable)
- This protects against accidental email changes that would break auth

**If you need to change email:**
- Currently: Requires direct database update (not recommended)
- Future: Could add admin-only email change endpoint with:
  - Firebase auth email update
  - Email verification
  - Audit trail

**Recommendation**: 
- Keep email read-only in UI (current implementation)
- Backend capability exists for future admin tools if needed

## Field Update Logic

### Value Filtering
- **Null values** → Ignored (won't update to null)
- **Empty strings** → Ignored (won't update to empty)
- **Empty objects** → Ignored
- **Valid values** → Updated

**Example:**
```javascript
// If you send this:
{ firstName: "John", lastName: null, email: "" }

// Only firstName will be updated:
// lastName and email remain unchanged
```

### Column Validation
- Only fields marked `upsertable: true` in config are accepted
- Unknown fields are silently ignored
- System fields are rejected

### Required vs. Optional
- `required: true` in config means field must exist in athlete record
- But you can still update it to a new value (or potentially null if not enforced)
- Currently no strict validation preventing null updates

## Common Update Scenarios

### ✅ Safe Updates
- Profile info: name, bio, location
- Training data: pace, mileage, goals
- Social handles: Instagram, GoFast handle
- RunCrew membership: `runCrewId`

### ⚠️ Update with Caution
- **Garmin tokens**: Be careful with OAuth tokens
- **Primary keys in related tables**: Don't update, use relationship endpoints

### ❌ Never Update (Protected Fields)
- `id` - Primary key
- `firebaseId` - Authentication identity
- `email` - User must change their own email
- `createdAt` - System timestamp
- `updatedAt` - System timestamp

## Future Enhancements

1. **Bulk Update UX**: Explore multi-athlete edit workflows
2. **Field-Level Validation**: Client-side validation before save
3. **Audit Trail**: Track who changed what and when
4. **Permission-Based Updates**: Restrict which fields certain roles can edit
5. **Optimistic Updates**: Update UI immediately, sync with server in background
6. **User Email Change Endpoint**: Allow users to change their own email through authenticated endpoint
7. **Field Change History**: Show history of field updates
8. **Validation Rules**: Prevent invalid values (e.g., future birthdays)

---

**Last Updated**: January 2025  
**Status**: ✅ Update system functional and documented  
**UX Flow**: View Detail → Edit → Save (working effectively)

**Editable Fields**: ~40+ fields can be updated  
**Protected Fields**: 5 fields (id, firebaseId, email, createdAt, updatedAt)

**Security Note**: Email changes are user-only for security. Admins can update profile info, training data, etc., but cannot change authentication-related fields (firebaseId, email).

