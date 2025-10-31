# Training Architecture - MyTraining System

## Core Purpose
GoFast UX to build a training plan and have users see how they're performing against it.

## The Flow
1. User sets a **Race** goal
2. Calculate weeks until race
3. Generate training plan (AI/CUP method) - **TrainingPlan**
4. User completes workouts, **Activities** sync from Garmin
5. Match activities to plan days
6. Run calculation service to analyze progress
7. Update predictions - is user on target for their 5k goal?

## Core Models

### 1. Race (Container Model - UNIVERSAL)
**Purpose**: The goal. Later ties to registration, events, etc.

**Fields**:
- raceName
- raceType (5k, 10k, half, marathon)
- raceDate
- location
- distanceMiles
- goalTime, goalPace
- baseline5k, baselineWeeklyMileage (at signup)
- status (planning, training, completed)

**Why Universal**: This isn't just training - it's the event goal. Could expand to:
- Registration links
- Course profiles
- Group events
- Sponsor integration

### 2. TrainingPlan
**Purpose**: The weekly plan structure

**Key Question**: 
- How to store the plan?
  - MongoDB had flexible arrays
  - Prisma/PostgreSQL - need structure
  - Options:
    1. JSON field (flexible, harder to query)
    2. Normalized Day-by-day (queryable, complex)
    3. Hybrid: weekly summaries + daily JSON

**Structure**:
- Links to: `athleteId`, `raceId`
- Metadata: startDate, totalWeeks, phase breakdown
- **Weekly structure**: Array of weeks
  - Each week: weekIndex, targetMileage, phase (base/build/peak/taper)
  - **Daily structure**: Array of days per week
    - Day fields: date, type, mileage, pace, description

**From Old Backend**:
- `TrainingPlan.js` - had `weeks` array
- `TrainingDay.js` - individual day model
- **Hybrid approach**: Plan had week summaries, Days were separate docs

**Old MongoDB Thinking** (Looking at models):
- **Hybrid approach**: TrainingPlan has week summaries WITH dayIds array
- **Separate TrainingDay collection**: Each day is its own doc
- Plan references days via `dayIds: [ObjectId]`

**Key insight**: This allows:
1. Plan is lightweight (just summaries)
2. Days are independent (can be queried, modified easily)
3. Days reference Session (activity) data

**SQL Decision Needed**: 
- [ ] Replicate MongoDB hybrid? (Plan + separate TrainingDay table)
- [ ] Or collapse to JSON array in TrainingPlan?
- [ ] Consider: Daily data is heavily accessed, JSON might not query well

### 3. Activity (Already exists!)
**Model**: `AthleteActivity`
- Already syncing from Garmin
- Has: date, distance, pace, HR, etc.
- **Key**: Links to athlete, but NOT to training plan

**Old Backend Had**: `Session` model that:
- Links to `trainingDayId` (optional)
- Has ALL the garmin data (detailed)
- TrainingDay references session in `actual.sessionId`

**Current State**: 
- We have `AthleteActivity` (similar to Session but different structure)
- Missing: Link to training plan

**Challenge**: 
- User can have activities that DON'T match their plan
- Need to link: Activity → TrainingDay (optional/suggested)
- UX: "Is this activity for your plan?"

**Architecture Decision**:
- [ ] Add `trainingDayId` to AthleteActivity?
- [ ] Or create separate linking table?
- [ ] Or have TrainingDay reference AthleteActivity?

## The Matching Problem

**Old Backend Had**: `TrainingDay` model that could link to Sessions/Activities

**The Flow**:
1. Plan generated with daily workouts
2. User runs workout
3. Garmin activity syncs to `AthleteActivity`
4. **Match step**: Link activity to the specific training day
5. **Analysis step**: Calculate variance, quality score
6. **Update step**: Adjust predictions

**Options**:
1. **Manual**: User selects "yes this matches my plan"
2. **Auto**: Match by date + fuzzy logic (pace, distance)
3. **Hybrid**: Auto-suggest, user confirms

## Calculation Services (From Old Backend)

### Found Services:

**1. TrainingDay.calculateAnalysis()** (in TrainingDay model):
- Compare actual vs planned
- Calculate variance (mileage, pace)
- Check if hit targets (within tolerance)
- Score quality (0-100)
- Thresholds: 0.5 miles, 15 sec/mile

**2. preTrainingRacePredictorService**:
- Initial race projection from baseline 5k
- Applies fatigue penalty based on race distance
- Calculates delta from goal
- Formula: `pacePerMile + ((distance - 3.1) / 6.2) * 10`

**3. Adaptive5kAutosaveService**:
- Auto-log 5k snapshots weekly
- Update adaptive metrics
- Track progress

**Key Calculations Needed**:
- ✅ Adaptive 5k time (based on recent workouts)
- ✅ Progress toward race goal (delta calculation)
- ✅ Weekly mileage adherence
- ✅ Quality score per workout
- ⚠️ Race predictor (CUP method, AI planning)
- ⚠️ Weekly adjustments based on progress

## The SQL Challenge

**MongoDB was flexible**:
```javascript
// Could have nested arrays, flexible docs
weeks: [{
  weekIndex: 0,
  days: [{
    type: "easy",
    mileage: 5,
    pace: "8:30"
  }]
}]
```

**PostgreSQL/Prisma needs**:
- Either normalize (separate tables for days)
- Or use JSON fields (lose queryability)
- **OR hybrid**: Core plan as JSON, critical fields indexed

## UX Flow

### Setup Phase
1. User creates **Race** goal
2. System calculates weeks
3. AI generates **TrainingPlan** from:
   - Current fitness (baseline5k, weekly mileage)
   - Goal (race type, time)
   - Time until race
