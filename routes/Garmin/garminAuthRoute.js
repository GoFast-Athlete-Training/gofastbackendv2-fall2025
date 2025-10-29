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
      console.error('❌ Garmin token exchange failed:', errorText);
      console.error('❌ Token response status:', tokenResponse.status);
      console.error('❌ Token response headers:', Object.fromEntries(tokenResponse.headers.entries()));
      throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorText}`);
    }
    
    const tokenData = await tokenResponse.json();
    console.log('Garmin OAuth 2.0 tokens received (tokens hidden for security)');
    
    // Log the scope returned by Garmin
    console.log('Garmin returned scope:', tokenData.scope);
    
    // Get athleteId from frontend localStorage (sent in request body)
    const { athleteId } = req.body;
    
    if (!athleteId) {
      return res.status(400).json({ error: "athleteId is required" });
    }
    
    console.log('✅ OAuth callback - saving tokens for athleteId:', athleteId, '- DEPLOYED VERSION');
    
    // Save Garmin tokens to database - user info will be fetched separately
    try {
      await prisma.athlete.update({
        where: { id: athleteId },
        data: {
          garmin_user_id: null, // Will be updated by garminUserRoute
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
      
      // NOW GET THE UUID - call garminUserRoute logic
      console.log('🔍 Getting UUID from Garmin API...');
      const garminResponse = await fetch('https://connectapi.garmin.com/oauth-service/oauth/user-info', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (garminResponse.ok) {
        const garminData = await garminResponse.json();
        const garminUserId = garminData.userId;
        
        if (garminUserId) {
          // Save UUID to database
          await prisma.athlete.update({
            where: { id: athleteId },
            data: {
              garmin_user_id: garminUserId,
              garmin_last_sync_at: new Date()
            }
          });
          console.log('✅ UUID fetched and saved:', garminUserId);
        }
      } else {
        console.log('⚠️ Could not fetch UUID, will be null for now');
      }
      
    } catch (dbError) {
      console.error('❌ Failed to save Garmin tokens to database:', dbError);
      return res.status(500).json({ error: 'Failed to save tokens' });
    }
    
    res.json({
      success: true,
      message: 'Garmin tokens and UUID saved successfully',
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

// POST /api/garmin/save-tokens - Save tokens to database (called from frontend)
router.post("/save-tokens", async (req, res) => {
  try {
    const { athleteId, tokens } = req.body;
    
    if (!athleteId || !tokens) {
      return res.status(400).json({ error: "athleteId and tokens are required" });
    }
    
    console.log('💾 SAVE TOKENS: Saving tokens for athleteId:', athleteId);
    
    // Save Garmin tokens to database
    await prisma.athlete.update({
      where: { id: athleteId },
      data: {
        garmin_user_id: null, // Will be updated by garminUserRoute
        garmin_access_token: tokens.access_token,
        garmin_refresh_token: tokens.refresh_token,
        garmin_expires_in: tokens.expires_in,
        garmin_scope: tokens.scope,
        garmin_connected_at: new Date(),
        garmin_last_sync_at: new Date(),
        garmin_is_connected: true,
        garmin_permissions: {
          read: tokens.scope?.includes('READ') || false,
          write: tokens.scope?.includes('WRITE') || false,
          scope: tokens.scope,
          grantedAt: new Date(),
          lastChecked: new Date()
        }
      }
    });
    
    console.log('✅ Tokens saved to database for athleteId:', athleteId);
    
    res.json({
      success: true,
      message: 'Tokens saved to database'
    });
    
  } catch (error) {
    console.error('❌ Save tokens error:', error);
    res.status(500).json({ error: 'Failed to save tokens' });
  }
});

export default router;
