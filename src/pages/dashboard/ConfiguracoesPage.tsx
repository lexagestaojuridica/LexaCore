import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Settings, User, Building2, Shield, Save, Camera, MessageCircle,
  Crown, Sparkles, Check, Plus, Trash2, GripVertical, Layers, Users,
  Briefcase, Phone, Mail, Hash, MapPin, UserPlus, Minus,
  Globe, CreditCard, Link, ExternalLink, Key, Scale, Link2, Bot, CalendarDays
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LexaLoadingOverlay from "@/components/shared/LexaLoadingOverlay";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { useMicrosoftCalendar } from "@/hooks/useMicrosoftCalendar";
import { toast } from "sonner";

// FSD Imports
import { useConfiguracoes } from "@/features/configuracoes/hooks/useConfiguracoes";
import { EmployeeDialog } from "@/features/configuracoes/components/EmployeeDialog";
import type { Employee } from "@/features/configuracoes/types";

// ─── ConfiguracoesPage ────────────────────────────────────────
export default function ConfiguracoesPage() {
  const { t } = useTranslation();
  const gcal = useGoogleCalendar();
  const mscal = useMicrosoftCalendar();

  const {
    user, profile, org, userRole, isLoading,
    teamMembers, customRoles, plans, employees, units,
    orgSubscription,
    profileForm, setProfileForm, orgForm, setOrgForm,
    avatarInputRef,
    updateProfileMutation, updateOrgMutation, uploadAvatarMutation,
    updateMemberRoleMutation,
    createEmployeeMutation, updateEmployeeMutation, deleteEmployeeMutation,
    updateGatewayMutation,
    handleSubscribe, handleSaveIntegration,
  } = useConfiguracoes();

  const [activeTab, setActiveTab] = useState("perfil");
  const [addUsersSeats, setAddUsersSeats] = useState(1);

  // Employee dialog
  const [empDialogOpen, setEmpDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const handleEmpSubmit = (payload: Record<string, unknown>, isEdit: boolean, editId?: string) => {
    if (isEdit && editId) {
      updateEmployeeMutation.mutate({ id: editId, ...payload }, { onSuccess: () => setEmpDialogOpen(false) });
    } else {
      createEmployeeMutation.mutate(payload, { onSuccess: () => setEmpDialogOpen(false) });
    }
  };

  const roleLabels: Record<string, string> = { admin: "Administrador", advogado: "Advogado", estagiario: "Estagiário", financeiro: "Financeiro" };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><span className="text-sm text-muted-foreground">{t("common.loading")}</span></div>;
  }

  const sidebarNavItems = [
    { key: "perfil", icon: User, label: t("settings.profile") || "Meu Perfil" },
    { key: "escritorio", icon: Building2, label: t("settings.office") || "Escritório" },
    { key: "equipe", icon: Users, label: t("settings.team") || "Equipe" },
    { key: "funcionarios", icon: Briefcase, label: t("settings.employees") || "Funcionários" },
    { key: "planos", icon: Crown, label: t("settings.plans") || "Planos" },
    { key: "usuarios", icon: UserPlus, label: t("settings.addUsers") || "Adicionar Usuários" },
    { key: "integracoes", icon: Link2, label: "Integrações" },
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
                <Button size="sm" className="gap-2" onClick={() => { setEditingEmployee(null); setEmpDialogOpen(true); }}>
                  <Plus className="h-4 w-4" /> {t("settings.newEmployee")}
                </Button>
              </CardHeader>
              <CardContent>
                {employees.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center bg-muted/5 border-2 border-dashed border-border/50 rounded-lg m-4">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Users className="h-8 w-8 text-primary" />
                    </div>
                    <p className="text-lg font-semibold tracking-tight mb-1">{t("settings.noEmployees")}</p>
                    <p className="text-sm text-muted-foreground max-w-sm mb-6 pb-2">{t("settings.noEmployeesHint")}</p>
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
                          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setEditingEmployee(emp); setEmpDialogOpen(true); }}>{t("common.edit")}</Button>
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
                  const isCurrent = orgSubscription?.plans?.slug === plan.slug;
                  const planIcons = ["", "✨", "🚀", "👑"];
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
                        <Button variant={isCurrent ? "outline" : "default"} className="w-full mt-6" disabled={isCurrent} onClick={() => handleSubscribe(plan.slug)}>
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
                        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setAddUsersSeats(Math.max(1, addUsersSeats - 1))} disabled={addUsersSeats <= 1}>
                          <Minus className="h-4 w-4" />
                        </Button>
                        <div className="flex flex-col items-center min-w-[60px]">
                          <span className="text-3xl font-bold text-foreground">{addUsersSeats}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{addUsersSeats === 1 ? "usuário" : "usuários"}</span>
                        </div>
                        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setAddUsersSeats(addUsersSeats + 1)}>
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

          {/* ── Integrações ── */}
          {activeTab === "integracoes" && (
            <Card className="border-border shadow-sm">
              <CardHeader className="border-b border-border/50 bg-muted/5">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Integrações e Conectividade
                </CardTitle>
                <CardDescription>Gerencie as conexões externas e chaves de API do seu escritório.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 pt-6">
                {/* WHATSAPP */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-500/10 p-2.5 rounded-xl"><MessageCircle className="h-5 w-5 text-emerald-600" /></div>
                      <div>
                        <p className="font-semibold text-sm">WhatsApp Business (API)</p>
                        <p className="text-xs text-muted-foreground">Envio automático de notificações e lembretes.</p>
                      </div>
                    </div>
                    <Switch checked={orgForm.whatsapp_enabled} onCheckedChange={(v) => setOrgForm(prev => ({ ...prev, whatsapp_enabled: v }))} />
                  </div>
                  {orgForm.whatsapp_enabled && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 pl-12">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">ID da Instância (WaAPI)</Label>
                          <Input placeholder="instance_id" value={orgForm.whatsapp_instance_id || ""} onChange={(e) => setOrgForm(prev => ({ ...prev, whatsapp_instance_id: e.target.value }))} className="text-xs font-mono" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Token de Acesso</Label>
                          <Input type="password" placeholder="token_..." value={orgForm.whatsapp_token || ""} onChange={(e) => setOrgForm(prev => ({ ...prev, whatsapp_token: e.target.value }))} className="text-xs font-mono" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                <Separator />

                {/* ASAAS */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2.5 rounded-xl"><CreditCard className="h-5 w-5 text-primary" /></div>
                      <div>
                        <p className="font-semibold text-sm">Asaas Gateway</p>
                        <p className="text-xs text-muted-foreground">Gestão financeira e cobranças automáticas.</p>
                      </div>
                    </div>
                    <Switch checked={orgForm.asaas_enabled} onCheckedChange={(v) => setOrgForm(prev => ({ ...prev, asaas_enabled: v }))} />
                  </div>
                  {orgForm.asaas_enabled && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 pl-12">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">API Key</Label>
                        <Input type="password" placeholder="$asaas_api_key_..." value={orgForm.asaas_api_key || ""} onChange={(e) => setOrgForm(prev => ({ ...prev, asaas_api_key: e.target.value }))} className="text-xs font-mono" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Ambiente</Label>
                        <Select value={orgForm.asaas_environment || "sandbox"} onValueChange={(v) => setOrgForm(prev => ({ ...prev, asaas_environment: v }))}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sandbox">Sandbox (Teste)</SelectItem>
                            <SelectItem value="production">Produção</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </motion.div>
                  )}
                </div>

                <Separator />

                {/* LEGAL DATA */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-amber-500/10 p-2.5 rounded-xl"><Scale className="h-5 w-5 text-amber-600" /></div>
                    <div>
                      <p className="font-semibold text-sm">Dados Jurídicos Automáticos</p>
                      <p className="text-xs text-muted-foreground">Conexão com tribunais via Jusbrasil e Escavador.</p>
                    </div>
                  </div>
                  <div className="grid gap-6 pl-12">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Token Jusbrasil</Label>
                      <Input type="password" placeholder="Insira seu token Jusbrasil" value={orgForm.jusbrasil_token || ""} onChange={(e) => setOrgForm(prev => ({ ...prev, jusbrasil_token: e.target.value }))} className="text-xs font-mono" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Chave API Escavador</Label>
                      <Input type="password" placeholder="Insira sua chave Escavador" value={orgForm.escavador_token || ""} onChange={(e) => setOrgForm(prev => ({ ...prev, escavador_token: e.target.value }))} className="text-xs font-mono" />
                    </div>
                  </div>
                </div>

                {/* CALENDARS (Google & Microsoft) */}
                <Separator />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card className="border-border opacity-80 hover:opacity-100 transition-opacity flex flex-col h-full">
                    <CardHeader className="pb-3 border-b border-border/50">
                      <CardTitle className="font-display text-base flex items-center justify-between">
                        <div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-blue-500" /> Google Calendar</div>
                        {gcal.isConnected && <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">Conectado</Badge>}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 flex-1 flex flex-col justify-between">
                      <p className="text-sm text-muted-foreground mb-4">Sincronização bidirecional de eventos e audiências com sua conta Google.</p>
                      {gcal.isConnected ? (
                        <div className="space-y-2 w-full">
                          <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => gcal.importEvents()} disabled={gcal.importing}>Importar</Button>
                            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => gcal.exportEvents()} disabled={gcal.exporting}>Exportar</Button>
                          </div>
                          <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => gcal.disconnect()}>Desconectar</Button>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs border-blue-500/30 text-blue-600 hover:bg-blue-500/10" onClick={() => gcal.connect()} disabled={gcal.connecting}>
                          <ExternalLink className="h-3.5 w-3.5" /> Conectar Google Account
                        </Button>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-border opacity-80 hover:opacity-100 transition-opacity flex flex-col h-full">
                    <CardHeader className="pb-3 border-b border-border/50">
                      <CardTitle className="font-display text-base flex items-center justify-between">
                        <div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-indigo-500" /> Microsoft Calendar</div>
                        {mscal.isConnected && <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">Conectado</Badge>}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 flex-1 flex flex-col justify-between">
                      <p className="text-sm text-muted-foreground mb-4">Sincronização nativa com Exchange, Outlook 365 e Microsoft Teams.</p>
                      {mscal.isConnected ? (
                        <div className="space-y-2 w-full">
                          <div className="grid grid-cols-2 gap-2">
                            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => mscal.importEvents()} disabled={mscal.importing}>Importar</Button>
                            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => mscal.exportEvents()} disabled={mscal.exporting}>Exportar</Button>
                          </div>
                          <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => mscal.disconnect()}>Desconectar</Button>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs border-indigo-500/30 text-indigo-600 hover:bg-indigo-500/10" onClick={() => mscal.connect()} disabled={mscal.connecting}>
                          <ExternalLink className="h-3.5 w-3.5" /> Conectar Microsoft 365
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Aruna IA */}
                <Card className="border-border opacity-80 hover:opacity-100 transition-opacity">
                  <CardHeader className="pb-3">
                    <CardTitle className="font-display text-base flex items-center gap-2">
                      <Bot className="h-5 w-5 text-indigo-500" /> Aruna IA (Inteligência Artificial)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">Potencializa a análise de contratos e minutas no sistema.</p>
                    <Badge variant="outline" className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20">Configurada via Supabase Secrets</Badge>
                  </CardContent>
                </Card>

                <div className="pt-6 border-t border-border flex justify-end">
                  <Button className="gap-2 px-8" onClick={() => handleSaveIntegration()} disabled={updateOrgMutation.isPending || updateGatewayMutation.isPending}>
                    {updateOrgMutation.isPending || updateGatewayMutation.isPending ? "Salvando..." : <><Save className="h-4 w-4" /> Salvar Configurações</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Employee Dialog (FSD Component) ── */}
      <EmployeeDialog
        open={empDialogOpen}
        onOpenChange={setEmpDialogOpen}
        employee={editingEmployee}
        units={units}
        orgId={profile?.organization_id || ""}
        onSubmit={handleEmpSubmit}
        isPending={createEmployeeMutation.isPending || updateEmployeeMutation.isPending}
      />
    </div>
  );
}
