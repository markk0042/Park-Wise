import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";

export default function NonCompliantTracker({ logs }) {
  const [expanded, setExpanded] = useState(true);
  
  // Get current month's logs
  const currentDate = new Date();
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  const currentMonthLogs = logs.filter(log => {
    const logDate = new Date(log.log_date);
    return logDate >= monthStart && logDate <= monthEnd;
  });

  // Identify violations
  const violations = {};
  
  currentMonthLogs.forEach(log => {
    const plate = log.registration_plate;
    const notes = log.notes?.toLowerCase() || "";
    
    // Check for violations based on notes
    let violationType = null;
    let location = null;
    
    if (notes.includes("violation") || notes.includes("non-compliant")) {
      if (notes.includes("green car park")) {
        location = "Green Car Park";
        if (notes.includes("yellow permit")) {
          violationType = "Yellow permit in Green zone";
        } else if (notes.includes("no permit") || notes.includes("unregistered")) {
          violationType = "No permit in Green zone";
        }
      } else if (notes.includes("yellow car park")) {
        location = "Yellow Car Park";
        if (notes.includes("no permit") || notes.includes("unregistered")) {
          violationType = "No permit in Yellow zone";
        }
      }
    }
    
    if (violationType) {
      if (!violations[plate]) {
        violations[plate] = {
          plate,
          violations: [],
          count: 0
        };
      }
      violations[plate].violations.push({
        date: log.log_date,
        time: log.log_time,
        type: violationType,
        location,
        permitType: log.parking_type
      });
      violations[plate].count++;
    }
  });

  // Filter to show only repeat offenders (more than once)
  const repeatOffenders = Object.values(violations).filter(v => v.count > 1);

  return (
    <Card className="shadow-lg border-2 border-red-200 bg-red-50">
      <CardHeader 
        className="pb-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-red-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Non-Compliant Parking Alerts ({repeatOffenders.length})
          </CardTitle>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-red-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-red-600" />
          )}
        </div>
        <p className="text-sm text-red-700 mt-1">
          Vehicles with multiple violations this month ({format(currentDate, 'MMMM yyyy')})
        </p>
      </CardHeader>
      
      {expanded && (
        <CardContent className="space-y-3">
          {repeatOffenders.length === 0 ? (
            <div className="text-center py-8 text-slate-600">
              <p className="text-sm">No repeat violations detected this month.</p>
              <p className="text-xs mt-2 text-slate-500">
                Vehicles with multiple non-compliant parkings will appear here.
              </p>
            </div>
          ) : (
            repeatOffenders.map((offender) => (
            <div
              key={offender.plate}
              className="bg-white border-2 border-red-300 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono font-bold text-lg text-slate-900">
                    {offender.plate}
                  </p>
                  <Badge className="bg-red-600 text-white mt-1">
                    {offender.count} violations this month
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700 uppercase">
                  Violation History:
                </p>
                {offender.violations.map((violation, idx) => (
                  <div
                    key={idx}
                    className="bg-red-50 border border-red-200 rounded p-2 text-sm"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">
                          {format(new Date(violation.date), 'MMM d')}
                        </span>
                        <span className="text-slate-600">{violation.time}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {violation.location}
                      </Badge>
                    </div>
                    <p className="text-red-800 font-medium mt-1">
                      {violation.type}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )))}
        </CardContent>
      )}
    </Card>
  );
}