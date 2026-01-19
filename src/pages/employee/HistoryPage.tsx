import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { format } from "date-fns";
import {
  History,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  BookOpen,
} from "lucide-react";
import { WorkforceGroup, WORKFORCE_GROUP_LABELS } from "@/types/hipaa";

interface QuizAttempt {
  id: string;
  quiz_id: string;
  quiz_title: string;
  score: number;
  total_questions: number;
  passed: boolean;
  completed_at: string;
  workforce_group: WorkforceGroup;
}

interface TrainingCompletion {
  id: string;
  material_id: string;
  material_title: string;
  completed_at: string;
  version_at_completion: number;
}

export default function HistoryPage() {
  const { fullName } = useUserProfile();
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [trainings, setTrainings] = useState<TrainingCompletion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch quiz attempts
      const { data: attempts, error: attemptsError } = await supabase
        .from('quiz_attempts')
        .select(`
          id,
          quiz_id,
          score,
          total_questions,
          passed,
          completed_at,
          workforce_group_at_time
        `)
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false });

      if (attemptsError) throw attemptsError;

      // Fetch quiz titles
      const quizIds = [...new Set(attempts?.map(a => a.quiz_id) || [])];
      const { data: quizzes } = await supabase
        .from('quizzes')
        .select('id, title')
        .in('id', quizIds.length > 0 ? quizIds : ['none']);

      const quizMap = new Map(quizzes?.map(q => [q.id, q.title]) || []);

      setQuizAttempts((attempts || []).map(a => ({
        id: a.id,
        quiz_id: a.quiz_id,
        quiz_title: quizMap.get(a.quiz_id) || 'Unknown Quiz',
        score: a.score,
        total_questions: a.total_questions,
        passed: a.passed,
        completed_at: a.completed_at || '',
        workforce_group: a.workforce_group_at_time as WorkforceGroup,
      })));

      // Fetch training completions
      const { data: trainingProgress, error: trainingError } = await supabase
        .from('user_training_progress')
        .select(`
          id,
          material_id,
          completed_at,
          version_at_completion
        `)
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

      if (trainingError) throw trainingError;

      // Fetch material titles
      const materialIds = [...new Set(trainingProgress?.map(t => t.material_id) || [])];
      const { data: materials } = await supabase
        .from('training_materials')
        .select('id, title')
        .in('id', materialIds.length > 0 ? materialIds : ['none']);

      const materialMap = new Map(materials?.map(m => [m.id, m.title]) || []);

      setTrainings((trainingProgress || []).map(t => ({
        id: t.id,
        material_id: t.material_id,
        material_title: materialMap.get(t.material_id) || 'Unknown Material',
        completed_at: t.completed_at,
        version_at_completion: t.version_at_completion,
      })));

    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout userRole="workforce_user" userName={fullName || "User"}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="workforce_user" userName={fullName || "User"}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-6 w-6" />
            Training History
          </h1>
          <p className="text-muted-foreground">
            View your training completions and quiz attempts
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Materials Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{trainings.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Quiz Attempts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quizAttempts.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Quizzes Passed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {quizAttempts.filter(a => a.passed).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="trainings">
          <TabsList>
            <TabsTrigger value="trainings" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Trainings
            </TabsTrigger>
            <TabsTrigger value="attempts" className="gap-2">
              <FileText className="h-4 w-4" />
              Quiz Attempts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trainings" className="mt-4">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        No training materials completed yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    trainings.map((training) => (
                      <TableRow key={training.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            {training.material_title}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">v{training.version_at_completion}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-success">
                            <CheckCircle2 className="h-4 w-4" />
                            {format(new Date(training.completed_at), 'MMM d, yyyy h:mm a')}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="attempts" className="mt-4">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quiz</TableHead>
                    <TableHead>Workforce Group</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quizAttempts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No quiz attempts yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    quizAttempts.map((attempt) => (
                      <TableRow key={attempt.id}>
                        <TableCell className="font-medium">
                          {attempt.quiz_title}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {WORKFORCE_GROUP_LABELS[attempt.workforce_group]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {attempt.score}%
                        </TableCell>
                        <TableCell>
                          {attempt.passed ? (
                            <Badge className="bg-success/10 text-success border-success/30">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Passed
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Failed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(attempt.completed_at), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </DashboardLayout>
  );
}
