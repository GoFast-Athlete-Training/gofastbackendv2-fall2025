# 🔥 Firebase Authentication & User Management

## Universal Standard for All Builds

Complete guide to Firebase authentication, user creation, and user hydration across all Ignite and GoFast builds.

---

## 🎯 Core Principles

### a. Separation of Concerns
- **Firebase** = User authentication and identity establishment
- **OAuth** = Service-specific API access (Gmail, YouTube, Google Ads, etc.)
- **NEVER** use Firebase for service-specific OAuth tasks

### b. Universal Personhood
- Firebase establishes the user's **universal identity** (UID)
- This UID connects the user across all systems and databases
- One Firebase user = One universal person across all applications

### c. Naming Conventions
All Firebase-related files MUST include "firebase" in their names:
- ✅ `firebaseMiddleware.js` (NOT `authMiddleware.js`)
- ✅ `firebaseConfig.js` (NOT `firebase.js` or `auth.js`)
- ✅ `verifyFirebaseToken` (NOT `verifyToken`)
- ✅ `FIREBASE_SERVICE_ACCOUNT_KEY` (environment variable)

---

## 📁 File Structure

### Backend
```
backend/
├── middleware/
│   └── firebaseMiddleware.js       # Token verification
├── routes/
│   └── [Entity]/                    # Entity = User, Athlete, Owner, Admin, etc.
│       ├── [entity]CreateRoute.js   # Find or create entity (Pattern A)
│       └── [entity]HydrateRoute.js  # Hydrate entity by Firebase ID (Pattern B)
└── .env.example
```

**Note:** Entity name varies by build:
- **GoFast**: `Athlete/athleteCreateRoute.js` → `/api/athlete/create`
- **Ignite BD**: `User/userCreateRoute.js` → `/api/user/create`
- **Ignite Events**: `Admin/adminCreateRoute.js` → `/api/admin/create`

### Frontend
```
frontend/
├── src/
│   ├── config/
│   │   └── firebaseConfig.js       # Firebase client config
│   └── ...
└── .env.example
```

---

## 🔧 Backend: Middleware

### `middleware/firebaseMiddleware.js`

**Purpose:** Verify Firebase ID tokens from frontend requests

**Key Functions:**
- `verifyFirebaseToken` - Required authentication (returns 401 if invalid)
- `optionalFirebaseToken` - Optional authentication (continues if no token)

**Implementation:**
```javascript
import admin from 'firebase-admin';

let firebaseAdmin = null;

const initializeFirebase = () => {
  if (!firebaseAdmin) {
    try {
      // Environment variable (local .env for dev, Render for production)
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      
      if (!serviceAccount) {
        console.error('❌ FIREBASE: FIREBASE_SERVICE_ACCOUNT_KEY not set (check .env or Render)');
        throw new Error('Firebase service account not configured');
      }

      const serviceAccountKey = JSON.parse(serviceAccount);
      
      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert(serviceAccountKey),
        projectId: serviceAccountKey.project_id
      });
      
      console.log('✅ FIREBASE: Admin SDK initialized');
    } catch (error) {
      console.error('❌ FIREBASE: Failed to initialize:', error.message);
      throw error;
    }
  }
  return firebaseAdmin;
};

export const verifyFirebaseToken = async (req, res, next) => {
  try {
    const admin = initializeFirebase();
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No authorization token provided'
      });
    }
    
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Add user info to request object
    req.user = {
      uid: decodedToken.uid,
      firebaseId: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      picture: decodedToken.picture,
      emailVerified: decodedToken.email_verified
    };
    
    next();
  } catch (error) {
    console.error('❌ FIREBASE: Token verification failed:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

export const optionalFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  
  return verifyFirebaseToken(req, res, next);
};
```

**Usage:**
```javascript
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';

router.get('/protected', verifyFirebaseToken, async (req, res) => {
  const { uid, email } = req.user; // Extracted by middleware
  // Your route logic
});
```

---

## 🎨 Frontend: Firebase Config

### `src/config/firebaseConfig.js`

**Purpose:** Initialize Firebase client SDK for user authentication

