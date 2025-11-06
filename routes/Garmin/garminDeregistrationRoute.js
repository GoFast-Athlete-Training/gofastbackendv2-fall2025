import express from "express";
import { getPrismaClient } from '../../config/database.js';
import { findAthleteByGarminUserId } from '../../services/garminFindAthleteService.js';

const router = express.Router();

// Top-level middleware logger for all Garmin webhooks
router.use((req, res, next) => {
  console.log(`📡 Garmin webhook incoming: ${req.method} ${req.originalUrl}`);
  next();
});

// PUT /api/garmin/deregistration - Handle user deregistration webhooks (Garmin preferred method)
router.put("/deregistration", async (req, res) => {
  // 1️⃣ Immediately respond with 200 OK to Garmin
  res.sendStatus(200);

  try {
    const prisma = getPrismaClient();
    
    // 2️⃣ Parse req.body.userId (Garmin userId)
    const { userId } = req.body;
    
    if (!userId) {
      console.log('⚠️ No userId found in deregistration payload');
      return;
    }
    
    console.log(`📩 Garmin deregistration for ${userId}`);

    // 3️⃣ Use findAthleteByGarminUserId() service to find the athlete
    const athlete = await findAthleteByGarminUserId(userId);
    
    if (!athlete) {
      console.log(`⚠️ No athlete found for Garmin user ${userId}`);
      return;
    }
    
    // 4️⃣ Wipe ALL Garmin data and set disconnected status
    // NOTE: We clear garmin_user_id to prevent webhook matching
    console.log(`🔍 BEFORE DEREGISTRATION - athleteId: ${athlete.id}, garmin_user_id: ${athlete.garmin_user_id}`);
    
    const result = await prisma.athlete.updateMany({
      where: { garmin_user_id: userId },
      data: {
        garmin_user_id: null,              // Clear user ID to prevent webhook matching
        garmin_access_token: null,
        garmin_refresh_token: null,
        garmin_expires_in: null,
        garmin_scope: null,
        garmin_permissions: null,
        garmin_user_profile: null,          // Clear profile data
        garmin_user_sleep: null,            // Clear sleep data
        garmin_user_preferences: null,      // Clear preferences
        garmin_is_connected: false,
        garmin_disconnected_at: new Date()
      }
    });
    
    // 5️⃣ VERIFY all Garmin data was cleared
    const verification = await prisma.athlete.findUnique({
      where: { id: athlete.id },
      select: {
        id: true,
        email: true,
        garmin_user_id: true,
        garmin_is_connected: true,
        garmin_access_token: true,
        garmin_refresh_token: true,
        garmin_scope: true,
        garmin_user_profile: true
      }
    });
    
    const allCleared = !verification.garmin_user_id && 
                      !verification.garmin_access_token && 
                      !verification.garmin_refresh_token &&
                      verification.garmin_is_connected === false;
    
    if (allCleared) {
      console.log(`✅ Garmin tokens wiped for athlete ${athlete.id} (userId: ${userId})`);
      console.log(`✅ VERIFICATION PASSED - All Garmin data cleared:`, {
        athleteId: verification.id,
        email: verification.email,
        garmin_user_id: verification.garmin_user_id,
        garmin_is_connected: verification.garmin_is_connected,
        has_token: !!verification.garmin_access_token,
        has_refresh: !!verification.garmin_refresh_token,
        recordsUpdated: result.count
      });
    } else {
      console.error(`❌ VERIFICATION FAILED - Garmin data still present after deregistration!`, {
        athleteId: verification.id,
        garmin_user_id: verification.garmin_user_id,
        garmin_is_connected: verification.garmin_is_connected,
        has_token: !!verification.garmin_access_token,
        has_refresh: !!verification.garmin_refresh_token,
        recordsUpdated: result.count
      });
    }
    
  } catch (error) {
    // 6️⃣ Catch any errors, log them, and ensure Garmin always receives a 200 response
    console.error('❌ Garmin deregistration webhook error:', error);
  }
});

// POST /api/garmin/deregistration - Handle user deregistration webhooks (fallback method)
router.post("/deregistration", async (req, res) => {
  // 1️⃣ Immediately respond with 200 OK to Garmin
  res.sendStatus(200);

  try {
    const prisma = getPrismaClient();
    
    // 2️⃣ Parse req.body.userId (Garmin userId)
    const { userId } = req.body;
    
    if (!userId) {
      console.log('⚠️ No userId found in deregistration payload');
      return;
    }
    
    console.log(`📩 Garmin deregistration for ${userId}`);

    // 3️⃣ Use findAthleteByGarminUserId() service to find the athlete
    const athlete = await findAthleteByGarminUserId(userId);
    
    if (!athlete) {
      console.log(`⚠️ No athlete found for Garmin user ${userId}`);
      return;
    }
    
    // 4️⃣ Wipe ALL Garmin data and set disconnected status
    // NOTE: We clear garmin_user_id to prevent webhook matching
    console.log(`🔍 BEFORE DEREGISTRATION - athleteId: ${athlete.id}, garmin_user_id: ${athlete.garmin_user_id}`);
    
    const result = await prisma.athlete.updateMany({
      where: { garmin_user_id: userId },
      data: {
        garmin_user_id: null,              // Clear user ID to prevent webhook matching
        garmin_access_token: null,
        garmin_refresh_token: null,
        garmin_expires_in: null,
        garmin_scope: null,
        garmin_permissions: null,
        garmin_user_profile: null,          // Clear profile data
        garmin_user_sleep: null,            // Clear sleep data
        garmin_user_preferences: null,      // Clear preferences
        garmin_is_connected: false,
        garmin_disconnected_at: new Date()
      }
    });
    
    // 5️⃣ VERIFY all Garmin data was cleared
    const verification = await prisma.athlete.findUnique({
      where: { id: athlete.id },
      select: {
        id: true,
        email: true,
        garmin_user_id: true,
        garmin_is_connected: true,
        garmin_access_token: true,
        garmin_refresh_token: true,
        garmin_scope: true,
        garmin_user_profile: true
      }
    });
    
    const allCleared = !verification.garmin_user_id && 
                      !verification.garmin_access_token && 
                      !verification.garmin_refresh_token &&
                      verification.garmin_is_connected === false;
    
    if (allCleared) {
      console.log(`✅ Garmin tokens wiped for athlete ${athlete.id} (userId: ${userId})`);
      console.log(`✅ VERIFICATION PASSED - All Garmin data cleared:`, {
        athleteId: verification.id,
        email: verification.email,
        garmin_user_id: verification.garmin_user_id,
        garmin_is_connected: verification.garmin_is_connected,
        has_token: !!verification.garmin_access_token,
        has_refresh: !!verification.garmin_refresh_token,
        recordsUpdated: result.count
      });
    } else {
      console.error(`❌ VERIFICATION FAILED - Garmin data still present after deregistration!`, {
        athleteId: verification.id,
        garmin_user_id: verification.garmin_user_id,
        garmin_is_connected: verification.garmin_is_connected,
        has_token: !!verification.garmin_access_token,
        has_refresh: !!verification.garmin_refresh_token,
        recordsUpdated: result.count
      });
    }
    
  } catch (error) {
    // 6️⃣ Catch any errors, log them, and ensure Garmin always receives a 200 response
    console.error('❌ Garmin deregistration webhook error:', error);
  }
});

export default router;
