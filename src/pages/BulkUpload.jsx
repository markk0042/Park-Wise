import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, CheckCircle, AlertCircle, FileSpreadsheet, Download, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { bulkUpsertVehicles } from "@/api";
import { autoAssignParkingType } from "@/utils/permitUtils";

export default function BulkUpload() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [updatedCount, setUpdatedCount] = useState(0);
  const [insertedCount, setInsertedCount] = useState(0);
  const [errors, setErrors] = useState([]);
  const queryClient = useQueryClient();
  const { profile: user } = useAuth();

  const parseCsv = (text) => {
    // Remove BOM (Byte Order Mark) if present
    let cleanText = text;
    if (text.charCodeAt(0) === 0xFEFF) {
      cleanText = text.slice(1);
    }
    
    // Split by various line ending formats
    let rows = cleanText
      .split(/\r\n|\r|\n/)
      .map(row => row.trim())
      .filter(row => row.length > 0); // Remove empty lines
    
    // Debug: log first few rows
    console.log('CSV parsing - First 5 rows:', rows.slice(0, 5));
    console.log('CSV parsing - Total rows:', rows.length);
    
    if (rows.length === 0) {
      throw new Error("CSV file appears to be empty. Please ensure your file contains data.");
    }
    
    if (rows.length === 1) {
      throw new Error("CSV file only contains a header row. Please add at least one data row.");
    }
    
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
    
    console.log('CSV parsing - Headers found:', headers);
    
    if (headers.length === 0) {
      throw new Error("Could not parse CSV headers. Please ensure your CSV has a header row.");
    }
    
    // Normalize header names (handle variations)
    const normalizedHeaders = headers.map(h => {
      // Remove periods and normalize
      const cleaned = h.replace(/\./g, '').replace(/[_\s-]/g, '_').toLowerCase();
      // Handle "Vehicle Reg", "Registration", "Reg Plate", etc.
      if (cleaned.includes('registration') || cleaned.includes('plate') || cleaned.includes('reg') || cleaned === 'vehicle_reg') {
        return 'registration_plate';
      }
      // Handle "Vehicle Permit no.", "Permit Number", "Permit", etc.
      if (cleaned.includes('permit') || cleaned.includes('permit_no') || cleaned.includes('permitnumber')) {
        return 'permit_number';
      }
      if (cleaned.includes('parking') || cleaned.includes('type') || cleaned.includes('color')) {
        return 'parking_type';
      }
      return cleaned;
    });
    
    console.log('CSV parsing - Normalized headers:', normalizedHeaders);
    
    const dataRows = rows.slice(1)
      .map((row, rowIndex) => {
        const values = parseRow(row).map((value) => {
          // Clean up values: remove quotes, trim, and handle leading slashes/spaces
          let cleaned = value.replace(/^"|"$/g, '').trim();
          // Handle cases like " /161-D-40014" -> "161-D-40014"
          cleaned = cleaned.replace(/^[/\s]+/, '').trim();
          return cleaned;
        });
        const record = {};
        normalizedHeaders.forEach((header, index) => {
          record[header] = values[index] ?? "";
        });
        
        // Debug first few rows
        if (rowIndex < 3) {
          console.log(`CSV parsing - Row ${rowIndex + 1}:`, {
            raw: row,
            values: values,
            record: record
          });
        }
        
        return record;
      })
      .filter(record => {
        // Filter out rows with no registration plate (required field)
        const hasRegistration = record.registration_plate && record.registration_plate.trim().length > 0;
        // Also filter out completely empty rows
        const hasAnyData = Object.values(record).some(val => val && val.trim().length > 0);
        
        if (!hasRegistration && hasAnyData) {
          console.log('CSV parsing - Filtered out row (no registration):', record);
        }
        
        return hasRegistration && hasAnyData;
      });
    
    console.log('CSV parsing - Data rows after filtering:', dataRows.length);
    console.log('CSV parsing - First 3 data rows:', dataRows.slice(0, 3));
    
    if (dataRows.length === 0 && rows.length > 1) {
      // Show sample of what was parsed to help debug
      const sampleRecords = rows.slice(1, 4).map((row, idx) => {
        const values = parseRow(row).map(v => v.trim());
        const record = {};
        normalizedHeaders.forEach((header, index) => {
          record[header] = values[index] ?? "";
        });
        return { row: idx + 1, raw: row.substring(0, 50), parsed: record };
      });
      console.log('CSV parsing - Sample of parsed records (before filtering):', sampleRecords);
    }
    
    return dataRows;
  };

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      setUploadStatus("uploading");
      setErrors([]);

      // Check file extension
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith('.csv') && !fileName.endsWith('.txt')) {
        throw new Error("Only CSV files are supported. Please save your Excel file as CSV (File → Save As → CSV).");
      }

      // Read file with UTF-8 encoding
      console.log('File upload started:', file.name, 'Size:', file.size, 'bytes');
      const text = await file.text();
      console.log('File read successfully. Text length:', text.length);
      console.log('First 500 characters of file:', text.substring(0, 500));
      
      if (!text || text.trim().length === 0) {
        console.error('File is empty or contains no text');
        throw new Error("The file appears to be empty. Please check your CSV file and try again.");
      }

      let parsedRows;
      try {
        console.log('Starting CSV parsing...');
        parsedRows = parseCsv(text);
        console.log('CSV parsing completed. Rows found:', parsedRows.length);
      } catch (parseError) {
        console.error('CSV parsing error:', parseError);
        console.error('Error stack:', parseError.stack);
        throw new Error(parseError.message || "Failed to parse CSV file. Please check the format and try again.");
      }

      if (parsedRows.length === 0) {
        // Get more details about what went wrong
        const textPreview = text.substring(0, 200);
        const lineCount = text.split(/\r\n|\r|\n/).filter(l => l.trim().length > 0).length;
        const firstLine = text.split(/\r\n|\r|\n/)[0] || '';
        
        console.error('No rows detected. Debug info:', {
          fileSize: text.length,
          lineCount: lineCount,
          firstLine: firstLine,
          textPreview: textPreview
        });
        
        throw new Error(
          `No data rows detected. ` +
          `File has ${lineCount} lines. ` +
          `First line: "${firstLine.substring(0, 50)}". ` +
          `Please ensure your CSV has a header row (e.g., "Vehicle Reg,Vehicle Permit no.") and at least one data row.`
        );
      }

      setUploadStatus("processing");
      
      // Validate that we have registration_plate column
      if (parsedRows.length > 0 && !parsedRows[0].registration_plate) {
        const foundColumns = Object.keys(parsedRows[0]).join(', ');
        const firstRowData = JSON.stringify(parsedRows[0]);
        console.error('Missing registration_plate column. Found:', {
          columns: foundColumns,
          firstRow: firstRowData,
          normalizedHeaders: normalizedHeaders
        });
        throw new Error(
          `Missing required column 'registration_plate'. ` +
          `Found columns: ${foundColumns || 'none'}. ` +
          `First row data: ${firstRowData}. ` +
          `Please ensure your CSV has a header row with 'Vehicle Reg' or 'registration_plate'.`
        );
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
      const result = await bulkUpsertVehicles(normalizedVehicles);
      
      return result;
    },
    onSuccess: (data) => {
      setUploadStatus("success");
      setUploadedCount(data.total || 0);
      setUpdatedCount(data.updated || 0);
      setInsertedCount(data.inserted || 0);
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setSelectedFile(null);
    },
    onError: (error) => {
      console.error('Upload mutation error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
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
            Upload or update registrations and permit numbers (GDPR compliant). Existing vehicles with the same registration plate will be updated.
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
              <strong>Success!</strong> Processed {uploadedCount} vehicles:
              <ul className="mt-2 list-disc list-inside space-y-1">
                {updatedCount > 0 && (
                  <li><strong>{updatedCount}</strong> existing vehicles updated</li>
                )}
                {insertedCount > 0 && (
                  <li><strong>{insertedCount}</strong> new vehicles added</li>
                )}
              </ul>
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