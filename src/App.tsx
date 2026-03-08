import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import RoleGuard from "@/components/shared/RoleGuard";
import Index from "./views/Index";
import Auth from "./views/Auth";
import ProtectedRoute from "@/features/auth/components/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DashboardOverview from "@/features/meu-dia/pages/DashboardOverview";
import ProcessosPage from "@/features/processos/pages/ProcessosPage";
import ClientesPage from "@/features/clientes/pages/ClientesPage";
import AgendaPage from "@/features/agenda/pages/AgendaPage";
import FinanceiroPage from "@/features/financeiro/pages/FinanceiroPage";
// DocumentosPage removed — docs are now inside Processos and Clientes
import IAPage from "@/features/ia/pages/IAPage";
import ConfiguracoesPage from "@/features/configuracoes/pages/ConfiguracoesPage";
import BIPage from "@/features/bi/pages/BIPage";
import NoticiasPage from "@/features/noticias/pages/NoticiasPage";
import CrmPage from "@/features/crm/pages/CrmPage";
import WorkflowPage from "@/features/workflow/pages/WorkflowPage";
import MinutasPage from "@/features/minutas/pages/MinutasPage";
import TimesheetPage from "@/features/timesheet/pages/TimesheetPage";
import ChatPage from "@/features/chat/pages/ChatPage";
import UnidadesPage from "@/features/unidades/pages/UnidadesPage";

// RH Module
import RhDashboardPage from "@/features/rh/pages/RhDashboardPage";
import ColaboradoresPage from "@/features/rh/pages/ColaboradoresPage";
import PontoEletronicoPage from "@/features/rh/pages/PontoEletronicoPage";
import RecrutamentoPage from "@/features/rh/pages/RecrutamentoPage";

import PortalLogin from "@/features/portal/pages/PortalLogin";
import PortalDashboard from "@/features/portal/pages/PortalDashboard";
import PortalSignature from "@/features/portal/pages/PortalSignature";
import NotFound from "./views/NotFound";
import ProcessPublicView from "@/features/portal/pages/ProcessPublicView";

import ResetPassword from "@/features/auth/pages/ResetPassword";
import UpdatePassword from "@/features/auth/pages/UpdatePassword";

// SaaS Backoffice (Master Admin)
import AdminGuard from "@/features/admin/components/AdminGuard";
import AdminLayout from "@/features/admin/components/AdminLayout";
import AdminDashboard from "@/features/admin/pages/AdminDashboard";
import AdminOrganizations from "@/features/admin/pages/AdminOrganizations";
import AdminPlans from "@/features/admin/pages/AdminPlans";
import AdminAudit from "@/features/admin/pages/AdminAudit";
import AdminSupport from "@/features/admin/pages/AdminSupport";
import AdminSettings from "@/features/admin/pages/AdminSettings";

import { GlobalSearch } from "@/components/shared/GlobalSearch";

const queryClient = new QueryClient();

// ... inside App component ...
const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <GlobalSearch />
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
  </QueryClientProvider>
);

export default App;