**Implementation:**
```javascript
import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence, GoogleAuthProvider, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
  measurementId: "G-XXXXXXXXXX"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Failed to set auth persistence:', error);
});

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    return {
      uid: user.uid,
      email: user.email,
      name: user.displayName,
      photoURL: user.photoURL
    };
  } catch (error) {
    console.error("❌ Firebase: Sign-in error:", error);
    throw error;
  }
}

export async function signOutUser() {
  try {
    await signOut(auth);
    console.log("✅ Firebase: User signed out");
  } catch (error) {
    console.error("❌ Firebase: Sign out error:", error);
    throw error;
  }
}

export function getCurrentUser() {
  return auth.currentUser;
}

export async function signUpWithEmail(email, password, displayName) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  const user = result.user;
  
  if (displayName) {
    await user.updateProfile({ displayName });
  }
  
  return {
    uid: user.uid,
    email: user.email,
    name: user.displayName || displayName,
    photoURL: user.photoURL
  };
}

export async function signInWithEmail(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  const user = result.user;
  
  return {
    uid: user.uid,
    email: user.email,
    name: user.displayName,
    photoURL: user.photoURL
  };
}

export { app, analytics };
```

---

## 🚀 Route Pattern A: EntityCreateRoute

### Purpose
Find or create the universal personhood entity in the database based on Firebase ID. This happens AFTER Firebase authentication - it's entity creation/management, NOT authentication.

### Naming
- ✅ File: `routes/[Entity]/[entity]CreateRoute.js` (Entity = User, Athlete, Owner, Admin, etc.)
- ✅ Endpoint: `POST /api/[entity]/create`
- ❌ NOT: `authRoute.js`, `firebaseAuthRoute.js`

**Examples:**
- GoFast: `routes/Athlete/athleteCreateRoute.js` → `POST /api/athlete/create`
- Ignite BD: `routes/User/userCreateRoute.js` → `POST /api/user/create`
- Ignite Events: `routes/Admin/adminCreateRoute.js` → `POST /api/admin/create`

### Implementation

```javascript
// routes/User/userCreateRoute.js
import express from 'express';
import prisma from '../../db.js';

const router = express.Router();

/**
 * POST /api/user/create
 * Find or create user by Firebase ID
 * Called after Firebase authentication (frontend sends firebaseId + user data)
 * 
 * Body:
 * {
 *   firebaseId: "firebase-uid-here",
 *   email: "user@example.com",
 *   firstName: "John",
 *   lastName: "Doe",
 *   photoURL: "https://..."
 * }
 */
router.post('/create', async (req, res) => {
  try {
    const { firebaseId, email, firstName, lastName, photoURL } = req.body;
    
    if (!firebaseId || !email) {
      return res.status(400).json({ 
        success: false,
        error: 'firebaseId and email are required' 
      });
    }
    
    // 1. Find existing user by firebaseId first
    let user = await prisma.user.findUnique({
      where: { firebaseId },
      include: {
        adminOf: true,
        staffOf: true
      }
    });
    
    if (user) {
      console.log('✅ Found existing user:', user.id);
      return res.json({
        success: true,
        user: {
          id: user.id,
          firebaseId: user.firebaseId,
          email: user.email,
          name: user.name,
          companies: [...user.adminOf, ...user.staffOf]
        }
      });
    }
    
    // 2. Find existing user by email (might have been pre-created)
    user = await prisma.user.findFirst({
      where: { email }
    });
    
    if (user) {
      // Link firebaseId to existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: { firebaseId },
        include: {
          adminOf: true,
          staffOf: true
        }
      });
      
      return res.json({
        success: true,
        user: {
          id: user.id,
          firebaseId: user.firebaseId,
          email: user.email,
          name: user.name,
          companies: [...user.adminOf, ...user.staffOf]
        }
      });
    }
    
    // 3. Create new user
    user = await prisma.user.create({
      data: {
        firebaseId,
        email,
        name: firstName || email.split('@')[0],
        photoURL: photoURL || null
      },
      include: {
        adminOf: true,
        staffOf: true
      }
    });
    
    console.log('✅ Created new user:', user.id);
    
    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        firebaseId: user.firebaseId,
        email: user.email,
        name: user.name,
        companies: []
      }
    });
    
  } catch (error) {
    console.error('❌ UserCreate error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

export default router;
```

### Usage in `index.js`
```javascript
import userCreateRoute from './routes/User/userCreateRoute.js';
app.use('/api/user', userCreateRoute);
```

### Frontend Usage
```javascript
// After Firebase sign-in
const firebaseUser = await signInWithGoogle();

// Call entity creation route (NO token needed - happens before protected routes)
// Replace [entity] with your model name (athlete, user, admin, etc.)
const response = await fetch('/api/[entity]/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    firebaseId: firebaseUser.uid,
    email: firebaseUser.email,
    firstName: firebaseUser.displayName?.split(' ')[0],
    lastName: firebaseUser.displayName?.split(' ')[1],
    photoURL: firebaseUser.photoURL
  })
});

const { [entity] } = await response.json();
// Store [entity].id in localStorage/state
```

