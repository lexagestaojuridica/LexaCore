import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, Upload, Trash2, Download, Search, Filter, File, Image, FileSpreadsheet, FileArchive,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Documento = {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  user_id: string;
  organization_id: string;
  process_id: string | null;
  client_id: string | null;
  created_at: string;
};

const FILE_ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  csv: FileSpreadsheet,
  jpg: Image,
  jpeg: Image,
  png: Image,
  webp: Image,
  zip: FileArchive,
  rar: FileArchive,
};

function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return FILE_ICONS[ext] || File;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentosPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("todos");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [linkProcessId, setLinkProcessId] = useState("");
  const [linkClientId, setLinkClientId] = useState("");
  const [uploading, setUploading] = useState(false);

  // Fetch org id
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const orgId = profile?.organization_id;

  // Fetch documents
  const { data: documentos = [], isLoading } = useQuery({
    queryKey: ["documentos", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Documento[];
    },
    enabled: !!orgId,
  });

  // Fetch processes for linking
  const { data: processos = [] } = useQuery({
    queryKey: ["processos-select", orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("processos_juridicos")
        .select("id, title, number")
        .eq("organization_id", orgId!)
        .order("title");
      return data || [];
    },
    enabled: !!orgId,
  });

  // Fetch clients for linking
  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-select", orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, name")
        .eq("organization_id", orgId!)
        .order("name");
      return data || [];
    },
    enabled: !!orgId,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const results = [];
      for (const file of Array.from(files)) {
        const filePath = `${orgId}/${crypto.randomUUID()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("documentos")
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase.from("documentos").insert({
          file_name: file.name,
          file_path: filePath,
          file_type: file.type || null,
          user_id: user!.id,
          organization_id: orgId!,
          process_id: linkProcessId || null,
          client_id: linkClientId || null,
        });
        if (dbError) throw dbError;
        results.push(file.name);
      }
      return results;
    },
    onSuccess: (names) => {
      queryClient.invalidateQueries({ queryKey: ["documentos"] });
      toast({ title: "Upload concluído", description: `${names.length} arquivo(s) enviado(s).` });
      setUploadOpen(false);
      setSelectedFiles(null);
      setLinkProcessId("");
      setLinkClientId("");
    },
    onError: () => {
      toast({ title: "Erro no upload", description: "Não foi possível enviar o arquivo.", variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (doc: Documento) => {
      const { error: storageError } = await supabase.storage
        .from("documentos")
        .remove([doc.file_path]);
      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("documentos")
        .delete()
        .eq("id", doc.id);
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentos"] });
      toast({ title: "Documento excluído" });
    },
    onError: () => {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    },
  });

  // Download
  const handleDownload = async (doc: Documento) => {
    const { data, error } = await supabase.storage
      .from("documentos")
      .createSignedUrl(doc.file_path, 60);
    if (error || !data?.signedUrl) {
      toast({ title: "Erro ao baixar", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const handleUpload = () => {
    if (!selectedFiles?.length) return;
    setUploading(true);
    uploadMutation.mutate(selectedFiles, { onSettled: () => setUploading(false) });
  };

  // Filter & search
  const filtered = documentos.filter((d) => {
    const matchesSearch =
      !search ||
      d.file_name.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filterType === "todos" ||
      (filterType === "processo" && d.process_id) ||
      (filterType === "cliente" && d.client_id) ||
      (filterType === "avulso" && !d.process_id && !d.client_id);

    return matchesSearch && matchesFilter;
  });

  // Stats
  const totalDocs = documentos.length;
  const linkedProcess = documentos.filter((d) => d.process_id).length;
  const linkedClient = documentos.filter((d) => d.client_id).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Documentos</h1>
          <p className="text-sm text-muted-foreground">Gerencie os arquivos do escritório</p>
        </div>
        <Button onClick={() => setUploadOpen(true)} className="gap-2">
          <Upload className="h-4 w-4" />
          Enviar Arquivo
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalDocs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vinculados a Processos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{linkedProcess}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vinculados a Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{linkedClient}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome do arquivo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="processo">Vinculado a Processo</SelectItem>
            <SelectItem value="cliente">Vinculado a Cliente</SelectItem>
            <SelectItem value="avulso">Avulsos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nenhum documento encontrado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead className="hidden md:table-cell">Vínculo</TableHead>
                  <TableHead className="hidden sm:table-cell">Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((doc) => {
                  const IconComp = getFileIcon(doc.file_name);
                  const processo = processos.find((p) => p.id === doc.process_id);
                  const cliente = clientes.find((c) => c.id === doc.client_id);

                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <IconComp className="h-5 w-5 shrink-0 text-primary" />
                          <span className="truncate text-sm font-medium">{doc.file_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {processo && (
                            <Badge variant="secondary" className="text-xs">
                              Processo: {processo.number || processo.title}
                            </Badge>
                          )}
                          {cliente && (
                            <Badge variant="outline" className="text-xs">
                              Cliente: {cliente.name}
                            </Badge>
                          )}
                          {!processo && !cliente && (
                            <span className="text-xs text-muted-foreground">Avulso</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(doc.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => handleDownload(doc)} title="Baixar">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteMutation.mutate(doc)}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar Documento</DialogTitle>
            <DialogDescription>Selecione arquivos e opcionalmente vincule a um processo ou cliente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Arquivo(s)</Label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="mt-1 block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
                onChange={(e) => setSelectedFiles(e.target.files)}
              />
            </div>
            <div>
              <Label>Vincular a Processo (opcional)</Label>
              <Select value={linkProcessId || "none"} onValueChange={(v) => setLinkProcessId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {processos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.number ? `${p.number} - ` : ""}{p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vincular a Cliente (opcional)</Label>
              <Select value={linkClientId || "none"} onValueChange={(v) => setLinkClientId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpload} disabled={!selectedFiles?.length || uploading}>
              {uploading ? "Enviando..." : "Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
