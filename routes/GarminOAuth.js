import express from "express";
import crypto from "crypto";

const router = express.Router();

// Garmin OAuth 2.0 PKCE Configuration
const GARMIN_CONFIG = {
  CLIENT_ID: process.env.GARMIN_CLIENT_ID,
  CLIENT_SECRET: process.env.GARMIN_CLIENT_SECRET,
  AUTHORIZE_URL: 'https://connect.garmin.com/oauth2Confirm',
  TOKEN_URL: 'https://diauth.garmin.com/di-oauth2-service/oauth/token'
};

// Generate PKCE code verifier and challenge
function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const state = crypto.randomBytes(16).toString('hex');
  
  return {
    codeVerifier,
    codeChallenge,
    state
  };
}

// POST /api/garmin/auth - Initiate OAuth 2.0 PKCE flow
router.post("/auth", async (req, res) => {
  try {
    const { callback_url } = req.body;
    
    if (!callback_url) {
      return res.status(400).json({ error: "callback_url is required" });
    }
    
    // Generate PKCE parameters
    const { codeVerifier, codeChallenge, state } = generatePKCE();
    
    // Store PKCE parameters in session or database for callback
    // For now, we'll include them in the response (in production, store securely)
    const authUrl = `${GARMIN_CONFIG.AUTHORIZE_URL}?` + new URLSearchParams({
      client_id: GARMIN_CONFIG.CLIENT_ID,
      response_type: 'code',
      redirect_uri: callback_url,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state: state
    }).toString();
    
    res.json({ 
      success: true,
      authUrl,
      codeVerifier, // Store this securely for callback
      state
    });
    
  } catch (error) {
    console.error('Garmin OAuth 2.0 auth error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to initiate Garmin OAuth 2.0' 
    });
  }
});

// POST /api/garmin/callback - Exchange code for tokens
router.post("/callback", async (req, res) => {
  try {
    const { code, codeVerifier, state } = req.body;
    
    if (!code || !codeVerifier) {
      return res.status(400).json({ error: "code and codeVerifier are required" });
    }
    
    // Exchange authorization code for access token
    const tokenResponse = await fetch(GARMIN_CONFIG.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: GARMIN_CONFIG.CLIENT_ID,
        client_secret: GARMIN_CONFIG.CLIENT_SECRET,
        code: code,
        code_verifier: codeVerifier,
        redirect_uri: 'https://athlete.gofastcrushgoals.com/garmin/callback'
      })
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Garmin token exchange failed:', errorText);
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }
    
    const tokenData = await tokenResponse.json();
    console.log('Garmin OAuth 2.0 tokens received:', tokenData);
    
    // TODO: Store tokens in database for user
    // TODO: Update user's garmin_connected status
    
    res.json({
      success: true,
      message: 'Garmin connected successfully',
      tokens: {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        scope: tokenData.scope
      }
    });
    
  } catch (error) {
    console.error('Garmin OAuth 2.0 callback error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to exchange code for tokens' 
    });
  }
});

// POST /api/garmin/refresh - Refresh access token
router.post("/refresh", async (req, res) => {
  try {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      return res.status(400).json({ error: "refresh_token is required" });
    }
    
    const tokenResponse = await fetch(GARMIN_CONFIG.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: GARMIN_CONFIG.CLIENT_ID,
        client_secret: GARMIN_CONFIG.CLIENT_SECRET,
        refresh_token: refresh_token
      })
    });
    
    if (!tokenResponse.ok) {
      throw new Error(`Token refresh failed: ${tokenResponse.status}`);
    }
    
    const tokenData = await tokenResponse.json();
    
    res.json({
      success: true,
      tokens: {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in
      }
    });
    
  } catch (error) {
    console.error('Garmin token refresh error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to refresh token' 
    });
  }
});

// POST /api/garmin/deregister - Handle user deregistration webhook
router.post("/deregister", async (req, res) => {
  try {
    const { userId, garminUserId, timestamp } = req.body;
    
    console.log('Garmin deregistration webhook received:', { userId, garminUserId, timestamp });
    
    // TODO: Update user's garmin_connected status to false
    // TODO: Remove stored Garmin tokens from database
    // TODO: Log deregistration event
    
    res.json({
      success: true,
      message: 'User deregistration processed',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Garmin deregistration webhook error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process deregistration' 
    });
  }
});

// POST /api/garmin/permissions - Handle user permissions change webhook
router.post("/permissions", async (req, res) => {
  try {
    const { userId, garminUserId, permissions, timestamp } = req.body;
    
    console.log('Garmin permissions change webhook received:', { userId, garminUserId, permissions, timestamp });
    
    // TODO: Update user's Garmin permissions in database
    // TODO: Handle scope changes (what data we can access)
    // TODO: Log permissions change event
    
    res.json({
      success: true,
      message: 'User permissions updated',
      permissions: permissions,
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

// POST /api/garmin/webhook - Handle general Garmin webhook events
router.post("/webhook", async (req, res) => {
  try {
    const { eventType, userId, data, timestamp } = req.body;
    
    console.log('Garmin webhook received:', { eventType, userId, data, timestamp });
    
    // Handle different webhook event types
    switch (eventType) {
      case 'activity_upload':
        console.log('Activity uploaded:', data);
        // TODO: Process new activity data
        break;
      case 'user_update':
        console.log('User profile updated:', data);
        // TODO: Update user profile data
        break;
      case 'connection_status':
        console.log('Connection status changed:', data);
        // TODO: Update connection status
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

// GET /api/garmin/status - Health check for webhook endpoints
router.get("/status", async (req, res) => {
  res.json({
    success: true,
    message: 'Garmin webhook endpoints active',
    endpoints: [
      'POST /api/garmin/auth - OAuth initiation',
      'POST /api/garmin/callback - OAuth callback',
      'POST /api/garmin/refresh - Token refresh',
      'POST /api/garmin/deregister - User deregistration',
      'POST /api/garmin/permissions - Permissions change',
      'POST /api/garmin/webhook - General webhooks',
      'GET /api/garmin/status - Health check'
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;