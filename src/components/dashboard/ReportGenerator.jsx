import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Mail, Calendar, Loader2, Printer, FileText } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ReportGenerator({ logs }) {
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [email, setEmail] = useState("");
  const [emailFormat, setEmailFormat] = useState("csv"); // 'csv' or 'pdf'
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [generating, setGenerating] = useState(false);

  const filteredLogs = logs.filter(log => {
    const logDate = new Date(log.log_date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    return logDate >= start && logDate <= end;
  });

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
    // Prepare data rows matching Excel format
    const rows = sortedLogs.map(log => {
      let permitNumber = "Not Assigned";
      
      // Check if notes contain permit information
      if (log.notes?.includes("Permit:")) {
        const match = log.notes.match(/Permit:\s*(.+?)(?:\s*-|$)/);
        permitNumber = match ? match[1].trim() : log.notes.replace("Permit:", "").trim();
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
    link.download = `Car_Park_Report_${startDate}_to_${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sendEmail = async () => {
    if (!email || !email.includes('@')) {
      setMessage("Please enter a valid email address.");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    if (filteredLogs.length === 0) {
      setMessage("No logs found for the selected date range.");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    setSending(true);
    setMessage("");

    try {
      const { sendReportEmail } = await import('@/api');
      const result = await sendReportEmail(email, startDate, endDate, emailFormat);
      
      if (result.success) {
        if (result.devMode) {
          setMessage("✅ Email would be sent (dev mode - check console for details)");
        } else {
          setMessage("✅ Report sent successfully!");
        }
        setEmail(""); // Clear email field after success
      } else {
        setMessage(`❌ ${result.error || 'Failed to send email. Please check email configuration.'}`);
      }
    } catch (error) {
      console.error('Error sending report email:', error);
      setMessage(`❌ ${error.message || 'Failed to send email. Please try again.'}`);
    } finally {
      setSending(false);
      setTimeout(() => setMessage(""), 5000);
    }
  };

  const handlePrint = async () => {
    setGenerating(true);
    // Small delay to ensure rendering is complete
    setTimeout(() => {
      setGenerating(false);
      window.print();
    }, 500);
  };

  // Prepare data for print preview
  const preparePrintData = () => {
    return sortedLogs.map(log => {
      let permitNumber = "Not Assigned";
      
      if (log.notes?.includes("Permit:")) {
        const match = log.notes.match(/Permit:\s*(.+?)(?:\s*-|$)/);
        permitNumber = match ? match[1].trim() : log.notes.replace("Permit:", "").trim();
      } else if (log.notes?.includes("No permit")) {
        permitNumber = "No Permit";
      } else if (log.parking_type === "Green" || log.parking_type === "Yellow") {
        permitNumber = "Assigned (No # Stored)";
      }
      
      const formattedDate = format(new Date(log.log_date), "dd/MM/yy");
      
      return {
        registration: log.registration_plate,
        permit: permitNumber,
        date: formattedDate,
        time: log.log_time || "",
        parkingType: log.parking_type === "Green" ? "Green Car Park" : 
                     log.parking_type === "Yellow" ? "Yellow Car Park" : 
                     "Red (Unregistered)"
      };
    });
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="px-4 sm:px-5 md:px-6">
        <CardTitle className="text-base sm:text-lg md:text-xl font-bold flex items-center gap-2">
          <Calendar className="w-5 h-5 md:w-6 md:h-6" />
          Generate Custom Report
        </CardTitle>
        <p className="text-xs sm:text-sm text-slate-600 mt-2">
          Select date range and download or email the report (sorted by permit number)
        </p>
      </CardHeader>
      <CardContent className="space-y-4 md:space-y-6 px-4 sm:px-5 md:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate" className="text-sm md:text-base font-semibold">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 md:h-11 text-sm md:text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate" className="text-sm md:text-base font-semibold">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10 md:h-11 text-sm md:text-base"
            />
          </div>
        </div>

        <div className="p-3 md:p-4 bg-slate-100 rounded-lg">
          <p className="text-xs sm:text-sm font-medium text-slate-700">
            📊 <strong>{filteredLogs.length}</strong> logs found in this date range
          </p>
          <p className="text-xs text-slate-600 mt-1">
            Reports are sorted by permit number (lowest to highest)
          </p>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              onClick={downloadCSV}
              disabled={filteredLogs.length === 0}
              className="w-full bg-slate-900 hover:bg-slate-800 h-10 sm:h-11 md:h-12 text-sm md:text-base"
            >
              <Download className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              Download CSV
            </Button>
            <Button
              onClick={() => setShowPrintPreview(true)}
              disabled={filteredLogs.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 h-10 sm:h-11 md:h-12 text-sm md:text-base"
            >
              <Printer className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              Print / PDF
            </Button>
          </div>

          <div className="pt-3 md:pt-4 border-t">
            <Label htmlFor="email" className="text-sm md:text-base font-semibold mb-2 block">
              Or Email Formatted Report
            </Label>
            <div className="space-y-2">
              <div className="flex items-center gap-3 mb-2">
                <Label htmlFor="format-csv" className="text-sm font-normal cursor-pointer flex items-center gap-2">
                  <input
                    type="radio"
                    id="format-csv"
                    name="emailFormat"
                    value="csv"
                    checked={emailFormat === 'csv'}
                    onChange={(e) => setEmailFormat(e.target.value)}
                    className="w-4 h-4"
                  />
                  CSV Format
                </Label>
                <Label htmlFor="format-pdf" className="text-sm font-normal cursor-pointer flex items-center gap-2">
                  <input
                    type="radio"
                    id="format-pdf"
                    name="emailFormat"
                    value="pdf"
                    checked={emailFormat === 'pdf'}
                    onChange={(e) => setEmailFormat(e.target.value)}
                    className="w-4 h-4"
                  />
                  PDF Format
                </Label>
              </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                id="email"
                type="email"
                placeholder="recipient@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 h-10 md:h-11 text-sm md:text-base"
              />
              <Button
                onClick={sendEmail}
                disabled={sending || filteredLogs.length === 0}
                className="bg-blue-600 hover:bg-blue-700 h-10 md:h-11 text-sm md:text-base sm:px-6"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                      Send {emailFormat.toUpperCase()}
                  </>
                )}
              </Button>
              </div>
            </div>
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded-lg text-sm md:text-base ${
            message.includes("✅") 
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
              : "bg-red-50 text-red-800 border border-red-200"
          }`}>
            {message}
          </div>
        )}
      </CardContent>

      {/* Print Preview Dialog */}
      <Dialog open={showPrintPreview} onOpenChange={setShowPrintPreview}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="print:hidden">
            <DialogTitle className="text-xl md:text-2xl flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Parking Log Report Preview
            </DialogTitle>
            <div className="flex gap-2 mt-4">
              <Button 
                onClick={handlePrint} 
                className="bg-slate-900 hover:bg-slate-800"
                disabled={generating}
              >
                <Printer className="w-4 h-4 mr-2" />
                {generating ? 'Preparing...' : 'Print / Save as PDF'}
              </Button>
              <Button onClick={() => setShowPrintPreview(false)} variant="outline">
                Close
              </Button>
            </div>
          </DialogHeader>

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
              }
              @page {
                margin: 1.5cm;
              }
              .page-break {
                page-break-after: always;
              }
            }
          `}</style>

          <div className="print-content mt-6">
            {/* Report Header */}
            <div className="mb-8 border-b-2 border-slate-900 pb-4">
              <h1 className="text-3xl font-bold text-slate-900 mb-2 text-center">
                Car Park Report
              </h1>
              <div className="text-sm text-slate-600 text-center">
                <p><strong>Report Period:</strong> {format(new Date(startDate), "dd/MM/yyyy")} to {format(new Date(endDate), "dd/MM/yyyy")}</p>
                <p><strong>Generated:</strong> {format(new Date(), "PPP")} at {format(new Date(), "p")}</p>
                <p><strong>Total Entries:</strong> {sortedLogs.length}</p>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 px-4 py-3 text-left font-bold text-slate-900">Registrations</th>
                    <th className="border border-slate-300 px-4 py-3 text-left font-bold text-slate-900">Permits</th>
                    <th className="border border-slate-300 px-4 py-3 text-left font-bold text-slate-900">DD/MM/YY</th>
                  </tr>
                </thead>
                <tbody>
                  {preparePrintData().map((row, index) => (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="border border-slate-300 px-4 py-2 font-mono font-semibold">{row.registration}</td>
                      <td className="border border-slate-300 px-4 py-2">{row.permit}</td>
                      <td className="border border-slate-300 px-4 py-2">{row.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Report Footer */}
            <div className="mt-8 pt-4 border-t-2 border-slate-900 text-center text-sm text-slate-600">
              <p>End of Report - {sortedLogs.length} entry(ies) included</p>
              <p className="mt-1">Generated by ParkingLog Management System</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}