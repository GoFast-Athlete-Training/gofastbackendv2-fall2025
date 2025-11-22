# Training Architecture Migration Summary

## Overview

This migration implements the layered training architecture model:
- **ATHLETE** (identity-level) - User identity and preferences
- **TRAINING PLAN** (cycle-level) - Specific training cycle for a race
- **TRAINING PHASE** (cycle blocks) - Phases within a plan (base, build, peak, taper)
- **TRAINING DAY PLANNED** (items in each phase) - Individual planned workouts
- **TRAINING DAY EXECUTED** (runtime completions) - Actual workout completions

---

## Breaking Changes

### 1. Athlete Model Field Renames

All training-related identity fields have been renamed with `my` prefix:

| Old Field Name | New Field Name | Type | Notes |
|---------------|----------------|------|-------|
| `currentPace` | `myCurrentPace` | `String?` | Identity-level current pace |
| `weeklyMileage` | `myWeeklyMileage` | `Int?` | Identity-level weekly mileage |
| `trainingGoal` | `myTrainingGoal` | `String?` | Identity-level training goal |
| `targetRace` | `myTargetRace` | `String?` | Identity-level target race |
| `trainingStartDate` | `myTrainingStartDate` | `DateTime?` | Identity-level training start date |
| `paceRange` | `myPaceRange` | `String?` | Identity-level pace range |
| `runningGoals` | `myRunningGoals` | `String?` | Identity-level running goals |

**Note:** `preferredDistance` and `timePreference` remain unchanged (not training-specific).

### 2. TrainingPlan Model Field Renames

All cycle-level fields have been renamed with `trainingPlan` prefix:

| Old Field Name | New Field Name | Type | Notes |
|---------------|----------------|------|-------|
| `goalTime` | `trainingPlanGoalTime` | `String` | Required - cycle-specific goal time |
| `goalPace` | `trainingPlanGoalPace` | `String?` | Optional - cycle-specific goal pace |
| `baseline5k` | `trainingPlanBaseline5k` | `String` | Required - cycle-specific baseline 5K |
| `baselineWeeklyMileage` | `trainingPlanBaselineWeeklyMileage` | `Int?` | Optional - cycle-specific baseline mileage |
| `startDate` | `trainingPlanStartDate` | `DateTime` | Required - cycle start date |
| `totalWeeks` | `trainingPlanTotalWeeks` | `Int` | Required - total weeks in cycle |
| `adaptive5kTime` | `trainingPlanAdaptive5kTime` | `String?` | Optional - adaptive 5K prediction |

### 3. TrainingPlan Model - New Required Field

| Field Name | Type | Notes |
|-----------|------|-------|
| `trainingPlanName` | `String` | **NEW REQUIRED** - Name for the training plan |

### 4. TrainingPlan Model - Removed Fields

The following JSON fields have been **removed** (will be derived through TrainingPhase + TrainingDayPlanned):

| Removed Field | Previous Purpose |
|--------------|------------------|
| `phaseOverview` | JSON structure describing phase breakdown |
| `weeklyMileagePlan` | JSON array of weekly mileage targets |
| `weeks` | JSON array of week summaries |

### 5. New TrainingPhase Model

**New Model:** `TrainingPhase`

| Field Name | Type | Notes |
|-----------|------|-------|
| `id` | `String` | Primary key (CUID) |
| `trainingPlanId` | `String` | Foreign key to TrainingPlan (required) |
| `phaseName` | `String` | Phase name: "base", "build", "peak", "taper" |
| `phaseIndex` | `Int` | Ordering within plan (0, 1, 2, 3) |
| `startWeek` | `Int` | Starting week number |
| `endWeek` | `Int` | Ending week number |
| `metadata` | `Json?` | Optional metadata for future adaptive logic |
| `createdAt` | `DateTime` | Auto-generated |
| `updatedAt` | `DateTime` | Auto-updated |

**Relations:**
- `trainingPlan` → `TrainingPlan` (many-to-one, cascade delete)
- `plannedDays` → `TrainingDayPlanned[]` (one-to-many)

### 6. TrainingDayPlanned Model - New Field

| Field Name | Type | Notes |
|-----------|------|-------|
| `trainingPhaseId` | `String?` | **NEW OPTIONAL** - Links to TrainingPhase |

**New Relation:**
- `phase` → `TrainingPhase?` (many-to-one, optional, SetNull on delete)

---

## Migration Steps

1. **Rename Athlete fields** - Identity-level training fields get `my` prefix
2. **Rename TrainingPlan fields** - Cycle-level fields get `trainingPlan` prefix
3. **Add trainingPlanName** - New required field (defaults to 'Untitled Training Plan')
4. **Remove JSON fields** - phaseOverview, weeklyMileagePlan, weeks removed
5. **Create TrainingPhase table** - New model for phase management
6. **Add trainingPhaseId to TrainingDayPlanned** - Link planned days to phases

