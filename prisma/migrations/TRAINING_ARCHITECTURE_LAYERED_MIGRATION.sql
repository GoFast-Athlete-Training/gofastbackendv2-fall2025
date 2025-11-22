-- Migration: Training Architecture Layered Model
-- This migration implements the layered training architecture:
-- ATHLETE (identity-level) → TRAINING PLAN (cycle-level) → TRAINING PHASE (cycle blocks) → TRAINING DAY PLANNED (items) → TRAINING DAY EXECUTED (runtime completions)

-- =====================================================
-- PART 1: UPDATE ATHLETE MODEL (identity fields → myXXX)
-- =====================================================

-- Rename training profile fields to identity-level names
ALTER TABLE "athletes" RENAME COLUMN "currentPace" TO "myCurrentPace";
ALTER TABLE "athletes" RENAME COLUMN "weeklyMileage" TO "myWeeklyMileage";
ALTER TABLE "athletes" RENAME COLUMN "trainingGoal" TO "myTrainingGoal";
ALTER TABLE "athletes" RENAME COLUMN "targetRace" TO "myTargetRace";
ALTER TABLE "athletes" RENAME COLUMN "trainingStartDate" TO "myTrainingStartDate";

-- Rename match profile fields to identity-level names
ALTER TABLE "athletes" RENAME COLUMN "paceRange" TO "myPaceRange";
ALTER TABLE "athletes" RENAME COLUMN "runningGoals" TO "myRunningGoals";

-- Note: preferredDistance and timePreference remain unchanged (not training-specific)

-- =====================================================
-- PART 2: UPDATE TRAININGPLAN (cycle-level fields → trainingPlanXXX)
-- =====================================================

-- Rename goal fields to cycle-specific names
ALTER TABLE "training_plans" RENAME COLUMN "goalTime" TO "trainingPlanGoalTime";
ALTER TABLE "training_plans" RENAME COLUMN "goalPace" TO "trainingPlanGoalPace";
ALTER TABLE "training_plans" RENAME COLUMN "baseline5k" TO "trainingPlanBaseline5k";
ALTER TABLE "training_plans" RENAME COLUMN "baselineWeeklyMileage" TO "trainingPlanBaselineWeeklyMileage";

-- Rename plan structure fields
ALTER TABLE "training_plans" RENAME COLUMN "startDate" TO "trainingPlanStartDate";
ALTER TABLE "training_plans" RENAME COLUMN "totalWeeks" TO "trainingPlanTotalWeeks";

-- Rename adaptive metric
ALTER TABLE "training_plans" RENAME COLUMN "adaptive5kTime" TO "trainingPlanAdaptive5kTime";

-- Add required trainingPlanName field
ALTER TABLE "training_plans" ADD COLUMN "trainingPlanName" TEXT NOT NULL DEFAULT 'Untitled Training Plan';

-- Remove deprecated JSON fields (will be derived through TrainingPhase + TrainingDayPlanned)
ALTER TABLE "training_plans" DROP COLUMN IF EXISTS "phaseOverview";
ALTER TABLE "training_plans" DROP COLUMN IF EXISTS "weeklyMileagePlan";
ALTER TABLE "training_plans" DROP COLUMN IF EXISTS "weeks";

-- =====================================================
-- PART 3: CREATE TRAININGPHASE MODEL
-- =====================================================

