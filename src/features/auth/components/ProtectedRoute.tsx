import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { session, user, loading } = useAuth();
  const location = useLocation();

  const { data: userRoleData, isLoading: roleLoading } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 30, // 30 minutes cache
    gcTime: 1000 * 60 * 60,
  });

  if (loading || (session && roleLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    // Save the attempted URL for redirecting after login, if needed
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  const role = (userRoleData?.role) ?? (user?.user_metadata?.app_role) ?? "admin";
  const isPortalRoute = location.pathname.startsWith('/portal');

  // Hard barrier: Clients cannot access HQ (Dashboard/Admin)
  if (role === 'cliente' && !isPortalRoute) {
    return <Navigate to="/portal/dashboard" replace />;
  }

  // Hard barrier: HQ Staff (Advogados, Admins) should not access Portal directly
  // (Unless they are testing, but normally they shouldn't use the client portal interface)
  if (role !== 'cliente' && isPortalRoute) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
