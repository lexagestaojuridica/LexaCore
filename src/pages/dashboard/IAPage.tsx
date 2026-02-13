import { Bot } from "lucide-react";

export default function IAPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Bot className="mb-4 h-12 w-12 text-muted-foreground/30" />
      <h1 className="font-display text-2xl text-foreground">Aruna IA</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Assistente jurídica com inteligência artificial em construção.
      </p>
    </div>
  );
}
