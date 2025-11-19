import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Calendar, User, Building2, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createParkingLog } from "@/api";

export default function RegistrationSearch({ logs, currentUser }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const queryClient = useQueryClient();

  const isAdmin = currentUser?.role === 'admin';

  const createLogMutation = useMutation({
    mutationFn: (logData) => createParkingLog(logData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parkingLogs'] });
      setSuccessMessage("✓ Vehicle re-logged successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    },
  });

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const results = logs.filter(log => 
      log.registration_plate.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setSearchResults(results);
  };

  const handleQuickLog = (log) => {
    const newLog = {
      registration_plate: log.registration_plate,
      owner_name: log.owner_name,
      company: log.company,
      country: log.country,
      parking_type: log.parking_type,
      car_make: log.car_make,
      color: log.color,
      notes: `Re-logged from previous entry`,
      log_date: format(new Date(), "yyyy-MM-dd"),
      log_time: format(new Date(), "HH:mm")
    };
    createLogMutation.mutate(newLog);
  };

  const parkingBadges = {
    Green: "bg-emerald-100 text-emerald-800 border-emerald-300",
    Yellow: "bg-amber-100 text-amber-800 border-amber-300",
    Blue: "bg-blue-100 text-blue-800 border-blue-300"
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b border-slate-200 px-4 md:px-6">
        <CardTitle className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
          <Search className="w-4 h-4 md:w-5 md:h-5" />
          Quick Registration Search
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 md:pt-6 px-4 md:px-6">
        <div className="space-y-3 md:space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter registration..."
              className="text-base md:text-lg font-mono uppercase h-11 md:h-12"
            />
            <Button 
              onClick={handleSearch}
              className="bg-slate-900 hover:bg-slate-800 px-4 md:px-6 h-11 md:h-12 w-full sm:w-auto"
            >
              <Search className="w-4 h-4 md:w-5 md:h-5 sm:mr-2" />
              <span className="sm:inline">Search</span>
            </Button>
          </div>

          {successMessage && (
            <div className="p-2 md:p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span className="text-xs md:text-sm font-medium">{successMessage}</span>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-2 md:space-y-3">
              <p className="text-xs md:text-sm text-slate-600 font-medium">
                Found {searchResults.length} {searchResults.length === 1 ? 'entry' : 'entries'} for "{searchTerm}"
              </p>
              {searchResults.map((log) => (
                <Card key={log.id} className="border-2 hover:shadow-md transition-all">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-3 md:gap-4">
                      <div className="flex-1 space-y-2 md:space-y-3 w-full">
                        <div>
                          <p className="font-mono font-bold text-lg md:text-xl text-slate-900">
                            {log.registration_plate}
                          </p>
                          <Badge className={`${parkingBadges[log.parking_type]} border mt-1 text-xs`}>
                            {log.parking_type === "Green" && "Green Car Park"}
                            {log.parking_type === "Yellow" && "Yellow Car Park"}
                            {log.parking_type === "Blue" && "Blue (Unregistered)"}
                          </Badge>
                        </div>

                        {isAdmin && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 md:gap-2 text-xs md:text-sm">
                            {log.owner_name && (
                              <div className="flex items-center gap-2 text-slate-600">
                                <User className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 shrink-0" />
                                <span className="truncate">{log.owner_name}</span>
                              </div>
                            )}
                            {log.company && (
                              <div className="flex items-center gap-2 text-slate-600">
                                <Building2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 shrink-0" />
                                <span className="truncate">{log.company}</span>
                              </div>
                            )}
                            {log.car_make && (
                              <div className="flex items-center gap-2 text-slate-600">
                                <span className="font-semibold shrink-0">Make:</span>
                                <span className="truncate">{log.car_make}</span>
                              </div>
                            )}
                            {log.color && (
                              <div className="flex items-center gap-2 text-slate-600">
                                <span className="font-semibold shrink-0">Color:</span>
                                <span className="truncate">{log.color}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-slate-600">
                              <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 shrink-0" />
                              <span>{format(new Date(log.log_date), "MMM dd, yyyy")}</span>
                            </div>
                          </div>
                        )}

                        {isAdmin && log.notes && (
                          <p className="text-xs md:text-sm text-slate-600 italic truncate">
                            Note: {log.notes}
                          </p>
                        )}
                      </div>

                      {isAdmin && (
                        <Button
                          onClick={() => handleQuickLog(log)}
                          disabled={createLogMutation.isPending}
                          className="bg-emerald-600 hover:bg-emerald-700 shrink-0 w-full md:w-auto text-sm md:text-base"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Log Today
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {searchTerm && searchResults.length === 0 && (
            <div className="text-center py-6 md:py-8 text-slate-500">
              <p className="text-sm md:text-base">No entries found for "{searchTerm}"</p>
              <p className="text-xs md:text-sm mt-1">Try searching with a different registration plate</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}