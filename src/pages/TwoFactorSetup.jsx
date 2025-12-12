import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Input } from '@/components/ui/input';
import { Shield, CheckCircle, X, Copy, Download } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { generate2FASecret, verify2FASetup, check2FAStatus, disable2FA } from '@/api';

export default function TwoFactorSetup() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState('check'); // 'check', 'setup', 'verify', 'enabled'
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    // Only allow non-admin users
    if (profile?.role === 'admin') {
      navigate('/Dashboard');
      return;
    }

    checkStatus();
  }, [profile, navigate]);

  const checkStatus = async () => {
    try {
      const status = await check2FAStatus();
      if (status.enabled) {
        setIsEnabled(true);
        setStep('enabled');
      } else {
        setStep('setup');
      }
    } catch (err) {
      console.error('Error checking 2FA status:', err);
      setError('Failed to check 2FA status');
    }
  };

  const handleGenerateSecret = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await generate2FASecret();
      setQrCodeUrl(result.qrCodeUrl);
      setSecret(result.secret);
      setBackupCodes(result.backupCodes);
      setStep('verify');
    } catch (err) {
      setError(err.message || 'Failed to generate 2FA secret');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e?.preventDefault();
    setError('');

    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    try {
      await verify2FASetup(verificationCode);
      setIsEnabled(true);
      setStep('enabled');
    } catch (err) {
      setError(err.message || 'Invalid code. Please try again.');
      setVerificationCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    // 2FA is mandatory for non-admin users - they cannot disable it
    if (profile?.role !== 'admin') {
      setError('Two-factor authentication is mandatory for non-admin users and cannot be disabled.');
      return;
    }

    if (!confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      await disable2FA();
      setIsEnabled(false);
      setStep('setup');
      setQrCodeUrl('');
      setSecret('');
      setBackupCodes([]);
    } catch (err) {
      setError(err.message || 'Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    navigator.clipboard.writeText(codesText);
    alert('Backup codes copied to clipboard!');
  };

  const downloadBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'park-wise-2fa-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (step === 'check') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
      </div>
    );
  }

  if (step === 'enabled') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-2 border-slate-200">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">
              Two-Factor Authentication Enabled
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Your account is now protected with two-factor authentication. You'll need to enter a code from your authenticator app each time you log in.
              </AlertDescription>
            </Alert>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            {profile?.role === 'admin' ? (
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleDisable}
                disabled={loading}
              >
                {loading ? 'Disabling...' : 'Disable 2FA'}
              </Button>
            ) : (
              <Alert>
                <AlertDescription>
                  Two-factor authentication is mandatory for your account and cannot be disabled.
                </AlertDescription>
              </Alert>
            )}
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => navigate('/Dashboard')}
            >
              Back to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-2 border-slate-200">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">
              Verify Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">
                1. Scan QR Code
              </Label>
              <div className="flex justify-center p-4 bg-white rounded-lg border">
                <img src={qrCodeUrl} alt="2FA QR Code" className="w-48 h-48" />
              </div>
              <p className="text-xs text-slate-600 text-center">
                Use an authenticator app like Google Authenticator, Authy, or Microsoft Authenticator
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">
                2. Enter Verification Code
              </Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={verificationCode}
                  onChange={(value) => {
                    setVerificationCode(value);
                    setError('');
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
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">
                3. Save Backup Codes
              </Label>
              <Alert>
                <AlertDescription className="text-xs">
                  <strong>Important:</strong> Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
                </AlertDescription>
              </Alert>
              <div className="bg-slate-100 p-4 rounded-lg space-y-2">
                {backupCodes.map((code, index) => (
                  <div key={index} className="font-mono text-sm text-center">
                    {code}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={copyBackupCodes}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={downloadBackupCodes}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              type="button"
              className="w-full"
              onClick={handleVerify}
              disabled={loading || verificationCode.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify and Enable'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setStep('setup')}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Setup step
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-2 border-slate-200">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            Enable Two-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600 text-center">
            Add an extra layer of security to your account by requiring a code from your authenticator app when you log in.
          </p>
          <Alert>
            <AlertDescription>
              <strong>Required:</strong> Two-factor authentication is <strong>mandatory</strong> for all non-admin users. You must set this up to access the app.
            </AlertDescription>
          </Alert>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button
            className="w-full"
            onClick={handleGenerateSecret}
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Set Up 2FA'}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => navigate('/Dashboard')}
          >
            Back to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

