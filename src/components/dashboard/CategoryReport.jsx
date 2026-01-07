import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ArrowLeft, Calendar, Clock, Download, Tag } from "lucide-react";

export default function CategoryReport({ logs, category, onBack, currentUser }) {
  // Filter for today's logs only
  const todayLogs = logs.filter(log => {
    const logDate = new Date(log.log_date);
    const today = new Date();
    return logDate.toDateString() === today.toDateString();
  });

  const filteredLogs = category === "all" 
    ? todayLogs 
    : todayLogs.filter(log => log.parking_type === category);

  const isAdmin = currentUser?.role === 'admin';

  const categoryTitles = {
    all: "All Parking Logs",
    Green: "Green Car Park - All Permits",
    Yellow: "Yellow Car Park - All Permits",
    Red: "Red (Unregistered) - All Permits"
  };

  const categoryColors = {
    all: "bg-slate-100 text-slate-800 border-slate-300",
    Green: "bg-emerald-100 text-emerald-800 border-emerald-300",
    Yellow: "bg-amber-100 text-amber-800 border-amber-300",
    Red: "bg-red-100 text-red-800 border-red-300",
    Visitor: "bg-purple-100 text-purple-800 border-purple-300"
  };

  const parkingBadges = {
    Green: "bg-emerald-100 text-emerald-800 border-emerald-300",
    Yellow: "bg-amber-100 text-amber-800 border-amber-300",
    Red: "bg-red-100 text-red-800 border-red-300",
    Visitor: "bg-purple-100 text-purple-800 border-purple-300"
  };

  // Helper function to extract and parse permit number for sorting
  const getPermitNumberForSort = (log) => {
    if (log.notes?.includes("Permit:")) {
      const permitStr = log.notes.replace("Permit: ", "").trim();
      // Try to extract numeric part for sorting
      const numMatch = permitStr.match(/\d+/);
      if (numMatch) {
        return parseInt(numMatch[0], 10);
      }
      return permitStr;
    } else if (log.notes?.includes("No permit")) {
      return 999999; // Put "No permit" at the end
    }
    return 999999; // Put entries without permits at the end
  };

  // Sort logs by permit number (lowest to highest)
  const sortedLogs = [...filteredLogs].sort((a, b) => {
    const permitA = getPermitNumberForSort(a);
    const permitB = getPermitNumberForSort(b);
    
    if (typeof permitA === 'number' && typeof permitB === 'number') {
      return permitA - permitB;
    }
    if (typeof permitA === 'number') return -1;
    if (typeof permitB === 'number') return 1;
    return String(permitA).localeCompare(String(permitB));
  });

  const downloadCSV = () => {
    if (!isAdmin) {
      console.warn("Non-admin users are not permitted to download full reports.");
      return;
    }

    // Category name
    const categoryName = category === "all" ? "All Categories" : 
                        category === "Green" ? "Green Car Park" :
                        category === "Yellow" ? "Yellow Car Park" : 
                        "Red (Unregistered)";

    // Prepare data rows matching Excel format
    const rows = sortedLogs.map(log => {
      let permitNumber = "Not Assigned";
      
      if (log.notes?.includes("Permit:")) {
        permitNumber = log.notes.replace("Permit: ", "");
      } else if (log.notes?.includes("No permit")) {
        permitNumber = "No Permit";
      } else if (log.parking_type === "Green" || log.parking_type === "Yellow") {
        permitNumber = "Assigned (No # Stored)";
      }
      
      // Format date as DD/MM/YY
      const formattedDate = format(new Date(log.log_date), "dd/MM/yy");
      
      // Return in format: Registration, empty, Permit, empty, Date
      // This matches the Excel layout: A=Registrations, C=Permits, E=DD/MM/YY
      return [
        log.registration_plate,  // Column A
        "",                       // Column B (empty)
        permitNumber,             // Column C
        "",                       // Column D (empty)
        formattedDate             // Column E
      ];
    });

    // Create CSV matching Excel layout
    const csvLines = [];
    
    // Row 1: Header "Car Park Report" centered (empty, empty, "Car Park Report", empty, empty)
    csvLines.push(`"","","Car Park Report","",""`);
    
    // Row 2: Subheadings with spacing (Registrations, empty, Permits, empty, DD/MM/YY)
    csvLines.push('"Registrations","","Permits","","DD/MM/YY"');
    
    // Data rows
    rows.forEach(row => {
      csvLines.push(row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","));
    });

    const csvContent = csvLines.join("\n");

    // Add BOM for better Excel compatibility
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Car_Park_Report_${category}_${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getColSpan = () => {
    if (isAdmin) {
      return category === "all" ? 6 : 5;
    } else {
      return category === "all" ? 3 : 2;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        <div className="flex items-center gap-3 md:gap-4">
          <Button
            onClick={onBack}
            variant="outline"
            className="gap-2 text-sm md:text-base h-9 md:h-10"
          >
            <ArrowLeft className="w-3 h-3 md:w-4 md:h-4" />
            Back to Dashboard
          </Button>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="border-b border-slate-200 px-3 sm:px-4 md:px-6 py-3 md:py-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4">
              <div>
                <CardTitle className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 mb-2">
                  {categoryTitles[category]}
                </CardTitle>
                <Badge className={`${categoryColors[category]} border text-xs sm:text-sm md:text-base px-2 py-0.5 md:px-3 md:py-1`}>
                  {sortedLogs.length} {sortedLogs.length === 1 ? 'Permit' : 'Permits'} Logged
                </Badge>
                <p className="text-xs text-slate-600 mt-2">Sorted by permit number (lowest to highest)</p>
              </div>
              {isAdmin && (
                <Button
                  onClick={downloadCSV}
                  className="bg-slate-900 hover:bg-slate-800 gap-2 text-xs sm:text-sm md:text-base h-9 md:h-10"
                  disabled={sortedLogs.length === 0}
                >
                  <Download className="w-3 h-3 md:w-4 md:h-4" />
                  Download Formatted Report
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold text-xs md:text-sm px-2 sm:px-3 md:px-4">Registration Plate</TableHead>
                    {isAdmin && <TableHead className="font-semibold text-xs md:text-sm px-2 sm:px-3 md:px-4">Permit #</TableHead>}
                    {category === "all" && <TableHead className="font-semibold text-xs md:text-sm px-2 sm:px-3 md:px-4">Category</TableHead>}
                    {isAdmin && (
                      <>
                        <TableHead className="font-semibold text-xs md:text-sm px-2 sm:px-3 md:px-4 hidden lg:table-cell">Date</TableHead>
                        <TableHead className="font-semibold text-xs md:text-sm px-2 sm:px-3 md:px-4 hidden lg:table-cell">Time</TableHead>
                        <TableHead className="font-semibold text-xs md:text-sm px-2 sm:px-3 md:px-4 hidden xl:table-cell">Notes</TableHead>
                      </>
                    )}
                    {!isAdmin && <TableHead className="font-semibold text-xs md:text-sm px-2 sm:px-3 md:px-4">Parking Status</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={getColSpan()} className="text-center py-8 md:py-12 text-slate-500">
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-sm md:text-lg font-medium">No permits logged yet</p>
                          <p className="text-xs md:text-sm">Start logging vehicles to see them here</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedLogs.map((log) => {
                      let permitNumber = "-";
                      let displayNotes = log.notes || "-";
                      
                      if (log.notes?.includes("Permit:")) {
                        permitNumber = log.notes.replace("Permit: ", "");
                        displayNotes = "-";
                      } else if (log.notes?.includes("No permit")) {
                        permitNumber = "No permit";
                      }
                      
                      return (
                        <TableRow key={log.id} className="hover:bg-slate-50 transition-colors">
                          <TableCell className="font-mono font-bold text-sm sm:text-base md:text-lg px-2 sm:px-3 md:px-4">
                            {log.registration_plate}
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="px-2 sm:px-3 md:px-4">
                              {permitNumber !== "-" ? (
                                permitNumber === "No permit" ? (
                                  <Badge className="bg-red-100 text-red-800 border-red-300 text-[10px] sm:text-xs">
                                    <Tag className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 mr-1" />
                                    No permit
                                  </Badge>
                                ) : (
                                  <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-mono">
                                    <Tag className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-slate-400" />
                                    {permitNumber}
                                  </div>
                                )
                              ) : (
                                <span className="text-slate-400 text-xs sm:text-sm">-</span>
                              )}
                            </TableCell>
                          )}
                          {category === "all" && (
                            <TableCell className="px-2 sm:px-3 md:px-4">
                              <Badge className={`${parkingBadges[log.parking_type]} border font-semibold text-[10px] sm:text-xs`}>
                                {log.parking_type === "Green" && "Green Car Park"}
                                {log.parking_type === "Yellow" && "Yellow Car Park"}
                                {log.parking_type === "Red" && "Unregistered"}
                                {log.parking_type === "Visitor" && "Visitor Parking"}
                              </Badge>
                            </TableCell>
                          )}
                          {isAdmin && (
                            <>
                              <TableCell className="px-2 sm:px-3 md:px-4 hidden lg:table-cell">
                                <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                                  <Calendar className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-slate-400" />
                                  {format(new Date(log.log_date), "MMM dd, yyyy")}
                                </div>
                              </TableCell>
                              <TableCell className="px-2 sm:px-3 md:px-4 hidden lg:table-cell">
                                <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-slate-600">
                                  <Clock className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-slate-400" />
                                  {log.log_time}
                                </div>
                              </TableCell>
                              <TableCell className="px-2 sm:px-3 md:px-4 hidden xl:table-cell text-xs sm:text-sm text-slate-600 max-w-xs truncate">
                                {displayNotes}
                              </TableCell>
                            </>
                          )}
                          {!isAdmin && (
                            <TableCell className="px-2 sm:px-3 md:px-4">
                              <Badge className={`${parkingBadges[log.parking_type]} border font-semibold text-[10px] sm:text-xs`}>
                                {log.parking_type === "Green" && "Green Car Park"}
                                {log.parking_type === "Yellow" && "Yellow Car Park"}
                                {log.parking_type === "Red" && "Unregistered"}
                                {log.parking_type === "Visitor" && "Visitor Parking"}
                              </Badge>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
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