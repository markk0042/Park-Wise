import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { deleteAllVehicles as deleteAllVehiclesApi, fetchVehicles } from "@/api";

export default function DeleteAllVehicles() {
  const [status, setStatus] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();
  const { profile: user } = useAuth();

  const { data: vehicles = [], isLoading, refetch } = useQuery({
    queryKey: ['allVehicles'],
    queryFn: () => fetchVehicles(),
    enabled: user?.role === 'admin',
  });

  const handleDeleteAll = async () => {
    if (!window.confirm(`Are you sure you want to delete ALL ${vehicles.length} vehicles? This cannot be undone!`)) {
      return;
    }

    setIsDeleting(true);
    setStatus("Deleting all vehicles...");

    try {
      await deleteAllVehiclesApi();

      setStatus(`✓ Successfully deleted all ${vehicles.length} vehicles!`);
      queryClient.invalidateQueries({ queryKey: ['allVehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['greenVehicles'] });
      
      setTimeout(() => {
        refetch();
      }, 1000);
      
    } catch (error) {
      setStatus(`✗ Error: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Alert className="max-w-md">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription>Admin access required</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="mb-6 text-center">
          <h1 className="text-4xl font-bold text-slate-900">Delete All Vehicles</h1>
          <p className="text-slate-600 mt-1">Remove all registrations and permit data</p>
        </div>

        <Card className="shadow-lg border-2 border-red-200">
          <CardHeader className="pb-4 bg-red-50">
            <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Trash2 className="w-6 h-6 text-red-600" />
              All Vehicles
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {isLoading ? (
              <div className="flex items-center gap-2 text-slate-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading vehicles...
              </div>
            ) : (
              <>
                <Alert>
                  <AlertCircle className="h-5 w-5" />
                  <AlertDescription>
                    Found <strong>{vehicles.length}</strong> vehicles in the database
                  </AlertDescription>
                </Alert>

                <div className="bg-slate-100 p-4 rounded-lg">
                  <p className="text-sm text-slate-700 font-medium mb-2">Breakdown:</p>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li>• Green permits: {vehicles.filter(v => v.parking_type === "Green").length}</li>
                    <li>• Yellow permits: {vehicles.filter(v => v.parking_type === "Yellow").length}</li>
                    <li>• Red permits: {vehicles.filter(v => v.parking_type === "Red").length}</li>
                  </ul>
                </div>

                {status && (
                  <Alert className={status.startsWith('✓') ? 'bg-green-50 border-green-200' : status.startsWith('✗') ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}>
                    {status.startsWith('✓') ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : status.startsWith('✗') ? (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    ) : (
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    )}
                    <AlertDescription className="font-medium">{status}</AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleDeleteAll}
                  disabled={isDeleting || vehicles.length === 0}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-6 text-lg"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-5 h-5 mr-2" />
                      Delete All {vehicles.length} Vehicles
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}