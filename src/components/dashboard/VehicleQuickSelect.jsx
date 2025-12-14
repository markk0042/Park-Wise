import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Zap, Tag, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { fetchVehicles } from "@/api";

export default function VehicleQuickSelect({ onSelectVehicle }) {
  const [searchTerm, setSearchTerm] = useState("");
  const { profile: currentUser } = useAuth();

  const { data: vehicles = [], isLoading, error } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => fetchVehicles(),
    enabled: currentUser?.role === 'admin' && currentUser?.status === 'approved',
    refetchInterval: 60000,
  });

  // Security check: Only show for admins
  if (!currentUser || currentUser.role !== 'admin' || currentUser.status !== 'approved') {
    return null;
  }

  const filteredVehicles = vehicles
    .filter(v => v.is_active)
    .filter(vehicle => {
      const search = searchTerm.toLowerCase().trim();
      if (!search) return false;
      
      return (
        (vehicle.registration_plate?.toLowerCase().includes(search)) ||
        (vehicle.permit_number?.toLowerCase().includes(search))
      );
    })
    .slice(0, 8);

  const parkingColors = {
    Green: "bg-emerald-100 text-emerald-800",
    Yellow: "bg-amber-100 text-amber-800",
    Red: "bg-red-100 text-red-800"
  };

  return (
    <Card className="shadow-lg border-2 border-blue-200 h-full w-full flex flex-col">
      <CardHeader className="pb-3 bg-blue-50">
        <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-600" />
          Registration Quick Search
          {vehicles.length > 0 && (
            <Badge variant="outline" className="text-xs font-normal ml-2">
              {vehicles.length} vehicles
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-slate-600 mt-1">
          Search registered vehicles by plate or permit number
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pt-4 flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by registration or permit number..."
            className="pl-10"
          />
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-4 text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Loading vehicles...
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 text-center py-4">
            Error loading vehicles. Please refresh the page.
          </div>
        )}

        {!isLoading && vehicles.length === 0 && (
          <div className="text-sm text-slate-500 text-center py-4">
            No vehicles in database. Add vehicles in the Vehicle Database page.
          </div>
        )}

        {searchTerm && filteredVehicles.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredVehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => {
                  onSelectVehicle(vehicle);
                  setSearchTerm("");
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-mono font-bold text-slate-900 flex items-center gap-2">
                      {vehicle.registration_plate}
                      {vehicle.permit_number && (
                        <Badge variant="outline" className="text-xs font-normal">
                          <Tag className="w-3 h-3 mr-1" />
                          {vehicle.permit_number}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge className={`${parkingColors[vehicle.parking_type]} text-xs ml-2`}>
                    {vehicle.parking_type}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {searchTerm && !isLoading && filteredVehicles.length === 0 && vehicles.length > 0 && (
          <p className="text-sm text-slate-500 text-center py-4">
            No vehicles found matching "{searchTerm}"
          </p>
        )}

        {!searchTerm && vehicles.length > 0 && (
          <p className="text-xs text-slate-500 text-center py-2">
            {vehicles.length} vehicles in database - enter registration to search
          </p>
        )}
      </CardContent>
    </Card>
  );
}