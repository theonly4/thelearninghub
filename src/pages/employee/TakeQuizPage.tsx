import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { WorkforceGroupBadge } from "@/components/WorkforceGroupBadge";
import { HipaaLink } from "@/components/HipaaLink";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  BookOpen,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type WorkforceGroup } from "@/types/hipaa";

interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_number: number;
  scenario: string | null;
  question_text: string;
  options: { label: string; text: string }[];
  rationale: string;
  hipaa_section: string;
}

interface Answer {
  questionId: string;
  selectedOption: string;
  timeSpent: number;
}

interface ServerGradedAnswer {
  questionId: string;
  isCorrect: boolean;
  hipaaSection: string;
}

interface QuizResult {
  score: number;
  passed: boolean;
  correctCount: number;
  totalQuestions: number;
  passingScore: number;
  gradedAnswers: ServerGradedAnswer[];
  certificate?: {
    id: string;
    certificate_number: string;
    valid_until: string;
  };
}

interface PackageData {
  package_id: string;
  package_name: string;
  workforce_group: WorkforceGroup;
  training_year: number;
}

export default function TakeQuizPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { fullName } = useUserProfile();
  
  const [loading, setLoading] = useState(true);
  const [packageData, setPackageData] = useState<PackageData | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverResult, setServerResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    fetchQuizData();
  }, []);

  async function fetchQuizData() {
    setLoading(true);
    try {
      const { data: responseData, error } = await supabase.functions.invoke(
        "get-quiz-questions",
        { body: { mode: "released_package_for_user" } }
      );

      if (error) {
        console.error("Error fetching quiz:", error);
        toast({
          title: "Error",
          description: "Failed to load quiz. Please try again.",
          variant: "destructive",
        });
        navigate("/dashboard/quizzes");
        return;
      }

      const { package: pkg, questions: qs, training_status } = responseData;

      if (!pkg) {
        toast({
          title: "No Quiz Available",
          description: "No quiz has been released for your organization.",
          variant: "destructive",
        });
        navigate("/dashboard/quizzes");
        return;
      }

      if (!training_status?.materials_complete) {
        toast({
          title: "Training Incomplete",
          description: "Complete all training materials before taking the quiz.",
          variant: "destructive",
        });
        navigate("/dashboard/quizzes");
        return;
      }

      setPackageData({
        package_id: pkg.package_id,
        package_name: pkg.package_name,
        workforce_group: pkg.workforce_group as WorkforceGroup,
        training_year: pkg.training_year,
      });
      setQuestions(qs || []);
      setQuestionStartTime(Date.now());
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
      navigate("/dashboard/quizzes");
    } finally {
      setLoading(false);
    }
  }

  const question = questions[currentQuestion];
  const progress = questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0;

  const handleOptionSelect = (optionLabel: string) => {
    if (hasAnswered) return;
    setSelectedOption(optionLabel);
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
    };
    setAnswers([...answers, answer]);
  };

  const submitQuizToServer = async (finalAnswers: Answer[]) => {
    if (!packageData) return;
    
    setIsSubmitting(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to submit the quiz.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      const response = await supabase.functions.invoke('submit-quiz', {
        body: {
          packageId: packageData.package_id,
          answers: finalAnswers,
          workforceGroup: packageData.workforce_group
        }
      });

      if (response.error) {
        console.error('Quiz submission error:', response.error);
        toast({
          title: "Submission Failed",
          description: response.error.message || "Failed to submit quiz. Please try again.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const result = response.data;
      
      if (!result.success) {
        toast({
          title: "Submission Failed",
          description: result.error || "Failed to submit quiz. Please try again.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      setServerResult(result);
      setShowResults(true);
      setIsSubmitting(false);
      
    } catch (error) {
      console.error('Quiz submission error:', error);
      toast({
        title: "Submission Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedOption(null);
      setHasAnswered(false);
      setQuestionStartTime(Date.now());
    } else {
      // Submit quiz
      const lastAnswer: Answer = {
        questionId: question.id,
        selectedOption: selectedOption!,
        timeSpent: Math.floor((Date.now() - questionStartTime) / 1000),
      };
      const finalAnswers = [...answers, lastAnswer];
      submitQuizToServer(finalAnswers);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      const prevAnswer = answers.find(
        (a) => a.questionId === questions[currentQuestion - 1].id
      );
      setSelectedOption(prevAnswer?.selectedOption || null);
      setHasAnswered(!!prevAnswer);
    }
  };

  const handleRetakeQuiz = () => {
    setCurrentQuestion(0);
    setAnswers([]);
    setSelectedOption(null);
    setHasAnswered(false);
    setShowResults(false);
    setServerResult(null);
    setQuestionStartTime(Date.now());
  };

  if (loading) {
    return (
      <DashboardLayout userRole="workforce_user" userName={fullName || "User"}>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-accent" />
            <p className="text-muted-foreground">Loading quiz...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!packageData || questions.length === 0) {
    return (
      <DashboardLayout userRole="workforce_user" userName={fullName || "User"}>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Quiz not available</p>
            <Button onClick={() => navigate("/dashboard/quizzes")}>
              Return to Quizzes
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (isSubmitting) {
    return (
      <DashboardLayout userRole="workforce_user" userName={fullName || "User"}>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-accent" />
            <p className="text-muted-foreground">Submitting quiz for secure scoring...</p>
            <p className="text-xs text-muted-foreground">Your answers are being validated server-side</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (showResults && serverResult) {
    const { score, passed, passingScore } = serverResult;

    return (
      <DashboardLayout userRole="workforce_user" userName={fullName || "User"}>
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
            {serverResult.certificate && (
              <p className="mt-2 text-sm text-success">
                Certificate #{serverResult.certificate.certificate_number} has been generated
              </p>
            )}
          </div>

          {/* Retake Quiz CTA for failed attempts */}
          {!passed && (
            <div className="rounded-xl border-2 border-warning/50 bg-warning/5 p-6 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-full bg-warning/20 p-3">
                  <AlertTriangle className="h-8 w-8 text-warning" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">Don't Give Up!</h3>
                  <p className="text-muted-foreground mb-4 max-w-md">
                    Review the materials below and try again. You can retake this quiz unlimited times until you pass.
                  </p>
                  <Button 
                    size="lg" 
                    className="gap-2"
                    onClick={handleRetakeQuiz}
                  >
                    <RotateCcw className="h-5 w-5" />
                    Retake Quiz Now
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Score Card */}
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground mb-2">Your Score (Server Validated)</p>
            <p className={cn(
              "text-5xl font-bold",
              passed ? "text-success" : "text-warning"
            )}>
              {score}%
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Passing score: {passingScore}%
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {serverResult.correctCount} of {serverResult.totalQuestions} correct
            </p>
          </div>

          {/* Question Review */}
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border p-5">
              <h2 className="font-semibold">Question Review</h2>
            </div>
            <div className="divide-y divide-border">
              {questions.map((q, index) => {
                const serverGrade = serverResult.gradedAnswers.find((a) => a.questionId === q.id);
                const questionCorrect = serverGrade?.isCorrect ?? false;
                const userAnswer = answers.find((a) => a.questionId === q.id);

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
                            {q.options.find((o) => o.label === userAnswer?.selectedOption)?.text || "Not answered"}
                          </span>
                        </p>
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
            {passed && serverResult.certificate && (
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
    <DashboardLayout userRole="workforce_user" userName={fullName || "User"}>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Quiz Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-bold">{packageData.package_name}</h1>
            <div className="flex items-center gap-3">
              <WorkforceGroupBadge group={packageData.workforce_group} size="sm" />
              <span className="text-sm text-muted-foreground">
                {packageData.training_year} Training Year
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Question</p>
            <p className="text-lg font-bold">
              {currentQuestion + 1} of {questions.length}
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
                const isThisSelected = selectedOption === option.label;
                
                return (
                  <button
                    key={option.label}
                    onClick={() => handleOptionSelect(option.label)}
                    disabled={hasAnswered}
                    className={cn(
                      "w-full rounded-lg border p-4 text-left transition-all duration-200",
                      !hasAnswered && isThisSelected && "border-accent bg-accent/5 ring-2 ring-accent/20",
                      !hasAnswered && !isThisSelected && "border-border hover:border-accent/50 hover:bg-muted/50",
                      hasAnswered && "cursor-default"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                          isThisSelected
                            ? "border-accent bg-accent text-accent-foreground"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {option.label}
                      </span>
                      <span className="text-sm">{option.text}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feedback (after answering) */}
          {hasAnswered && (
            <div className="border-t border-border bg-muted/30 p-5">
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium mb-1">Answer Recorded</p>
                  <p className="text-sm text-muted-foreground">
                    Click "Next" to continue. Your final results will be calculated after you complete all questions.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex gap-2">
            {!hasAnswered ? (
              <Button onClick={handleSubmitAnswer} disabled={!selectedOption}>
                Submit Answer
              </Button>
            ) : (
              <Button onClick={handleNext} className="gap-2">
                {currentQuestion < questions.length - 1 ? (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Complete Quiz
                    <CheckCircle2 className="h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
