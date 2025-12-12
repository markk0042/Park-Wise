import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext';
import { Shield } from 'lucide-react';

export default function Login() {
  const { signInWithPassword } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState({ type: null, message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-2 border-slate-200">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            Park Wise Login
          </CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600 text-center">
              Enter your email and password to sign in.
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
            {status.type && (
              <Alert variant={status.type === 'error' ? 'destructive' : 'default'}>
                <AlertDescription>{status.message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
            <p className="text-xs text-slate-500 text-center">
              Need to reset your password? Contact an administrator.
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
