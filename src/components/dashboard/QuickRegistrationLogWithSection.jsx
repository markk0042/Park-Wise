import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, CheckCircle, AlertCircle, Tag, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { createParkingLog, fetchVehicles } from "@/api";

export default function QuickRegistrationLogWithSection({ section }) {
  const [registration, setRegistration] = useState("");
  const [matchedVehicle, setMatchedVehicle] = useState(null);
  const [showUnregistered, setShowUnregistered] = useState(false);
  const [isViolation, setIsViolation] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const queryClient = useQueryClient();

  const { profile: user } = useAuth();

  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => fetchVehicles("permit_number"),
    enabled: user?.status === 'approved',
    refetchInterval: 60000,
    retry: false,
  });

  const createLogMutation = useMutation({
    mutationFn: (logData) => createParkingLog(logData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parkingLogs'] });
      const regPlate = matchedVehicle?.registration_plate || registration.toUpperCase().trim();
      setSuccessMessage(`✓ ${regPlate} logged successfully!`);
      setRegistration("");
      setMatchedVehicle(null);
      setShowUnregistered(false);
      setIsViolation(false);
      setTimeout(() => setSuccessMessage(""), 3000);
    },
    onError: (error) => {
      console.error("Failed to create log:", error);
      setErrorMessage(`Failed to log vehicle. ${error.message || 'Please try again or contact support.'}`);
      setTimeout(() => setErrorMessage(""), 5000);
    },
  });

  const handleSearch = () => {
    setErrorMessage("");
    setSuccessMessage("");
    setShowUnregistered(false);
    setIsViolation(false);
    
    const searchTerm = registration.toUpperCase().trim();
    if (!searchTerm) {
      setErrorMessage("Please enter a registration plate");
      return;
    }

    const vehicle = vehicles.find(v => 
      v.registration_plate.toUpperCase() === searchTerm && v.is_active
    );

    if (vehicle) {
      setMatchedVehicle(vehicle);
      setShowUnregistered(false);
      
      // Check for violations
      let violation = false;
      if (section === "Green") {
        // Yellow or Red in Green zone is a violation
        if (vehicle.parking_type === "Yellow" || vehicle.parking_type === "Red") {
          violation = true;
        }
      } else if (section === "Yellow") {
        // Red in Yellow zone is a violation
        if (vehicle.parking_type === "Red") {
          violation = true;
        }
      }
      setIsViolation(violation);
    } else {
      setMatchedVehicle(null);
      setShowUnregistered(true);
      setIsViolation(true); // Unregistered is always a violation
    }
  };

  const handleLog = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    
    if (!user || user.status !== 'approved') {
      setErrorMessage("You must have an approved account to log vehicles.");
      return;
    }

    let logData;
    if (matchedVehicle) {
      const notesPrefix = matchedVehicle.permit_number ? `Permit: ${matchedVehicle.permit_number}` : "No permit";
      let violationNote = "";
      
      if (isViolation) {
        if (matchedVehicle.parking_type === "Yellow" && section === "Green") {
          violationNote = " - VIOLATION: Yellow permit in Green Car Park";
        } else if (matchedVehicle.parking_type === "Red" && section === "Green") {
          violationNote = " - VIOLATION: No permit in Green Car Park (Non-compliant)";
        } else if (matchedVehicle.parking_type === "Red" && section === "Yellow") {
          violationNote = " - VIOLATION: No permit in Yellow Car Park (Non-compliant)";
        }
      }
      
      logData = {
        registration_plate: matchedVehicle.registration_plate,
        parking_type: matchedVehicle.parking_type,
        notes: notesPrefix + violationNote,
        log_date: format(new Date(), "yyyy-MM-dd"),
        log_time: format(new Date(), "HH:mm")
      };
    } else if (showUnregistered) {
      logData = {
        registration_plate: registration.toUpperCase().trim(),
        parking_type: "Red",
        notes: `No permit - Unregistered vehicle - VIOLATION: Unregistered in ${section} Car Park (Non-compliant)`,
        log_date: format(new Date(), "yyyy-MM-dd"),
        log_time: format(new Date(), "HH:mm")
      };
    }
    
    createLogMutation.mutate(logData);
  };

  const parkingColors = {
    Green: "bg-emerald-100 text-emerald-800",
    Yellow: "bg-amber-100 text-amber-800",
    Red: "bg-red-100 text-red-800"
  };

  const sectionColor = section === "Green" ? "emerald" : "amber";

  return (
    <Card className={`shadow-lg border-2 border-${sectionColor}-200`}>
      <CardHeader className={`pb-3 bg-${sectionColor}-50`}>
        <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Zap className={`w-5 h-5 text-${sectionColor}-600`} />
          Vehicle Registration Log
        </CardTitle>
        <p className="text-sm text-slate-600 mt-1">
          Enter registration to auto-log with permit details
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 text-sm">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        <div className="space-y-3">
          {vehiclesLoading && (
            <div className="text-sm text-slate-500 text-center py-2">
              Loading vehicles database...
            </div>
          )}
          
          <div className="flex gap-2">
            <Input
              value={registration}
              onChange={(e) => setRegistration(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter registration (e.g., 231-D-12345)"
              className="font-mono text-base uppercase"
            />
            <Button 
              onClick={handleSearch}
              variant="outline"
              className="shrink-0"
            >
              Search
            </Button>
          </div>

          {isViolation && (matchedVehicle || showUnregistered) && (
            <div className="p-3 bg-red-100 border-2 border-red-400 rounded-lg flex items-center gap-2 text-red-900">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span className="font-bold text-sm">
                WARNING: Non-compliant parking detected!
              </span>
            </div>
          )}

          {matchedVehicle && (
            <div className="space-y-3">
              <div className={`p-4 border-2 rounded-lg bg-white space-y-3 ${isViolation ? 'border-red-400' : `border-${sectionColor}-200`}`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Registration</p>
                      <p className="font-mono font-bold text-lg text-slate-900">
                        {matchedVehicle.registration_plate}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-slate-600 mb-1">Permit Number</p>
                        <Badge variant="outline" className="font-mono text-sm">
                          <Tag className="w-3 h-3 mr-1" />
                          {matchedVehicle.permit_number || "No permit"}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 mb-1">Permit Color</p>
                        <Badge className={`${parkingColors[matchedVehicle.parking_type]} text-sm`}>
                          {matchedVehicle.parking_type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleLog}
                disabled={createLogMutation.isPending}
                className={`w-full font-semibold py-6 text-base ${
                  isViolation 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : `bg-${sectionColor}-600 hover:bg-${sectionColor}-700`
                } text-white`}
              >
                {createLogMutation.isPending ? "Logging..." : isViolation ? "Log Violation" : `Log ${matchedVehicle.parking_type} Permit`}
              </Button>
            </div>
          )}

          {showUnregistered && (
            <div className="space-y-3">
              <div className="p-4 border-2 border-red-300 rounded-lg bg-red-50 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="font-semibold text-red-900">Unregistered Vehicle</p>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-red-700 mb-1">Registration</p>
                    <p className="font-mono font-bold text-lg text-red-900">
                      {registration.toUpperCase().trim()}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-red-700 mb-1">Permit Number</p>
                      <Badge className="bg-red-200 text-red-900 text-sm">
                        <Tag className="w-3 h-3 mr-1" />
                        No permit
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-red-700 mb-1">Status</p>
                      <Badge className="bg-red-200 text-red-900 text-sm">
                        Unregistered
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleLog}
                disabled={createLogMutation.isPending}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-6 text-base"
              >
                {createLogMutation.isPending ? "Logging..." : "Log Violation - Unregistered Vehicle"}
              </Button>
            </div>
          )}

          {!matchedVehicle && !showUnregistered && vehicles.length > 0 && (
            <p className="text-xs text-slate-500 text-center py-2">
              {vehicles.length} vehicles in database - enter registration to search
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}