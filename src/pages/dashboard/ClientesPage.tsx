import { Users } from "lucide-react";

export default function ClientesPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Users className="mb-4 h-12 w-12 text-muted-foreground/30" />
      <h1 className="font-display text-2xl text-foreground">Clientes</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Módulo de gestão de clientes em construção.
      </p>
    </div>
  );
}