### Key Points
- ✅ **No middleware required** - This happens BEFORE protected routes
- ✅ **Firebase ID sent in body** - Not from token verification
- ✅ **Find-first logic** - Check firebaseId, then email
- ✅ **Creates if not found** - Always returns a user object

---

## 🚀 Route Pattern B: EntityHydrateRoute

### Purpose
Find the universal personhood entity's full account/profile by Firebase ID from a verified token. This is the "hydration" route that loads complete entity data when they have a Firebase token.

### Naming
- ✅ File: `routes/[Entity]/[entity]HydrateRoute.js` (Entity = User, Athlete, Owner, Admin, etc.)
- ✅ Endpoint: `GET /api/[entity]/hydrate`
- ✅ Examples:
  - GoFast: `routes/Athlete/athletepersonhydrateRoute.js` → `GET /api/athlete/athletepersonhydrate`
  - Ignite BD: `routes/User/userHydrateRoute.js` → `GET /api/user/hydrate`
  - Ignite Events: `routes/Admin/adminHydrateRoute.js` → `GET /api/admin/hydrate`

### Implementation

```javascript
// routes/User/userHydrateRoute.js
import express from 'express';
import { verifyFirebaseToken } from '../../middleware/firebaseMiddleware.js';
import prisma from '../../db.js';

const router = express.Router();

/**
 * GET /api/user/hydrate
 * Find user's full account by Firebase ID (from verified token)
 * Requires Firebase token verification middleware
 * 
 * Headers: Authorization: Bearer <firebase-token>
 */
router.get('/hydrate', verifyFirebaseToken, async (req, res) => {
  try {
    // Get firebaseId from verified token (set by middleware)
    const firebaseId = req.user?.uid;
    
    if (!firebaseId) {
      return res.status(401).json({
        success: false,
        error: 'Firebase authentication required'
      });
    }
    
    console.log('🚀 USER HYDRATE: Finding user by Firebase ID:', firebaseId);
    
    // Find user by firebaseId with all relations
    const user = await prisma.user.findUnique({
      where: { firebaseId },
      include: {
        adminOf: {
          include: {
            admin: true,
            staff: true
          }
        },
        staffOf: {
          include: {
            admin: true,
            staff: true
          }
        }
      }
    });
    
    if (!user) {
      console.log('❌ USER HYDRATE: No user found for Firebase ID:', firebaseId);
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'No user found for this Firebase ID',
        code: 'USER_NOT_FOUND'
      });
    }
    
    console.log('✅ USER HYDRATE: Found user:', user.id, user.email);
    
    // Format hydrated user data
    const hydratedUser = {
      id: user.id,
      firebaseId: user.firebaseId,
      email: user.email,
      name: user.name,
      photoURL: user.photoURL,
      companies: [...user.adminOf, ...user.staffOf],
      adminOf: user.adminOf,
      staffOf: user.staffOf,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    
    res.json({
      success: true,
      message: 'User hydrated successfully',
      user: hydratedUser,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ USER HYDRATE: Error:', error);
    res.status(500).json({
      success: false,
      error: 'Database error',
      message: error.message
    });
  }
});

export default router;
```

### Usage in `index.js`
```javascript
import userHydrateRoute from './routes/User/userHydrateRoute.js';
app.use('/api/user', userHydrateRoute);
```

### Frontend Usage
```javascript
// Get Firebase token
const firebaseUser = getCurrentUser();
if (!firebaseUser) {
  // Redirect to sign-in
  return;
}

const idToken = await firebaseUser.getIdToken();

// Call hydrate route (replace [entity] with your model name)
const response = await fetch('/api/[entity]/hydrate', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${idToken}`
  }
});

const { [entity] } = await response.json();
// Store full entity data in state/context
```

### Key Points
- ✅ **Requires `verifyFirebaseToken` middleware** - Token must be verified
- ✅ **Gets firebaseId from `req.user.uid`** - Set by middleware, not from body
- ✅ **Returns full hydrated data** - Complete user profile with all relations
- ✅ **Used on hydration pages** - Called when user lands on dashboard/homepage

---

## 🔐 Complete Authentication Flow

### 1. User Signs In (Frontend)
```javascript
import { signInWithGoogle } from '../config/firebaseConfig.js';

