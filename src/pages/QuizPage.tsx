import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { WorkforceGroupBadge } from "@/components/WorkforceGroupBadge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock quiz data based on uploaded documents
const mockQuiz = {
  id: "1",
  title: "All Staff HIPAA Fundamentals",
  workforceGroup: "all_staff" as const,
  version: "1.0",
  questions: [
    {
      id: "q1",
      questionNumber: 1,
      scenario: "A health tech startup employee needs to access patient medical records to resolve a billing discrepancy. The employee is authorized to process billing, but the records contain detailed psychiatric notes unrelated to billing.",
      questionText: "What should the employee do?",
      options: [
        { id: "a", label: "A", text: "Access the full record since they have general authorization needed" },
        { id: "b", label: "B", text: "Request only the billing-related information needed" },
        { id: "c", label: "C", text: "Ask the supervisor for special permission to see psychiatric notes" },
        { id: "d", label: "D", text: "Access the record but ignore the psychiatric data" },
      ],
      correctAnswer: "b",
      rationale: "Covered entities and business associates must limit PHI access, use, and disclosure to the minimum necessary to accomplish the intended purpose. Even if authorized for billing, employees cannot access information beyond what is needed. Psychiatric notes are not minimum necessary for a billing discrepancy resolution.",
      hipaaSection: "45 CFR §164.502(b)",
    },
    {
      id: "q2",
      questionNumber: 2,
      scenario: "A patient calls your startup and verbally requests to share their PHI with a family member. Your team documents the request and emails the information the next day.",
      questionText: "Is this compliant?",
      options: [
        { id: "a", label: "A", text: "Yes, verbal authorization is sufficient for simple disclosures" },
        { id: "b", label: "B", text: "No, 45 CFR §164.508 requires signed, written authorization" },
        { id: "c", label: "C", text: "Yes, if the email is BCC'd to compliance" },
        { id: "d", label: "D", text: "No, but verbal authorization with documentation works" },
      ],
      correctAnswer: "b",
      rationale: "45 CFR §164.508 mandates that uses and disclosures of PHI for purposes other than treatment, payment, or healthcare operations require written authorization signed by the individual.",
      hipaaSection: "45 CFR §164.508(a)(1)",
    },
    {
      id: "q3",
      questionNumber: 3,
      scenario: "Your startup's IT department discovers that an employee left a laptop containing unencrypted patient data in a taxi. The laptop was recovered within 2 hours.",
      questionText: "Should you notify affected individuals?",
      options: [
        { id: "a", label: "A", text: "No, the data was recovered quickly" },
        { id: "b", label: "B", text: "Yes, notification depends on a risk assessment determining if there was unauthorized access" },
        { id: "c", label: "C", text: "No, recovered devices are never considered breaches" },
        { id: "d", label: "D", text: "Yes, all data loss requires notification" },
      ],
      correctAnswer: "b",
      rationale: "Quick recovery does not eliminate breach risk. A risk assessment must be conducted to determine if there is a low probability that the PHI was accessed or compromised.",
      hipaaSection: "45 CFR §164.402(2)",
    },
    {
      id: "q4",
      questionNumber: 4,
      scenario: "A health tech startup provides care coordination services. A patient authorizes disclosure to their employer's health plan for insurance verification purposes. The authorization form doesn't specify an expiration date.",
      questionText: "Is it valid?",
      options: [
        { id: "a", label: "A", text: "Yes, authorizations without expiration dates are perpetual" },
        { id: "b", label: "B", text: "No, §164.508 requires explicit expiration date or event" },
        { id: "c", label: "C", text: "Yes, if it's for a specific purpose" },
        { id: "d", label: "D", text: "No, but it can be used for 30 days" },
      ],
      correctAnswer: "b",
      rationale: "45 CFR §164.508(c)(1)(v) requires that authorizations specify an expiration date or event. Without this, the authorization is invalid. Authorizations cannot be indefinite.",
      hipaaSection: "45 CFR §164.508(c)(1)(v)",
    },
    {
      id: "q5",
      questionNumber: 5,
      scenario: "Your startup receives a subpoena for patient medical records. The patient has not provided authorization.",
      questionText: "What must you do?",
      options: [
        { id: "a", label: "A", text: "Release records immediately; subpoenas override privacy requirements" },
        { id: "b", label: "B", text: "Verify the subpoena meets HIPAA requirements before disclosure" },
        { id: "c", label: "C", text: "Refuse to release any records without patient consent" },
        { id: "d", label: "D", text: "Contact the patient to obtain verbal authorization" },
      ],
      correctAnswer: "b",
      rationale: "A subpoena alone does not override HIPAA. You must verify that proper safeguards are in place, such as a court order or evidence that the patient was notified and had opportunity to object.",
      hipaaSection: "45 CFR §164.512(e)",
    },
  ],
};

