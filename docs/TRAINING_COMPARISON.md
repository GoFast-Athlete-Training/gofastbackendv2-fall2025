# Training System Comparison: tripwell-gofastbackend (OG) vs gofastbackendv2-fall2025

## Overview
This document compares the original training implementation in `tripwell-gofastbackend` with the current state in `gofastbackendv2-fall2025` to identify what's implemented, what's missing, and what needs to be ported.

---

## The Training Flow (As Designed)

### 1. User Selects Race → Calculate Weeks
- **Input**: Race date, race type, distance
- **Output**: Total weeks until race
- **Logic**: `Math.ceil((raceDate - startDate) / (1000 * 60 * 60 * 24 * 7))`

### 2. User Sets Goal → Calculate Goal Pace
- **Input**: Goal time, race distance
- **Output**: Goal pace per mile
- **Logic**: `goalTime / distanceMiles` → convert to MM:SS format

### 3. 5K Prediction Sets Baseline
- **Input**: Current 5K time (baseline5k)
- **Output**: Projected race time, pace, delta from goal
- **Service**: `preTrainingRacePredictorService.js`
- **Formula**: 
  - Convert 5K time to pace per mile
  - Apply fatigue penalty: `pacePerMile + ((distance - 3.1) / 6.2) * 10`
  - Project race time from adjusted pace

### 4. Weekly Mileage and Phases
- **Phases**: base, build, peak, taper
- **Phase Breakdown**: Calculated from total weeks
  - Base: ~25% of weeks
  - Build: ~35% of weeks
  - Peak: ~20% of weeks
  - Taper: Remaining weeks
- **Weekly Mileage Progression**:
  - Base: Baseline mileage
  - Build: Gradual increase (base + weekIndex * 2)
  - Peak: Peak mileage (base * 1.5)
  - Taper: Reduce by 30% per week

### 5. Each Week Calculates Workout Based on Phase Logic
- **Daily Workout Builder**: `DailyWorkoutBuilderService.js`
- **Inputs**: Day name, phase, weekIndex, mileage, current5K pace, age
- **Output**: Workout type, pace range, HR zone, segments, description
- **Workout Types**: rest, easy, tempo, intervals, long_run, race_pace, hills, fartlek, recovery, sharpener, over_unders, cross_train

### 6. Uses Garmin Activity → Calculate If You Met Pace and Heart Rate Totals
- **Hydration**: Link `AthleteActivity` to `TrainingDayExecuted`
- **Analysis**: Compare actual vs planned
  - Mileage variance (within 0.5 miles = hit target)
  - Pace variance (within 15 sec/mile = hit target)
  - HR zone check (avg HR in target zone)
- **Quality Score**: 0-100 based on hitting targets
- **Method**: `TrainingDay.calculateAnalysis()`

---

## Original Implementation (tripwell-gofastbackend)

### Models (MongoDB)

#### TrainingPlan Model
```javascript
{
  userId, raceId,
  startDate, raceDate, totalWeeks,
  phaseOverview: { base, build, peak, taper },
  weeklyMileagePlan: [{ weekIndex, targetMileage, phase }],
  weeks: [{
    weekIndex, startDate, endDate, phase, targetMileage,
    dayIds: [ObjectId],  // References to TrainingDay docs
    workoutTypes: [String],
    keyWorkouts: [String]
  }],
  status: 'draft' | 'active' | 'completed' | 'archived'
}
```

#### TrainingDay Model
```javascript
{
  userId, raceId, trainingPlanId,
  date, weekIndex, dayIndex, dayName, phase,
  planned: {
    type, mileage, duration, paceRange, targetPace,
    hrZone, hrRange, segments, label, description, coachNotes
  },
  actual: {
    completed, mileage, duration, pace,
    avgHR, maxHR, hrZoneDistribution,
    cadence, elevationGain, calories,
    sessionId, garminActivityId, completedAt, syncedAt
  },
  analysis: {
    workoutCompleted, hitTargetMileage, hitTargetPace, stayedInHRZone,
    mileageVariance, paceVariance, qualityScore, performanceNotes
  },
  feedback: {
    mood, effort, injuryFlag, notes, submittedAt
  }
}
```

