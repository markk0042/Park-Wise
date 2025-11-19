import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Calendar, Clock, Trash2, Tag } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteParkingLog } from "@/api";

export default function LogsTable({ logs, searchTerm, currentUser, showTitle = false }) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (logId) => deleteParkingLog(logId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parkingLogs'] });
    },
  });

  const handleDelete = (log) => {
    if (window.confirm(`Are you sure you want to delete registration ${log.registration_plate}?`)) {
      deleteMutation.mutate(log.id);
    }
  };

  const filteredLogs = logs.filter(log =>
    log.registration_plate.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const parkingBadges = {
    Green: "bg-emerald-100 text-emerald-800 border-emerald-300",
    Yellow: "bg-amber-100 text-amber-800 border-amber-300",
    Red: "bg-red-100 text-red-800 border-red-300"
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b border-slate-200 px-3 sm:px-4 md:px-6 py-3 md:py-4">
        <CardTitle className="text-base sm:text-lg md:text-xl font-bold text-slate-900">
          {showTitle ? `Today's Parking Logs (${filteredLogs.length})` : `Parking Logs ${searchTerm ? `(${filteredLogs.length} results)` : ''}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold text-[10px] sm:text-xs md:text-sm px-2 sm:px-3 md:px-4">Registration</TableHead>
                <TableHead className="font-semibold text-[10px] sm:text-xs md:text-sm px-2 sm:px-3 md:px-4">Permit #</TableHead>
                <TableHead className="font-semibold text-[10px] sm:text-xs md:text-sm px-2 sm:px-3 md:px-4">Category</TableHead>
                {isAdmin && (
                  <>
                    <TableHead className="font-semibold text-[10px] sm:text-xs md:text-sm px-2 sm:px-3 md:px-4 hidden lg:table-cell">Date & Time</TableHead>
                    <TableHead className="font-semibold text-[10px] sm:text-xs md:text-sm px-2 sm:px-3 md:px-4 hidden xl:table-cell">Notes</TableHead>
                    <TableHead className="font-semibold text-[10px] sm:text-xs md:text-sm px-2 sm:px-3 md:px-4">Actions</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 6 : 3} className="text-center py-4 sm:py-6 md:py-8 text-slate-500 text-xs sm:text-sm">
                    {searchTerm ? "No matching registrations found" : "No logs yet. Start logging vehicles."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-mono font-bold text-xs sm:text-sm md:text-base px-2 sm:px-3 md:px-4">
                      {log.registration_plate}
                    </TableCell>
                    <TableCell className="px-2 sm:px-3 md:px-4">
                      {log.notes?.includes("Permit:") ? (
                        <Badge variant="outline" className="font-mono text-[10px] sm:text-xs">
                          <Tag className="w-2 h-2 sm:w-3 sm:h-3 mr-1" />
                          {log.notes.replace("Permit: ", "")}
                        </Badge>
                      ) : log.notes?.includes("No permit") ? (
                        <Badge className="bg-red-100 text-red-800 text-[10px] sm:text-xs">
                          No permit
                        </Badge>
                      ) : (
                        <span className="text-slate-400 text-[10px] sm:text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="px-2 sm:px-3 md:px-4">
                      <Badge className={`${parkingBadges[log.parking_type]} border font-semibold text-[9px] sm:text-[10px] md:text-xs`}>
                        {log.parking_type === "Green" && "Green"}
                        {log.parking_type === "Yellow" && "Yellow"}
                        {log.parking_type === "Red" && "Unregistered"}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <>
                        <TableCell className="px-2 sm:px-3 md:px-4 hidden lg:table-cell">
                          <div className="space-y-0.5 sm:space-y-1">
                            <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs md:text-sm">
                              <Calendar className="w-2 h-2 sm:w-3 sm:h-3 text-slate-400" />
                              <span>{format(new Date(log.log_date), "MMM dd, yyyy")}</span>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2 text-[9px] sm:text-xs text-slate-600">
                              <Clock className="w-2 h-2 sm:w-3 sm:h-3 text-slate-400" />
                              {log.log_time}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-2 sm:px-3 md:px-4 hidden xl:table-cell text-[10px] sm:text-xs text-slate-600 max-w-xs truncate">
                          {log.notes && !log.notes.includes("Permit:") ? log.notes : "-"}
                        </TableCell>
                        <TableCell className="px-2 sm:px-3 md:px-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(log)}
                            disabled={deleteMutation.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 sm:h-8 sm:w-8 p-0"
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}