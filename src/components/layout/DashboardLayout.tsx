import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Outlet, useLocation } from "react-router-dom";
import { TopBar } from "@/components/layout/TopBar";
import ArunaQuickChat from "@/features/ia/components/ArunaQuickChat";
import { OnboardingTour } from "./OnboardingTour";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

// ─── DashboardLayout ──────────────────────────────────────────

export default function DashboardLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const isOverview = location.pathname === "/dashboard";

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background overflow-hidden relative">
        {/* Luxury Background Accents */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] -z-10 opacity-50 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px] -z-10 opacity-30 pointer-events-none" />

        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden relative">

          {/* Global Header */}
          <TopBar />

          {/* ── Page Content ── */}
          <main className={cn(
            "flex-1 overflow-x-hidden transition-all duration-500",
            isOverview ? "overflow-hidden p-4 md:p-6 lg:p-8" : "overflow-y-auto p-6 md:p-8 lg:p-10"
          )}>
            <div className="max-w-7xl mx-auto h-full">
              <Outlet />
            </div>
          </main>

        </div>
      </div>
      <ArunaQuickChat />
      <OnboardingTour />
    </SidebarProvider>
  );
}