interface Answer {
  questionId: string;
  selectedOption: string;
  timeSpent: number;
}

export default function QuizPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [questionStartTime] = useState(Date.now());

  const quiz = mockQuiz; // In real app, fetch based on quizId
  const question = quiz.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;

  const handleOptionSelect = (optionId: string) => {
    setSelectedOption(optionId);
  };

  const handleNext = () => {
    if (!selectedOption) {
      toast({
        title: "Please select an answer",
        description: "You must select an option before continuing.",
        variant: "destructive",
      });
      return;
    }

    const answer: Answer = {
      questionId: question.id,
      selectedOption,
      timeSpent: Math.floor((Date.now() - questionStartTime) / 1000),
    };

    setAnswers([...answers, answer]);

    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedOption(null);
    } else {
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
    }
  };

  const calculateScore = () => {
    let correct = 0;
    answers.forEach((answer) => {
      const q = quiz.questions.find((q) => q.id === answer.questionId);
      if (q && q.correctAnswer === answer.selectedOption) {
        correct++;
      }
    });
    return Math.round((correct / quiz.questions.length) * 100);
  };

  if (showResults) {
    const score = calculateScore();
    const passed = score >= 80;

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
              Passing score: 80%
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
                const isCorrect = userAnswer?.selectedOption === q.correctAnswer;

                return (
                  <div key={q.id} className="p-5">
                    <div className="flex items-start gap-4">
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium",
                          isCorrect
                            ? "bg-success/10 text-success"
                            : "bg-destructive/10 text-destructive"
                        )}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 space-y-2">
                        <p className="font-medium">{q.questionText}</p>
                        <p className="text-sm text-muted-foreground">
                          Your answer:{" "}
                          <span
                            className={
                              isCorrect ? "text-success" : "text-destructive"
                            }
                          >
                            {q.options.find((o) => o.id === userAnswer?.selectedOption)?.text}
                          </span>
                        </p>
                        {!isCorrect && (
                          <p className="text-sm text-muted-foreground">
                            Correct answer:{" "}
                            <span className="text-success">
                              {q.options.find((o) => o.id === q.correctAnswer)?.text}
                            </span>
                          </p>
                        )}
                        <div className="mt-2 rounded-lg bg-muted p-3">
                          <p className="text-xs font-medium text-accent mb-1">
                            {q.hipaaSection}
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
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Return to Dashboard
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
              <WorkforceGroupBadge group={quiz.workforceGroup} size="sm" />
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
              {question.questionText}
            </h2>

            {/* Options */}
            <div className="space-y-3">
              {question.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleOptionSelect(option.id)}
                  className={cn(
                    "w-full rounded-lg border p-4 text-left transition-all duration-200",
                    selectedOption === option.id
                      ? "border-accent bg-accent/5 ring-2 ring-accent/20"
                      : "border-border hover:border-accent/50 hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-medium",
                        selectedOption === option.id
                          ? "bg-accent text-white"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {option.label}
                    </span>
                    <span className="pt-0.5">{option.text}</span>
                  </div>
                </button>
              ))}
            </div>
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
            <Button onClick={handleNext} className="gap-2">
              {currentQuestion === quiz.questions.length - 1 ? (
                "Submit Quiz"
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* HIPAA Reference */}
        <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-accent">Training Notice:</span>{" "}
            This quiz content is mapped to 45 CFR Part 164 and is designed to 
            demonstrate workforce knowledge per §164.530(b)(1). Your responses 
            are recorded for audit purposes.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
