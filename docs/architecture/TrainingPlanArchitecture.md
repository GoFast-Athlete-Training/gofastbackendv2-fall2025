# Training Plan Architecture

## 1. Overview

The training plan system uses a "blueprint → execution" architecture. A `TrainingPlan` serves as the blueprint containing goals, phase structure, and weekly plans. `TrainingDayPlanned` records represent the individual planned workout days. When an athlete begins following a plan, a `TrainingPlanExecution` is created to track that specific execution instance. As workouts are completed, `TrainingDayExecuted` records are created to link actual activities (via `AthleteActivity`) to the planned workouts, storing analysis and feedback.

---

## 2. Current Prisma Models

### TrainingPlan

```prisma
model TrainingPlan {
  id        String @id @default(cuid())
  athleteId String
  raceId    String

  // GOALS
  goalTime              String // "1:45:00"
  goalPace              String? // "8:00" per mile
  baseline5k            String // "24:30"
  baselineWeeklyMileage Int?

  // PLAN STRUCTURE (JSON arrays) - THE BLUEPRINT
  startDate         DateTime
  totalWeeks        Int
  phaseOverview     Json? // { base: { weeks, startWeek, endWeek }, build: {...}, peak: {...}, taper: {...} }
  weeklyMileagePlan Json? // [{ weekIndex, targetMileage, phase }]
  weeks             Json? // [{ weekIndex, startDate, endDate, phase, targetMileage, workoutTypes, keyWorkouts }]

  // MONEY METRIC
  adaptive5kTime String? // Only persistent predictive metric!

  // STATUS
  status String @default("draft") // draft, active, completed, archived

  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  athlete     Athlete                 @relation(fields: [athleteId], references: [id], onDelete: Cascade)
  race        Race                    @relation(fields: [raceId], references: [id], onDelete: Cascade)
  plannedDays TrainingDayPlanned[]
  executions  TrainingPlanExecution[]

  @@map("training_plans")
}
```

**Field Descriptions:**
- `id`: Unique identifier (CUID)
- `athleteId`: Links to the athlete who owns this plan
- `raceId`: Links to the race goal this plan targets
- `goalTime`: Target finish time for the race (format: "H:MM:SS" or "MM:SS")
- `goalPace`: Target pace per mile (format: "M:SS", optional)
- `baseline5k`: Current 5K time used as fitness baseline (format: "M:SS")
- `baselineWeeklyMileage`: Current weekly mileage at plan creation (optional)
- `startDate`: When the training plan begins
- `totalWeeks`: Total number of weeks in the plan
- `phaseOverview`: JSON structure describing phase breakdown (base, build, peak, taper)
- `weeklyMileagePlan`: JSON array of weekly mileage targets by phase
- `weeks`: JSON array of week summaries with dates, phases, and workout types
- `adaptive5kTime`: Updated 5K time prediction based on training progress (optional)
- `status`: Current state of the plan (draft, active, completed, archived)
- `createdAt`, `updatedAt`: Automatic timestamps

### TrainingDayPlanned

```prisma
model TrainingDayPlanned {
  id             String @id @default(cuid())
  trainingPlanId String
  athleteId      String

  // Day Identification
  date      DateTime
  weekIndex Int // 0-based
  dayIndex  Int // 0-6 (Mon-Sun)
  dayName   String? // "Monday", "Tuesday", etc.

  // Training Context
  phase String // base, build, peak, taper

  // PLANNED WORKOUT (all the details)
  plannedData Json // { type, mileage, duration, paceRange, targetPace, hrZone, hrRange, segments, label, description, coachNotes }

  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  trainingPlan TrainingPlan @relation(fields: [trainingPlanId], references: [id], onDelete: Cascade)
  athlete      Athlete      @relation(fields: [athleteId], references: [id], onDelete: Cascade)

  @@unique([trainingPlanId, weekIndex, dayIndex]) // One planned day per position in plan
  @@map("training_days_planned")
}
```

