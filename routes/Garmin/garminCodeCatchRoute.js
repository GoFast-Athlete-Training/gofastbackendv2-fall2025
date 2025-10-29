// garminCodeCatchRoute.js - Catch Garmin's redirect and handle token exchange
import express from 'express';
import { exchangeCodeForTokens, GARMIN_CONFIG } from '../../services/garminUtils.js';
import { getCodeVerifier, deleteCodeVerifier } from '../../utils/redis.js';
import { saveGarminTokens } from './garminTokenSaveRoute.js';

const router = express.Router();

// GET /api/garmin/callback?code=XYZ&state=123
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    console.log('🎯 Garmin OAuth callback received:', { code: code ? 'present' : 'missing', state, error });
    
    // Handle OAuth errors
    if (error) {
      console.error(`❌ OAuth error from Garmin: ${error}`);
      return res.redirect(`${GARMIN_CONFIG.FRONTEND_URL}/settings/garmin?status=error&message=${encodeURIComponent(error)}`);
    }
    
    // Validate required parameters
    if (!code || !state) {
      console.error('❌ Missing required parameters:', { code: !!code, state: !!state });
      return res.redirect(`${GARMIN_CONFIG.FRONTEND_URL}/settings/garmin?status=error&message=missing_parameters`);
    }
    
    const athleteId = state; // We use athleteId as state for simplicity
    
    // Step 1: Get code verifier from Redis
    const codeVerifier = await getCodeVerifier(athleteId);
    if (!codeVerifier) {
      console.error(`❌ No code verifier found for athleteId: ${athleteId}`);
      return res.redirect(`${GARMIN_CONFIG.FRONTEND_URL}/settings/garmin?status=error&message=code_verifier_expired`);
    }
    
    // Step 2: Validate state to prevent spoofing
    if (!validateState(state, athleteId)) {
      console.error(`❌ State validation failed for athleteId: ${athleteId}`);
      return res.redirect(`${GARMIN_CONFIG.FRONTEND_URL}/settings/garmin?status=error&message=invalid_state`);
    }
    
    console.log(`🔍 Exchanging code for tokens for athleteId: ${athleteId}`);
    
    // Step 3: Exchange code for tokens with Garmin
    const tokenResult = await exchangeCodeForTokens(code, codeVerifier);
    
    if (!tokenResult.success) {
      console.error(`❌ Token exchange failed for athleteId ${athleteId}:`, tokenResult.error);
      return res.redirect(`${GARMIN_CONFIG.FRONTEND_URL}/settings/garmin?status=error&message=token_exchange_failed`);
    }
    
    console.log(`✅ Tokens received for athleteId: ${athleteId}`);
    
    // Step 4: Save tokens to database
    const saveResult = await saveGarminTokens(athleteId, tokenResult.tokens);
    
    if (!saveResult.success) {
      console.error(`❌ Token save failed for athleteId ${athleteId}:`, saveResult.error);
      return res.redirect(`${GARMIN_CONFIG.FRONTEND_URL}/settings/garmin?status=error&message=token_save_failed`);
    }
    
    // Step 5: Clean up Redis
    await deleteCodeVerifier(athleteId);
    
    console.log(`✅ OAuth flow completed successfully for athleteId: ${athleteId}`);
    
    // Step 6: Redirect to frontend success page
    return res.redirect(`${GARMIN_CONFIG.FRONTEND_URL}/settings/garmin?status=success&athleteId=${athleteId}`);
    
  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    return res.redirect(`${GARMIN_CONFIG.FRONTEND_URL}/settings/garmin?status=error&message=callback_error`);
  }
});

// GET /api/garmin/exchange?code=XYZ&athleteId=123 - Exchange code for tokens (called from frontend)
router.get('/exchange', async (req, res) => {
  try {
    const { code, athleteId } = req.query;
    
    console.log('🎯 Garmin OAuth exchange received:', { code: code ? 'present' : 'missing', athleteId });
    
    // Validate required parameters
    if (!code || !athleteId) {
      console.error('❌ Missing required parameters:', { code: !!code, athleteId: !!athleteId });
      return res.status(400).json({ 
        success: false,
        error: 'code and athleteId are required' 
      });
    }
    
    // Step 1: Get code verifier from Redis
    const codeVerifier = await getCodeVerifier(athleteId);
    if (!codeVerifier) {
      console.error(`❌ No code verifier found for athleteId: ${athleteId}`);
      return res.status(400).json({ 
        success: false,
        error: 'code_verifier_expired' 
      });
    }
    
    console.log(`🔍 Exchanging code for tokens for athleteId: ${athleteId}`);
    
    // Step 2: Exchange code for tokens with Garmin
    const tokenResult = await exchangeCodeForTokens(code, codeVerifier);
    
    if (!tokenResult.success) {
      console.error(`❌ Token exchange failed for athleteId ${athleteId}:`, tokenResult.error);
      return res.status(500).json({ 
        success: false,
        error: 'token_exchange_failed',
        details: tokenResult.error
      });
    }
    
    console.log(`✅ Tokens received for athleteId: ${athleteId}`);
    
    // Step 3: Save tokens to database
    const saveResult = await saveGarminTokens(athleteId, tokenResult.tokens);
    
    if (!saveResult.success) {
      console.error(`❌ Token save failed for athleteId ${athleteId}:`, saveResult.error);
      return res.status(500).json({ 
        success: false,
        error: 'token_save_failed',
        details: saveResult.error
      });
    }
    
    // Step 4: Clean up Redis
    await deleteCodeVerifier(athleteId);
    
    console.log(`✅ OAuth exchange completed successfully for athleteId: ${athleteId}`);
    
    res.json({
      success: true,
      message: 'Garmin connected successfully',
      athleteId: athleteId,
      garminUserId: saveResult.garminUserId
    });
    
  } catch (error) {
    console.error('❌ OAuth exchange error:', error);
    res.status(500).json({ 
      success: false,
      error: 'exchange_error',
      details: error.message
    });
  }
});

export default router;
