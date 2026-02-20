import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
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
import CalculadoraPage from "@/pages/dashboard/CalculadoraPage";
import NoticiasPage from "@/pages/dashboard/NoticiasPage";
import CrmPage from "@/pages/dashboard/CrmPage";
import WorkflowPage from "@/pages/dashboard/WorkflowPage";
import MinutasPage from "@/pages/dashboard/MinutasPage";
import CertificadosPage from "@/pages/dashboard/CertificadosPage";
import TimesheetPage from "@/pages/dashboard/TimesheetPage";
import WikiJuridicaPage from "@/pages/dashboard/WikiJuridicaPage";
import ChatPage from "@/pages/dashboard/ChatPage";
import UnidadesPage from "@/pages/dashboard/UnidadesPage";
import PortalLogin from "@/pages/portal/PortalLogin";
import PortalDashboard from "@/pages/portal/PortalDashboard";
import PortalSignature from "@/pages/portal/PortalSignature";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/portal" element={<PortalLogin />} />
            <Route path="/portal/dashboard" element={<ProtectedRoute><PortalDashboard /></ProtectedRoute>} />
            <Route path="/portal/assinatura/:token" element={<PortalSignature />} />
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
              <Route path="financeiro" element={<FinanceiroPage />} />
              <Route path="ia" element={<IAPage />} />
              <Route path="configuracoes" element={<ConfiguracoesPage />} />
              <Route path="bi" element={<BIPage />} />
              <Route path="calculadora" element={<CalculadoraPage />} />
              <Route path="noticias" element={<NoticiasPage />} />
              <Route path="crm" element={<CrmPage />} />
              <Route path="workflow" element={<WorkflowPage />} />
              <Route path="minutas" element={<MinutasPage />} />
              <Route path="certificados" element={<CertificadosPage />} />
              <Route path="timesheet" element={<TimesheetPage />} />
              <Route path="wiki" element={<WikiJuridicaPage />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="unidades" element={<UnidadesPage />} />
            </Route>
            <Route path="/crm-preview" element={<CrmPage />} />
            <Route path="/workflow-preview" element={<WorkflowPage />} />
            <Route path="/minutas-preview" element={<MinutasPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