**Field Descriptions:**
- `id`: Unique identifier (CUID)
- `trainingPlanId`: Links to the parent training plan
- `athleteId`: Links to the athlete (for query efficiency)
- `date`: The specific date for this planned workout
- `weekIndex`: Week number within the plan (0-based)
- `dayIndex`: Day of week (0-6, Monday-Sunday)
- `dayName`: Human-readable day name (optional)
- `phase`: Training phase this day belongs to (base, build, peak, taper)
- `plannedData`: JSON object containing all planned workout details
- `createdAt`, `updatedAt`: Automatic timestamps
- **Unique Constraint**: One planned day per position (trainingPlanId + weekIndex + dayIndex)

### TrainingPlanExecution

```prisma
model TrainingPlanExecution {
  id             String @id @default(cuid())
  trainingPlanId String

  // Execution metadata
  startedAt DateTime
  status    String   @default("active") // active, completed, cancelled

  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  trainingPlan TrainingPlan          @relation(fields: [trainingPlanId], references: [id], onDelete: Cascade)
  executedDays TrainingDayExecuted[]

  @@map("training_plan_executions")
}
```

**Field Descriptions:**
- `id`: Unique identifier (CUID)
- `trainingPlanId`: Links to the training plan being executed
- `startedAt`: When the athlete started following this plan
- `status`: Current execution state (active, completed, cancelled)
- `createdAt`, `updatedAt`: Automatic timestamps

### TrainingDayExecuted

```prisma
model TrainingDayExecuted {
  id          String @id @default(cuid())
  executionId String
  athleteId   String

  // THE LINK - shell container for AthleteActivity
  activityId String? @unique

  // Optional metadata for context
  weekIndex Int
  dayIndex  Int
  date      DateTime

  // Snapshot/computed fields (can be derived from activityId)
  plannedData Json? // Snapshot when executed
  analysis    Json? // { workoutCompleted, hitTargetMileage, hitTargetPace, stayedInHRZone, mileageVariance, paceVariance, qualityScore, performanceNotes }
  feedback    Json? // { mood, effort, injuryFlag, notes, submittedAt }

  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  execution TrainingPlanExecution @relation(fields: [executionId], references: [id], onDelete: Cascade)
  athlete   Athlete               @relation(fields: [athleteId], references: [id], onDelete: Cascade)

  @@unique([executionId, date]) // One execution per day per plan execution
  @@map("training_days_executed")
}
```

**Field Descriptions:**
- `id`: Unique identifier (CUID)
- `executionId`: Links to the training plan execution instance
- `athleteId`: Links to the athlete (for query efficiency)
- `activityId`: Optional link to `AthleteActivity` record (unique, one activity per executed day)
- `weekIndex`: Week number for context (matches TrainingDayPlanned)
- `dayIndex`: Day of week for context (matches TrainingDayPlanned)
- `date`: The date this workout was executed
- `plannedData`: Snapshot of planned workout data at time of execution (optional)
- `analysis`: JSON object containing comparison of actual vs planned performance (optional)
- `feedback`: JSON object containing user-submitted feedback about the workout (optional)
- `createdAt`, `updatedAt`: Automatic timestamps
- **Unique Constraints**: 
  - One execution per day per plan execution (executionId + date)
  - One activity per executed day (activityId is unique)

### AthleteActivity

```prisma
model AthleteActivity {
  id        String @id @default(cuid())
  athleteId String

  // Source Information
  sourceActivityId String @unique // Garmin's unique activity ID (join key)
  source           String @default("garmin")

  // Core Activity Data (Summary from /garmin/activity webhook)
  activityType String? // running, cycling, swimming, etc.
  activityName String? // "Morning Run", "Evening Bike Ride"
  startTime    DateTime? // when activity started
  duration     Int? // duration in seconds
  distance     Float? // distance in meters
  averageSpeed Float? // average speed in m/s
  calories     Int? // calories burned

  // Performance Metrics (Summary data)
  averageHeartRate Int? // average heart rate
  maxHeartRate     Int? // maximum heart rate
  elevationGain    Float? // elevation gain in meters
  steps            Int? // step count (if applicable)

  // Location Data (Summary)
  startLatitude   Float? // GPS start latitude
  startLongitude  Float? // GPS start longitude
  endLatitude     Float? // GPS end latitude
  endLongitude    Float? // GPS end longitude
  summaryPolyline String? // encoded route polyline

  // Device Information
  deviceName   String? // "Forerunner 255", "Edge 1040"
  garminUserId String? // Garmin user GUID from webhook

  // Hybrid Data Storage
  summaryData Json? // Phase 1: Summary fields from /garmin/activity
  detailData  Json? // Phase 2: Details from /garmin/details (laps, splits, HR zones, etc.)
  hydratedAt  DateTime? // When details were hydrated

  // Timestamps
  syncedAt      DateTime @default(now())
  lastUpdatedAt DateTime @default(now())
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  athlete Athlete @relation(fields: [athleteId], references: [id], onDelete: Cascade)
  eventResults EventResult[] @relation("EventResultParentActivity") // Event results that claim this activity (legacy - parent's activity)

  @@map("athlete_activities")
}
```