**Key Methods**:
- `hydrateGarminData(garminData)` - Populate actual from Garmin
- `calculateAnalysis()` - Compare actual vs planned, calculate quality score

### Services

#### TrainingPlanGeneratorService.js
- `generateTrainingPlan(raceId, userAge)` - Main generator
- `generateWeek({ weekIndex, phaseMap, weeklyMileagePlan, race, plan, ... })` - Generate week
- `activateTrainingPlan(planId)` - Activate draft plan
- `getTrainingPlan(raceId)` - Get plan with populated days

**Key Logic**:
- Calculate phase breakdown from total weeks
- Calculate weekly mileage progression by phase
- Generate all weeks with daily workouts
- Create TrainingDay documents for each day
- Build week summaries with dayIds references

#### TrainingDayService.js
- `getTodayWorkout(userId)` - Get today's workout
- `getWorkoutByDate(userId, date)` - Get workout for date
- `getWeekWorkouts(userId, weekIndex)` - Get all workouts for week
- `hydrateGarminData(userId, activityDate)` - Link Garmin activity to training day
- `submitWorkoutFeedback(trainingDayId, feedbackData)` - User feedback
- `getWeeklySummary(userId, weekIndex)` - Week completion stats
- `getTrainingProgress(userId)` - Overall progress

#### preTrainingRacePredictorService.js
- `preTrainingRacePredictor(userId, goalTime)` - Predict race time from 5K baseline
- Formula: `pacePerMile + ((distance - 3.1) / 6.2) * 10` (fatigue penalty)
- Returns: `{ base5k, projectedTime, projectedPace, deltaFromGoal }`

### Utilities

#### phaseUtils.js
- `getPhaseMap(totalWeeks)` - Calculate phase breakdown
- Returns: `[{ name: 'Base', weeks: [1,2,3] }, { name: 'Build', weeks: [4,5,6] }, ...]`

#### DailyWorkoutBuilderService.js
- `buildDailyWorkout({ day, phase, weekIndex, mileage, current5kPace, age })`
- Returns workout structure with type, pace range, HR zone, segments, description

#### LongRunUtils.js
- `getLongRunMileage(weekMileage)` - Calculate long run distance (typically 20-30% of weekly)

#### DailyMileageUtils.js
- `splitMileageAcrossDays(weekMileage, longRun)` - Distribute mileage across 7 days

### Routes

#### trainingPlanRoutes-v2.js
- `POST /api/training/plan/generate` - Generate plan from race
- `GET /api/training/plan/:planId` - Get plan
- `PUT /api/training/plan/:planId/activate` - Activate plan

#### trainingDayRoutes.js
- `GET /api/training/day/today` - Get today's workout
- `GET /api/training/day/date/:date` - Get workout for date
- `GET /api/training/day/week/:weekIndex` - Get week workouts
- `POST /api/training/day/:dayId/hydrate` - Link Garmin activity
- `POST /api/training/day/:dayId/feedback` - Submit feedback

---

## Current Implementation (gofastbackendv2-fall2025)

### Models (Prisma/PostgreSQL)

#### TrainingPlan ✅
```prisma
model TrainingPlan {
  id, athleteId, raceId,
  goalTime, goalPace, baseline5k, baselineWeeklyMileage,
  startDate, totalWeeks,
  phaseOverview Json?,
  weeklyMileagePlan Json?,
  weeks Json?,
  adaptive5kTime String?,
  status String @default("draft"),
  plannedDays TrainingDayPlanned[],
  executions TrainingPlanExecution[]
}
```

#### TrainingDayPlanned ✅
```prisma
model TrainingDayPlanned {
  id, trainingPlanId, athleteId,
  date, weekIndex, dayIndex, dayName, phase,
  plannedData Json  // { type, mileage, paceRange, hrZone, ... }
}
```

#### TrainingPlanExecution ✅
```prisma
model TrainingPlanExecution {
  id, trainingPlanId,
  startedAt, status,
  executedDays TrainingDayExecuted[]
}
```

#### TrainingDayExecuted ✅
```prisma
model TrainingDayExecuted {
  id, executionId, athleteId,
  activityId String? @unique,  // Links to AthleteActivity
  weekIndex, dayIndex, date,
  plannedData Json?,
  analysis Json?,  // { workoutCompleted, hitTargetMileage, hitTargetPace, ... }
  feedback Json?
}
```

