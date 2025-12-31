import { useParams, useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { WorkforceGroupBadge } from "@/components/WorkforceGroupBadge";
import { HipaaLink } from "@/components/HipaaLink";
import { Button } from "@/components/ui/button";
import { useProgress } from "@/contexts/ProgressContext";
import { getMaterialsForWorkforceGroup } from "@/data/trainingMaterials";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function TrainingMaterialPage() {
  const { materialId } = useParams<{ materialId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    currentWorkforceGroup, 
    isMaterialComplete, 
    markMaterialComplete,
    getMaterialProgress 
  } = useProgress();

  const materials = currentWorkforceGroup
    ? getMaterialsForWorkforceGroup(currentWorkforceGroup)
    : [];

  const material = materials.find((m) => m.id === materialId);
  const currentIndex = materials.findIndex((m) => m.id === materialId);
  const prevMaterial = currentIndex > 0 ? materials[currentIndex - 1] : null;
  const nextMaterial = currentIndex < materials.length - 1 ? materials[currentIndex + 1] : null;

  const isComplete = material ? isMaterialComplete(material.id) : false;
  const progress = getMaterialProgress();

  const handleMarkComplete = () => {
    if (material) {
      markMaterialComplete(material.id);
      toast({
        title: "Material Completed",
        description: `You have completed "${material.title}".`,
      });

      // If there's a next material, navigate to it
      if (nextMaterial) {
        navigate(`/dashboard/training/${nextMaterial.id}`);
      } else if (progress.completed + 1 === progress.total) {
        // All materials complete, go to dashboard
        toast({
          title: "All Training Complete!",
          description: "You can now take the quizzes.",
        });
        navigate("/dashboard");
      }
    }
  };

  if (!material) {
    return (
      <DashboardLayout userRole="workforce_user" userName="Jane Smith">
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">Training material not found.</p>
          <Link to="/dashboard/training">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Training Materials
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="workforce_user" userName="Jane Smith">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            to="/dashboard/training"
            className="hover:text-foreground transition-colors"
          >
            Training Materials
          </Link>
          <span>/</span>
          <span className="text-foreground">{material.title}</span>
        </div>

        {/* Header */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <WorkforceGroupBadge group={currentWorkforceGroup!} />
            <span className="text-sm text-muted-foreground">
              Material {currentIndex + 1} of {materials.length}
            </span>
            {isComplete && (
              <span className="flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                <CheckCircle2 className="h-3 w-3" />
                Completed
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{material.title}</h1>
          <p className="text-muted-foreground">{material.description}</p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {material.estimated_minutes} min read
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              {material.content.length} sections
            </span>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {material.content.map((section, index) => (
            <div
              key={index}
              className="rounded-xl border border-border bg-card p-6 space-y-4"
            >
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <div className="prose prose-slate max-w-none dark:prose-invert">
                {section.content.split("\n\n").map((paragraph, pIndex) => (
                  <p key={pIndex} className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {paragraph}
                  </p>
                ))}
              </div>
              {section.hipaa_citations.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    HIPAA References:
                  </span>
                  {section.hipaa_citations.map((citation, cIndex) => (
                    <HipaaLink key={cIndex} section={citation}>
                      <span className="text-xs">{citation}</span>
                    </HipaaLink>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Overall HIPAA Citations */}
        {material.hipaa_citations.length > 0 && (
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm font-medium mb-2">Key HIPAA Citations</p>
            <div className="flex flex-wrap gap-2">
              {material.hipaa_citations.map((citation, index) => (
                <HipaaLink key={index} section={citation}>
                  <span className="text-sm">{citation}</span>
                </HipaaLink>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-border pt-6">
          {/* Navigation */}
          <div className="flex gap-2">
            {prevMaterial ? (
              <Link to={`/dashboard/training/${prevMaterial.id}`}>
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </Button>
              </Link>
            ) : (
              <Link to="/dashboard/training">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  All Materials
                </Button>
              </Link>
            )}
          </div>

          {/* Mark Complete / Next */}
          <div className="flex gap-2">
            {!isComplete ? (
              <Button onClick={handleMarkComplete} className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Mark as Complete
                {nextMaterial && (
                  <>
                    <span className="mx-1">•</span>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            ) : nextMaterial ? (
              <Link to={`/dashboard/training/${nextMaterial.id}`}>
                <Button className="gap-2">
                  Next Material
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link to="/dashboard">
                <Button className="gap-2">
                  Go to Quizzes
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
