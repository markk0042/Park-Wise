import React from "react";
import QuickRegistrationLogWithSection from "../components/dashboard/QuickRegistrationLogWithSection";
import { ParkingSquare } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/context/AuthContext";

export default function YellowCarPark() {
  const { profile: user } = useAuth();

  if (user?.status !== 'approved') {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 md:p-6">
        <Alert className="max-w-md">
          <AlertDescription className="text-base md:text-lg">
            Your account needs to be approved to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-slate-50 p-3 md:p-8">
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
        <div className="mb-4 md:mb-6 text-center">
          <h1 className="text-2xl md:text-4xl font-bold text-slate-900 flex items-center justify-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-amber-500 flex items-center justify-center">
              <ParkingSquare className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            Yellow Car Park
          </h1>
          <p className="text-sm md:text-base text-slate-600 mt-2">
            Quick registration for Yellow permit holders
          </p>
        </div>

        <QuickRegistrationLogWithSection section="Yellow" />
      </div>
    </div>
  );
}