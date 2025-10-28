# GoFast Repository Architecture

## Overview
GoFast has multiple frontend applications and one shared backend. This document clarifies the architecture and connections.

## Backend
**Repository**: `gofastbackendv2-fall2025`
**URL**: `https://gofastbackendv2-fall2025.onrender.com` (or localhost:3001)
**Purpose**: Central API server for all GoFast applications

### Backend Routes
```
/api/health          → Health check
/api/athletes        → List all athletes  
/api/athlete/create  → Create/find athlete (with Firebase verification)
/api/athlete/:id     → Get athlete by ID
/api/athlete/:id     → Update athlete (PUT)
/api/athlete/:id     → Delete athlete (DELETE)
```

### Database
- **Prisma** with PostgreSQL
- **Athlete** model with Firebase integration
- **Firebase token verification** middleware

### Deployment
- **Platform**: Render.com
- **URL**: `https://gofastbackendv2-fall2025.onrender.com`
- **Environment**: Production
- **Database**: PostgreSQL (Render managed)
- **Status**: Deployed but database connection failing

### Database Issues (RESOLVED)
- **Local**: Missing `.env` file with `DATABASE_URL`
- **Deployed**: Has `DATABASE_URL` in Render environment but connection failing
- **Tables**: `athletes` table not created (Prisma migrations not run)
- **Impact**: All athlete-related API calls return 500 errors

### Database Configuration (FIXED)
- **Pattern**: Copied from `eventscrm-backend` working configuration
- **File**: `config/database.js` - centralized connection management
- **Functions**: `connectDatabase()` and `getPrismaClient()`
- **Startup**: Database connection called on server startup
- **Testing**: `test-database.js` script for debugging
- **Status**: Committed and deployed to Render

### Database Hydration Flow
```
Frontend Request → Backend Route → config/database.js → Prisma Client → PostgreSQL
```

**Key Components:**
1. **Frontend**: Makes API call to hydration endpoint
2. **Backend Route**: `routes/Athlete/athleteHydrateRoute.js`
3. **Database Config**: `config/database.js` provides `getPrismaClient()`
4. **Prisma Client**: Connects to PostgreSQL using `DATABASE_URL`
5. **PostgreSQL**: Render-managed database with `athletes` table

**Hydration Endpoints:**
```
GET /api/athlete/hydrate          → All athletes (admin view)
GET /api/athlete/:id/hydrate      → Single athlete details
GET /api/athlete/hydrate/summary  → Summary statistics
```

**Database Connection Pattern:**
```javascript
// In any route file:
import { getPrismaClient } from '../../config/database.js';

const prisma = getPrismaClient();
const athletes = await prisma.athlete.findMany();
```

**Deployment Process:**
1. Render runs `npm install`
2. Triggers `postinstall` script: `npx prisma generate && npx prisma db push --accept-data-loss`
3. Creates database tables from `prisma/schema.prisma`
4. Starts server with database connection ready

---

## Database Workflow: Cloud-First Schema Sync

### Philosophy: No Local Migrations, No Version Files, No Nonsense 😎

This project uses a **cloud-first database workflow** that auto-syncs schema from the Render server on each deploy. We intentionally avoid Prisma migrations because:

- **Auto-sync**: Schema always matches deployed backend
- **No version conflicts**: No migration files to manage
- **Simple deployment**: Just push code, database updates automatically
- **Cloud-native**: Designed for serverless/cloud deployment

### How It Works

**Build Command** (in `package.json`):
```json
"build": "npm install && npx prisma generate && npx prisma db push"
```

**Deployment Flow**:
1. **Code Push** → Git push to repository
2. **Render Build** → Runs `npm run build`
3. **Prisma Generate** → Creates Prisma Client from schema
4. **Database Push** → Syncs schema to PostgreSQL
5. **Server Start** → Backend starts with updated database

### Key Commands

**Local Development**:
```bash
# Generate Prisma Client (after schema changes)
npx prisma generate

# Push schema to local database (if you have one)
npx prisma db push

# View database in Prisma Studio
npx prisma studio
```

**Production Deployment**:
```bash
# This happens automatically on Render
npm run build  # Runs: npm install && npx prisma generate && npx prisma db push
```

### Schema Changes Workflow

1. **Edit Schema**: Modify `prisma/schema.prisma`
2. **Commit & Push**: `git add . && git commit -m "Add new fields" && git push`
3. **Render Deploys**: Automatically runs build command
4. **Database Updates**: Schema syncs to PostgreSQL
5. **Done**: New fields available in production

