import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { fetchParkingLogs } from "@/api";

import StatsOverview from "../components/dashboard/StatsOverview";
import VehicleQuickSelect from "../components/dashboard/VehicleQuickSelect";
import QuickRegistrationLog from "../components/dashboard/QuickRegistrationLog";
import CategoryReport from "../components/dashboard/CategoryReport";
import LogsTable from "../components/dashboard/LogsTable";
import NonCompliantTracker from "../components/dashboard/NonCompliantTracker";

export default function Dashboard() {
  const [viewMode, setViewMode] = useState("dashboard");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const { profile: user, loading: authLoading } = useAuth();

  const { data: logs = [], isFetching: logsFetching } = useQuery({
    queryKey: ['parkingLogs'],
    queryFn: () => fetchParkingLogs(),
    enabled: !!user,
    refetchInterval: 60000,
  });

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setViewMode("report");
  };

  const handleBackToDashboard = () => {
    setViewMode("dashboard");
    setSelectedCategory(null);
  };

  const handleSelectVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
  };

  if (authLoading || logsFetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (user.status === "pending") {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 md:p-6">
        <Alert className="max-w-md mx-4">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="text-base md:text-lg">
            Your account is pending admin approval. Please contact an administrator to gain access.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (user.status === "rejected") {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 md:p-6">
        <Alert variant="destructive" className="max-w-md mx-4">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="text-base md:text-lg">
            Your account access has been rejected. Please contact an administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isAdmin = user.role === 'admin' && user.status === 'approved';

  if (viewMode === "report") {
    return (
      <CategoryReport 
        logs={logs}
        category={selectedCategory}
        onBack={handleBackToDashboard}
        currentUser={user}
      />
    );
  }

  const parkingColors = {
    Green: "bg-emerald-100 text-emerald-800",
    Yellow: "bg-amber-100 text-amber-800",
    Red: "bg-red-100 text-red-800",
    Visitor: "bg-purple-100 text-purple-800"
  };

  const todayLogs = logs.filter(log => {
    const logDate = new Date(log.log_date);
    const today = new Date();
    return logDate.toDateString() === today.toDateString();
  });

  return (
    <div className="w-full overflow-x-hidden">
      <div className="py-3 md:py-6 lg:py-8 bg-slate-50 min-h-screen">
        <div className="w-full space-y-4 md:space-y-6 px-2 md:px-4 lg:px-6">
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900">Parking Dashboard</h1>
            <p className="text-sm md:text-base text-slate-600 mt-1">
              Log vehicles and view parking statistics (GDPR compliant)
            </p>
          </div>

          <StatsOverview 
            logs={logs}
            onCategoryClick={handleCategoryClick}
          />

          <NonCompliantTracker logs={logs} />
        </div>

        {/* Full-width section for the two boxes - fills screen from left to right */}
        {isAdmin && (
          <div className="w-full px-2 md:px-3 lg:px-4 my-2 md:my-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 md:gap-3 items-stretch w-full">
              <div className="w-full flex">
                <QuickRegistrationLog />
              </div>

              <div className="w-full flex">
                <VehicleQuickSelect onSelectVehicle={handleSelectVehicle} />
              </div>
            </div>
          </div>
        )}

        <div className="w-full space-y-4 md:space-y-6 px-2 md:px-4 lg:px-6">
          {!isAdmin && (
            <div className="max-w-2xl mx-auto w-full">
              <QuickRegistrationLog />
            </div>
          )}

          {isAdmin && selectedVehicle && (
            <div className="mt-4 md:mt-6 max-w-2xl mx-auto w-full">
              <Card className="shadow-lg border-2 border-blue-200">
                <CardHeader className="px-4 md:px-6">
                  <CardTitle className="text-base md:text-lg font-bold">Vehicle Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-4 md:px-6">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-600 mb-1">Registration</p>
                      <p className="font-mono font-bold text-base md:text-lg truncate">{selectedVehicle.registration_plate}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-600 mb-1">Permit Number</p>
                      <p className="font-mono font-semibold text-base md:text-lg truncate">{selectedVehicle.permit_number || "-"}</p>
                    </div>
                    <div className="min-w-0 col-span-2">
                      <p className="text-xs text-slate-600 mb-1">Parking Type</p>
                      <Badge className={parkingColors[selectedVehicle.parking_type]}>
                        {selectedVehicle.parking_type}
                      </Badge>
                    </div>
                  </div>
                  {selectedVehicle.notes && (
                    <div className="min-w-0">
                      <p className="text-xs text-slate-600 mb-1">Notes</p>
                      <p className="text-sm break-words">{selectedVehicle.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {isAdmin && todayLogs.length > 0 && (
            <div className="mt-6 w-full min-w-0">
              <LogsTable logs={todayLogs} searchTerm="" currentUser={user} showTitle={true} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}