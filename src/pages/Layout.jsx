
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LayoutDashboard, Users, LogOut, ParkingSquare, Shield, ClipboardList, Database, FileText, Menu, X, AlertCircle } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

function LayoutContent({ children, currentPageName }) {
  const location = useLocation();
  const { setOpenMobile, isMobile, openMobile } = useSidebar();
  const { profile: user, loading: authLoading, signOut } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900" />
      </div>
    );
  }

  const navigationItems = [];

  // Dashboard is first for everyone who is approved
  if (user?.status === 'approved') {
    navigationItems.push({
      title: "Dashboard",
      url: createPageUrl("Dashboard"),
      icon: LayoutDashboard,
    });
  }

  // Non-Compliance Report for all approved users (both regular users and admins)
  if (user?.status === 'approved') {
    navigationItems.push({
      title: "Non-Compliance Report",
      url: createPageUrl("NonComplianceReport"),
      icon: AlertCircle,
    });
  }

  if (user?.status === 'approved') {
    navigationItems.push({
      title: "Green Car Park",
      url: createPageUrl("GreenCarPark"),
      icon: ParkingSquare,
    });
  }

  if (user?.status === 'approved') {
    navigationItems.push({
      title: "Yellow Car Park",
      url: createPageUrl("YellowCarPark"),
      icon: ParkingSquare,
    });
  }

  if (user?.role === 'admin' && user?.status === 'approved') {
    navigationItems.push({
      title: "Manage Complaints",
      url: createPageUrl("ManageComplaints"),
      icon: FileText,
    });
  }

  if (user?.role === 'admin' && user?.status === 'approved') {
    navigationItems.push({
      title: "Vehicle Log Entry",
      url: createPageUrl("VehicleLogEntry"),
      icon: ClipboardList,
    });
  }

  if (user?.role === 'admin' && user?.status === 'approved') {
    navigationItems.push({
      title: "Vehicle Database",
      url: createPageUrl("VehicleDatabase"),
      icon: Database,
    });
  }

  if (user?.role === 'admin' && user?.status === 'approved') {
    navigationItems.push({
      title: "Generate Reports",
      url: createPageUrl("Reports"),
      icon: FileText,
    });
  }

  if (user?.role === 'admin' && user?.status === 'approved') {
    navigationItems.push({
      title: "User Management",
      url: createPageUrl("UserManagement"),
      icon: Users,
    });
  }

  if (user?.role === 'admin' && user?.status === 'approved') {
    navigationItems.push({
      title: "Delete All Vehicles",
      url: createPageUrl("DeleteAllVehicles"),
      icon: AlertCircle,
    });
  }

  const handleLogout = () => {
    signOut();
  };

  const handleNavClick = () => {
    // Close sidebar on mobile when navigation item is clicked
    setOpenMobile(false);
  };

  const handleCloseSidebar = () => {
    setOpenMobile(false);
  };

  return (
    <>
      <style>{`
        :root {
          --parking-green: #10b981;
          --parking-yellow: #f59e0b;
          --parking-blue: #3b82f6;
          --sidebar-bg: #1e293b;
          --sidebar-hover: #475569;
          --nav-text-blue: #60a5fa;
          --nav-text-blue-hover: #93c5fd;
        }
        
        /* Fix scrollbar glitching */
        html {
          overflow-y: scroll;
        }
        
        body {
          margin: 0;
          padding: 0;
          width: 100%;
          max-width: 100vw;
        }
        
        #root {
          width: 100%;
          max-width: 100vw;
        }
        
        /* Enhanced sidebar trigger button */
        .sidebar-trigger-enhanced {
          position: relative;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          cursor: pointer !important;
          display: flex !important;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          padding: 0 !important;
        }
        
        .sidebar-trigger-enhanced * {
          pointer-events: none !important;
        }
        
        .sidebar-trigger-enhanced:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        
        .sidebar-trigger-enhanced:active {
          transform: scale(0.95);
        }
        
        .sidebar-trigger-enhanced svg {
          pointer-events: none;
          width: 24px;
          height: 24px;
        }
        
        /* Close button styling - Enhanced visibility with darker red */
        .sidebar-close-button {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background-color: rgba(220, 38, 38, 0.2) !important;
          border: 2px solid rgba(220, 38, 38, 0.4);
        }
        
        .sidebar-close-button:hover {
          transform: scale(1.1);
          background-color: rgba(220, 38, 38, 0.35) !important;
          border-color: rgba(220, 38, 38, 0.6);
        }
        
        .sidebar-close-button:active {
          transform: scale(0.9);
        }
        
        .sidebar-close-button svg {
          stroke-width: 3;
          color: #dc2626 !important;
        }
        
        /* Pulse animation for attention */
        @keyframes pulse-subtle {
          0%, 100% {
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
          }
          50% {
            box-shadow: 0 2px 12px rgba(59, 130, 246, 0.5), 0 0 0 4px rgba(59, 130, 246, 0.1);
          }
        }
        
        .sidebar-trigger-enhanced.pulse {
          animation: pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
      <div className="min-h-screen flex w-full max-w-full bg-slate-50">
        <Sidebar className="border-r border-slate-200 bg-[--sidebar-bg] shrink-0">
          <SidebarHeader className="border-b border-slate-600 p-4 md:p-6">
            <div className="flex items-center justify-between gap-2 md:gap-3">
              <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shrink-0">
                  <ParkingSquare className="w-4 h-4 md:w-6 md:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-base md:text-lg truncate" style={{ color: '#60a5fa', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>
                    ParkingLog
                  </h2>
                  <p className="text-xs truncate font-medium" style={{ color: '#93c5fd' }}>Daily Management</p>
                </div>
              </div>
              {isMobile && openMobile && (
                <Button
                  onClick={handleCloseSidebar}
                  variant="ghost"
                  size="icon"
                  className="sidebar-close-button shrink-0 h-10 w-10"
                >
                  <X className="w-6 h-6" style={{ color: '#dc2626' }} />
                </Button>
              )}
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-2 md:p-3">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-bold uppercase tracking-wider px-3 py-2" style={{ color: '#93c5fd' }}>
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-[--sidebar-hover] transition-all duration-200 rounded-lg mb-1 ${
                          location.pathname === item.url ? 'bg-[--sidebar-hover] font-semibold' : ''
                        }`}
                        style={{ color: location.pathname === item.url ? '#93c5fd' : '#60a5fa' }}
                      >
                        <Link 
                          to={item.url} 
                          className="flex items-center gap-2 md:gap-3 px-2 md:px-3 py-2 md:py-2.5"
                          onClick={handleNavClick}
                        >
                          <item.icon className="w-4 h-4 md:w-5 md:h-5 shrink-0" strokeWidth={2.5} />
                          <span className="font-semibold text-xs md:text-sm truncate">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-slate-600 p-3 md:p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 md:gap-3 px-2">
                <div className="w-8 h-8 md:w-9 md:h-9 bg-slate-600 rounded-full flex items-center justify-center shrink-0 border-2 border-slate-500">
                  <span className="font-bold text-xs md:text-sm" style={{ color: '#60a5fa' }}>
                    {user?.full_name?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-xs md:text-sm truncate" style={{ color: '#60a5fa' }}>
                    {user?.full_name || 'User'}
                  </p>
                  <p className="text-xs truncate font-medium" style={{ color: '#93c5fd' }}>{user?.email}</p>
                  {user?.role === 'admin' && user?.status === 'approved' && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Shield className="w-3 h-3 shrink-0" style={{ color: '#60a5fa' }} />
                      <span className="text-xs font-bold" style={{ color: '#60a5fa' }}>Admin</span>
                    </div>
                  )}
                  {user?.status === 'pending' && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xs font-bold" style={{ color: '#fbbf24' }}>⏳ Pending</span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-2 md:px-3 py-2 text-xs md:text-sm hover:bg-[--sidebar-hover] rounded-lg transition-all duration-200 font-semibold"
                style={{ color: '#60a5fa' }}
              >
                <LogOut className="w-3 h-3 md:w-4 md:h-4 shrink-0" strokeWidth={2.5} />
                <span>Logout</span>
              </button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col min-w-0 w-full max-w-full">
          <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 md:py-4 md:hidden sticky top-0 z-10 shadow-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="sidebar-trigger-enhanced pulse bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl border-none">
                <Menu />
              </SidebarTrigger>
              <h1 className="text-lg md:text-xl font-bold text-slate-900 truncate">ParkingLog</h1>
            </div>
          </header>

          <div className="flex-1 w-full max-w-full">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <SidebarProvider>
      <LayoutContent children={children} currentPageName={currentPageName} />
    </SidebarProvider>
  );
}
