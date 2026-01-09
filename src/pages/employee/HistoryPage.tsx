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
import { format } from "date-fns";
import {
  History,
  Award,
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  Loader2,
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

interface Certificate {
  id: string;
  certificate_number: string;
  score: number;
  issued_at: string;
  valid_until: string;
  workforce_group: WorkforceGroup;
}

export default function HistoryPage() {
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
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
        .in('id', quizIds);

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

      // Fetch certificates
      const { data: certs, error: certsError } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', user.id)
        .order('issued_at', { ascending: false });

      if (certsError) throw certsError;

      setCertificates((certs || []).map(c => ({
        id: c.id,
        certificate_number: c.certificate_number,
        score: c.score,
        issued_at: c.issued_at,
        valid_until: c.valid_until,
        workforce_group: c.workforce_group as WorkforceGroup,
      })));

    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleDownloadCertificate = (cert: Certificate) => {
    // Generate a simple certificate HTML and open in new window for printing
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Certificate - ${cert.certificate_number}</title>
        <style>
          body { font-family: Georgia, serif; text-align: center; padding: 40px; }
          .certificate { border: 4px double #2563eb; padding: 60px; max-width: 800px; margin: 0 auto; }
          h1 { color: #1e40af; margin-bottom: 10px; }
          .subtitle { color: #6b7280; font-size: 18px; margin-bottom: 40px; }
          .content { font-size: 16px; line-height: 1.8; }
          .cert-number { font-size: 12px; color: #9ca3af; margin-top: 40px; }
          .score { font-size: 24px; color: #059669; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="certificate">
          <h1>Certificate of Completion</h1>
          <p class="subtitle">HIPAA Compliance Training</p>
          <div class="content">
            <p>This certifies that the holder has successfully completed</p>
            <p><strong>${WORKFORCE_GROUP_LABELS[cert.workforce_group]} Training</strong></p>
            <p>with a score of</p>
            <p class="score">${cert.score}%</p>
            <p>Issued: ${format(new Date(cert.issued_at), 'MMMM d, yyyy')}</p>
            <p>Valid Until: ${format(new Date(cert.valid_until), 'MMMM d, yyyy')}</p>
          </div>
          <p class="cert-number">Certificate #: ${cert.certificate_number}</p>
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout userRole="workforce_user" userName="Employee">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="workforce_user" userName="Employee">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-6 w-6" />
            Training History
          </h1>
          <p className="text-muted-foreground">
            View your quiz attempts and earned certificates
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Attempts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quizAttempts.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Passed Quizzes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {quizAttempts.filter(a => a.passed).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Certificates Earned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">
                {certificates.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="attempts">
          <TabsList>
            <TabsTrigger value="attempts" className="gap-2">
              <FileText className="h-4 w-4" />
              Quiz Attempts
            </TabsTrigger>
            <TabsTrigger value="certificates" className="gap-2">
              <Award className="h-4 w-4" />
              Certificates
            </TabsTrigger>
          </TabsList>

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
                          {attempt.score}/{attempt.total_questions} ({Math.round((attempt.score / attempt.total_questions) * 100)}%)
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

          <TabsContent value="certificates" className="mt-4">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Certificate #</TableHead>
                    <TableHead>Workforce Group</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certificates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No certificates earned yet. Pass a quiz to earn your first certificate!
                      </TableCell>
                    </TableRow>
                  ) : (
                    certificates.map((cert) => (
                      <TableRow key={cert.id}>
                        <TableCell className="font-mono text-sm">
                          {cert.certificate_number}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {WORKFORCE_GROUP_LABELS[cert.workforce_group]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-success font-medium">{cert.score}%</span>
                        </TableCell>
                        <TableCell>
                          {format(new Date(cert.issued_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          {format(new Date(cert.valid_until), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadCertificate(cert)}
                            className="gap-1"
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </Button>
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
