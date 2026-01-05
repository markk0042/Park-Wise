import { createContext, useContext, useEffect, useMemo, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { fetchCurrentUser, check2FAStatus, verify2FALogin } from '@/api';
import { setAuthToken } from '@/api/httpClient';

const AuthContext = createContext(null);

// Inactivity timeout: 60 minutes (3600000 ms)
const INACTIVITY_TIMEOUT = 60 * 60 * 1000;

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requires2FA, setRequires2FA] = useState(false);
  const [pending2FAUserId, setPending2FAUserId] = useState(null);
  const [twoFactorStatus, setTwoFactorStatus] = useState(null); // Store 2FA status
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
        
        // Check for refresh token errors
        if (error) {
          const errorMessage = error?.message || '';
          const isRefreshTokenError = errorMessage.includes('Invalid Refresh Token') || 
                                     errorMessage.includes('Refresh Token Not Found') ||
                                     errorMessage.includes('refresh_token_not_found');
          
          if (isRefreshTokenError) {
            console.log('🔐 Invalid refresh token detected - clearing session');
            // Clear any stale state on refresh token error
            setToken(null);
            setProfile(null);
            setAuthToken(null);
            await supabase.auth.signOut();
            // Store session expiration reason for Login page to display
            sessionStorage.setItem('session_expired', 'true');
            setLoading(false);
            return;
          }
          
          console.error('Error loading session:', error);
          // Clear any stale state on other errors
          setToken(null);
          setProfile(null);
          setAuthToken(null);
        }
        
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
            // Check for refresh token errors in verifyError too
            const errorMessage = verifyError?.message || '';
            const isRefreshTokenError = errorMessage.includes('Invalid Refresh Token') || 
                                       errorMessage.includes('Refresh Token Not Found') ||
                                       errorMessage.includes('refresh_token_not_found');
            
            if (isRefreshTokenError) {
              console.log('🔐 Invalid refresh token during verification - clearing session');
              sessionStorage.setItem('session_expired', 'true');
            }
            
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
      } catch (err) {
        console.error('Error getting session:', err);
        // Check for refresh token errors in the catch block too
        const errorMessage = err?.message || '';
        const isRefreshTokenError = errorMessage.includes('Invalid Refresh Token') || 
                                   errorMessage.includes('Refresh Token Not Found') ||
                                   errorMessage.includes('refresh_token_not_found');
        
        if (isRefreshTokenError) {
          console.log('🔐 Invalid refresh token in catch block - clearing session');
          setToken(null);
          setProfile(null);
          setAuthToken(null);
          await supabase.auth.signOut();
          sessionStorage.setItem('session_expired', 'true');
        }
      } finally {
        if (!isResetPasswordPage) {
          setLoading(false);
        }
      }
    };

    loadSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
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
              // Backend returned no user - only clear if it's an auth error
              // Don't clear on network errors to prevent loops
              console.log('🔐 Backend returned no user - will retry via useEffect');
              // Don't sign out immediately - let useEffect handle retry
              // This prevents infinite loops when backend is temporarily unavailable
            }
          } catch (err) {
            console.error('Error syncing with backend:', err);
            // Only clear session on authentication errors (401/403)
            // Don't clear on network errors, timeouts, or 500 errors
            if (err?.status === 401 || err?.status === 403 || 
                err?.message?.includes('401') || err?.message?.includes('403') || 
                err?.message?.includes('Unauthorized') || err?.message?.includes('Forbidden')) {
              console.log('🔐 Backend authentication failed - clearing session');
              setToken(null);
              setProfile(null);
              setAuthToken(null);
              await supabase.auth.signOut();
            } else {
              // Other errors (network, timeout, 500) - don't sign out
              // Profile will be loaded by useEffect, which will retry
              console.log('🔐 Backend sync failed (non-auth error) - will retry via useEffect');
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
      } catch (err) {
        console.error('Error in auth state change handler:', err);
        // Check for refresh token errors
        const errorMessage = err?.message || '';
        const isRefreshTokenError = errorMessage.includes('Invalid Refresh Token') || 
                                   errorMessage.includes('Refresh Token Not Found') ||
                                   errorMessage.includes('refresh_token_not_found');
        
        if (isRefreshTokenError) {
          console.log('🔐 Invalid refresh token in auth state change - clearing session');
          setToken(null);
          setProfile(null);
          setAuthToken(null);
          await supabase.auth.signOut();
          sessionStorage.setItem('session_expired', 'true');
        }
        setLoading(false);
      }
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
        // Only clear session on authentication errors (401/403)
        // Don't clear session on network errors or server errors (500, timeout, etc.)
        // This prevents infinite loops when backend is temporarily unavailable
        if (err?.status === 401 || err?.status === 403 || 
            err?.message?.includes('401') || err?.message?.includes('403') || 
            err?.message?.includes('Unauthorized') || err?.message?.includes('Forbidden')) {
          console.log('🔒 Session expired or invalid - clearing session');
          // Store session expiration reason for Login page to display
          sessionStorage.setItem('session_expired', 'true');
          setToken(null);
          setProfile(null);
          setAuthToken(null);
          // Sign out from Supabase as well
          await supabase.auth.signOut();
        } else {
          // For network errors, timeouts, 500 errors, etc. - don't sign out
          // Just set error state and let user retry or wait
          console.log('🔒 Profile fetch failed (non-auth error) - keeping session, showing error');
          setError(err);
          // Don't clear token/profile - keep the session alive
          // The user can retry or the app will retry on next token refresh
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
      requires2FA,
      pending2FAUserId,
      twoFactorStatus, // Expose 2FA status
      isAuthenticated: Boolean(token && profile && !requires2FA),
      refreshProfile: async () => {
        if (!token) return;
        try {
          const user = await fetchCurrentUser();
          if (user) {
            setProfile(user);
          }
        } catch (err) {
          console.error('Error refreshing profile:', err);
        }
      },
      signOut: async () => {
        await supabase.auth.signOut();
        setToken(null);
        setProfile(null);
        setAuthToken(null);
      },
      signInWithPassword: async (email, password) => {
        console.log('🔐 Signing in with Supabase Auth');
        console.log('🔐 Email:', email);
        console.log('🔐 Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
        
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(), // Normalize email
            password,
          });

          if (error) {
            console.error('🔐 Supabase login error:', {
              message: error.message,
              status: error.status,
              name: error.name,
              fullError: error
            });
            
            // Provide more specific error messages
            let errorMessage = 'Invalid email or password';
            
            if (error.message) {
              const lowerMessage = error.message.toLowerCase();
              
              if (lowerMessage.includes('invalid login credentials') || 
                  lowerMessage.includes('invalid password') ||
                  lowerMessage.includes('email not found')) {
                errorMessage = 'Invalid email or password. Please check your credentials and try again.';
              } else if (lowerMessage.includes('email not confirmed') || 
                         lowerMessage.includes('email not verified')) {
                errorMessage = 'Please verify your email address before signing in. Check your inbox for a confirmation email.';
              } else if (lowerMessage.includes('user not found')) {
                errorMessage = 'No account found with this email address.';
              } else if (lowerMessage.includes('too many requests') || 
                         lowerMessage.includes('rate limit')) {
                errorMessage = 'Too many login attempts. Please wait a few minutes and try again.';
              } else if (lowerMessage.includes('disabled') || 
                         lowerMessage.includes('banned')) {
                errorMessage = 'This account has been disabled. Please contact support.';
              } else {
                // Show the actual error message from Supabase
                errorMessage = error.message;
              }
            }
            
            throw new Error(errorMessage);
          }
          
          console.log('🔐 Login successful, session created');
          
          if (data.session) {
            // Set temporary token to check 2FA status
            setToken(data.session.access_token);
            setAuthToken(data.session.access_token);
            
            // Sync with backend to get user profile
            try {
              console.log('🔄 Syncing user with backend after login...');
              const user = await fetchCurrentUser();
              
              // Check if 2FA is required (non-admin users only)
              if (user.role !== 'admin') {
                try {
                  const twoFactorStatusResult = await check2FAStatus();
                  setTwoFactorStatus(twoFactorStatusResult);
                  
                  // For non-admin users, 2FA is MANDATORY
                  // If not enabled, they need to set it up (handled by routing)
                  if (twoFactorStatusResult.enabled) {
                    console.log('🔐 2FA is enabled for this user - verification required');
                    // Store user ID for 2FA verification
                    setPending2FAUserId(user.id);
                    setRequires2FA(true);
                    // Don't set profile yet - wait for 2FA verification
                    return { 
                      user: data.user, 
                      session: data.session,
                      requires2FA: true,
                      userId: user.id,
                    };
                  } else {
                    // 2FA is mandatory but not enabled - user needs to set it up
                    // This will be handled by the routing logic
                    console.log('🔐 2FA is mandatory but not enabled - user must set it up');
                  }
                } catch (twoFactorError) {
                  console.error('Error checking 2FA status:', twoFactorError);
                  // If 2FA check fails, continue with normal login for now
                  // But non-admin users should still be redirected to setup
                }
              } else {
                // Admin users - 2FA is optional, set status to reflect this
                setTwoFactorStatus({ enabled: false, required: false, isAdmin: true });
              }
              
              // No 2FA required, complete login
              setProfile(user);
              setRequires2FA(false);
              setPending2FAUserId(null);
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
        } catch (err) {
          // Re-throw the error so it can be caught by the Login component
          throw err;
        }

        if (data.session) {
          // Set temporary token to check 2FA status
          setToken(data.session.access_token);
          setAuthToken(data.session.access_token);
          
          // Sync with backend to get user profile
          try {
            console.log('🔄 Syncing user with backend after login...');
            const user = await fetchCurrentUser();
            
            // Check if 2FA is required (non-admin users only)
            if (user.role !== 'admin') {
              try {
                const twoFactorStatusResult = await check2FAStatus();
                setTwoFactorStatus(twoFactorStatusResult);
                
                // For non-admin users, 2FA is MANDATORY
                // If not enabled, they need to set it up (handled by routing)
                if (twoFactorStatusResult.enabled) {
                  console.log('🔐 2FA is enabled for this user - verification required');
                  // Store user ID for 2FA verification
                  setPending2FAUserId(user.id);
                  setRequires2FA(true);
                  // Don't set profile yet - wait for 2FA verification
                  return { 
                    user: data.user, 
                    session: data.session,
                    requires2FA: true,
                    userId: user.id,
                  };
                } else {
                  // 2FA is mandatory but not enabled - user needs to set it up
                  // This will be handled by the routing logic
                  console.log('🔐 2FA is mandatory but not enabled - user must set it up');
                }
              } catch (twoFactorError) {
                console.error('Error checking 2FA status:', twoFactorError);
                // If 2FA check fails, continue with normal login for now
                // But non-admin users should still be redirected to setup
              }
            } else {
              // Admin users - 2FA is optional, set status to reflect this
              setTwoFactorStatus({ enabled: false, required: false, isAdmin: true });
            }
            
            // No 2FA required, complete login
            setProfile(user);
            setRequires2FA(false);
            setPending2FAUserId(null);
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
      verify2FA: async (code) => {
        if (!pending2FAUserId) {
          throw new Error('No pending 2FA verification');
        }

        console.log('🔐 Verifying 2FA code...');
        const result = await verify2FALogin(pending2FAUserId, code);
        
        if (result.verified) {
          // 2FA verified, complete login
          const user = await fetchCurrentUser();
          setProfile(user);
          setRequires2FA(false);
          setPending2FAUserId(null);
          return { verified: true };
        } else {
          throw new Error('Invalid 2FA code');
        }
      },
      cancel2FA: () => {
        // Cancel 2FA and sign out
        setRequires2FA(false);
        setPending2FAUserId(null);
        setToken(null);
        setProfile(null);
        setAuthToken(null);
        supabase.auth.signOut();
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