const firebaseUser = await signInWithGoogle();
// firebaseUser = { uid, email, name, photoURL }
```

### 2. Create/Find User in Database (Pattern A)
```javascript
const response = await fetch('/api/user/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    firebaseId: firebaseUser.uid,
    email: firebaseUser.email,
    firstName: firebaseUser.displayName?.split(' ')[0],
    lastName: firebaseUser.displayName?.split(' ')[1],
    photoURL: firebaseUser.photoURL
  })
});

const { user } = await response.json();
// Store user.id
```

### 3. Hydrate User Data (Pattern B)
```javascript
const idToken = await firebaseUser.getIdToken();

const response = await fetch('/api/user/hydrate', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${idToken}`
  }
});

const { user } = await response.json();
// Store full user data with companies, etc.
```

### 4. Protected Routes
```javascript
// All protected routes use verifyFirebaseToken middleware
router.get('/protected', verifyFirebaseToken, async (req, res) => {
  const { uid } = req.user; // Firebase UID
  // Use uid to query database
});
```

---

## 📝 Environment Variables

### Backend Environment Variables
**Local Development:** Use `.env` file (required for Prisma Studio, testing, etc.)  
**Production:** Render environment variables
```env
# Firebase Admin SDK (Service Account)
FIREBASE_SERVICE_ACCOUNT_KEY="{\"type\":\"service_account\",\"project_id\":\"...\",...}"

# Database
DATABASE_URL="postgresql://..."

# Session
SESSION_SECRET="your-secret-key"
PORT=4000
```

### Frontend (Optional - can be hardcoded)
```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

---

## 🚫 What NOT to Use Firebase For

### ❌ Service-Specific OAuth
- Gmail API access → Use unified Google OAuth system
- YouTube API access → Use unified Google OAuth system
- Google Ads API access → Use unified Google OAuth system

### ❌ API Token Management
- Firebase tokens are for user authentication only
- Service tokens (Gmail, YouTube, etc.) are stored in database and managed separately

---

## ✅ Standardization Checklist

### Backend
- [x] `middleware/firebaseMiddleware.js` exists with `verifyFirebaseToken`
- [x] `routes/User/userCreateRoute.js` exists (Pattern A)
- [x] `routes/User/userHydrateRoute.js` exists (Pattern B)
- [x] Routes mounted at `/api/user`
- [x] Environment variable: `FIREBASE_SERVICE_ACCOUNT_KEY` (from Render)
- [x] All protected routes use `verifyFirebaseToken` middleware

### Frontend
- [x] `src/config/firebaseConfig.js` exists
- [x] Exports: `auth`, `signInWithGoogle`, `signOutUser`, `getCurrentUser`
- [x] Firebase config matches backend project
- [x] ID tokens sent in `Authorization: Bearer <token>` header

---

## 🔄 Migration from Old Patterns

### If you have `authRoute.js` or `firebaseAuthRoute.js`:
1. Split into two routes (using your entity model name):
   - `routes/[Entity]/[entity]CreateRoute.js` (Pattern A)
   - `routes/[Entity]/[entity]HydrateRoute.js` (Pattern B)
2. Update endpoints:
   - `/auth/findOrCreate` → `/api/[entity]/create`
   - `/auth/verify` → `/api/[entity]/hydrate`
3. Remove "auth" terminology - these are entity management routes
4. Replace `[entity]` with your model name (User, Athlete, Owner, Admin, etc.)

### If you have `authMiddleware.js`:
1. Rename to `firebaseMiddleware.js`
2. Rename `verifyToken` → `verifyFirebaseToken`
3. Update all imports

---

## 🎯 Universal Personhood

The Firebase UID (`firebaseId`) is the **universal identifier** that connects the entity across:
- All Ignite applications (BD, Events, Legal)
- All GoFast applications
- Database entity records (User, Athlete, Owner, Admin, etc.)
- All associations (companies, teams, etc.)
- All future applications

**One Firebase UID = One Universal Person = One Database Entity Record**

**Entity Model Names by Build:**
- **GoFast**: `Athlete` model → `routes/Athlete/athleteCreateRoute.js`
- **Ignite BD**: `User` model → `routes/User/userCreateRoute.js`
- **Ignite Events**: `Admin` model → `routes/Admin/adminCreateRoute.js`
- **Future builds**: Use whatever entity name represents universal personhood in that build

---

**Last Updated:** 2025-01-XX  
**Status:** ✅ Complete Standard for All Builds

