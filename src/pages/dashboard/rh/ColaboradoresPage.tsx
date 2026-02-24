import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";

export default function ColaboradoresPage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Colaboradores</h1>
                    <p className="text-sm text-muted-foreground">Gestão de quadro de funcionários e contratados</p>
                </div>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" /> Novo Colaborador
                </Button>
            </div>

            <Card>
                <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                    <Users className="h-12 w-12 mb-4 text-muted-foreground/30" />
                    <h3 className="text-lg font-medium text-foreground">Nenhum colaborador cadastrado</h3>
                    <p className="mt-2 text-sm max-w-sm">
                        O diretório de colaboradores está vazio. Adicione seu primeiro funcionário para começar a gerenciar contratos, salários e ponto.
                    </p>
                    <Button variant="outline" className="mt-6 gap-2">
                        <Plus className="h-4 w-4" /> Adicionar Primeiro Colaborador
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
