import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  signOut
} from 'firebase/auth';

// Firebase configuration from .env
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Authentication
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Set additional Google provider settings
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Authentication Helper Functions
const firebaseAuthMethods = {
  // Google Sign In
  signInWithGoogle: async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error('Google Sign In Error:', error);
      throw error;Fixed
    }
  },

  // Sign out
  signOut: async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Firebase Signout Error:', error);
      throw error;
    }
  }
};

export { 
  app, 
  auth, 
  googleProvider, 
  firebaseAuthMethods 
};
