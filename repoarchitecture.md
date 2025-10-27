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

### Database Issues
- **Local**: Missing `.env` file with `DATABASE_URL`
- **Deployed**: Has `DATABASE_URL` in Render environment but connection failing
- **Tables**: `athletes` table not created (Prisma migrations not run)
- **Impact**: All athlete-related API calls return 500 errors

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

### 4. 🚨 CRITICAL DATABASE ISSUE
- **Local Backend**: Missing `.env` file with `DATABASE_URL`
- **Deployed Backend**: Has `DATABASE_URL` on Render but database connection failing
- **Prisma**: Cannot connect to PostgreSQL database
- **Tables**: `athletes` table doesn't exist in database
- **API Calls**: `/api/athlete/create` fails silently (500 errors)
- **MVP1 Flow**: Firebase auth works, but athlete creation fails

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

### ❌ Not Working/Unknown
- **Database connection** (CRITICAL)
- **Athlete creation** (fails silently)
- User Dashboard backend integration
- Athlete Site authentication
- Cross-app auth consistency

### 🔧 Needs Investigation
- **Render database connection** - why is `DATABASE_URL` not working?
- **Prisma migrations** - need to run `npx prisma db push`
- How did user get to `/athlete-admin` on User Dashboard?
- What's the purpose of `athlete.gofastcrushgoals.com`?
- Should we consolidate apps or keep separate?

### 🚨 Immediate Action Required
1. **Check Render environment variables** - verify `DATABASE_URL` is set
2. **Run Prisma migrations** on deployed backend
3. **Test database connection** from deployed backend
4. **Create local `.env` file** for development

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

*Last updated: $(date)*
*Author: AI Assistant*
