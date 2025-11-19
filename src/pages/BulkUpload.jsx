import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, CheckCircle, AlertCircle, FileSpreadsheet, Download, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { bulkInsertVehicles } from "@/api";
import { autoAssignParkingType } from "@/utils/permitUtils";

export default function BulkUpload() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [errors, setErrors] = useState([]);
  const queryClient = useQueryClient();
  const { profile: user } = useAuth();

  const parseCsv = (text) => {
    const rows = text.trim().split(/\r?\n/).filter(Boolean);
    if (rows.length <= 1) return [];
    
    // Parse header row - handle quoted fields
    const parseRow = (row) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };
    
    const headers = parseRow(rows[0]).map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());
    
    // Normalize header names (handle variations)
    const normalizedHeaders = headers.map(h => {
      const normalized = h.replace(/[_\s-]/g, '_').toLowerCase();
      if (normalized.includes('registration') || normalized.includes('plate') || normalized.includes('reg')) {
        return 'registration_plate';
      }
      if (normalized.includes('permit')) {
        return 'permit_number';
      }
      if (normalized.includes('parking') || normalized.includes('type') || normalized.includes('color')) {
        return 'parking_type';
      }
      return normalized;
    });
    
    return rows.slice(1).map((row) => {
      const values = parseRow(row).map((value) => value.replace(/^"|"$/g, '').trim());
      const record = {};
      normalizedHeaders.forEach((header, index) => {
        record[header] = values[index] ?? "";
      });
      return record;
    });
  };

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      setUploadStatus("uploading");
      setErrors([]);

      if (!file.name.endsWith('.csv')) {
        throw new Error("Only CSV files are supported for bulk upload.");
      }

      const text = await file.text();
      const parsedRows = parseCsv(text);

      if (parsedRows.length === 0) {
        throw new Error("No rows detected. Ensure the CSV includes a header row and at least one vehicle.");
      }

      setUploadStatus("processing");
      
      // Validate that we have registration_plate column
      if (parsedRows.length > 0 && !parsedRows[0].registration_plate) {
        const foundColumns = Object.keys(parsedRows[0]).join(', ');
        throw new Error(`Missing required column 'registration_plate'. Found columns: ${foundColumns || 'none'}. Please ensure your CSV has a header row with 'registration_plate' (or variations like 'Registration Plate', 'Reg Plate', etc.).`);
      }
      
      const normalizedVehicles = parsedRows
        .filter(v => v.registration_plate && v.registration_plate.trim()) // Filter out empty rows
        .map(v => {
          const vehicleData = {
            registration_plate: v.registration_plate?.toUpperCase().trim(),
            permit_number: v.permit_number?.toUpperCase().trim() || "",
            country: v.country?.trim() || "Ireland",
            parking_type: v.parking_type?.trim() || "", // Will be auto-assigned if empty
            notes: v.notes?.trim() || "",
            is_active: true
          };
          // Auto-assign parking type based on permit number
          return autoAssignParkingType(vehicleData);
        });

      if (normalizedVehicles.length === 0) {
        throw new Error("No valid vehicles found. Ensure your CSV has at least one row with a registration_plate value.");
      }

      setUploadStatus("saving");
      await bulkInsertVehicles(normalizedVehicles);
      
      return { count: normalizedVehicles.length };
    },
    onSuccess: (data) => {
      setUploadStatus("success");
      setUploadedCount(data.count);
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setSelectedFile(null);
    },
    onError: (error) => {
      setUploadStatus("error");
      setErrors([error.message]);
    },
  });

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadStatus(null);
      setErrors([]);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const downloadTemplate = () => {
    const template = `registration_plate,permit_number,country,parking_type,notes
231-D-12345,00001,Ireland,Green,Example note
241-D-67890,00002,Ireland,Yellow,
25-C-54321,00003,UK,Green,`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "vehicle-upload-template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 flex items-center gap-2 md:gap-3 flex-wrap">
            <Upload className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 shrink-0" />
            Bulk Vehicle Upload
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-slate-600 mt-1">
            Upload registrations and permit numbers only (GDPR compliant)
          </p>
        </div>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="px-4 sm:px-5 md:px-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-blue-900">
              <FileSpreadsheet className="w-4 h-4 md:w-5 md:h-5" />
              How to Upload
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs sm:text-sm text-blue-900 px-4 sm:px-5 md:px-6">
            <div className="space-y-2">
              <p className="font-semibold">📋 Required Columns:</p>
              <ul className="list-disc list-inside space-y-1 ml-2 text-xs sm:text-sm">
                <li><strong>registration_plate</strong> - Vehicle registration (required)</li>
                <li><strong>permit_number</strong> - Permit number (e.g., 00001)</li>
                <li><strong>country</strong> - Ireland, Northern Ireland, or UK (default: Ireland)</li>
                <li><strong>parking_type</strong> - Green, Yellow, or Red (default: Green)</li>
                <li><strong>notes</strong> - Any additional notes</li>
              </ul>
              <p className="text-xs mt-3 text-blue-700">
                🔒 <strong>GDPR Compliant:</strong> No personal data (names, companies, contractors) is stored
              </p>
            </div>
            <div className="pt-2">
              <Button
                onClick={downloadTemplate}
                variant="outline"
                className="bg-white hover:bg-blue-100 border-blue-300 text-xs sm:text-sm h-8 sm:h-9"
                size="sm"
              >
                <Download className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                Download CSV Template
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="px-4 sm:px-5 md:px-6">
            <CardTitle className="text-base sm:text-lg md:text-xl">Upload Spreadsheet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 sm:px-5 md:px-6">
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 md:p-8 text-center">
              <Upload className="w-10 h-10 md:w-12 md:h-12 mx-auto text-slate-400 mb-4" />
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer text-blue-600 hover:text-blue-700 font-semibold text-sm md:text-base"
              >
                Choose a file
              </label>
              <p className="text-xs sm:text-sm text-slate-500 mt-2">
                Supports CSV, Excel (.xlsx, .xls)
              </p>
              {selectedFile && (
                <div className="mt-4 p-3 bg-slate-100 rounded-lg inline-block">
                  <p className="text-xs sm:text-sm font-medium text-slate-900 break-all">
                    📄 {selectedFile.name}
                  </p>
                  <p className="text-xs text-slate-600">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              )}
            </div>

            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploadMutation.isPending}
              className="w-full bg-slate-900 hover:bg-slate-800 py-5 md:py-6 text-sm md:text-lg"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 md:w-5 md:h-5 mr-2 animate-spin" />
                  {uploadStatus === "uploading" && "Uploading file..."}
                  {uploadStatus === "processing" && "Processing data..."}
                  {uploadStatus === "saving" && "Saving vehicles..."}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                  Upload Vehicles
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {uploadStatus === "success" && (
          <Alert className="bg-emerald-50 border-emerald-200">
            <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-emerald-600" />
            <AlertDescription className="text-emerald-900 text-sm md:text-base">
              <strong>Success!</strong> {uploadedCount} vehicles have been added to the database.
            </AlertDescription>
          </Alert>
        )}

        {uploadStatus === "error" && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4 md:w-5 md:h-5" />
            <AlertDescription className="text-sm md:text-base">
              <strong>Upload Failed:</strong>
              <ul className="mt-2 list-disc list-inside">
                {errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}