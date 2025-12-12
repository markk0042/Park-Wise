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

  // Load session from Supabase on mount and listen for auth changes
  useEffect(() => {
    // Check if we're on the reset password page - don't auto-login there
    const isResetPasswordPage = window.location.pathname === '/auth/reset-password';
    
    const loadSession = async () => {
      try {
        if (isResetPasswordPage) {
          console.log('🔐 On reset password page - skipping auto-login');
          setLoading(false);
          return;
        }
        
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session) {
          console.log('🔐 Found existing Supabase session');
          // Verify the session is still valid by checking if we can get user info
          try {
            const { data: { user }, error: userError } = await supabase.auth.getUser(session.access_token);
            if (userError || !user) {
              console.log('🔐 Session is invalid, clearing...');
              await supabase.auth.signOut();
              setToken(null);
              setProfile(null);
              setAuthToken(null);
              setLoading(false);
              return;
            }
            // Session is valid, but we still need to verify with backend
            // Don't set token yet - let the profile load verify it
            console.log('🔐 Session found, will verify with backend...');
          } catch (verifyError) {
            console.error('Error verifying session:', verifyError);
            // If we can't verify, clear the session
            await supabase.auth.signOut();
            setToken(null);
            setProfile(null);
            setAuthToken(null);
            setLoading(false);
            return;
          }
        } else {
          // No session found, ensure we're signed out
          console.log('🔐 No session found');
          setToken(null);
          setProfile(null);
          setAuthToken(null);
        }
        if (error) {
          console.error('Error loading session:', error);
          // Clear any stale state on error
          setToken(null);
          setProfile(null);
          setAuthToken(null);
        }
      } catch (err) {
        console.error('Error getting session:', err);
      } finally {
        if (!isResetPasswordPage) {
          setLoading(false);
        }
      }
    };

    loadSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state changed:', event, 'Has session:', !!session);
      
      // CRITICAL: Don't auto-login if we're on the reset password page
      // But allow the reset password page to handle its own session management
      const currentPath = window.location.pathname;
      if (currentPath === '/auth/reset-password') {
        console.log('🔐 On reset password page - letting page handle session');
        // Don't interfere with the reset password page's session management
        // The page will handle signing out and setting sessions itself
        // Ignore ALL events on reset password page - let the page component handle everything
        return;
      }
      
      // Also ignore SIGNED_IN events right after password reset (prevent auto-login)
      // Check if we just came from password reset by checking sessionStorage
      // Only ignore if we're still on the reset password page
      const currentPath = window.location.pathname;
      if (event === 'SIGNED_IN' && sessionStorage.getItem('password_reset_complete') && currentPath === '/auth/reset-password') {
        console.log('🔐 Ignoring SIGNED_IN after password reset (still on reset page) - forcing logout');
        sessionStorage.removeItem('password_reset_complete');
        await supabase.auth.signOut();
        return;
      }
      
      // If we're on login page and password reset was complete, clear the flag
      // This allows legitimate login after password reset
      if (currentPath === '/login' && sessionStorage.getItem('password_reset_complete')) {
        console.log('🔐 On login page after password reset - clearing flag to allow login');
        sessionStorage.removeItem('password_reset_complete');
      }
      
      if (session) {
        setToken(session.access_token);
        setAuthToken(session.access_token);
        
        // Sync with backend when user logs in or token is refreshed
        // Only sync on SIGNED_IN to prevent duplicate calls (TOKEN_REFRESHED will be handled by useEffect)
        if (event === 'SIGNED_IN') {
          try {
            console.log('🔄 Syncing user with backend after login...');
            const user = await fetchCurrentUser();
            if (user) {
              setProfile(user);
            } else {
              // Backend returned no user - clear session
              console.log('🔐 Backend returned no user - clearing session');
              setToken(null);
              setProfile(null);
              setAuthToken(null);
              await supabase.auth.signOut();
            }
          } catch (err) {
            console.error('Error syncing with backend:', err);
            // If backend fails (401, etc.), clear session
            if (err?.status === 401 || err?.message?.includes('401') || err?.message?.includes('Unauthorized')) {
              console.log('🔐 Backend authentication failed - clearing session');
              setToken(null);
              setProfile(null);
              setAuthToken(null);
              await supabase.auth.signOut();
            } else {
              // Other errors - profile will be loaded by useEffect
            }
          }
        } else if (event === 'TOKEN_REFRESHED') {
          // Token refreshed - just update the token, profile will be reloaded by useEffect if needed
          console.log('🔐 Token refreshed');
        }
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

  // Load profile when token changes (sync with backend)
  // Only load if profile is not already set (to prevent duplicate calls)
  useEffect(() => {
    const loadProfile = async () => {
      if (!token) {
        setProfile(null);
        setError(null);
        setLoading(false);
        return;
      }

      // If profile is already loaded and matches the token, skip
      if (profile && profile.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Fetch profile from backend (which syncs with Supabase)
        const user = await fetchCurrentUser();
        if (!user) {
          throw new Error('No user data returned');
        }
        setProfile(user);
        setError(null);
      } catch (err) {
        console.error('Error loading profile:', err);
        // Handle 401 errors gracefully (session expired or invalid)
        if (err?.status === 401 || err?.message?.includes('401') || err?.message?.includes('Unauthorized')) {
          console.log('🔒 Session expired or invalid - clearing session');
          // Store session expiration reason for Login page to display
          sessionStorage.setItem('session_expired', 'true');
          setToken(null);
          setProfile(null);
          setAuthToken(null);
          // Sign out from Supabase as well
          await supabase.auth.signOut();
        } else {
          // If profile fetch fails for other reasons, clear session
          console.log('🔒 Profile fetch failed - clearing session');
          setError(err);
          setProfile(null);
          setToken(null);
          setAuthToken(null);
          await supabase.auth.signOut();
        }
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [token]); // Only depend on token, not profile

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
          
          // Sync with backend after successful login
          try {
            console.log('🔄 Syncing user with backend after login...');
            const user = await fetchCurrentUser();
            setProfile(user);
          } catch (err) {
            console.error('Error syncing with backend:', err);
            // If backend sync fails, still allow login with Supabase data
            if (data.user) {
              setProfile({
                id: data.user.id,
                email: data.user.email,
                full_name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0],
                role: 'user', // Default, will be updated when backend syncs
                status: 'approved', // Default, will be updated when backend syncs
              });
            }
          }
        }

        return { user: data.user, session: data.session };
      },
      resetPassword: async (email) => {
        console.log('🔐 Requesting password reset via Supabase');
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });

        if (error) {
          throw new Error(error.message || 'Failed to send password reset email');
        }

        return { message: 'Password reset email sent. Please check your inbox.' };
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
