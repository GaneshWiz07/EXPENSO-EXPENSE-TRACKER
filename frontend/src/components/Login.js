import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/AuthForm.css';

const Login = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the return path from location state, default to dashboard
  const from = location.state?.from || '/dashboard';

  useEffect(() => {
    // If user is already logged in, redirect them
    if (currentUser) {
      navigate(from);
    }
  }, [currentUser, navigate, from]);

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setLoading(true);
      await signInWithGoogle();
      navigate(from);
    } catch (err) {
      console.error('Google sign in error:', err);
      
      // Better error handling
      let errorMessage = 'Failed to sign in with Google.';
      if (err.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in was cancelled. Please try again.';
      } else if (err.code === 'auth/popup-blocked') {
        errorMessage = 'Pop-up was blocked. Please allow pop-ups and try again.';
      } else if (err.code === 'auth/auth-domain-config-required') {
        errorMessage = 'Authentication configuration error. Please contact support.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <img src="/logo.svg" alt="EXPENSO" className="auth-logo-img" />
            <h1>EXPENSO</h1>
          </div>
          <h2>Welcome Back</h2>
          <p>Sign in to continue tracking your expenses with AI-powered insights</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="auth-form">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="google-button"
            disabled={loading}
          >
            <img 
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
              alt="Google"
              className="google-icon"
            />
            {loading ? 'Signing in...' : 'Continue with Google'}
          </button>

          <div className="auth-info">
            <p>✨ Track expenses with AI insights</p>
            <p>📊 Beautiful analytics and reports</p>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
