import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext';
import { checkEmailExists } from '@/api';
import { Shield, Lock } from 'lucide-react';

export default function Login() {
  const { signInWithPassword, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState({ type: null, message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

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
      await resetPassword(email);
      setStatus({ 
        type: 'success', 
        message: 'Password reset link has been sent to your email. Please check your inbox.' 
      });
      setShowForgotPassword(false);
    } catch (err) {
      console.error('Password reset error:', err);
      // If it's a 404, the endpoint might not be available - try direct Supabase reset
      if (err?.status === 404 || err?.message?.includes('404')) {
        try {
          // Fallback: try direct Supabase reset (less secure but works)
          await resetPassword(email);
          setStatus({ 
            type: 'success', 
            message: 'Password reset link has been sent to your email. Please check your inbox.' 
          });
          setShowForgotPassword(false);
        } catch (resetError) {
          setStatus({ 
            type: 'error', 
            message: resetError.message || 'Failed to send password reset link. Please try again or contact support.' 
          });
        }
      } else {
        setStatus({ 
          type: 'error', 
          message: err.message || 'Failed to send password reset link. Please try again.' 
        });
      }
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-2 border-slate-200">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">ParkingLog Access</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600 text-center">
              {showForgotPassword 
                ? 'Enter your registered email to receive a password reset link.'
                : 'Enter your email and password to sign in.'}
            </p>
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
            {status.type && (
              <Alert variant={status.type === 'error' ? 'destructive' : 'default'}>
                <AlertDescription>{status.message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            {!showForgotPassword ? (
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
