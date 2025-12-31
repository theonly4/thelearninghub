import { Lock, CheckCircle2, XCircle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkforceGroupBadge } from "@/components/WorkforceGroupBadge";
import { QuizStatus, WorkforceGroup } from "@/types/hipaa";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface LockedQuizCardProps {
  quizId: string;
  title: string;
  description: string;
  sequenceNumber: number;
  totalQuizzes: number;
  workforceGroup: WorkforceGroup;
  status: QuizStatus;
  score?: number;
  lockReason?: string;
  estimatedMinutes?: number;
  questionCount?: number;
}

export function LockedQuizCard({
  quizId,
  title,
  description,
  sequenceNumber,
  totalQuizzes,
  workforceGroup,
  status,
  score,
  lockReason,
  estimatedMinutes = 30,
  questionCount = 5,
}: LockedQuizCardProps) {
  const isLocked = status === "locked";
  const isPassed = status === "passed";
  const isFailed = status === "failed";
  const isUnlocked = status === "unlocked";

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-5 transition-all",
        isLocked && "opacity-60",
        isPassed && "border-success/30 bg-success/5",
        isFailed && "border-warning/30 bg-warning/5"
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 space-y-3">
          {/* Header with sequence */}
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                isLocked && "bg-muted text-muted-foreground",
                isUnlocked && "bg-accent/10 text-accent",
                isPassed && "bg-success text-success-foreground",
                isFailed && "bg-warning text-warning-foreground"
              )}
            >
              {isPassed ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : isFailed ? (
                <XCircle className="h-5 w-5" />
              ) : isLocked ? (
                <Lock className="h-4 w-4" />
              ) : (
                sequenceNumber
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                Quiz {sequenceNumber} of {totalQuizzes}
              </p>
              <h3 className="font-semibold">{title}</h3>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground">{description}</p>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <WorkforceGroupBadge group={workforceGroup} size="sm" />
            <span className="text-muted-foreground">
              {questionCount} questions • ~{estimatedMinutes} min
            </span>
          </div>

          {/* Lock reason or score */}
          {isLocked && lockReason && (
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span>{lockReason}</span>
            </div>
          )}

          {isPassed && score !== undefined && (
            <div className="flex items-center gap-2 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" />
              <span>Passed with {score}%</span>
            </div>
          )}

          {isFailed && score !== undefined && (
            <div className="flex items-center gap-2 text-sm text-warning">
              <XCircle className="h-4 w-4" />
              <span>Score: {score}% (80% required to pass)</span>
            </div>
          )}
        </div>

        {/* Action button */}
        <div className="flex-shrink-0">
          {isLocked ? (
            <Button disabled variant="outline" className="gap-2">
              <Lock className="h-4 w-4" />
              Locked
            </Button>
          ) : isPassed ? (
            <Link to={`/dashboard/quiz/${quizId}`}>
              <Button variant="outline" className="gap-2">
                Review
              </Button>
            </Link>
          ) : (
            <Link to={`/dashboard/quiz/${quizId}`}>
              <Button className="gap-2">
                <Play className="h-4 w-4" />
                {isFailed ? "Retry Quiz" : "Start Quiz"}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
