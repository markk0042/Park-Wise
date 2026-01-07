import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Search, Edit, Trash2, CheckCircle, XCircle, Database, Tag, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { createVehicle, deleteVehicle, fetchVehicles, updateVehicle, updateAllParkingTypes } from "@/api";
import { getParkingTypeFromPermit, autoAssignParkingType } from "@/utils/permitUtils";

export default function VehicleDatabase() {
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedColor, setSelectedColor] = useState("Green");
  const [selectedRange, setSelectedRange] = useState("00001-00100");
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    registration_plate: "",
    permit_number: "",
    parking_type: "Green",
    notes: "",
    is_active: true
  });

  const { profile: user } = useAuth();

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => fetchVehicles("permit_number"),
    enabled: user?.role === 'admin',
    refetchInterval: 60000,
    // Force fresh data - bypass cache
    staleTime: 0,
    cacheTime: 0,
  });

  // Debug: Log vehicle count to verify backend is returning all vehicles
  React.useEffect(() => {
    if (vehicles.length > 0) {
      console.log(`[VehicleDatabase] Total vehicles loaded: ${vehicles.length}`);
      console.log(`[VehicleDatabase] Green: ${vehicles.filter(v => v.parking_type === "Green").length}, Yellow: ${vehicles.filter(v => v.parking_type === "Yellow").length}, Red: ${vehicles.filter(v => v.parking_type === "Red").length}`);
    }
  }, [vehicles]);

  const createVehicleMutation = useMutation({
    mutationFn: (vehicleData) => createVehicle(vehicleData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setSuccessMessage("✓ Vehicle added successfully!");
      setErrorMessage("");
      resetForm();
      setTimeout(() => setSuccessMessage(""), 3000);
    },
    onError: (error) => {
      console.error("Failed to create vehicle:", error);
      setErrorMessage(`Failed to add vehicle: ${error.message || 'Please try again'}`);
      setTimeout(() => setErrorMessage(""), 5000);
    },
  });

  const updateVehicleMutation = useMutation({
    mutationFn: ({ id, data }) => updateVehicle(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setSuccessMessage("✓ Vehicle updated successfully!");
      setErrorMessage("");
      resetForm();
      setTimeout(() => setSuccessMessage(""), 3000);
    },
    onError: (error) => {
      console.error("Failed to update vehicle:", error);
      setErrorMessage(`Failed to update vehicle: ${error.message || 'Please try again'}`);
      setTimeout(() => setErrorMessage(""), 5000);
    },
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: (id) => deleteVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setSuccessMessage("✓ Vehicle deleted successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    },
  });

  const updateParkingTypesMutation = useMutation({
    mutationFn: () => updateAllParkingTypes(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setSuccessMessage(`✓ Updated ${data.updated} of ${data.total} vehicles based on permit numbers!`);
      setTimeout(() => setSuccessMessage(""), 5000);
    },
    onError: (error) => {
      console.error("Failed to update parking types:", error);
      setErrorMessage(`Failed to update parking types: ${error.message || 'Please try again'}`);
      setTimeout(() => setErrorMessage(""), 5000);
    },
  });

  const resetForm = () => {
    setFormData({
      registration_plate: "",
      permit_number: "",
      parking_type: "Green",
      notes: "",
      is_active: true
    });
    setShowForm(false);
    setEditingVehicle(null);
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      registration_plate: vehicle.registration_plate,
      permit_number: vehicle.permit_number || "",
      parking_type: vehicle.parking_type || "Green",
      notes: vehicle.notes || "",
      is_active: vehicle.is_active ?? true
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Auto-assign parking type based on permit number if not explicitly set
    const vehicleData = autoAssignParkingType(formData);
    if (editingVehicle) {
      updateVehicleMutation.mutate({ id: editingVehicle.id, data: vehicleData });
    } else {
      createVehicleMutation.mutate(vehicleData);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this vehicle?")) {
      deleteVehicleMutation.mutate(id);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 md:p-6">
        <Alert className="max-w-md">
          <AlertDescription className="text-base md:text-lg">
            You don't have permission to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Filter by color and range
  const colorFilteredVehicles = vehicles.filter(vehicle => 
    vehicle.parking_type === selectedColor
  );

  // Generate ranges dynamically - only show ranges in batches of 100 that have vehicles
  const permitNumbers = colorFilteredVehicles
    .map(v => parseInt(v.permit_number))
    .filter(n => !isNaN(n))
    .sort((a, b) => a - b);
  
  // Determine the starting point based on color
  // Green permits: start from 1
  // Yellow permits: start from 602 (00602)
  const minPermit = permitNumbers.length > 0 ? Math.min(...permitNumbers) : (selectedColor === "Yellow" ? 602 : 1);
  const maxPermit = permitNumbers.length > 0 ? Math.max(...permitNumbers) : (selectedColor === "Yellow" ? 700 : 100);
  
  // Start from the minimum permit, rounded down to nearest 100
  const startFrom = Math.floor(minPermit / 100) * 100 + 1;
  const endAt = Math.ceil(maxPermit / 100) * 100;
  
  const ranges = [];
  for (let i = startFrom; i <= endAt; i += 100) {
    const rangeStart = i;
    const rangeEnd = Math.min(i + 99, endAt);
    
    // Only include ranges that actually have vehicles in this range
    const hasVehicles = permitNumbers.some(perm => perm >= rangeStart && perm <= rangeEnd);
    
    if (hasVehicles) {
      const start = String(rangeStart).padStart(5, '0');
      const end = String(rangeEnd).padStart(5, '0');
      ranges.push(`${start}-${end}`);
    }
  }
  
  // If no ranges found, show at least one default range
  if (ranges.length === 0) {
    const defaultStart = selectedColor === "Yellow" ? 602 : 1;
    ranges.push(`${String(defaultStart).padStart(5, '0')}-${String(defaultStart + 99).padStart(5, '0')}`);
  }

  // Parse selected range
  const [rangeStart, rangeEnd] = selectedRange.split('-').map(n => parseInt(n));

  const filteredVehicles = colorFilteredVehicles.filter(vehicle => {
    // Search filter
    const matchesSearch = vehicle.registration_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.permit_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    // Range filter
    if (vehicle.permit_number) {
      const permitNum = parseInt(vehicle.permit_number);
      if (!isNaN(permitNum)) {
        return permitNum >= rangeStart && permitNum <= rangeEnd;
      }
    }
    return true;
  });

  const parkingColors = {
    Green: "bg-emerald-100 text-emerald-800",
    Yellow: "bg-amber-100 text-amber-800",
    Red: "bg-red-100 text-red-800"
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        <div className="flex flex-col items-center justify-center gap-3 md:gap-4 mb-6 md:mb-8">
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 flex items-center justify-center gap-2 md:gap-3">
              <Database className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
              Vehicle Database
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-slate-600 mt-1">
              Store permit numbers and registrations (GDPR compliant)
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              onClick={() => {
                resetForm();
                setShowForm(!showForm);
              }}
              className="bg-slate-900 hover:bg-slate-800 w-full sm:w-auto text-sm md:text-base"
            >
              <PlusCircle className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              Add Vehicle
            </Button>
            <Button
              onClick={() => {
                if (window.confirm("This will update all vehicles' parking types based on their permit numbers.\n\nPermits >= 00602 will be set to Yellow.\nPermits < 00602 will be set to Green.\n\nContinue?")) {
                  updateParkingTypesMutation.mutate();
                }
              }}
              disabled={updateParkingTypesMutation.isPending}
              variant="outline"
              className="w-full sm:w-auto text-sm md:text-base border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <RefreshCw className={`w-4 h-4 md:w-5 md:h-5 mr-2 ${updateParkingTypesMutation.isPending ? 'animate-spin' : ''}`} />
              {updateParkingTypesMutation.isPending ? 'Updating...' : 'Update Permit Colors'}
            </Button>
          </div>
        </div>

        {successMessage && (
          <div className="p-3 md:p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800">
            <CheckCircle className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
            <span className="font-medium text-sm md:text-base">{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 md:p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
            <XCircle className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
            <span className="font-medium text-sm md:text-base">{errorMessage}</span>
          </div>
        )}

        <Card className="shadow-lg border-2 border-slate-200">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 sm:px-5 md:px-6">
            <CardTitle className="text-base sm:text-lg md:text-xl font-bold text-slate-900">
              Total Vehicle Count
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 md:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
              <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                <p className="text-xs md:text-sm text-blue-700 font-semibold mb-1">Total Registrations</p>
                <p className="text-2xl md:text-4xl font-bold text-blue-900">{vehicles.length}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
                <p className="text-xs md:text-sm text-purple-700 font-semibold mb-1">Total Permits</p>
                <p className="text-2xl md:text-4xl font-bold text-purple-900">
                  {new Set(vehicles.filter(v => v.permit_number).map(v => v.permit_number)).size}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
              <div className="bg-emerald-50 p-3 md:p-4 rounded-lg border-2 border-emerald-200">
                <p className="text-xs md:text-sm text-emerald-700 font-semibold mb-1">Green Permits</p>
                <p className="text-xl md:text-3xl font-bold text-emerald-900">
                  {vehicles.filter(v => v.parking_type === "Green").length}
                </p>
              </div>
              <div className="bg-amber-50 p-3 md:p-4 rounded-lg border-2 border-amber-200">
                <p className="text-xs md:text-sm text-amber-700 font-semibold mb-1">Yellow Permits</p>
                <p className="text-xl md:text-3xl font-bold text-amber-900">
                  {vehicles.filter(v => v.parking_type === "Yellow").length}
                </p>
              </div>
              <div className="bg-red-50 p-3 md:p-4 rounded-lg border-2 border-red-200">
                <p className="text-xs md:text-sm text-red-700 font-semibold mb-1">Red (Unregistered)</p>
                <p className="text-xl md:text-3xl font-bold text-red-900">
                  {vehicles.filter(v => v.parking_type === "Red").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {showForm && !editingVehicle && (
          <Card className="shadow-lg border-2 border-blue-200">
            <CardHeader className="bg-blue-50 px-4 sm:px-5 md:px-6">
              <CardTitle className="text-base sm:text-lg md:text-xl font-bold flex items-center gap-2">
                <Tag className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                Register New Vehicle
              </CardTitle>
              <p className="text-xs sm:text-sm text-slate-600 mt-2">
                Add registration plate, assign permit number, and select parking permit color
              </p>
            </CardHeader>
            <CardContent className="pt-4 md:pt-6 px-4 sm:px-5 md:px-6">
              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                <div className="space-y-4">
                  <h3 className="text-base md:text-lg font-semibold text-slate-900 border-b pb-2">Vehicle Information</h3>
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
                </div>

                <div className="space-y-4 bg-amber-50 p-3 md:p-4 rounded-lg border border-amber-200">
                  <h3 className="text-base md:text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Tag className="w-4 h-4 md:w-5 md:h-5 text-amber-600" />
                    Parking Permit Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="permit_number" className="font-semibold text-sm md:text-base">
                        Permit Number
                      </Label>
                      <Input
                        id="permit_number"
                        value={formData.permit_number}
                        onChange={(e) => {
                          const permitNumber = e.target.value.toUpperCase();
                          const autoParkingType = getParkingTypeFromPermit(permitNumber, formData.parking_type);
                          setFormData({
                            ...formData,
                            permit_number: permitNumber,
                            parking_type: autoParkingType
                          });
                        }}
                        placeholder="e.g., 00001 or P-12345"
                        className="text-base md:text-lg font-mono uppercase h-11 md:h-12"
                      />
                      <p className="text-xs text-slate-600">Optional - Leave blank if no permit assigned</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="parking_type" className="font-semibold text-sm md:text-base">
                        Parking Permit Color *
                      </Label>
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
                              <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-emerald-500 border-2 border-emerald-700" />
                              <span className="font-semibold">Green Permit</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="Yellow">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-amber-500 border-2 border-amber-700" />
                              <span className="font-semibold">Yellow Permit</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-600">Select the parking permit color for this vehicle</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-base md:text-lg font-semibold text-slate-900 border-b pb-2">Additional Details</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes" className="font-semibold text-sm md:text-base">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      placeholder="Any additional vehicle information..."
                      rows={3}
                      className="text-sm md:text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="is_active" className="font-semibold text-sm md:text-base">Status</Label>
                    <Select
                      value={formData.is_active ? "true" : "false"}
                      onValueChange={(value) => setFormData({...formData, is_active: value === "true"})}
                    >
                      <SelectTrigger className="h-11 md:h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">✓ Active</SelectItem>
                        <SelectItem value="false">✗ Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 md:gap-3 pt-4 border-t">
                  <Button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800 h-11 md:h-12 text-sm md:text-base">
                    Add Vehicle
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm} className="h-11 md:h-12 text-sm md:text-base">
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Dialog open={!!editingVehicle} onOpenChange={(open) => !open && resetForm()}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Tag className="w-6 h-6 text-blue-600" />
                Edit Vehicle
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
              <div className="space-y-4">
                <h3 className="text-base md:text-lg font-semibold text-slate-900 border-b pb-2">Vehicle Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="edit_registration_plate" className="font-semibold text-sm md:text-base">
                    Registration Plate *
                  </Label>
                  <Input
                    id="edit_registration_plate"
                    value={formData.registration_plate}
                    onChange={(e) => setFormData({...formData, registration_plate: e.target.value.toUpperCase()})}
                    placeholder="e.g., 231-D-12345"
                    required
                    className="text-base md:text-lg font-mono uppercase h-11 md:h-12"
                  />
                </div>
              </div>

              <div className="space-y-4 bg-amber-50 p-3 md:p-4 rounded-lg border border-amber-200">
                <h3 className="text-base md:text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Tag className="w-4 h-4 md:w-5 md:h-5 text-amber-600" />
                  Parking Permit Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_permit_number" className="font-semibold text-sm md:text-base">
                      Permit Number
                    </Label>
                    <Input
                      id="edit_permit_number"
                      value={formData.permit_number}
                      onChange={(e) => {
                        const permitNumber = e.target.value.toUpperCase();
                        const autoParkingType = getParkingTypeFromPermit(permitNumber, formData.parking_type);
                        setFormData({
                          ...formData,
                          permit_number: permitNumber,
                          parking_type: autoParkingType
                        });
                      }}
                      placeholder="e.g., 00001 or P-12345"
                      className="text-base md:text-lg font-mono uppercase h-11 md:h-12"
                    />
                    <p className="text-xs text-slate-600">Optional - Leave blank if no permit assigned</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit_parking_type" className="font-semibold text-sm md:text-base">
                      Parking Permit Color *
                    </Label>
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
                            <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-emerald-500 border-2 border-emerald-700" />
                            <span className="font-semibold">Green Permit</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="Yellow">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-amber-500 border-2 border-amber-700" />
                            <span className="font-semibold">Yellow Permit</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-600">Select the parking permit color for this vehicle</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-base md:text-lg font-semibold text-slate-900 border-b pb-2">Additional Details</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="edit_notes" className="font-semibold text-sm md:text-base">Notes (Optional)</Label>
                  <Textarea
                    id="edit_notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Any additional vehicle information..."
                    rows={3}
                    className="text-sm md:text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_is_active" className="font-semibold text-sm md:text-base">Status</Label>
                  <Select
                    value={formData.is_active ? "true" : "false"}
                    onValueChange={(value) => setFormData({...formData, is_active: value === "true"})}
                  >
                    <SelectTrigger className="h-11 md:h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">✓ Active</SelectItem>
                      <SelectItem value="false">✗ Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 md:gap-3 pt-4 border-t">
                <Button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800 h-11 md:h-12 text-sm md:text-base">
                  Update Vehicle
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} className="h-11 md:h-12 text-sm md:text-base">
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Card className="shadow-lg">
          <CardHeader className="border-b px-4 sm:px-5 md:px-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <CardTitle className="text-base sm:text-lg md:text-xl font-bold">
                Registered Vehicles ({filteredVehicles.length})
              </CardTitle>
              <div className="relative w-full sm:w-48 md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search vehicles..."
                  className="pl-9 md:pl-10 text-sm md:text-base h-9 md:h-10"
                />
              </div>
            </div>

            {/* Color Tabs */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedColor === "Green" ? "default" : "outline"}
                onClick={() => {
                  setSelectedColor("Green");
                  setSelectedRange("00001-00100");
                }}
                className={`flex items-center gap-2 ${selectedColor === "Green" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
              >
                <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-emerald-700" />
                Green Permits
              </Button>
              <Button
                variant={selectedColor === "Yellow" ? "default" : "outline"}
                onClick={() => {
                  setSelectedColor("Yellow");
                  // Set to first available range for Yellow (starting from 00602)
                  const yellowRanges = vehicles
                    .filter(v => v.parking_type === "Yellow" && v.permit_number)
                    .map(v => parseInt(v.permit_number))
                    .filter(n => !isNaN(n));
                  const firstYellowRange = yellowRanges.length > 0 
                    ? Math.floor(Math.min(...yellowRanges) / 100) * 100 + 1
                    : 602;
                  setSelectedRange(String(firstYellowRange).padStart(5, '0') + '-' + String(firstYellowRange + 99).padStart(5, '0'));
                }}
                className={`flex items-center gap-2 ${selectedColor === "Yellow" ? "bg-amber-600 hover:bg-amber-700" : ""}`}
              >
                <div className="w-3 h-3 rounded-full bg-amber-500 border-2 border-amber-700" />
                Yellow Permits
              </Button>
              <Button
                variant={selectedColor === "Red" ? "default" : "outline"}
                onClick={() => {
                  setSelectedColor("Red");
                  // Red = unregistered (usually no permit number), so range is less important
                  // Keep a default range for consistency but it won't filter out no-permit vehicles
                  setSelectedRange("00001-00100");
                }}
                className={`flex items-center gap-2 ${selectedColor === "Red" ? "bg-red-600 hover:bg-red-700" : ""}`}
              >
                <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-red-700" />
                Red / Unregistered
              </Button>
            </div>

            {/* Range Buttons */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-2">
              <span className="text-sm font-semibold text-slate-700 flex items-center">
                Permit Range:
              </span>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {ranges.map((range) => (
                  <Button
                    key={range}
                    size="sm"
                    variant={selectedRange === range ? "default" : "outline"}
                    onClick={() => setSelectedRange(range)}
                    className={selectedRange === range ? "bg-slate-900 hover:bg-slate-800" : ""}
                  >
                    {range}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold text-xs md:text-sm">Registration</TableHead>
                    <TableHead className="font-semibold text-xs md:text-sm">Permit #</TableHead>
                    <TableHead className="font-semibold text-xs md:text-sm">Permit Color</TableHead>
                    <TableHead className="font-semibold text-xs md:text-sm hidden lg:table-cell">Status</TableHead>
                    <TableHead className="font-semibold text-xs md:text-sm">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVehicles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 md:py-8 text-slate-500 text-sm">
                        No vehicles found. Add your first vehicle to get started!
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredVehicles.map((vehicle) => (
                      <TableRow key={vehicle.id} className="hover:bg-slate-50">
                        <TableCell className="font-mono font-semibold text-xs md:text-sm">
                          {vehicle.registration_plate}
                        </TableCell>
                        <TableCell className="font-mono text-xs md:text-sm">
                          {vehicle.permit_number ? (
                            <Badge variant="outline" className="font-mono text-xs">
                              <Tag className="w-3 h-3 mr-1" />
                              {vehicle.permit_number}
                            </Badge>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${parkingColors[vehicle.parking_type]} text-xs`}>
                            {vehicle.parking_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {vehicle.is_active ? (
                            <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-800 text-xs">
                              <XCircle className="w-3 h-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 md:gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(vehicle)}
                              className="h-8 w-8 p-0 md:h-9 md:w-auto md:px-3"
                            >
                              <Edit className="w-3 h-3 md:w-4 md:h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(vehicle.id)}
                              className="h-8 w-8 p-0 md:h-9 md:w-auto md:px-3"
                            >
                              <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}