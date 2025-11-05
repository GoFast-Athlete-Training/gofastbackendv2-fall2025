# GoFast Auth Architecture - Single Source of Truth

## 🎯 **OVERVIEW**

This is the **ONLY** auth documentation. All other auth docs should reference this.

There are **THREE SEPARATE AUTH SYSTEMS** in GoFast:

1. **Athlete Auth** - For mobile app users
2. **Coach/Parent Auth** - For program stakeholders  
3. **Company Auth** - For Company Outlook (invitation-based)

---

## 1️⃣ ATHLETE AUTH (Mobile App Users)

### Schema
```prisma
model Athlete {
  id        String @id @default(cuid())
  firebaseId String @unique
  email     String
  firstName String?
  lastName  String?
  // ... other fields
  
  @@map("athletes")
}
```

### Frontend Pages
- **SignupPage.jsx** - New user creation
- **Signin.jsx** - Existing user login

### Backend Endpoints
```
POST /api/athlete/create   // FIND OR CREATE (for signup)
POST /api/athlete/find     // FIND ONLY (for signin)
```

### Auth Flow

#### **Signup Flow** (Find or Create)
```
1. User enters email/password
2. Firebase sign-in creates Firebase user
3. POST /api/athlete/create
   - Try to find by firebaseId
   - Try to find by email
   - If not found, CREATE new athlete
4. Link firebaseId to athlete
5. Show success → Dashboard
```

#### **Signin Flow** (Find Only)
```
1. User enters email/password
2. Firebase sign-in
3. POST /api/athlete/find
   - Try to find by firebaseId
   - Try to find by email
   - If NOT found → Redirect to signup
4. If found → Show success → Dashboard
```

### Storage
```javascript
// Firebase handles token management
// No localStorage needed for Firebase auth
```

---

## 2️⃣ COACH/PARENT AUTH (Program Stakeholders)

### Schema
```prisma
model Coach {
  id        String @id @default(cuid())
  siteId    String   // Which program/site
  email     String
  firstName String?
  lastName  String?
  
  @@unique([siteId, email])
  @@map("coaches")
}

model Parent {
  id        String @id @default(cuid())
  email     String
  athleteId String  // Their child
  // ... other fields
  
  @@map("parents")
}
```

### Frontend Pages
- **Login.jsx** - Simple email/password login

### Backend Endpoints
```
POST /api/coach/login     // Demo mode
POST /api/parent/login    // Demo mode
```

### Auth Flow
```
1. User enters email/password
2. POST /api/coach/login (or /api/parent/login)
3. Find by email
4. Return coach/parent data
5. Store in localStorage
6. Navigate to dashboard
```

### Storage
```javascript
localStorage.setItem('bgr_coach_auth', JSON.stringify({
  email: email,
  role: 'coach',
  siteId: '1'
}))
```

---

## 3️⃣ COMPANY AUTH (Company Outlook - Invitation-Based)

### Schema
```prisma
model CompanyInvite {
  id        String @id @default(cuid())
  companyId String
  email     String      // Invitee email
  token     String @unique  // Unique invitation token
  role      String? // founder, admin, manager, employee
  department String?
  status    String @default("pending")
  expiresAt DateTime?
  
  @@unique([companyId, email, token])
  @@map("company_invites")
}

model CompanyEmployee {
  id          String @id @default(cuid())
  companyId   String
  email       String
  name        String
  role        String?
  department  String?
  
  @@unique([companyId, email])
  @@map("company_employees")
}
```

### Frontend Pages
- **Splash.jsx** - Invitation verification and login

### Backend Endpoints
```
GET  /api/company/invite/verify?token={token}  // Verify invitation
POST /api/company/invite/accept                // Accept & login
```

### Auth Flow
```
1. User visits /splash
2. Check for invitation token (URL param or localStorage)
3. If no token → Show "Invitation Required"
4. If token → GET /api/company/invite/verify?token=xxx
5. Show login form with role/department pre-filled
6. User enters email
7. POST /api/company/invite/accept { email, token }
8. Create CompanyEmployee record
9. Store auth in localStorage
10. Navigate to main app
```

### Storage
```javascript
localStorage.setItem('company_invite_token', token)
localStorage.setItem('company_auth', JSON.stringify({
  companyId: 'company_123',
  companyName: 'GoFast Company',
  email: 'adam@example.com',
  role: 'founder',
  department: 'Executive',
  inviteToken: 'xxx',
  loginTime: new Date().toISOString()
}))
```

### Access Control
- **Invitation-Only**: No open signup
- **Token-Based**: Unique tokens in URLs
- **Email + Token**: Verifies both
- **Role/Department**: Set at invitation time
- **Expiration**: Invites can expire

---

## 🔐 OAuth (External Integrations)

### Third-Party OAuth (Garmin, Strava, etc.)

**CRITICAL RULE**: Tokens are SECRET - NEVER expose to frontend!

```
1. Frontend → Redirect user to OAuth provider
2. Provider → Redirect to backend callback
3. Backend → Exchange code for tokens (SERVER-TO-SERVER)
4. Backend → Save tokens to database
5. Backend → Redirect to frontend success page
6. Frontend → Show success (no tokens involved)
```

### Files
- **Frontend**: Just landing pages
- **Backend**: All token handling and API calls
- **Database**: Store tokens server-side only

---

## 📚 Previous Auth Docs Status

### ✅ Consolidated Into This Doc
- `AUTH-FLOW-RULES.md` - Athlete signup/signin rules
- `COMPANY_OUTLOOK_AUTH.md` - Company invitation flow
- `auth101.md` - OAuth token security

### 🗑️ Can Be Deleted
- `AUTH-FLOW.md` (in ignitestrategescrm-frontend)
- `FIREBASE-AUTH-HELL-TROUBLESHOOTING.md` (in ignitestrategescrm-frontend)
- `OAUTH-ARCHITECTURE.md` (in ignitestrategescrm-frontend)

### ✅ Keep Separate
- `GARMIN_OAUTH_FLOW.md` - Specific implementation details
- `GARMIN_OAUTH_PROCEDURES.md` - Step-by-step guides

---

## 🎯 Key Principles

1. **Three Separate Systems** - Don't mix them
2. **Schema-First** - Database defines auth
3. **Tokens Stay on Backend** - Never expose OAuth tokens
4. **Storage Strategy** - Firebase for athletes, localStorage for others
5. **One Source of Truth** - This document

---

**Last Updated**: 2025-01-01
**Status**: ✅ Single source of truth for all auth

