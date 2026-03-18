import { SidebarProvider } from "@/shared/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { usePathname } from "next/navigation";
import { TopBar } from "@/widgets/layout/TopBar";
import dynamic from "next/dynamic";
const ArunaQuickChat = dynamic(() => import("@/features/ia/components/ArunaQuickChat"), { ssr: false });
const OnboardingTour = dynamic(() => import("@/features/meu-dia/components/OnboardingTour").then(mod => ({ default: mod.OnboardingTour })), { ssr: false });
import { useUser } from "@clerk/nextjs";
import { cn } from "@/shared/lib/utils";

// ─── DashboardLayout ──────────────────────────────────────────

export default function DashboardLayout({ children }: { children?: React.ReactNode }) {
  const { user } = useUser();
  const pathname = usePathname();
  const isOverview = pathname === "/dashboard";

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
            "flex-1 relative overflow-x-hidden overflow-y-auto transition-all duration-500",
            isOverview ? "bg-transparent p-4 md:p-6 lg:p-8" : "p-6 md:p-8 lg:p-10"
          )}>
            <div className="max-w-7xl mx-auto min-h-full">
              {children}
            </div>
          </main>

        </div>
      </div>
      <ArunaQuickChat />
      <OnboardingTour />
    </SidebarProvider>
  );
}
