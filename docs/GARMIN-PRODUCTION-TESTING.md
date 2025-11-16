# Garmin Production Webhook Testing Guide

## What Changed Since Evaluation Mode?

**Nothing changed in your code!** The routes are exactly the same. The only differences are:

### 1. **OAuth Tokens**
- **Evaluation**: Used evaluation OAuth tokens (from Garmin Developer Portal evaluation app)
- **Production**: Uses production OAuth tokens (from Garmin Developer Portal production app)

### 2. **Webhook Registration**
- **Evaluation**: Webhooks were registered with Garmin's evaluation API
- **Production**: Webhooks are registered with Garmin's production API (`https://apis.garmin.com/health-api/v1`)

### 3. **Webhook URL**
- **Evaluation**: Could be any URL (localhost, staging, etc.)
- **Production**: Must be your production URL: `https://gofastbackendv2-fall2025.onrender.com/api/garmin/activities`

### 4. **API Base URL**
- **Evaluation**: `https://apis.garmin.com/health-api/v1` (same, but different token scope)
- **Production**: `https://apis.garmin.com/health-api/v1` (same endpoint, production token)

## Your Routes (Unchanged)

✅ **POST `/api/garmin/activity`** - Handles activity summary webhooks (same as before)
✅ **POST `/api/garmin/activities`** - Handles manually updated activities webhooks (same as before)
✅ **POST `/api/garmin/activity-details`** - Handles activity detail webhooks (same as before)
✅ **POST `/api/garmin/permissions`** - Handles permission change webhooks (same as before)
✅ **POST `/api/garmin/deregistration`** - Handles user deregistration webhooks (same as before)

**No code changes needed!** Your routes already handle production webhooks correctly.

## Testing Steps

### Step 1: Register Production Webhook

```bash
# Make sure you have production token in .env
GARMIN_PROD_ACCESS_TOKEN=<your_production_oauth_token>

# Run the registration script
node scripts/registerGarminProdWebhook.js
```

**Expected Output:**
```
🔍 Checking Garmin Production subscriptions...
📦 Current subs: []
🚀 Registering new Production webhook...
📡 Callback URL: https://gofastbackend.onrender.com/api/garmin/activities
📡 Garmin Response: { ... }
✅ Done. Status: 201
🎉 Webhook registered successfully!
```

### Step 2: Verify Webhook Registration

The script will show you if the webhook is already registered. If you see:
   ```
   ✅ Already subscribed to: https://gofastbackendv2-fall2025.onrender.com/api/garmin/activities
   ```

Then you're good to go!

### Step 3: Test with Real Activity

1. **Connect a Garmin account** (using production OAuth flow)
   - Go to your frontend settings
   - Click "Connect Garmin"
   - Authorize with production Garmin app

2. **Complete a workout** on your Garmin device
   - Go for a run/walk
   - Sync to Garmin Connect
   - Wait 1-2 minutes for webhook

3. **Check Render logs** for webhook receipt:
   ```
   📡 Garmin webhook incoming: POST /api/garmin/activities
   📩 Garmin manually updated activities webhook received
   📝 Processing X manually updated activities
   ```

4. **Verify activity appears** in your app
   - Check `/my-activities` page
   - Activity should appear within 1-2 minutes

### Step 4: Monitor Webhook Activity

Watch your Render logs for:
- ✅ `📡 Garmin webhook incoming: POST /api/garmin/activities`
- ✅ `📩 Garmin manually updated activities webhook received`
- ✅ `✅ Saved manually updated Garmin activity X for athlete Y`

## What to Look For

### ✅ Success Indicators

1. **Webhook Registration**
   - Script returns `201 Created` or `Already subscribed`
   - No errors in registration

2. **Webhook Receipt**
   - Logs show `📡 Garmin webhook incoming`
   - Activities are processed successfully
   - Database records are created/updated

3. **Activity Display**
   - Activities appear in `/my-activities`
   - Weekly totals update correctly
   - Activity details are complete

### ❌ Common Issues

1. **Webhook Not Received**
   - Check Render logs for incoming requests
   - Verify webhook URL is correct in Garmin Developer Portal
   - Ensure production OAuth token is valid

2. **Activities Not Appearing**
   - Check if `garmin_user_id` matches between athlete and webhook
   - Verify webhook payload structure
   - Check database for `athleteActivity` records

3. **Authentication Errors**
   - Verify `GARMIN_PROD_ACCESS_TOKEN` is set correctly
   - Check token hasn't expired
   - Ensure token has correct scopes

## Differences: Evaluation vs Production

| Aspect | Evaluation Mode | Production Mode |
|--------|----------------|-----------------|
| **OAuth Token** | Evaluation app token | Production app token |
| **Webhook Registration** | Evaluation API | Production API |
| **Webhook URL** | Any URL | Production URL only |
| **User Limit** | Limited test users | All users |
| **Rate Limits** | Lower limits | Higher limits |
| **Code Changes** | None | None ✅ |

## Quick Test Checklist

- [ ] Production webhook registered (`node scripts/registerGarminProdWebhook.js`)
- [ ] Production OAuth token in `.env` (`GARMIN_PROD_ACCESS_TOKEN`)
- [ ] At least one user connected via production OAuth
- [ ] Completed a test activity (run/walk)
- [ ] Webhook received in Render logs
- [ ] Activity appears in `/my-activities`
- [ ] Weekly totals update correctly

## Need Help?

If webhooks aren't working:

1. **Check Render logs** - Look for incoming webhook requests
2. **Verify webhook registration** - Run registration script again
3. **Check Garmin Developer Portal** - Verify webhook URL is registered
4. **Test OAuth connection** - Ensure user can connect via production flow
5. **Check database** - Verify `garmin_user_id` matches webhook `userId`

Your routes are production-ready! Just need to register the webhook and test with real activities. 🚀

