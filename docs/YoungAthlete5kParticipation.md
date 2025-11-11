# Young Athlete 5K Participation - BGR Discovery 5K

**Last Updated**: January 2025  
**Event**: Boys Gotta Run – Discovery 5K  
**Event ID**: `cmht9p0800001p21xn5tjp5nc`  
**Use Case**: End-of-season race participation with goal setting

---

## Context

This use case represents a **"starting at the end"** scenario. The standard young athlete flow would include:

- **Week-to-week tracking** - Regular training logs, progress metrics
- **Ongoing goal setting** - Weekly goals, milestone tracking
- **Long-term engagement** - Multi-week/multi-month participation

However, for the BGR Discovery 5K, we're initiating the goal-setting flow **just before race day**. This is "too little too late" for full tracking, but we're capturing:

1. **Pre-race goals** - What the young athlete wants to achieve
2. **Race results** - Linking Garmin data to race performance
3. **Post-race reflection** - Seeing goals vs. results

---

## Flow Overview

### Phase 1: Parent Onboarding

**Step 1: Engagement Landing** (`/engagement`)
- Parent clicks "Start Here" from race overview page
- Auth check: Signed in → ParentWelcome, Not signed in → ParentPreProfileExplainer

**Step 2: Sign In** (if not signed in)
- Google OAuth via Firebase
- Auto-navigates to ParentWelcome after sign-in

**Step 3: Parent Welcome** (`/engagement`)
- Creates/finds athlete via `/api/athlete/create`
- Stores `athleteId` in localStorage
- Shows "Continue" button

**Step 4: Parent Profile** (`/engagement/parent-profile`)
- Pre-filled form from Firebase (name, email)
- User can edit and submit
- Stores `athleteId` + `eventId` in localStorage
- Navigates to YouthRegistration

### Phase 2: Young Athlete Registration

**Step 5: Youth Registration** (`/engagement/youth-registration`)
- Form: firstName, lastName, grade (optional), school (optional)
- Creates young athlete via `/api/young-athlete/register`
- Body: `{ athleteId, eventCode: eventId, firstName, lastName, grade?, school? }`
- Stores `youngAthleteId` + ensures `eventId` in localStorage
- Navigates to PreRaceGoals

### Phase 3: Goal Setting

**Step 6: Pre-Race Goals** (`/engagement/goals`)
- Conversational form:
  - Target Pace (optional)
  - Target Distance (optional)
  - Who are you running for? (motivation - optional)
  - How do you want to feel? (feeling - optional)
- Upserts goal via `/api/young-athlete/:id/goal`
- Body: `{ eventCode: eventId, targetPace?, targetDistance?, motivation?, feeling? }`
- Navigates to YoungAthleteHome

### Phase 4: Race Day & Results

**Step 7: Young Athlete Home** (`/engagement/home`)
- Hydrates profile via `/api/young-athlete/:id`
- Shows:
  - Goal summary (if set)
  - Parent's recent Garmin runs (last 10 running activities)
  - "Make this my 5K" button for each run
- Parent clicks "Make this my 5K" → Claims activity via `/api/event-result/claim`
- Body: `{ eventCode: eventId, youngAthleteId, authorAthleteId, activityId }`
- After claiming → Navigates to Leaderboard

**Step 8: Leaderboard** (`/engagement/leaderboard`)
- Public view (no auth required)
- Fetches via `/api/events/:eventCode/leaderboard`
- Shows:
  - Young athlete name, grade, school
  - Race time, distance, pace
  - Goal motivation (if set)
- Sorted by creation time (most recent first)

---

## Data Flow

### Registration Flow
```
ParentWelcome
  → POST /api/athlete/create
  → Stores athleteId in localStorage

ParentProfile
  → POST /api/athlete/create (upsert)
  → Stores athleteId + eventId in localStorage

YouthRegistration
  → POST /api/young-athlete/register
  → Body: { athleteId, eventCode: eventId, firstName, lastName, grade?, school? }
  → Stores youngAthleteId + eventId in localStorage
```