CREATE TABLE "training_phases" (
    "id" TEXT NOT NULL,
    "trainingPlanId" TEXT NOT NULL,
    "phaseName" TEXT NOT NULL,
    "phaseIndex" INTEGER NOT NULL,
    "startWeek" INTEGER NOT NULL,
    "endWeek" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_phases_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint
ALTER TABLE "training_phases" ADD CONSTRAINT "training_phases_trainingPlanId_fkey" FOREIGN KEY ("trainingPlanId") REFERENCES "training_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create index for efficient queries
CREATE INDEX "training_phases_trainingPlanId_idx" ON "training_phases"("trainingPlanId");

-- =====================================================
-- PART 4: UPDATE TRAININGDAYPLANNED TO LINK TO PHASE
-- =====================================================

-- Add trainingPhaseId column (nullable for backward compatibility)
ALTER TABLE "training_days_planned" ADD COLUMN "trainingPhaseId" TEXT;

-- Add foreign key constraint (SetNull on delete to preserve planned days if phase is deleted)
ALTER TABLE "training_days_planned" ADD CONSTRAINT "training_days_planned_trainingPhaseId_fkey" FOREIGN KEY ("trainingPhaseId") REFERENCES "training_phases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index for efficient queries
CREATE INDEX "training_days_planned_trainingPhaseId_idx" ON "training_days_planned"("trainingPhaseId");

-- =====================================================
-- PART 5: TRAININGDAYEXECUTED - No changes needed
-- =====================================================

-- TrainingDayExecuted remains unchanged
-- It can still copy plannedData including phaseId from TrainingDayPlanned

-- =====================================================
-- PART 6: CLEANUP & VALIDATION
-- =====================================================

-- Ensure all relations are properly indexed
-- (Indexes already exist for foreign keys created above)

-- Note: After migration, update any existing TrainingPlan records to have a proper trainingPlanName
-- UPDATE "training_plans" SET "trainingPlanName" = 'Training Plan ' || id WHERE "trainingPlanName" = 'Untitled Training Plan';

-- =====================================================
-- ROLLBACK SCRIPT (if needed)
-- =====================================================

-- To rollback, reverse the operations:
-- 
-- ALTER TABLE "athletes" RENAME COLUMN "myCurrentPace" TO "currentPace";
-- ALTER TABLE "athletes" RENAME COLUMN "myWeeklyMileage" TO "weeklyMileage";
-- ALTER TABLE "athletes" RENAME COLUMN "myTrainingGoal" TO "trainingGoal";
-- ALTER TABLE "athletes" RENAME COLUMN "myTargetRace" TO "targetRace";
-- ALTER TABLE "athletes" RENAME COLUMN "myTrainingStartDate" TO "trainingStartDate";
-- ALTER TABLE "athletes" RENAME COLUMN "myPaceRange" TO "paceRange";
-- ALTER TABLE "athletes" RENAME COLUMN "myRunningGoals" TO "runningGoals";
--
-- ALTER TABLE "training_plans" RENAME COLUMN "trainingPlanGoalTime" TO "goalTime";
-- ALTER TABLE "training_plans" RENAME COLUMN "trainingPlanGoalPace" TO "goalPace";
-- ALTER TABLE "training_plans" RENAME COLUMN "trainingPlanBaseline5k" TO "baseline5k";
-- ALTER TABLE "training_plans" RENAME COLUMN "trainingPlanBaselineWeeklyMileage" TO "baselineWeeklyMileage";
-- ALTER TABLE "training_plans" RENAME COLUMN "trainingPlanStartDate" TO "startDate";
-- ALTER TABLE "training_plans" RENAME COLUMN "trainingPlanTotalWeeks" TO "totalWeeks";
-- ALTER TABLE "training_plans" RENAME COLUMN "trainingPlanAdaptive5kTime" TO "adaptive5kTime";
-- ALTER TABLE "training_plans" DROP COLUMN "trainingPlanName";
-- ALTER TABLE "training_plans" ADD COLUMN "phaseOverview" JSONB;
-- ALTER TABLE "training_plans" ADD COLUMN "weeklyMileagePlan" JSONB;
-- ALTER TABLE "training_plans" ADD COLUMN "weeks" JSONB;
--
-- ALTER TABLE "training_days_planned" DROP CONSTRAINT "training_days_planned_trainingPhaseId_fkey";
-- ALTER TABLE "training_days_planned" DROP COLUMN "trainingPhaseId";
--
-- DROP TABLE IF EXISTS "training_phases";

