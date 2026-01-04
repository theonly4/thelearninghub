import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PlatformOwnerLayout } from "@/components/PlatformOwnerLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Filter,
  ChevronLeft,
  ChevronRight,
  FileQuestion,
  BookOpen,
  Upload
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { WORKFORCE_GROUP_LABELS, type WorkforceGroup } from "@/types/hipaa";
import { HipaaLink } from "@/components/HipaaLink";
import { toast } from "sonner";

interface HipaaTopic {
  id: string;
  rule_name: string;
  topic_name: string;
  description: string;
}

interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_number: number;
  question_text: string;
  scenario: string | null;
  options: { label: string; text: string }[];
  correct_answer: string;
  rationale: string;
  hipaa_section: string;
  hipaa_topic_id: string | null;
  hipaa_topic?: HipaaTopic | null;
}

interface Quiz {
  id: string;
  title: string;
  workforce_groups: WorkforceGroup[];
  sequence_number: number;
}

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [hipaaTopics, setHipaaTopics] = useState<HipaaTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterQuiz, setFilterQuiz] = useState<string>("all");
  const [filterTopic, setFilterTopic] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  
  const questionsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [questionsRes, quizzesRes, topicsRes] = await Promise.all([
        supabase
          .from("quiz_questions")
          .select("*, hipaa_topics(*)")
          .order("quiz_id")
          .order("question_number"),
        supabase
          .from("quizzes")
          .select("id, title, workforce_groups, sequence_number")
          .order("sequence_number"),
        supabase
          .from("hipaa_topics")
          .select("*")
          .order("rule_name")
          .order("topic_name"),
      ]);

      if (questionsRes.error) throw questionsRes.error;
      if (quizzesRes.error) throw quizzesRes.error;
      if (topicsRes.error) throw topicsRes.error;

      const typedQuestions = (questionsRes.data || []).map(q => ({
        ...q,
        options: q.options as { label: string; text: string }[],
        hipaa_topic: q.hipaa_topics as HipaaTopic | null,
      }));

      setQuestions(typedQuestions);
      setQuizzes((quizzesRes.data || []) as Quiz[]);
      setHipaaTopics((topicsRes.data || []) as HipaaTopic[]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load questions");
    } finally {
      setLoading(false);
    }
  }

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch = 
      q.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.hipaa_section.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.hipaa_topic?.rule_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.hipaa_topic?.topic_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesQuiz = filterQuiz === "all" || q.quiz_id === filterQuiz;
    const matchesTopic = filterTopic === "all" || q.hipaa_topic_id === filterTopic;
    return matchesSearch && matchesQuiz && matchesTopic;
  });

  const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage);
  const paginatedQuestions = filteredQuestions.slice(
    (currentPage - 1) * questionsPerPage,
    currentPage * questionsPerPage
  );

  const getQuizTitle = (quizId: string) => {
    const quiz = quizzes.find((q) => q.id === quizId);
    return quiz?.title || "Unknown Quiz";
  };

  const getQuizWorkforceGroups = (quizId: string) => {
    const quiz = quizzes.find((q) => q.id === quizId);
    return quiz?.workforce_groups || [];
  };

  async function handleDeleteQuestion(questionId: string) {
    if (!confirm("Are you sure you want to delete this question?")) return;

    try {
      const { error } = await supabase
        .from("quiz_questions")
        .delete()
        .eq("id", questionId);

      if (error) throw error;
      
      setQuestions(questions.filter((q) => q.id !== questionId));
      toast.success("Question deleted successfully");
    } catch (error) {
      console.error("Error deleting question:", error);
      toast.error("Failed to delete question");
    }
  }

  return (
    <PlatformOwnerLayout userName="Admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Question Bank</h2>
            <p className="text-muted-foreground">
              Manage all quiz questions across workforce groups.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/platform/import">
                <Upload className="h-4 w-4 mr-2" />
                Bulk Import
              </Link>
            </Button>
            <Dialog open={isTopicDialogOpen} onOpenChange={setIsTopicDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Manage Topics
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <HipaaTopicManager 
                  topics={hipaaTopics} 
                  onUpdate={fetchData} 
                />
              </DialogContent>
            </Dialog>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <QuestionForm
                  quizzes={quizzes}
                  hipaaTopics={hipaaTopics}
                  onSuccess={() => {
                    setIsAddDialogOpen(false);
                    fetchData();
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <FileQuestion className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">{questions.length}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Total Questions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{quizzes.length}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Active Quizzes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{hipaaTopics.length}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">HIPAA Topics</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">5</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Workforce Groups</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search questions, HIPAA sections, rules, or topics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterQuiz} onValueChange={setFilterQuiz}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by quiz" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Quizzes</SelectItem>
              {quizzes.map((quiz) => (
                <SelectItem key={quiz.id} value={quiz.id}>
                  {quiz.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterTopic} onValueChange={setFilterTopic}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by topic" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Topics</SelectItem>
              {hipaaTopics.map((topic) => (
                <SelectItem key={topic.id} value={topic.id}>
                  {topic.topic_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Questions Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="min-w-[150px]">Scenario</TableHead>
                    <TableHead className="min-w-[200px]">Question</TableHead>
                    <TableHead className="min-w-[120px]">Options</TableHead>
                    <TableHead className="w-20">Answer</TableHead>
                    <TableHead className="min-w-[150px]">Rationale</TableHead>
                    <TableHead className="min-w-[100px]">HIPAA Section</TableHead>
                    <TableHead className="min-w-[120px]">Workforce Group</TableHead>
                    <TableHead className="min-w-[120px]">HIPAA Rule</TableHead>
                    <TableHead className="min-w-[150px]">HIPAA Topic</TableHead>
                    <TableHead className="min-w-[200px]">Description</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8">
                        Loading questions...
                      </TableCell>
                    </TableRow>
                  ) : paginatedQuestions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                        No questions found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedQuestions.map((question) => (
                      <TableRow key={question.id}>
                        <TableCell className="font-mono text-sm">
                          {question.question_number}
                        </TableCell>
                        <TableCell className="max-w-[150px]">
                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            {question.scenario || "-"}
                          </p>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="line-clamp-2">{question.question_text}</p>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs space-y-0.5">
                            {question.options.map((opt) => (
                              <div key={opt.label} className="truncate max-w-[120px]">
                                <span className="font-medium">{opt.label}.</span> {opt.text}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {question.correct_answer}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[150px]">
                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            {question.rationale}
                          </p>
                        </TableCell>
                        <TableCell>
                          <HipaaLink section={question.hipaa_section} />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {getQuizWorkforceGroups(question.quiz_id).slice(0, 1).map((group) => (
                              <Badge key={group} variant="secondary" className="text-xs">
                                {WORKFORCE_GROUP_LABELS[group as WorkforceGroup]}
                              </Badge>
                            ))}
                            {getQuizWorkforceGroups(question.quiz_id).length > 1 && (
                              <Badge variant="outline" className="text-xs">
                                +{getQuizWorkforceGroups(question.quiz_id).length - 1}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {question.hipaa_topic?.rule_name || "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">
                            {question.hipaa_topic?.topic_name || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            {question.hipaa_topic?.description || "-"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingQuestion(question)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteQuestion(question.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * questionsPerPage + 1} to{" "}
              {Math.min(currentPage * questionsPerPage, filteredQuestions.length)} of{" "}
              {filteredQuestions.length} questions
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingQuestion} onOpenChange={(open) => !open && setEditingQuestion(null)}>
          <DialogContent className="max-w-2xl">
            {editingQuestion && (
              <QuestionForm
                question={editingQuestion}
                quizzes={quizzes}
                hipaaTopics={hipaaTopics}
                onSuccess={() => {
                  setEditingQuestion(null);
                  fetchData();
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PlatformOwnerLayout>
  );
}

interface HipaaTopicManagerProps {
  topics: HipaaTopic[];
  onUpdate: () => void;
}

function HipaaTopicManager({ topics, onUpdate }: HipaaTopicManagerProps) {
  const [newTopic, setNewTopic] = useState({ rule_name: "", topic_name: "", description: "" });
  const [saving, setSaving] = useState(false);

  async function handleAddTopic(e: React.FormEvent) {
    e.preventDefault();
    if (!newTopic.rule_name || !newTopic.topic_name || !newTopic.description) {
      toast.error("All fields are required");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("hipaa_topics").insert(newTopic);
      if (error) throw error;
      toast.success("Topic added successfully");
      setNewTopic({ rule_name: "", topic_name: "", description: "" });
      onUpdate();
    } catch (error) {
      console.error("Error adding topic:", error);
      toast.error("Failed to add topic");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTopic(topicId: string) {
    if (!confirm("Are you sure? Questions linked to this topic will be unlinked.")) return;

    try {
      const { error } = await supabase.from("hipaa_topics").delete().eq("id", topicId);
      if (error) throw error;
      toast.success("Topic deleted");
      onUpdate();
    } catch (error) {
      console.error("Error deleting topic:", error);
      toast.error("Failed to delete topic");
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Manage HIPAA Topics</DialogTitle>
        <DialogDescription>
          Add and manage HIPAA rules, topics, and descriptions for question categorization.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {/* Add New Topic Form */}
        <form onSubmit={handleAddTopic} className="space-y-3 p-4 border rounded-lg bg-muted/50">
          <h4 className="font-medium">Add New Topic</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="rule_name">HIPAA Rule</Label>
              <Input
                id="rule_name"
                placeholder="Privacy Rule"
                value={newTopic.rule_name}
                onChange={(e) => setNewTopic({ ...newTopic, rule_name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="topic_name">Topic Name</Label>
              <Input
                id="topic_name"
                placeholder="Minimum Necessary"
                value={newTopic.topic_name}
                onChange={(e) => setNewTopic({ ...newTopic, topic_name: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of the topic..."
              value={newTopic.description}
              onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
              rows={2}
            />
          </div>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "Adding..." : "Add Topic"}
          </Button>
        </form>

        {/* Existing Topics */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          <h4 className="font-medium">Existing Topics ({topics.length})</h4>
          {topics.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No topics yet. Add your first topic above.
            </p>
          ) : (
            topics.map((topic) => (
              <div key={topic.id} className="flex items-start justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{topic.rule_name}</Badge>
                    <span className="font-medium">{topic.topic_name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{topic.description}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteTopic(topic.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

interface QuestionFormProps {
  question?: QuizQuestion;
  quizzes: Quiz[];
  hipaaTopics: HipaaTopic[];
  onSuccess: () => void;
}

function QuestionForm({ question, quizzes, hipaaTopics, onSuccess }: QuestionFormProps) {
  const [formData, setFormData] = useState({
    quiz_id: question?.quiz_id || "",
    question_number: question?.question_number || 1,
    question_text: question?.question_text || "",
    scenario: question?.scenario || "",
    optionA: question?.options?.find(o => o.label === "A")?.text || "",
    optionB: question?.options?.find(o => o.label === "B")?.text || "",
    optionC: question?.options?.find(o => o.label === "C")?.text || "",
    optionD: question?.options?.find(o => o.label === "D")?.text || "",
    correct_answer: question?.correct_answer || "A",
    rationale: question?.rationale || "",
    hipaa_section: question?.hipaa_section || "",
    hipaa_topic_id: question?.hipaa_topic_id || "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const options = [
        { label: "A", text: formData.optionA },
        { label: "B", text: formData.optionB },
        { label: "C", text: formData.optionC },
        { label: "D", text: formData.optionD },
      ];

      const questionData = {
        quiz_id: formData.quiz_id,
        question_number: formData.question_number,
        question_text: formData.question_text,
        scenario: formData.scenario || null,
        options,
        correct_answer: formData.correct_answer,
        rationale: formData.rationale,
        hipaa_section: formData.hipaa_section,
        hipaa_topic_id: formData.hipaa_topic_id || null,
      };

      if (question) {
        const { error } = await supabase
          .from("quiz_questions")
          .update(questionData)
          .eq("id", question.id);
        if (error) throw error;
        toast.success("Question updated successfully");
      } else {
        const { error } = await supabase
          .from("quiz_questions")
          .insert(questionData);
        if (error) throw error;
        toast.success("Question created successfully");
      }

      onSuccess();
    } catch (error) {
      console.error("Error saving question:", error);
      toast.error("Failed to save question");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>{question ? "Edit Question" : "Add New Question"}</DialogTitle>
        <DialogDescription>
          {question ? "Update the question details below." : "Create a new quiz question."}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quiz">Quiz</Label>
            <Select
              value={formData.quiz_id}
              onValueChange={(value) => setFormData({ ...formData, quiz_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a quiz" />
              </SelectTrigger>
              <SelectContent>
                {quizzes.map((quiz) => (
                  <SelectItem key={quiz.id} value={quiz.id}>
                    {quiz.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="question_number">Question Number</Label>
            <Input
              id="question_number"
              type="number"
              min={1}
              value={formData.question_number}
              onChange={(e) => setFormData({ ...formData, question_number: parseInt(e.target.value) })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="scenario">Scenario (Optional)</Label>
          <Textarea
            id="scenario"
            placeholder="Describe a scenario for context..."
            value={formData.scenario}
            onChange={(e) => setFormData({ ...formData, scenario: e.target.value })}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="question_text">Question Text</Label>
          <Textarea
            id="question_text"
            placeholder="Enter the question..."
            value={formData.question_text}
            onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
            rows={2}
            required
          />
        </div>

        <div className="space-y-3">
          <Label>Answer Options</Label>
          {["A", "B", "C", "D"].map((letter) => (
            <div key={letter} className="flex items-center gap-2">
              <span className="font-mono text-sm w-6">{letter}.</span>
              <Input
                placeholder={`Option ${letter}`}
                value={formData[`option${letter}` as keyof typeof formData] as string}
                onChange={(e) =>
                  setFormData({ ...formData, [`option${letter}`]: e.target.value })
                }
                required
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="correct_answer">Correct Answer</Label>
            <Select
              value={formData.correct_answer}
              onValueChange={(value) => setFormData({ ...formData, correct_answer: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["A", "B", "C", "D"].map((letter) => (
                  <SelectItem key={letter} value={letter}>
                    {letter}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="hipaa_section">HIPAA Section</Label>
            <Input
              id="hipaa_section"
              placeholder="164.502(a)"
              value={formData.hipaa_section}
              onChange={(e) => setFormData({ ...formData, hipaa_section: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="hipaa_topic">HIPAA Topic</Label>
          <Select
            value={formData.hipaa_topic_id}
            onValueChange={(value) => setFormData({ ...formData, hipaa_topic_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a topic (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No topic</SelectItem>
              {hipaaTopics.map((topic) => (
                <SelectItem key={topic.id} value={topic.id}>
                  {topic.rule_name} - {topic.topic_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="rationale">Rationale</Label>
          <Textarea
            id="rationale"
            placeholder="Explain why this is the correct answer..."
            value={formData.rationale}
            onChange={(e) => setFormData({ ...formData, rationale: e.target.value })}
            rows={3}
            required
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : question ? "Update Question" : "Create Question"}
        </Button>
      </DialogFooter>
    </form>
  );
}
