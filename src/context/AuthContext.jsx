import { createContext, useContext, useEffect, useMemo, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { fetchCurrentUser } from '@/api';

const AuthContext = createContext(null);

// Inactivity timeout: 60 minutes (3600000 ms)
const INACTIVITY_TIMEOUT = 60 * 60 * 1000;

export function AuthProvider({ children }) {
  // Check for password recovery immediately (synchronously) before any state
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  const isRecoveryHash = hash && hash.includes('type=recovery');
  
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(isRecoveryHash);
  const inactivityTimerRef = useRef(null);
  
  console.log('🔍 [AuthContext] Initial state:', { isRecoveryHash, isPasswordRecovery, hash: hash ? 'Hash found' : 'No hash' });

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
      
      console.log('🔍 [AuthContext init] Starting initialization:', { isPasswordReset, hasHash: !!hash });
      
      // Force users to sign in - clear any existing session on app load
      // BUT preserve recovery sessions for password reset
      try {
        const { data } = await supabase.auth.getSession();
        
        if (isPasswordReset) {
          console.log('🔐 [AuthContext init] Password reset flow detected - setting recovery mode');
          // Set recovery flag immediately (should already be set from initial state, but ensure it)
          setIsPasswordRecovery(true);
          // Don't clear the session if it's a password reset - we need it for password update
          if (data.session) {
            console.log('🔐 [AuthContext init] Recovery session found - keeping session but blocking profile');
            setSession(data.session);
            // CRITICAL: Explicitly don't load profile during recovery - this prevents auto-login
            setProfile(null);
          } else {
            console.log('⚠️ [AuthContext init] Recovery hash detected but no session yet');
            setSession(null);
            setProfile(null);
          }
        } else if (data.session) {
          console.log('🔒 [AuthContext init] Clearing existing session - user must sign in');
          // Set session to null first to prevent API calls
          setSession(null);
          setProfile(null);
          setIsPasswordRecovery(false);
          // Then sign out
          await supabase.auth.signOut();
        } else {
          setSession(null);
          setProfile(null);
          setIsPasswordRecovery(false);
        }
      } catch (err) {
        console.error('❌ [AuthContext init] Error during session initialization:', err);
        setSession(null);
        setProfile(null);
        if (!isPasswordReset) {
          setIsPasswordRecovery(false);
        }
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
      
      // When user signs in, check if it's a recovery session first
      if (event === 'SIGNED_IN' && newSession) {
        if (isPasswordReset) {
          // This is a recovery sign-in, treat it differently - BLOCK normal auth flow
          console.log('🔐 [onAuthStateChange] Recovery SIGNED_IN detected - BLOCKING normal auth flow');
          setIsPasswordRecovery(true);
          setProfile(null); // CRITICAL: Never load profile during recovery
          setSession(newSession);
          return; // Exit early - don't proceed with normal sign-in
        }
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
        console.log('🔐 [onAuthStateChange] Password recovery session detected');
        // Set recovery flag FIRST, then session, and explicitly clear profile
        setIsPasswordRecovery(true);
        setProfile(null); // Explicitly clear profile to prevent redirects
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
      // Check hash directly as well, not just the flag
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      const hasRecoveryHash = hash && hash.includes('type=recovery');
      const inRecovery = isPasswordRecovery || hasRecoveryHash;
      
      if (!session) {
        setProfile(null);
        setError(null);
        // Only set loading to false if we're not in recovery mode
        // During recovery, we want to keep loading false so the Login page shows
        if (!inRecovery) {
          setLoading(false);
        }
        return;
      }
      
      // CRITICAL: Never load profile during password recovery - this prevents auto-login
      if (inRecovery) {
        console.log('🔐 [loadProfile] BLOCKING profile load during password recovery (hash or flag detected)');
        setProfile(null); // Explicitly ensure profile is null
        setLoading(false);
        // Don't return early - we want to make sure profile stays null
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
    () => {
      // Check hash directly in the memoized value - this ensures isAuthenticated is always false during recovery
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      const hasRecoveryHash = hash && hash.includes('type=recovery');
      const inRecovery = isPasswordRecovery || hasRecoveryHash;
      
      return {
        session,
        profile,
        loading,
        error,
        // CRITICAL: During password recovery, NEVER consider user authenticated
        // Check both flag AND hash directly to be absolutely sure
        isAuthenticated: inRecovery ? false : Boolean(session && profile),
        isPasswordRecovery: inRecovery,
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
