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
  const navigate = useNavigate();

  useEffect(() => {
    // Extract tokens from URL hash BEFORE doing anything else
    // We need to capture these immediately as they might be cleared
    const hash = window.location.hash;
    console.log('🔐 URL hash:', hash);
    
    const params = new URLSearchParams(hash.replace("#", "?"));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");

    console.log('🔐 Extracted tokens:', { type, hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken });

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
      
      // Now sign out any existing session to prevent auto-login
      supabase.auth.signOut().catch(err => {
        console.warn('Error signing out:', err);
      });
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
      
      // Set the session using the stored recovery tokens
      // This is required for Supabase to allow password update
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: recoveryTokens.access_token,
        refresh_token: recoveryTokens.refresh_token || recoveryTokens.access_token, // Fallback if no refresh token
      });
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        throw new Error(sessionError.message || "Failed to authenticate reset link. Please request a new password reset.");
      }

      if (!sessionData.session) {
        throw new Error("Failed to create session. Please request a new password reset.");
      }

      console.log('✅ Session created, updating password...');

      // Update password using Supabase (requires active session)
      const { error: updateError } = await supabase.auth.updateUser({ 
        password: password 
      });

      if (updateError) {
        console.error('❌ Password update error:', updateError);
        throw updateError;
      }

      console.log('✅ Password updated successfully');

      setStatus({
        type: "success",
        message: "Password updated successfully! Signing you out..."
      });

      // Call backend to sync password update (optional - if you want to track it)
      try {
        const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
        const session = await supabase.auth.getSession();
        if (session.data.session?.access_token) {
          await fetch(`${backendUrl}/auth/sync-password-reset`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.data.session.access_token}`,
            },
            body: JSON.stringify({ password_reset: true }),
          });
        }
      } catch (backendError) {
        console.warn("Backend sync failed (non-critical):", backendError);
      }

      // Sign out to force re-login with new password
      await supabase.auth.signOut();

      // Redirect to login after a short delay
      setTimeout(() => {
        navigate("/login");
      }, 2000);
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

