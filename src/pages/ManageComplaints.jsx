import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Search, Eye, CheckCircle, Clock, XCircle, FileText, Square, CheckSquare, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import ComplaintReportGenerator from "../components/complaints/ComplaintReportGenerator";
import { useAuth } from "@/context/AuthContext";
import { bulkDeleteComplaints, deleteComplaint, fetchComplaints, updateComplaint } from "@/api";

export default function ManageComplaints() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showReportGenerator, setShowReportGenerator] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);

  const queryClient = useQueryClient();
  const { profile: user } = useAuth();

  const { data: complaints = [] } = useQuery({
    queryKey: ['complaints'],
    queryFn: () => fetchComplaints(),
    enabled: user?.role === 'admin' && user?.status === 'approved',
    refetchInterval: 60000,
  });

  const updateComplaintMutation = useMutation({
    mutationFn: ({ id, status }) => updateComplaint(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      setShowDialog(false);
      setSelectedComplaint(null);
    },
  });

  const deleteComplaintMutation = useMutation({
    mutationFn: (id) => deleteComplaint(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      setShowDialog(false);
      setSelectedComplaint(null);
      setSelectedIds((prev) => prev.filter(sid => sid !== selectedComplaint?.id));
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids) => bulkDeleteComplaints(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      setSelectedIds([]);
    },
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (user?.role !== 'admin' || user?.status !== 'approved') {
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

  const filteredComplaints = complaints.filter(complaint => {
    const matchesSearch = 
      complaint.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.related_plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || complaint.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusBadges = {
    new: { color: "bg-blue-100 text-blue-800", icon: Clock, label: "New" },
    in_progress: { color: "bg-amber-100 text-amber-800", icon: Clock, label: "In Progress" },
    resolved: { color: "bg-emerald-100 text-emerald-800", icon: CheckCircle, label: "Resolved" }
  };

  const statusCounts = {
    all: complaints.length,
    new: complaints.filter(c => c.status === 'new').length,
    in_progress: complaints.filter(c => c.status === 'in_progress').length,
    resolved: complaints.filter(c => c.status === 'resolved').length,
  };

  const handleViewDetails = (complaint) => {
    setSelectedComplaint(complaint);
    setImageLoadError(false); // Reset image error state when opening dialog
    setShowDialog(true);
  };

  const handleUpdateStatus = (status) => {
    if (selectedComplaint) {
      updateComplaintMutation.mutate({ id: selectedComplaint.id, status });
    }
  };

  const handleDelete = () => {
    if (selectedComplaint && window.confirm("Are you sure you want to delete this complaint? This action cannot be undone.")) {
      deleteComplaintMutation.mutate(selectedComplaint.id);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) {
      alert("Please select at least one complaint to delete");
      return;
    }
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} complaint(s)? This action cannot be undone.`)) {
      bulkDeleteMutation.mutate(selectedIds);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredComplaints.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredComplaints.map(c => c.id));
    }
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleGenerateReport = () => {
    if (selectedIds.length === 0) {
      alert("Please select at least one complaint to generate a report");
      return;
    }
    setShowReportGenerator(true);
  };

  const allSelected = filteredComplaints.length > 0 && selectedIds.length === filteredComplaints.length;

  return (
    <div className="w-full overflow-x-hidden">
      <div className="p-3 md:p-6 lg:p-8 bg-slate-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 md:mb-8 text-center">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900">
              Manage Non-Compliance Reports
            </h1>
            <p className="text-sm md:text-base text-slate-600 mt-1">
              Review and manage submitted non-compliance reports
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
            <Card className="shadow-md">
              <CardHeader className="pb-2 md:pb-3 px-4 md:px-6">
                <CardTitle className="text-xs md:text-sm font-medium text-slate-600">Total Reports</CardTitle>
              </CardHeader>
              <CardContent className="px-4 md:px-6">
                <div className="text-2xl md:text-3xl font-bold text-slate-900">{statusCounts.all}</div>
              </CardContent>
            </Card>
            <Card className="shadow-md">
              <CardHeader className="pb-2 md:pb-3 px-4 md:px-6">
                <CardTitle className="text-xs md:text-sm font-medium text-slate-600">New</CardTitle>
              </CardHeader>
              <CardContent className="px-4 md:px-6">
                <div className="text-2xl md:text-3xl font-bold text-blue-600">{statusCounts.new}</div>
              </CardContent>
            </Card>
            <Card className="shadow-md">
              <CardHeader className="pb-2 md:pb-3 px-4 md:px-6">
                <CardTitle className="text-xs md:text-sm font-medium text-slate-600">In Progress</CardTitle>
              </CardHeader>
              <CardContent className="px-4 md:px-6">
                <div className="text-2xl md:text-3xl font-bold text-amber-600">{statusCounts.in_progress}</div>
              </CardContent>
            </Card>
            <Card className="shadow-md">
              <CardHeader className="pb-2 md:pb-3 px-4 md:px-6">
                <CardTitle className="text-xs md:text-sm font-medium text-slate-600">Resolved</CardTitle>
              </CardHeader>
              <CardContent className="px-4 md:px-6">
                <div className="text-2xl md:text-3xl font-bold text-emerald-600">{statusCounts.resolved}</div>
              </CardContent>
            </Card>
          </div>

          {selectedIds.length > 0 && (
            <div className="mb-4 flex gap-2">
              <Button 
                onClick={handleGenerateReport}
                className="bg-slate-900 hover:bg-slate-800"
              >
                <FileText className="w-4 h-4 mr-2" />
                Generate Report ({selectedIds.length})
              </Button>
              <Button 
                onClick={handleBulkDelete}
                variant="destructive"
                disabled={bulkDeleteMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected ({selectedIds.length})
              </Button>
            </div>
          )}

          <Card className="shadow-lg mb-6">
            <CardHeader className="border-b px-4 md:px-6">
              <div className="flex flex-col gap-3 md:gap-4">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-3 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  {allSelected ? (
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                  <span>
                    {allSelected ? "Deselect All" : selectedIds.length > 0 ? `${selectedIds.length} Selected` : "Select All"}
                  </span>
                </button>
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by title, plate, or location..."
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredComplaints.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    No complaints found matching your filters.
                  </div>
                ) : (
                  filteredComplaints.map((complaint) => {
                    const StatusIcon = statusBadges[complaint.status].icon;
                    const isSelected = selectedIds.includes(complaint.id);
                    return (
                      <div
                        key={complaint.id}
                        className={`p-4 md:p-6 transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                      >
                        <div className="flex gap-4 md:items-start">
                          <button
                            onClick={() => handleSelectOne(complaint.id)}
                            className="pt-1 hover:opacity-70 transition-opacity"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-blue-600" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-400" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <h3 className="font-bold text-base md:text-lg text-slate-900">
                                {complaint.title}
                              </h3>
                              <Badge className={`${statusBadges[complaint.status].color} shrink-0`}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {statusBadges[complaint.status].label}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                              {complaint.description}
                            </p>
                            <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                              {complaint.related_plate && (
                                <span className="font-mono font-semibold">
                                  🚗 {complaint.related_plate}
                                </span>
                              )}
                              {complaint.location && (
                                <span>📍 {complaint.location}</span>
                              )}
                              <span>
                                📅 {format(new Date(complaint.reported_date), 'MMM d, yyyy')} at {complaint.reported_time}
                              </span>
                              <span className="text-slate-400">
                                By {complaint.created_by}
                              </span>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleViewDetails(complaint)}
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) {
          setImageLoadError(false); // Reset image error when dialog closes
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedComplaint && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl md:text-2xl">{selectedComplaint.title}</DialogTitle>
                <DialogDescription>
                  Submitted on {format(new Date(selectedComplaint.created_date), 'PPP')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <h4 className="font-semibold text-sm text-slate-600 mb-1">Status</h4>
                  <Badge className={statusBadges[selectedComplaint.status].color}>
                    {statusBadges[selectedComplaint.status].label}
                  </Badge>
                </div>

                <div>
                  <h4 className="font-semibold text-sm text-slate-600 mb-1">Description</h4>
                  <p className="text-sm text-slate-700">{selectedComplaint.description}</p>
                </div>

                {selectedComplaint.image_url && (
                  <div>
                    <h4 className="font-semibold text-sm text-slate-600 mb-2">Photo Evidence</h4>
                    {imageLoadError ? (
                      <div className="p-4 bg-slate-100 rounded-lg border-2 border-slate-200 text-center text-slate-600 text-sm">
                        Image failed to load
                      </div>
                    ) : (
                      <img
                        src={selectedComplaint.image_url}
                        alt="Evidence"
                        className="w-full rounded-lg border-2 border-slate-200"
                        loading="lazy"
                        onError={() => {
                          setImageLoadError(true);
                        }}
                      />
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {selectedComplaint.related_plate && (
                    <div>
                      <h4 className="font-semibold text-sm text-slate-600 mb-1">Vehicle Registration</h4>
                      <p className="font-mono font-semibold">{selectedComplaint.related_plate}</p>
                    </div>
                  )}
                  {selectedComplaint.location && (
                    <div>
                      <h4 className="font-semibold text-sm text-slate-600 mb-1">Location</h4>
                      <p className="text-sm">{selectedComplaint.location}</p>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-sm text-slate-600 mb-1">Submitted By (Admin View Only)</h4>
                  <p className="text-xs text-slate-500 font-mono">{selectedComplaint.created_by}</p>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <h4 className="font-semibold text-sm text-slate-600">Update Status</h4>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => handleUpdateStatus('new')}
                      variant={selectedComplaint.status === 'new' ? 'default' : 'outline'}
                      size="sm"
                      disabled={updateComplaintMutation.isPending}
                    >
                      <Clock className="w-4 h-4 mr-1" />
                      New
                    </Button>
                    <Button
                      onClick={() => handleUpdateStatus('in_progress')}
                      variant={selectedComplaint.status === 'in_progress' ? 'default' : 'outline'}
                      size="sm"
                      disabled={updateComplaintMutation.isPending}
                    >
                      <Clock className="w-4 h-4 mr-1" />
                      In Progress
                    </Button>
                    <Button
                      onClick={() => handleUpdateStatus('resolved')}
                      variant={selectedComplaint.status === 'resolved' ? 'default' : 'outline'}
                      size="sm"
                      disabled={updateComplaintMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Resolved
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Button
                    onClick={handleDelete}
                    variant="destructive"
                    size="sm"
                    disabled={deleteComplaintMutation.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Delete Report
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {showReportGenerator && (
        <ComplaintReportGenerator
          complaints={complaints}
          selectedIds={selectedIds}
          onClose={() => setShowReportGenerator(false)}
        />
      )}
    </div>
  );
}