import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  FileText, Upload, Trash2, Download, Search, Filter, File, Image, FileSpreadsheet, FileArchive,
  FolderOpen, FolderPlus, Clock, MoreVertical, X, Share2, Eye
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ─── Types & Utils ────────────────────────────────────────────

type Documento = {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  size: number | null;
  folder_path: string | null;
  user_id: string;
  organization_id: string;
  process_id: string | null;
  client_id: string | null;
  created_at: string;
};

const FILE_ICONS: Record<string, any> = {
  pdf: FileText, doc: FileText, docx: FileText, txt: FileText,
  xls: FileSpreadsheet, xlsx: FileSpreadsheet, csv: FileSpreadsheet,
  jpg: Image, jpeg: Image, png: Image, webp: Image, svg: Image,
  zip: FileArchive, rar: FileArchive, "7z": FileArchive,
};

function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return FILE_ICONS[ext] || File;
}

function formatFileSize(bytes?: number | null) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Component ────────────────────────────────────────────────

export default function DocumentosPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("todos");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [linkProcessId, setLinkProcessId] = useState("none");
  const [linkClientId, setLinkClientId] = useState("none");
  const [isDragging, setIsDragging] = useState(false);

  // Focus view
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [currentFolder, setCurrentFolder] = useState<string>("/");

  // Fetch base records
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("organization_id").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });
  const orgId = profile?.organization_id;

  const { data: processos = [] } = useQuery({
    queryKey: ["processos-select", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("processos_juridicos").select("id, title, number").eq("organization_id", orgId!).order("title");
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-select", orgId],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, name").eq("organization_id", orgId!).order("name");
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: documentos = [], isLoading } = useQuery({
    queryKey: ["documentos", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("documentos").select("*").eq("organization_id", orgId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Documento[];
    },
    enabled: !!orgId,
  });

  // ─── Mutations ───
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      let uploadedCount = 0;
      for (const file of files) {
        // Path in bucket: orgId/uuid-filename
        const fileExt = file.name.split(".").pop();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filePath = `${orgId}/${crypto.randomUUID()}-${safeName}`;

        // 1. Upload to Storage
        const { error: storageError } = await supabase.storage
          .from("documentos")
          .upload(filePath, file);
        if (storageError) throw storageError;

        // 2. Insert to DB
        const { error: dbError } = await supabase.from("documentos").insert({
          file_name: file.name,
          file_path: filePath,
          file_type: file.type || fileExt || "unknown",
          size: file.size,
          folder_path: currentFolder,
          user_id: user!.id,
          organization_id: orgId!,
          process_id: linkProcessId === "none" ? null : linkProcessId,
          client_id: linkClientId === "none" ? null : linkClientId,
        });
        if (dbError) throw dbError;
        uploadedCount++;
      }
      return uploadedCount;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["documentos"] });
      toast.success(`${count} arquivo(s) enviado(s) com sucesso.`);
      setUploadOpen(false);
      setSelectedFiles([]);
      setLinkProcessId("none");
      setLinkClientId("none");
    },
    onError: (err: any) => toast.error(`Erro no upload: ${err.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (doc: Documento) => {
      const { error: storageError } = await supabase.storage.from("documentos").remove([doc.file_path]);
      if (storageError) throw storageError;
      const { error: dbError } = await supabase.from("documentos").delete().eq("id", doc.id);
      if (dbError) throw dbError;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["documentos"] }); toast.success("Documento excluído"); },
    onError: (err: any) => toast.error(`Erro ao excluir: ${err.message}`),
  });

  // ─── Actions ───
  const handleDownload = async (doc: Documento) => {
    toast.loading("Gerando link...", { id: "download" });
    const { data, error } = await supabase.storage.from("documentos").createSignedUrl(doc.file_path, 60);
    if (error || !data?.signedUrl) {
      toast.error("Erro ao gerar link de download", { id: "download" });
      return;
    }
    toast.dismiss("download");
    // Trigger download programmatically
    const link = document.createElement("a");
    link.href = data.signedUrl;
    link.download = doc.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateShareLink = async (doc: Documento) => {
    const { data, error } = await supabase.storage.from("documentos").createSignedUrl(doc.file_path, 60 * 60 * 24 * 7); // 7 days
    if (error || !data?.signedUrl) {
      toast.error("Erro ao criar link");
      return;
    }
    navigator.clipboard.writeText(data.signedUrl);
    toast.success("Link copiado para a área de transferência (Válido por 7 dias)");
  };

  // ─── Drag & Drop ───
  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const onDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
      setUploadOpen(true);
    }
  }, []);

  // ─── Filter & Search ───
  const filtered = documentos.filter((d) => {
    const inFolder = d.folder_path === currentFolder;
    const matchesSearch = !search || d.file_name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterType === "todos" || (filterType === "processo" && d.process_id) || (filterType === "cliente" && d.client_id) || (filterType === "avulso" && !d.process_id && !d.client_id);
    return matchesSearch && matchesFilter; // ignore folder scoping if searching or filtering specifically
  });

  return (
    <div className="space-y-6" onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      {/* ── Premium Header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-primary p-7">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute right-20 -bottom-6 h-32 w-32 rounded-full bg-white/[0.03]" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
              <FolderOpen className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary-foreground tracking-tight">GED Inteligente</h1>
              <p className="text-sm text-primary-foreground/60 mt-0.5">Gestão Eletrônica de Documentos na nuvem</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm" onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4" /> Enviar Arquivos
            </Button>
          </div>
        </div>
      </div>

      {/* ── Drag & Drop Overlay ── */}
      <AnimatePresence>
        {isDragging && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="rounded-3xl border-2 border-dashed border-primary bg-card/50 p-12 text-center shadow-2xl">
              <Upload className="mx-auto mb-4 h-16 w-16 text-primary animate-bounce" />
              <h2 className="text-2xl font-bold text-foreground">Solte os arquivos aqui</h2>
              <p className="text-muted-foreground mt-2">Eles serão enviados automaticamente para o GED.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stats ── */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="border-border/50 shadow-sm"><CardContent className="p-4 flex gap-4 items-center"><div className="p-3 bg-blue-500/10 text-blue-600 rounded-lg"><FileText className="h-5 w-5" /></div><div><p className="text-xs font-semibold text-muted-foreground uppercase">Total Arquivos</p><p className="text-xl font-bold">{documentos.length}</p></div></CardContent></Card>
        <Card className="border-border/50 shadow-sm"><CardContent className="p-4 flex gap-4 items-center"><div className="p-3 bg-purple-500/10 text-purple-600 rounded-lg"><Archive className="h-5 w-5" /></div><div><p className="text-xs font-semibold text-muted-foreground uppercase">Armazenamento</p><p className="text-xl font-bold">{formatFileSize(documentos.reduce((acc, d) => acc + (d.size || 0), 0))}</p></div></CardContent></Card>
        <Card className="border-border/50 shadow-sm"><CardContent className="p-4 flex gap-4 items-center"><div className="p-3 bg-amber-500/10 text-amber-600 rounded-lg"><Briefcase className="h-5 w-5" /></div><div><p className="text-xs font-semibold text-muted-foreground uppercase">Em Processos</p><p className="text-xl font-bold">{documentos.filter(d => d.process_id).length}</p></div></CardContent></Card>
        <Card className="border-border/50 shadow-sm"><CardContent className="p-4 flex gap-4 items-center"><div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-lg"><User className="h-5 w-5" /></div><div><p className="text-xs font-semibold text-muted-foreground uppercase">Clientes</p><p className="text-xl font-bold">{documentos.filter(d => d.client_id).length}</p></div></CardContent></Card>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nome do arquivo ou extensão..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 border-border/50 bg-card/50" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-[220px] bg-card/50">
            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os documentos</SelectItem>
            <SelectItem value="processo">Apenas Processos</SelectItem>
            <SelectItem value="cliente">Apenas Clientes</SelectItem>
            <SelectItem value="avulso">Soltos / Avulsos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── List View ── */}
      <Card className="border-border/50 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground/20" />
            <p className="text-base font-semibold text-foreground">A pasta está vazia</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">Nenhum documento encontrado. Arraste e solte arquivos aqui para fazer o upload.</p>
            <Button variant="outline" className="mt-4 gap-2 text-xs" onClick={() => setUploadOpen(true)}><Upload className="h-3.5 w-3.5" /> Fazer Upload</Button>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filtered.map((doc) => {
              const IconComp = getFileIcon(doc.file_name);
              const processo = processos.find((p) => p.id === doc.process_id);
              const cliente = clientes.find((c) => c.id === doc.client_id);

              return (
                <div key={doc.id} className="group flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <IconComp className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{doc.file_name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground font-medium">{formatFileSize(doc.size)}</span>
                        <span className="text-muted-foreground/30">•</span>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(doc.created_at), "dd MMM yyyy, HH:mm", { locale: ptBR })}</span>

                        {(processo || cliente) && <span className="text-muted-foreground/30">•</span>}
                        {processo && <Badge variant="secondary" className="text-[10px] bg-sky-500/10 text-sky-600 hover:bg-sky-500/20 px-1.5 h-4"><Briefcase className="h-2.5 w-2.5 mr-1" /> Processo: {processo.number || processo.title}</Badge>}
                        {cliente && <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 px-1.5 h-4"><User className="h-2.5 w-2.5 mr-1" /> Cliente: {cliente.name}</Badge>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleDownload(doc)} title="Baixar">
                      <Download className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => generateShareLink(doc)}><Share2 className="h-4 w-4 mr-2" /> Copiar Link (7 dias)</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(doc)}><Download className="h-4 w-4 mr-2" /> Baixar original</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => deleteMutation.mutate(doc)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="h-4 w-4 mr-2" /> Excluir Permanentemente</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Upload Dialog ── */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar Arquivos</DialogTitle>
            <DialogDescription>Selecione e vincule arquivos ao GED. Até 50MB por arquivo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="border-2 border-dashed border-border/60 rounded-xl p-6 text-center hover:bg-muted/20 transition-colors relative">
              <input ref={fileInputRef} type="file" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => { if (e.target.files) setSelectedFiles(Array.from(e.target.files)); }} />
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">Clique para selecionar ou arraste arquivos aqui</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, Word, Excel, Imagens permitidos.</p>
            </div>

            {selectedFiles.length > 0 && (
              <div className="bg-muted/30 rounded-lg p-3 max-h-[120px] overflow-y-auto space-y-2">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground tracking-wider mb-2">{selectedFiles.length} Arquivos selecionados</p>
                {selectedFiles.map((f, i) => (
                  <div key={i} className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate shrink">{f.name}</span>
                      <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full shrink-0" onClick={() => setSelectedFiles(selectedFiles.filter((_, idx) => idx !== i))}><X className="h-3 w-3 text-muted-foreground hover:text-destructive" /></Button>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{formatFileSize(f.size)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase font-semibold">Vincular Processo</Label>
                <Select value={linkProcessId} onValueChange={setLinkProcessId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {processos.map((p) => <SelectItem key={p.id} value={p.id}>{p.number || p.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase font-semibold">Vincular Cliente</Label>
                <Select value={linkClientId} onValueChange={setLinkClientId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setUploadOpen(false); setSelectedFiles([]); }}>Cancelar</Button>
            <Button onClick={() => uploadMutation.mutate(selectedFiles)} disabled={selectedFiles.length === 0 || uploadMutation.isPending}>
              {uploadMutation.isPending ? "Enviando..." : `Enviar ${selectedFiles.length} arquivo(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
