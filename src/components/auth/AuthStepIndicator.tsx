import { cn } from "@/shared/lib/utils";

interface AuthStepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export const AuthStepIndicator = ({ currentStep, totalSteps }: AuthStepIndicatorProps) => {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-500",
            i + 1 === currentStep 
              ? "w-8 bg-primary shadow-sm" 
              : i + 1 < currentStep 
                ? "w-4 bg-primary/40" 
                : "w-4 bg-muted"
          )}
        />
      ))}
    </div>
  );
};
