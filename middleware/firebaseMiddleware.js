// Firebase Middleware - Token Verification
// Verifies Firebase ID tokens from frontend requests

import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
let firebaseAdmin = null;

const initializeFirebase = () => {
  if (!firebaseAdmin) {
    try {
      // Get Firebase service account from environment (.env for dev, Render for production)
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
      
      if (!serviceAccount) {
        console.error('❌ FIREBASE: FIREBASE_SERVICE_ACCOUNT environment variable not set');
        console.error('❌ FIREBASE: Set this in Render environment variables');
        throw new Error('Firebase service account not configured');
      }

      // Parse service account JSON
      const serviceAccountKey = JSON.parse(serviceAccount);
      
      // Initialize Firebase Admin
      firebaseAdmin = admin.initializeApp({
        credential: admin.credential.cert(serviceAccountKey),
        projectId: serviceAccountKey.project_id
      });
      
      console.log('✅ FIREBASE: Admin SDK initialized successfully');
      console.log('✅ FIREBASE: Project ID:', serviceAccountKey.project_id);
      
    } catch (error) {
      console.error('❌ FIREBASE: Failed to initialize Admin SDK:', error.message);
      throw error;
    }
  }
  
  return firebaseAdmin;
};

/**
 * Firebase Token Verification Middleware
 * Verifies Firebase ID tokens from Authorization header
 */
export const verifyFirebaseToken = async (req, res, next) => {
  try {
    console.log('🔐 FIREBASE: Verifying token...');
    
    // Initialize Firebase if not already done
    const admin = initializeFirebase();
    
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ FIREBASE: No Bearer token found in Authorization header');
      return res.status(401).json({
        success: false,
        error: 'No authorization token provided',
        message: 'Bearer token required in Authorization header'
      });
    }
    
    const token = authHeader.split('Bearer ')[1];
    console.log('🔐 FIREBASE: Token length:', token.length);
    
    // Verify the token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    console.log('✅ FIREBASE: Token verified successfully');
    console.log('✅ FIREBASE: User ID:', decodedToken.uid);
    console.log('✅ FIREBASE: Email:', decodedToken.email);
    console.log('✅ FIREBASE: Email Verified:', decodedToken.email_verified);
    
    // Add user info to request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      name: decodedToken.name,
      picture: decodedToken.picture,
      firebaseToken: token
    };
    
    next();
    
  } catch (error) {
    console.error('❌ FIREBASE: Token verification failed:', error.message);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        message: 'Firebase token has expired, please re-authenticate'
      });
    }
    
    if (error.code === 'auth/invalid-id-token') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Firebase token is invalid'
      });
    }
    
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message: 'Failed to verify Firebase token',
      details: error.message
    });
  }
};

/**
 * Optional Firebase Token Verification
 * Verifies token if present, but doesn't fail if missing
 */
export const optionalFirebaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('⚠️ FIREBASE: No token provided (optional verification)');
      req.user = null;
      return next();
    }
    
    // Use the main verification middleware
    return verifyFirebaseToken(req, res, next);
    
  } catch (error) {
    console.log('⚠️ FIREBASE: Optional token verification failed, continuing without auth');
    req.user = null;
    next();
  }
};

/**
 * Firebase Token Debug Middleware
 * Logs token info without failing
 */
export const debugFirebaseToken = async (req, res, next) => {
  try {
    console.log('🔍 FIREBASE DEBUG: ===== TOKEN DEBUG =====');
    
    const authHeader = req.headers.authorization;
    console.log('🔍 FIREBASE DEBUG: Authorization header present:', !!authHeader);
    
    if (authHeader) {
      console.log('🔍 FIREBASE DEBUG: Header starts with Bearer:', authHeader.startsWith('Bearer '));
      
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.split('Bearer ')[1];
        console.log('🔍 FIREBASE DEBUG: Token length:', token.length);
        console.log('🔍 FIREBASE DEBUG: Token preview: [REDACTED]');
        
        // Try to verify without failing
        try {
          const admin = initializeFirebase();
          const decodedToken = await admin.auth().verifyIdToken(token);
          
          console.log('✅ FIREBASE DEBUG: Token is valid');
          console.log('✅ FIREBASE DEBUG: User ID:', decodedToken.uid);
          console.log('✅ FIREBASE DEBUG: Email:', decodedToken.email);
          
          req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            emailVerified: decodedToken.email_verified,
            name: decodedToken.name,
            picture: decodedToken.picture,
            firebaseToken: token
          };
          
        } catch (verifyError) {
          console.log('❌ FIREBASE DEBUG: Token verification failed:', verifyError.message);
          req.user = null;
        }
      }
    } else {
      console.log('⚠️ FIREBASE DEBUG: No authorization header');
      req.user = null;
    }
    
    console.log('🔍 FIREBASE DEBUG: ===== END DEBUG =====');
    next();
    
  } catch (error) {
    console.error('❌ FIREBASE DEBUG: Debug middleware error:', error.message);
    req.user = null;
    next();
  }
};

export default {
  verifyFirebaseToken,
  optionalFirebaseToken,
  debugFirebaseToken,
  initializeFirebase
};

