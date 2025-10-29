import express from "express";
import { getPrismaClient } from '../../config/database.js';
import { findAthleteByGarminUserId } from '../../services/garminFindAthleteService.js';

const router = express.Router();

// Top-level middleware logger for all Garmin webhooks
router.use((req, res, next) => {
  console.log(`📡 Garmin webhook incoming: ${req.method} ${req.originalUrl}`);
  next();
});

// GET /api/garmin/status - Get user's Garmin connection status and scopes
router.get("/status", async (req, res) => {
  try {
    const athleteId = req.query.athleteId;
    
    if (!athleteId) {
      return res.status(400).json({ error: "athleteId is required" });
    }
    
    // Get database client
    const prisma = getPrismaClient();
    
    // Get athlete's Garmin integration status
    const athlete = await prisma.athlete.findUnique({
      where: { id: athleteId },
      select: {
        garmin_user_id: true,
        garmin_access_token: true,
        garmin_refresh_token: true,
        garmin_expires_in: true,
        garmin_scope: true,
        garmin_connected_at: true,
        garmin_last_sync_at: true,
        garmin_is_connected: true,
        garmin_permissions: true,
        garmin_disconnected_at: true
      }
    });
    
    if (!athlete) {
      return res.status(404).json({ error: "Athlete not found" });
    }
    
    // Parse scopes from Garmin scope string
    const garminScopes = athlete.garmin_scope ? athlete.garmin_scope.split(' ') : [];
    const scopes = {
      activities: garminScopes.includes('CONNECT_READ') || garminScopes.includes('PARTNER_READ'),
      training: garminScopes.includes('CONNECT_WRITE') || garminScopes.includes('PARTNER_WRITE')
    };
    
    // Parse permissions from JSON
    const permissions = athlete.garmin_permissions || {};
    
    res.json({
      connected: athlete.garmin_is_connected && !!athlete.garmin_access_token,
      scopes: scopes,
      permissions: permissions,
      lastSyncedAt: athlete.garmin_last_sync_at,
      connectedAt: athlete.garmin_connected_at,
      disconnectedAt: athlete.garmin_disconnected_at,
      garminUserId: athlete.garmin_user_id
    });
    
  } catch (error) {
    console.error('❌ Garmin status fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch Garmin status' });
  }
});

// PATCH /api/garmin/scopes - Update user's Garmin scopes
router.patch("/scopes", async (req, res) => {
  try {
    const userId = req.user?.id;
    const { scopes } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    if (!scopes || typeof scopes !== 'object') {
      return res.status(400).json({ error: "Invalid scopes format" });
    }
    
    // Get current athlete data
    const athlete = await prisma.athlete.findUnique({
      where: { id: userId },
      select: {
        garmin_access_token: true,
        garmin_scope: true,
        garmin_permissions: true
      }
    });
    
    if (!athlete || !athlete.garmin_access_token) {
      return res.status(400).json({ error: "No Garmin connection found" });
    }
    
    // Update permissions in database
    const updatedPermissions = {
      ...athlete.garmin_permissions,
      activities: scopes.activities || false,
      training: scopes.training || false,
      lastUpdated: new Date()
    };
    
    await prisma.athlete.update({
      where: { id: userId },
      data: {
        garmin_permissions: updatedPermissions,
        lastUpdatedAt: new Date()
      }
    });
    
    console.log('✅ Garmin scopes updated for user:', userId, 'scopes:', scopes);
    
    res.json({
      success: true,
      message: 'Garmin scopes updated',
      scopes: scopes,
      permissions: updatedPermissions
    });
    
  } catch (error) {
    console.error('❌ Garmin scopes update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update Garmin scopes' });
  }
});

