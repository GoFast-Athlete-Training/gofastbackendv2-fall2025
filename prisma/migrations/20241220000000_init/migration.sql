-- CreateTable
CREATE TABLE "athletes" (
    "id" TEXT NOT NULL,
    "firebaseId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "gofastHandle" TEXT,
    "birthday" TIMESTAMP(3),
    "gender" TEXT,
    "city" TEXT,
    "state" TEXT,
    "primarySport" TEXT,
    "photoURL" TEXT,
    "bio" TEXT,
    "instagram" TEXT,
    "runCrewId" TEXT,
    "currentPace" TEXT,
    "weeklyMileage" INTEGER,
    "trainingGoal" TEXT,
    "targetRace" TEXT,
    "trainingStartDate" TIMESTAMP(3),
    "preferredDistance" TEXT,
    "timePreference" TEXT,
    "paceRange" TEXT,
    "runningGoals" TEXT,
    "garmin_user_id" TEXT,
    "garmin_access_token" TEXT,
    "garmin_refresh_token" TEXT,
    "garmin_expires_in" INTEGER,
    "garmin_scope" TEXT,
    "garmin_connected_at" TIMESTAMP(3),
    "garmin_last_sync_at" TIMESTAMP(3),
    "garmin_permissions" JSONB,
    "garmin_is_connected" BOOLEAN NOT NULL DEFAULT false,
    "garmin_disconnected_at" TIMESTAMP(3),
    "garmin_user_profile" JSONB,
    "garmin_user_sleep" JSONB,
    "garmin_user_preferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT,

    CONSTRAINT "athletes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athlete_activities" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "sourceActivityId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'garmin',
    "activityType" TEXT,
    "activityName" TEXT,
    "startTime" TIMESTAMP(3),
    "duration" INTEGER,
    "distance" DOUBLE PRECISION,
    "averageSpeed" DOUBLE PRECISION,
    "calories" INTEGER,
    "averageHeartRate" INTEGER,
    "maxHeartRate" INTEGER,
    "elevationGain" DOUBLE PRECISION,
    "steps" INTEGER,
    "startLatitude" DOUBLE PRECISION,
    "startLongitude" DOUBLE PRECISION,
    "endLatitude" DOUBLE PRECISION,
    "endLongitude" DOUBLE PRECISION,
    "summaryPolyline" TEXT,
    "deviceName" TEXT,
    "garminUserId" TEXT,
    "summaryData" JSONB,
    "detailData" JSONB,
    "hydratedAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "athlete_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "athletes_firebaseId_key" ON "athletes"("firebaseId");

-- CreateIndex
CREATE UNIQUE INDEX "athletes_email_key" ON "athletes"("email");

-- CreateIndex
CREATE UNIQUE INDEX "athletes_gofastHandle_key" ON "athletes"("gofastHandle");

-- CreateIndex
CREATE UNIQUE INDEX "athlete_activities_sourceActivityId_key" ON "athlete_activities"("sourceActivityId");

-- AddForeignKey
ALTER TABLE "athlete_activities" ADD CONSTRAINT "athlete_activities_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athletes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
