import { CalendarDays } from "lucide-react";

export default function AgendaPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <CalendarDays className="mb-4 h-12 w-12 text-muted-foreground/30" />
      <h1 className="font-display text-2xl text-foreground">Agenda</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Módulo de agenda e compromissos em construção.
      </p>
    </div>
  );
}
