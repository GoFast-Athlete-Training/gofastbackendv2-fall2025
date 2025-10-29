# Garmin Webhook Deep Debug - Adam Cole

## The Problem
- ✅ Garmin connected (User ID: `94d7c995-d7d1-4c2c-856f-5ef41913a6bb`)
- ✅ Athlete exists (ID: `cmh9pl5in0000rj1wkijpxl2t`)
- ❌ **NO activities showing up**

## Debug Steps

### Step 1: Check if ANY activities exist in database
```sql
-- Run this in Prisma Studio or DB console
SELECT COUNT(*) FROM athlete_activities;

-- If > 0, check which athletes they belong to
SELECT athleteId, garminUserId, COUNT(*) 
FROM athlete_activities 
GROUP BY athleteId, garminUserId;
```

**Possible outcomes:**
- **0 activities** → Webhooks never received OR not being saved
- **Activities exist but different athleteId** → Wrong athlete linking
- **Activities exist but different garminUserId** → ID mismatch

---

### Step 2: Check Garmin webhook registration
```bash
# Check if Garmin knows about our webhook URL
# Your webhook should be registered at:
https://gofastbackendv2-fall2025.onrender.com/api/garmin/activity
```

**Questions:**
1. Did you register the webhook URL in Garmin Developer Portal?
2. Did you subscribe to activity push notifications?
3. Did you complete the "user registration" flow?

---

### Step 3: Check backend logs for webhook receipt
```bash
# Check Render logs for:
🔍 Garmin activity webhook received:

# If you see this → webhook IS being received
# If you don't see this → webhook NOT reaching backend
```

**Look for these patterns:**
```
✅ Good:
🔍 Garmin activity webhook received: {...}
🔍 Looking for athlete with garmin_user_id: 94d7c995-d7d1-4c2c-856f-5ef41913a6bb
✅ Activity created: {...}

❌ Bad:
⚠️ No userId found in Garmin webhook payload
⚠️ No athlete found for Garmin user ID: 94d7c995-d7d1-4c2c-856f-5ef41913a6bb
```

---

### Step 4: Check athlete record in database
```sql
-- Verify your garmin_user_id is stored correctly
SELECT 
  id,
  email,
  garmin_user_id,
  garmin_is_connected,
  garmin_connected_at
FROM athletes
WHERE id = 'cmh9pl5in0000rj1wkijpxl2t';
```

**Expected:**
```
garmin_user_id: "94d7c995-d7d1-4c2c-856f-5ef41913a6bb"
garmin_is_connected: true
garmin_connected_at: [recent date]
```

**If garmin_user_id is NULL or different:**
- Your Garmin connection didn't save properly
- Need to reconnect Garmin

---

### Step 5: Manual webhook test
```bash
# Send a test webhook to your backend
curl -X POST https://gofastbackendv2-fall2025.onrender.com/api/garmin/activity \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "94d7c995-d7d1-4c2c-856f-5ef41913a6bb",
    "activityId": "12345678",
    "activityName": "Test Run",
    "activityType": "running",
    "durationInSeconds": 1800,
    "distanceInMeters": 5000,
    "startTimeLocal": "2024-12-20T10:00:00"
  }'
```

**Check:**
1. Does the backend respond with 200?
2. Check database for new activity
3. Check Render logs for processing

---

### Step 6: Verify Garmin webhook subscription

**In Garmin Developer Portal:**
1. Go to your app settings
2. Check "Webhooks" section
3. Verify:
   - Webhook URL is correct
   - Activity subscription is enabled
   - User is registered for push notifications

**Common issues:**
- Webhook URL not registered
- SSL certificate issues
- Garmin user not registered for push
- Subscription not active

---

## Diagnostic Queries

### Check all activities (any user)
```sql
SELECT 
  id,
  athleteId,
  garminUserId,
  activityName,
  activityType,
  startTime,
  syncedAt
FROM athlete_activities
ORDER BY syncedAt DESC
LIMIT 10;
```

### Check your athlete's Garmin data
```sql
SELECT 
  garmin_user_id,
  garmin_is_connected,
  garmin_connected_at,
  garmin_access_token IS NOT NULL as has_access_token,
  garmin_refresh_token IS NOT NULL as has_refresh_token
FROM athletes
WHERE id = 'cmh9pl5in0000rj1wkijpxl2t';
```

### Check webhook endpoint
```bash
# Test if endpoint is reachable
curl https://gofastbackendv2-fall2025.onrender.com/api/garmin/activity
# Should return 404 or method not allowed (proves endpoint exists)
```

---

## Common Problems & Solutions

### Problem 1: Webhooks never received
**Symptoms:** Backend logs show nothing when you complete a workout

**Solutions:**
1. Verify webhook URL in Garmin Developer Portal
2. Check if Garmin user is registered for push notifications
3. Verify SSL certificate is valid
4. Check if webhook subscription is active

### Problem 2: Webhooks received but not saved
**Symptoms:** Logs show "webhook received" but no activity created

**Solutions:**
1. Check if `garmin_user_id` in athlete matches `userId` in webhook
2. Look for "No athlete found" warnings in logs
3. Verify database connection is working
4. Check for Prisma errors in logs

### Problem 3: Activities saved but wrong athlete
**Symptoms:** Activities exist but linked to different athleteId

**Solutions:**
1. Multiple athletes with same `garmin_user_id`?
2. Check athlete lookup logic in webhook handler
3. Verify `garmin_user_id` uniqueness

### Problem 4: Garmin connection incomplete
**Symptoms:** User ID exists but `garmin_is_connected` is false

**Solutions:**
1. Re-run Garmin OAuth flow
2. Check if tokens were saved properly
3. Verify webhook registration completed

---

## Next Steps Based on Results

### If NO activities in database at all:
→ Webhooks aren't being received
→ Check Garmin Developer Portal webhook settings
→ Verify user registration for push notifications

### If activities exist but wrong garminUserId:
→ ID mismatch between athlete record and webhooks
→ Check what `garmin_user_id` is stored in athlete record
→ May need to reconnect Garmin

### If activities exist but wrong athleteId:
→ Lookup logic is finding wrong athlete
→ Check webhook handler code
→ Verify `garmin_user_id` uniqueness

### If webhook logs show "No athlete found":
→ Your `garmin_user_id` in database doesn't match webhook
→ Check athlete record
→ Reconnect Garmin if needed

---

## Testing Checklist

- [ ] Run SQL query to check total activities in database
- [ ] Check Render logs for webhook receipt
- [ ] Verify `garmin_user_id` in athlete record
- [ ] Send manual test webhook
- [ ] Check Garmin Developer Portal webhook settings
- [ ] Verify user registered for push notifications
- [ ] Complete a test workout and monitor logs in real-time

---

**Current Status: 🔴 NO ACTIVITIES SHOWING**

Fill in findings below as you debug:

### Findings:
```
[Your notes here]
```

