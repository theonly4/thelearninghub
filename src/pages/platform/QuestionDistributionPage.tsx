import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PlatformOwnerLayout } from "@/components/PlatformOwnerLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Building2, Calendar, FileText, Send, Search, Filter, CheckCircle2, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { WORKFORCE_GROUP_LABELS, WorkforceGroup } from "@/types/hipaa";

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  quiz_id: string;
  question_number: number;
  hipaa_section: string;
  workforce_groups: string[];
}

interface Quiz {
  id: string;
  title: string;
}

interface QuestionRelease {
  id: string;
  question_id: string;
  organization_id: string;
  released_by: string;
  released_at: string;
  notes: string | null;
  question?: QuizQuestion;
  source_type: "individual" | "package";
  package_name?: string;
}

interface PackageRelease {
  id: string;
  package_id: string;
  organization_id: string;
  workforce_group: string;
  training_year: number;
  released_at: string;
  notes: string | null;
}

export default function QuestionDistributionPage() {
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [releases, setReleases] = useState<QuestionRelease[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Release dialog state
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [releaseNotes, setReleaseNotes] = useState("");
  const [releasing, setReleasing] = useState(false);
  
  // Filter state
  const [filterOrg, setFilterOrg] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuiz, setSelectedQuiz] = useState<string>("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [orgsRes, questionsRes, quizzesRes, releasesRes, packageReleasesRes] = await Promise.all([
        supabase.from("organizations").select("*").neq("slug", "platform-owner"),
        supabase.from("quiz_questions").select("*").order("quiz_id").order("question_number"),
        supabase.from("quizzes").select("id, title").order("sequence_number"),
        supabase.from("question_releases").select("*").order("released_at", { ascending: false }),
        supabase
          .from("package_releases")
          .select("id, package_id, organization_id, workforce_group, training_year, released_at, notes, question_packages(name)")
          .order("released_at", { ascending: false })
      ]);

      if (orgsRes.data) setOrganizations(orgsRes.data);
      if (questionsRes.data) setQuestions(questionsRes.data as QuizQuestion[]);
      if (quizzesRes.data) setQuizzes(quizzesRes.data);
      
      // Process individual question releases
      const individualReleases: QuestionRelease[] = (releasesRes.data || []).map(r => ({
        ...r,
        source_type: "individual" as const
      }));
      
      // Process package releases - get all questions from each package
      const packageReleaseData = packageReleasesRes.data || [];
      const packageQuestionReleases: QuestionRelease[] = [];
      
      for (const pkgRelease of packageReleaseData) {
        const packageName = (pkgRelease as any).question_packages?.name || "Unknown Package";
        
        // Get questions in this package
        const { data: pkgQuestions } = await supabase
          .from("package_questions")
          .select("question_id")
          .eq("package_id", pkgRelease.package_id);
        
        if (pkgQuestions) {
          for (const pq of pkgQuestions) {
            packageQuestionReleases.push({
              id: `${pkgRelease.id}-${pq.question_id}`,
              question_id: pq.question_id,
              organization_id: pkgRelease.organization_id,
              released_by: "",
              released_at: pkgRelease.released_at,
              notes: pkgRelease.notes,
              source_type: "package",
              package_name: packageName
            });
          }
        }
      }
      
      // Combine and sort by release date
      const allReleases = [...individualReleases, ...packageQuestionReleases].sort(
        (a, b) => new Date(b.released_at).getTime() - new Date(a.released_at).getTime()
      );
      
      setReleases(allReleases);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getReleasedQuestionsForOrg = (orgId: string) => {
    return releases.filter(r => r.organization_id === orgId).map(r => r.question_id);
  };

  const getOrgReleaseCount = (orgId: string) => {
    return releases.filter(r => r.organization_id === orgId).length;
  };

  const getQuizTitle = (quizId: string) => {
    return quizzes.find(q => q.id === quizId)?.title || "Unknown Quiz";
  };

  const getOrgName = (orgId: string) => {
    return organizations.find(o => o.id === orgId)?.name || "Unknown Organization";
  };

  const getQuestionText = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    return question?.question_text || "Unknown Question";
  };

  const handleReleaseQuestions = async () => {
    if (!selectedOrg || selectedQuestions.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select an organization and at least one question.",
        variant: "destructive"
      });
      return;
    }

    setReleasing(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const releasesToInsert = selectedQuestions.map(questionId => ({
        question_id: questionId,
        organization_id: selectedOrg,
        released_by: userData.user.id,
        notes: releaseNotes || null
      }));

      const { error } = await supabase.from("question_releases").insert(releasesToInsert);

      if (error) throw error;

      toast({
        title: "Questions Released",
        description: `Successfully released ${selectedQuestions.length} questions to ${getOrgName(selectedOrg)}.`
      });

      setReleaseDialogOpen(false);
      setSelectedOrg("");
      setSelectedQuestions([]);
      setReleaseNotes("");
      fetchData();
    } catch (error: any) {
      console.error("Error releasing questions:", error);
      toast({
        title: "Error",
        description: error.message?.includes("duplicate") 
          ? "Some questions have already been released to this organization." 
          : "Failed to release questions.",
        variant: "destructive"
      });
    } finally {
      setReleasing(false);
    }
  };

  const getAvailableQuestionsForOrg = (orgId: string) => {
    const releasedIds = getReleasedQuestionsForOrg(orgId);
    return questions.filter(q => !releasedIds.includes(q.id));
  };

  const filteredReleases = releases.filter(release => {
    if (filterOrg !== "all" && release.organization_id !== filterOrg) return false;
    if (searchQuery) {
      const questionText = getQuestionText(release.question_id).toLowerCase();
      if (!questionText.includes(searchQuery.toLowerCase())) return false;
    }
    return true;
  });

  const filteredQuestions = questions.filter(q => {
    if (selectedQuiz !== "all" && q.quiz_id !== selectedQuiz) return false;
    if (selectedOrg) {
      const releasedIds = getReleasedQuestionsForOrg(selectedOrg);
      if (releasedIds.includes(q.id)) return false;
    }
    return true;
  });

  return (
    <PlatformOwnerLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Question Distribution</h1>
            <p className="text-muted-foreground mt-1">
              Track and manage which questions are released to each organization
            </p>
          </div>
          <Dialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Send className="h-4 w-4 mr-2" />
                Release Questions
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Release Questions to Organization</DialogTitle>
                <DialogDescription>
                  Select an organization and choose questions to release. Already released questions are hidden.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Organization</Label>
                  <Select value={selectedOrg} onValueChange={(val) => {
                    setSelectedOrg(val);
                    setSelectedQuestions([]);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an organization..." />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map(org => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name} ({getOrgReleaseCount(org.id)} questions released)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedOrg && (
                  <>
                    <div className="space-y-2">
                      <Label>Filter by Quiz</Label>
                      <Select value={selectedQuiz} onValueChange={setSelectedQuiz}>
                        <SelectTrigger>
                          <SelectValue placeholder="All quizzes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Quizzes</SelectItem>
                          {quizzes.map(quiz => (
                            <SelectItem key={quiz.id} value={quiz.id}>{quiz.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Select Questions ({filteredQuestions.length} available)</Label>
                        <div className="space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedQuestions(filteredQuestions.map(q => q.id))}
                          >
                            Select All
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedQuestions([])}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                      <ScrollArea className="h-[300px] border rounded-md p-3">
                        {filteredQuestions.length === 0 ? (
                          <p className="text-muted-foreground text-center py-4">
                            All questions from this quiz have been released to this organization.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {filteredQuestions.map(question => (
                              <div key={question.id} className="flex items-start space-x-3 p-2 hover:bg-muted/50 rounded">
                                <Checkbox
                                  id={question.id}
                                  checked={selectedQuestions.includes(question.id)}
                                  onCheckedChange={(checked) => {
                                    setSelectedQuestions(prev => 
                                      checked 
                                        ? [...prev, question.id]
                                        : prev.filter(id => id !== question.id)
                                    );
                                  }}
                                />
                                <label htmlFor={question.id} className="text-sm cursor-pointer flex-1">
                                  <span className="font-medium">Q{question.question_number}:</span>{" "}
                                  {question.question_text.substring(0, 100)}
                                  {question.question_text.length > 100 && "..."}
                                  <div className="flex gap-1 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {getQuizTitle(question.quiz_id)}
                                    </Badge>
                                    <Badge variant="secondary" className="text-xs">
                                      {question.hipaa_section}
                                    </Badge>
                                  </div>
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </div>

                    <div className="space-y-2">
                      <Label>Release Notes (optional)</Label>
                      <Textarea
                        value={releaseNotes}
                        onChange={(e) => setReleaseNotes(e.target.value)}
                        placeholder="Add notes about this release..."
                      />
                    </div>

                    <div className="flex justify-between items-center pt-4">
                      <span className="text-sm text-muted-foreground">
                        {selectedQuestions.length} questions selected
                      </span>
                      <Button 
                        onClick={handleReleaseQuestions} 
                        disabled={releasing || selectedQuestions.length === 0}
                      >
                        {releasing ? "Releasing..." : "Release Selected Questions"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Organization Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {organizations.map(org => {
            const releaseCount = getOrgReleaseCount(org.id);
            const availableCount = getAvailableQuestionsForOrg(org.id).length;
            return (
              <Card key={org.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{org.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-sm">
                    <div>
                      <span className="text-2xl font-bold text-primary">{releaseCount}</span>
                      <p className="text-muted-foreground">Questions Released</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-muted-foreground">{availableCount}</span>
                      <p className="text-muted-foreground">Available</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Release History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Release History
            </CardTitle>
            <CardDescription>
              Complete audit trail of all question releases
            </CardDescription>
            
            <div className="flex gap-4 pt-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search questions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={filterOrg} onValueChange={setFilterOrg}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by org" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Organizations</SelectItem>
                  {organizations.map(org => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredReleases.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No releases found. Start by releasing questions to an organization.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Released</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReleases.map(release => {
                    const question = questions.find(q => q.id === release.question_id);
                    return (
                      <TableRow key={release.id}>
                        <TableCell className="max-w-md">
                          <div className="space-y-1">
                            <p className="font-medium truncate">
                              {question ? `Q${question.question_number}: ${question.question_text.substring(0, 60)}...` : "Unknown"}
                            </p>
                            {question && (
                              <Badge variant="outline" className="text-xs">
                                {getQuizTitle(question.quiz_id)}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {release.source_type === "package" ? (
                            <Badge variant="secondary" className="gap-1">
                              <Package className="h-3 w-3" />
                              {release.package_name}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Individual</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {getOrgName(release.organization_id)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(release.released_at), "MMM d, yyyy")}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {release.notes || "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </PlatformOwnerLayout>
  );
}
