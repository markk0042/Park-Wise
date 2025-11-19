import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import VehicleQuickSelect from "../components/dashboard/VehicleQuickSelect";
import { createParkingLog } from "@/api";

export default function VehicleLogEntry() {
  const [formData, setFormData] = useState({
    registration_plate: "",
    parking_type: "Green",
    notes: "",
    log_date: format(new Date(), "yyyy-MM-dd"),
    log_time: format(new Date(), "HH:mm")
  });
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const queryClient = useQueryClient();

  useEffect(() => {
    const intervalId = setInterval(() => {
      setFormData(prevData => ({
        ...prevData,
        log_date: format(new Date(), "yyyy-MM-dd"),
        log_time: format(new Date(), "HH:mm")
      }));
    }, 60000);

    return () => clearInterval(intervalId);
  }, []);

  const createLogMutation = useMutation({
    mutationFn: (logData) => createParkingLog(logData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parkingLogs'] });
      setSuccessMessage("✓ Vehicle logged successfully!");
      setErrorMessage("");
      setFormData({
        registration_plate: "",
        parking_type: "Green",
        notes: "",
        log_date: format(new Date(), "yyyy-MM-dd"),
        log_time: format(new Date(), "HH:mm")
      });
      setTimeout(() => setSuccessMessage(""), 3000);
    },
    onError: (error) => {
      console.error("Failed to create log:", error);
      setErrorMessage(`Failed to log vehicle: ${error.message || 'Please check your permissions and try again'}`);
      setTimeout(() => setErrorMessage(""), 5000);
    },
  });

  const handleSelectVehicle = (vehicle) => {
    setFormData({
      ...formData,
      registration_plate: vehicle.registration_plate,
      parking_type: vehicle.parking_type || "Green",
      notes: vehicle.notes || "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createLogMutation.mutate(formData);
  };

  const parkingColors = {
    Green: "bg-emerald-50 border-emerald-200",
    Yellow: "bg-amber-50 border-amber-200",
    Red: "bg-red-50 border-red-200"
  };

  return (
    <div className="min-h-screen bg-slate-50 p-3 md:p-8">
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
        <div className="mb-4 md:mb-6 text-center">
          <h1 className="text-2xl md:text-4xl font-bold text-slate-900">Vehicle Log Entry</h1>
          <p className="text-sm md:text-base text-slate-600 mt-1">Log a vehicle to the parking system (GDPR compliant)</p>
        </div>

        {successMessage && (
          <div className="p-3 md:p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 text-sm md:text-base">
            <CheckCircle className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 md:p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800 text-sm md:text-base">
            <CheckCircle className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        <VehicleQuickSelect onSelectVehicle={handleSelectVehicle} />

        <Card className={`shadow-lg border-2 transition-all duration-300 ${parkingColors[formData.parking_type]}`}>
          <CardHeader className="pb-3 md:pb-4 px-4 md:px-6">
            <CardTitle className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 md:w-6 md:h-6" />
              New Vehicle Entry
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="registration_plate" className="font-semibold text-sm md:text-base">
                    Registration Plate *
                  </Label>
                  <Input
                    id="registration_plate"
                    value={formData.registration_plate}
                    onChange={(e) => setFormData({...formData, registration_plate: e.target.value.toUpperCase()})}
                    placeholder="e.g., 231-D-12345"
                    required
                    className="text-base md:text-lg font-mono uppercase h-11 md:h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parking_type" className="font-semibold text-sm md:text-base">Parking Category *</Label>
                  <Select
                    value={formData.parking_type}
                    onValueChange={(value) => setFormData({...formData, parking_type: value})}
                  >
                    <SelectTrigger className="h-11 md:h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Green">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-emerald-500" />
                          Green Car Park
                        </div>
                      </SelectItem>
                      <SelectItem value="Yellow">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-amber-500" />
                          Yellow Car Park
                        </div>
                      </SelectItem>
                      <SelectItem value="Red">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500" />
                          Red (Unregistered)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="log_time" className="font-semibold text-sm md:text-base">Time</Label>
                  <Input
                    id="log_time"
                    type="time"
                    value={formData.log_time}
                    onChange={(e) => setFormData({...formData, log_time: e.target.value})}
                    className="h-11 md:h-12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="font-semibold text-sm md:text-base">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Any additional observations..."
                  rows={3}
                  className="text-sm md:text-base"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-5 md:py-6 text-base md:text-lg"
                disabled={createLogMutation.isPending}
              >
                {createLogMutation.isPending ? "Logging..." : "Log Vehicle"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}