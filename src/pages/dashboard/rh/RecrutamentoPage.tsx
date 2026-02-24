import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, Users } from "lucide-react";

export default function RecrutamentoPage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6 h-[calc(100vh-4rem)] flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Recrutamento e Seleção (ATS)</h1>
                    <p className="text-sm text-muted-foreground">Quadro de Vagas e Pipeline de Candidatos</p>
                </div>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" /> Nova Vaga
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                {/* Kanban Columns Mockup */}
                <div className="bg-muted/30 rounded-lg p-4 flex flex-col h-full">
                    <h3 className="font-semibold text-sm mb-4 flex items-center justify-between">
                        <span>Novos (0)</span>
                    </h3>
                    <div className="flex-1 border-2 border-dashed border-border/50 rounded-lg flex items-center justify-center flex-col text-muted-foreground p-4 text-center">
                        <Users className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-xs">Nenhum candidato</span>
                    </div>
                </div>

                <div className="bg-muted/30 rounded-lg p-4 flex flex-col h-full">
                    <h3 className="font-semibold text-sm mb-4 flex items-center justify-between">
                        <span>Triagem RH (0)</span>
                    </h3>
                    <div className="flex-1 border-2 border-dashed border-border/50 rounded-lg" />
                </div>

                <div className="bg-muted/30 rounded-lg p-4 flex flex-col h-full">
                    <h3 className="font-semibold text-sm mb-4 flex items-center justify-between">
                        <span>Entrevista (0)</span>
                    </h3>
                    <div className="flex-1 border-2 border-dashed border-border/50 rounded-lg" />
                </div>

                <div className="bg-muted/30 rounded-lg p-4 flex flex-col h-full">
                    <h3 className="font-semibold text-sm mb-4 flex items-center justify-between">
                        <span>Contratados (0)</span>
                    </h3>
                    <div className="flex-1 border-2 border-dashed border-border/50 rounded-lg" />
                </div>
            </div>
        </div>
    );
}
