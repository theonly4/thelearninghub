import { CheckCircle2, BookOpen, FileText, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressStep {
  id: string;
  label: string;
  status: "complete" | "current" | "upcoming";
  icon: "materials" | "quiz1" | "quiz2" | "quiz3" | "certificate";
}

interface ProgressIndicatorProps {
  materialsComplete: boolean;
  quiz1Passed: boolean;
  quiz2Passed: boolean;
  quiz3Passed: boolean;
  className?: string;
}

const iconMap = {
  materials: BookOpen,
  quiz1: FileText,
  quiz2: FileText,
  quiz3: FileText,
  certificate: Award,
};

export function ProgressIndicator({
  materialsComplete,
  quiz1Passed,
  quiz2Passed,
  quiz3Passed,
  className,
}: ProgressIndicatorProps) {
  const steps: ProgressStep[] = [
    {
      id: "materials",
      label: "Training Materials",
      status: materialsComplete ? "complete" : "current",
      icon: "materials",
    },
    {
      id: "quiz1",
      label: "Quiz 1",
      status: quiz1Passed ? "complete" : materialsComplete ? "current" : "upcoming",
      icon: "quiz1",
    },
    {
      id: "quiz2",
      label: "Quiz 2",
      status: quiz2Passed ? "complete" : quiz1Passed ? "current" : "upcoming",
      icon: "quiz2",
    },
    {
      id: "quiz3",
      label: "Quiz 3",
      status: quiz3Passed ? "complete" : quiz2Passed ? "current" : "upcoming",
      icon: "quiz3",
    },
    {
      id: "certificate",
      label: "Certificate",
      status: quiz3Passed ? "complete" : "upcoming",
      icon: "certificate",
    },
  ];

  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <h3 className="mb-4 font-semibold">Training Journey</h3>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = iconMap[step.icon];
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="flex flex-1 items-center">
              {/* Step circle */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full transition-all",
                    step.status === "complete" && "bg-success text-success-foreground",
                    step.status === "current" && "bg-accent text-accent-foreground animate-pulse-glow",
                    step.status === "upcoming" && "bg-muted text-muted-foreground"
                  )}
                >
                  {step.status === "complete" ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs text-center max-w-[80px]",
                    step.status === "complete" && "text-success font-medium",
                    step.status === "current" && "text-accent font-medium",
                    step.status === "upcoming" && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-2 transition-all",
                    step.status === "complete" ? "bg-success" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
