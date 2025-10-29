import express from "express";
import { getPrismaClient } from '../../config/database.js';

const router = express.Router();

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
  try {
    const prisma = getPrismaClient();
    const { userId, garminUserId, permissions, scope, timestamp } = req.body;
    
    console.log(`📩 Garmin permissions update for ${userId}`);
    
    // Parse the scope string (e.g., "PARTNER_WRITE PARTNER_READ CONNECT_READ CONNECT_WRITE")
    const scopes = scope ? scope.split(' ') : [];
    
    // Check what permissions we have
    const hasPartnerWrite = scopes.includes('PARTNER_WRITE');
    const hasPartnerRead = scopes.includes('PARTNER_READ');
    const hasConnectRead = scopes.includes('CONNECT_READ');
    const hasConnectWrite = scopes.includes('CONNECT_WRITE');
    
    // Create permissions object
    const permissionsData = {
      scopes: scopes,
      hasPartnerWrite,
      hasPartnerRead,
      hasConnectRead,
      hasConnectWrite,
      lastUpdated: new Date().toISOString(),
      rawPermissions: permissions
    };
    
    // Update athlete's Garmin permissions in database
    const result = await prisma.athlete.updateMany({
      where: { garmin_user_id: garminUserId },
      data: {
        garmin_permissions: permissionsData,
        garmin_last_sync_at: new Date()
      }
    });
    
    console.log(`✅ Permissions updated for Garmin user ${userId} (${result.count} record(s) updated)`);
    
    // Always return 200 quickly for webhooks
    return res.sendStatus(200);
    
  } catch (error) {
    console.error('❌ Garmin permissions webhook error:', error);
    // Always return 200 even on error to prevent webhook retries
    return res.sendStatus(200);
  }
});

// POST /api/garmin/deregistration - Handle user deregistration webhooks
router.post("/deregistration", async (req, res) => {
  try {
    const prisma = getPrismaClient();
    const { userId, garminUserId, timestamp } = req.body;
    
    console.log(`📩 Garmin deregistration for ${userId}`);
    
    // Wipe all Garmin tokens and set disconnected status
    const result = await prisma.athlete.updateMany({
      where: { garmin_user_id: garminUserId },
      data: {
        garmin_access_token: null,
        garmin_refresh_token: null,
        garmin_is_connected: false,
        garmin_disconnected_at: new Date()
      }
    });
    
    console.log(`✅ Tokens wiped for Garmin user ${userId} (${result.count} record(s) updated)`);
    
    // Always return 200 quickly for webhooks
    return res.sendStatus(200);
    
  } catch (error) {
    console.error('❌ Garmin deregistration webhook error:', error);
    // Always return 200 even on error to prevent webhook retries
    return res.sendStatus(200);
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
