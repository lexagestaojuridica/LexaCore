import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Outlet, useLocation } from "react-router-dom";
import { TopBar } from "@/components/shared/TopBar";
import ArunaQuickChat from "@/components/shared/ArunaQuickChat";
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
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">

          {/* Global Header */}
          <TopBar />

          {/* ── Page Content ── */}
          <main className={cn(
            "flex-1 overflow-x-hidden bg-background",
            isOverview ? "overflow-hidden p-4" : "overflow-y-auto p-6"
          )}>
            <Outlet />
          </main>

        </div>
      </div>
      <ArunaQuickChat />
      <OnboardingTour />
    </SidebarProvider>
  );
}
