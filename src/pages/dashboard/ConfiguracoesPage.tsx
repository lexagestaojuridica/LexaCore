import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Settings, User, Building2, Shield, Bell, Palette, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default function ConfiguracoesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile-full", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: org } = useQuery({
    queryKey: ["org", profile?.organization_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profile!.organization_id!)
        .single();
      return data;
    },
    enabled: !!profile?.organization_id,
  });

  const { data: userRole } = useQuery({
    queryKey: ["user-role", user?.id, profile?.organization_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("organization_id", profile!.organization_id!)
        .single();
      return data;
    },
    enabled: !!user && !!profile?.organization_id,
  });

  const { data: subscription } = useQuery({
    queryKey: ["subscription", profile?.organization_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*, plans(*)")
        .eq("organization_id", profile!.organization_id!)
        .single();
      return data;
    },
    enabled: !!profile?.organization_id,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members", profile?.organization_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*, user_roles(role)")
        .eq("organization_id", profile!.organization_id!);
      return data ?? [];
    },
    enabled: !!profile?.organization_id,
  });

  // Profile form
  const [profileForm, setProfileForm] = useState({ full_name: "", phone: "" });
  const [formInitialized, setFormInitialized] = useState(false);

  if (profile && !formInitialized) {
    setProfileForm({ full_name: profile.full_name || "", phone: profile.phone || "" });
    setFormInitialized(true);
  }

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: { full_name: string; phone: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-full"] });
      toast.success("Perfil atualizado com sucesso");
    },
    onError: () => toast.error("Erro ao atualizar perfil"),
  });

  const roleLabels: Record<string, string> = {
    admin: "Administrador",
    advogado: "Advogado",
    estagiario: "Estagiário",
    financeiro: "Financeiro",
  };

  const statusLabels: Record<string, string> = {
    trial: "Período de Teste",
    active: "Ativo",
    canceled: "Cancelado",
    past_due: "Em Atraso",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-sm text-muted-foreground">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie seu perfil, escritório e preferências</p>
      </div>

      <Tabs defaultValue="perfil" className="w-full">
        <TabsList className="mb-4 grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="perfil" className="gap-1.5 text-xs"><User className="h-3.5 w-3.5" /> Perfil</TabsTrigger>
          <TabsTrigger value="escritorio" className="gap-1.5 text-xs"><Building2 className="h-3.5 w-3.5" /> Escritório</TabsTrigger>
          <TabsTrigger value="equipe" className="gap-1.5 text-xs"><Shield className="h-3.5 w-3.5" /> Equipe</TabsTrigger>
          <TabsTrigger value="plano" className="gap-1.5 text-xs"><Settings className="h-3.5 w-3.5" /> Plano</TabsTrigger>
        </TabsList>

        {/* Perfil */}
        <TabsContent value="perfil">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-display text-lg">Meu Perfil</CardTitle>
              <CardDescription>Atualize suas informações pessoais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary font-display text-2xl">
                  {(profile?.full_name || user?.email || "U").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-foreground">{profile?.full_name || user?.email}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {roleLabels[userRole?.role || "advogado"] || userRole?.role}
                  </Badge>
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Nome Completo</Label>
                  <Input
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm((p) => ({ ...p, full_name: e.target.value }))}
                    placeholder="Seu nome completo"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Telefone</Label>
                  <Input
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input value={user?.email || ""} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado</p>
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => updateProfileMutation.mutate(profileForm)}
                  disabled={updateProfileMutation.isPending}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" /> Salvar Alterações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Escritório */}
        <TabsContent value="escritorio">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-display text-lg">Dados do Escritório</CardTitle>
              <CardDescription>Informações da organização</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nome do Escritório</Label>
                <Input value={org?.name || ""} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Para alterar, entre em contato com o suporte</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>ID da Organização</Label>
                  <Input value={org?.id || ""} disabled className="bg-muted font-mono text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label>Criado em</Label>
                  <Input
                    value={org?.created_at ? new Date(org.created_at).toLocaleDateString("pt-BR") : ""}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Equipe */}
        <TabsContent value="equipe">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-display text-lg">Equipe</CardTitle>
              <CardDescription>Membros do escritório</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {teamMembers.map((member: any) => (
                  <div key={member.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                        {(member.full_name || "U").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{member.full_name || "Sem nome"}</p>
                        <p className="text-xs text-muted-foreground">{member.phone || "Sem telefone"}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {roleLabels[member.user_roles?.[0]?.role || "advogado"] || "Membro"}
                    </Badge>
                  </div>
                ))}
                {teamMembers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">Nenhum membro encontrado</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plano */}
        <TabsContent value="plano">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-display text-lg">Plano & Assinatura</CardTitle>
              <CardDescription>Detalhes do seu plano atual</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {subscription ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/20">
                      <Settings className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-lg">{(subscription as any).plans?.name || "Plano"}</p>
                      <Badge variant={subscription.status === "active" ? "default" : "secondary"} className="text-xs">
                        {statusLabels[subscription.status] || subscription.status}
                      </Badge>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid gap-3 sm:grid-cols-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Valor</span>
                      <p className="font-medium text-foreground">
                        {((subscription as any).plans?.price_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/mês
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Máx. Usuários</span>
                      <p className="font-medium text-foreground">{(subscription as any).plans?.max_users || "—"}</p>
                    </div>
                    {subscription.trial_ends_at && (
                      <div>
                        <span className="text-muted-foreground">Teste termina em</span>
                        <p className="font-medium text-foreground">
                          {new Date(subscription.trial_ends_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    )}
                    {subscription.current_period_end && (
                      <div>
                        <span className="text-muted-foreground">Próxima cobrança</span>
                        <p className="font-medium text-foreground">
                          {new Date(subscription.current_period_end).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma assinatura encontrada</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
