import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface AuthFormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: LucideIcon;
  error?: string;
}

export const AuthFormInput = ({
  label,
  icon: Icon,
  error,
  className,
  ...props
}: AuthFormInputProps) => {
  return (
    <div className="space-y-2 w-full group">
      <Label className="text-sm font-bold text-foreground/70 ml-1 transition-colors group-focus-within:text-primary">
        {label}
      </Label>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
          <Icon className="h-4 w-4" />
        </div>
        <Input
          className={cn(
            "h-12 pl-11 pr-4 rounded-2xl border-border bg-muted/30 focus:bg-background focus:ring-2 focus:ring-primary/10 transition-all border-2",
            error && "border-destructive/50 focus:ring-destructive/10",
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="text-[10px] font-bold text-destructive uppercase tracking-wider ml-1 animate-in fade-in slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  );
};
