import { DashboardLayout } from "@/components/DashboardLayout";
import { WorkforceGroupBadge } from "@/components/WorkforceGroupBadge";
import { LockedQuizCard } from "@/components/LockedQuizCard";
import { useProgress } from "@/contexts/ProgressContext";
import { getQuizzesForWorkforceGroup } from "@/data/quizzes";
import { FileText } from "lucide-react";

export default function QuizzesPage() {
  const {
    currentWorkforceGroup,
    areAllMaterialsComplete,
    getQuizStatus,
    getQuizResult,
  } = useProgress();

  const quizzes = currentWorkforceGroup
    ? getQuizzesForWorkforceGroup(currentWorkforceGroup)
    : [];

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
            <h1 className="text-2xl font-bold tracking-tight">My Quizzes</h1>
            <p className="text-muted-foreground">
              Complete quizzes in order. Pass with 80% to proceed.
            </p>
          </div>
          <WorkforceGroupBadge group={currentWorkforceGroup} />
        </div>

        {/* Training Materials Requirement Notice */}
        {!areAllMaterialsComplete() && (
          <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-warning" />
              <div>
                <p className="font-medium text-warning">
                  Training Materials Required
                </p>
                <p className="text-sm text-muted-foreground">
                  Complete all training materials before taking quizzes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quizzes List */}
        <div className="space-y-4">
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
                workforceGroup={currentWorkforceGroup}
                status={status}
                score={result?.score}
                lockReason={getLockReason(index)}
                questionCount={quiz.questions.length}
              />
            );
          })}
        </div>

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
