# AthleteActivity Data Model - HYBRID MODEL

## Overview
**HYBRID MODEL: Single Table, Two Phases** - This model handles both `/garmin/activity` (summary) and `/garmin/details` (telemetry) webhooks in one unified table.

## Hybrid Architecture Benefits
✅ **Simpler architecture** - 1 table instead of 2 — easier joins, easier API responses  
✅ **Idempotent updates** - Details always "patch" the same row  
✅ **Faster MVP iteration** - Less ORM setup, cleaner hydration flow  
✅ **Extensible** - Can split out ActivityDetail later if telemetry explodes in size  

## Webhook Flow (Two Phases)

### Phase 1: Summary Data
**Garmin automatically pushes summary when user finishes/uploads activity:**
1. User completes workout on Garmin device
2. Garmin processes and uploads activity
3. Garmin sends webhook to `/api/garmin/activity`
4. We store summary data in `AthleteActivity` table
5. Frontend displays activity cards immediately

### Phase 2: Detail Data
**Garmin automatically pushes details after summary:**
1. Garmin processes deeper metrics and track data
2. Garmin sends webhook to `/api/garmin/details`
3. We update same row with `detailData` and set `hydratedAt`
4. Frontend can now show detailed charts and insights

## Data Model

### AthleteActivity Table (Hybrid)
```sql
CREATE TABLE athlete_activities (
  id STRING PRIMARY KEY,
  athlete_id STRING REFERENCES athletes(id),
  
  -- Source Information (join key)
  source_activity_id STRING UNIQUE,   -- Garmin's activityId (join key)
  source STRING DEFAULT 'garmin',
  
  -- Core Activity Data (Summary from /garmin/activity webhook)
  activity_type STRING?,           -- running, cycling, swimming, etc.
  activity_name STRING?,           -- "Morning Run", "Evening Bike Ride"
  start_time DATETIME?,            -- when activity started
  duration INTEGER?,               -- duration in seconds
  distance DECIMAL?,               -- distance in meters
  average_speed DECIMAL?,          -- average speed in m/s
  calories INTEGER?,               -- calories burned
  
  -- Performance Metrics (Summary data)
  average_heart_rate INTEGER?,     -- average heart rate
  max_heart_rate INTEGER?,         -- maximum heart rate
  elevation_gain DECIMAL?,         -- elevation gain in meters
  steps INTEGER?,                  -- step count (if applicable)
  
  -- Location Data (Summary)
  start_latitude DECIMAL?,         -- GPS start latitude
  start_longitude DECIMAL?,        -- GPS start longitude
  end_latitude DECIMAL?,           -- GPS end latitude
  end_longitude DECIMAL?,          -- GPS end longitude
  summary_polyline STRING?,        -- encoded route polyline
  
  -- Device Information
  device_name STRING?,             -- "Forerunner 255", "Edge 1040"
  garmin_user_id STRING?,          -- Garmin user GUID from webhook
  
  -- Hybrid Data Storage
  summary_data JSON?,              -- Phase 1: Summary fields from /garmin/activity
  detail_data JSON?,               -- Phase 2: Details from /garmin/details (laps, splits, HR zones, etc.)
  hydrated_at DATETIME?,           -- When details were hydrated
  
  -- Timestamps
  synced_at DATETIME DEFAULT NOW(),
  last_updated_at DATETIME DEFAULT NOW(),
  created_at DATETIME DEFAULT NOW(),
  updated_at DATETIME DEFAULT NOW()
);
```

## Webhook Payload Mapping

### Phase 1: /garmin/activity Webhook Fields
| Garmin Field | Our Field | Notes |
|--------------|-----------|-------|
| `activityId` | `sourceActivityId` | Garmin's unique numeric ID (join key) |
| `activityName` | `activityName` | "Morning Run", "Evening Bike Ride" |
| `activityType.typeKey` | `activityType` | running, cycling, swimming |
| `startTimeLocal` | `startTime` | Activity start timestamp |
| `durationInSeconds` | `duration` | Total workout time |
| `distanceInMeters` | `distance` | Distance covered |
| `averageSpeed` | `averageSpeed` | Average speed in m/s |
| `calories` | `calories` | Energy burned |
| `averageHeartRate` | `averageHeartRate` | Average heart rate |
| `maxHeartRate` | `maxHeartRate` | Maximum heart rate |
| `elevationGain` | `elevationGain` | Elevation gain in meters |
| `steps` | `steps` | Step count (if applicable) |
| `startLatitude`, `startLongitude` | `startLatitude`, `startLongitude` | GPS coordinates |
| `endLatitude`, `endLongitude` | `endLatitude`, `endLongitude` | GPS coordinates |
| `summaryPolyline` | `summaryPolyline` | Encoded route data |
| `deviceMetaData.deviceName` | `deviceName` | "Forerunner 255", "Edge 1040" |
| `userId` | `garminUserId` | Garmin user GUID |

