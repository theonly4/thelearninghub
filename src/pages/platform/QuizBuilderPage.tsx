import { useState, useEffect } from "react";
import { PlatformOwnerLayout } from "@/components/PlatformOwnerLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkforceGroupMultiSelect } from "@/components/admin/WorkforceGroupMultiSelect";
import { WORKFORCE_GROUP_LABELS, type WorkforceGroup } from "@/types/hipaa";
import {
  Plus,
  Save,
  Trash2,
  FileQuestion,
  GripVertical,
  CheckCircle2,
  AlertCircle,
  PenLine,
} from "lucide-react";
import { toast } from "sonner";

interface QuizQuestion {
  id?: string;
  question_number: number;
  question_text: string;
  scenario: string | null;
  options: { A: string; B: string; C: string; D: string };
  correct_answer: string;
  hipaa_section: string;
  rationale: string;
  workforce_groups: string[];
}

interface Quiz {
  id?: string;
  title: string;
  description: string;
  workforce_groups: WorkforceGroup[];
  passing_score: number;
  status: "draft" | "published";
  sequence_number: number;
}

const HIPAA_SECTIONS = [
  "Privacy Rule - §164.502",
  "Privacy Rule - §164.506",
  "Privacy Rule - §164.508",
  "Privacy Rule - §164.512",
  "Security Rule - §164.308",
  "Security Rule - §164.310",
  "Security Rule - §164.312",
  "Breach Notification - §164.400",
];

