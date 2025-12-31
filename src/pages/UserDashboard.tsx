import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { WorkforceGroupBadge } from "@/components/WorkforceGroupBadge";
import { ProgressIndicator } from "@/components/ProgressIndicator";
import { LockedQuizCard } from "@/components/LockedQuizCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "react-router-dom";
import { useProgress } from "@/contexts/ProgressContext";
import { getMaterialsForWorkforceGroup } from "@/data/trainingMaterials";
import { getQuizzesForWorkforceGroup } from "@/data/quizzes";
import { WorkforceGroup, WORKFORCE_GROUP_LABELS } from "@/types/hipaa";
import { 
  FileText, 
  Award, 
  Clock,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  TestTube,
} from "lucide-react";

export default function UserDashboard() {
  const {
    currentWorkforceGroup,
    getMaterialProgress,
    areAllMaterialsComplete,
    getQuizStatus,
    getQuizResult,
    getNextAction,
    setWorkforceGroup,
    resetProgress,
  } = useProgress();

  const workforceGroups: WorkforceGroup[] = ["all_staff", "clinical", "administrative", "management", "it"];

  const handleWorkforceChange = (value: WorkforceGroup) => {
    setWorkforceGroup(value);
    resetProgress(); // Reset progress when switching groups for demo
  };

  const materials = currentWorkforceGroup
    ? getMaterialsForWorkforceGroup(currentWorkforceGroup)
    : [];
  const quizzes = currentWorkforceGroup
    ? getQuizzesForWorkforceGroup(currentWorkforceGroup)
    : [];

  const materialProgress = getMaterialProgress();
  const nextAction = getNextAction();

  // Calculate stats
  const completedQuizzes = quizzes.filter(q => getQuizResult(q.id)?.passed).length;
  const pendingQuizzes = quizzes.length - completedQuizzes;
  const avgScore = quizzes.reduce((acc, q) => {
    const result = getQuizResult(q.id);
    return result ? acc + result.score : acc;
  }, 0) / (completedQuizzes || 1);

  // Get lock reasons
  const getLockReason = (quizIndex: number): string => {
    if (!areAllMaterialsComplete()) {
      return "Complete all training materials first";
    }
    if (quizIndex === 0) return "";
    const prevQuiz = quizzes[quizIndex - 1];
    const prevResult = getQuizResult(prevQuiz.id);
    if (!prevResult?.passed) {
      return `Pass Quiz ${quizIndex} first`;
    }
    return "";
  };

  // Check quiz progress for ProgressIndicator
  const quiz1Passed = quizzes[0] ? getQuizResult(quizzes[0].id)?.passed || false : false;
  const quiz2Passed = quizzes[1] ? getQuizResult(quizzes[1].id)?.passed || false : false;
  const quiz3Passed = quizzes[2] ? getQuizResult(quizzes[2].id)?.passed || false : false;

  return (
    <DashboardLayout userRole="workforce_user" userName="Jane Smith">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, Jane
          </h1>
          <p className="text-muted-foreground">
            Continue your HIPAA compliance training
          </p>
        </div>

        {/* User Info Card with Demo Selector */}
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
              <span className="text-sm font-medium">Demo Healthcare Inc.</span>
            </div>
          </div>
          
          {/* Demo Workforce Selector */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TestTube className="h-4 w-4" />
                <span>Demo Mode - Switch Workforce:</span>
              </div>
              <Select
                value={currentWorkforceGroup || undefined}
                onValueChange={(value) => handleWorkforceChange(value as WorkforceGroup)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  {workforceGroups.map((group) => (
                    <SelectItem key={group} value={group}>
                      {WORKFORCE_GROUP_LABELS[group]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        <ProgressIndicator
          materialsComplete={areAllMaterialsComplete()}
          quiz1Passed={quiz1Passed}
          quiz2Passed={quiz2Passed}
          quiz3Passed={quiz3Passed}
        />

        {/* Next Action Card */}
        {nextAction.type !== 'complete' && (
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                {nextAction.type === 'material' ? (
                  <BookOpen className="h-6 w-6 text-accent" />
                ) : (
                  <FileText className="h-6 w-6 text-accent" />
                )}
                <div>
                  <p className="font-medium">Next Step</p>
                  <p className="text-sm text-muted-foreground">{nextAction.message}</p>
                </div>
              </div>
              <Link
                to={
                  nextAction.type === 'material'
                    ? nextAction.id
                      ? `/dashboard/training/${nextAction.id}`
                      : '/dashboard/training'
                    : `/dashboard/quiz/${nextAction.id}`
                }
              >
                <Button className="gap-2">
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {nextAction.type === 'complete' && (
          <div className="rounded-xl border border-success/30 bg-success/5 p-5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-success" />
              <div>
                <p className="font-medium text-success">Training Complete!</p>
                <p className="text-sm text-muted-foreground">
                  You have completed all training materials and passed all quizzes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Training Progress"
            value={`${materialProgress.percentage}%`}
            icon={BookOpen}
            variant={materialProgress.percentage === 100 ? "success" : "info"}
          />
          <StatCard
            title="Quizzes Passed"
            value={`${completedQuizzes}/${quizzes.length}`}
            icon={CheckCircle2}
            variant={completedQuizzes === quizzes.length ? "success" : "default"}
          />
          <StatCard
            title="Pending Quizzes"
            value={pendingQuizzes}
            icon={Clock}
            variant={pendingQuizzes > 0 ? "warning" : "success"}
          />
          <StatCard
            title="Average Score"
            value={completedQuizzes > 0 ? `${Math.round(avgScore)}%` : "—"}
            icon={Award}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Quizzes Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Quizzes</h2>
              <span className="text-sm text-muted-foreground">
                Pass 80% to proceed
              </span>
            </div>
            
            {quizzes.map((quiz, index) => {
              const status = getQuizStatus(quiz.id);
              const result = getQuizResult(quiz.id);
              
              return (
                <LockedQuizCard
                  key={quiz.id}
                  quizId={quiz.id}
                  title={quiz.title}
                  description={quiz.description}
                  sequenceNumber={quiz.sequence_number}
                  totalQuizzes={quizzes.length}
                  workforceGroup={currentWorkforceGroup || "all_staff"}
                  status={status}
                  score={result?.score}
                  lockReason={getLockReason(index)}
                  questionCount={quiz.questions.length}
                />
              );
            })}
          </div>

          {/* Training Materials Sidebar */}
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border p-5">
              <h2 className="font-semibold">Training Materials</h2>
              <span className="text-sm text-muted-foreground">
                {materialProgress.completed}/{materialProgress.total}
              </span>
            </div>
            
            <div className="p-4">
              <Progress value={materialProgress.percentage} className="h-2 mb-4" />
            </div>

            <div className="divide-y divide-border">
              {materials.slice(0, 3).map((material, index) => (
                <Link
                  key={material.id}
                  to={`/dashboard/training/${material.id}`}
                  className="block p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-accent/10 p-2 text-accent">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h3 className="text-sm font-medium line-clamp-1">
                        {material.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{material.estimated_minutes} min</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="border-t border-border p-4">
              <Link to="/dashboard/training">
                <Button variant="outline" className="w-full gap-2">
                  <BookOpen className="h-4 w-4" />
                  View All Materials
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