**Field Descriptions:**
- `id`: Unique identifier (CUID)
- `athleteId`: Links to the athlete who performed this activity
- `sourceActivityId`: Garmin's unique activity ID (used as join key, unique)
- `source`: Source system (defaults to "garmin")
- `activityType`: Type of activity (running, cycling, etc.)
- `activityName`: User-provided name for the activity
- `startTime`: When the activity started
- `duration`: Total duration in seconds
- `distance`: Total distance in meters
- `averageSpeed`: Average speed in meters per second
- `calories`: Calories burned
- `averageHeartRate`: Average heart rate during activity
- `maxHeartRate`: Maximum heart rate during activity
- `elevationGain`: Total elevation gain in meters
- `steps`: Step count (if applicable)
- `startLatitude`, `startLongitude`: GPS coordinates of activity start
- `endLatitude`, `endLongitude`: GPS coordinates of activity end
- `summaryPolyline`: Encoded polyline of the route
- `deviceName`: Name of the device that recorded the activity
- `garminUserId`: Garmin user GUID from webhook
- `summaryData`: JSON object containing summary fields from Garmin webhook
- `detailData`: JSON object containing detailed metrics (laps, splits, HR zones) when hydrated
- `hydratedAt`: Timestamp when detail data was populated
- `syncedAt`, `lastUpdatedAt`, `createdAt`, `updatedAt`: Timestamps

---

## 3. Relationships (Current Only)

### TrainingPlan Relationships

- **TrainingPlan → Athlete**: One-to-many (one athlete can have many training plans)
  - Foreign key: `athleteId` → `Athlete.id`
  - Cascade delete: If athlete is deleted, all their training plans are deleted

- **TrainingPlan → Race**: One-to-many (one race can have many training plans from different athletes)
  - Foreign key: `raceId` → `Race.id`
  - Cascade delete: If race is deleted, all training plans for that race are deleted

- **TrainingPlan → TrainingDayPlanned**: One-to-many (one plan has many planned days)
  - Foreign key: `TrainingDayPlanned.trainingPlanId` → `TrainingPlan.id`
  - Cascade delete: If plan is deleted, all planned days are deleted

- **TrainingPlan → TrainingPlanExecution**: One-to-many (one plan can have multiple execution instances)
  - Foreign key: `TrainingPlanExecution.trainingPlanId` → `TrainingPlan.id`
  - Cascade delete: If plan is deleted, all executions are deleted

### TrainingDayPlanned Relationships

- **TrainingDayPlanned → TrainingPlan**: Many-to-one (many planned days belong to one plan)
  - Foreign key: `trainingPlanId` → `TrainingPlan.id`

- **TrainingDayPlanned → Athlete**: Many-to-one (many planned days belong to one athlete)
  - Foreign key: `athleteId` → `Athlete.id`
  - Cascade delete: If athlete is deleted, all their planned days are deleted

### TrainingPlanExecution Relationships

- **TrainingPlanExecution → TrainingPlan**: Many-to-one (many executions can exist for one plan)
  - Foreign key: `trainingPlanId` → `TrainingPlan.id`

- **TrainingPlanExecution → TrainingDayExecuted**: One-to-many (one execution has many executed days)
  - Foreign key: `TrainingDayExecuted.executionId` → `TrainingPlanExecution.id`
  - Cascade delete: If execution is deleted, all executed days are deleted

### TrainingDayExecuted Relationships

