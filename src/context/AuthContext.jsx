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

    // Initialize timer
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
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    };
    init();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
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
      try {
        setLoading(true);
        const user = await fetchCurrentUser();
        setProfile(user);
        setError(null);
      } catch (err) {
        setError(err);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [session]);

  const value = useMemo(
    () => ({
      session,
      profile,
      loading,
      error,
      isAuthenticated: Boolean(session && profile),
      signOut: () => supabase.auth.signOut(),
      signInWithOtp: (email) => {
        // Always use the Vercel URL for redirects
        const redirectUrl = 'https://park-wise-two.vercel.app';
        console.log('🔐 Requesting magic link with redirect:', redirectUrl);
        
        return supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectUrl,
          },
        });
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
