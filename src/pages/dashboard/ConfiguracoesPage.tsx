import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Settings, User, Building2, Shield, Save, Camera, MessageCircle,
  Crown, Sparkles, Check, Plus, Trash2, GripVertical, Layers, Users,
  Briefcase, Phone, Mail, Hash, MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import LexaLoadingOverlay from "@/components/shared/LexaLoadingOverlay";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────
interface Plan { id: string; name: string; slug: string; price_monthly: number; price_yearly: number; max_users: number; max_processes: number; features: string[]; is_active: boolean; sort_order: number; }
interface CustomOption { id: string; organization_id: string; module: string; field_name: string; label: string; value: string; color: string | null; sort_order: number; is_active: boolean; }
interface Employee { id: string; organization_id: string; user_id: string | null; full_name: string; email: string | null; phone: string | null; oab_number: string | null; department: string | null; position: string | null; hire_date: string | null; hourly_rate: number | null; unit_id: string | null; is_active: boolean; notes: string | null; }

const MODULES = [
  { value: "processos", label: "Processos" },
  { value: "clientes", label: "Clientes" },
  { value: "financeiro", label: "Financeiro" },
  { value: "agenda", label: "Agenda" },
  { value: "timesheet", label: "Timesheet" },
  { value: "crm", label: "CRM" },
  { value: "geral", label: "Geral" },
];

const emptyEmployee = { full_name: "", email: "", phone: "", oab_number: "", department: "", position: "", hire_date: "", hourly_rate: "", unit_id: "none", notes: "" };
const emptyOption = { module: "geral", field_name: "", label: "", value: "", color: "#6366f1" };

