import { createContext, useContext, useEffect, useMemo, useState, useRef } from 'react';
import { fetchCurrentUser, login as apiLogin, requestPasswordReset as apiRequestPasswordReset, resetPassword as apiResetPassword } from '@/api';
import { setAuthToken } from '@/api/httpClient';

const AuthContext = createContext(null);

// Inactivity timeout: 60 minutes (3600000 ms)
const INACTIVITY_TIMEOUT = 60 * 60 * 1000;

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const inactivityTimerRef = useRef(null);

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      setToken(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  // Set up activity listeners and inactivity timer
  useEffect(() => {
    if (!token || !profile) {
      // Clear timer if not authenticated
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      return;
    }

    // Function to handle auto-logout
    const handleAutoLogout = async () => {
      try {
        console.log('⏰ Inactivity timeout reached (60 minutes). Logging out...');
        setToken(null);
        setProfile(null);
        setAuthToken(null);
        // Clear any remaining timers
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
          inactivityTimerRef.current = null;
        }
      } catch (err) {
        console.error('Error during auto-logout:', err);
      }
    };

    // Function to reset inactivity timer
    const resetInactivityTimer = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      inactivityTimerRef.current = setTimeout(handleAutoLogout, INACTIVITY_TIMEOUT);
    };

    // List of events that indicate user activity
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      resetInactivityTimer();
    };

    // Add event listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, true);
    });

    // Initialize timer immediately when user is authenticated
    console.log('⏱️ Starting inactivity timer (60 minutes)');
    resetInactivityTimer();

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity, true);
      });
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };
  }, [token, profile]);

  // Load profile when token changes
  useEffect(() => {
    const loadProfile = async () => {
      if (!token) {
        setProfile(null);
        setError(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const user = await fetchCurrentUser();
        setProfile(user);
        setError(null);
      } catch (err) {
        // Handle 401 errors gracefully (session expired or invalid)
        if (err?.status === 401 || err?.message?.includes('401') || err?.message?.includes('Unauthorized')) {
          console.log('🔒 Session expired or invalid - clearing session');
          // Store session expiration reason for Login page to display
          sessionStorage.setItem('session_expired', 'true');
          setToken(null);
          setProfile(null);
          setAuthToken(null);
        } else {
          setError(err);
          setProfile(null);
        }
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      profile,
      loading,
      error,
      isAuthenticated: Boolean(token && profile),
      signOut: () => {
        setToken(null);
        setProfile(null);
        setAuthToken(null);
      },
      signInWithPassword: async (email, password) => {
        console.log('🔐 Signing in with email and password');
        const { user, token: newToken } = await apiLogin(email, password);
        
        // Store token
        setAuthToken(newToken);
        setToken(newToken);
        setProfile(user);
        
        return { user, token: newToken };
      },
      resetPassword: async (email) => {
        console.log('🔐 Requesting password reset for:', email);
        const result = await apiRequestPasswordReset(email);
        return result;
      },
      resetPasswordWithToken: async (token, password) => {
        console.log('🔐 Resetting password with token');
        const result = await apiResetPassword(token, password);
        return result;
      },
    }),
    [token, profile, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
