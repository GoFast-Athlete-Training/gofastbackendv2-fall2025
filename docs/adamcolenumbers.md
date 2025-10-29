# Adam Cole Numbers - GoFast IDs

## Your Athlete Account

### Athlete ID
```
cmh9pl5in0000rj1wkijpxl2t
```

### Firebase ID
```
npICZjYVK5bKUTsEY6yEkZ9rDwY2
```

### Email
```
adam.cole.novadude@gmail.com
```

### Garmin User ID
```
94d7c995-d7d1-4c2c-856f-5ef41913a6bb
```

## How to Find Your IDs

### 1. Find Your Athlete ID
```bash
# Go to admin dashboard
https://dashboard.gofastcrushgoals.com/athlete-admin

# Click on your athlete
# Look for "Athlete ID" field
```

### 2. Find Your Garmin User ID
```bash
# In the athlete details, look for:
# - Garmin User ID field
# - Or check database directly:

SELECT id, email, garmin_user_id 
FROM athletes 
WHERE email = 'adam.cole.novadude@gmail.com';
```

### 3. Check Activities Linked to You
```bash
# Once you have your athlete ID, check:
GET /api/athlete/[YOUR_ATHLETE_ID]/activities

# Should return all activities linked to your account
```

## Verification Checklist

- [ ] Found athlete ID in database
- [ ] Found Garmin user ID in athlete record
- [ ] Checked if activities exist: `GET /api/athlete/activities`
- [ ] Verified activities have matching `athleteId` field
- [ ] Verified activities have matching `garminUserId` field

## Common Issues

**No activities showing:**
- Check if `garmin_user_id` in athlete record matches `garminUserId` in activities
- Check if you've completed any workouts since connecting Garmin
- Check backend logs for webhook receipt

**Activities exist but not linked:**
- Compare `garminUserId` in activity vs `garmin_user_id` in athlete
- If they don't match, your Garmin connection might need to be redone

---
*Fill in your IDs above, then use them to verify activities are linked to YOUR account*

