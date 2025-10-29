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
    
    // 4️⃣ Wipe all Garmin data and set disconnected status
    const result = await prisma.athlete.updateMany({
      where: { garmin_user_id: userId },
      data: {
        garmin_access_token: null,
        garmin_refresh_token: null,
        garmin_expires_in: null,
        garmin_scope: null,
        garmin_permissions: null,
        garmin_is_connected: false,
        garmin_disconnected_at: new Date()
      }
    });
    
    // 5️⃣ Log success as required
    console.log(`✅ Garmin tokens wiped for athlete ${athlete.id} (userId: ${userId})`);
    
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
    
    // 4️⃣ Wipe all Garmin data and set disconnected status
    const result = await prisma.athlete.updateMany({
      where: { garmin_user_id: userId },
      data: {
        garmin_access_token: null,
        garmin_refresh_token: null,
        garmin_expires_in: null,
        garmin_scope: null,
        garmin_permissions: null,
        garmin_is_connected: false,
        garmin_disconnected_at: new Date()
      }
    });
    
    // 5️⃣ Log success as required
    console.log(`✅ Garmin tokens wiped for athlete ${athlete.id} (userId: ${userId})`);
    
  } catch (error) {
    // 6️⃣ Catch any errors, log them, and ensure Garmin always receives a 200 response
    console.error('❌ Garmin deregistration webhook error:', error);
  }
});

export default router;
