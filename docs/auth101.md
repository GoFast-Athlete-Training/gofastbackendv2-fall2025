# OAuth 101 - Why Tokens Are Secret

## 🔒 The Core Security Principle

**TOKENS ARE SECRET!** They should NEVER be exposed to the frontend.

## 🚨 What We Were Doing Wrong

```javascript
// ❌ WRONG - Frontend handling tokens
localStorage.setItem('garminTokens', accessToken); // SECURITY RISK!
fetch('https://garmin.com/api/user', {
  headers: { 'Authorization': `Bearer ${token}` } // CORS BLOCKED!
});
```

## ✅ The Correct OAuth Flow

### 1. User Authorization (Frontend)
```javascript
// Frontend redirects user to Garmin
window.location = 'https://connect.garmin.com/oauthConfirm?client_id=...';
```

### 2. Token Exchange (Backend Only)
```javascript
// Backend exchanges code for tokens - SERVER-TO-SERVER
const response = await fetch('https://connectapi.garmin.com/oauth-service/oauth/token', {
  method: 'POST',
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET, // 🔒 SECRET - Backend only!
    code: code,
    code_verifier: codeVerifier
  })
});
```

### 3. API Calls (Backend Only)
```javascript
// Backend calls Garmin API - SERVER-TO-SERVER
const garminResponse = await fetch('https://connectapi.garmin.com/oauth-service/oauth/user-info', {
  headers: {
    'Authorization': `Bearer ${accessToken}` // 🔒 SECRET - Backend only!
  }
});
```

## 🎯 Why This Matters

### Security
- **CLIENT_SECRET** must stay on backend (Render environment variables)
- **ACCESS_TOKENS** must stay on backend (database)
- **Frontend** never sees secrets

### CORS
- **Frontend → External API** = CORS blocked
- **Backend → External API** = Server-to-server, no CORS

### Architecture
- **Frontend** = User interface only
- **Backend** = All API calls and secret handling

## 🔄 The Correct Flow

```
1. Frontend → Redirect user to Garmin OAuth
2. Garmin → Redirect to backend callback
3. Backend → Exchange code for tokens (SECRET)
4. Backend → Save tokens to database (SECRET)
5. Backend → Call Garmin API with tokens (SECRET)
6. Backend → Redirect user to frontend success page
7. Frontend → Show success (no tokens involved)
```

## 📝 Key Files

- **Frontend OAuth**: `GarminOAuthCallback.jsx` - Just a landing page
- **Backend OAuth**: `/api/garmin/callback` - Does all the work
- **Backend API**: `/api/garmin/user/get-uuid` - Server-to-server calls

## 🚨 What NOT to Do

❌ Don't put tokens in localStorage  
❌ Don't call external APIs from frontend  
❌ Don't expose CLIENT_SECRET to frontend  
❌ Don't make frontend handle OAuth tokens  

## ✅ What TO Do

✅ Keep all tokens on backend  
✅ Make all external API calls from backend  
✅ Use environment variables for secrets  
✅ Frontend only shows UI and calls YOUR backend  

## 🎉 The Result

- **Secure** - Secrets stay on backend
- **Working** - No CORS issues
- **Clean** - Frontend just shows UI
- **Proper** - Server-to-server API calls

**Remember: OAuth tokens are like passwords - they belong on the server, not in the browser!**
