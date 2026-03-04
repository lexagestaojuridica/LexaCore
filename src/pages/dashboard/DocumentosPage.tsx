import { useState, useCallback } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  FileText, Upload, Trash2, Download, Search, Filter, FolderOpen,
  Clock, MoreVertical, X, Share2, PenTool, Archive, Briefcase, User
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/shared/StatCard";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";

// FSD Imports
import { useDocumentos } from "@/features/documentos/hooks/useDocumentos";
import type { Documento } from "@/features/documentos/types";
import { getFileIcon, formatFileSize } from "@/features/documentos/types";

export default function DocumentosPage() {
  const {
    documentos, processos, clientes, isLoading,
    fileInputRef, uploadMutation, requestSignatureMutation, deleteMutation,
    handleDownload, generateShareLink,
  } = useDocumentos();

  // ── UI State ──
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [filterType, setFilterType] = useState<string>("todos");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [linkProcessId, setLinkProcessId] = useState("none");
  const [linkClientId, setLinkClientId] = useState("none");
  const [isDragging, setIsDragging] = useState(false);

  // Signature dialog
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [docToSign, setDocToSign] = useState<Documento | null>(null);
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [signerDoc, setSignerDoc] = useState("");

  // ── Drag & Drop ──
  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const onDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files?.length) { setSelectedFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]); setUploadOpen(true); }
  }, []);

  // ── Filter & Search ──
  const filtered = documentos.filter((d) => {
    const matchesSearch = !debouncedSearch || d.file_name.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesFilter = filterType === "todos" || (filterType === "processo" && d.process_id) || (filterType === "cliente" && d.client_id) || (filterType === "avulso" && !d.process_id && !d.client_id);
    return matchesSearch && matchesFilter;
  });

  const handleUpload = () => {
    uploadMutation.mutate(
      { files: selectedFiles, linkProcessId, linkClientId },
      { onSuccess: () => { setUploadOpen(false); setSelectedFiles([]); setLinkProcessId("none"); setLinkClientId("none"); } }
    );
  };

  const handleSignature = () => {
    if (!docToSign) return;
    requestSignatureMutation.mutate(
      { docId: docToSign.id, clientId: docToSign.client_id, signerName, signerEmail, signerDoc },
      { onSuccess: () => { setSignatureOpen(false); setDocToSign(null); setSignerName(""); setSignerEmail(""); setSignerDoc(""); } }
    );
  };

  return (
    <div className="space-y-6" onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      {/* ── Header ── */}
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
          <Button size="sm" className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm" onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4" /> Enviar Arquivos
          </Button>
        </div>
      </div>

      {/* ── Drag Overlay ── */}
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
        <StatCard
          icon={FileText}
          label="Total Arquivos"
          value={documentos.length}
          color="blue"
        />
        <StatCard
          icon={Archive}
          label="Armazenamento"
          value={formatFileSize(documentos.reduce((acc, d) => acc + (d.size || 0), 0))}
          color="purple"
        />
        <StatCard
          icon={Briefcase}
          label="Em Processos"
          value={documentos.filter((d) => d.process_id).length}
          color="amber"
        />
        <StatCard
          icon={User}
          label="Clientes"
          value={documentos.filter((d) => d.client_id).length}
          color="emerald"
        />
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nome do arquivo ou extensão..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 border-border/50 bg-card/50" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-[220px] bg-card/50">
            <Filter className="mr-2 h-4 w-4 text-muted-foreground" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os documentos</SelectItem>
            <SelectItem value="processo">Apenas Processos</SelectItem>
            <SelectItem value="cliente">Apenas Clientes</SelectItem>
            <SelectItem value="avulso">Soltos / Avulsos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── File List ── */}
      <Card className="border-border/50 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground/20" />
            <p className="text-base font-semibold text-foreground">A pasta está vazia</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">Nenhum documento encontrado. Arraste e solte arquivos aqui.</p>
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
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><IconComp className="h-5 w-5" /></div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{doc.file_name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground font-medium">{formatFileSize(doc.size)}</span>
                        <span className="text-muted-foreground/30">•</span>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(doc.created_at), "dd MMM yyyy, HH:mm", { locale: ptBR })}</span>
                        {(processo || cliente) && <span className="text-muted-foreground/30">•</span>}
                        {processo && <Badge variant="secondary" className="text-[10px] bg-sky-500/10 text-sky-600 px-1.5 h-4"><Briefcase className="h-2.5 w-2.5 mr-1" /> Processo: {processo.number || processo.title}</Badge>}
                        {cliente && <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 px-1.5 h-4"><User className="h-2.5 w-2.5 mr-1" /> Cliente: {cliente.name}</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleDownload(doc)} title="Baixar"><Download className="h-4 w-4" /></Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onClick={() => { setDocToSign(doc); setSignatureOpen(true); }} className="text-primary focus:text-primary gap-2 cursor-pointer font-medium"><PenTool className="h-4 w-4" /> Solicitar Assinatura</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => generateShareLink(doc)}><Share2 className="h-4 w-4 mr-2" /> Copiar Link (7 dias)</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(doc)}><Download className="h-4 w-4 mr-2" /> Baixar original</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => deleteMutation.mutate(doc)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="h-4 w-4 mr-2" /> Excluir</DropdownMenuItem>
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
              <p className="text-sm font-medium">Clique para selecionar ou arraste aqui</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, Word, Excel, Imagens.</p>
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
            <Button onClick={handleUpload} disabled={selectedFiles.length === 0 || uploadMutation.isPending}>
              {uploadMutation.isPending ? "Enviando..." : `Enviar ${selectedFiles.length} arquivo(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Signature Dialog ── */}
      <Dialog open={signatureOpen} onOpenChange={setSignatureOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar Assinatura E-Sign</DialogTitle>
            <DialogDescription>Envie para assinatura eletrônica com validade jurídica.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted/30 p-3 rounded-md flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              <div className="overflow-hidden">
                <p className="font-semibold text-sm truncate">{docToSign?.file_name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(docToSign?.size)}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nome Completo <span className="text-destructive">*</span></Label>
              <Input placeholder="Ex: João da Silva" value={signerName} onChange={e => setSignerName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>E-mail <span className="text-destructive">*</span></Label>
              <Input type="email" placeholder="cliente@gmail.com" value={signerEmail} onChange={e => setSignerEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>CPF / CNPJ (Opcional)</Label>
              <Input placeholder="Apenas números" value={signerDoc} onChange={e => setSignerDoc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignatureOpen(false)}>Cancelar</Button>
            <Button onClick={handleSignature} disabled={requestSignatureMutation.isPending || !signerName || !signerEmail}>
              {requestSignatureMutation.isPending ? "Enviando..." : "Enviar para Assinatura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
