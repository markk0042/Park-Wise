import { createContext, useContext, useEffect, useMemo, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { fetchCurrentUser } from '@/api';

const AuthContext = createContext(null);

// Inactivity timeout: 60 minutes (3600000 ms)
const INACTIVITY_TIMEOUT = 60 * 60 * 1000;

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const inactivityTimerRef = useRef(null);

  // Set up activity listeners and inactivity timer
  useEffect(() => {
    if (!session || !profile) {
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
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
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

      // Set timer for auto-logout after 60 minutes of inactivity
      inactivityTimerRef.current = setTimeout(() => {
        handleAutoLogout();
      }, INACTIVITY_TIMEOUT);
    };

    // Reset timer on user activity
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
  }, [session, profile]);

  useEffect(() => {
    const init = async () => {
      // Check if this is a password reset flow (recovery session)
      const hash = window.location.hash;
      const isPasswordReset = hash && hash.includes('type=recovery');
      
      // Force users to sign in - clear any existing session on app load
      // BUT preserve recovery sessions for password reset
      try {
        const { data } = await supabase.auth.getSession();
        
        if (data.session && !isPasswordReset) {
          console.log('🔒 Clearing existing session - user must sign in');
          // Set session to null first to prevent API calls
          setSession(null);
          setProfile(null);
          // Then sign out
          await supabase.auth.signOut();
        } else if (isPasswordReset) {
          console.log('🔐 Password reset flow detected - preserving recovery session');
          // Don't clear the session if it's a password reset
          setIsPasswordRecovery(true);
          setSession(data.session);
        } else {
          setSession(null);
          setProfile(null);
          setIsPasswordRecovery(false);
        }
      } catch (err) {
        console.error('Error during session initialization:', err);
        setSession(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    init();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      // Check if this is a password reset flow
      const hash = window.location.hash;
      const isPasswordReset = hash && hash.includes('type=recovery');
      
      // When user signs in, set the session and start the timer
      if (event === 'SIGNED_IN' && newSession) {
        console.log('✅ User signed in - starting inactivity timer');
        setSession(newSession);
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out');
        setSession(null);
        // Clear any timers
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
          inactivityTimerRef.current = null;
        }
      } else if (event === 'PASSWORD_RECOVERY' || (newSession && isPasswordReset)) {
        // Preserve recovery sessions for password reset
        console.log('🔐 Password recovery session detected');
        setIsPasswordRecovery(true);
        setSession(newSession);
      } else {
        setSession(newSession);
        // Clear recovery flag on other auth events
        if (event !== 'TOKEN_REFRESHED') {
          setIsPasswordRecovery(false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      if (!session) {
        setProfile(null);
        setError(null);
        setLoading(false);
        return;
      }
      
      // Don't load profile during password recovery - it's not needed and might cause redirects
      if (isPasswordRecovery) {
        console.log('🔐 Skipping profile load during password recovery');
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
          setSession(null);
          setProfile(null);
          setIsPasswordRecovery(false);
          await supabase.auth.signOut();
        } else {
          setError(err);
          setProfile(null);
        }
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [session, isPasswordRecovery]);

  const value = useMemo(
    () => ({
      session,
      profile,
      loading,
      error,
      isAuthenticated: Boolean(session && profile && !isPasswordRecovery),
      isPasswordRecovery,
      signOut: () => supabase.auth.signOut(),
      signInWithPassword: async (email, password) => {
        console.log('🔐 Signing in with email and password');
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) {
          throw error;
        }
        
        return data;
      },
      resetPassword: async (email) => {
        console.log('🔐 Requesting password reset for:', email);
        // Use the current origin for redirects (works for both localhost and production)
        const redirectUrl = window.location.origin;
        
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${redirectUrl}`,
        });
        
        if (error) {
          throw error;
        }
        
        return data;
      },
    }),
    [session, profile, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
