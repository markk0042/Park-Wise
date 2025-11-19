
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText } from "lucide-react";
import ReportGenerator from "../components/dashboard/ReportGenerator";
import { useAuth } from "@/context/AuthContext";
import { fetchParkingLogs } from "@/api";

export default function Reports() {
  const { profile: user } = useAuth();

  const { data: logs = [] } = useQuery({
    queryKey: ['parkingLogs'],
    queryFn: () => fetchParkingLogs(),
    enabled: user?.role === 'admin',
    refetchInterval: 60000,
  });

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
        <div className="mb-4 md:mb-6 text-center">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 flex items-center justify-center gap-2 md:gap-3 flex-wrap">
            <FileText className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 shrink-0" />
            Generate Reports
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-slate-600 mt-1">
            Download or email parking log reports for any date range
          </p>
        </div>

        <ReportGenerator logs={logs} />
      </div>
    </div>
  );
}
