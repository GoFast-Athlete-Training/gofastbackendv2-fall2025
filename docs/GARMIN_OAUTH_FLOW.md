# Garmin OAuth 2.0 PKCE Flow Documentation

## Overview
Complete documentation of the Garmin OAuth 2.0 PKCE integration flow, including all API calls, endpoints, and data flow.

## Flow Summary
1. **Frontend** initiates OAuth → **Backend** generates auth URL
2. **User** authorizes on Garmin → **Garmin** redirects to callback
3. **Frontend** sends code to **Backend** → **Backend** exchanges for tokens
4. **Backend** calls Garmin `/user-info` → Gets Partner API UUID
5. **Backend** saves tokens + UUID to database

---

## 1. Frontend OAuth Initiation

### Frontend Call
```javascript
// Settings.jsx - initiateGarminOAuth()
const response = await fetch('https://gofastbackendv2-fall2025.onrender.com/api/garmin/auth', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    callback_url: 'https://athlete.gofastcrushgoals.com/garmin/callback'
  })
});
```

### Backend Response
```javascript
// garminAuthRoute.js - POST /api/garmin/auth
{
  success: true,
  authUrl: "https://connect.garmin.com/oauth2Confirm?client_id=856b6502-0fed-48fb-9e60-643c299fb3b7&response_type=code&redirect_uri=https%3A%2F%2Fathlete.gofastcrushgoals.com%2Fgarmin%2Fcallback&code_challenge=qZr-UQ361IRQtCU2WLbZFXoDB9zFSOAlp97fgUnX0tA&code_challenge_method=S256&state=d9653b6ab1a525708cc6c5968937b34b",
  codeVerifier: "random_base64url_string",
  state: "random_hex_string"
}
```

### What Happens
- **PKCE parameters** generated (codeVerifier, codeChallenge, state)
- **Auth URL** built with Garmin's OAuth endpoint
- **Frontend** stores `codeVerifier` in localStorage
- **Frontend** opens popup to `authUrl`

---

## 2. Garmin Authorization

### User Action
- User clicks "Authorize" on Garmin Connect
- Garmin redirects to: `https://athlete.gofastcrushgoals.com/garmin/callback?code=acb2b209f26246c094bab152507ffec4&state=d9653b6ab1a525708cc6c5968937b34b`

### Frontend Callback Handler
```javascript
// GarminOAuthCallback.jsx
const code = searchParams.get('code');        // "acb2b209f26246c094bab152507ffec4"
const state = searchParams.get('state');      // "d9653b6ab1a525708cc6c5968937b34b"
const athleteId = localStorage.getItem('athleteId'); // "cmh9pl5in0000rj1wkijpxl2t"

const response = await fetch('https://gofastbackendv2-fall2025.onrender.com/api/garmin/callback', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: code,
    state: state,
    codeVerifier: localStorage.getItem('garmin_code_verifier'),
    athleteId: athleteId
  })
});
```

---

## 3. Backend Token Exchange

### Backend Call to Garmin
```javascript
// garminAuthRoute.js - POST /api/garmin/callback
const tokenResponse = await fetch('https://diauth.garmin.com/di-oauth2-service/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: '856b6502-0fed-48fb-9e60-643c299fb3b7',
    client_secret: process.env.GARMIN_CLIENT_SECRET,
    code: 'acb2b209f26246c094bab152507ffec4',
    code_verifier: 'stored_code_verifier',
    redirect_uri: 'https://athlete.gofastcrushgoals.com/garmin/callback'
  })
});
```

### Garmin Token Response
```javascript
{
  access_token: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  refresh_token: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  expires_in: 3600,
  scope: "PARTNER_WRITE PARTNER_READ CONNECT_READ CONNECT_WRITE",
  token_type: "Bearer"
}
```

---

## 4. Backend User Info Call (THE CRITICAL ONE!)

### Backend Call to Garmin User Info
```javascript
// garminAuthRoute.js - After token exchange
const userInfoResponse = await fetch('https://connectapi.garmin.com/oauth-service/oauth/user-info', {
  headers: {
    'Authorization': `Bearer ${tokenData.access_token}`
  }
});
```

### Expected Garmin User Info Response
```javascript
{
  userId: "9b1c3de4-5a2b-47c9-8c03-8423f7b4c126",  // ← THIS IS THE PARTNER API UUID!
  garminUserName: "adamcole",
  garminUserEmail: "adam@example.com",
  scopes: ["PARTNER_WRITE", "PARTNER_READ", "CONNECT_READ", "CONNECT_WRITE"]
}
```

