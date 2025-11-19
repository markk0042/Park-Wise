
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle, Clock, Shield, User, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { listUsers, updateUser as updateUserApi } from "@/api";

export default function UserManagement() {
  const queryClient = useQueryClient();
  const { profile: currentUser } = useAuth();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => listUsers(),
    enabled: currentUser?.role === 'admin',
    refetchInterval: 60000,
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }) => updateUserApi(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    },
  });

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 md:p-6">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6">
            <p className="text-base md:text-lg text-center text-slate-600">
              You don't have permission to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusBadges = {
    pending: { color: "bg-amber-100 text-amber-800 border-amber-300", icon: Clock },
    approved: { color: "bg-emerald-100 text-emerald-800 border-emerald-300", icon: CheckCircle },
    rejected: { color: "bg-red-100 text-red-800 border-red-300", icon: XCircle }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        <div className="mb-6 md:mb-8 text-center">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 flex items-center justify-center gap-2 md:gap-3 flex-wrap">
            <Users className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 shrink-0" />
            User Management
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-slate-600 mt-1">
            Manage user access requests and permissions
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
            <Card className="shadow-md">
              <CardHeader className="pb-2 md:pb-3 px-4 md:px-6">
                <CardTitle className="text-xs md:text-sm font-medium text-slate-600">Total Users</CardTitle>
              </CardHeader>
              <CardContent className="px-4 md:px-6">
                <div className="text-2xl md:text-3xl font-bold text-slate-900">{users.length}</div>
              </CardContent>
            </Card>
            <Card className="shadow-md">
              <CardHeader className="pb-2 md:pb-3 px-4 md:px-6">
                <CardTitle className="text-xs md:text-sm font-medium text-slate-600">Pending Approval</CardTitle>
              </CardHeader>
              <CardContent className="px-4 md:px-6">
                <div className="text-2xl md:text-3xl font-bold text-amber-600">
                  {users.filter(u => u.status === 'pending').length}
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-md">
              <CardHeader className="pb-2 md:pb-3 px-4 md:px-6">
                <CardTitle className="text-xs md:text-sm font-medium text-slate-600">Approved Users</CardTitle>
              </CardHeader>
              <CardContent className="px-4 md:px-6">
                <div className="text-2xl md:text-3xl font-bold text-emerald-600">
                  {users.filter(u => u.status === 'approved').length}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-lg w-full">
            <CardHeader className="border-b border-slate-200 px-4 md:px-6">
              <CardTitle className="text-base md:text-lg lg:text-xl font-bold text-slate-900">All Users</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="font-semibold text-xs md:text-sm whitespace-nowrap">User</TableHead>
                      <TableHead className="font-semibold text-xs md:text-sm hidden md:table-cell whitespace-nowrap">Email</TableHead>
                      <TableHead className="font-semibold text-xs md:text-sm whitespace-nowrap">Role</TableHead>
                      <TableHead className="font-semibold text-xs md:text-sm whitespace-nowrap">Status</TableHead>
                      <TableHead className="font-semibold text-xs md:text-sm whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => {
                      const StatusIcon = statusBadges[user.status || 'pending'].icon;
                      return (
                        <TableRow key={user.id} className="hover:bg-slate-50 transition-colors">
                          <TableCell className="px-3 md:px-4">
                            <div className="flex items-center gap-2 md:gap-3 min-w-0">
                              <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-200 rounded-full flex items-center justify-center shrink-0">
                                <User className="w-4 h-4 md:w-5 md:h-5 text-slate-600" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="font-medium text-xs sm:text-sm md:text-base block truncate">{user.full_name}</span>
                                <span className="text-xs text-slate-500 md:hidden block truncate">{user.email}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-600 text-xs md:text-sm hidden md:table-cell px-3 md:px-4">
                            <span className="truncate block max-w-xs">{user.email}</span>
                          </TableCell>
                          <TableCell className="px-3 md:px-4">
                            {user.role === 'admin' ? (
                              <Badge className="bg-slate-900 text-white text-xs whitespace-nowrap">
                                <Shield className="w-3 h-3 mr-1" />
                                Admin
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs whitespace-nowrap">User</Badge>
                            )}
                          </TableCell>
                          <TableCell className="px-3 md:px-4">
                            <Badge className={`${statusBadges[user.status || 'pending'].color} border text-xs whitespace-nowrap`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              <span className="hidden sm:inline">{(user.status || 'pending').charAt(0).toUpperCase() + (user.status || 'pending').slice(1)}</span>
                              <span className="sm:hidden">{(user.status || 'pending').substring(0, 3)}</span>
                            </Badge>
                          </TableCell>
                          <TableCell className="px-3 md:px-4">
                            {user.id !== currentUser.id && (
                              <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                                {user.status !== 'approved' && (
                                  <Button
                                    size="sm"
                                    onClick={() => updateUserMutation.mutate({ 
                                      userId: user.id, 
                                      data: { status: 'approved' } 
                                    })}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-xs px-2 py-1 h-8 whitespace-nowrap"
                                    disabled={updateUserMutation.isPending}
                                  >
                                    <CheckCircle className="w-3 h-3 sm:mr-1" />
                                    <span className="hidden sm:inline">Approve</span>
                                  </Button>
                                )}
                                {user.status !== 'rejected' && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => updateUserMutation.mutate({ 
                                      userId: user.id, 
                                      data: { status: 'rejected' } 
                                    })}
                                    disabled={updateUserMutation.isPending}
                                    className="text-xs px-2 py-1 h-8 whitespace-nowrap"
                                  >
                                    <XCircle className="w-3 h-3 sm:mr-1" />
                                    <span className="hidden sm:inline">Reject</span>
                                  </Button>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
