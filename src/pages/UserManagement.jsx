
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Clock, Shield, User, Users, UserPlus, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { listUsers, updateUser as updateUserApi, inviteUser as inviteUserApi, deleteUser as deleteUserApi } from "@/api";

export default function UserManagement() {
  const queryClient = useQueryClient();
  const { profile: currentUser } = useAuth();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', full_name: '', role: 'user', status: 'approved' });
  const [inviteError, setInviteError] = useState('');

  // Check if current user is super admin (you can set your email here or via env)
  const SUPER_ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL || '';
  const isSuperAdmin = currentUser?.email === SUPER_ADMIN_EMAIL;
  
  // Debug: Log to console (remove after testing)
  if (currentUser?.email) {
    console.log('Current user email:', currentUser.email);
    console.log('Super admin email from env:', SUPER_ADMIN_EMAIL);
    console.log('Is super admin:', isSuperAdmin);
  }

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

  const inviteUserMutation = useMutation({
    mutationFn: (data) => inviteUserApi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      setInviteDialogOpen(false);
      setInviteForm({ email: '', full_name: '', role: 'user', status: 'approved' });
      setInviteError('');
    },
    onError: (error) => {
      setInviteError(error.message || 'Failed to invite user');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId) => deleteUserApi(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    },
  });

  const handleInvite = (e) => {
    e.preventDefault();
    setInviteError('');
    if (!inviteForm.email) {
      setInviteError('Email is required');
      return;
    }
    inviteUserMutation.mutate(inviteForm);
  };

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
        <div className="mb-6 md:mb-8">
          <div className="text-center mb-4">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 flex items-center justify-center gap-2 md:gap-3 flex-wrap">
              <Users className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 shrink-0" />
              User Management
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-slate-600 mt-1">
              Manage user access requests and permissions
            </p>
          </div>
          {/* Debug info - remove after setting up */}
          {!isSuperAdmin && currentUser?.email && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
              <p className="text-xs text-amber-800">
                <strong>Your email:</strong> {currentUser.email}
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Set VITE_SUPER_ADMIN_EMAIL to this email in Vercel to enable invite/delete features
              </p>
            </div>
          )}
          
          {isSuperAdmin && (
            <div className="flex justify-center">
              <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-slate-900 hover:bg-slate-800">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite New User</DialogTitle>
                    <DialogDescription>
                      Send an invitation email to a new user. They will receive a magic link to sign in.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleInvite}>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={inviteForm.email}
                          onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                          placeholder="user@example.com"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="full_name">Full Name</Label>
                        <Input
                          id="full_name"
                          value={inviteForm.full_name}
                          onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select
                          value={inviteForm.role}
                          onValueChange={(value) => setInviteForm({ ...inviteForm, role: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={inviteForm.status}
                          onValueChange={(value) => setInviteForm({ ...inviteForm, status: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {inviteError && (
                        <Alert variant="destructive">
                          <AlertDescription>{inviteError}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setInviteDialogOpen(false);
                          setInviteForm({ email: '', full_name: '', role: 'user', status: 'approved' });
                          setInviteError('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={inviteUserMutation.isPending}>
                        {inviteUserMutation.isPending ? 'Sending...' : 'Send Invitation'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}
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
                            <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                              {user.id !== currentUser.id && (
                                <>
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
                                </>
                              )}
                              {isSuperAdmin && user.id !== currentUser.id && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete ${user.email}? This action cannot be undone.`)) {
                                      deleteUserMutation.mutate(user.id);
                                    }
                                  }}
                                  disabled={deleteUserMutation.isPending}
                                  className="text-xs px-2 py-1 h-8 whitespace-nowrap"
                                >
                                  <Trash2 className="w-3 h-3 sm:mr-1" />
                                  <span className="hidden sm:inline">Delete</span>
                                </Button>
                              )}
                            </div>
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
