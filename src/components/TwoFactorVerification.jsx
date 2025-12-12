import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Shield, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function TwoFactorVerification({ onCancel }) {
  const { verify2FA } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async (e) => {
    e?.preventDefault();
    setError('');

    if (!code || code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setIsVerifying(true);
    try {
      await verify2FA(code);
      // Success - AuthContext will handle the redirect
    } catch (err) {
      setError(err.message || 'Invalid code. Please try again.');
      setCode('');
    } finally {
      setIsVerifying(false);
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
            Two-Factor Authentication
          </CardTitle>
        </CardHeader>
        <form onSubmit={handleVerify}>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600 text-center">
              Enter the 6-digit code from your authenticator app
            </p>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 text-center block">
                Verification Code
              </Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={(value) => {
                    setCode(value);
                    setError('');
                    // Auto-submit when 6 digits are entered
                    if (value.length === 6) {
                      handleVerify();
                    }
                  }}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <p className="text-xs text-slate-500 text-center">
              You can also use one of your backup codes if you don't have access to your authenticator app.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full h-11"
              disabled={isVerifying || code.length !== 6}
            >
              {isVerifying ? 'Verifying...' : 'Verify Code'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-sm text-slate-600 hover:text-slate-900"
              onClick={onCancel}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

