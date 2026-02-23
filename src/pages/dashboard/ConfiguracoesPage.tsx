import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Settings, User, Building2, Shield, Save, Camera, MessageCircle,
  Crown, Sparkles, Check, Plus, Trash2, GripVertical, Layers, Users,
  Briefcase, Phone, Mail, Hash, MapPin, UserPlus, Minus
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
  const { t } = useTranslation();

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
  const [activeTab, setActiveTab] = useState("perfil");
  const [addUsersSeats, setAddUsersSeats] = useState(1);

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
    return <div className="flex items-center justify-center py-20"><span className="text-sm text-muted-foreground">{t("common.loading")}</span></div>;
  }

  const planIcons = ["", "✨", "🚀", "👑"];
  const planColors = ["", "from-blue-500/10 to-indigo-500/10", "from-violet-500/10 to-purple-500/10", "from-amber-500/10 to-orange-500/10"];

  const sidebarNavItems = [
    { key: "perfil", icon: User, label: t("settings.profile") },
    { key: "escritorio", icon: Building2, label: t("settings.office") },
    { key: "equipe", icon: Users, label: t("settings.team") },
    { key: "funcionarios", icon: Briefcase, label: t("settings.employees") },
    { key: "planos", icon: Crown, label: t("settings.plans") },
    { key: "usuarios", icon: UserPlus, label: t("settings.addUsers") },
  ];

  return (
    <div className="space-y-6">
      <LexaLoadingOverlay visible={uploadAvatarMutation.isPending} message={t("common.loading")} />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("settings.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Vertical Sidebar Nav ── */}
        <nav className="lg:w-56 shrink-0">
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {sidebarNavItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all whitespace-nowrap",
                  activeTab === item.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        {/* ── Content Area ── */}
        <div className="flex-1 min-w-0">
          {/* ── Perfil ── */}
          {activeTab === "perfil" && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="font-display text-lg">{t("settings.myProfile")}</CardTitle>
                <CardDescription>{t("settings.updatePersonalInfo")}</CardDescription>
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
                    <Label>{t("settings.fullName")}</Label>
                    <Input value={profileForm.full_name} onChange={(e) => setProfileForm((p) => ({ ...p, full_name: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("common.phone")}</Label>
                    <Input value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} placeholder="(00) 00000-0000" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("common.email")}</Label>
                  <Input value={user?.email || ""} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">{t("settings.emailCannotChange")}</p>
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={() => updateProfileMutation.mutate(profileForm)} disabled={updateProfileMutation.isPending} className="gap-2">
                    <Save className="h-4 w-4" /> {t("settings.saveChanges")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Escritório ── */}
          {activeTab === "escritorio" && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="font-display text-lg">{t("settings.officeData")}</CardTitle>
                <CardDescription>{t("settings.orgInfo")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>{t("settings.officeName")}</Label>
                  <Input value={org?.name || ""} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">{t("settings.contactSupport")}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{t("settings.orgId")}</Label>
                    <Input value={org?.id || ""} disabled className="bg-muted font-mono text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("settings.createdAt")}</Label>
                    <Input value={org?.created_at ? new Date(org.created_at).toLocaleDateString("pt-BR") : ""} disabled className="bg-muted" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Equipe ── */}
          {activeTab === "equipe" && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="font-display text-lg">{t("settings.team")}</CardTitle>
                <CardDescription>{t("settings.teamMembers")}</CardDescription>
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
                          <p className="text-sm font-medium text-foreground">{member.full_name || t("common.none")}</p>
                          <p className="text-xs text-muted-foreground">{member.phone || t("common.none")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Select
                          value={member.custom_role_id || "default"}
                          onValueChange={(val) => { if (val !== "default") updateMemberRoleMutation.mutate({ userId: member.user_id, custom_role_id: val }); }}
                        >
                          <SelectTrigger className="w-[180px] h-8 text-xs bg-background"><SelectValue placeholder={t("settings.accessLevel")} /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default" disabled className="text-xs">{roleLabels[member.user_roles?.[0]?.role || "advogado"] || "Membro"}</SelectItem>
                            {customRoles.map((r: any) => (<SelectItem key={r.id} value={r.id} className="text-xs">{r.name}</SelectItem>))}
                          </SelectContent>
                        </Select>
                        <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">
                          {member.custom_roles?.name || roleLabels[member.user_roles?.[0]?.role || "advogado"] || "Membro"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {teamMembers.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">{t("common.noResults")}</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Funcionários ── */}
          {activeTab === "funcionarios" && (
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-display text-lg">{t("settings.registerEmployee")}</CardTitle>
                  <CardDescription>{employees.length} {t("settings.employees").toLowerCase()}</CardDescription>
                </div>
                <Button size="sm" className="gap-2" onClick={() => { setEditingEmployee(null); setEmpForm(emptyEmployee); setEmpDialogOpen(true); }}>
                  <Plus className="h-4 w-4" /> {t("settings.newEmployee")}
                </Button>
              </CardHeader>
              <CardContent>
                {employees.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-center">
                    <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="font-medium text-foreground">{t("settings.noEmployees")}</p>
                    <p className="text-sm text-muted-foreground mt-1">{t("settings.noEmployeesHint")}</p>
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
                              {!emp.is_active && <Badge variant="secondary" className="text-[10px]">{t("common.inactive")}</Badge>}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                              {emp.position && <span>{emp.position}</span>}
                              {emp.department && <span>• {emp.department}</span>}
                              {emp.oab_number && <span className="flex items-center gap-1"><Hash className="h-3 w-3" />{t("settings.oabNumber")} {emp.oab_number}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {emp.hourly_rate && <Badge variant="outline" className="text-[10px]">R$ {emp.hourly_rate}/h</Badge>}
                          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => openEditEmployee(emp)}>{t("common.edit")}</Button>
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
          )}

          {/* ── Planos ── */}
          {activeTab === "planos" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">{t("settings.availablePlans")}</h2>
                <p className="text-sm text-muted-foreground">{t("settings.chooseBestPlan")}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {plans.map((plan, i) => {
                  const isCurrent = orgSubscription?.subscription_plans?.slug === plan.slug;
                  return (
                    <Card key={plan.id} className={cn("relative border-border overflow-hidden transition-shadow hover:shadow-md", isCurrent && "ring-2 ring-primary")}>
                      {isCurrent && <Badge className="absolute top-3 right-3 text-[10px]">{t("settings.currentPlan")}</Badge>}
                      <CardHeader className="pb-3">
                        <div className="text-2xl mb-1">{planIcons[i + 1] || "✨"}</div>
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-3xl font-bold">R$ {plan.price_monthly}</span>
                          <span className="text-sm text-muted-foreground">/mês</span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Separator className="mb-4" />
                        <ul className="space-y-2">
                          {plan.features.map((f, fi) => (
                            <li key={fi} className="flex items-start gap-2 text-sm">
                              <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                        <Button variant={isCurrent ? "outline" : "default"} className="w-full mt-6" disabled={isCurrent}>
                          {isCurrent ? t("settings.currentPlan") : t("settings.subscribe")}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Usuários Adicionais ── */}
          {activeTab === "usuarios" && (
            <div className="space-y-6">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-primary" />
                    {t("settings.addUsersTitle")}
                  </CardTitle>
                  <CardDescription>{t("settings.addUsersDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">{t("settings.addUsersPrice")}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t("settings.addUsersInfo")}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => setAddUsersSeats(Math.max(1, addUsersSeats - 1))}
                          disabled={addUsersSeats <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <div className="flex flex-col items-center min-w-[60px]">
                          <span className="text-3xl font-bold text-foreground">{addUsersSeats}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            {addUsersSeats === 1 ? "usuário" : "usuários"}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => setAddUsersSeats(addUsersSeats + 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Separator className="my-4" />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{t("common.total")}</p>
                        <p className="text-2xl font-bold text-foreground">
                          R$ {(addUsersSeats * 49.90).toFixed(2).replace(".", ",")}
                          <span className="text-sm font-normal text-muted-foreground">/mês</span>
                        </p>
                      </div>
                      <Button className="gap-2" onClick={() => toast.success(`${addUsersSeats} assento(s) adicionado(s)!`)}>
                        <UserPlus className="h-4 w-4" /> {t("settings.confirmAddUsers")}
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-border p-4 text-center">
                      <p className="text-2xl font-bold text-foreground">{teamMembers.length}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t("settings.currentSeats")}</p>
                    </div>
                    <div className="rounded-lg border border-border p-4 text-center">
                      <p className="text-2xl font-bold text-primary">+{addUsersSeats}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t("settings.addSeat")}</p>
                    </div>
                    <div className="rounded-lg border border-border p-4 text-center">
                      <p className="text-2xl font-bold text-emerald-600">{teamMembers.length + addUsersSeats}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t("common.total")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* ── Employee Dialog ── */}
      <Dialog open={empDialogOpen} onOpenChange={setEmpDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? t("settings.editEmployee") : t("settings.newEmployee")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("settings.fullName")} *</Label>
                <Input value={empForm.full_name} onChange={(e) => setEmpForm((f) => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("common.email")}</Label>
                <Input value={empForm.email} onChange={(e) => setEmpForm((f) => ({ ...f, email: e.target.value }))} type="email" />
              </div>
              <div className="space-y-1.5">
                <Label>{t("common.phone")}</Label>
                <Input value={empForm.phone} onChange={(e) => setEmpForm((f) => ({ ...f, phone: e.target.value }))} placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-1.5">
                <Label>{t("settings.oabNumber")}</Label>
                <Input value={empForm.oab_number} onChange={(e) => setEmpForm((f) => ({ ...f, oab_number: e.target.value }))} placeholder="123456/SP" />
              </div>
              <div className="space-y-1.5">
                <Label>{t("settings.position")}</Label>
                <Input value={empForm.position} onChange={(e) => setEmpForm((f) => ({ ...f, position: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("settings.department")}</Label>
                <Input value={empForm.department} onChange={(e) => setEmpForm((f) => ({ ...f, department: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("settings.hireDate")}</Label>
                <Input type="date" value={empForm.hire_date} onChange={(e) => setEmpForm((f) => ({ ...f, hire_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("settings.hourlyRate")}</Label>
                <Input type="number" value={empForm.hourly_rate} onChange={(e) => setEmpForm((f) => ({ ...f, hourly_rate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("settings.unit")}</Label>
                <Select value={empForm.unit_id} onValueChange={(v) => setEmpForm((f) => ({ ...f, unit_id: v }))}>
                  <SelectTrigger><SelectValue placeholder={t("common.select")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("common.none")}</SelectItem>
                    {units.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("settings.notes")}</Label>
              <Textarea value={empForm.notes} onChange={(e) => setEmpForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmpDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleEmpSubmit} disabled={!empForm.full_name || createEmployeeMutation.isPending || updateEmployeeMutation.isPending}>
              {editingEmployee ? t("common.save") : t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

