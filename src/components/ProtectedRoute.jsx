import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

/**
 * ProtectedRoute component that restricts access based on user role
 * @param {Object} props
 * @param {React.ReactNode} props.children - The component to render if access is granted
 * @param {boolean} props.requireAdmin - If true, only admins can access
 * @param {string} props.redirectTo - Where to redirect if access is denied (default: '/Dashboard')
 */
export default function ProtectedRoute({ children, requireAdmin = false, redirectTo = '/Dashboard' }) {
  const { profile: user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
      </div>
    );
  }

  // Check if user is approved
  if (!user || user.status !== 'approved') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Alert className="max-w-md">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="text-base md:text-lg">
            Your account needs to be approved to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Check if admin access is required
  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}

