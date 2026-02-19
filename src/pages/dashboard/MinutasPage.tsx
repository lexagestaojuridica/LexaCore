import { useState } from "react";
import { FileEdit, FileText, BookOpen, PenTool } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MinutasProvider, useMinutas } from "@/contexts/MinutasContext";
import MinutasMyDocuments from "@/components/minutas/MinutasMyDocuments";
import MinutasLibrary from "@/components/minutas/MinutasLibrary";
import MinutasEditor from "@/components/minutas/MinutasEditor";

function MinutasPageInner() {
    const { documents, openDocument, setOpenDocument } = useMinutas();
    const [activeTab, setActiveTab] = useState("minutas");

    const handleOpenEditor = (id: string) => {
        setOpenDocument(id);
        setActiveTab("editor");
    };

    const handleBackFromEditor = () => {
        setOpenDocument(null);
        setActiveTab("minutas");
    };

    const currentDoc = openDocument ? documents.find((d) => d.id === openDocument) : null;
    const favCount = documents.filter((d) => d.favorite).length;

    const tabConfig = [
        { value: "minutas", label: "Minhas Minutas", icon: FileText },
        { value: "biblioteca", label: "Biblioteca", icon: BookOpen },
        { value: "editor", label: "Editor", icon: PenTool, hidden: !currentDoc },
    ];

    return (
        <div className="space-y-6">
            {/* Premium Header */}
            <div className="relative overflow-hidden rounded-2xl bg-primary p-7">
                <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
                <div className="absolute -right-4 top-12 h-24 w-24 rounded-full bg-white/5" />
                <div className="absolute right-20 -bottom-6 h-32 w-32 rounded-full bg-white/[0.03]" />

                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
                            <FileEdit className="h-7 w-7 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-primary-foreground tracking-tight">Minutas</h1>
                            <p className="text-sm text-primary-foreground/60 mt-0.5">
                                Modelos jurídicos, biblioteca pública e editor integrado
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {[
                            { label: "Documentos", value: documents.length },
                            { label: "Favoritos", value: favCount },
                        ].map((stat) => (
                            <div key={stat.label} className="text-right">
                                <p className="text-lg font-bold text-primary-foreground">{stat.value}</p>
                                <p className="text-[10px] uppercase tracking-wider text-primary-foreground/40">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="h-12 p-1 bg-muted/50 border border-border/50 rounded-xl max-w-xl">
                    {tabConfig.filter((t) => !t.hidden).map((tab) => (
                        <TabsTrigger
                            key={tab.value}
                            value={tab.value}
                            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm transition-all data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:font-semibold"
                        >
                            <tab.icon className="h-4 w-4" />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value="minutas" className="mt-5">
                    <MinutasMyDocuments onOpenEditor={handleOpenEditor} />
                </TabsContent>
                <TabsContent value="biblioteca" className="mt-5">
                    <MinutasLibrary onOpenEditor={handleOpenEditor} />
                </TabsContent>
                <TabsContent value="editor" className="mt-5">
                    {currentDoc && <MinutasEditor document={currentDoc} onBack={handleBackFromEditor} />}
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default function MinutasPage() {
    return (
        <MinutasProvider>
            <MinutasPageInner />
        </MinutasProvider>
    );
}
