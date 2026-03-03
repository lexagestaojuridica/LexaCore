import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import RoleGuard from "@/components/shared/RoleGuard";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardOverview from "@/pages/dashboard/DashboardOverview";
import ProcessosPage from "@/pages/dashboard/ProcessosPage";
import ClientesPage from "@/pages/dashboard/ClientesPage";
import AgendaPage from "@/pages/dashboard/AgendaPage";
import FinanceiroPage from "@/pages/dashboard/FinanceiroPage";
// DocumentosPage removed — docs are now inside Processos and Clientes
import IAPage from "@/pages/dashboard/IAPage";
import ConfiguracoesPage from "@/pages/dashboard/ConfiguracoesPage";
import BIPage from "@/pages/dashboard/BIPage";
import NoticiasPage from "@/pages/dashboard/NoticiasPage";
import CrmPage from "@/pages/dashboard/CrmPage";
import WorkflowPage from "@/pages/dashboard/WorkflowPage";
import MinutasPage from "@/pages/dashboard/MinutasPage";
import TimesheetPage from "@/pages/dashboard/TimesheetPage";
import ChatPage from "@/pages/dashboard/ChatPage";
import UnidadesPage from "@/pages/dashboard/UnidadesPage";

// RH Module
import RhDashboardPage from "@/pages/dashboard/rh/RhDashboardPage";
import ColaboradoresPage from "@/pages/dashboard/rh/ColaboradoresPage";
import PontoEletronicoPage from "@/pages/dashboard/rh/PontoEletronicoPage";
import RecrutamentoPage from "@/pages/dashboard/rh/RecrutamentoPage";

import PortalLogin from "@/pages/portal/PortalLogin";
import PortalDashboard from "@/pages/portal/PortalDashboard";
import PortalSignature from "@/pages/portal/PortalSignature";
import NotFound from "./pages/NotFound";
import ProcessPublicView from "./pages/public/ProcessPublicView";

import ResetPassword from "./pages/auth/ResetPassword";
import UpdatePassword from "./pages/auth/UpdatePassword";

// SaaS Backoffice (Master Admin)
import AdminGuard from "@/components/shared/AdminGuard";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminOrganizations from "@/pages/admin/AdminOrganizations";
import AdminPlans from "@/pages/admin/AdminPlans";
import AdminAudit from "@/pages/admin/AdminAudit";
import AdminSupport from "@/pages/admin/AdminSupport";
import AdminSettings from "@/pages/admin/AdminSettings";

const queryClient = new QueryClient();

import { ThemeProvider } from "@/components/theme-provider";
import { CommandPalette } from "@/components/shared/CommandPalette";

// ... inside App component ...
const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="lexa-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <CommandPalette />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/update-password" element={<UpdatePassword />} />
              <Route path="/portal" element={<PortalLogin />} />
              <Route path="/portal/dashboard" element={<ProtectedRoute><PortalDashboard /></ProtectedRoute>} />
              <Route path="/portal/assinatura/:token" element={<PortalSignature />} />
              <Route path="/public/processo/:token" element={<ProcessPublicView />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardOverview />} />
                <Route path="processos" element={<ProcessosPage />} />
                <Route path="clientes" element={<ClientesPage />} />
                <Route path="agenda" element={<AgendaPage />} />
                <Route path="financeiro" element={<RoleGuard allowedRoles={["admin", "advogado", "financeiro"]} fallback={<Navigate to="/dashboard" replace />}><FinanceiroPage /></RoleGuard>} />
                <Route path="ia" element={<IAPage />} />
                <Route path="configuracoes" element={<RoleGuard allowedRoles={["admin"]} fallback={<Navigate to="/dashboard" replace />}><ConfiguracoesPage /></RoleGuard>} />
                <Route path="bi" element={<BIPage />} />
                <Route path="noticias" element={<NoticiasPage />} />
                <Route path="crm" element={<CrmPage />} />
                <Route path="workflow" element={<WorkflowPage />} />
                <Route path="minutas" element={<MinutasPage />} />
                <Route path="timesheet" element={<TimesheetPage />} />
                <Route path="chat" element={<ChatPage />} />
                <Route path="unidades" element={<UnidadesPage />} />

                {/* HR Module */}
                <Route path="rh" element={<RoleGuard allowedRoles={["admin", "advogado"]} fallback={<Navigate to="/dashboard" replace />}><RhDashboardPage /></RoleGuard>} />
                <Route path="rh/colaboradores" element={<RoleGuard allowedRoles={["admin", "advogado"]} fallback={<Navigate to="/dashboard" replace />}><ColaboradoresPage /></RoleGuard>} />
                <Route path="rh/ponto" element={<RoleGuard allowedRoles={["admin", "advogado"]} fallback={<Navigate to="/dashboard" replace />}><PontoEletronicoPage /></RoleGuard>} />
                <Route path="rh/recrutamento" element={<RoleGuard allowedRoles={["admin", "advogado"]} fallback={<Navigate to="/dashboard" replace />}><RecrutamentoPage /></RoleGuard>} />
              </Route>
              <Route path="/crm-preview" element={<CrmPage />} />
              <Route path="/workflow-preview" element={<WorkflowPage />} />
              <Route path="/minutas-preview" element={<MinutasPage />} />

              {/* BACKOFFICE ADMIN HQ */}
              <Route
                path="/admin/hq"
                element={
                  <AdminGuard>
                    <AdminLayout />
                  </AdminGuard>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="organizations" element={<AdminOrganizations />} />
                <Route path="plans" element={<AdminPlans />} />
                <Route path="audit" element={<AdminAudit />} />
                <Route path="support" element={<AdminSupport />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
