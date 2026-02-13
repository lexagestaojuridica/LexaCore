import { DollarSign } from "lucide-react";

export default function FinanceiroPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <DollarSign className="mb-4 h-12 w-12 text-muted-foreground/30" />
      <h1 className="font-display text-2xl text-foreground">Financeiro</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Módulo financeiro em construção.
      </p>
    </div>
  );
}
