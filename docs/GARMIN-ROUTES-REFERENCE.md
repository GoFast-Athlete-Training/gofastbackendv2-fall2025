# Garmin Routes Reference - Complete Endpoint List

## Base Path: `/api/garmin`

All routes are prefixed with `/api/garmin` as registered in `index.js`.

---

## 📋 Complete Route Table

| HTTP Method | Full Path | File | Purpose | Webhook? |
|------------|-----------|------|---------|----------|
| **OAuth & Authentication** |
| GET | `/api/garmin/auth-url` | `garminUrlGenRoute.js` | Generate Garmin OAuth URL | ❌ |
| GET | `/api/garmin/callback` | `garminCodeCatchRoute.js` | OAuth callback handler | ❌ |
| GET | `/api/garmin/exchange` | `garminCodeCatchRoute.js` | Token exchange endpoint | ❌ |
| GET | `/api/garmin/user` | `garminUserProfileRoute.js` | Get Garmin user profile | ❌ |
| **Status & Permissions** |
| GET | `/api/garmin/status` | `garminPermissionsRoute.js` | Check connection status | ❌ |
| GET | `/api/garmin/permissions/check` | `garminPermissionsRoute.js` | Check permissions | ❌ |
| PATCH | `/api/garmin/scopes` | `garminPermissionsRoute.js` | Update scopes manually | ❌ |
| POST | `/api/garmin/disconnect` | `garminPermissionsRoute.js` | Manual disconnect | ❌ |
| **Webhooks (Garmin → Backend)** |
| POST | `/api/garmin/activity` | `garminActivityRoute.js` | **Activity summary webhook** | ✅ |
| POST | `/api/garmin/activities` | `garminActivityRoute.js` | **Manually updated activities webhook** | ✅ |
| POST | `/api/garmin/activity-details` | `garminActivityDetailsRoute.js` | **Activity details webhook** | ✅ |
| PUT | `/api/garmin/permissions` | `garminPermissionsRoute.js` | **Permission change webhook** | ✅ |
| POST | `/api/garmin/permissions` | `garminPermissionsRoute.js` | **Permission change webhook (fallback)** | ✅ |
| PUT | `/api/garmin/deregistration` | `garminDeregistrationRoute.js` | **User deregistration webhook** | ✅ |
| POST | `/api/garmin/deregistration` | `garminDeregistrationRoute.js` | **User deregistration webhook (fallback)** | ✅ |
| POST | `/api/garmin/webhook` | `garminPermissionsRoute.js` | Generic webhook handler | ✅ |
| **Activity Management** |
| GET | `/api/garmin/activities` | `garminActivityRoute.js` | Fetch user activities (API) | ❌ |
| POST | `/api/garmin/activity/sync` | `garminActivityRoute.js` | Manual activity sync | ❌ |
| GET | `/api/garmin/ping` | `garminActivityRoute.js` | Health check endpoint | ❌ |

---

## 🎯 Webhook Endpoints (Need Registration)

These are the endpoints Garmin will POST/PUT to when events occur:

### 1. **Activity Webhooks** (Most Important)
- ✅ `POST /api/garmin/activity` - New activity completed
- ✅ `POST /api/garmin/activities` - Manually updated activities
- ✅ `POST /api/garmin/activity-details` - Activity detail data (telemetry)

### 2. **User Management Webhooks**
- ✅ `PUT /api/garmin/permissions` - User changed permissions
- ✅ `POST /api/garmin/permissions` - User changed permissions (fallback)
- ✅ `PUT /api/garmin/deregistration` - User disconnected
- ✅ `POST /api/garmin/deregistration` - User disconnected (fallback)

### 3. **Generic Webhook**
- ✅ `POST /api/garmin/webhook` - Generic webhook events

---

## 🔗 Production URLs for Garmin Registration

Based on your production backend: `https://gofastbackendv2-fall2025.onrender.com`

### Primary Webhook URLs to Register:

1. **Activity Summary** (Most Common)
   ```
   https://gofastbackendv2-fall2025.onrender.com/api/garmin/activity
   ```

2. **Manually Updated Activities** (What we registered)
   ```
   https://gofastbackendv2-fall2025.onrender.com/api/garmin/activities
   ```

3. **Activity Details** (Telemetry data)
   ```
   https://gofastbackendv2-fall2025.onrender.com/api/garmin/activity-details
   ```

4. **Permission Changes**
   ```
   https://gofastbackendv2-fall2025.onrender.com/api/garmin/permissions
   ```

5. **User Deregistration**
   ```
   https://gofastbackendv2-fall2025.onrender.com/api/garmin/deregistration
   ```

---

## 📝 Notes

### Webhook Registration
- **Garmin requires explicit registration** for webhook endpoints
- Use the registration script: `scripts/registerGarminProdWebhook.js`
- Currently registered: `/api/garmin/activities` only
- **You may need to register others** depending on Garmin's requirements

### Route Priority
Routes are registered in `index.js` in this order (order matters!):
1. `/auth-url` (most specific)
2. `/callback`
3. `/user`
4. `/activity`, `/activities`, `/activity/sync`
5. `/activity-details`
6. `/permissions`, `/webhook`
7. `/deregistration`

### Webhook Response Pattern
All webhook endpoints:
- ✅ Return `200 OK` immediately (within 30 seconds)
- ✅ Process data asynchronously
- ✅ Log incoming requests with `📡 Garmin webhook incoming`

---

## 🚨 Current Status

**Registered with Garmin:**
- ✅ `POST /api/garmin/activities` (via registration script)

**NOT Registered (may need registration):**
- ❌ `POST /api/garmin/activity`
- ❌ `POST /api/garmin/activity-details`
- ❌ `PUT /api/garmin/permissions`
- ❌ `PUT /api/garmin/deregistration`

**Check Garmin Developer Portal** to see which webhooks Garmin requires registration for.