export default function QuizBuilderPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showQuizDialog, setShowQuizDialog] = useState(false);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);

  // New quiz form state
  const [newQuiz, setNewQuiz] = useState<Quiz>({
    title: "",
    description: "",
    workforce_groups: [],
    passing_score: 80,
    status: "draft",
    sequence_number: 1,
  });

  // New question form state
  const [newQuestion, setNewQuestion] = useState<QuizQuestion>({
    question_number: 1,
    question_text: "",
    scenario: "",
    options: { A: "", B: "", C: "", D: "" },
    correct_answer: "A",
    hipaa_section: "",
    rationale: "",
    workforce_groups: [],
  });

  useEffect(() => {
    fetchQuizzes();
  }, []);

  async function fetchQuizzes() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("quizzes")
        .select("*")
        .order("sequence_number", { ascending: true });

      if (error) throw error;

      const mapped = (data || []).map(q => ({
        id: q.id,
        title: q.title,
        description: q.description,
        workforce_groups: q.workforce_groups as WorkforceGroup[],
        passing_score: q.passing_score,
        status: (q.status || "published") as "draft" | "published",
        sequence_number: q.sequence_number,
      }));

      setQuizzes(mapped);
    } catch (error) {
      console.error("Error fetching quizzes:", error);
      toast.error("Failed to load quizzes");
    } finally {
      setLoading(false);
    }
  }

  async function fetchQuestions(quizId: string) {
    try {
      const { data, error } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("question_number", { ascending: true });

      if (error) throw error;

      const mapped = (data || []).map(q => ({
        id: q.id,
        question_number: q.question_number,
        question_text: q.question_text,
        scenario: q.scenario,
        options: q.options as { A: string; B: string; C: string; D: string },
        correct_answer: q.correct_answer,
        hipaa_section: q.hipaa_section,
        rationale: q.rationale,
        workforce_groups: q.workforce_groups || [],
      }));

      setQuestions(mapped);
    } catch (error) {
      console.error("Error fetching questions:", error);
      toast.error("Failed to load questions");
    }
  }

  async function handleSelectQuiz(quiz: Quiz) {
    setSelectedQuiz(quiz);
    if (quiz.id) {
      await fetchQuestions(quiz.id);
    } else {
      setQuestions([]);
    }
  }

  async function handleCreateQuiz() {
    if (!newQuiz.title.trim()) {
      toast.error("Please enter a quiz title");
      return;
    }

    if (newQuiz.workforce_groups.length === 0) {
      toast.error("Please select at least one workforce group");
      return;
    }

    setSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      // Get max sequence number
      const maxSeq = Math.max(0, ...quizzes.map(q => q.sequence_number));

      const { data, error } = await supabase
        .from("quizzes")
        .insert({
          title: newQuiz.title,
          description: newQuiz.description,
          workforce_groups: newQuiz.workforce_groups,
          passing_score: newQuiz.passing_score,
          status: newQuiz.status,
          sequence_number: maxSeq + 1,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Quiz created successfully");
      setShowQuizDialog(false);
      setNewQuiz({
        title: "",
        description: "",
        workforce_groups: [],
        passing_score: 80,
        status: "draft",
        sequence_number: 1,
      });
      await fetchQuizzes();

      // Auto-select the new quiz
      if (data) {
        handleSelectQuiz({
          id: data.id,
          title: data.title,
          description: data.description,
          workforce_groups: data.workforce_groups as WorkforceGroup[],
          passing_score: data.passing_score,
          status: (data.status || "published") as "draft" | "published",
          sequence_number: data.sequence_number,
        });
      }
    } catch (error) {
      console.error("Error creating quiz:", error);
      toast.error("Failed to create quiz");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveQuestion() {
    if (!selectedQuiz?.id) {
      toast.error("Please select a quiz first");
      return;
    }

    if (!newQuestion.question_text.trim()) {
      toast.error("Please enter question text");
      return;
    }

    if (!newQuestion.options.A || !newQuestion.options.B || !newQuestion.options.C || !newQuestion.options.D) {
      toast.error("Please fill in all answer options");
      return;
    }

    if (!newQuestion.hipaa_section) {
      toast.error("Please select a HIPAA section");
      return;
    }

    if (!newQuestion.rationale.trim()) {
      toast.error("Please provide a rationale");
      return;
    }

    setSaving(true);
    try {
      if (editingQuestion?.id) {
        // Update existing question
        const { error } = await supabase
          .from("quiz_questions")
          .update({
            question_text: newQuestion.question_text,
            scenario: newQuestion.scenario || null,
            options: newQuestion.options,
            correct_answer: newQuestion.correct_answer,
            hipaa_section: newQuestion.hipaa_section,
            rationale: newQuestion.rationale,
            workforce_groups: newQuestion.workforce_groups,
          })
          .eq("id", editingQuestion.id);

        if (error) throw error;
        toast.success("Question updated successfully");
      } else {
        // Create new question
        const maxNum = Math.max(0, ...questions.map(q => q.question_number));

        const { error } = await supabase
          .from("quiz_questions")
          .insert({
            quiz_id: selectedQuiz.id,
            question_number: maxNum + 1,
            question_text: newQuestion.question_text,
            scenario: newQuestion.scenario || null,
            options: newQuestion.options,
            correct_answer: newQuestion.correct_answer,
            hipaa_section: newQuestion.hipaa_section,
            rationale: newQuestion.rationale,
            workforce_groups: newQuestion.workforce_groups,
          });

        if (error) throw error;
        toast.success("Question added successfully");
      }

      setShowQuestionDialog(false);
      resetQuestionForm();
      await fetchQuestions(selectedQuiz.id);
    } catch (error) {
      console.error("Error saving question:", error);
      toast.error("Failed to save question");
    } finally {
      setSaving(false);
    }
  }

  function resetQuestionForm() {
    setEditingQuestion(null);
    setNewQuestion({
      question_number: 1,
      question_text: "",
      scenario: "",
      options: { A: "", B: "", C: "", D: "" },
      correct_answer: "A",
      hipaa_section: "",
      rationale: "",
      workforce_groups: [],
    });
  }

  function handleEditQuestion(question: QuizQuestion) {
    setEditingQuestion(question);
    setNewQuestion(question);
    setShowQuestionDialog(true);
  }

  async function handleDeleteQuestion(questionId: string) {
    if (!confirm("Are you sure you want to delete this question?")) return;

    try {
      const { error } = await supabase
        .from("quiz_questions")
        .delete()
        .eq("id", questionId);

      if (error) throw error;

      toast.success("Question deleted");
      if (selectedQuiz?.id) {
        await fetchQuestions(selectedQuiz.id);
      }
    } catch (error) {
      console.error("Error deleting question:", error);
      toast.error("Failed to delete question");
    }
  }

  async function handlePublishQuiz() {
    if (!selectedQuiz?.id) return;

    if (questions.length === 0) {
      toast.error("Cannot publish a quiz without questions");
      return;
    }

    try {
      const { error } = await supabase
        .from("quizzes")
        .update({ status: "published" })
        .eq("id", selectedQuiz.id);

      if (error) throw error;

      toast.success("Quiz published successfully");
      setSelectedQuiz({ ...selectedQuiz, status: "published" });
      await fetchQuizzes();
    } catch (error) {
      console.error("Error publishing quiz:", error);
      toast.error("Failed to publish quiz");
    }
  }

  return (
    <PlatformOwnerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Quiz Builder</h1>
            <p className="text-muted-foreground">
              Create and manage quizzes with custom questions
            </p>
          </div>
          <Button onClick={() => setShowQuizDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Quiz
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Quiz List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Quizzes</CardTitle>
              <CardDescription>Select a quiz to edit</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                [1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))
              ) : quizzes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No quizzes yet. Create your first quiz!
                </p>
              ) : (
                quizzes.map(quiz => (
                  <button
                    key={quiz.id}
                    onClick={() => handleSelectQuiz(quiz)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedQuiz?.id === quiz.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{quiz.title}</h4>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {quiz.description || "No description"}
                        </p>
                      </div>
                      <Badge variant={quiz.status === "published" ? "default" : "secondary"}>
                        {quiz.status}
                      </Badge>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {/* Question Editor */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {selectedQuiz ? selectedQuiz.title : "Select a Quiz"}
                  </CardTitle>
                  <CardDescription>
                    {selectedQuiz 
                      ? `${questions.length} questions • Pass: ${selectedQuiz.passing_score}%`
                      : "Choose a quiz from the list to edit its questions"
                    }
                  </CardDescription>
                </div>
                {selectedQuiz && (
                  <div className="flex gap-2">
                    {selectedQuiz.status === "draft" && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handlePublishQuiz}
                        className="gap-1"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Publish
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      onClick={() => {
                        resetQuestionForm();
                        setShowQuestionDialog(true);
                      }}
                      className="gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      Add Question
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedQuiz ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileQuestion className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a quiz to view and edit questions</p>
                </div>
              ) : questions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No questions yet</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      resetQuestionForm();
                      setShowQuestionDialog(true);
                    }}
                  >
                    Add First Question
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {questions.map((q, index) => (
                    <div 
                      key={q.id || index}
                      className="p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-medium text-sm shrink-0">
                          {q.question_number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium line-clamp-2">{q.question_text}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {q.hipaa_section}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              Answer: {q.correct_answer}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditQuestion(q)}
                          >
                            <PenLine className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => q.id && handleDeleteQuestion(q.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Create Quiz Dialog */}
        <Dialog open={showQuizDialog} onOpenChange={setShowQuizDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Quiz</DialogTitle>
              <DialogDescription>
                Set up the basic information for your quiz
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="quiz-title">Quiz Title</Label>
                <Input
                  id="quiz-title"
                  placeholder="e.g., HIPAA Privacy Rule Quiz"
                  value={newQuiz.title}
                  onChange={(e) => setNewQuiz({ ...newQuiz, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quiz-description">Description</Label>
                <Textarea
                  id="quiz-description"
                  placeholder="Brief description of the quiz content..."
                  value={newQuiz.description}
                  onChange={(e) => setNewQuiz({ ...newQuiz, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Workforce Groups</Label>
                <WorkforceGroupMultiSelect
                  selectedGroups={newQuiz.workforce_groups}
                  onSelectionChange={(groups) => setNewQuiz({ ...newQuiz, workforce_groups: groups })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="passing-score">Passing Score (%)</Label>
                  <Input
                    id="passing-score"
                    type="number"
                    min="50"
                    max="100"
                    value={newQuiz.passing_score}
                    onChange={(e) => setNewQuiz({ ...newQuiz, passing_score: parseInt(e.target.value) || 80 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select 
                    value={newQuiz.status} 
                    onValueChange={(v) => setNewQuiz({ ...newQuiz, status: v as "draft" | "published" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowQuizDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateQuiz} disabled={saving}>
                {saving ? "Creating..." : "Create Quiz"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add/Edit Question Dialog */}
        <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingQuestion ? "Edit Question" : "Add Question"}
              </DialogTitle>
              <DialogDescription>
                {selectedQuiz?.title}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="question-text">Question Text</Label>
                <Textarea
                  id="question-text"
                  placeholder="Enter the question..."
                  className="min-h-[80px]"
                  value={newQuestion.question_text}
                  onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scenario">Scenario (Optional)</Label>
                <Textarea
                  id="scenario"
                  placeholder="Describe a scenario that provides context for the question..."
                  value={newQuestion.scenario || ""}
                  onChange={(e) => setNewQuestion({ ...newQuestion, scenario: e.target.value })}
                />
              </div>

              <div className="space-y-3">
                <Label>Answer Options</Label>
                {(["A", "B", "C", "D"] as const).map(letter => (
                  <div key={letter} className="flex gap-2 items-center">
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-muted text-sm font-medium">
                      {letter}
                    </span>
                    <Input
                      placeholder={`Option ${letter}`}
                      value={newQuestion.options[letter]}
                      onChange={(e) => setNewQuestion({
                        ...newQuestion,
                        options: { ...newQuestion.options, [letter]: e.target.value }
                      })}
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Correct Answer</Label>
                <RadioGroup 
                  value={newQuestion.correct_answer}
                  onValueChange={(v) => setNewQuestion({ ...newQuestion, correct_answer: v })}
                  className="flex gap-4"
                >
                  {["A", "B", "C", "D"].map(letter => (
                    <div key={letter} className="flex items-center space-x-2">
                      <RadioGroupItem value={letter} id={`answer-${letter}`} />
                      <Label htmlFor={`answer-${letter}`}>{letter}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>HIPAA Section</Label>
                <Select 
                  value={newQuestion.hipaa_section}
                  onValueChange={(v) => setNewQuestion({ ...newQuestion, hipaa_section: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select HIPAA section" />
                  </SelectTrigger>
                  <SelectContent>
                    {HIPAA_SECTIONS.map(section => (
                      <SelectItem key={section} value={section}>
                        {section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rationale">Rationale</Label>
                <Textarea
                  id="rationale"
                  placeholder="Explain why this answer is correct..."
                  className="min-h-[80px]"
                  value={newQuestion.rationale}
                  onChange={(e) => setNewQuestion({ ...newQuestion, rationale: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowQuestionDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveQuestion} disabled={saving}>
                {saving ? "Saving..." : editingQuestion ? "Update Question" : "Add Question"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PlatformOwnerLayout>
  );
}