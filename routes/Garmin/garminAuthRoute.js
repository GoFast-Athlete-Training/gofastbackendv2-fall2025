import express from "express";
import crypto from "crypto";
import { PrismaClient } from '@prisma/client';
import { GarminIntegrationService } from '../../services/GarminIntegrationService.js';

const router = express.Router();
const prisma = new PrismaClient();

// Garmin OAuth 2.0 PKCE Configuration - Based on community insights
const GARMIN_CONFIG = {
  CLIENT_ID: process.env.GARMIN_CLIENT_ID,
  CLIENT_SECRET: process.env.GARMIN_CLIENT_SECRET,
  // EXACT endpoints from community portal
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
    
    // Build auth URL with EXACT parameters from community insights
    const authUrl = `${GARMIN_CONFIG.AUTHORIZE_URL}?` + new URLSearchParams({
      client_id: GARMIN_CONFIG.CLIENT_ID,
      response_type: 'code',
      redirect_uri: callback_url,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state: state
      // NO scope parameter - Garmin controls this!
    }).toString();
    
    console.log('🔍 DEBUG - Garmin OAuth 2.0 PKCE auth URL generated:', authUrl);
    console.log('🔍 DEBUG - Client ID:', GARMIN_CONFIG.CLIENT_ID);
    console.log('🔍 DEBUG - Callback URL:', callback_url);
    console.log('🔍 DEBUG - Code Challenge:', codeChallenge);
    console.log('🔍 DEBUG - State:', state);
    
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
    
    console.log('Garmin OAuth 2.0 callback received:', { code, state });
    
    // Exchange authorization code for access token with EXACT parameters
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
    console.log('Garmin OAuth 2.0 tokens received (tokens hidden for security)');
    
    // Log the scope returned by Garmin
    console.log('Garmin returned scope:', tokenData.scope);
    
    // Fetch Garmin API User ID using the dedicated config function
    const userResult = await fetchGarminUserId(tokenData.access_token);
    const garminUserId = userResult.success ? userResult.userId : 'unknown';
    
    // OAuth callback doesn't have user session - we'll match by codeVerifier later
    // For now, we'll create a temporary record and match it in the registration webhook
    console.log('✅ OAuth callback - no user session required');
    
    // Get athleteId from frontend localStorage (sent in request body)
    const { athleteId } = req.body;
    
    if (!athleteId) {
      return res.status(400).json({ error: "athleteId is required" });
    }
    
    console.log('✅ OAuth callback - saving tokens for athleteId:', athleteId);
    
    // Save Garmin tokens to database using athleteId
    try {
      await prisma.athlete.update({
        where: { id: athleteId },
        data: {
          garmin_user_id: garminUserId, // THE REAL UUID from /user-info!
          garmin_access_token: tokenData.access_token,
          garmin_refresh_token: tokenData.refresh_token,
          garmin_expires_in: tokenData.expires_in,
          garmin_scope: tokenData.scope,
          garmin_connected_at: new Date(),
          garmin_last_sync_at: new Date(),
          garmin_is_connected: true,
          garmin_permissions: {
            read: tokenData.scope?.includes('READ') || false,
            write: tokenData.scope?.includes('WRITE') || false,
            scope: tokenData.scope,
            grantedAt: new Date(),
            lastChecked: new Date()
          }
        }
      });
      
      console.log('✅ Garmin tokens saved to database for athleteId:', athleteId);
    } catch (dbError) {
      console.error('❌ Failed to save Garmin tokens to database:', dbError);
      return res.status(500).json({ error: 'Failed to save tokens' });
    }
    
    res.json({
      success: true,
      message: 'Garmin connected successfully',
      tokens: {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        scope: tokenData.scope // This tells us what permissions we have
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

// POST /api/garmin/debug - Debug endpoint for testing
router.post("/debug", async (req, res) => {
  try {
    const { action, codeVerifier } = req.body;
    
    console.log('🔍 DEBUG - Debug request received:', { action, codeVerifier });
    
    if (action === 'check_tokens') {
      // Check if we have any stored tokens in database
      try {
        const athletes = await prisma.athlete.findMany({
          where: {
            garmin_access_token: { not: null }
          },
          select: {
            id: true,
            email: true,
            garmin_user_id: true,
            garmin_connected_at: true,
            garmin_scope: true
          }
        });
        
        console.log('🔍 DEBUG - Found athletes with Garmin tokens:', athletes.length);
        
        res.json({
          success: true,
          message: 'Debug check completed',
          athletes: athletes,
          codeVerifier: codeVerifier,
          timestamp: new Date().toISOString()
        });
      } catch (dbError) {
        console.error('❌ Database error:', dbError);
        res.json({
          success: false,
          error: 'Database error',
          details: dbError.message
        });
      }
    } else {
      res.json({
        success: false,
        error: 'Unknown debug action',
        availableActions: ['check_tokens']
      });
    }
    
  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Debug endpoint failed',
      details: error.message
    });
  }
});

// GET /api/garmin/tokens/:athleteId - Check Garmin tokens for specific athlete
router.get("/tokens/:athleteId", async (req, res) => {
  try {
    const { athleteId } = req.params;
    
    console.log('🔍 DEBUG - Checking Garmin tokens for athleteId:', athleteId);
    
    const athlete = await prisma.athlete.findUnique({
      where: { id: athleteId },
      select: {
        id: true,
        email: true,
        garmin_user_id: true,
        garmin_access_token: true,
        garmin_refresh_token: true,
        garmin_expires_in: true,
        garmin_scope: true,
        garmin_connected_at: true,
        garmin_last_sync_at: true,
        garmin_is_connected: true
      }
    });
    
    if (!athlete) {
      return res.status(404).json({ 
        success: false, 
        error: 'Athlete not found' 
      });
    }
    
    console.log('✅ DEBUG - Athlete found:', athlete.email);
    console.log('✅ DEBUG - Garmin tokens status:', {
      hasAccessToken: !!athlete.garmin_access_token,
      hasRefreshToken: !!athlete.garmin_refresh_token,
      userId: athlete.garmin_user_id,
      connected: athlete.garmin_is_connected,
      connectedAt: athlete.garmin_connected_at,
      scope: athlete.garmin_scope
    });
    
    res.json({
      success: true,
      athlete: {
        id: athlete.id,
        email: athlete.email,
        garmin: {
          userId: athlete.garmin_user_id,
          hasAccessToken: !!athlete.garmin_access_token,
          hasRefreshToken: !!athlete.garmin_refresh_token,
          expiresIn: athlete.garmin_expires_in,
          scope: athlete.garmin_scope,
          connected: athlete.garmin_is_connected,
          connectedAt: athlete.garmin_connected_at,
          lastSyncAt: athlete.garmin_last_sync_at,
          // Don't expose actual tokens for security
          accessTokenPreview: athlete.garmin_access_token ? 
            `${athlete.garmin_access_token.substring(0, 20)}...` : null,
          refreshTokenPreview: athlete.garmin_refresh_token ? 
            `${athlete.garmin_refresh_token.substring(0, 20)}...` : null
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ DEBUG - Error checking Garmin tokens:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to check Garmin tokens',
      details: error.message
    });
  }
});

// POST /api/garmin/webhook-test - Test webhook endpoint
router.post("/webhook-test", async (req, res) => {
  try {
    console.log('🔍 WEBHOOK TEST ENDPOINT HIT!');
    console.log('🔍 Headers:', req.headers);
    console.log('🔍 Body:', req.body);
    console.log('🔍 Timestamp:', new Date().toISOString());
    
    res.json({
      success: true,
      message: 'Webhook test endpoint working',
      timestamp: new Date().toISOString(),
      received: {
        headers: req.headers,
        body: req.body
      }
    });
    
  } catch (error) {
    console.error('❌ Webhook test error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Webhook test failed' 
    });
  }
});

// POST /api/garmin/registration - Handle Garmin registration webhook (THE KEY ONE!)
router.post("/registration", async (req, res) => {
  try {
    const { userId, userAccessToken, userAccessTokenSecret } = req.body;
    
    console.log('🎯 GARMIN REGISTRATION WEBHOOK RECEIVED!');
    console.log('🔍 DEBUG - Registration payload:', { 
      userId, 
      userAccessToken: userAccessToken ? '***TOKEN***' : 'MISSING',
      userAccessTokenSecret: userAccessTokenSecret ? '***SECRET***' : 'MISSING'
    });
    
    if (!userId) {
      console.error('❌ Missing userId in registration webhook');
      return res.status(400).json({ success: false, error: 'Missing userId' });
    }
    
    // Find athlete by any existing Garmin connection (they just completed OAuth)
    // Look for athletes with 'pending' garmin_user_id (recently completed OAuth)
    const athlete = await prisma.athlete.findFirst({
      where: { 
        garmin_access_token: { not: null },
        garmin_user_id: 'pending' // Find the one we just set to 'pending'
      },
      orderBy: {
        garmin_connected_at: 'desc' // Get the most recent one
      }
    });
    
    if (athlete) {
      // Update with the REAL Partner API UUID from Garmin
      await prisma.athlete.update({
        where: { id: athlete.id },
        data: {
          garmin_user_id: userId, // THE REAL UUID!
          garmin_last_sync_at: new Date()
        }
      });
      
      console.log('✅ Garmin registration processed for athlete:', athlete.id);
      console.log('✅ Partner API UUID saved:', userId);
    } else {
      console.log('⚠️ No athlete found with pending Garmin connection');
    }
    
    res.json({
      success: true,
      message: 'Garmin registration processed',
      userId: userId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Garmin registration webhook error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process registration' 
    });
  }
});

export default router;
