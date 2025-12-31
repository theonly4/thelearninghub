import { DashboardLayout } from "@/components/DashboardLayout";
import { WorkforceGroupBadge } from "@/components/WorkforceGroupBadge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useProgress } from "@/contexts/ProgressContext";
import { getMaterialsForWorkforceGroup } from "@/data/trainingMaterials";
import { Link } from "react-router-dom";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function TrainingMaterialsPage() {
  const { currentWorkforceGroup, isMaterialComplete, getMaterialProgress } = useProgress();
  
  const materials = currentWorkforceGroup 
    ? getMaterialsForWorkforceGroup(currentWorkforceGroup) 
    : [];
  
  const progress = getMaterialProgress();

  if (!currentWorkforceGroup) {
    return (
      <DashboardLayout userRole="workforce_user" userName="Jane Smith">
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-muted-foreground">
            No workforce group assigned. Contact your administrator.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="workforce_user" userName="Jane Smith">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Training Materials
            </h1>
            <p className="text-muted-foreground">
              Complete all materials before accessing quizzes
            </p>
          </div>
          <WorkforceGroupBadge group={currentWorkforceGroup} />
        </div>

        {/* Progress Card */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Overall Progress</p>
              <p className="text-2xl font-bold">
                {progress.completed} of {progress.total} completed
              </p>
            </div>
            <div className="w-full sm:w-64">
              <Progress value={progress.percentage} className="h-3" />
              <p className="mt-1 text-right text-sm text-muted-foreground">
                {progress.percentage}%
              </p>
            </div>
          </div>
          {progress.percentage === 100 && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-success/10 px-4 py-3 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">
                All training materials complete! You can now take the quizzes.
              </span>
              <Link to="/dashboard" className="ml-auto">
                <Button size="sm" variant="outline" className="gap-1 border-success/30 text-success hover:bg-success/10">
                  Go to Quizzes
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Materials List */}
        <div className="space-y-4">
          {materials.map((material, index) => {
            const isComplete = isMaterialComplete(material.id);
            
            return (
              <Link
                key={material.id}
                to={`/dashboard/training/${material.id}`}
                className="block"
              >
                <div
                  className={cn(
                    "rounded-xl border bg-card p-5 transition-all hover:border-accent/50 hover:shadow-md",
                    isComplete && "border-success/30 bg-success/5"
                  )}
                >
                  <div className="flex items-start gap-4">
                    {/* Sequence number / check */}
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                        isComplete
                          ? "bg-success text-success-foreground"
                          : "bg-accent/10 text-accent"
                      )}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        index + 1
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold">{material.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {material.description}
                          </p>
                        </div>
                        <Button
                          variant={isComplete ? "outline" : "default"}
                          size="sm"
                          className="shrink-0 gap-1"
                        >
                          {isComplete ? (
                            <>
                              <BookOpen className="h-4 w-4" />
                              Review
                            </>
                          ) : (
                            <>
                              <FileText className="h-4 w-4" />
                              Read
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {material.estimated_minutes} min read
                        </span>
                        <span>•</span>
                        <span>{material.content.length} sections</span>
                        {isComplete && (
                          <>
                            <span>•</span>
                            <span className="text-success font-medium">
                              Completed
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* HIPAA Notice */}
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <p>
            Training materials are provided pursuant to{" "}
            <a
              href="https://www.law.cornell.edu/cfr/text/45/164.530"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              45 CFR §164.530(b)
            </a>
            , which requires covered entities to train workforce members on policies
            and procedures with respect to PHI.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
