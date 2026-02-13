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
import DocumentosPage from "@/pages/dashboard/DocumentosPage";
import IAPage from "@/pages/dashboard/IAPage";
import ConfiguracoesPage from "@/pages/dashboard/ConfiguracoesPage";
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
              <Route path="documentos" element={<DocumentosPage />} />
              <Route path="ia" element={<IAPage />} />
              <Route path="configuracoes" element={<ConfiguracoesPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
