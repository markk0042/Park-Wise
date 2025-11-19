import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";

export default function StatsOverview({ logs, onCategoryClick }) {
  const todayLogs = logs.filter(log => {
    const logDate = new Date(log.log_date);
    const today = new Date();
    return logDate.toDateString() === today.toDateString();
  });

  const greenCount = todayLogs.filter(log => log.parking_type === "Green").length;
  const yellowCount = todayLogs.filter(log => log.parking_type === "Yellow").length;
  const redCount = todayLogs.filter(log => log.parking_type === "Red").length;

  const stats = [
    {
      title: "Total Today",
      value: todayLogs.length,
      icon: Car,
      bgColor: "bg-slate-500",
      textColor: "text-slate-700",
      category: "all"
    },
    {
      title: "Green Parking Permit",
      value: greenCount,
      icon: CheckCircle,
      bgColor: "bg-emerald-500",
      textColor: "text-emerald-700",
      category: "Green"
    },
    {
      title: "Yellow Parking Permit",
      value: yellowCount,
      icon: AlertTriangle,
      bgColor: "bg-amber-500",
      textColor: "text-amber-700",
      category: "Yellow"
    },
    {
      title: "Red (Unregistered)",
      value: redCount,
      icon: AlertCircle,
      bgColor: "bg-red-500",
      textColor: "text-red-700",
      category: "Red"
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
      {stats.map((stat) => (
        <Card 
          key={stat.title} 
          className="shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105 group"
          onClick={() => onCategoryClick(stat.category)}
        >
          <CardHeader className="pb-1.5 sm:pb-2 md:pb-3 px-2 sm:px-3 md:px-4 lg:px-6 pt-2 sm:pt-3 md:pt-4 lg:pt-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[10px] sm:text-xs md:text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors leading-tight">
                {stat.title}
              </CardTitle>
              <div className={`p-1 sm:p-1.5 md:p-2 rounded-lg ${stat.bgColor} bg-opacity-20 group-hover:bg-opacity-30 transition-all`}>
                <stat.icon className={`w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 ${stat.bgColor.replace('bg-', 'text-')}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-3 md:px-4 lg:px-6 pb-2 sm:pb-3 md:pb-4 lg:pb-6">
            <div className={`text-xl sm:text-2xl md:text-3xl font-bold ${stat.textColor} mb-0.5 sm:mb-1 md:mb-2`}>
              {stat.value}
            </div>
            <p className="text-[9px] sm:text-[10px] md:text-xs text-slate-500 group-hover:text-slate-700 transition-colors">
              Click to view all →
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}