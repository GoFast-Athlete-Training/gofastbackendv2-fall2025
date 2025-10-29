// garminUrlGenRoute.js - Generate PKCE pair + Garmin authorization URL
import express from 'express';
import { generatePKCE, buildAuthUrl } from '../services/garminUtils.js';
import { storeCodeVerifier } from '../utils/redis.js';

const router = express.Router();

// GET /api/garmin/auth-url?athleteId=123
router.get('/auth-url', async (req, res) => {
  try {
    const { athleteId } = req.query;
    
    if (!athleteId) {
      return res.status(400).json({ 
        success: false,
        error: 'athleteId is required' 
      });
    }
    
    console.log(`🔍 Generating auth URL for athleteId: ${athleteId}`);
    
    // Step 1: Generate PKCE parameters
    const { codeVerifier, codeChallenge, state } = generatePKCE();
    
    // Step 2: Store code verifier in Redis (keyed by athleteId)
    await storeCodeVerifier(athleteId, codeVerifier);
    
    // Step 3: Build Garmin authorization URL
    const authUrl = buildAuthUrl(codeChallenge, athleteId); // Use athleteId as state
    
    console.log(`✅ Auth URL generated for athleteId: ${athleteId}`);
    console.log(`🔍 Auth URL: ${authUrl}`);
    
    res.json({
      success: true,
      authUrl: authUrl
    });
    
  } catch (error) {
    console.error('❌ Auth URL generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate auth URL'
    });
  }
});

export default router;
