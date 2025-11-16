# Young Athlete Refactor Plan

**Last Updated**: January 2025  
**Status**: Planning - New Repo Approach  
**Context**: Tried to "bolt on" too much without recognizing consequences

---

## What Persists (Current Implementation)

### Frontend Components (GoFast-Events)
- ✅ `ParentSplash` - Auth gate component
- ✅ `ParentPreProfileExplainer` - Signup/signin flow
- ✅ `ParentProfile` - Parent profile form
- ✅ `YouthRegistration` - Young athlete registration
- ✅ `PreRaceGoals` - Goal setting form
- ✅ `YoungAthleteHome` - Home dashboard
- ✅ `Leaderboard` - Public leaderboard
- ✅ Route structure: `/5k-results/*`
- ✅ GoFast branding (orange/red)

### Frontend Components (MVP1)
- ✅ `YoungAthleteWelcome` - Hydration/routing gate
- ✅ Route: `/young-athlete/welcome`

### Backend Routes
- ✅ `/api/young-athlete/register`
- ✅ `/api/young-athlete/:id/goal`
- ✅ `/api/young-athlete/:id`
- ✅ `/api/young-athlete/by-athlete/:athleteId`
- ✅ `/api/event-result/claim`
- ✅ `/api/events/:eventCode/leaderboard`

### Documentation
- ✅ `youngathlete-architecture.md` - Current architecture
- ✅ `YoungAthlete5kParticipation.md` - Use case documentation
- ✅ `youngathlete-refactor-architecture.md` - Proposed refactor

---

## What Needs New Repo

### Why New Repo?

**Problem**: Tried to bolt on to existing `Athlete` model without recognizing:
- Parents have different UX/flow than Athletes
- Young athletes need separate Garmin app/feed
- Mixing concerns created complexity

**Solution**: Clean separation in new repo

### New Repo Structure

```
young-athlete-platform/
├── backend/
│   ├── models/
│   │   ├── Parent.prisma
│   │   ├── YoungAthlete.prisma
│   │   ├── YoungAthleteActivity.prisma
│   │   ├── EventGoal.prisma
│   │   └── EventResult.prisma
│   ├── routes/
│   │   ├── parent/
│   │   ├── young-athlete/
│   │   ├── garmin/young-athlete/
│   │   └── event-result/
│   └── services/
│       └── GarminYoungAthleteService.js
├── frontend/
│   ├── pages/
│   │   ├── ParentSplash.tsx
│   │   ├── ParentProfile.tsx
│   │   ├── YouthRegistration.tsx
│   │   ├── PreRaceGoals.tsx
│   │   ├── YoungAthleteHome.tsx
│   │   └── Leaderboard.tsx
│   └── components/
│       └── Engagement.tsx
└── docs/
    └── architecture.md
```

### Key Architectural Decisions

1. **Parent Model** - Universal personhood, separate from Athlete
2. **YoungAthleteActivity** - Separate Garmin feed (new Garmin app)
3. **Clean Separation** - No mixing with existing Athlete/RunCrew flows
4. **Event-Scoped** - Each young athlete tied to specific event

---

## Migration Path

### Phase 1: New Repo Setup
1. Create new repo: `young-athlete-platform`
2. Copy existing components/routes that persist
3. Implement new `Parent` model
4. Implement `YoungAthleteActivity` model
5. Set up separate Garmin OAuth app

### Phase 2: Data Migration
1. Export existing `YoungAthlete` data
2. Create `Parent` records
3. Migrate `athleteId` → `parentId`
4. Set up new Garmin webhook endpoint

### Phase 3: Frontend Migration
1. Update routes to use `parentId`
2. Update API calls to new endpoints
3. Implement separate Garmin OAuth flow for young athletes

---

## Lessons Learned

1. **Don't Bolt On** - Recognize when you need separate architecture
2. **Separate Concerns** - Parents ≠ Athletes, different UX/flows
3. **Plan for Scale** - Separate Garmin apps = cleaner architecture
4. **Clean Slate** - Sometimes new repo is better than refactoring existing

---

## Current State

- ✅ Frontend components work (using `athleteId` temporarily)
- ✅ Backend routes work (using `Athlete` model temporarily)
- ✅ Documentation complete
- ⏳ Waiting for new repo to implement clean architecture

---

**Last Updated**: January 2025  
**Next Step**: Spin up new `young-athlete-platform` repo