### Current Issue
- **Status**: ⚠️ User-info call failing
- **Error**: Need to see what Garmin returns
- **Result**: `garminUserId` set to "unknown"

---

## 5. Database Save

### Backend Database Update
```javascript
// garminAuthRoute.js - Save to database
await prisma.athlete.update({
  where: { id: athleteId }, // "cmh9pl5in0000rj1wkijpxl2t"
  data: {
    garmin_user_id: garminUserId,        // Partner API UUID or "unknown"
    garmin_access_token: tokenData.access_token,
    garmin_refresh_token: tokenData.refresh_token,
    garmin_expires_in: tokenData.expires_in,
    garmin_scope: tokenData.scope,
    garmin_connected_at: new Date(),
    garmin_last_sync_at: new Date(),
    garmin_is_connected: true,
    garmin_permissions: {
      read: tokenData.scope?.includes('READ') || false,
      write: tokenData.scope?.includes('WRITE') || false,
      scope: tokenData.scope,
      grantedAt: new Date(),
      lastChecked: new Date()
    }
  }
});
```

### Database Columns Updated
- ✅ `garmin_user_id` - Partner API UUID (currently "unknown")
- ✅ `garmin_access_token` - OAuth access token
- ✅ `garmin_refresh_token` - OAuth refresh token
- ✅ `garmin_expires_in` - Token expiration (3600 seconds)
- ✅ `garmin_scope` - OAuth scope permissions
- ✅ `garmin_connected_at` - Connection timestamp
- ✅ `garmin_last_sync_at` - Last sync timestamp
- ✅ `garmin_is_connected` - Connection status (true)
- ✅ `garmin_permissions` - Permission details

---

## 6. Frontend Success Response

### Backend Response to Frontend
```javascript
{
  success: true,
  message: 'Garmin connected successfully',
  tokens: {
    access_token: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    refresh_token: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    expires_in: 3600,
    scope: "PARTNER_WRITE PARTNER_READ CONNECT_READ CONNECT_WRITE",
    garminUserId: "unknown"  // ← Should be the Partner API UUID
  }
}
```

### Frontend Action
- **Popup** notifies parent window of success
- **Popup** closes automatically
- **Settings page** updates UI to show "Connected"

---

## Current Status

### ✅ Working
- OAuth 2.0 PKCE flow initiation
- Garmin authorization redirect
- Token exchange with Garmin
- Database save of tokens
- Frontend success handling

### ⚠️ Issue
- **User-info endpoint failing** - Not getting Partner API UUID
- **garmin_user_id** saved as "unknown" instead of real UUID

### 🔍 Next Steps
1. **Test OAuth flow again** to see user-info error details
2. **Debug user-info endpoint** - check Garmin's response
3. **Fix user-info call** to get Partner API UUID
4. **Verify UUID capture** in database

---

## API Endpoints Used

### Our Backend
- `POST /api/garmin/auth` - Generate OAuth URL
- `POST /api/garmin/callback` - Handle OAuth callback

### Garmin APIs
- `https://connect.garmin.com/oauth2Confirm` - OAuth authorization
- `https://diauth.garmin.com/di-oauth2-service/oauth/token` - Token exchange
- `https://connectapi.garmin.com/oauth-service/oauth/user-info` - Get user info (FAILING)

### Frontend URLs
- `https://athlete.gofastcrushgoals.com/garmin/callback` - OAuth callback

---

## Environment Variables Required

### Backend (.env)
```
GARMIN_CLIENT_ID=856b6502-0fed-48fb-9e60-643c299fb3b7
GARMIN_CLIENT_SECRET=your_secret_here
DATABASE_URL=postgresql://...
```

### Frontend
```
REACT_APP_GARMIN_CLIENT_ID=856b6502-0fed-48fb-9e60-643c299fb3b7
```

---

## Key Files

### Backend
- `routes/Garmin/garminAuthRoute.js` - OAuth flow logic
- `config/garminConfig.js` - Garmin configuration
- `prisma/schema.prisma` - Database schema

### Frontend
- `src/Pages/Settings/Settings.jsx` - OAuth initiation
- `src/Pages/Settings/GarminOAuthCallback.jsx` - Callback handler
- `src/config/garminConfig.js` - Frontend config

---

## The Critical Issue

**The `/user-info` endpoint is the key to getting the Partner API UUID!**

Without this UUID:
- ❌ Webhooks can't match data to athletes
- ❌ Garmin data can't be properly associated
- ❌ Integration is incomplete

**We need to fix this endpoint call to get the real UUID!** 🎯
