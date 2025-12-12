import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext';
import { checkEmailExists, resetPassword as apiResetPassword } from '@/api';
import { Shield, Lock, KeyRound } from 'lucide-react';

export default function Login() {
  const { signInWithPassword, resetPassword } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const resetToken = searchParams.get('token');
  
  // Check if we have a reset token in URL
  const shouldShowResetForm = !!resetToken;
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState({ type: null, message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isResettingPasswordForm, setIsResettingPasswordForm] = useState(shouldShowResetForm);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Check for session expiration
  useEffect(() => {
    const sessionExpired = sessionStorage.getItem('session_expired');
    if (sessionExpired === 'true') {
      setStatus({ 
        type: 'error', 
        message: 'Your session has expired. Please log in again.' 
      });
      // Clear the flag so it doesn't show again
      sessionStorage.removeItem('session_expired');
    }
  }, []);

  // Check for password reset token in URL query params
  useEffect(() => {
    if (resetToken) {
      console.log('✅ [Login] Password reset token found in URL');
      setIsResettingPasswordForm(true);
      setStatus({ 
        type: 'success', 
        message: 'Please enter your new password below.' 
      });
    }
  }, [resetToken]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: null, message: '' });
    
    if (!email || !password) {
      setStatus({ type: 'error', message: 'Please enter both email and password' });
      setIsSubmitting(false);
      return;
    }
    
    try {
      await signInWithPassword(email, password);
      // Success - user will be redirected automatically via auth state change
      setStatus({ type: 'success', message: 'Signing in...' });
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Invalid email or password' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    setIsResettingPassword(true);
    setStatus({ type: null, message: '' });
    
    if (!email) {
      setStatus({ type: 'error', message: 'Please enter your email address' });
      setIsResettingPassword(false);
      return;
    }
    
    try {
      // First, check if email exists in profiles
      let emailExists = false;
      try {
        emailExists = await checkEmailExists(email);
      } catch (checkError) {
        console.error('Error checking email:', checkError);
        // If check fails, still try to send reset (Supabase will handle if email doesn't exist)
        // This provides better UX - user gets a message either way
        emailExists = true; // Assume it exists and let Supabase handle validation
      }
      
      if (!emailExists) {
        setStatus({ 
          type: 'error', 
          message: 'This email is not registered. Please contact an administrator.' 
        });
        setIsResettingPassword(false);
        return;
      }
      
      // If email exists, send password reset link
      console.log('📧 Requesting password reset for:', email);
      const result = await resetPassword(email);
      console.log('📧 Password reset response:', result);
      
      // Show the reset token if provided (development or email failed)
      if (result?.reset_token) {
        const resetLink = `${window.location.origin}/login?token=${result.reset_token}`;
        setStatus({ 
          type: 'success', 
          message: `Password reset link: ${resetLink} (Token: ${result.reset_token})` 
        });
        // Also log to browser console
        console.log('✅ Password Reset Token:', result.reset_token);
        console.log('🔗 Reset Link:', resetLink);
        console.log('💡 Click the link above or copy the token to reset your password');
      } else {
        setStatus({ 
          type: 'success', 
          message: 'Password reset link has been sent to your email. Please check your inbox.' 
        });
      }
      setShowForgotPassword(false);
    } catch (err) {
      console.error('❌ Password reset error:', err);
      console.error('Error details:', {
        message: err.message,
        status: err.status,
        response: err.details
      });
      
      // Show detailed error message
      let errorMessage = 'Failed to send password reset link. ';
      
      if (err?.status === 404) {
        errorMessage += 'The password reset endpoint was not found. Please check if the backend is running.';
      } else if (err?.status === 502 || err?.status === 503) {
        errorMessage += 'The backend server is not responding. Please try again later.';
      } else if (err?.message) {
        errorMessage += err.message;
      } else {
        errorMessage += 'Please try again or contact support.';
      }
      
      setStatus({ 
        type: 'error', 
        message: errorMessage
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handlePasswordUpdate = async (event) => {
    event.preventDefault();
    setIsUpdatingPassword(true);
    setStatus({ type: null, message: '' });
    
    if (!newPassword || !confirmPassword) {
      setStatus({ type: 'error', message: 'Please enter and confirm your new password' });
      setIsUpdatingPassword(false);
      return;
    }
    
    if (newPassword.length < 6) {
      setStatus({ type: 'error', message: 'Password must be at least 6 characters long' });
      setIsUpdatingPassword(false);
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', message: 'Passwords do not match' });
      setIsUpdatingPassword(false);
      return;
    }
    
    try {
      if (!resetToken) {
        throw new Error('No reset token found. Please request a new password reset.');
      }
      
      console.log('✅ Resetting password with token...');
      
      // Reset password using the token
      await apiResetPassword(resetToken, newPassword);
      
      console.log('✅ Password updated successfully');
      
      setStatus({ 
        type: 'success', 
        message: 'Password updated successfully! You can now sign in with your new password.' 
      });
      
      // Clear the form and reset state
      setNewPassword('');
      setConfirmPassword('');
      setIsResettingPasswordForm(false);
      
      // Remove token from URL
      setSearchParams({});
      
      // Clear form after 2 seconds
      setTimeout(() => {
        setEmail('');
      }, 2000);
      
    } catch (err) {
      console.error('❌ Password update error:', err);
      setStatus({ 
        type: 'error', 
        message: err.message || 'Failed to update password. The reset link may have expired. Please request a new one.' 
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-2 border-slate-200">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4">
            {isResettingPasswordForm ? (
              <KeyRound className="w-8 h-8 text-white" />
            ) : (
              <Shield className="w-8 h-8 text-white" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            {(isResettingPasswordForm || shouldShowResetForm) ? 'Reset Your Password' : 'ParkingLog Access'}
          </CardTitle>
        </CardHeader>
        <form onSubmit={(isResettingPasswordForm || shouldShowResetForm) ? handlePasswordUpdate : handleSubmit}>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600 text-center">
              {(isResettingPasswordForm || shouldShowResetForm)
                ? 'Enter your new password below. Make sure it\'s at least 6 characters long.'
                : showForgotPassword 
                  ? 'Enter your registered email to receive a password reset link.'
                  : 'Enter your email and password to sign in.'}
            </p>
            {(isResettingPasswordForm || shouldShowResetForm) ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm font-semibold text-slate-700">
                    New Password
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
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
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Confirm your new password"
                    required
                    className="h-11 text-base"
                    autoComplete="new-password"
                    minLength={6}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-slate-700">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                    className="h-11 text-base"
                    autoComplete="email"
                  />
                </div>
                {!showForgotPassword && (
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-semibold text-slate-700">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                      required
                      className="h-11 text-base"
                      autoComplete="current-password"
                    />
                  </div>
                )}
              </>
            )}
            {status.type && (
              <Alert variant={status.type === 'error' ? 'destructive' : 'default'}>
                <AlertDescription>{status.message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            {(isResettingPasswordForm || shouldShowResetForm) ? (
              <>
                <Button type="submit" className="w-full h-11" disabled={isUpdatingPassword}>
                  {isUpdatingPassword ? (
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
                  onClick={() => {
                    setIsResettingPasswordForm(false);
                    setStatus({ type: null, message: '' });
                    setNewPassword('');
                    setConfirmPassword('');
                    window.history.replaceState(null, '', window.location.pathname);
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : !showForgotPassword ? (
              <>
                <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
                  {isSubmitting ? 'Signing in...' : 'Sign In'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-sm text-slate-600 hover:text-slate-900"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setStatus({ type: null, message: '' });
                    setPassword('');
                  }}
                >
                  Forgot your password?
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  onClick={handleForgotPassword}
                  className="w-full h-11"
                  disabled={isResettingPassword}
                >
                  {isResettingPassword ? (
                    <>
                      <Lock className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Send Reset Link
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-sm text-slate-600 hover:text-slate-900"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setStatus({ type: null, message: '' });
                  }}
                >
                  Back to Sign In
                </Button>
              </>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