- **TrainingDayExecuted → TrainingPlanExecution**: Many-to-one (many executed days belong to one execution)
  - Foreign key: `executionId` → `TrainingPlanExecution.id`

- **TrainingDayExecuted → Athlete**: Many-to-one (many executed days belong to one athlete)
  - Foreign key: `athleteId` → `Athlete.id`
  - Cascade delete: If athlete is deleted, all their executed days are deleted

- **TrainingDayExecuted → AthleteActivity**: Optional one-to-one (one executed day can link to one activity)
  - Foreign key: `activityId` → `AthleteActivity.id` (optional, unique)
  - No cascade delete: Activity exists independently

---

## 4. Current Data Flow (As Implemented)

### TrainingPlan Storage

**Current Implementation:**
- TrainingPlans are created via `POST /api/training/race/create` which creates a Race record
- The route returns a message indicating that `/api/training/plan/create` should be used to create a training plan, but this endpoint is not implemented in the current codebase
- TrainingPlans can be queried via:
  - `GET /api/training/plan/race/:raceId` - Get all plans for a race
  - `GET /api/training/plan/active?athleteId=xxx` - Get active plan for athlete
  - `GET /api/training/plan/:planId` - Get single plan by ID
- TrainingPlan status can be updated via `PUT /api/training/plan/:planId/status` with status values: `active`, `completed`, `archived`
- When a plan is activated, all other active plans for that athlete are automatically set to `archived`

**Not Implemented:**
- Creation of TrainingPlan records (no POST endpoint exists, though route imports a non-existent service)
- Generation of plan structure (phaseOverview, weeklyMileagePlan, weeks JSON fields)
- Creation of TrainingDayPlanned records

### TrainingDayPlanned Creation

**Current Implementation:**
- TrainingDayPlanned records are queried via:
  - `GET /api/training/day/today?athleteId=xxx` - Get today's planned workout
  - `GET /api/training/day/date/:date?athleteId=xxx` - Get workout for specific date
  - `GET /api/training/day/week/:weekIndex?athleteId=xxx&planId=xxx` - Get all workouts for a week
- These routes require an active TrainingPlan to exist
- Planned days are returned as part of TrainingPlan queries when using `include: { plannedDays: ... }`

**Not Implemented:**
- Creation of TrainingDayPlanned records
- Automatic generation of planned days when a TrainingPlan is created

### TrainingPlanExecution Usage

**Current Implementation:**
- TrainingPlanExecution records are created automatically when:
  - A user submits feedback for a workout (`POST /api/training/day/:trainingDayId/feedback`)
  - A user updates actual workout data (`PUT /api/training/day/:trainingDayId/actual`)
- The system finds an existing active execution for the plan, or creates a new one if none exists
- Execution status defaults to `"active"` and can be `"completed"` or `"cancelled"` (as defined in schema)
- Executions are not directly queryable via API routes

**Not Implemented:**
- Direct creation endpoint for TrainingPlanExecution
- Query endpoints for TrainingPlanExecution
- Status update endpoints for TrainingPlanExecution

### TrainingDayExecuted Creation and Storage

**Current Implementation:**
- TrainingDayExecuted records are created when:
  - User submits feedback (`POST /api/training/day/:trainingDayId/feedback`) - Creates executed day with feedback data
  - User updates actual workout data (`PUT /api/training/day/:trainingDayId/actual`) - Creates executed day with activity data in analysis field
- The system finds or creates a TrainingPlanExecution first, then creates/updates the TrainingDayExecuted record
- Unique constraint ensures one executed day per date per execution
- `plannedData` is snapshotted from the corresponding TrainingDayPlanned when executed day is created
- `activityId` can be set to link to an AthleteActivity, but this is not automatically done

**Not Implemented:**
- Automatic linking of AthleteActivity to TrainingDayExecuted based on date matching
- Automatic calculation of analysis fields (mileage variance, pace variance, quality score)
- Query endpoints for TrainingDayExecuted records

### AthleteActivity Attachment

**Current Implementation:**
- AthleteActivity records are created via Garmin webhooks (`/api/garmin/activity`)
- TrainingDayExecuted has an optional `activityId` field that can reference an AthleteActivity
- The `PUT /api/training/day/:trainingDayId/actual` endpoint accepts `actualData` in the request body, but does not automatically link to AthleteActivity
- No automatic matching logic exists to link activities to training days by date