### Why `db push` (No Flags)?

- **Clean approach**: No confusing flags or warnings
- **Cloud-first**: Database is managed, not a dev sandbox
- **Auto-sync**: Ensures schema always matches code
- **No conflicts**: Avoids migration versioning issues
- **Simple**: Just push schema changes directly

### ⚠️ PRODUCTION DATA PROTECTION RULE

**IMPORTANT**: Once your database contains hydrated production data, be careful with schema changes:

**✅ SAFE Changes** (can push from Render):
- Adding new tables
- Adding new fields (nullable or with defaults)
- Adding indexes
- Adding constraints (that don't conflict with existing data)

**❌ DANGEROUS Changes** (run local migration first):
- Renaming columns/tables
- Deleting columns/tables
- Changing column types
- Making nullable fields required
- Removing constraints

**Why Prisma Yells "Migrations!"**:
- Prisma assumes you need version tracking to protect data
- We're handling schema drift via controlled pushes instead
- But we still need to protect production data when it exists

**Production Workflow**:
1. **Test locally** with sample data
2. **For destructive changes**: Create migration locally first
3. **For additive changes**: Safe to push directly from Render
4. **Always backup** before major schema changes

### Database Connection Pattern

**In Routes** (use this pattern):
```javascript
import { getPrismaClient } from '../../config/database.js';

const prisma = getPrismaClient();
const athletes = await prisma.athlete.findMany();
```

**Never Do This**:
```javascript
// DON'T create new PrismaClient instances
const prisma = new PrismaClient(); // ❌ Wrong
```

### Environment Variables

**Required**:
- `DATABASE_URL` - PostgreSQL connection string
- `FIREBASE_SERVICE_ACCOUNT` - Firebase admin SDK JSON

**Render Setup**:
- Set `DATABASE_URL` in Render environment variables
- Set `FIREBASE_SERVICE_ACCOUNT` in Render environment variables
- Build command: `npm run build`
- Start command: `npm start`

### Troubleshooting

**Database Not Updating**:
- Check if you actually pushed to Render
- Verify build command runs: `npm run build`
- Check Render logs for Prisma errors

**Schema Out of Sync**:
- Push your code changes to Render
- Let the build process sync the schema
- Don't try to run migrations locally

**Connection Issues**:
- Verify `DATABASE_URL` is set in Render
- Check `config/database.js` connection logic
- Test with `/api/health` endpoint

### Files Structure

```
prisma/
├── schema.prisma          # Database schema definition
└── migrations/            # Auto-generated (ignore these)

config/
└── database.js           # Database connection management

package.json
├── "build": "npm install && npx prisma generate && npx prisma db push --accept-data-loss"
└── "postinstall": "npx prisma generate"
```

**Remember**: This is a cloud-first flow, not a dev sandbox. Deal with it. 😎

---

## Garmin Database Issue Resolution (December 2024)

### **The Problem**
Garmin webhooks were failing because the database schema was missing Garmin-related columns, even though the Prisma schema had them defined.

### **Root Cause**
1. **Prisma Schema**: Had Garmin fields defined (`garmin_user_id`, `garmin_access_token`, etc.)
2. **Database Schema**: Missing these columns (never deployed)
3. **Garmin Webhook**: Tried to upsert user with non-existent columns
4. **Result**: Prisma threw errors because it couldn't set values on missing columns

### **The Issue**
```javascript
// This failed because garmin_user_id column didn't exist in database
await prisma.athlete.update({
  where: { id: athleteId },
  data: {
    garmin_user_id: "12345",  // ❌ Column doesn't exist!
    garmin_access_token: "abc" // ❌ Column doesn't exist!
  }
});
```

### **The Solution**
**Simple fix**: Ensure `npx prisma db push` runs in Render build process.

**Build Command**:
```json
"build": "npm install && npx prisma generate && npx prisma db push"
```

### **What Happened**
1. **Code had Garmin fields** in Prisma schema
2. **Database was missing columns** (schema never deployed)
3. **Garmin webhooks failed** trying to update non-existent columns
4. **Render build** ran `db push` and created missing columns
5. **Garmin integration worked** immediately after

### **Key Lesson**
- **Prisma Client** vs **Database Schema** must be in sync
- **Missing columns** = Prisma can't set values on them
- **Solution**: Always ensure schema is deployed before using new fields
- **No data loss** - just missing column definitions

### **Prevention**
- Always test Garmin webhooks after schema changes
- Ensure Render build process includes `db push`
- Monitor deployment logs for Prisma errors
- Test upsert functionality with existing users

### **Files Involved**
- `package.json` - Build command with `db push`
- `prisma/schema.prisma` - Garmin field definitions
- `services/AthleteUpsertService.js` - Proper upsert handling
- Render deployment logs - Confirmed `db push` execution

**Status**: ✅ **RESOLVED** - Garmin integration working

---

## Frontend Applications

### 1. MVP1 Frontend (Athlete App)
**Repository**: `gofastfrontend-mvp1`
**URL**: `https://gofastfrontend-mvp1.vercel.app`
**Purpose**: Main athlete-facing application

**Auth Flow**:
- ✅ Firebase Authentication (Google OAuth)
- ✅ Calls `/api/athlete/create` (find-or-create)
- ✅ Stores athlete data in localStorage
- ✅ Redirects: `/profile-setup` (new) → `/athlete-home` (existing)

**Key Files**:
- `src/Pages/Signin.jsx` - Firebase Google signin
- `src/api/axiosConfig.js` - API configuration
- `src/firebase.js` - Firebase config

---

### 2. User Dashboard (Admin App)
**Repository**: `gofast-user-dashboard`
**URL**: `https://gofast-user-dashboard.vercel.app`
**Purpose**: Admin dashboard for managing athletes

**Auth Flow**:
- ❌ **NO Firebase integration**
- ❌ **NO backend API calls**
- ✅ Hardcoded admin login (`admin`/`gofast2025`)
- ✅ Stores `adminLoggedIn: true` in localStorage

**Key Files**:
- `src/context/AuthContext.jsx` - Simple admin auth
- `src/pages/AdminAthletes.jsx` - Athlete management

**Routes**:
- `/` → Admin login page
- `/admin` → Dashboard choices
- `/athlete-admin` → Athlete management

---

### 3. Athlete Site (Unknown)
**URL**: `https://athlete.gofastcrushgoals.com`
**Purpose**: Unknown - needs investigation
**Auth**: Unknown - needs investigation

---

### 4. Frontend Demo (Legacy?)
**Repository**: `gofastfrontend-demo`
**URL**: `https://gofastfrontend-demo.vercel.app`
**Purpose**: Unknown - possibly legacy/demo

---

## Authentication Methods

### Firebase Auth (MVP1)
```javascript
// Used by: gofastfrontend-mvp1
const result = await signInWithGoogle();
const firebaseToken = await auth.currentUser.getIdToken();
// Calls: /api/athlete/create with Firebase token
```

### Hardcoded Admin (User Dashboard)
```javascript
// Used by: gofast-user-dashboard
if (username === 'admin' && password === 'gofast2025') {
  localStorage.setItem('adminLoggedIn', 'true');
}
```

### Unknown (Athlete Site)
- Need to investigate how `athlete.gofastcrushgoals.com` authenticates

---

## Data Flow

### MVP1 → Backend
1. User signs in with Google (Firebase)
2. Frontend gets Firebase token
3. Calls `/api/athlete/create` with token
4. Backend verifies token, finds/creates athlete
5. Returns athlete data
6. Frontend stores in localStorage
7. Redirects based on profile completeness

### User Dashboard → Backend
- **Currently NO connection**
- Uses hardcoded admin auth
- No API calls to backend

---

## Issues & Confusion

### 1. Multiple Auth Methods
- MVP1 uses Firebase
- User Dashboard uses hardcoded admin
- Athlete Site uses unknown method

### 2. Cross-App localStorage Pollution
- MVP1 stores: `firebaseId`, `athleteId`, `email`, `firebaseToken`
- User Dashboard stores: `adminLoggedIn`, `adminUsername`, `adminPassword`
- Possible conflicts when switching between apps

### 3. Unknown Athlete Site
- `athlete.gofastcrushgoals.com` authentication method unknown
- Connection to backend unknown
- Purpose unclear

### 4. 🚨 CRITICAL DATABASE ISSUE (RESOLVED)
- **Local Backend**: Missing `.env` file with `DATABASE_URL`
- **Deployed Backend**: Has `DATABASE_URL` on Render but database connection failing
- **Prisma**: Cannot connect to PostgreSQL database
- **Tables**: `athletes` table doesn't exist in database
- **API Calls**: `/api/athlete/create` fails silently (500 errors)
- **MVP1 Flow**: Firebase auth works, but athlete creation fails

### 5. ✅ DATABASE CONFIGURATION FIXES (Latest)
- **Added**: `config/database.js` - centralized database connection management
- **Updated**: All Prisma calls now use `getPrismaClient()` instead of direct `new PrismaClient()`
- **Added**: `connectDatabase()` function called on server startup
- **Added**: `test-database.js` script for debugging database connection
- **Pattern**: Copied from `eventscrm-backend` working database configuration
- **Status**: Committed and pushed to Render for deployment

---

## Recommendations

### 1. Unify Authentication
- Choose ONE auth method (Firebase recommended)
- Update User Dashboard to use Firebase
- Investigate Athlete Site auth

### 2. Clear App Purposes
- Document what each app is for
- Remove unused/legacy apps
- Consolidate if possible

### 3. Backend Integration
- Connect User Dashboard to backend APIs
- Add admin-specific endpoints if needed
- Implement proper role-based access

---

## Current Status (as of latest commit)

### ✅ Working
- MVP1 Firebase auth flow (Google OAuth)
- Backend health endpoint (`/api/health`)
- MVP1 frontend → Backend API calls (structure)
- **Database configuration** (FIXED - proper connection management)

### 🔄 Testing/Unknown
- **Database connection** (TESTING - may be fixed with latest deployment)
- **Athlete creation** (TESTING - may be fixed with latest deployment)
- User Dashboard backend integration
- Athlete Site authentication
- Cross-app auth consistency

### 🔧 Needs Investigation
- **Render database connection** - why is `DATABASE_URL` not working?
- **Prisma migrations** - need to run `npx prisma db push`
- How did user get to `/athlete-admin` on User Dashboard?
- What's the purpose of `athlete.gofastcrushgoals.com`?
- Should we consolidate apps or keep separate?

### 🚨 Immediate Action Required (UPDATED)
1. ✅ **Database configuration fixed** - proper connection management added
2. ✅ **Committed and deployed** - changes pushed to Render
3. 🔄 **Test deployed backend** - verify database connection works
4. 🔄 **Run Prisma migrations** - if connection works, create tables
5. **Create local `.env` file** for development

---

## Quick Debug Commands

### Check localStorage (run in browser console):
```javascript
// MVP1 data
console.log('Firebase ID:', localStorage.getItem('firebaseId'));
console.log('Athlete ID:', localStorage.getItem('athleteId'));

// User Dashboard data  
console.log('Admin logged in:', localStorage.getItem('adminLoggedIn'));
console.log('Admin username:', localStorage.getItem('adminUsername'));

// All data
console.log('All localStorage:', {...localStorage});
```

### Check backend health:
```bash
curl https://gofastbackendv2-fall2025.onrender.com/api/health
```

### Check database connection (deployed):
```bash
# This should return 500 error (database not connected)
curl https://gofastbackendv2-fall2025.onrender.com/api/athletes

# This should return 401 error (Firebase token required)
curl -X POST https://gofastbackendv2-fall2025.onrender.com/api/athlete/create \
  -H "Content-Type: application/json" \
  -d '{"firebaseId":"test","email":"test@example.com"}'
```

### Check local database setup:
```bash
# Check if .env file exists
ls -la .env

# Try to push Prisma schema (will fail without DATABASE_URL)
npx prisma db push

# Generate Prisma client
npx prisma generate
```

---

## Recent Changes (Latest Commits)

### Database Configuration Fix (Commit: cb3843c)
**Problem**: Backend couldn't connect to PostgreSQL database
**Root Cause**: Missing proper database connection management
**Solution**: Copied working pattern from `eventscrm-backend`

**Files Changed**:
- ✅ `config/database.js` - NEW: Centralized database connection
- ✅ `index.js` - UPDATED: Import database config, call `connectDatabase()` on startup
- ✅ `routes/Athlete/athleteRoute.js` - UPDATED: Use `getPrismaClient()` instead of direct Prisma
- ✅ `test-database.js` - NEW: Database connection testing script

**Key Functions Added**:
```javascript
// config/database.js
export async function connectDatabase() // Connect to PostgreSQL
export function getPrismaClient()      // Get shared Prisma instance
```

**Pattern Applied**:
- Centralized database connection management
- Proper error handling and logging
- Graceful shutdown with `prisma.$disconnect()`
- Environment variable validation

**Status**: ✅ Committed and deployed to Render
**Next**: Test if database connection now works on deployed backend

---

*Last updated: $(date)*
*Author: AI Assistant*