// POST /api/garmin/disconnect - Disconnect Garmin integration
router.post("/disconnect", async (req, res) => {
  try {
    const { athleteId } = req.body;
    
    if (!athleteId) {
      return res.status(400).json({ error: "athleteId is required" });
    }

    const prisma = getPrismaClient();
    
    // Get current Garmin tokens
    const athlete = await prisma.athlete.findUnique({
      where: { id: athleteId },
      select: {
        garmin_access_token: true,
        garmin_user_id: true
      }
    });
    
    if (!athlete?.garmin_access_token) {
      return res.status(400).json({ error: "No Garmin connection found" });
    }
    
    // Revoke tokens with Garmin (optional - they'll expire anyway)
    try {
      await fetch('https://connectapi.garmin.com/oauth-service/oauth/revoke', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${athlete.garmin_access_token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'token=' + encodeURIComponent(athlete.garmin_access_token)
      });
      console.log('✅ Garmin tokens revoked for athlete:', athleteId);
    } catch (revokeError) {
      console.log('⚠️ Could not revoke Garmin tokens (they will expire anyway):', revokeError.message);
    }
    
    // Clear Garmin data from database
    await prisma.athlete.update({
      where: { id: athleteId },
      data: {
        garmin_user_id: null,
        garmin_access_token: null,
        garmin_refresh_token: null,
        garmin_expires_in: null,
        garmin_scope: null,
        garmin_connected_at: null,
        garmin_last_sync_at: null,
        garmin_is_connected: false,
        garmin_permissions: null,
        garmin_disconnected_at: new Date()
      }
    });
    
    console.log('✅ Garmin disconnected for athlete:', athleteId);
    
    res.json({
      success: true,
      message: 'Garmin disconnected successfully'
    });
    
  } catch (error) {
    console.error('❌ Garmin disconnect error:', error);
    res.status(500).json({ success: false, error: 'Failed to disconnect Garmin' });
  }
});

// POST /api/garmin/permissions - Handle user permissions change webhook
router.post("/permissions", async (req, res) => {
  // 1️⃣ Acknowledge Garmin immediately
  res.sendStatus(200);

  try {
    const prisma = getPrismaClient();
    const payload = req.body?.userPermissionsChange?.[0];
    
    if (!payload) {
      console.log("⚠️ Empty permissions payload", req.body);
      return;
    }

    const { userId } = payload;
    console.log(`📩 Garmin permissions change for ${userId}`);

    // 2️⃣ Find the athlete using the service
    const athlete = await findAthleteByGarminUserId(userId);
    
    if (!athlete?.garmin_access_token) {
      console.log(`⚠️ No access token for ${userId}`);
      return;
    }

    // 3️⃣ Fetch current permission state from Garmin
    const resp = await fetch(
      "https://apis.garmin.com/wellness-api/rest/user/permissions",
      {
        headers: {
          Authorization: `Bearer ${athlete.garmin_access_token}`,
          "Content-Type": "application/json"
        }
      }
    );
    
    const currentPerms = resp.ok ? await resp.json() : [];
    console.log(`🔍 Current permissions from Garmin API for ${userId}:`, currentPerms);

    // 4️⃣ Store the new permission set
    const result = await prisma.athlete.updateMany({
      where: { garmin_user_id: userId },
      data: {
        garmin_permissions: {
          current: currentPerms,
          updatedAt: new Date().toISOString()
        },
        garmin_last_sync_at: new Date()
      }
    });

    console.log(`✅ Permissions updated for Garmin user ${userId} (${result.count} record(s) updated):`, currentPerms);

  } catch (err) {
    console.error("❌ Garmin permissions handler error:", err);
  }
});

// POST /api/garmin/deregistration - Handle user deregistration webhooks
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

// GET /api/garmin/permissions/check - Check current user permissions
router.get("/permissions/check", async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    
    // TODO: Fetch user's current permissions from database
    // TODO: Check token validity
    // TODO: Return current scope/permissions
    
    res.json({
      success: true,
      message: 'Permissions checked',
      userId: userId,
      permissions: {
        connected: false, // TODO: Check actual connection status
        scopes: [], // TODO: Return actual scopes
        lastUpdated: null // TODO: Return actual timestamp
      }
    });
    
  } catch (error) {
    console.error('Garmin permissions check error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to check permissions' 
    });
  }
});

// POST /api/garmin/webhook - Handle general Garmin webhook events
router.post("/webhook", async (req, res) => {
  try {
    const { eventType, userId, data, timestamp } = req.body;
    
    console.log('Garmin webhook received:', { eventType, userId, data, timestamp });
    
    // Handle different webhook event types
    switch (eventType) {
      case 'permissions_changed':
        console.log('Permissions changed:', data);
        // TODO: Process permissions change
        break;
      case 'user_deregistered':
        console.log('User deregistered:', data);
        // TODO: Process deregistration
        break;
      case 'connection_status':
        console.log('Connection status changed:', data);
        // TODO: Update connection status
        break;
      case 'data_available':
        console.log('New data available:', data);
        // TODO: Trigger data sync
        break;
      default:
        console.log('Unknown webhook event type:', eventType);
    }
    
    res.json({
      success: true,
      message: 'Webhook processed',
      eventType: eventType,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Garmin webhook error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process webhook' 
    });
  }
});

export default router;
