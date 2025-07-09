import admin from '../config/firebaseAdminConfig.js';

export const authenticateFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ 
      message: 'No authorization header', 
      error: 'Unauthorized' 
    });
  }

  const token = authHeader.split('Bearer ')[1];

  if (!token) {
    return res.status(401).json({ 
      message: 'Invalid authorization header format', 
      error: 'Unauthorized' 
    });
  }

  try {
    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Attach user information to the request
    req.user = decodedToken;
    
    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    console.error('Firebase token verification error:', error);
    
    // Handle different types of token verification errors
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ 
        message: 'Firebase ID token has expired', 
        error: 'Token Expired' 
      });
    }
    
    return res.status(403).json({ 
      message: 'Invalid or revoked Firebase ID token', 
      error: 'Forbidden' 
    });
  }
};
