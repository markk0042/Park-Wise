import Layout from "./Layout.jsx";
import Login from "./Login.jsx";
import ResetPassword from "./ResetPassword.jsx";
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
import { Clock, XCircle } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';

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
    
    // Call useAuth to get authentication state
    const { isAuthenticated, loading, error, profile: user } = useAuth();

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

    // Check if we're on the reset password page
    if (location.pathname === '/auth/reset-password') {
        return <ResetPassword />;
    }
    
    if (!isAuthenticated) {
        return <Login />;
    }
    
    // Block pending users from accessing the app
    if (user?.status === 'pending') {
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
                        Please contact the super admin or wait for approval notification.
                    </p>
                </div>
            </div>
        );
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