4. Plan stored as flexible structure

### Active Training Phase
1. User views this week's workouts (TrainingDay docs)
2. User completes workout
3. Garmin syncs → `AthleteActivity` (or Session) created
4. User links activity to plan day (or auto-match)
5. **TrainingDay.hydrateGarminData()** called
6. **TrainingDay.calculateAnalysis()** runs:
   - Compare actual vs planned
   - Calculate variance (mileage, pace)
   - Score quality (0-100)
   - Check if hit targets
7. Update Race.currentPrediction (adaptive 5k)
8. Weekly: Adjust next week based on progress

### Tracking Phase
- "Are you on track?" dashboard
- 5k predictor updates
- Weekly insights
- Plan adjustments

## Key Architectural Decisions Needed

1. **TrainingPlan Storage**:
   - [ ] Look at old mongo models
   - [ ] Decide: JSON blob vs normalized
   - [ ] Hybrid approach?

2. **Activity Linking**:
   - [ ] Add `trainingDayId` to `AthleteActivity`?
   - [ ] Or separate linking table?
   - [ ] Auto-match logic?

3. **Calculation Services**:
   - [ ] Find old services
   - [ ] Port to PostgreSQL
   - [ ] Recreate predictive logic

4. **Flexibility**:
   - [ ] How to handle plan changes?
   - [ ] Missed workouts?
   - [ ] Injury setbacks?
   - [ ] Extra runs outside plan?

## Related Old Backend Files

**Models** (MongoDB):
- `models/GoFast/Race.js`
- `models/GoFast/TrainingPlan.js`
- `models/GoFast/TrainingDay.js`
- `models/GoFast/Session.js`

**Services** (Business Logic):
- `services/GoFast/TrainingPlanGeneratorService.js`
- `services/GoFast/TrainingDayService.js`
- `services/performanceAdaptiveService.js`
- `services/preTrainingRacePredictorService.js`
- `services/Adaptive5kAutosaveService.js`

**Routes**:
- `routes/GoFast/trainingPlanRoutes-v2.js`
- `routes/GoFast/trainingDayRoutes.js`

## FINAL SQL ARCHITECTURE (Adam Approved - Execution Split)

**Goal**: Separate PLAN (logic) from EXECUTION (storage/performance). Modular but efficient.

### Models:

**Race** (PUBLIC, like hotel):
```prisma
model Race {
  id, raceName, raceType, raceDate, location, distanceMiles
  registrationUrl, description, courseProfile
  createdByAthleteId? // Optional
  trainingPlans TrainingPlan[]
}
```

**TrainingPlan** (Blueprint + hydrated days):
```prisma
model TrainingPlan {
  athleteId, raceId
  
  // GOALS
  goalTime, goalPace, baseline5k, baselineWeeklyMileage
  
  // PLAN STRUCTURE (JSON arrays) - THE BLUEPRINT
  startDate, totalWeeks
  phaseOverview Json       // { base: {...}, build: {...}, ... }
  weeks Json               // [{ weekIndex, startDate, endDate, phase, targetMileage }]
  
  // MONEY METRIC
  adaptive5kTime String    // Only persistent metric!
  
  // RELATIONS
  plannedDays TrainingDayPlanned[]  // Hydrated version of blueprint
  executions TrainingPlanExecution[]
}
```

**TrainingPlanExecution** (Execution tracker):
```prisma
model TrainingPlanExecution {
  trainingPlanId
  startedAt DateTime
  status String
  
  // RELATIONS
  trainingPlan TrainingPlan @relation(...)
  executedDays TrainingDayExecuted[]  // Only the completions
}
```

**TrainingDayPlanned** (hydrated & saved version of blueprint):
```prisma
model TrainingDayPlanned {
  trainingPlanId  // Links to TrainingPlan
  weekIndex, dayIndex, date
  plannedData Json  // { type, mileage, pace, HR, description, etc }
}
```

**TrainingDayExecuted** (completion shell):
```prisma
model TrainingDayExecuted {
  executionId           // Links to TrainingPlanExecution
  activityId            // THE LINK - shell container for AthleteActivity
  
  // Optional metadata for context
  weekIndex, dayIndex, date
  
  // Snapshot/computed fields (can be derived from activityId)
  plannedData Json?     // Snapshot when executed
  analysis Json?        // Variance, quality score (computed from actual vs planned)
}
```

**Note**: Most data comes from `AthleteActivity` via `activityId`. This is just a shell to link plan execution to Garmin activity.

**Key Insights**:
- **TrainingPlan** = blueprint (goals, weeks, phases, adaptive5k)
- **TrainingDayPlanned** = indexed store for hydration (query by weekIndex/dayIndex/date)
- **TrainingPlanExecution** = tracks when athlete started this plan execution
- **TrainingDayExecuted** = shell linking completion to `activityId` (70 days × users)
- Separates blueprint from hydrated plan from completions

**Current State**:
- ✅ Architecture finalized with Adam
- ✅ Prisma schema implemented and linter-clean
- ⚠️ Schema NOT pushed to Render yet
- ⚠️ Old route files from earlier attempt need cleanup
- ❌ Need routes created for new models
- ❌ Need services ported from old backend

**Next Steps**:
1. [x] Architecture finalized
2. [x] Prisma schema implemented
3. [ ] Adam reviews and approves schema
4. [ ] Delete old route files
5. [ ] Create new routes for TrainingPlan, TrainingDayPlanned, TrainingPlanExecution, TrainingDayExecuted
6. [ ] Port calculation services (calculateAnalysis, predictor, adaptive5k)
7. [ ] Test hydration flow

---

*This is living architecture - update as we learn more!*

