const express = require("express");
const router = express.Router();
const crypto = require("crypto");

// Garmin OAuth 1.0a Configuration
const GARMIN_CONFIG = {
  CONSUMER_KEY: process.env.GARMIN_CONSUMER_KEY,
  CONSUMER_SECRET: process.env.GARMIN_CONSUMER_SECRET,
  REQUEST_TOKEN_URL: 'https://connectapi.garmin.com/oauth-service/oauth/request_token',
  ACCESS_TOKEN_URL: 'https://connectapi.garmin.com/oauth-service/oauth/access_token',
  AUTHORIZE_URL: 'https://connect.garmin.com/oauthConfirm'
};

// OAuth 1.0a signature generation
function generateOAuthSignature(method, url, params, consumerSecret, tokenSecret = '') {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  const signatureBaseString = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  
  return crypto.createHmac('sha1', signingKey).update(signatureBaseString).digest('base64');
}

// Generate OAuth 1.0a header
function generateOAuthHeader(method, url, params, consumerSecret, tokenSecret = '') {
  const signature = generateOAuthSignature(method, url, params, consumerSecret, tokenSecret);
  
  const oauthParams = {
    ...params,
    oauth_signature: signature
  };
  
  const authHeader = Object.keys(oauthParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ');
  
  return `OAuth ${authHeader}`;
}

// POST /api/garmin/auth - Initiate OAuth 1.0a flow
router.post("/auth", async (req, res) => {
  try {
    const { callback_url } = req.body;
    
    if (!callback_url) {
      return res.status(400).json({ error: "callback_url is required" });
    }
    
    // Generate OAuth 1.0a parameters
    const oauthParams = {
      oauth_consumer_key: GARMIN_CONFIG.CONSUMER_KEY,
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_version: '1.0',
      oauth_callback: callback_url
    };
    
    // Generate OAuth header
    const authHeader = generateOAuthHeader(
      'POST',
      GARMIN_CONFIG.REQUEST_TOKEN_URL,
      oauthParams,
      GARMIN_CONFIG.CONSUMER_SECRET
    );
    
    // Request token from Garmin
    const response = await fetch(GARMIN_CONFIG.REQUEST_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Garmin request token failed: ${response.status}`);
    }
    
    const responseText = await response.text();
    const tokenParams = new URLSearchParams(responseText);
    
    const oauthToken = tokenParams.get('oauth_token');
    const oauthTokenSecret = tokenParams.get('oauth_token_secret');
    
    if (!oauthToken || !oauthTokenSecret) {
      throw new Error('Invalid response from Garmin');
    }
    
    // Store temp token in session or database for callback
    // For now, we'll include it in the auth URL
    const authUrl = `${GARMIN_CONFIG.AUTHORIZE_URL}?oauth_token=${oauthToken}`;
    
    res.json({ 
      success: true,
      authUrl,
      oauthToken,
      oauthTokenSecret // Store this securely for callback
    });
    
  } catch (error) {
    console.error('Garmin OAuth auth error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to initiate Garmin OAuth' 
    });
  }
});

// GET /auth/garmin/callback - Handle OAuth 1.0a callback (Garmin redirect URL)
router.get("/callback", async (req, res) => {
  try {
    const { oauth_token, oauth_verifier } = req.query;
    
    if (!oauth_token || !oauth_verifier) {
      return res.status(400).send('Missing OAuth parameters');
    }
    
    // TODO: Retrieve oauth_token_secret from storage (session/database)
    // For now, we'll need to implement proper token storage
    
    // Generate OAuth 1.0a parameters for access token exchange
    const oauthParams = {
      oauth_consumer_key: GARMIN_CONFIG.CONSUMER_KEY,
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_version: '1.0',
      oauth_token: oauth_token,
      oauth_verifier: oauth_verifier
    };
    
    // Generate OAuth header with token secret
    const authHeader = generateOAuthHeader(
      'POST',
      GARMIN_CONFIG.ACCESS_TOKEN_URL,
      oauthParams,
      GARMIN_CONFIG.CONSUMER_SECRET,
      'TEMP_TOKEN_SECRET' // TODO: Get from storage
    );
    
    // Exchange verifier for access token
    const response = await fetch(GARMIN_CONFIG.ACCESS_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Garmin access token failed: ${response.status}`);
    }
    
    const responseText = await response.text();
    const tokenParams = new URLSearchParams(responseText);
    
    const accessToken = tokenParams.get('oauth_token');
    const accessTokenSecret = tokenParams.get('oauth_token_secret');
    
    if (!accessToken || !accessTokenSecret) {
      throw new Error('Invalid access token response from Garmin');
    }
    
    // TODO: Store access tokens in database for user
    // TODO: Update user's garmin_connected status
    
    // Redirect to frontend success page
    res.redirect('https://athlete.gofastcrushgoals.com/settings?garmin=connected');
    
  } catch (error) {
    console.error('Garmin OAuth callback error:', error);
    res.redirect('https://athlete.gofastcrushgoals.com/settings?garmin=error');
  }
});

module.exports = router;
