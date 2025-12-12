import { createContext, useContext, useEffect, useMemo, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { fetchCurrentUser } from '@/api';
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

  // Load session from Supabase on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        // Check if we're in password recovery mode first
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const isRecovery = hashParams.get('type') === 'recovery';
        
        if (isRecovery) {
          console.log('🔐 Password recovery mode detected - skipping auto-login');
          setLoading(false);
          return;
        }
        
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session) {
          setToken(session.access_token);
          setAuthToken(session.access_token);
        }
        if (error) {
          console.error('Error loading session:', error);
        }
      } catch (err) {
        console.error('Error getting session:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state changed:', event, 'Has session:', !!session);
      
      // Check if we're in password recovery mode
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const isRecovery = hashParams.get('type') === 'recovery';
      
      if (isRecovery && event === 'PASSWORD_RECOVERY') {
        console.log('🔐 Password recovery detected - keeping user on login page');
        // Don't set token/profile during recovery - let user complete password reset first
        setLoading(false);
        return;
      }
      
      if (session) {
        setToken(session.access_token);
        setAuthToken(session.access_token);
      } else {
        setToken(null);
        setProfile(null);
        setAuthToken(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
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
      // Don't load profile if we're in recovery mode
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const isRecovery = hashParams.get('type') === 'recovery';
      
      if (isRecovery) {
        console.log('🔐 In recovery mode - skipping profile load');
        setLoading(false);
        return;
      }
      
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
      signOut: async () => {
        await supabase.auth.signOut();
        setToken(null);
        setProfile(null);
        setAuthToken(null);
      },
      signInWithPassword: async (email, password) => {
        console.log('🔐 Signing in with Supabase Auth');
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw new Error(error.message || 'Invalid email or password');
        }

        if (data.session) {
          setToken(data.session.access_token);
          setAuthToken(data.session.access_token);
          // Load profile after successful login
          try {
            const user = await fetchCurrentUser();
            setProfile(user);
          } catch (err) {
            console.error('Error loading profile:', err);
          }
        }

        return { user: data.user, token: data.session?.access_token };
      },
      resetPassword: async (email) => {
        console.log('🔐 Requesting password reset via Supabase');
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login?type=recovery`,
        });

        if (error) {
          throw new Error(error.message || 'Failed to send password reset email');
        }

        return { message: 'Password reset email sent. Please check your inbox.' };
      },
      resetPasswordWithToken: async (newPassword) => {
        console.log('🔐 Resetting password with Supabase');
        const { data, error } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (error) {
          throw new Error(error.message || 'Failed to reset password');
        }

        return { message: 'Password updated successfully' };
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
