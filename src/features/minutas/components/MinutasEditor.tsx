import { useCallback, useState, useEffect } from "react";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TipTapUnderline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import {
    Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
    List, ListOrdered, Heading1, Heading2, Heading3, Undo2, Redo2,
    Save, FileDown, ArrowLeft, PanelRightOpen, PanelRightClose, History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import FormField from "@/components/shared/FormField";
import { useMinutas, MinutaDocument } from "@/features/minutas/contexts/MinutasContext";

interface Props {
    document: MinutaDocument;
    onBack: () => void;
}

export default function MinutasEditor({ document, onBack }: Props) {
    const { updateDocument, saveVersion } = useMinutas();
    const [showVars, setShowVars] = useState(document.variables.length > 0);
    const [variables, setVariables] = useState(document.variables);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [versionLabel, setVersionLabel] = useState("");

    const editor = useEditor({
        extensions: [
            StarterKit,
            TipTapUnderline,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
        ],
        content: document.content,
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none min-h-[500px] outline-none p-10 mx-auto bg-card focus:outline-none transition-colors selection:bg-primary/20',
                style: "font-family: 'Times New Roman', Georgia, serif; font-size: 14px; line-height: 1.8;"
            }
        }
    });

    const handleSave = useCallback(() => {
        if (editor) {
            const html = editor.getHTML();
            updateDocument(document.id, { content: html, variables });
        }
    }, [editor, document.id, variables, updateDocument]);

    // 15s Auto-save debounce effect
    useEffect(() => {
        if (!editor) return;
        const interval = setInterval(() => {
            handleSave();
        }, 15000);
        return () => clearInterval(interval);
    }, [editor, handleSave]);

    const handleSaveVersion = () => {
        handleSave();
        saveVersion(document.id, versionLabel || `Versão ${document.versions.length + 1}`);
        setVersionLabel("");
        setHistoryOpen(false);
    };

    const applyVariables = () => {
        if (!editor) return;
        let html = document.content;
        variables.forEach((v) => {
            if (v.value) {
                const regex = new RegExp(`\\{\\{${v.key}\\}\\}`, "g");
                html = html.replace(regex, `<span style="background:#fef3c7;padding:0 3px;border-radius:2px;font-weight:600;">${v.value}</span>`);
            }
        });
        editor.commands.setContent(html);
    };

    const ToolbarBtn = ({ icon: Icon, onClick, active, title }: { icon: any; onClick: () => void; active?: boolean; title?: string }) => (
        <Button variant="ghost" size="icon" className={`h-8 w-8 rounded-md transition-all duration-200 ${active ? "bg-primary/20 text-primary font-bold shadow-sm" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
            title={title} onMouseDown={(e) => { e.preventDefault(); onClick(); }}>
            <Icon className="h-4 w-4" />
        </Button>
    );

    if (!editor) return null;

    return (
        <div className="space-y-3">
            {/* Top bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" className="gap-1.5" onClick={onBack}><ArrowLeft className="h-3.5 w-3.5" /> Voltar</Button>
                    <Separator orientation="vertical" className="h-5" />
                    <p className="text-sm font-semibold text-foreground truncate max-w-[300px]">{document.title}</p>
                </div>
                <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setHistoryOpen(true)}><History className="h-3.5 w-3.5" /> Versões ({document.versions.length})</Button>
                    <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setShowVars(!showVars)}>
                        {showVars ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
                        Variáveis
                    </Button>
                    <Button size="sm" className="gap-1.5 shadow-sm" onClick={handleSave}><Save className="h-3.5 w-3.5" /> Salvar</Button>
                </div>
            </div>

            <div className="flex gap-4">
                {/* Editor Area */}
                <div className="flex-1 min-w-0">
                    {/* Toolbar */}
                    <Card className="border-border/50 mb-3 shadow-sm sticky top-2 z-10 bg-card">
                        <div className="flex flex-wrap items-center gap-0.5 p-1.5">
                            <ToolbarBtn icon={Bold} onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Negrito" />
                            <ToolbarBtn icon={Italic} onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Itálico" />
                            <ToolbarBtn icon={Underline} onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Sublinhado" />
                            <Separator orientation="vertical" className="h-5 mx-1" />
                            <ToolbarBtn icon={Heading1} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Título 1" />
                            <ToolbarBtn icon={Heading2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Título 2" />
                            <ToolbarBtn icon={Heading3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Título 3" />
                            <Separator orientation="vertical" className="h-5 mx-1" />
                            <ToolbarBtn icon={AlignLeft} onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Alinhar esquerda" />
                            <ToolbarBtn icon={AlignCenter} onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Centralizar" />
                            <ToolbarBtn icon={AlignRight} onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Alinhar direita" />
                            <Separator orientation="vertical" className="h-5 mx-1" />
                            <ToolbarBtn icon={List} onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Lista" />
                            <ToolbarBtn icon={ListOrdered} onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Lista numerada" />
                            <Separator orientation="vertical" className="h-5 mx-1" />
                            <ToolbarBtn icon={Undo2} onClick={() => editor.chain().focus().undo().run()} title="Desfazer" />
                            <ToolbarBtn icon={Redo2} onClick={() => editor.chain().focus().redo().run()} title="Refazer" />
                        </div>
                    </Card>

                    {/* TipTap Content */}
                    <Card className="border-border/50 overflow-hidden shadow-sm">
                        <EditorContent editor={editor} />
                    </Card>
                </div>

                {/* Variables Panel */}
                {showVars && variables.length > 0 && (
                    <div className="w-[280px] shrink-0">
                        <Card className="border-border/50 sticky top-4">
                            <div className="p-3 border-b border-border/30">
                                <p className="text-xs font-semibold text-foreground">📝 Preenchimento Rápido</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Preencha os campos e aplique no documento</p>
                            </div>
                            <div className="p-3 space-y-3 max-h-[450px] overflow-y-auto">
                                {variables.map((v, i) => (
                                    <div key={v.key} className="space-y-1">
                                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{v.label}</label>
                                        <input
                                            value={v.value}
                                            onChange={(e) => {
                                                const newVars = [...variables];
                                                newVars[i] = { ...newVars[i], value: e.target.value };
                                                setVariables(newVars);
                                            }}
                                            placeholder={v.placeholder}
                                            className="flex h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs ring-offset-background placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="p-3 border-t border-border/30">
                                <Button size="sm" className="w-full gap-1.5" onClick={applyVariables}>
                                    ✨ Aplicar no Documento
                                </Button>
                                <p className="text-[9px] text-muted-foreground/50 text-center mt-1.5">As variáveis {"{{...}}"} serão substituídas</p>
                            </div>
                        </Card>
                    </div>
                )}
            </div>

            {/* Version History Dialog */}
            <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle className="flex items-center gap-2"><History className="h-4 w-4" /> Histórico de Versões</DialogTitle></DialogHeader>
                    <div className="space-y-3 pt-2">
                        <div className="space-y-1.5">
                            <FormField label="Nova versão" value={versionLabel} onChange={setVersionLabel} placeholder="Ex: Revisão do coordenador" />
                            <Button size="sm" className="w-full gap-1.5" onClick={handleSaveVersion}><Save className="h-3.5 w-3.5" /> Salvar Versão</Button>
                        </div>
                        {document.versions.length > 0 ? (
                            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                {document.versions.slice().reverse().map((v) => (
                                    <div key={v.id} className="flex items-center justify-between rounded-lg bg-muted/30 p-2.5">
                                        <div><p className="text-xs font-medium">{v.label}</p><p className="text-[10px] text-muted-foreground">{new Date(v.savedAt).toLocaleString("pt-BR")}</p></div>
                                        <Badge variant="outline" className="text-[9px]">Salva</Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma versão salva</p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
