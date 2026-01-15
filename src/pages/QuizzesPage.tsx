import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useUserProfile } from "@/hooks/useUserProfile";
import { WorkforceGroupBadge } from "@/components/WorkforceGroupBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Lock, CheckCircle2, Clock, AlertCircle, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { type WorkforceGroup } from "@/types/hipaa";

interface QuizQuestion {
  id: string;
  question_text: string;
  question_number: number;
  hipaa_section: string;
}

interface ReleasedQuiz {
  package_id: string;
  package_name: string;
  workforce_group: WorkforceGroup;
  training_year: number;
  questions: QuizQuestion[];
}

interface QuizAttempt {
  id: string;
  quiz_id: string;
  score: number;
  passed: boolean;
  completed_at: string | null;
}

interface TrainingStatus {
  total_materials: number;
  completed_materials: number;
  materials_complete: boolean;
}

export default function QuizzesPage() {
  const navigate = useNavigate();
  const { fullName } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<ReleasedQuiz | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [workforceGroup, setWorkforceGroup] = useState<WorkforceGroup | null>(null);
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>({
    total_materials: 0,
    completed_materials: 0,
    materials_complete: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Call the backend function to get released package for this user
      const { data: responseData, error: funcError } = await supabase.functions.invoke(
        "get-quiz-questions",
        {
          body: { mode: "released_package_for_user" },
        }
      );

      if (funcError) {
        console.error("Error calling get-quiz-questions:", funcError);
        setLoading(false);
        return;
      }

      const { package: packageData, questions, training_status } = responseData;

      // Set training status
      setTrainingStatus(training_status || {
        total_materials: 0,
        completed_materials: 0,
        materials_complete: false,
      });

      if (packageData) {
        setWorkforceGroup(packageData.workforce_group as WorkforceGroup);
        
        setQuiz({
          package_id: packageData.package_id,
          package_name: packageData.package_name,
          workforce_group: packageData.workforce_group as WorkforceGroup,
          training_year: packageData.training_year,
          questions: (questions || []).map((q: any) => ({
            id: q.id,
            question_text: q.question_text,
            question_number: q.question_number,
            hipaa_section: q.hipaa_section,
          })),
        });

        // Fetch quiz attempts for this package
        const { data: attemptsData } = await supabase
          .from("quiz_attempts")
          .select("id, quiz_id, score, passed, completed_at")
          .eq("user_id", session.user.id)
          .eq("quiz_id", packageData.package_id)
          .order("completed_at", { ascending: false });

        setAttempts((attemptsData || []) as QuizAttempt[]);
      } else {
        // No package released - try to get workforce group from profile for display
        const { data: profile } = await supabase
          .from("profiles")
          .select("workforce_groups")
          .eq("user_id", session.user.id)
          .single();
        
        const groups = (profile?.workforce_groups || []) as WorkforceGroup[];
        setWorkforceGroup(groups[0] || null);
      }
    } catch (error) {
      console.error("Error fetching quiz data:", error);
    } finally {
      setLoading(false);
    }
  }

  const latestAttempt = attempts[0];
  const hasPassed = attempts.some(a => a.passed);
  const isLocked = !trainingStatus.materials_complete;

  if (loading) {
    return (
      <DashboardLayout userRole="workforce_user" userName={fullName || "User"}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <p className="text-muted-foreground">Loading quizzes...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!workforceGroup) {
    return (
      <DashboardLayout userRole="workforce_user" userName={fullName || "User"}>
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-muted-foreground">
            No workforce group assigned. Contact your administrator.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (!quiz) {
    return (
      <DashboardLayout userRole="workforce_user" userName={fullName || "User"}>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">My Quizzes</h1>
              <p className="text-muted-foreground">
                No quizzes are currently available.
              </p>
            </div>
            <WorkforceGroupBadge group={workforceGroup} />
          </div>

          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Quiz Not Available</h3>
              <p className="text-muted-foreground max-w-md">
                Your organization has not yet released a quiz for your workforce group. 
                Please check back later or contact your administrator.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="workforce_user" userName={fullName || "User"}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Quizzes</h1>
            <p className="text-muted-foreground">
              Complete training materials to unlock, then pass with 80%.
            </p>
          </div>
          <WorkforceGroupBadge group={workforceGroup} />
        </div>

        {/* Training Materials Requirement Notice */}
        {!trainingStatus.materials_complete && trainingStatus.total_materials > 0 && (
          <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-warning" />
              <div className="flex-1">
                <p className="font-medium text-warning">
                  Training Materials Required
                </p>
                <p className="text-sm text-muted-foreground">
                  Complete all training materials before taking the quiz.
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">
                  {trainingStatus.completed_materials} / {trainingStatus.total_materials}
                </p>
                <Progress 
                  value={trainingStatus.total_materials > 0 
                    ? (trainingStatus.completed_materials / trainingStatus.total_materials) * 100 
                    : 0
                  } 
                  className="w-24 h-2 mt-1" 
                />
              </div>
            </div>
          </div>
        )}

        {/* Quiz Card */}
        <Card className={cn(
          "transition-all",
          hasPassed && "border-success/30 bg-success/5",
          isLocked && "opacity-75"
        )}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full",
                  hasPassed ? "bg-success text-success-foreground" :
                  isLocked ? "bg-muted text-muted-foreground" :
                  "bg-primary text-primary-foreground"
                )}>
                  {hasPassed ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : isLocked ? (
                    <Lock className="h-6 w-6" />
                  ) : (
                    <FileText className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <CardTitle>{quiz.package_name}</CardTitle>
                  <CardDescription>
                    {quiz.questions.length} questions • {quiz.training_year} Training Year
                  </CardDescription>
                </div>
              </div>
              <Badge variant={hasPassed ? "default" : isLocked ? "secondary" : "outline"}>
                {hasPassed ? "Passed" : isLocked ? "Locked" : "Available"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quiz Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>~{Math.ceil(quiz.questions.length * 1.5)} minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <span>80% to pass</span>
              </div>
            </div>

            {/* Latest Attempt */}
            {latestAttempt && (
              <div className={cn(
                "rounded-lg p-3",
                latestAttempt.passed ? "bg-success/10" : "bg-muted"
              )}>
                <p className="text-sm">
                  <span className="font-medium">Last attempt:</span>{" "}
                  {latestAttempt.score}% - {latestAttempt.passed ? "Passed" : "Not passed"}
                </p>
              </div>
            )}

            {/* Lock Reason */}
            {isLocked && (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                <p className="text-sm text-warning flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Complete all training materials first
                </p>
              </div>
            )}

            {/* Action Button */}
            <Button
              className="w-full"
              disabled={isLocked}
              onClick={() => navigate('/dashboard/quizzes/take')}
            >
              {hasPassed ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Retake Quiz
                </>
              ) : isLocked ? (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Complete Training First
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Quiz
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* HIPAA Notice */}
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          <p>
            Quiz assessments are administered pursuant to{" "}
            <a
              href="https://www.law.cornell.edu/cfr/text/45/164.530"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              45 CFR 164.530(b)
            </a>
            , which requires documented verification of workforce training.
            Your responses are recorded for audit purposes.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
