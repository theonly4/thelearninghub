import { CheckCircle2, BookOpen, FileText, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressStep {
  id: string;
  label: string;
  status: "complete" | "current" | "upcoming";
  icon: "materials" | "quiz" | "certificate";
}

interface ProgressIndicatorProps {
  materialsComplete: boolean;
  assignedQuizCount: number;
  passedQuizCount: number;
  className?: string;
}

const iconMap = {
  materials: BookOpen,
  quiz: FileText,
  certificate: Award,
};

export function ProgressIndicator({
  materialsComplete,
  assignedQuizCount,
  passedQuizCount,
  className,
}: ProgressIndicatorProps) {
  const allQuizzesPassed = assignedQuizCount > 0 && passedQuizCount >= assignedQuizCount;
  
  // Build steps dynamically based on assigned quiz count
  const steps: ProgressStep[] = [
    {
      id: "materials",
      label: "Training Materials",
      status: materialsComplete ? "complete" : "current",
      icon: "materials",
    },
  ];

  // Add quiz steps based on assigned count (typically 1 for most employees)
  for (let i = 1; i <= assignedQuizCount; i++) {
    const quizPassed = passedQuizCount >= i;
    const previousQuizPassed = i === 1 ? materialsComplete : passedQuizCount >= (i - 1);
    
    steps.push({
      id: `quiz${i}`,
      label: assignedQuizCount === 1 ? "Quiz" : `Quiz ${i}`,
      status: quizPassed ? "complete" : previousQuizPassed ? "current" : "upcoming",
      icon: "quiz",
    });
  }

  // Add certificate step
  steps.push({
    id: "certificate",
    label: "Certificate",
    status: allQuizzesPassed ? "complete" : "upcoming",
    icon: "certificate",
  });

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