---

## Field Mapping Reference

### Athlete Identity Fields (myXXX)

```typescript
// OLD
athlete.currentPace
athlete.weeklyMileage
athlete.trainingGoal
athlete.targetRace
athlete.trainingStartDate
athlete.paceRange
athlete.runningGoals

// NEW
athlete.myCurrentPace
athlete.myWeeklyMileage
athlete.myTrainingGoal
athlete.myTargetRace
athlete.myTrainingStartDate
athlete.myPaceRange
athlete.myRunningGoals
```

### TrainingPlan Cycle Fields (trainingPlanXXX)

```typescript
// OLD
plan.goalTime
plan.goalPace
plan.baseline5k
plan.baselineWeeklyMileage
plan.startDate
plan.totalWeeks
plan.adaptive5kTime
plan.phaseOverview      // REMOVED
plan.weeklyMileagePlan  // REMOVED
plan.weeks              // REMOVED

// NEW
plan.trainingPlanName              // NEW REQUIRED
plan.trainingPlanGoalTime
plan.trainingPlanGoalPace
plan.trainingPlanBaseline5k
plan.trainingPlanBaselineWeeklyMileage
plan.trainingPlanStartDate
plan.trainingPlanTotalWeeks
plan.trainingPlanAdaptive5kTime
plan.phases                        // NEW - TrainingPhase[]
```

### TrainingDayPlanned Phase Link

```typescript
// OLD
day.phase  // String field only

// NEW
day.phase            // String field (still exists)
day.trainingPhaseId  // NEW - Links to TrainingPhase
day.phase            // NEW - TrainingPhase relation
```

---

## Code Updates Required

### 1. Update All Athlete Field References

```typescript
// Find and replace:
currentPace → myCurrentPace
weeklyMileage → myWeeklyMileage
trainingGoal → myTrainingGoal
targetRace → myTargetRace
trainingStartDate → myTrainingStartDate
paceRange → myPaceRange
runningGoals → myRunningGoals
```

### 2. Update All TrainingPlan Field References

```typescript
// Find and replace:
goalTime → trainingPlanGoalTime
goalPace → trainingPlanGoalPace
baseline5k → trainingPlanBaseline5k
baselineWeeklyMileage → trainingPlanBaselineWeeklyMileage
startDate → trainingPlanStartDate
totalWeeks → trainingPlanTotalWeeks
adaptive5kTime → trainingPlanAdaptive5kTime

// Remove references to:
phaseOverview
weeklyMileagePlan
weeks

// Add:
trainingPlanName (required when creating plans)
```

### 3. Update TrainingPlan Queries

```typescript
// OLD
const plan = await prisma.trainingPlan.findUnique({
  where: { id: planId },
  include: {
    plannedDays: true
  }
});

// NEW - Include phases
const plan = await prisma.trainingPlan.findUnique({
  where: { id: planId },
  include: {
    phases: {
      include: {
        plannedDays: true
      }
    },
    plannedDays: true
  }
});
```

### 4. Update TrainingDayPlanned Queries

```typescript
// OLD
const day = await prisma.trainingDayPlanned.findUnique({
  where: { id: dayId },
  include: {
    trainingPlan: true
  }
});

// NEW - Include phase
const day = await prisma.trainingDayPlanned.findUnique({
  where: { id: dayId },
  include: {
    trainingPlan: true,
    phase: true  // NEW
  }
});
```

### 5. Create TrainingPhase Records

```typescript
// When creating a training plan, also create phases:
const phase = await prisma.trainingPhase.create({
  data: {
    trainingPlanId: plan.id,
    phaseName: "base",
    phaseIndex: 0,
    startWeek: 0,
    endWeek: 3,
    metadata: {}
  }
});
```

---

## Data Migration Notes

1. **Existing TrainingPlans:**
   - All existing plans will have `trainingPlanName` set to 'Untitled Training Plan' by default
   - Update these with meaningful names after migration
   - JSON fields (phaseOverview, weeklyMileagePlan, weeks) will be lost - ensure data is backed up if needed

2. **Existing TrainingDayPlanned:**
   - All existing planned days will have `trainingPhaseId` as `null`
   - Link them to phases after creating TrainingPhase records
   - The `phase` String field still exists for backward compatibility

3. **TrainingDayExecuted:**
   - No changes required
   - Can still copy `plannedData` including phase information

---

## Rollback Plan

If rollback is needed, see the rollback script in the migration SQL file. Key steps:
1. Rename all fields back to original names
2. Re-add JSON fields to TrainingPlan
3. Remove trainingPhaseId from TrainingDayPlanned
4. Drop TrainingPhase table

---

*Migration Date: [To be filled when migration is applied]*
*Migration File: `prisma/migrations/TRAINING_ARCHITECTURE_LAYERED_MIGRATION.sql`*

