import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Outlet } from "react-router-dom";
import { TopBar } from "@/components/shared/TopBar";
import ArunaQuickChat from "@/components/shared/ArunaQuickChat";
import { OnboardingTour } from "./OnboardingTour";
import { useAuth } from "@/contexts/AuthContext";

// ─── DashboardLayout ──────────────────────────────────────────

export default function DashboardLayout() {
  const { user } = useAuth();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0">

          {/* Global Header */}
          <TopBar />

          {/* ── Page Content ── */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
            <Outlet />
          </main>

        </div>
      </div>
      <ArunaQuickChat />
      <OnboardingTour />
    </SidebarProvider>
  );
}
