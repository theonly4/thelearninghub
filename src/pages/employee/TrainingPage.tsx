import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { TrainingMaterialReader } from "@/components/training/TrainingMaterialReader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { WorkforceGroupBadge } from "@/components/WorkforceGroupBadge";
import { HipaaLink } from "@/components/HipaaLink";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { format, differenceInDays, isPast, isToday } from "date-fns";
import { toast } from "sonner";
import {
  BookOpen,
  Clock,
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileText,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type WorkforceGroup, WORKFORCE_GROUP_LABELS } from "@/types/hipaa";

interface TrainingAssignment {
  id: string;
  workforce_group: WorkforceGroup;
  due_date: string;
  status: string;
  assigned_at: string;
  notes: string | null;
  organization_id: string;
}

interface TrainingMaterial {
  id: string;
  title: string;
  description: string;
  estimated_minutes: number;
  workforce_groups: WorkforceGroup[];
  hipaa_citations: string[];
  content: { title: string; content: string; hipaa_citations?: string[]; key_points?: string[]; icon?: string }[];
  sequence_number: number;
}

interface UserProgress {
  material_id: string;
  completed_at: string;
}

export default function EmployeeTrainingPage() {
  const navigate = useNavigate();
  const { fullName } = useUserProfile();
  const [assignment, setAssignment] = useState<TrainingAssignment | null>(null);
  const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<TrainingMaterial | null>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch active assignment
      const { data: assignmentData, error: assignmentError } = await supabase
        .from("training_assignments")
        .select("*")
        .eq("assigned_to", user.id)
        .in("status", ["assigned", "in_progress"])
        .order("assigned_at", { ascending: false })
        .limit(1)
        .single();

      if (assignmentError && assignmentError.code !== "PGRST116") {
        throw assignmentError;
      }

      if (assignmentData) {
        setAssignment({
          ...assignmentData,
          workforce_group: assignmentData.workforce_group as WorkforceGroup,
        });

        // Fetch released training material IDs for this organization
        const { data: releasedMaterials, error: releasedError } = await supabase
          .from("content_releases")
          .select("content_id")
          .eq("organization_id", assignmentData.organization_id)
          .eq("content_type", "training_material");

        if (releasedError) throw releasedError;

        const releasedMaterialIds = releasedMaterials?.map(r => r.content_id) || [];

        if (releasedMaterialIds.length === 0) {
          // No materials released to this org
          setMaterials([]);
        } else {
          // Fetch materials that are released AND match workforce group
          const { data: materialsData, error: materialsError } = await supabase
            .from("training_materials")
            .select("*")
            .in("id", releasedMaterialIds)
            .contains("workforce_groups", [assignmentData.workforce_group])
            .order("sequence_number");

          if (materialsError) throw materialsError;

          setMaterials(
            (materialsData || []).map((m) => ({
              ...m,
              workforce_groups: m.workforce_groups as WorkforceGroup[],
              content: m.content as TrainingMaterial["content"],
            }))
          );
        }
      }

      // Fetch user progress
      const { data: progressData, error: progressError } = await supabase
        .from("user_training_progress")
        .select("material_id, completed_at")
        .eq("user_id", user.id);

      if (progressError) throw progressError;
      setProgress(progressData || []);
    } catch (error) {
      console.error("Error fetching training data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCompleteMaterial(materialId: string) {
    try {
      const material = materials.find((m) => m.id === materialId);
      if (!material) return;

      // Use secure Edge Function for server-side validation
      const { data, error } = await supabase.functions.invoke('complete-training-material', {
        body: { material_id: materialId }
      });

      if (error) {
        console.error("Error completing material:", error);
        toast.error("Failed to save progress");
        return;
      }

      if (!data.success) {
        toast.error(data.error || "Failed to complete material");
        return;
      }

      // Update local state
      if (!data.already_completed) {
        const newProgress = [...progress, { material_id: materialId, completed_at: new Date().toISOString() }];
        setProgress(newProgress);
        
        toast.success("Material completed", {
          description: `You've completed "${material.title}"`,
        });

        // Check if all materials are complete and auto-navigate to quizzes
        const newCompletedCount = newProgress.filter((p) =>
          materials.some((m) => m.id === p.material_id)
        ).length;
        
        if (newCompletedCount >= materials.length && assignment) {
          toast.success("Training Complete!", {
            description: "Redirecting to your quiz...",
          });
          // Auto-navigate to quizzes page
          setTimeout(() => {
            navigate("/dashboard/quizzes");
          }, 1500);
          return; // Don't reset selected material, let navigation happen
        }
      } else {
        toast.info("Material already completed");
      }

      setSelectedMaterial(null);
      setCurrentSectionIndex(0);
    } catch (error) {
      console.error("Error marking complete:", error);
      toast.error("Failed to save progress");
    }
  }

  const isMaterialComplete = (materialId: string) =>
    progress.some((p) => p.material_id === materialId);

  const completedCount = progress.filter((p) =>
    materials.some((m) => m.id === p.material_id)
  ).length;

  const progressPercentage =
    materials.length > 0 ? (completedCount / materials.length) * 100 : 0;

  const totalMinutes = materials.reduce((sum, m) => sum + m.estimated_minutes, 0);
  const remainingMinutes = materials
    .filter((m) => !isMaterialComplete(m.id))
    .reduce((sum, m) => sum + m.estimated_minutes, 0);

  // Deadline calculations
  const dueDate = assignment ? new Date(assignment.due_date) : null;
  const daysRemaining = dueDate ? differenceInDays(dueDate, new Date()) : null;
  const isOverdue = dueDate ? isPast(dueDate) && !isToday(dueDate) : false;
  const isDueSoon = daysRemaining !== null && daysRemaining <= 7 && daysRemaining >= 0;

  // Helper for color-coded progress
  const getProgressColor = (percentage: number): string => {
    if (percentage === 0) return "bg-destructive";
    if (percentage === 100) return "bg-success";
    return "bg-warning";
  };

  if (loading) {
    return (
      <DashboardLayout userRole="workforce_user" userName={fullName || "User"}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <p className="text-muted-foreground">Loading training materials...</p>
        </div>
      </DashboardLayout>
    );
  }

  // Show material reader if one is selected
  if (selectedMaterial) {
    return (
      <DashboardLayout userRole="workforce_user" userName={fullName || "User"}>
        <div className="space-y-4">
          <Button
            variant="ghost"
            onClick={() => {
              setSelectedMaterial(null);
              setCurrentSectionIndex(0);
            }}
            className="gap-2"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            Back to Materials
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{selectedMaterial.title}</h1>
              <p className="text-muted-foreground">{selectedMaterial.description}</p>
            </div>
            {dueDate && (
              <Badge variant={isOverdue ? "destructive" : isDueSoon ? "secondary" : "outline"}>
                <CalendarClock className="h-3 w-3 mr-1" />
                Due {format(dueDate, "MMM d, yyyy")}
              </Badge>
            )}
          </div>

          <TrainingMaterialReader
            title={selectedMaterial.title}
            sections={selectedMaterial.content}
            currentSectionIndex={currentSectionIndex}
            onSectionChange={setCurrentSectionIndex}
            onComplete={() => handleCompleteMaterial(selectedMaterial.id)}
            isComplete={isMaterialComplete(selectedMaterial.id)}
          />
        </div>
      </DashboardLayout>
    );
  }

  // No assignment
  if (!assignment) {
    return (
      <DashboardLayout userRole="workforce_user" userName={fullName || "User"}>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Training Assigned</h2>
          <p className="text-muted-foreground max-w-md">
            Your administrator has not yet assigned training materials. Please check back later or contact your administrator.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // No materials released
  if (materials.length === 0) {
    return (
      <DashboardLayout userRole="workforce_user" userName={fullName || "User"}>
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Training Materials Pending</h2>
          <p className="text-muted-foreground max-w-md">
            Training has been assigned, but the training materials are not yet available. Please check back later.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="workforce_user" userName={fullName || "User"}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Training Materials</h1>
            <p className="text-muted-foreground">
              Complete all materials to unlock your assessment quiz
            </p>
          </div>
          <WorkforceGroupBadge group={assignment.workforce_group} />
        </div>

        {/* Deadline Banner */}
        {dueDate && (
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl border p-4",
              isOverdue
                ? "border-destructive/30 bg-destructive/5"
                : isDueSoon
                ? "border-warning/30 bg-warning/5"
                : "border-accent/30 bg-accent/5"
            )}
          >
            {isOverdue ? (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            ) : (
              <CalendarClock className={cn("h-5 w-5", isDueSoon ? "text-warning" : "text-accent")} />
            )}
            <div className="flex-1">
              <p className={cn("font-medium", isOverdue && "text-destructive")}>
                {isOverdue
                  ? "Training Overdue"
                  : `Complete by ${format(dueDate, "MMMM d, yyyy")}`}
              </p>
              <p className="text-sm text-muted-foreground">
                {isOverdue
                  ? `This training was due ${Math.abs(daysRemaining || 0)} day${Math.abs(daysRemaining || 0) !== 1 ? "s" : ""} ago`
                  : daysRemaining === 0
                  ? "Due today"
                  : `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining`}
              </p>
            </div>
            <Badge variant={isOverdue ? "destructive" : isDueSoon ? "secondary" : "outline"}>
              {remainingMinutes} min remaining
            </Badge>
          </div>
        )}

        {/* Progress Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Overall Progress</p>
                <p className="text-2xl font-bold">
                  {completedCount} of {materials.length} completed
                </p>
              </div>
              <div className="w-full sm:w-64">
                <Progress value={progressPercentage} className="h-3" />
                <p className="mt-1 text-right text-sm text-muted-foreground">
                  {Math.round(progressPercentage)}%
                </p>
              </div>
            </div>

            {progressPercentage === 100 && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-success/10 px-4 py-3 text-success">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">
                  All materials complete! You can now take the quiz.
                </span>
                <Link to="/dashboard/quizzes">
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto gap-1 border-success/30 text-success hover:bg-success/10"
                  >
                    Start Quiz
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Materials List */}
        <div className="space-y-4">
          {materials.map((material, index) => {
            const isComplete = isMaterialComplete(material.id);
            const nextIncomplete = materials.findIndex((m) => !isMaterialComplete(m.id));
            const isNext = index === nextIncomplete;

            return (
              <Card
                key={material.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  isComplete && "border-success/30 bg-success/5",
                  isNext && !isComplete && "border-accent/50 ring-2 ring-accent/20"
                )}
                onClick={() => setSelectedMaterial(material)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Sequence / Check */}
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                        isComplete
                          ? "bg-success text-success-foreground"
                          : isNext
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {isComplete ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold">{material.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {material.description}
                          </p>
                        </div>
                        <Button
                          variant={isComplete ? "outline" : isNext ? "default" : "secondary"}
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
                              {isNext ? "Start" : "Read"}
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {material.estimated_minutes} min
                        </span>
                        <span>|</span>
                        <span>{material.content.length} sections</span>
                        {material.hipaa_citations.length > 0 && (
                          <>
                            <span>|</span>
                            <HipaaLink
                              section={material.hipaa_citations[0]}
                              showIcon={false}
                              className="text-xs"
                            />
                            {material.hipaa_citations.length > 1 && (
                              <span className="text-xs">+{material.hipaa_citations.length - 1} more</span>
                            )}
                          </>
                        )}
                        {isComplete && (
                          <>
                            <span>|</span>
                            <span className="text-success font-medium">Completed</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* HIPAA Notice */}
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <p>
            Training materials are provided pursuant to{" "}
            <HipaaLink section="45 CFR §164.530(b)" showIcon={false} />, which
            requires covered entities to train workforce members on policies and
            procedures with respect to Protected Health Information.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
