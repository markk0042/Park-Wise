"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { KeyRound, Shield } from "lucide-react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryTokens, setRecoveryTokens] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [status, setStatus] = useState({ type: null, message: "" });
  const [passwordUpdateSuccess, setPasswordUpdateSuccess] = useState(false);
  const navigate = useNavigate();

  // Listen for USER_UPDATED event to know when password is successfully updated
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'USER_UPDATED' && isUpdating) {
        console.log('✅ Password update confirmed via USER_UPDATED event');
        setPasswordUpdateSuccess(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isUpdating]);

  useEffect(() => {
    // Extract tokens from URL hash BEFORE doing anything else
    // We need to capture these immediately as they might be cleared
    const hash = window.location.hash;
    console.log('🔐 URL hash:', hash);
    
    if (!hash || hash.length < 2) {
      setStatus({
        type: "error",
        message: "Invalid or expired reset link. Please request a new password reset."
      });
      return;
    }
    
    const params = new URLSearchParams(hash.substring(1)); // Remove the #
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");

    console.log('🔐 Extracted tokens:', { 
      type, 
      hasAccessToken: !!accessToken, 
      hasRefreshToken: !!refreshToken,
      accessTokenLength: accessToken?.length,
      refreshTokenLength: refreshToken?.length
    });

    if (type === "recovery" && accessToken) {
      // Store the tokens for later use
      setRecoveryTokens({
        access_token: accessToken,
        refresh_token: refreshToken,
        type: type
      });
      
      setStatus({
        type: "success",
        message: "Please enter your new password below."
      });

      // IMPORTANT: Clear the hash from URL to prevent auto-login
      // But we've already extracted the tokens, so we're safe
      window.history.replaceState(null, '', window.location.pathname);
      
      // Don't sign out here - let the session be set when we update the password
      // The AuthContext will ignore events on this page anyway
    } else {
      setStatus({
        type: "error",
        message: "Invalid or expired reset link. Please request a new password reset."
      });
    }
  }, []);

  async function handleReset(e) {
    e.preventDefault();
    setIsUpdating(true);
    setStatus({ type: null, message: "" });

    if (!password || !confirmPassword) {
      setStatus({ type: "error", message: "Please enter and confirm your new password" });
      setIsUpdating(false);
      return;
    }

    if (password.length < 6) {
      setStatus({ type: "error", message: "Password must be at least 6 characters long" });
      setIsUpdating(false);
      return;
    }

    if (password !== confirmPassword) {
      setStatus({ type: "error", message: "Passwords do not match" });
      setIsUpdating(false);
      return;
    }

    try {
      // Check if we have recovery tokens stored
      if (!recoveryTokens || !recoveryTokens.access_token) {
        throw new Error("Invalid or expired reset link. Please request a new password reset.");
      }

      console.log('🔐 Setting session with recovery tokens...');
      console.log('🔐 Access token (first 50 chars):', recoveryTokens.access_token.substring(0, 50));
      console.log('🔐 Refresh token:', recoveryTokens.refresh_token || 'NOT PROVIDED');
      
      // IMPORTANT: Supabase requires BOTH access_token and refresh_token for setSession
      // If we don't have refresh_token, we need to get it from the URL hash again
      // or use a different approach
      let refreshToken = recoveryTokens.refresh_token;
      
      // If no refresh token was stored, try to get it from current URL (in case it's still there)
      if (!refreshToken) {
        const currentHash = window.location.hash;
        if (currentHash) {
          const params = new URLSearchParams(currentHash.substring(1));
          refreshToken = params.get("refresh_token");
          console.log('🔐 Retrieved refresh token from URL:', refreshToken ? 'YES' : 'NO');
        }
      }
      
      if (!refreshToken) {
        console.warn('⚠️ No refresh token available - this might cause issues');
      }
      
      // Set the session using the stored recovery tokens
      // This is required for Supabase to allow password update
      const sessionPayload = {
        access_token: recoveryTokens.access_token,
      };
      
      // Only add refresh_token if we have it (Supabase prefers it but might work without)
      if (refreshToken) {
        sessionPayload.refresh_token = refreshToken;
      }
      
      console.log('🔐 Setting session with payload:', {
        hasAccessToken: !!sessionPayload.access_token,
        hasRefreshToken: !!sessionPayload.refresh_token
      });
      console.log('🔐 Calling setSession...');
      
      // Add timeout to prevent hanging
      const sessionPromise = supabase.auth.setSession(sessionPayload);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => {
          console.error('⏱️ Session setup timed out after 10 seconds');
          reject(new Error('Session setup timed out. Please try again.'));
        }, 10000)
      );
      
      let sessionData, sessionError;
      try {
        console.log('🔐 Waiting for setSession response...');
        const result = await Promise.race([sessionPromise, timeoutPromise]);
        console.log('🔐 setSession response received:', {
          hasData: !!result.data,
          hasError: !!result.error,
          hasSession: !!result.data?.session
        });
        sessionData = result.data;
        sessionError = result.error;
      } catch (err) {
        console.error('🔐 setSession error caught:', err);
        if (err.message?.includes('timed out')) {
          throw err;
        }
        // If it's an error from setSession, extract it
        if (err.error) {
          sessionError = err.error;
        } else if (err.message) {
          throw err;
        } else {
          throw new Error('Failed to set session. Please try again.');
        }
      }
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        console.error('❌ Session error details:', {
          message: sessionError.message,
          status: sessionError.status,
          name: sessionError.name
        });
        throw new Error(sessionError.message || "Failed to authenticate reset link. Please request a new password reset.");
      }

      if (!sessionData || !sessionData.session) {
        console.error('❌ No session data returned');
        throw new Error("Failed to create session. Please request a new password reset.");
      }

      console.log('✅ Session created, updating password...');
      console.log('✅ Session user ID:', sessionData.session.user?.id);

      // Update password using Supabase (requires active session)
      console.log('🔐 Calling updateUser...');
      
      // Update password - this will trigger USER_UPDATED event when successful
      const { error: updateError } = await supabase.auth.updateUser({ 
        password: password 
      });
      
      console.log('🔐 updateUser completed:', {
        hasError: !!updateError
      });

      if (updateError) {
        console.error('❌ Password update error:', updateError);
        
        // Provide user-friendly error messages
        let errorMessage = updateError.message || 'Failed to update password. Please try again.';
        
        if (updateError.message?.includes('different from the old password')) {
          errorMessage = 'The new password must be different from your current password. Please choose a different password.';
        } else if (updateError.message?.includes('same as the old password')) {
          errorMessage = 'The new password must be different from your current password. Please choose a different password.';
        } else if (updateError.message?.includes('weak')) {
          errorMessage = 'Password is too weak. Please choose a stronger password.';
        } else if (updateError.message?.includes('expired') || updateError.message?.includes('invalid')) {
          errorMessage = 'This reset link has expired or is invalid. Please request a new password reset.';
        }
        
        throw new Error(errorMessage);
      }

      console.log('✅ Password updated successfully');

      // Stop the loading spinner immediately - don't wait for anything else
      setIsUpdating(false);

      setStatus({
        type: "success",
        message: "Password updated successfully! Redirecting to login..."
      });

      // Sign out (don't await - AuthContext will also handle this on USER_UPDATED)
      supabase.auth.signOut().catch(err => {
        console.warn('Sign out error (non-critical):', err);
      });

      // Call backend to sync password update (fire-and-forget with timeout)
      // This endpoint might not exist, so we use a timeout to prevent hanging
      const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      fetch(`${backendUrl}/auth/sync-password-reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${recoveryTokens.access_token}`,
        },
        body: JSON.stringify({ password_reset: true }),
        signal: controller.signal,
      })
        .then(() => clearTimeout(timeoutId))
        .catch(backendError => {
          clearTimeout(timeoutId);
          // Silently ignore - this endpoint might not exist
        });

      // Redirect to login after showing success message
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      console.error("Password reset error:", err);
      setStatus({
        type: "error",
        message: err.message || "Failed to update password. Please try again."
      });
      setIsUpdating(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-2 border-slate-200">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4">
            <KeyRound className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            Reset Your Password
          </CardTitle>
        </CardHeader>
        <form onSubmit={handleReset}>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600 text-center">
              Enter your new password below. Make sure it's at least 6 characters long.
            </p>
            {status.type === "success" && recoveryTokens && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-xs text-blue-800">
                  <strong>Note:</strong> You may see a browser warning about Supabase redirecting you. This is normal and secure - Supabase verifies your reset link before bringing you here.
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-slate-700">
                New Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your new password"
                required
                className="h-11 text-base"
                autoComplete="new-password"
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-700">
                Confirm New Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                required
                className="h-11 text-base"
                autoComplete="new-password"
                minLength={6}
              />
            </div>
            {status.type && (
              <Alert variant={status.type === "error" ? "destructive" : "default"}>
                <AlertDescription>{status.message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full h-11"
              disabled={isUpdating || !recoveryTokens}
            >
              {isUpdating ? (
                <>
                  <KeyRound className="w-4 h-4 mr-2 animate-spin" />
                  Updating Password...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 mr-2" />
                  Update Password
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-sm text-slate-600 hover:text-slate-900"
              onClick={() => navigate("/login")}
            >
              Back to Login
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