### Phase 2: /garmin/details Webhook Fields
| Garmin Field | Our Field | Notes |
|--------------|-----------|-------|
| `activityId` | `sourceActivityId` | Same ID as Phase 1 (join key) |
| `lapSummaries` | `detailData.lapSummaries` | Per-lap statistics |
| `splitSummaries` | `detailData.splitSummaries` | Pace/distance-based splits |
| `averageRunCadence` | `detailData.cadence.average` | Steps per minute |
| `maxRunCadence` | `detailData.cadence.max` | Maximum cadence |
| `averagePower` | `detailData.power.average` | Average power in watts |
| `maxPower` | `detailData.power.max` | Maximum power |
| `aerobicTrainingEffect` | `detailData.trainingEffect.aerobic` | Garmin's training load |
| `anaerobicTrainingEffect` | `detailData.trainingEffect.anaerobic` | Garmin's training load |
| `trainingEffectLabel` | `detailData.trainingEffect.label` | Training effect label |
| `timeInHeartRateZones` | `detailData.heartRateZones` | Time spent in each HR zone |
| `samples` | `detailData.samples` | Raw streams (HR, pace, elevation, etc.) |

## API Endpoints

### Activity Summary Webhook (Phase 1)
```
POST /api/garmin/activity
Body: Garmin activity webhook payload
Response: { success: true, activityId: "xxx", action: "created|updated", phase: "summary" }
```

### Activity Details Webhook (Phase 2)
```
POST /api/garmin/details
Body: Garmin details webhook payload
Response: { success: true, activityId: "xxx", action: "hydrated", phase: "details" }
```

### Get User Activities
```
GET /api/athlete/:id/activities
Query params:
- limit: number of activities to return
- offset: pagination offset
- activity_type: filter by type (running, cycling, etc.)
- hydrated: filter by hydration status (true/false)
```

## Webhook Processing Flow

### Phase 1: Summary Processing
1. **Webhook Received**: Garmin sends activity data to `/api/garmin/activity`
2. **User Lookup**: Find athlete by `garmin_user_id`
3. **Duplicate Check**: Check if activity already exists by `sourceActivityId`
4. **Create/Update**: Either create new activity or update existing with summary data
5. **Response**: Return success with activity ID and action taken

### Phase 2: Details Processing
1. **Webhook Received**: Garmin sends details data to `/api/garmin/details`
2. **Activity Lookup**: Find existing activity by `sourceActivityId`
3. **Hydrate**: Update same row with `detailData` and set `hydratedAt`
4. **Response**: Return success with activity ID and hydration status

## Frontend Usage

### Dashboard (Summary Only)
```javascript
// Show activity cards immediately after Phase 1
const activities = await fetch('/api/athlete/123/activities?hydrated=false');
// Display: activityName, duration, distance, calories, averageHeartRate
```

### Detailed View (Summary + Details)
```javascript
// Show detailed charts after Phase 2
const activities = await fetch('/api/athlete/123/activities?hydrated=true');
// Display: lapSplits, heartRateZones, trainingEffect, power data
```

## Future Considerations
- **Manual Sync**: Allow users to manually sync activities
- **Data Validation**: Ensure data integrity across phases
- **Analytics**: Build aggregated views for performance tracking
- **Split Tables**: Can split out ActivityDetail later if telemetry explodes

## Migration Strategy
1. ✅ Create AthleteActivity table (hybrid model)
2. ✅ Update webhook handlers for both phases
3. ✅ Build field mapper service for both phases
4. 🔄 Test with Garmin webhooks (both phases)
5. 🔄 Build frontend activity display (summary + details)
6. 🔄 Add manual sync capability
7. 🔄 Add analytics and insights

## Data Model

