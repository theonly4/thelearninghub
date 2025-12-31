import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { WorkforceGroupBadge } from "@/components/WorkforceGroupBadge";
import { HipaaLink, HIPAA_PARTS } from "@/components/HipaaLink";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useProgress } from "@/contexts/ProgressContext";
import { getQuizById } from "@/data/quizzes";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Answer {
  questionId: string;
  selectedOption: string;
  timeSpent: number;
  isCorrect: boolean;
}

export default function QuizPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentWorkforceGroup, recordQuizResult, canTakeQuiz } = useProgress();
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  // Get the actual quiz from data
  const quiz = quizId ? getQuizById(quizId) : undefined;

  // Check if user can take this quiz
  useEffect(() => {
    if (quizId && !canTakeQuiz(quizId)) {
      toast({
        title: "Quiz Locked",
        description: "Complete prerequisites to unlock this quiz.",
        variant: "destructive",
      });
      navigate("/dashboard/quizzes");
    }
  }, [quizId, canTakeQuiz, navigate, toast]);

  if (!quiz) {
    return (
      <DashboardLayout userRole="workforce_user" userName="Jane Smith">
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Quiz not found</p>
            <Button onClick={() => navigate("/dashboard/quizzes")}>
              Return to Quizzes
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const question = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;
  const isCorrect = selectedOption === question.correct_answer;

  const handleOptionSelect = (optionId: string) => {
    if (hasAnswered) return;
    setSelectedOption(optionId);
  };

  const handleSubmitAnswer = () => {
    if (!selectedOption) {
      toast({
        title: "Please select an answer",
        description: "You must select an option before continuing.",
        variant: "destructive",
      });
      return;
    }
    setHasAnswered(true);
    
    const answer: Answer = {
      questionId: question.id,
      selectedOption,
      timeSpent: Math.floor((Date.now() - questionStartTime) / 1000),
      isCorrect: selectedOption === question.correct_answer,
    };
    setAnswers([...answers, answer]);
  };

  const handleNext = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedOption(null);
      setHasAnswered(false);
      setQuestionStartTime(Date.now());
    } else {
      // Calculate final score and record result
      const correctCount = [...answers, {
        questionId: question.id,
        selectedOption: selectedOption!,
        timeSpent: 0,
        isCorrect: selectedOption === question.correct_answer,
      }].filter(a => a.isCorrect).length;
      const finalScore = Math.round((correctCount / quiz.questions.length) * 100);
      const passed = finalScore >= quiz.passing_score;
      
      recordQuizResult(quiz.id, finalScore, passed);
      setShowResults(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      const prevAnswer = answers.find(
        (a) => a.questionId === quiz.questions[currentQuestion - 1].id
      );
      setSelectedOption(prevAnswer?.selectedOption || null);
      setHasAnswered(!!prevAnswer);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    answers.forEach((answer) => {
      const q = quiz.questions.find((q) => q.id === answer.questionId);
      if (q && q.correct_answer === answer.selectedOption) {
        correct++;
      }
    });
    return Math.round((correct / quiz.questions.length) * 100);
  };

  if (showResults) {
    const score = calculateScore();
    const passed = score >= quiz.passing_score;

    return (
      <DashboardLayout userRole="workforce_user" userName="Jane Smith">
        <div className="mx-auto max-w-3xl space-y-8">
          {/* Results Header */}
          <div className="text-center">
            <div
              className={cn(
                "mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full",
                passed ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
              )}
            >
              {passed ? (
                <CheckCircle2 className="h-10 w-10" />
              ) : (
                <AlertCircle className="h-10 w-10" />
              )}
            </div>
            <h1 className="text-2xl font-bold">
              {passed ? "Congratulations!" : "Quiz Complete"}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {passed
                ? "You have passed the quiz and demonstrated HIPAA knowledge."
                : "Review the materials and try again."}
            </p>
          </div>

          {/* Score Card */}
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground mb-2">Your Score</p>
            <p className={cn(
              "text-5xl font-bold",
              passed ? "text-success" : "text-warning"
            )}>
              {score}%
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Passing score: {quiz.passing_score}%
            </p>
          </div>

          {/* Question Review */}
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border p-5">
              <h2 className="font-semibold">Question Review</h2>
            </div>
            <div className="divide-y divide-border">
              {quiz.questions.map((q, index) => {
                const userAnswer = answers.find((a) => a.questionId === q.id);
                const questionCorrect = userAnswer?.selectedOption === q.correct_answer;

                return (
                  <div key={q.id} className="p-5">
                    <div className="flex items-start gap-4">
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium",
                          questionCorrect
                            ? "bg-success/10 text-success"
                            : "bg-destructive/10 text-destructive"
                        )}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 space-y-2">
                        <p className="font-medium">{q.question_text}</p>
                        <p className="text-sm text-muted-foreground">
                          Your answer:{" "}
                          <span
                            className={
                              questionCorrect ? "text-success" : "text-destructive"
                            }
                          >
                            {q.options.find((o) => o.id === userAnswer?.selectedOption)?.text || "Not answered"}
                          </span>
                        </p>
                        {!questionCorrect && (
                          <p className="text-sm text-muted-foreground">
                            Correct answer:{" "}
                            <span className="text-success">
                              {q.options.find((o) => o.id === q.correct_answer)?.text}
                            </span>
                          </p>
                        )}
                        <div className="mt-2 rounded-lg bg-muted p-3">
                          <p className="text-xs font-medium mb-1">
                            <HipaaLink section={q.hipaa_section}>
                              {q.hipaa_section}
                            </HipaaLink>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {q.rationale}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-center gap-4">
            <Button variant="outline" onClick={() => navigate("/dashboard/quizzes")}>
              Return to Quizzes
            </Button>
            {passed && (
              <Button className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                View Certificate
              </Button>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="workforce_user" userName="Jane Smith">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Quiz Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-bold">{quiz.title}</h1>
            <div className="flex items-center gap-3">
              <WorkforceGroupBadge group={currentWorkforceGroup || "all_staff"} size="sm" />
              <span className="text-sm text-muted-foreground">
                Version {quiz.version}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Question</p>
            <p className="text-lg font-bold">
              {currentQuestion + 1} of {quiz.questions.length}
            </p>
          </div>
        </div>

        {/* Progress */}
        <Progress value={progress} className="h-2" />

        {/* Question Card */}
        <div className="rounded-xl border border-border bg-card">
          {/* Scenario */}
          {question.scenario && (
            <div className="border-b border-border bg-muted/30 p-5">
              <div className="flex items-start gap-3">
                <BookOpen className="mt-0.5 h-5 w-5 text-accent" />
                <div>
                  <p className="text-xs font-medium text-accent mb-1">
                    Scenario
                  </p>
                  <p className="text-sm leading-relaxed">
                    {question.scenario}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Question */}
          <div className="p-6">
            <h2 className="mb-6 text-lg font-semibold">
              {question.question_text}
            </h2>

            {/* Options */}
            <div className="space-y-3">
              {question.options.map((option) => {
                const isThisCorrect = option.id === question.correct_answer;
                const isThisSelected = selectedOption === option.id;
                
                return (
                  <button
                    key={option.id}
                    onClick={() => handleOptionSelect(option.id)}
                    disabled={hasAnswered}
                    className={cn(
                      "w-full rounded-lg border p-4 text-left transition-all duration-200",
                      !hasAnswered && isThisSelected && "border-accent bg-accent/5 ring-2 ring-accent/20",
                      !hasAnswered && !isThisSelected && "border-border hover:border-accent/50 hover:bg-muted/50",
                      hasAnswered && isThisCorrect && "border-success bg-success/10 ring-2 ring-success/20",
                      hasAnswered && isThisSelected && !isThisCorrect && "border-destructive bg-destructive/10 ring-2 ring-destructive/20",
                      hasAnswered && !isThisCorrect && !isThisSelected && "border-border opacity-50",
                      hasAnswered && "cursor-default"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-medium",
                          !hasAnswered && isThisSelected && "bg-accent text-white",
                          !hasAnswered && !isThisSelected && "bg-muted text-muted-foreground",
                          hasAnswered && isThisCorrect && "bg-success text-white",
                          hasAnswered && isThisSelected && !isThisCorrect && "bg-destructive text-white",
                          hasAnswered && !isThisCorrect && !isThisSelected && "bg-muted text-muted-foreground"
                        )}
                      >
                        {hasAnswered && isThisCorrect ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : hasAnswered && isThisSelected && !isThisCorrect ? (
                          <AlertCircle className="h-4 w-4" />
                        ) : (
                          option.label
                        )}
                      </span>
                      <span className="pt-0.5">{option.text}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Feedback after answering */}
            {hasAnswered && (
              <div className={cn(
                "mt-6 rounded-lg border p-4",
                isCorrect 
                  ? "border-success/30 bg-success/5" 
                  : "border-destructive/30 bg-destructive/5"
              )}>
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    isCorrect ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                  )}>
                    {isCorrect ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <AlertCircle className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className={cn(
                      "font-semibold",
                      isCorrect ? "text-success" : "text-destructive"
                    )}>
                      {isCorrect ? "Correct!" : "Incorrect"}
                    </p>
                    {!isCorrect && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Correct answer:</span>{" "}
                        {question.options.find((o) => o.id === question.correct_answer)?.text}
                      </p>
                    )}
                    <div className="mt-3 rounded-lg bg-muted p-3">
                      <p className="text-xs font-medium mb-1">
                        <HipaaLink section={question.hipaa_section}>
                          {question.hipaa_section}
                        </HipaaLink>
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {question.rationale}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between border-t border-border p-5">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Take your time</span>
            </div>
            {!hasAnswered ? (
              <Button onClick={handleSubmitAnswer} className="gap-2">
                Submit Answer
              </Button>
            ) : (
              <Button onClick={handleNext} className="gap-2">
                {currentQuestion === quiz.questions.length - 1 ? (
                  "View Results"
                ) : (
                  <>
                    Next Question
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* HIPAA Reference */}
        <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-accent">Training Notice:</span>{" "}
            This quiz content is mapped to{" "}
            <a href={HIPAA_PARTS.part160.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">45 CFR Part 160</a>,{" "}
            <a href={HIPAA_PARTS.part162.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">162</a>, and{" "}
            <a href={HIPAA_PARTS.part164.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">164</a>{" "}
            and is designed to demonstrate workforce knowledge per{" "}
            <HipaaLink section="45 CFR §164.530(b)(1)" showIcon={false}>164.530(b)(1)</HipaaLink>. 
            Your responses are recorded for audit purposes.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
