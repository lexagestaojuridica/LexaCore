import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { db as supabase } from "@/integrations/supabase/db";

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { session, user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const { data: userRoleData, isLoading: roleLoading } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("user_roles").select("role").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/auth");
    }
  }, [loading, session, router]);

  if (loading || (session && roleLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) return null;

  const role = (userRoleData as any)?.role ?? (user?.user_metadata as any)?.app_role ?? "admin";
  const isPortalRoute = (pathname ?? "").startsWith('/portal');

  if (role === 'cliente' && !isPortalRoute) {
    router.replace("/portal/dashboard");
    return null;
  }

  if (role !== 'cliente' && isPortalRoute) {
    router.replace("/dashboard");
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
