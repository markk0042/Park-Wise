import Layout from "./Layout.jsx";
import Login from "./Login.jsx";
import ResetPassword from "./ResetPassword.jsx";
import TwoFactorSetup from "./TwoFactorSetup.jsx";
import { useAuth } from "@/context/AuthContext";

import UserManagement from "./UserManagement";

import Dashboard from "./Dashboard";

import AdminSetup from "./AdminSetup";

import VehicleLogEntry from "./VehicleLogEntry";

import VehicleDatabase from "./VehicleDatabase";

import BulkUpload from "./BulkUpload";

import Reports from "./Reports";

import NonComplianceReport from "./NonComplianceReport";

import ManageComplaints from "./ManageComplaints";

import GreenCarPark from "./GreenCarPark";

import YellowCarPark from "./YellowCarPark";

import DeleteAllVehicles from "./DeleteAllVehicles";

import TrendAnalysis from "./TrendAnalysis";

import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProtectedRoute from '@/components/ProtectedRoute';
import { check2FAStatus, fetchCurrentUser } from '@/api';

const PAGES = {
    
    UserManagement: UserManagement,
    
    Dashboard: Dashboard,
    
    AdminSetup: AdminSetup,
    
    VehicleLogEntry: VehicleLogEntry,
    
    VehicleDatabase: VehicleDatabase,
    
    BulkUpload: BulkUpload,
    
    Reports: Reports,
    
    NonComplianceReport: NonComplianceReport,
    
    ManageComplaints: ManageComplaints,
    
    GreenCarPark: GreenCarPark,
    
    YellowCarPark: YellowCarPark,
    
    DeleteAllVehicles: DeleteAllVehicles,
    
    TrendAnalysis: TrendAnalysis,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    const [checking2FA, setChecking2FA] = useState(false);
    
    // Call useAuth to get authentication state
    const { isAuthenticated, loading, error, profile: user, twoFactorStatus, token, refreshProfile } = useAuth();
    
    // Check 2FA status for non-admin users if not already loaded
    useEffect(() => {
        const checkMandatory2FA = async () => {
            // Only check for non-admin, approved users who are authenticated
            if (!isAuthenticated || !user || user.role === 'admin' || user.status !== 'approved') {
                return;
            }
            
            // If already on setup page, don't check
            if (location.pathname === '/2fa/setup') {
                return;
            }
            
            // If twoFactorStatus is not loaded, fetch it
            if (!twoFactorStatus && token && !checking2FA) {
                setChecking2FA(true);
                try {
                    const status = await check2FAStatus();
                    // If 2FA is required but not enabled, redirect to setup
                    if (status.required && !status.enabled) {
                        window.location.href = '/2fa/setup';
                    }
                } catch (err) {
                    console.error('Error checking 2FA status:', err);
                } finally {
                    setChecking2FA(false);
                }
            }
        };
        
        checkMandatory2FA();
    }, [isAuthenticated, user, twoFactorStatus, token, location.pathname, checking2FA]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="max-w-md text-center space-y-4">
                    <h2 className="text-2xl font-bold text-red-600">Authentication Error</h2>
                    <p className="text-slate-600">{error.message || "Unable to authenticate"}</p>
                </div>
            </div>
        );
    }

    // Public routes that don't require authentication
    // Check these BEFORE checking authentication
    if (location.pathname === '/auth/reset-password' || location.pathname === '/login') {
        // Don't check authentication for these pages
        if (location.pathname === '/auth/reset-password') {
            return <ResetPassword />;
        }
        if (location.pathname === '/login') {
            return <Login />;
        }
    }
    
    // 2FA setup route - requires authentication but accessible to non-admin users
    if (location.pathname === '/2fa/setup') {
        if (!isAuthenticated) {
            return <Login />;
        }
        // Allow access even if 2FA is not set up yet
        return <TwoFactorSetup />;
    }
    
    // All other routes require authentication
    if (!isAuthenticated) {
        return <Login />;
    }
    
    // MANDATORY 2FA CHECK: For non-admin users, 2FA is REQUIRED
    // Block access to all pages except /2fa/setup if 2FA is not enabled
    if (user?.role !== 'admin' && user?.status === 'approved' && location.pathname !== '/2fa/setup') {
        if (twoFactorStatus) {
            if (twoFactorStatus.required && !twoFactorStatus.enabled) {
                // Non-admin user without 2FA - redirect to setup
                return <Navigate to="/2fa/setup" replace />;
            }
        } else if (checking2FA) {
            // Still checking 2FA status, show loading
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
                </div>
            );
        }
    }
    
    // Block pending users from accessing the app
    if (user?.status === 'pending') {
        const PendingApprovalScreen = () => {
            const [refreshing, setRefreshing] = useState(false);
            const { refreshProfile } = useAuth();
            
            const handleRefresh = async () => {
                setRefreshing(true);
                try {
                    // Refresh profile from backend
                    await refreshProfile();
                    // Reload page to check updated status
                    setTimeout(() => window.location.reload(), 500);
                } catch (err) {
                    console.error('Error refreshing profile:', err);
                    // Still reload to get fresh data
                    window.location.reload();
                } finally {
                    setRefreshing(false);
                }
            };
            
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                    <div className="max-w-md text-center space-y-4">
                        <div className="w-16 h-16 mx-auto bg-amber-100 rounded-full flex items-center justify-center">
                            <Clock className="w-8 h-8 text-amber-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">Account Pending Approval</h2>
                        <p className="text-slate-600">
                            Your account is waiting for super admin approval. You will be able to access the app once your request has been approved.
                        </p>
                        <p className="text-sm text-slate-500">
                            If you were just approved, click the button below to refresh your status.
                        </p>
                        <Button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="mt-4"
                        >
                            {refreshing ? 'Refreshing...' : 'Refresh Status'}
                        </Button>
                    </div>
                </div>
            );
        };
        
        return <PendingApprovalScreen />;
    }

    // Block rejected users
    if (user?.status === 'rejected') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="max-w-md text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                        <XCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Access Denied</h2>
                    <p className="text-slate-600">
                        Your account access has been rejected. Please contact the super admin if you believe this is an error.
                    </p>
                </div>
            </div>
        );
    }
    
    // Default redirect based on user role
    const defaultRoute = user?.role === 'admin' ? '/UserManagement' : '/Dashboard';
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                {/* Root redirect */}
                <Route path="/" element={<Navigate to={defaultRoute} replace />} />
                
                {/* Public auth routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/auth/reset-password" element={<ResetPassword />} />
                
                {/* 2FA Setup - requires auth */}
                <Route path="/2fa/setup" element={<TwoFactorSetup />} />
                
                {/* Public routes - Available to all approved users */}
                <Route 
                    path="/Dashboard" 
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    } 
                />
                
                <Route 
                    path="/NonComplianceReport" 
                    element={
                        <ProtectedRoute>
                            <NonComplianceReport />
                        </ProtectedRoute>
                    } 
                />
                
                {/* Admin-only routes */}
                <Route 
                    path="/UserManagement" 
                    element={
                        <ProtectedRoute requireAdmin={true}>
                            <UserManagement />
                        </ProtectedRoute>
                    } 
                />
                
                <Route 
                    path="/AdminSetup" 
                    element={
                        <ProtectedRoute requireAdmin={true}>
                            <AdminSetup />
                        </ProtectedRoute>
                    } 
                />
                
                <Route 
                    path="/VehicleLogEntry" 
                    element={
                        <ProtectedRoute requireAdmin={true}>
                            <VehicleLogEntry />
                        </ProtectedRoute>
                    } 
                />
                
                <Route 
                    path="/VehicleDatabase" 
                    element={
                        <ProtectedRoute requireAdmin={true}>
                            <VehicleDatabase />
                        </ProtectedRoute>
                    } 
                />
                
                <Route 
                    path="/BulkUpload" 
                    element={
                        <ProtectedRoute requireAdmin={true}>
                            <BulkUpload />
                        </ProtectedRoute>
                    } 
                />
                
                <Route 
                    path="/Reports" 
                    element={
                        <ProtectedRoute requireAdmin={true}>
                            <Reports />
                        </ProtectedRoute>
                    } 
                />
                
                <Route 
                    path="/ManageComplaints" 
                    element={
                        <ProtectedRoute requireAdmin={true}>
                            <ManageComplaints />
                        </ProtectedRoute>
                    } 
                />
                
                <Route 
                    path="/GreenCarPark" 
                    element={
                        <ProtectedRoute requireAdmin={true}>
                            <GreenCarPark />
                        </ProtectedRoute>
                    } 
                />
                
                <Route 
                    path="/YellowCarPark" 
                    element={
                        <ProtectedRoute requireAdmin={true}>
                            <YellowCarPark />
                        </ProtectedRoute>
                    } 
                />
                
                <Route 
                    path="/DeleteAllVehicles" 
                    element={
                        <ProtectedRoute requireAdmin={true}>
                            <DeleteAllVehicles />
                        </ProtectedRoute>
                    } 
                />
                
                <Route 
                    path="/TrendAnalysis" 
                    element={
                        <ProtectedRoute requireAdmin={true}>
                            <TrendAnalysis />
                        </ProtectedRoute>
                    } 
                />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}