import express from "express";

const router = express.Router();

// POST /api/garmin/permissions - Handle user permissions change webhook
router.post("/permissions", async (req, res) => {
  try {
    const { userId, garminUserId, permissions, scope, timestamp } = req.body;
    
    console.log('Garmin permissions change webhook received:', { 
      userId, 
      garminUserId, 
      permissions, 
      scope, 
      timestamp 
    });
    
    // Parse the scope string (e.g., "PARTNER_WRITE PARTNER_READ CONNECT_READ CONNECT_WRITE")
    const scopes = scope ? scope.split(' ') : [];
    console.log('Parsed scopes:', scopes);
    
    // Check what permissions we have
    const hasPartnerWrite = scopes.includes('PARTNER_WRITE');
    const hasPartnerRead = scopes.includes('PARTNER_READ');
    const hasConnectRead = scopes.includes('CONNECT_READ');
    const hasConnectWrite = scopes.includes('CONNECT_WRITE');
    
    console.log('Permission breakdown:', {
      hasPartnerWrite,
      hasPartnerRead,
      hasConnectRead,
      hasConnectWrite
    });
    
    // TODO: Update user's Garmin permissions in database
    // TODO: Handle scope changes (what data we can access)
    // TODO: Log permissions change event
    
    res.json({
      success: true,
      message: 'User permissions updated',
      permissions: {
        scopes: scopes,
        hasPartnerWrite,
        hasPartnerRead,
        hasConnectRead,
        hasConnectWrite
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Garmin permissions webhook error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process permissions change' 
    });
  }
});

// POST /api/garmin/deregistration - Handle user deregistration webhooks
router.post("/deregistration", async (req, res) => {
  try {
    const { userId, garminUserId, timestamp } = req.body;
    
    console.log('🔍 DEBUG - Garmin deregistration webhook received:', { 
      userId, 
      garminUserId, 
      timestamp 
    });
    
    // TODO: Update user's garmin_connected status to false
    // TODO: Remove stored Garmin tokens from database
    // TODO: Log deregistration event
    // TODO: Clean up any cached data
    
    res.json({
      success: true,
      message: 'User deregistration processed',
      userId: userId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Garmin deregistration webhook error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process deregistration' 
    });
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
