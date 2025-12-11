import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { format, parseISO, startOfDay, endOfDay, eachDayOfInterval, isWithinInterval } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Calendar, TrendingUp, Download, Printer } from "lucide-react";
import { fetchParkingLogs } from "@/api";
import { useAuth } from "@/context/AuthContext";
import { safeFormatDate } from "@/lib/utils";

export default function TrendAnalysis() {
  const [startDate, setStartDate] = useState(format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const { profile: user } = useAuth();

  const { data: logs = [], isFetching } = useQuery({
    queryKey: ['parkingLogs'],
    queryFn: () => fetchParkingLogs(),
    enabled: !!user,
    refetchInterval: 60000,
  });

  // Filter logs by date range
  const filteredLogs = useMemo(() => {
    if (!logs || logs.length === 0) return [];
    
    const start = startOfDay(parseISO(startDate));
    const end = endOfDay(parseISO(endDate));
    
    return logs.filter(log => {
      const logDate = startOfDay(parseISO(log.log_date));
      return isWithinInterval(logDate, { start, end });
    });
  }, [logs, startDate, endDate]);

  // Prepare chart data - group by date and count by parking type
  const chartData = useMemo(() => {
    if (filteredLogs.length === 0) return [];

    const start = startOfDay(parseISO(startDate));
    const end = endOfDay(parseISO(endDate));
    const dateRange = eachDayOfInterval({ start, end });

    const dataByDate = dateRange.map(date => {
      const dateStr = format(date, "yyyy-MM-dd");
      const dayLogs = filteredLogs.filter(log => {
        const logDate = format(parseISO(log.log_date), "yyyy-MM-dd");
        return logDate === dateStr;
      });

      return {
        date: format(date, "MMM dd"),
        fullDate: dateStr,
        Green: dayLogs.filter(log => log.parking_type === "Green").length,
        Yellow: dayLogs.filter(log => log.parking_type === "Yellow").length,
        Red: dayLogs.filter(log => log.parking_type === "Red").length,
      };
    });

    return dataByDate;
  }, [filteredLogs, startDate, endDate]);

  // Get Yellow and Red registrations for the period
  const yellowAndRedLogs = useMemo(() => {
    return filteredLogs
      .filter(log => log.parking_type === "Yellow" || log.parking_type === "Red")
      .sort((a, b) => {
        // Sort by date (newest first), then by parking type (Red first, then Yellow)
        const dateA = new Date(a.log_date);
        const dateB = new Date(b.log_date);
        if (dateB.getTime() !== dateA.getTime()) {
          return dateB.getTime() - dateA.getTime();
        }
        if (a.parking_type === "Red" && b.parking_type === "Yellow") return -1;
        if (a.parking_type === "Yellow" && b.parking_type === "Red") return 1;
        return 0;
      });
  }, [filteredLogs]);

  // Helper function to extract permit number from notes
  const getPermitNumber = (log) => {
    if (log.notes?.includes("Permit:")) {
      const match = log.notes.match(/Permit:\s*(.+?)(?:\s*-|$)/);
      return match ? match[1].trim() : log.notes.replace("Permit:", "").trim();
    } else if (log.notes?.includes("No permit")) {
      return "No Permit";
    }
    return "Not Assigned";
  };

  // Calculate totals
  const totals = useMemo(() => {
    return {
      Green: filteredLogs.filter(log => log.parking_type === "Green").length,
      Yellow: filteredLogs.filter(log => log.parking_type === "Yellow").length,
      Red: filteredLogs.filter(log => log.parking_type === "Red").length,
      Total: filteredLogs.length,
    };
  }, [filteredLogs]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCSV = () => {
    const csvRows = [];
    
    // Header
    csvRows.push("Car Park Trend Analysis Report");
    csvRows.push(`Period: ${safeFormatDate(startDate, "dd/MM/yyyy")} to ${safeFormatDate(endDate, "dd/MM/yyyy")}`);
    csvRows.push(`Generated: ${safeFormatDate(new Date(), "PPP")} at ${format(new Date(), "p")}`);
    csvRows.push("");
    
    // Summary
    csvRows.push("Summary");
    csvRows.push(`Total Logs,${totals.Total}`);
    csvRows.push(`Green,${totals.Green}`);
    csvRows.push(`Yellow,${totals.Yellow}`);
    csvRows.push(`Red,${totals.Red}`);
    csvRows.push("");
    
    // Chart data
    csvRows.push("Daily Trends");
    csvRows.push("Date,Green,Yellow,Red");
    chartData.forEach(day => {
      csvRows.push(`${day.date},${day.Green},${day.Yellow},${day.Red}`);
    });
    csvRows.push("");
    
    // Yellow and Red registrations
    csvRows.push("Yellow and Red Registrations");
    csvRows.push("Registration,Permit,Date,Parking Type");
    yellowAndRedLogs.forEach(log => {
      const permit = getPermitNumber(log);
      const date = safeFormatDate(log.log_date, "dd/MM/yy");
      csvRows.push(`${log.registration_plate},${permit},${date},${log.parking_type}`);
    });
    
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Park_Wise_Trend_Analysis_${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (user.status !== 'approved') {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 md:p-6">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
          <p className="text-slate-600">Your account is pending approval. Please contact an administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6 print-content">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 md:w-10 md:h-10" />
            KPI Trend Analysis
          </h1>
          <p className="text-slate-600 text-sm md:text-base">
            Track Green, Yellow, and Red vehicle registrations over time
          </p>
          <p className="text-sm text-slate-600 mt-2 print:block">
            Period: {safeFormatDate(startDate, "dd/MM/yyyy")} to {safeFormatDate(endDate, "dd/MM/yyyy")}
          </p>
        </div>

        {/* Date Range Selector */}
        <Card className="shadow-md no-print">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Select Date Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="font-semibold">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate" className="font-semibold">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
          <Card className="shadow-md">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-600 mb-1">Total Logs</div>
              <div className="text-2xl md:text-3xl font-bold text-slate-900">{totals.Total}</div>
            </CardContent>
          </Card>
          <Card className="shadow-md border-emerald-200">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-600 mb-1">Green</div>
              <div className="text-2xl md:text-3xl font-bold text-emerald-600">{totals.Green}</div>
            </CardContent>
          </Card>
          <Card className="shadow-md border-amber-200">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-600 mb-1">Yellow</div>
              <div className="text-2xl md:text-3xl font-bold text-amber-600">{totals.Yellow}</div>
            </CardContent>
          </Card>
          <Card className="shadow-md border-red-200">
            <CardContent className="pt-6">
              <div className="text-sm text-slate-600 mb-1">Red</div>
              <div className="text-2xl md:text-3xl font-bold text-red-600">{totals.Red}</div>
            </CardContent>
          </Card>
        </div>

        {/* Trend Chart */}
        <Card className="shadow-lg print-content">
          <CardHeader className="print:block">
            <div className="flex items-center justify-between">
              <CardTitle>Daily Trend Graph</CardTitle>
              <div className="flex gap-2 no-print">
                <Button
                  onClick={handleDownloadCSV}
                  variant="outline"
                  size="sm"
                  disabled={filteredLogs.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  CSV
                </Button>
                <Button
                  onClick={handlePrint}
                  variant="outline"
                  size="sm"
                  disabled={filteredLogs.length === 0}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="print:block">
            {isFetching ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-slate-500">
                No data available for the selected date range
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    domain={[0, 100]}
                    ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
                  />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="Green" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: "#10b981", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Yellow" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    dot={{ fill: "#f59e0b", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Red" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={{ fill: "#ef4444", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Yellow and Red Registrations */}
        {yellowAndRedLogs.length > 0 && (
          <Card className="shadow-lg print-content">
            <CardHeader>
              <CardTitle>Yellow and Red Registrations ({yellowAndRedLogs.length})</CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                Period: {safeFormatDate(startDate, "dd/MM/yyyy")} to {safeFormatDate(endDate, "dd/MM/yyyy")}
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-300 px-4 py-3 text-left font-bold text-slate-900">
                        Registrations
                      </th>
                      <th className="border border-slate-300 px-4 py-3 text-left font-bold text-slate-900">
                        Permits
                      </th>
                      <th className="border border-slate-300 px-4 py-3 text-left font-bold text-slate-900">
                        DD/MM/YY
                      </th>
                      <th className="border border-slate-300 px-4 py-3 text-left font-bold text-slate-900">
                        Type
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {yellowAndRedLogs.map((log, index) => {
                      const permit = getPermitNumber(log);
                      const date = safeFormatDate(log.log_date, "dd/MM/yy");
                      const typeColor = log.parking_type === "Red" 
                        ? "bg-red-100 text-red-800" 
                        : "bg-amber-100 text-amber-800";
                      
                      return (
                        <tr key={log.id || index} className="hover:bg-slate-50">
                          <td className="border border-slate-300 px-4 py-2 font-mono font-semibold">
                            {log.registration_plate}
                          </td>
                          <td className="border border-slate-300 px-4 py-2">{permit}</td>
                          <td className="border border-slate-300 px-4 py-2">{date}</td>
                          <td className="border border-slate-300 px-4 py-2">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${typeColor}`}>
                              {log.parking_type}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {yellowAndRedLogs.length === 0 && filteredLogs.length > 0 && (
          <Card className="shadow-md">
            <CardContent className="pt-6">
              <div className="text-center text-slate-500 py-8">
                No Yellow or Red registrations found in the selected period
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            page-break-inside: avoid;
          }
          @page {
            margin: 1.5cm;
            size: A4;
          }
          .page-break {
            page-break-after: always;
          }
          button, .no-print {
            display: none !important;
          }
          /* Ensure chart container is visible and properly sized for print */
          .recharts-wrapper,
          .recharts-surface {
            visibility: visible !important;
            display: block !important;
          }
          /* Hide summary cards in print to save space */
          .grid.grid-cols-2.md\\:grid-cols-4 {
            display: none !important;
          }
          /* Ensure date range selector is hidden */
          .shadow-md:has(input[type="date"]) {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

