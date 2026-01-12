import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ArrowLeft,
  User,
  BookOpen,
  FileText,
  Award,
  CheckCircle2,
  XCircle,
  Download,
  Loader2,
} from "lucide-react";
import { WORKFORCE_GROUP_LABELS, WorkforceGroup } from "@/types/hipaa";

interface EmployeeProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  workforce_groups: WorkforceGroup[];
  status: string;
  created_at: string;
}

interface TrainingCompletion {
  id: string;
  material_id: string;
  material_title: string;
  completed_at: string;
  version: number;
}

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

export default function EmployeeDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [completions, setCompletions] = useState<TrainingCompletion[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adminName, setAdminName] = useState("Admin");

  useEffect(() => {
    if (userId) {
      fetchEmployeeData();
    }
  }, [userId]);

  async function fetchEmployeeData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get admin name
      const { data: adminProfile } = await supabase
        .from("profiles")
        .select("first_name, last_name, organization_id")
        .eq("user_id", user.id)
        .single();

      if (adminProfile) {
        setAdminName(`${adminProfile.first_name} ${adminProfile.last_name}`);
      }

      // Fetch employee profile
      const { data: empProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (!empProfile) {
        console.error("Employee not found");
        return;
      }

      setEmployee({
        ...empProfile,
        workforce_groups: (empProfile.workforce_groups || []) as WorkforceGroup[],
      });

      // Fetch training completions
      const { data: progressData } = await supabase
        .from("user_training_progress")
        .select("id, material_id, completed_at, version_at_completion")
        .eq("user_id", userId)
        .order("completed_at", { ascending: false });

      if (progressData && progressData.length > 0) {
        const materialIds = progressData.map((p) => p.material_id);
        const { data: materials } = await supabase
          .from("training_materials")
          .select("id, title")
          .in("id", materialIds);

        const materialMap = new Map(materials?.map((m) => [m.id, m.title]) || []);

        setCompletions(
          progressData.map((p) => ({
            id: p.id,
            material_id: p.material_id,
            material_title: materialMap.get(p.material_id) || "Unknown Material",
            completed_at: p.completed_at,
            version: p.version_at_completion,
          }))
        );
      }

      // Fetch quiz attempts
      const { data: attempts } = await supabase
        .from("quiz_attempts")
        .select("id, quiz_id, score, total_questions, passed, completed_at, workforce_group_at_time")
        .eq("user_id", userId)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false });

      if (attempts && attempts.length > 0) {
        const quizIds = [...new Set(attempts.map((a) => a.quiz_id))];
        const { data: quizzes } = await supabase
          .from("quizzes")
          .select("id, title")
          .in("id", quizIds);

        const quizMap = new Map(quizzes?.map((q) => [q.id, q.title]) || []);

        setQuizAttempts(
          attempts.map((a) => ({
            id: a.id,
            quiz_id: a.quiz_id,
            quiz_title: quizMap.get(a.quiz_id) || "Unknown Quiz",
            score: a.score,
            total_questions: a.total_questions,
            passed: a.passed,
            completed_at: a.completed_at || "",
            workforce_group: a.workforce_group_at_time as WorkforceGroup,
          }))
        );
      }

      // Fetch certificates
      const { data: certs } = await supabase
        .from("certificates")
        .select("*")
        .eq("user_id", userId)
        .order("issued_at", { ascending: false });

      if (certs) {
        setCertificates(
          certs.map((c) => ({
            id: c.id,
            certificate_number: c.certificate_number,
            score: c.score,
            issued_at: c.issued_at,
            valid_until: c.valid_until,
            workforce_group: c.workforce_group as WorkforceGroup,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching employee data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleDownloadCertificate = (cert: Certificate) => {
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
            <p>This certifies that</p>
            <p><strong>${employee?.first_name} ${employee?.last_name}</strong></p>
            <p>has successfully completed</p>
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
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout userRole="org_admin" userName={adminName}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!employee) {
    return (
      <DashboardLayout userRole="org_admin" userName={adminName}>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Employee Not Found</h2>
          <Link to="/admin/users">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Users
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="org_admin" userName={adminName}>
      <div className="space-y-6">
        {/* Back Link */}
        <Link to="/admin/users">
          <Button variant="ghost" className="gap-2 mb-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Users
          </Button>
        </Link>

        {/* Employee Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center">
                <User className="h-8 w-8 text-accent" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">
                  {employee.first_name} {employee.last_name}
                </CardTitle>
                <p className="text-muted-foreground">{employee.email}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {employee.workforce_groups.map((group) => (
                    <Badge key={group} variant="secondary">
                      {WORKFORCE_GROUP_LABELS[group]}
                    </Badge>
                  ))}
                  <Badge variant={employee.status === "active" ? "default" : "outline"}>
                    {employee.status.replace("_", " ")}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Summary Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Training Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completions.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Quiz Attempts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quizAttempts.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Quizzes Passed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {quizAttempts.filter((a) => a.passed).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Award className="h-4 w-4" />
                Certificates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{certificates.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Tabs */}
        <Tabs defaultValue="completions">
          <TabsList>
            <TabsTrigger value="completions" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Training History
            </TabsTrigger>
            <TabsTrigger value="attempts" className="gap-2">
              <FileText className="h-4 w-4" />
              Quiz Attempts
            </TabsTrigger>
            <TabsTrigger value="certificates" className="gap-2">
              <Award className="h-4 w-4" />
              Certificates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="completions" className="mt-4">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Training Material</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        No training completions yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    completions.map((completion) => (
                      <TableRow key={completion.id}>
                        <TableCell className="font-medium">{completion.material_title}</TableCell>
                        <TableCell>v{completion.version}</TableCell>
                        <TableCell>{format(new Date(completion.completed_at), "MMM d, yyyy")}</TableCell>
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
                        <TableCell className="font-medium">{attempt.quiz_title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{WORKFORCE_GROUP_LABELS[attempt.workforce_group]}</Badge>
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
                        <TableCell>{format(new Date(attempt.completed_at), "MMM d, yyyy")}</TableCell>
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
                        No certificates earned yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    certificates.map((cert) => (
                      <TableRow key={cert.id}>
                        <TableCell className="font-mono text-sm">{cert.certificate_number}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{WORKFORCE_GROUP_LABELS[cert.workforce_group]}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-success font-medium">{cert.score}%</span>
                        </TableCell>
                        <TableCell>{format(new Date(cert.issued_at), "MMM d, yyyy")}</TableCell>
                        <TableCell>{format(new Date(cert.valid_until), "MMM d, yyyy")}</TableCell>
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
