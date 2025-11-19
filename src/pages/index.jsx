import Layout from "./Layout.jsx";
import Login from "./Login.jsx";
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

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

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
    const { isAuthenticated, loading, error } = useAuth();

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

    if (!isAuthenticated) {
        return <Login />;
    }
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<UserManagement />} />
                
                
                <Route path="/UserManagement" element={<UserManagement />} />
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/AdminSetup" element={<AdminSetup />} />
                
                <Route path="/VehicleLogEntry" element={<VehicleLogEntry />} />
                
                <Route path="/VehicleDatabase" element={<VehicleDatabase />} />
                
                <Route path="/BulkUpload" element={<BulkUpload />} />
                
                <Route path="/Reports" element={<Reports />} />
                
                <Route path="/NonComplianceReport" element={<NonComplianceReport />} />
                
                <Route path="/ManageComplaints" element={<ManageComplaints />} />
                
                <Route path="/GreenCarPark" element={<GreenCarPark />} />
                
                <Route path="/YellowCarPark" element={<YellowCarPark />} />
                
                <Route path="/DeleteAllVehicles" element={<DeleteAllVehicles />} />
                
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