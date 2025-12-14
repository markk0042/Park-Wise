import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, CheckCircle, AlertCircle, Tag } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { createParkingLog, fetchVehicles } from "@/api";

export default function QuickRegistrationLog() {
  const [registration, setRegistration] = useState("");
  const [matchedVehicle, setMatchedVehicle] = useState(null);
  const [showUnregistered, setShowUnregistered] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const queryClient = useQueryClient();

  const { profile: user } = useAuth();

  // Load vehicles for all approved users (not just admins)
  const { data: vehicles = [], isLoading: vehiclesLoading, error: vehiclesError } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => fetchVehicles(),
    enabled: !!user && user.status === 'approved', // Allow all approved users to load vehicles
    refetchInterval: 60000,
  });

  console.log('QuickRegistrationLog - Vehicles query state:', {
    vehiclesCount: vehicles.length,
    isLoading: vehiclesLoading,
    error: vehiclesError,
    userRole: user?.role,
    userStatus: user?.status,
    enabled: !!user && user.status === 'approved'
  });

  const createLogMutation = useMutation({
    mutationFn: (logData) => createParkingLog(logData),
    onSuccess: () => {
      const regPlate = matchedVehicle?.registration_plate || registration.toUpperCase().trim();
      setSuccessMessage(`✓ ${regPlate} logged successfully!`);
      setRegistration("");
      setMatchedVehicle(null);
      setShowUnregistered(false);
      setTimeout(() => {
        setSuccessMessage("");
        queryClient.invalidateQueries({ queryKey: ['parkingLogs'] });
      }, 1500);
    },
    onError: (error) => {
      console.error("Failed to create log:", error);
      setErrorMessage(`Failed to log vehicle. ${error.message || 'Please try again or contact support.'}`);
      setTimeout(() => setErrorMessage(""), 5000);
    },
  });

  const handleSearch = () => {
    console.log('=== handleSearch called ===');
    console.log('Registration input:', registration);
    
    setErrorMessage("");
    setSuccessMessage("");
    setShowUnregistered(false);
    
    const searchTerm = registration.trim();
    console.log('Search term after trim:', searchTerm);
    
    if (!searchTerm) {
      console.log('No search term, returning');
      setErrorMessage("Please enter a registration plate");
      return;
    }

    // Check if vehicles are still loading
    if (vehiclesLoading) {
      setErrorMessage("Loading vehicles database...");
      return;
    }

    if (vehicles.length === 0) {
      setErrorMessage("Vehicles database is empty or not loaded. Please refresh the page.");
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    console.log('Searching for:', searchTerm, '(lowercase:', searchLower + ')');
    console.log('Vehicles loaded:', vehicles.length);
    console.log('Sample vehicles:', vehicles.slice(0, 5).map(v => ({
      reg: v.registration_plate,
      permit: v.permit_number,
      active: v.is_active
    })));

    // First, try exact registration match (case insensitive)
    let vehicle = vehicles.find(v => 
      v.registration_plate?.toLowerCase() === searchLower && v.is_active
    );

    console.log('Exact match found:', vehicle ? vehicle.registration_plate : 'none');

    // If no exact match, check for registrations with "/" separator (multiple registrations)
    // This handles cases like "191-MH-2848" matching "191-MH-2848 / 202-D-19949"
    if (!vehicle) {
      const searchUpper = searchTerm.toUpperCase().trim();
      
      vehicle = vehicles.find(v => {
        if (!v.is_active) return false;
        const regUpper = v.registration_plate?.toUpperCase() || '';
        
        // First, try substring match (like VehicleQuickSelect does)
        // This handles cases like "191-MH-2848" matching "191-MH-2848 / 202-D-19949"
        if (regUpper.includes(searchUpper)) {
          console.log('Substring match found:', v.registration_plate);
          return true;
        }
        
        // Also check if registration contains "/" and search term matches any part exactly
        // Split by "/" and also handle spaces around "/"
        // Example: "191-MH-2848 / 202-D-19949" or "191-MH-2848/202-D-19949"
        if (regUpper.includes('/')) {
          const regParts = regUpper
            .split(/\s*\/\s*/)  // Split by "/" with optional spaces
            .map(p => p.trim())
            .filter(p => p.length > 0);
          
          // Check if any part exactly matches the search term
          const partMatch = regParts.some(part => part === searchUpper);
          if (partMatch) {
            console.log('Part match found:', v.registration_plate, 'parts:', regParts);
          }
          return partMatch;
        }
        
        return false;
      });
      
      // If found a vehicle with multiple registrations, use it but update the registration
      if (vehicle) {
        console.log('Using vehicle with multiple registrations:', vehicle.registration_plate);
        vehicle = {
          ...vehicle,
          registration_plate: searchTerm.toUpperCase() // Use the searched registration
        };
      }
    }

    // If still no match, try permit number search
    if (!vehicle) {
      const matchingVehicles = vehicles
        .filter(v => v.is_active)
        .filter(v => {
          return v.permit_number?.toLowerCase().includes(searchLower);
        });
      
      if (matchingVehicles.length > 0) {
        vehicle = {
          ...matchingVehicles[0],
          registration_plate: searchTerm.toUpperCase()
        };
      }
    }

    // If still no match, check if search term matches a permit number exactly
    if (!vehicle) {
      const permitMatch = vehicles.find(v => 
        v.permit_number && 
        v.permit_number.trim().toUpperCase() === searchTerm.trim().toUpperCase() &&
        v.is_active
      );
      
      if (permitMatch) {
        vehicle = permitMatch;
      }
    }

    if (vehicle) {
      console.log('Vehicle found! Setting matched vehicle:', vehicle);
      setMatchedVehicle(vehicle);
      setShowUnregistered(false);
    } else {
      console.log('No vehicle found for:', searchTerm);
      console.log('All vehicles checked. Total active vehicles:', vehicles.filter(v => v.is_active).length);
      setMatchedVehicle(null);
      setShowUnregistered(true);
    }
  };

  const handleLog = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    
    if (!user || user.status !== 'approved') {
      setErrorMessage("You must have an approved account to log vehicles.");
      return;
    }

    if (matchedVehicle) {
      const logData = {
        registration_plate: matchedVehicle.registration_plate,
        parking_type: matchedVehicle.parking_type,
        notes: matchedVehicle.permit_number ? `Permit: ${matchedVehicle.permit_number}` : "No permit",
        log_date: format(new Date(), "yyyy-MM-dd"),
        log_time: format(new Date(), "HH:mm")
      };
      createLogMutation.mutate(logData);
    } else if (showUnregistered) {
      const logData = {
        registration_plate: registration.toUpperCase().trim(),
        parking_type: "Red",
        notes: "No permit - Unregistered vehicle",
        log_date: format(new Date(), "yyyy-MM-dd"),
        log_time: format(new Date(), "HH:mm")
      };
      createLogMutation.mutate(logData);
    }
  };

  const parkingColors = {
    Green: "bg-emerald-100 text-emerald-800",
    Yellow: "bg-amber-100 text-amber-800",
    Red: "bg-red-100 text-red-800"
  };

  return (
    <Card className="shadow-lg border-2 border-indigo-200 h-full w-full flex flex-col">
      <CardHeader className="pb-3 bg-indigo-50">
        <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Zap className="w-5 h-5 text-indigo-600" />
          Vehicle Registration Log
        </CardTitle>
        <p className="text-sm text-slate-600 mt-1">
          Enter registration to auto-log with permit details
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pt-4 flex-1">
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
          {!vehiclesLoading && vehicles.length === 0 && (
            <div className="text-sm text-red-500 text-center py-2 border border-red-200 bg-red-50 rounded p-2">
              ⚠️ Vehicles database not loaded ({vehicles.length} vehicles). Please refresh the page.
            </div>
          )}
          {!vehiclesLoading && vehicles.length > 0 && (
            <div className="text-xs text-slate-500 text-center py-1">
              ✓ {vehicles.length} vehicles loaded - ready to search
            </div>
          )}
          {!vehiclesLoading && vehicles.length > 0 && (
            <div className="text-xs text-slate-500 text-center py-1">
              ✓ {vehicles.length} vehicles loaded - ready to search
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
              onClick={() => {
                alert('Search button clicked! Searching for: ' + registration);
                handleSearch();
              }}
              variant="outline"
              className="shrink-0"
            >
              Search
            </Button>
          </div>

          {matchedVehicle && (
            <div className="space-y-3">
              <div className="p-4 border-2 border-indigo-200 rounded-lg bg-white space-y-3">
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
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-6 text-base"
              >
                {createLogMutation.isPending ? "Logging..." : `Log ${matchedVehicle.parking_type} Permit Now`}
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
                {createLogMutation.isPending ? "Logging..." : "Log Unregistered Vehicle"}
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

