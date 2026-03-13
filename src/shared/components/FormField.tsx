import { Input } from "@/shared/ui/input";

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export default function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  icon,
  className,
}: FormFieldProps) {
  return (
    <div className={`space-y-1.5 ${className || ""}`}>
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
            {icon}
          </div>
        )}
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`h-10 bg-background border-border/60 focus:border-primary/40 transition-colors ${icon ? "pl-9" : ""}`}
        />
      </div>
    </div>
  );
}
