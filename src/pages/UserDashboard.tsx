import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { WorkforceGroupBadge } from "@/components/WorkforceGroupBadge";
import { ProgressIndicator } from "@/components/ProgressIndicator";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { type WorkforceGroup } from "@/types/hipaa";
import { 
  FileText, 
  Award, 
  Clock,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Lock,
} from "lucide-react";

interface QuizData {
  package_id: string;
  package_name: string;
  workforce_group: WorkforceGroup;
  training_year: number;
  question_count: number;
}

interface TrainingStatus {
  total_materials: number;
  completed_materials: number;
  materials_complete: boolean;
}

export default function UserDashboard() {
  const { fullName, firstName, organizationName, workforceGroups } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [currentWorkforceGroup, setCurrentWorkforceGroup] = useState<WorkforceGroup | null>(null);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>({
    total_materials: 0,
    completed_materials: 0,
    materials_complete: false,
  });
  const [quizPassed, setQuizPassed] = useState(false);
  const [lastQuizScore, setLastQuizScore] = useState<number | null>(null);
  const [assignedQuizCount, setAssignedQuizCount] = useState(0);
  const [passedQuizCount, setPassedQuizCount] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch quiz data and training status from backend
      const { data: responseData, error } = await supabase.functions.invoke(
        "get-quiz-questions",
        { body: { mode: "released_package_for_user" } }
      );

      if (!error && responseData) {
        const { package: pkg, questions, training_status } = responseData;
        
        setTrainingStatus(training_status || {
          total_materials: 0,
          completed_materials: 0,
          materials_complete: false,
        });

        if (pkg) {
          setCurrentWorkforceGroup(pkg.workforce_group as WorkforceGroup);
          setQuizData({
            package_id: pkg.package_id,
            package_name: pkg.package_name,
            workforce_group: pkg.workforce_group as WorkforceGroup,
            training_year: pkg.training_year,
            question_count: questions?.length || 0,
          });

          // Set assigned quiz count (currently 1 quiz per package release)
          setAssignedQuizCount(1);

          // Fetch quiz attempts
          const { data: attemptsData } = await supabase
            .from("quiz_attempts")
            .select("score, passed")
            .eq("user_id", session.user.id)
            .eq("quiz_id", pkg.package_id)
            .order("completed_at", { ascending: false })
            .limit(1);

          if (attemptsData && attemptsData.length > 0) {
            setLastQuizScore(attemptsData[0].score);
            setQuizPassed(attemptsData[0].passed);
            if (attemptsData[0].passed) {
              setPassedQuizCount(1);
            }
          }
        } else {
          // No package released - use profile workforce groups
          if (workforceGroups.length > 0) {
            setCurrentWorkforceGroup(workforceGroups[0]);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }

  const materialProgress = trainingStatus.total_materials > 0
    ? Math.round((trainingStatus.completed_materials / trainingStatus.total_materials) * 100)
    : 0;

  const isQuizLocked = !trainingStatus.materials_complete;

  if (loading) {
    return (
      <DashboardLayout userRole="workforce_user" userName={fullName || "User"}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="workforce_user" userName={fullName || "User"}>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-muted-foreground">
            Continue your compliance learning
          </p>
        </div>

        {/* User Info Card */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Workforce Group:
              </span>
              {currentWorkforceGroup ? (
                <WorkforceGroupBadge group={currentWorkforceGroup} />
              ) : (
                <span className="text-sm text-warning">Not assigned</span>
              )}
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Organization:
              </span>
              <span className="text-sm font-medium">
                {organizationName || "Not assigned"}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        <ProgressIndicator
          materialsComplete={trainingStatus.materials_complete}
          assignedQuizCount={assignedQuizCount}
          passedQuizCount={passedQuizCount}
        />

        {/* Next Action Card */}
        {!quizPassed && (
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                {!trainingStatus.materials_complete ? (
                  <BookOpen className="h-6 w-6 text-accent" />
                ) : (
                  <FileText className="h-6 w-6 text-accent" />
                )}
                <div>
                  <p className="font-medium">Next Step</p>
                  <p className="text-sm text-muted-foreground">
                    {!trainingStatus.materials_complete
                      ? `Complete training materials (${trainingStatus.completed_materials}/${trainingStatus.total_materials} done)`
                      : "Take the assessment quiz"
                    }
                  </p>
                </div>
              </div>
              <Link to={!trainingStatus.materials_complete ? "/employee/training" : "/dashboard/quizzes"}>
                <Button className="gap-2">
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {quizPassed && (
          <div className="rounded-xl border border-success/30 bg-success/5 p-5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-success" />
              <div>
                <p className="font-medium text-success">Training Complete!</p>
                <p className="text-sm text-muted-foreground">
                  You have completed all training materials and passed the quiz.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Training Progress"
            value={`${materialProgress}%`}
            icon={BookOpen}
            variant={materialProgress === 100 ? "success" : "info"}
          />
          <StatCard
            title="Quiz Status"
            value={quizPassed ? "Passed" : isQuizLocked ? "Locked" : "Available"}
            icon={quizPassed ? CheckCircle2 : isQuizLocked ? Lock : FileText}
            variant={quizPassed ? "success" : "default"}
          />
          <StatCard
            title="Last Score"
            value={lastQuizScore !== null ? `${lastQuizScore}%` : "-"}
            icon={Award}
          />
          <StatCard
            title="Time Remaining"
            value={trainingStatus.materials_complete ? "Quiz Ready" : "In Progress"}
            icon={Clock}
            variant={trainingStatus.materials_complete ? "success" : "warning"}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Quiz Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Assessment Quiz</h2>
              <span className="text-sm text-muted-foreground">
                Pass 80% to complete
              </span>
            </div>
            
            {quizData ? (
              <div className={`rounded-xl border bg-card p-5 ${quizPassed ? 'border-success/30 bg-success/5' : isQuizLocked ? 'opacity-75' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                      quizPassed ? 'bg-success text-success-foreground' :
                      isQuizLocked ? 'bg-muted text-muted-foreground' :
                      'bg-primary text-primary-foreground'
                    }`}>
                      {quizPassed ? <CheckCircle2 className="h-6 w-6" /> :
                       isQuizLocked ? <Lock className="h-6 w-6" /> :
                       <FileText className="h-6 w-6" />}
                    </div>
                    <div>
                      <h3 className="font-semibold">{quizData.package_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {quizData.question_count} questions • {quizData.training_year}
                      </p>
                    </div>
                  </div>
                </div>
                
                {isQuizLocked && (
                  <div className="mt-4 rounded-lg border border-warning/30 bg-warning/5 p-3">
                    <p className="text-sm text-warning flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Complete all training materials first
                    </p>
                  </div>
                )}
                
                <Link to="/dashboard/quizzes">
                  <Button className="w-full mt-4" disabled={isQuizLocked}>
                    {quizPassed ? "View Results" : isQuizLocked ? "Complete Training First" : "Start Quiz"}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="rounded-xl border bg-card p-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No Quiz Assigned</h3>
                <p className="text-sm text-muted-foreground">
                  Your organization has not yet released a quiz.
                </p>
              </div>
            )}
          </div>

          {/* Training Materials Sidebar */}
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border p-5">
              <h2 className="font-semibold">Training Materials</h2>
              <span className="text-sm text-muted-foreground">
                {trainingStatus.completed_materials}/{trainingStatus.total_materials}
              </span>
            </div>
            
            <div className="p-4">
              <Progress value={materialProgress} className="h-2 mb-4" />
              <p className="text-sm text-muted-foreground text-center">
                {materialProgress}% complete
              </p>
            </div>

            <div className="border-t border-border p-4">
              <Link to="/employee/training">
                <Button variant="outline" className="w-full gap-2">
                  <BookOpen className="h-4 w-4" />
                  {trainingStatus.materials_complete ? "Review Materials" : "Continue Training"}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
