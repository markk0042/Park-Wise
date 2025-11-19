import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { updateCurrentUser } from "@/api";

export default function AdminSetup() {
  const [message, setMessage] = useState("");
  const { profile: user } = useAuth();

  const makeAdminMutation = useMutation({
    mutationFn: () => updateCurrentUser({ role: 'admin', status: 'approved' }),
    onSuccess: () => {
      setMessage("✓ Success! Refreshing page...");
      // Automatically refresh the entire page after 1 second
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    },
    onError: (error) => {
      setMessage("✗ Failed to update. Please try again or contact support.");
    },
  });

  const isAdmin = user?.role === 'admin' && user?.status === 'approved';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <Card className="max-w-md w-full shadow-lg">
        <CardHeader className="text-center border-b">
          <div className="mx-auto w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Admin Setup</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="bg-slate-100 rounded-lg p-4 space-y-2">
            <p className="text-sm text-slate-600">
              <span className="font-semibold">Email:</span> {user?.email}
            </p>
            <p className="text-sm text-slate-600">
              <span className="font-semibold">Role:</span>{" "}
              <span className={user?.role === 'admin' ? 'text-blue-600 font-bold' : ''}>
                {user?.role || 'user'}
              </span>
            </p>
            <p className="text-sm text-slate-600">
              <span className="font-semibold">Status:</span>{" "}
              <span className={user?.status === 'approved' ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                {user?.status || 'pending'}
              </span>
            </p>
          </div>

          {isAdmin ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
              <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-emerald-800 font-semibold mb-2">
                ✓ You have admin access!
              </p>
              <p className="text-sm text-emerald-700">
                You should see "Dashboard" and "User Management" in the sidebar.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                <p className="text-sm text-amber-800">
                  Click the button below to grant yourself admin privileges
                </p>
              </div>
              
              <Button
                onClick={() => makeAdminMutation.mutate()}
                disabled={makeAdminMutation.isPending}
                className="w-full bg-slate-900 hover:bg-slate-800 py-6 text-lg"
              >
                {makeAdminMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5 mr-2" />
                    Make Me Admin
                  </>
                )}
              </Button>
            </>
          )}

          {message && (
            <div className={`p-3 rounded-lg text-center font-medium ${
              message.includes('✓') 
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {message}
            </div>
          )}

          {isAdmin && (
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Page
            </Button>
          )}

          <p className="text-xs text-slate-500 text-center">
            Grant yourself admin access to manage users and view the parking dashboard.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}