### AthleteActivity Table (Summary Only)
```sql
CREATE TABLE athlete_activities (
  id STRING PRIMARY KEY,
  athlete_id STRING REFERENCES athletes(id),
  
  -- Core Activity Data (Summary from /garmin/activity webhook)
  activity_type STRING?,           -- running, cycling, swimming, etc.
  activity_name STRING?,           -- "Morning Run", "Evening Bike Ride"
  start_time DATETIME?,            -- when activity started
  duration INTEGER?,               -- duration in seconds
  distance DECIMAL?,               -- distance in meters
  average_speed DECIMAL?,          -- average speed in m/s
  calories INTEGER?,               -- calories burned
  
  -- Performance Metrics (Summary data)
  average_heart_rate INTEGER?,     -- average heart rate
  max_heart_rate INTEGER?,         -- maximum heart rate
  elevation_gain DECIMAL?,         -- elevation gain in meters
  steps INTEGER?,                  -- step count (if applicable)
  
  -- Location Data (Summary)
  start_latitude DECIMAL?,         -- GPS start latitude
  start_longitude DECIMAL?,        -- GPS start longitude
  end_latitude DECIMAL?,           -- GPS end latitude
  end_longitude DECIMAL?,          -- GPS end longitude
  summary_polyline STRING?,        -- encoded route polyline
  
  -- Device & Source Information
  device_name STRING?,             -- "Forerunner 255", "Edge 1040"
  source STRING?,                  -- garmin, strava, manual, apple_watch, etc.
  source_activity_id STRING?,      -- Garmin's unique activity ID
  garmin_user_id STRING?,          -- Garmin user GUID from webhook
  
  -- Summary Data (JSON for additional fields)
  summary_data JSON?,              -- Store any extra summary fields
  
  -- Timestamps
  synced_at DATETIME DEFAULT NOW(),
  last_updated_at DATETIME DEFAULT NOW(),
  created_at DATETIME DEFAULT NOW(),
  updated_at DATETIME DEFAULT NOW()
);
```

## Garmin Webhook Payload Mapping

### /garmin/activity Webhook Fields
| Garmin Field | Our Field | Notes |
|--------------|-----------|-------|
| `activityId` | `sourceActivityId` | Garmin's unique numeric ID |
| `activityName` | `activityName` | "Morning Run", "Evening Bike Ride" |
| `activityType.typeKey` | `activityType` | running, cycling, swimming |
| `startTimeLocal` | `startTime` | Activity start timestamp |
| `durationInSeconds` | `duration` | Total workout time |
| `distanceInMeters` | `distance` | Distance covered |
| `averageSpeed` | `averageSpeed` | Average speed in m/s |
| `calories` | `calories` | Energy burned |
| `averageHeartRate` | `averageHeartRate` | Average heart rate |
| `maxHeartRate` | `maxHeartRate` | Maximum heart rate |
| `elevationGain` | `elevationGain` | Elevation gain in meters |
| `steps` | `steps` | Step count (if applicable) |
| `startLatitude`, `startLongitude` | `startLatitude`, `startLongitude` | GPS coordinates |
| `endLatitude`, `endLongitude` | `endLatitude`, `endLongitude` | GPS coordinates |
| `summaryPolyline` | `summaryPolyline` | Encoded route data |
| `deviceMetaData.deviceName` | `deviceName` | "Forerunner 255", "Edge 1040" |
| `userId` | `garminUserId` | Garmin user GUID |

## API Endpoints

### Activity Webhook
```
POST /api/garmin/activity
Body: Garmin activity webhook payload
Response: { success: true, activityId: "xxx", action: "created|updated" }
```

### Get User Activities
```
GET /api/athlete/:id/activities
Query params:
- limit: number of activities to return
- offset: pagination offset
- activity_type: filter by type (running, cycling, etc.)
```

## Webhook Processing Flow

1. **Webhook Received**: Garmin sends activity data to `/api/garmin/activity`
2. **User Lookup**: Find athlete by `garmin_user_id`
3. **Duplicate Check**: Check if activity already exists by `sourceActivityId`
4. **Create/Update**: Either create new activity or update existing
5. **Response**: Return success with activity ID and action taken

## Future Considerations
- **Activity Details**: Separate table for detailed metrics (heart rate zones, splits, etc.)
- **Manual Sync**: Allow users to manually sync activities
- **Data Validation**: Ensure data integrity across sources
- **Analytics**: Build aggregated views for performance tracking

## Migration Strategy
1. ✅ Create AthleteActivity table (summary only)
2. ✅ Update webhook handlers to use new model
3. ✅ Build field mapper service
4. 🔄 Test with Garmin webhooks
5. 🔄 Build frontend activity display
6. 🔄 Add manual sync capability
7. 🔄 Add activity details table (future)
