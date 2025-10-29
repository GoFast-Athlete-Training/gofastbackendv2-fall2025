// Shared Garmin OAuth utilities
import crypto from 'crypto';

// Garmin OAuth 2.0 Configuration
export const GARMIN_CONFIG = {
  CLIENT_ID: process.env.GARMIN_CLIENT_ID,
  CLIENT_SECRET: process.env.GARMIN_CLIENT_SECRET,
  AUTHORIZE_URL: 'https://connect.garmin.com/oauthConfirm',
  TOKEN_URL: 'https://diauth.garmin.com/di-oauth2-service/oauth/token',
  USER_INFO_URL: 'https://connectapi.garmin.com/oauth-service/oauth/user-info',
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://athlete.gofastcrushgoals.com',
  BACKEND_URL: process.env.BACKEND_URL || 'https://gofastbackendv2-fall2025.onrender.com'
};

// Generate PKCE code verifier and challenge
export const generatePKCE = () => {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const state = crypto.randomBytes(16).toString('hex');
  
  return {
    codeVerifier,
    codeChallenge,
    state
  };
};

// Build Garmin authorization URL
export const buildAuthUrl = (codeChallenge, state) => {
  const params = new URLSearchParams({
    client_id: GARMIN_CONFIG.CLIENT_ID,
    response_type: 'code',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: state
  });
  
  return `${GARMIN_CONFIG.AUTHORIZE_URL}?${params.toString()}`;
};

// Exchange authorization code for tokens
export const exchangeCodeForTokens = async (code, codeVerifier) => {
  try {
    console.log('🔄 Exchanging code for tokens with Garmin...');
    
    const response = await fetch(GARMIN_CONFIG.TOKEN_URL, {
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
        redirect_uri: 'https://gofastbackendv2-fall2025.onrender.com/api/garmin/callback'
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Garmin token exchange failed:', response.status, errorText);
      throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
    }
    
    const tokenData = await response.json();
    console.log('✅ Tokens received from Garmin (tokens hidden for security)');
    
    return {
      success: true,
      tokens: tokenData
    };
    
  } catch (error) {
    console.error('❌ Token exchange error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Fetch user info from Garmin API
export const fetchGarminUserInfo = async (accessToken) => {
  try {
    console.log('🔄 Fetching user info from Garmin API...');
    
    const response = await fetch(GARMIN_CONFIG.USER_INFO_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Garmin user info fetch failed:', response.status, errorText);
      throw new Error(`User info fetch failed: ${response.status} - ${errorText}`);
    }
    
    const userData = await response.json();
    console.log('✅ User info received from Garmin');
    
    return {
      success: true,
      userData: userData
    };
    
  } catch (error) {
    console.error('❌ User info fetch error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Fetch user profile from Garmin Connect API
export const fetchGarminProfile = async (accessToken) => {
  try {
    console.log('🔄 Fetching Garmin profile...');
    
    const response = await fetch('https://connectapi.garmin.com/userprofile-service/userprofile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Garmin profile fetch failed:', response.status, errorText);
      throw new Error(`Garmin profile fetch failed: ${response.status} - ${errorText}`);
    }
    
    const profileData = await response.json();
    console.log('✅ Garmin profile received');
    
    return profileData;
    
  } catch (error) {
    console.error('❌ Profile fetch error:', error);
    throw error;
  }
};