// ─── ConfiguracoesPage ────────────────────────────────────────
export default function ConfiguracoesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // ── Queries ──
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile-full", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: org } = useQuery({
    queryKey: ["org", profile?.organization_id],
    queryFn: async () => {
      const { data } = await supabase.from("organizations").select("*").eq("id", profile!.organization_id!).single();
      return data;
    },
    enabled: !!profile?.organization_id,
  });

  const { data: userRole } = useQuery({
    queryKey: ["user-role", user?.id, profile?.organization_id],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id).eq("organization_id", profile!.organization_id!).single();
      return data;
    },
    enabled: !!user && !!profile?.organization_id,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["team-members", profile?.organization_id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*, user_roles(role), custom_roles(name)").eq("organization_id", profile!.organization_id!);
      return data ?? [];
    },
    enabled: !!profile?.organization_id,
  });

  const { data: customRoles = [] } = useQuery({
    queryKey: ["custom-roles", profile?.organization_id],
    queryFn: async () => {
      const { data } = await supabase.from("custom_roles").select("*").eq("organization_id", profile!.organization_id!);
      return data ?? [];
    },
    enabled: !!profile?.organization_id,
  });

  const FALLBACK_PLANS: Plan[] = [
    { id: "free", name: "Free", slug: "free", price_monthly: 0, price_yearly: 0, max_users: 2, max_processes: 50, features: ["2 usuários", "50 processos", "Agenda básica", "Timesheet", "Chat interno"], is_active: true, sort_order: 1 },
    { id: "pro", name: "Pro", slug: "pro", price_monthly: 197, price_yearly: 1970, max_users: 10, max_processes: 500, features: ["10 usuários", "500 processos", "Agenda avançada", "Timesheet + BI", "CRM completo", "Integrações", "ARUNA IA", "Suporte prioritário"], is_active: true, sort_order: 2 },
    { id: "enterprise", name: "Enterprise", slug: "enterprise", price_monthly: 497, price_yearly: 4970, max_users: -1, max_processes: -1, features: ["Usuários ilimitados", "Processos ilimitados", "Multi-unidades", "Workflow avançado", "API dedicada", "IA personalizada", "SLA 99.9%", "Gerente de conta"], is_active: true, sort_order: 3 },
  ];

  const { data: dbPlans = [] } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data } = await supabase.from("subscription_plans" as any).select("*").eq("is_active", true).order("sort_order");
      return (data ?? []) as unknown as Plan[];
    },
  });
  const plans = dbPlans.length > 0 ? dbPlans : FALLBACK_PLANS;

  const { data: orgSubscription } = useQuery({
    queryKey: ["org-subscription", profile?.organization_id],
    queryFn: async () => {
      const { data } = await supabase.from("organization_subscriptions" as any).select("*, subscription_plans(*)").eq("organization_id", profile!.organization_id!).single();
      return data as any;
    },
    enabled: !!profile?.organization_id,
  });

  const { data: customOptions = [] } = useQuery({
    queryKey: ["custom-options", profile?.organization_id],
    queryFn: async () => {
      const { data } = await supabase.from("custom_options" as any).select("*").eq("organization_id", profile!.organization_id!).order("module").order("sort_order");
      return (data ?? []) as unknown as CustomOption[];
    },
    enabled: !!profile?.organization_id,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", profile?.organization_id],
    queryFn: async () => {
      const { data } = await supabase.from("employees" as any).select("*").eq("organization_id", profile!.organization_id!).order("full_name");
      return (data ?? []) as unknown as Employee[];
    },
    enabled: !!profile?.organization_id,
  });

  const { data: units = [] } = useQuery({
    queryKey: ["units-list", profile?.organization_id],
    queryFn: async () => {
      const { data } = await supabase.from("units").select("id, name").eq("organization_id", profile!.organization_id!);
      return data ?? [];
    },
    enabled: !!profile?.organization_id,
  });

  // ── State ──
  const [profileForm, setProfileForm] = useState({ full_name: "", phone: "" });
  const [orgForm, setOrgForm] = useState({ whatsapp_instance_id: "", whatsapp_token: "", whatsapp_enabled: false });
  const [formInitialized, setFormInitialized] = useState(false);

  const [empDialogOpen, setEmpDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null);
  const [empForm, setEmpForm] = useState(emptyEmployee);

  const [optDialogOpen, setOptDialogOpen] = useState(false);
  const [optForm, setOptForm] = useState(emptyOption);
  const [optFilterModule, setOptFilterModule] = useState("all");

  if (profile && org && !formInitialized) {
    setProfileForm({ full_name: profile.full_name || "", phone: profile.phone || "" });
    setOrgForm({
      whatsapp_instance_id: org.whatsapp_instance_id || "",
      whatsapp_token: org.whatsapp_token || "",
      whatsapp_enabled: org.whatsapp_enabled || false,
    });
    setFormInitialized(true);
  }

  // ── Mutations ──
  const updateProfileMutation = useMutation({
    mutationFn: async (payload: { full_name: string; phone: string }) => {
      const { error } = await supabase.from("profiles").update(payload).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["profile-full"] }); toast.success("Perfil atualizado"); },
    onError: () => toast.error("Erro ao atualizar perfil"),
  });

  const updateOrgMutation = useMutation({
    mutationFn: async (payload: { whatsapp_instance_id: string; whatsapp_token: string; whatsapp_enabled: boolean }) => {
      const { error } = await supabase.from("organizations").update(payload).eq("id", profile!.organization_id!);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["org"] }); toast.success("Organização atualizada"); },
    onError: () => toast.error("Erro ao atualizar as configurações da Organização"),
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const filePath = `avatars/${user!.id}-${Date.now()}.${file.name.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage.from("documentos").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("documentos").getPublicUrl(filePath);
      const { error: dbError } = await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("user_id", user!.id);
      if (dbError) throw dbError;
      return urlData.publicUrl;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["profile-full"] }); toast.success("Foto atualizada"); },
    onError: () => toast.error("Erro ao atualizar foto"),
  });

  const updateMemberRoleMutation = useMutation({
    mutationFn: async ({ userId, custom_role_id }: { userId: string; custom_role_id: string }) => {
      const { error } = await supabase.from("profiles").update({ custom_role_id }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["team-members"] }); toast.success("Nível de acesso atualizado"); },
  });

  // Employee mutations
  const createEmployeeMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase.from("employees" as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["employees"] }); toast.success("Funcionário cadastrado!"); setEmpDialogOpen(false); },
    onError: () => toast.error("Erro ao cadastrar funcionário"),
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      const { error } = await supabase.from("employees" as any).update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["employees"] }); toast.success("Funcionário atualizado!"); setEmpDialogOpen(false); },
    onError: () => toast.error("Erro ao atualizar funcionário"),
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employees" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["employees"] }); toast.success("Funcionário removido"); },
  });

  // Option mutations
  const createOptionMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { error } = await supabase.from("custom_options" as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["custom-options"] }); toast.success("Opção criada!"); setOptDialogOpen(false); },
    onError: () => toast.error("Erro ao criar opção"),
  });

  const deleteOptionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("custom_options" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["custom-options"] }); toast.success("Opção removida"); },
  });

  // ── Handlers ──
  const handleEmpSubmit = () => {
    const payload = {
      organization_id: profile!.organization_id!,
      full_name: empForm.full_name,
      email: empForm.email || null,
      phone: empForm.phone || null,
      oab_number: empForm.oab_number || null,
      department: empForm.department || null,
      position: empForm.position || null,
      hire_date: empForm.hire_date || null,
      hourly_rate: empForm.hourly_rate ? Number(empForm.hourly_rate) : null,
      unit_id: empForm.unit_id === "none" ? null : empForm.unit_id,
      notes: empForm.notes || null,
    };
    if (editingEmployee) {
      updateEmployeeMutation.mutate({ id: editingEmployee, ...payload });
    } else {
      createEmployeeMutation.mutate(payload);
    }
  };

  const openEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp.id);
    setEmpForm({
      full_name: emp.full_name, email: emp.email || "", phone: emp.phone || "",
      oab_number: emp.oab_number || "", department: emp.department || "", position: emp.position || "",
      hire_date: emp.hire_date || "", hourly_rate: emp.hourly_rate?.toString() || "",
      unit_id: emp.unit_id || "none", notes: emp.notes || "",
    });
    setEmpDialogOpen(true);
  };

  const handleOptSubmit = () => {
    createOptionMutation.mutate({
      organization_id: profile!.organization_id!,
      module: optForm.module,
      field_name: optForm.field_name,
      label: optForm.label,
      value: optForm.value || optForm.label.toLowerCase().replace(/\s+/g, "_"),
      color: optForm.color || null,
    });
  };

  const roleLabels: Record<string, string> = { admin: "Administrador", advogado: "Advogado", estagiario: "Estagiário", financeiro: "Financeiro" };

  const filteredOptions = optFilterModule === "all" ? customOptions : customOptions.filter((o) => o.module === optFilterModule);

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><span className="text-sm text-muted-foreground">Carregando...</span></div>;
  }

  const planIcons = ["", "✨", "🚀", "👑"];
  const planColors = ["", "from-blue-500/10 to-indigo-500/10", "from-violet-500/10 to-purple-500/10", "from-amber-500/10 to-orange-500/10"];

  return (
    <div className="space-y-6">
      <LexaLoadingOverlay visible={uploadAvatarMutation.isPending} message="Atualizando foto..." />

      <div>
        <h1 className="font-display text-2xl text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie seu perfil, escritório e preferências</p>
      </div>

      <Tabs defaultValue="perfil" className="w-full">
        <TabsList className="mb-4 flex flex-wrap gap-1 w-full max-w-2xl h-auto">
          <TabsTrigger value="perfil" className="gap-1.5 text-xs"><User className="h-3.5 w-3.5" /> Perfil</TabsTrigger>
          <TabsTrigger value="escritorio" className="gap-1.5 text-xs"><Building2 className="h-3.5 w-3.5" /> Escritório</TabsTrigger>
          <TabsTrigger value="equipe" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" /> Equipe</TabsTrigger>
          <TabsTrigger value="funcionarios" className="gap-1.5 text-xs"><Briefcase className="h-3.5 w-3.5" /> Funcionários</TabsTrigger>
          <TabsTrigger value="planos" className="gap-1.5 text-xs"><Crown className="h-3.5 w-3.5" /> Planos</TabsTrigger>
        </TabsList>

        {/* ── Perfil Tab ── */}
        <TabsContent value="perfil">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-display text-lg">Meu Perfil</CardTitle>
              <CardDescription>Atualize suas informações pessoais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative group">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="h-16 w-16 rounded-full object-cover border-2 border-border" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary font-display text-2xl">
                      {(profile?.full_name || user?.email || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <button type="button" onClick={() => avatarInputRef.current?.click()} className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="h-5 w-5 text-white" />
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadAvatarMutation.mutate(file); }} />
                </div>
                <div>
                  <p className="font-medium text-foreground">{profile?.full_name || user?.email}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <Badge variant="outline" className="mt-1 text-xs">{roleLabels[userRole?.role || "advogado"] || userRole?.role}</Badge>
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Nome Completo</Label>
                  <Input value={profileForm.full_name} onChange={(e) => setProfileForm((p) => ({ ...p, full_name: e.target.value }))} placeholder="Seu nome completo" />
                </div>
                <div className="space-y-1.5">
                  <Label>Telefone</Label>
                  <Input value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} placeholder="(00) 00000-0000" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input value={user?.email || ""} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado</p>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={() => updateProfileMutation.mutate(profileForm)} disabled={updateProfileMutation.isPending} className="gap-2">
                  <Save className="h-4 w-4" /> Salvar Alterações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Escritório Tab ── */}
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
                  <Input value={org?.created_at ? new Date(org.created_at).toLocaleDateString("pt-BR") : ""} disabled className="bg-muted" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Equipe Tab (RBAC) ── */}
        <TabsContent value="equipe">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-display text-lg">Equipe</CardTitle>
              <CardDescription>Membros com acesso ao sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {teamMembers.map((member: any) => (
                  <div key={member.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex items-center gap-3">
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                          {(member.full_name || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">{member.full_name || "Sem nome"}</p>
                        <p className="text-xs text-muted-foreground">{member.phone || "Sem telefone"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Select
                        value={member.custom_role_id || "default"}
                        onValueChange={(val) => { if (val !== "default") updateMemberRoleMutation.mutate({ userId: member.user_id, custom_role_id: val }); }}
                      >
                        <SelectTrigger className="w-[180px] h-8 text-xs bg-background"><SelectValue placeholder="Nível de Acesso" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default" disabled className="text-xs">Cargo Original: {roleLabels[member.user_roles?.[0]?.role || "advogado"] || "Membro"}</SelectItem>
                          {customRoles.map((r: any) => (<SelectItem key={r.id} value={r.id} className="text-xs">{r.name}</SelectItem>))}
                        </SelectContent>
                      </Select>
                      <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">
                        {member.custom_roles?.name || roleLabels[member.user_roles?.[0]?.role || "advogado"] || "Membro"}
                      </Badge>
                    </div>
                  </div>
                ))}
                {teamMembers.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhum membro encontrado</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Funcionários Tab (NEW) ── */}
        <TabsContent value="funcionarios">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-display text-lg">Cadastro de Funcionários</CardTitle>
                <CardDescription>{employees.length} funcionários cadastrados</CardDescription>
              </div>
              <Button size="sm" className="gap-2" onClick={() => { setEditingEmployee(null); setEmpForm(emptyEmployee); setEmpDialogOpen(true); }}>
                <Plus className="h-4 w-4" /> Novo Funcionário
              </Button>
            </CardHeader>
            <CardContent>
              {employees.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="font-medium text-foreground">Nenhum funcionário cadastrado</p>
                  <p className="text-sm text-muted-foreground mt-1">Clique em "Novo Funcionário" para começar.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {employees.map((emp) => (
                    <div key={emp.id} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium shrink-0">
                          {emp.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground truncate">{emp.full_name}</p>
                            {!emp.is_active && <Badge variant="secondary" className="text-[10px]">Inativo</Badge>}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                            {emp.position && <span>{emp.position}</span>}
                            {emp.department && <span>• {emp.department}</span>}
                            {emp.oab_number && <span className="flex items-center gap-1"><Hash className="h-3 w-3" />OAB {emp.oab_number}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {emp.hourly_rate && <Badge variant="outline" className="text-[10px]">R$ {emp.hourly_rate}/h</Badge>}
                        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => openEditEmployee(emp)}>Editar</Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteEmployeeMutation.mutate(emp.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Planos Tab ── */}
        <TabsContent value="planos">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Planos & Preços</h2>
              <p className="text-sm text-muted-foreground">Compare os planos e escolha o ideal para seu escritório. Usuários adicionais: R$49,90/mês.</p>
            </div>

            <div className="overflow-x-auto border border-border rounded-xl">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 font-medium text-muted-foreground w-[40%]">Recurso</th>
                    <th className="p-4 text-center">
                      <div className="font-semibold text-foreground">Básico</div>
                      <div className="text-2xl font-bold text-foreground mt-1">R$ 120<span className="text-xs font-normal text-muted-foreground">/mês</span></div>
                      <div className="text-[10px] text-muted-foreground">Para advogados autônomos</div>
                    </th>
                    <th className="p-4 text-center bg-primary/5 border-x border-primary/10 relative">
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px]">Mais Popular</Badge>
                      <div className="font-semibold text-primary">PRO</div>
                      <div className="text-2xl font-bold text-primary mt-1">R$ 390<span className="text-xs font-normal text-muted-foreground">/mês</span></div>
                      <div className="text-[10px] text-muted-foreground">Para escritórios em crescimento</div>
                    </th>
                    <th className="p-4 text-center">
                      <div className="font-semibold text-foreground">Business</div>
                      <div className="text-2xl font-bold text-foreground mt-1">R$ 600<span className="text-xs font-normal text-muted-foreground">/mês</span></div>
                      <div className="text-[10px] text-muted-foreground">Para escritórios de grande porte</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: "Usuários inclusos", basico: "1", pro: "3", business: "5" },
                    { feature: "Gestão de processos", basico: "Até 50", pro: "Ilimitados", business: "Ilimitados" },
                    { feature: "Agenda integrada com alertas", basico: true, pro: true, business: true },
                    { feature: "Calculadora jurídica", basico: true, pro: true, business: true },
                    { feature: "Gestão de clientes", basico: "CRM básico", pro: "CRM avançado", business: "CRM avançado" },
                    { feature: "ARUNA IA", basico: "50 consultas/mês", pro: "Ilimitado", business: "Ilimitado + Personalizada" },
                    { feature: "Integração com tribunais", basico: false, pro: true, business: true },
                    { feature: "Financeiro completo", basico: false, pro: true, business: true },
                    { feature: "Transcrição de audiências", basico: false, pro: true, business: true },
                    { feature: "Pesquisa de jurisprudência IA", basico: false, pro: true, business: true },
                    { feature: "Relatórios e dashboards", basico: false, pro: true, business: true },
                    { feature: "BI completo avançado", basico: false, pro: false, business: true },
                    { feature: "API aberta para integrações", basico: false, pro: false, business: true },
                    { feature: "Análise de documentos com IA", basico: false, pro: false, business: true },
                    { feature: "Geração automática de peças", basico: false, pro: false, business: true },
                    { feature: "Treinamento dedicado", basico: false, pro: false, business: true },
                    { feature: "SLA garantido 99.9%", basico: false, pro: false, business: true },
                    { feature: "Gerente de conta exclusivo", basico: false, pro: false, business: true },
                    { feature: "Suporte", basico: "E-mail", pro: "Prioritário", business: "Dedicado" },
                  ].map((row, i) => (
                    <tr key={i} className={cn("border-b border-border/50 last:border-0", i % 2 === 0 ? "bg-background" : "bg-muted/10")}>
                      <td className="p-3 pl-4 text-foreground font-medium text-[13px]">{row.feature}</td>
                      {(["basico", "pro", "business"] as const).map((plan) => {
                        const val = row[plan];
                        return (
                          <td key={plan} className={cn("p-3 text-center", plan === "pro" && "bg-primary/5 border-x border-primary/10")}>
                            {val === true ? (
                              <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                            ) : val === false ? (
                              <span className="text-muted-foreground/30">—</span>
                            ) : (
                              <span className="text-xs font-medium text-foreground">{val}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-muted/20">
                    <td className="p-4"></td>
                    <td className="p-4 text-center">
                      <Button variant="outline" size="sm" className="w-full text-xs">Começar Agora</Button>
                    </td>
                    <td className="p-4 text-center bg-primary/5 border-x border-primary/10">
                      <Button size="sm" className="w-full text-xs">Escolher PRO</Button>
                    </td>
                    <td className="p-4 text-center">
                      <Button variant="outline" size="sm" className="w-full text-xs">Falar com Consultor</Button>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </TabsContent>


      </Tabs>

      {/* ── Employee Dialog ── */}
      <Dialog open={empDialogOpen} onOpenChange={setEmpDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? "Editar Funcionário" : "Novo Funcionário"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Nome Completo *</Label>
                <Input value={empForm.full_name} onChange={(e) => setEmpForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="Nome completo" />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input value={empForm.email} onChange={(e) => setEmpForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" type="email" />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={empForm.phone} onChange={(e) => setEmpForm((f) => ({ ...f, phone: e.target.value }))} placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-1.5">
                <Label>Nº OAB</Label>
                <Input value={empForm.oab_number} onChange={(e) => setEmpForm((f) => ({ ...f, oab_number: e.target.value }))} placeholder="Ex: 123456/SP" />
              </div>
              <div className="space-y-1.5">
                <Label>Cargo</Label>
                <Input value={empForm.position} onChange={(e) => setEmpForm((f) => ({ ...f, position: e.target.value }))} placeholder="Ex: Advogado Sênior" />
              </div>
              <div className="space-y-1.5">
                <Label>Departamento</Label>
                <Input value={empForm.department} onChange={(e) => setEmpForm((f) => ({ ...f, department: e.target.value }))} placeholder="Ex: Cível" />
              </div>
              <div className="space-y-1.5">
                <Label>Data de Admissão</Label>
                <Input type="date" value={empForm.hire_date} onChange={(e) => setEmpForm((f) => ({ ...f, hire_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Valor/Hora (R$)</Label>
                <Input type="number" value={empForm.hourly_rate} onChange={(e) => setEmpForm((f) => ({ ...f, hourly_rate: e.target.value }))} placeholder="Ex: 350" />
              </div>
              <div className="space-y-1.5">
                <Label>Unidade</Label>
                <Select value={empForm.unit_id} onValueChange={(v) => setEmpForm((f) => ({ ...f, unit_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem unidade</SelectItem>
                    {units.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea value={empForm.notes} onChange={(e) => setEmpForm((f) => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Notas internas sobre o funcionário" className="resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmpDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleEmpSubmit} disabled={!empForm.full_name || createEmployeeMutation.isPending || updateEmployeeMutation.isPending}>
              {editingEmployee ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
}