**Key Difference**: 
- OG: Single `TrainingDay` model with planned/actual/analysis in one doc
- New: Split into `TrainingDayPlanned` (blueprint) and `TrainingDayExecuted` (completions)
- New: `TrainingDayExecuted.activityId` links to `AthleteActivity` (not Session)

### Routes

#### trainingRaceRoute.js ✅
- `POST /api/training/race/create` - Create race goal
- `GET /api/training/race/all` - Get all races
- `GET /api/training/race/:raceId` - Get race
- `PUT /api/training/race/:raceId` - Update race
- `DELETE /api/training/race/:raceId` - Delete race

#### trainingPlanRoute.js ✅ (Partial)
- `GET /api/training/plan/race/:raceId` - Get plans for race
- `GET /api/training/plan/active` - Get active plan
- `GET /api/training/plan/:planId` - Get plan
- `PUT /api/training/plan/:planId/status` - Update status
- ❌ **MISSING**: `POST /api/training/plan/create` - Generate plan

#### trainingDayRoute.js ✅ (Partial)
- `GET /api/training/day/today` - Get today's workout
- `GET /api/training/day/date/:date` - Get workout for date
- `GET /api/training/day/week/:weekIndex` - Get week workouts
- `POST /api/training/day/:trainingDayId/feedback` - Submit feedback
- `PUT /api/training/day/:trainingDayId/actual` - Link activity
- ❌ **MISSING**: Auto-hydration from Garmin webhook
- ❌ **MISSING**: Analysis calculation service

### Services

#### ❌ **MISSING**: TrainingPlanGeneratorService
- Need to port `generateTrainingPlan()` logic
- Need to port `generateWeek()` logic
- Need to port phase calculation
- Need to port mileage progression

#### ❌ **MISSING**: TrainingDayService (Analysis)
- Need to port `calculateAnalysis()` logic
- Need to port quality score calculation
- Need to port pace/mileage variance checks

#### ❌ **MISSING**: preTrainingRacePredictorService
- Need to port 5K prediction logic
- Need to port fatigue penalty formula
- Need to port goal delta calculation

#### ❌ **MISSING**: Utilities
- `phaseUtils.js` - Phase breakdown calculation
- `DailyWorkoutBuilderService.js` - Daily workout generation
- `LongRunUtils.js` - Long run calculation
- `DailyMileageUtils.js` - Mileage distribution

### Garmin Integration

#### ✅ AthleteActivity Model
- Already syncing from Garmin webhooks
- Has: distance, pace, avgHR, maxHR, duration, etc.
- Stored in `AthleteActivity` table

#### ❌ **MISSING**: Activity → TrainingDay Linking
- OG: `TrainingDay.actual.sessionId` → `Session` → `GarminActivity`
- New: `TrainingDayExecuted.activityId` → `AthleteActivity`
- Need: Auto-match logic (by date + fuzzy matching)
- Need: Manual linking endpoint
- Need: Analysis calculation when linked

---

## What's Missing (Priority Order)

### 1. Training Plan Generation (CRITICAL)
- [ ] Port `TrainingPlanGeneratorService.js`
- [ ] Port `phaseUtils.js` (phase breakdown)
- [ ] Port `DailyWorkoutBuilderService.js` (daily workouts)
- [ ] Port `LongRunUtils.js` and `DailyMileageUtils.js`
- [ ] Create `POST /api/training/plan/create` route
- [ ] Generate `TrainingDayPlanned` records for all days

### 2. 5K Prediction Service (HIGH)
- [ ] Port `preTrainingRacePredictorService.js`
- [ ] Create route: `POST /api/training/predictor`
- [ ] Calculate goal pace from goal time
- [ ] Calculate projected time from baseline 5K
- [ ] Calculate delta from goal

### 3. Garmin Activity Linking (HIGH)
- [ ] Auto-match `AthleteActivity` to `TrainingDayPlanned` by date
- [ ] Create `TrainingDayExecuted` when activity matches
- [ ] Manual linking endpoint: `POST /api/training/day/:dayId/link-activity`
- [ ] Trigger analysis calculation on link