**Not Implemented:**
- Automatic date-based matching of AthleteActivity to TrainingDayPlanned
- Automatic creation of TrainingDayExecuted when a matching activity is found
- Automatic population of analysis fields from AthleteActivity data
- Query endpoints to find unlinked activities or suggest matches

---

## 5. JSON Fields (Current Use)

### TrainingPlan.phaseOverview

**Schema Comment:** `{ base: { weeks, startWeek, endWeek }, build: {...}, peak: {...}, taper: {...} }`

**Current Usage:** Not populated in current codebase. Field exists but no generation logic exists to populate it.

### TrainingPlan.weeklyMileagePlan

**Schema Comment:** `[{ weekIndex, targetMileage, phase }]`

**Current Usage:** Not populated in current codebase. Field exists but no generation logic exists to populate it.

### TrainingPlan.weeks

**Schema Comment:** `[{ weekIndex, startDate, endDate, phase, targetMileage, workoutTypes, keyWorkouts }]`

**Current Usage:** Not populated in current codebase. Field exists but no generation logic exists to populate it.

### TrainingDayPlanned.plannedData

**Schema Comment:** `{ type, mileage, duration, paceRange, targetPace, hrZone, hrRange, segments, label, description, coachNotes }`

**Current Usage:** 
- Field is required (not nullable) in schema
- Structure is defined in schema comment but actual data format depends on how records are created
- No records are currently created in the codebase, so actual usage cannot be determined

### TrainingDayExecuted.plannedData

**Schema Comment:** Snapshot when executed

**Current Usage:**
- Optional field (nullable)
- In `PUT /api/training/day/:trainingDayId/actual`, the plannedData is copied from the corresponding TrainingDayPlanned record: `plannedData: trainingDay.plannedData`
- Stores a snapshot of what was planned at the time the workout was executed

### TrainingDayExecuted.analysis

**Schema Comment:** `{ workoutCompleted, hitTargetMileage, hitTargetPace, stayedInHRZone, mileageVariance, paceVariance, qualityScore, performanceNotes }`

**Current Usage:**
- Optional field (nullable)
- In `PUT /api/training/day/:trainingDayId/actual`, the `actualData` from the request body is stored directly in the analysis field: `analysis: actualData`
- No automatic calculation of analysis fields exists
- Structure is defined in schema comment but actual data format depends on what is sent in the request

### TrainingDayExecuted.feedback

**Schema Comment:** `{ mood, effort, injuryFlag, notes, submittedAt }`

**Current Usage:**
- Optional field (nullable)
- In `POST /api/training/day/:trainingDayId/feedback`, feedback is structured as:
  ```javascript
  {
    mood: mood || null,
    effort: effort || null,
    injuryFlag: injuryFlag || false,
    notes: notes || null,
    submittedAt: new Date()
  }
  ```
- All fields except `submittedAt` come from the request body
- `submittedAt` is automatically set to current timestamp

---

## 6. Status Field Meanings (Existing Only)

### TrainingPlan.status

**Possible Values (from schema and route validation):**
- `"draft"` - Default status when plan is created (not yet active)
- `"active"` - Plan is currently being followed by the athlete
- `"completed"` - Plan has been completed (race date has passed or athlete finished the plan)
- `"archived"` - Plan is no longer active but kept for historical reference

**Current Behavior:**
- Defaults to `"draft"` when created
- Can be updated via `PUT /api/training/plan/:planId/status`
- When a plan is set to `"active"`, all other active plans for that athlete are automatically set to `"archived"`
- Route validation only accepts: `'active'`, `'completed'`, `'archived'`

### TrainingPlanExecution.status

**Possible Values (from schema):**
- `"active"` - Default status, execution is ongoing
- `"completed"` - Execution has been completed
- `"cancelled"` - Execution was cancelled/abandoned

**Current Behavior:**
- Defaults to `"active"` when created
- Created automatically when feedback or actual data is submitted for a training day
- No endpoints exist to update this status
- No query endpoints exist to filter by status

---

*Last Updated: Based on codebase as of current date*
*This document reflects only what exists in the current implementation*