### Goal Setting Flow
```
PreRaceGoals
  → POST /api/young-athlete/:id/goal
  → Body: { eventCode: eventId, targetPace?, targetDistance?, motivation?, feeling? }
  → Upserts EventGoal (one per young athlete per event)
```

### Result Claiming Flow
```
YoungAthleteHome
  → GET /api/young-athlete/:id (hydrate with goals + results)
  → GET /api/athlete/:athleteId/activities (parent's Garmin runs)
  → POST /api/event-result/claim
  → Body: { eventCode: eventId, youngAthleteId, authorAthleteId, activityId }
  → Upserts EventResult (one per young athlete per event)
```

### Leaderboard Flow
```
Leaderboard
  → GET /api/events/:eventCode/leaderboard (public, no auth)
  → Returns: [ { youngAthlete, activity, goals[] } ]
```

---

## localStorage State Management

### Keys Used
- `athleteId` - Parent athlete ID
- `youngAthleteId` - Young athlete ID  
- `eventId` - Event ID (used as `eventCode` in API calls)

### Flow Through Pages
```
ParentWelcome → athleteId
ParentProfile → athleteId + eventId
YouthRegistration → youngAthleteId + eventId
PreRaceGoals → Uses youngAthleteId + eventId
YoungAthleteHome → Uses youngAthleteId + eventId
Leaderboard → Uses eventId (from config, not localStorage)
```

---

## What's Missing (Standard Flow)

### Week-to-Week Tracking
- **Training logs** - Daily/weekly run tracking
- **Progress metrics** - Weekly mileage, pace improvements
- **Milestone tracking** - Distance milestones, consistency streaks
- **Coach feedback** - Parent/coach notes on progress

### Ongoing Goal Setting
- **Weekly goals** - Not just race day goals
- **Process goals** - "Run 3x this week", "Finish strong"
- **Outcome goals** - "Run under 30 minutes", "Feel good"

### Long-term Engagement
- **Multi-event participation** - Same kid, multiple races
- **Season tracking** - Fall season, spring season, etc.
- **Year-over-year** - Compare this year to last year

---

## Current Limitations

1. **No pre-race training tracking** - We're starting at race day
2. **Single event focus** - Hardcoded to BGR5K event
3. **No week-to-week metrics** - Just race day result
4. **Goal setting is minimal** - Just pre-race, not ongoing

---

## Future: Full Young Athlete Flow

### Standard Flow (Future)
```
Week 1: Registration + Initial Goal Setting
Week 2-6: Weekly Training Logs + Progress Tracking
Week 7: Pre-Race Goal Refinement
Race Day: Result Claiming
Post-Race: Goal vs. Result Reflection
```

### This Use Case (Current)
```
Race Week: Registration + Goal Setting
Race Day: Result Claiming
Post-Race: Leaderboard View
```

---

## Event Configuration

### Current Hardcoding
- Event ID: `cmht9p0800001p21xn5tjp5nc` (from BGR5K config)
- Event Code: Same as Event ID (stored as `eventCode` field)
- Config: `src/config/boysonrun5kvolunteerconfig.ts`

### Future: Event Config Mapper
- Centralized event configuration service
- Map event codes to event details
- Support multiple events dynamically
- Event-specific goal templates, fields, etc.

---

## Key Takeaways

1. ✅ **This is MVP** - Minimal viable flow for race day participation
2. ✅ **Goal setting works** - Pre-race goals captured and displayed
3. ✅ **Results work** - Garmin activities can be claimed as race results
4. ✅ **Leaderboard works** - Public view of all results
5. ⚠️ **Missing week-to-week tracking** - Standard flow would include this
6. ⚠️ **Hardcoded event** - Future needs event config mapper service
7. ✅ **Foundation is solid** - Architecture supports future enhancements

---

**Last Updated**: January 2025  
**Status**: MVP Implementation - "Starting at the End"  
**Next Steps**: Add week-to-week tracking, event config mapper service, multi-event support