### 4. Analysis Calculation (HIGH)
- [ ] Port `TrainingDay.calculateAnalysis()` logic
- [ ] Calculate mileage variance (within 0.5 miles)
- [ ] Calculate pace variance (within 15 sec/mile)
- [ ] Calculate HR zone adherence
- [ ] Calculate quality score (0-100)
- [ ] Store in `TrainingDayExecuted.analysis` JSON

### 5. Weekly Mileage Progression (MEDIUM)
- [ ] Port `calculateMileageProgression()` logic
- [ ] Base phase: baseline mileage
- [ ] Build phase: gradual increase
- [ ] Peak phase: peak mileage (1.5x baseline)
- [ ] Taper phase: reduce by 30% per week

### 6. Frontend UI (MEDIUM)
- [ ] Race creation form (race name, date, type, goal time)
- [ ] Baseline input (current 5K time, weekly mileage)
- [ ] Plan generation button
- [ ] Today's workout view
- [ ] Week view (all workouts)
- [ ] Activity linking UI (match Garmin activities to plan days)
- [ ] Progress dashboard (completion rate, mileage, quality scores)

---

## Key Architectural Differences

### OG (MongoDB)
- **Single TrainingDay model**: Planned + Actual + Analysis in one document
- **Session model**: Detailed Garmin data, linked to TrainingDay
- **Flexible JSON**: Easy to store nested workout structures
- **Virtual methods**: `calculateAnalysis()` on model instance

### New (PostgreSQL/Prisma)
- **Split models**: `TrainingDayPlanned` (blueprint) + `TrainingDayExecuted` (completions)
- **AthleteActivity model**: Already exists, replaces Session
- **JSON fields**: Use JSON for flexible workout data
- **Service layer**: Analysis calculation in service, not model method

### Migration Strategy
1. Keep the split architecture (Planned vs Executed) - it's cleaner
2. Port calculation logic to services (not model methods)
3. Use `TrainingDayExecuted.activityId` to link to `AthleteActivity`
4. Store analysis results in `TrainingDayExecuted.analysis` JSON field

---

## Next Steps

1. **Create Training Plan Generator Service**
   - Port phase calculation
   - Port weekly mileage progression
   - Port daily workout builder
   - Generate `TrainingDayPlanned` records

2. **Create POST /api/training/plan/create Route**
   - Accept: raceId, athleteId, baseline5k, baselineWeeklyMileage, goalTime
   - Call generator service
   - Return: plan with all planned days

3. **Create 5K Predictor Service**
   - Port prediction logic
   - Calculate goal pace
   - Calculate projected time
   - Calculate delta

4. **Create Activity Linking Service**
   - Auto-match by date
   - Create `TrainingDayExecuted` on match
   - Calculate analysis
   - Manual linking endpoint

5. **Create Analysis Calculation Service**
   - Port `calculateAnalysis()` logic
   - Compare actual vs planned
   - Calculate quality score
   - Store in `TrainingDayExecuted.analysis`

---

## Files to Port

### From tripwell-gofastbackend:
- `services/GoFast/TrainingPlanGeneratorService.js` → Port to new service
- `services/preTrainingRacePredictorService.js` → Port to new service
- `services/GoFast/TrainingDayService.js` → Port analysis logic
- `utils/phaseUtils.js` → Port phase calculation
- `services/Archive/DailyWorkoutBuilderService.js` → Port workout builder
- `utils/LongRunUtils.js` → Port long run calculation
- `utils/DailyMileageUtils.js` → Port mileage distribution

### To Create in gofastbackendv2-fall2025:
- `services/trainingPlanGeneratorService.js` (NEW)
- `services/trainingDayAnalysisService.js` (NEW)
- `services/preTrainingRacePredictorService.js` (NEW)
- `utils/phaseUtils.js` (NEW)
- `utils/dailyWorkoutBuilder.js` (NEW)
- `utils/longRunUtils.js` (NEW)
- `utils/dailyMileageUtils.js` (NEW)
- `routes/Training/trainingPlanRoute.js` - Add POST /create endpoint

---

*Last Updated: [Current Date]*
*Status: Architecture documented, ready for implementation*

