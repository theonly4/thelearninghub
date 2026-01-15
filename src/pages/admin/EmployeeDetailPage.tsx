import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { format, isPast, differenceInDays } from "date-fns";
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
  Calendar,
  AlertCircle,
  Clock,
  KeyRound,
  Edit,
  Eye,
  Copy,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
} from "lucide-react";
import { WORKFORCE_GROUP_LABELS, WorkforceGroup } from "@/types/hipaa";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface EmployeeProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  workforce_groups: WorkforceGroup[];
  status: string;
  created_at: string;
  organization_id: string;
  organization_name?: string;
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
  answers: QuizAnswer[];
}

interface QuizAnswer {
  questionId?: string;
  question_text?: string;
  selected_answer?: string;
  correct_answer?: string;
  is_correct?: boolean;
  // Legacy fields for backward compatibility
  selectedOption?: string;
  isCorrect?: boolean;
}

interface Certificate {
  id: string;
  certificate_number: string;
  score: number;
  issued_at: string;
  valid_until: string;
  workforce_group: WorkforceGroup;
}

interface Assignment {
  id: string;
  workforce_group: WorkforceGroup;
  due_date: string;
  assigned_at: string;
  status: string;
  completed_at: string | null;
  notes: string | null;
  assigned_by_name?: string;
}

type ComplianceStatus = 'compliant' | 'at_risk' | 'non_compliant';

export default function EmployeeDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();
  const { isPlatformOwner, isOrgAdmin, role } = useUserRole();
  
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [completions, setCompletions] = useState<TrainingCompletion[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adminName, setAdminName] = useState("Admin");
  
  // Stats
  const [totalReleasedMaterials, setTotalReleasedMaterials] = useState(0);
  const [totalReleasedQuizzes, setTotalReleasedQuizzes] = useState(0);
  
  // Dialogs
  const [isEditWorkforceOpen, setIsEditWorkforceOpen] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<WorkforceGroup[]>([]);
  const [isUpdatingGroups, setIsUpdatingGroups] = useState(false);
  const [isCredentialsDialogOpen, setIsCredentialsDialogOpen] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<QuizAttempt | null>(null);

  useEffect(() => {
    if (userId) {
      fetchEmployeeData();
    }
  }, [userId]);

  async function fetchEmployeeData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current user profile
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
        setIsLoading(false);
        return;
      }

      // For org_admin, verify employee is in their org (platform owner can view all)
      if (!isPlatformOwner && adminProfile && empProfile.organization_id !== adminProfile.organization_id) {
        console.error("Employee not in admin's organization");
        setIsLoading(false);
        return;
      }

      // Fetch organization name for platform owner view
      let orgName = "";
      if (isPlatformOwner) {
        const { data: org } = await supabase
          .from("organizations")
          .select("name")
          .eq("id", empProfile.organization_id)
          .single();
        orgName = org?.name || "";
      }

      setEmployee({
        ...empProfile,
        workforce_groups: (empProfile.workforce_groups || []) as WorkforceGroup[],
        organization_name: orgName,
      });
      setSelectedGroups((empProfile.workforce_groups || []) as WorkforceGroup[]);

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

      // Fetch quiz attempts with answers
      const { data: attempts } = await supabase
        .from("quiz_attempts")
        .select("id, quiz_id, score, total_questions, passed, completed_at, workforce_group_at_time, answers")
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
            answers: (Array.isArray(a.answers) ? a.answers : []) as unknown as QuizAnswer[],
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

      // Fetch training assignments
      const { data: assignmentData } = await supabase
        .from("training_assignments")
        .select("*")
        .eq("assigned_to", userId)
        .order("due_date", { ascending: true });

      if (assignmentData) {
        setAssignments(
          assignmentData.map((a) => ({
            id: a.id,
            workforce_group: a.workforce_group as WorkforceGroup,
            due_date: a.due_date,
            assigned_at: a.assigned_at,
            status: a.status,
            completed_at: a.completed_at,
            notes: a.notes,
          }))
        );
      }

      // Fetch counts for completion percentages
      // Count unique released materials for this org
      const { data: contentReleases } = await supabase
        .from("content_releases")
        .select("content_id")
        .eq("organization_id", empProfile.organization_id)
        .eq("content_type", "training_material");
      
      setTotalReleasedMaterials(new Set(contentReleases?.map(r => r.content_id)).size);

      // Count released quiz packages
      const { data: packageReleases } = await supabase
        .from("package_releases")
        .select("package_id")
        .eq("organization_id", empProfile.organization_id);
      
      setTotalReleasedQuizzes(new Set(packageReleases?.map(r => r.package_id)).size);

    } catch (error) {
      console.error("Error fetching employee data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  // Calculate compliance status
  const calculateComplianceStatus = (): ComplianceStatus => {
    const now = new Date();
    
    // Check for overdue incomplete assignments
    const overdueAssignments = assignments.filter(a => 
      isPast(new Date(a.due_date)) && a.status !== 'completed'
    );
    
    if (overdueAssignments.length > 0) {
      return 'non_compliant';
    }
    
    // Check for upcoming due dates within 7 days
    const upcomingDue = assignments.filter(a => {
      const dueDate = new Date(a.due_date);
      const daysUntilDue = differenceInDays(dueDate, now);
      return daysUntilDue <= 7 && daysUntilDue > 0 && a.status !== 'completed';
    });
    
    if (upcomingDue.length > 0) {
      return 'at_risk';
    }
    
    return 'compliant';
  };

  const complianceStatus = calculateComplianceStatus();
  const overdueCount = assignments.filter(a => 
    isPast(new Date(a.due_date)) && a.status !== 'completed'
  ).length;

  // Calculate completion percentages
  const trainingPercent = totalReleasedMaterials > 0 
    ? Math.round((completions.length / totalReleasedMaterials) * 100) 
    : 0;
  const quizPassedCount = quizAttempts.filter(a => a.passed).length;
  const quizPercent = totalReleasedQuizzes > 0 
    ? Math.round((quizPassedCount / totalReleasedQuizzes) * 100) 
    : 0;

  const handleUpdateWorkforceGroups = async () => {
    if (!employee) return;
    
    setIsUpdatingGroups(true);
    try {
      const response = await supabase.functions.invoke('manage-employee', {
        body: {
          action: 'update_workforce_groups',
          employeeUserId: employee.user_id,
          workforceGroups: selectedGroups,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      toast({
        title: "Workforce groups updated",
        description: "Employee's workforce groups have been updated successfully.",
      });

      setEmployee({ ...employee, workforce_groups: selectedGroups });
      setIsEditWorkforceOpen(false);
    } catch (error: any) {
      toast({
        title: "Failed to update workforce groups",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingGroups(false);
    }
  };

  const handleResetPassword = async () => {
    if (!employee) return;
    
    setIsResettingPassword(true);
    try {
      const response = await supabase.functions.invoke('manage-employee', {
        body: {
          action: 'reset_password',
          employeeUserId: employee.user_id,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);

      setCredentials({
        email: employee.email,
        password: response.data.newPassword,
      });
      setIsCredentialsDialogOpen(true);
    } catch (error: any) {
      toast({
        title: "Failed to reset password",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

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

  const isOverdue = (assignment: Assignment) => 
    isPast(new Date(assignment.due_date)) && assignment.status !== 'completed';

  const getComplianceIcon = () => {
    switch (complianceStatus) {
      case 'compliant':
        return <ShieldCheck className="h-5 w-5" />;
      case 'at_risk':
        return <ShieldAlert className="h-5 w-5" />;
      case 'non_compliant':
        return <ShieldX className="h-5 w-5" />;
    }
  };

  const getComplianceBadge = () => {
    switch (complianceStatus) {
      case 'compliant':
        return <Badge className="bg-success/10 text-success border-success/30 gap-1">{getComplianceIcon()} Compliant</Badge>;
      case 'at_risk':
        return <Badge className="bg-warning/10 text-warning border-warning/30 gap-1">{getComplianceIcon()} At Risk</Badge>;
      case 'non_compliant':
        return <Badge variant="destructive" className="gap-1">{getComplianceIcon()} Non-Compliant</Badge>;
    }
  };

  // DashboardLayout only accepts org_admin or workforce_user, so we show org_admin layout for both admins and owners
  const dashboardRole = "org_admin";
  const backLink = isPlatformOwner ? "/platform/analytics" : "/admin/users";
  const backLabel = isPlatformOwner ? "Back to Analytics" : "Back to Users";

  if (isLoading) {
    return (
      <DashboardLayout userRole={dashboardRole} userName={adminName}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!employee) {
    return (
      <DashboardLayout userRole={dashboardRole} userName={adminName}>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Employee Not Found</h2>
          <p className="text-muted-foreground mb-4">The employee may not exist or you don't have permission to view them.</p>
          <Link to={backLink}>
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole={dashboardRole} userName={adminName}>
      <div className="space-y-6">
        {/* Back Link */}
        <Link to={backLink}>
          <Button variant="ghost" className="gap-2 mb-2">
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Button>
        </Link>

        {/* Employee Header */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                <User className="h-8 w-8 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-1">
                  <CardTitle className="text-2xl">
                    {employee.first_name} {employee.last_name}
                  </CardTitle>
                  {getComplianceBadge()}
                </div>
                <p className="text-muted-foreground">{employee.email}</p>
                {isPlatformOwner && employee.organization_name && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Organization: <span className="font-medium">{employee.organization_name}</span>
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  {employee.workforce_groups.length > 0 ? (
                    employee.workforce_groups.map((group) => (
                      <Badge key={group} variant="secondary">
                        {WORKFORCE_GROUP_LABELS[group]}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">No workforce groups assigned</Badge>
                  )}
                  <Badge variant={employee.status === "active" ? "default" : "outline"}>
                    {employee.status.replace("_", " ")}
                  </Badge>
                </div>
                
                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => setIsEditWorkforceOpen(true)} className="gap-1">
                    <Edit className="h-4 w-4" />
                    Edit Groups
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleResetPassword}
                    disabled={isResettingPassword}
                    className="gap-1"
                  >
                    {isResettingPassword ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <KeyRound className="h-4 w-4" />
                    )}
                    Reset Password
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Summary Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Training Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{trainingPercent}%</div>
              <Progress value={trainingPercent} className="mt-2 h-2" />
              <p className="text-xs text-muted-foreground mt-1">{completions.length} of {totalReleasedMaterials} completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Quiz Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quizPercent}%</div>
              <Progress value={quizPercent} className="mt-2 h-2" />
              <p className="text-xs text-muted-foreground mt-1">{quizPassedCount} of {totalReleasedQuizzes} passed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Assignments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignments.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {assignments.filter(a => a.status === 'completed').length} completed
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Overdue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", overdueCount > 0 && "text-destructive")}>{overdueCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {overdueCount === 0 ? "No overdue items" : "Need attention"}
              </p>
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
              <p className="text-xs text-muted-foreground mt-1">Earned certificates</p>
            </CardContent>
          </Card>
        </div>

        {/* Placeholder for untracked data */}
        <Card className="border-dashed">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Clock className="h-5 w-5" />
              <div>
                <p className="text-sm font-medium">Last Login: <span className="italic">Not tracked in current version</span></p>
                <p className="text-xs">Time spent on training and per-section progress are also not tracked in the current version.</p>
                {/* TODO: Future iteration - track last login via auth metadata or audit_logs */}
                {/* TODO: Future iteration - add time tracking to user_training_progress */}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Tabs */}
        <Tabs defaultValue="assignments">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="assignments" className="gap-2">
              <Calendar className="h-4 w-4" />
              Assignments
            </TabsTrigger>
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

          {/* Assignments Tab */}
          <TabsContent value="assignments" className="mt-4">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workforce Group</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No assignments yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    assignments.map((assignment) => (
                      <TableRow key={assignment.id} className={cn(isOverdue(assignment) && "bg-destructive/5")}>
                        <TableCell>
                          <Badge variant="outline">{WORKFORCE_GROUP_LABELS[assignment.workforce_group]}</Badge>
                        </TableCell>
                        <TableCell>{format(new Date(assignment.assigned_at), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {format(new Date(assignment.due_date), "MMM d, yyyy")}
                            {isOverdue(assignment) && (
                              <Badge variant="destructive" className="text-xs">Overdue</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {assignment.status === 'completed' ? (
                            <Badge className="bg-success/10 text-success border-success/30">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          ) : assignment.status === 'in_progress' ? (
                            <Badge variant="secondary">
                              <Clock className="h-3 w-3 mr-1" />
                              In Progress
                            </Badge>
                          ) : (
                            <Badge variant="outline">Assigned</Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">
                          {assignment.notes || "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Training History Tab */}
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
              <p className="text-xs text-muted-foreground p-4 border-t">
                * Section-level progress tracking not available in current version
              </p>
            </Card>
          </TabsContent>

          {/* Quiz Attempts Tab */}
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quizAttempts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setSelectedAttempt(attempt)}
                            className="gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            View Answers
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Certificates Tab */}
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

      {/* Edit Workforce Groups Dialog */}
      <Dialog open={isEditWorkforceOpen} onOpenChange={setIsEditWorkforceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Workforce Groups</DialogTitle>
            <DialogDescription>
              Select the workforce groups this employee belongs to.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {(Object.keys(WORKFORCE_GROUP_LABELS) as WorkforceGroup[]).map((group) => (
              <label key={group} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-muted/50">
                <Checkbox
                  checked={selectedGroups.includes(group)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedGroups([...selectedGroups, group]);
                    } else {
                      setSelectedGroups(selectedGroups.filter(g => g !== group));
                    }
                  }}
                />
                <span>{WORKFORCE_GROUP_LABELS[group]}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditWorkforceOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateWorkforceGroups} disabled={isUpdatingGroups}>
              {isUpdatingGroups ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials Dialog (after password reset) */}
      <Dialog open={isCredentialsDialogOpen} onOpenChange={setIsCredentialsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password Reset Complete</DialogTitle>
            <DialogDescription>
              Share these new credentials with the employee. They should change their password after logging in.
            </DialogDescription>
          </DialogHeader>
          {credentials && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <div className="flex gap-2">
                  <Input value={credentials.email} readOnly className="bg-muted" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(credentials.email)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <div className="flex gap-2">
                  <Input value={credentials.password} readOnly className="bg-muted font-mono" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(credentials.password)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm text-warning">
                ⚠️ Save these credentials now. The password cannot be retrieved later.
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => { setIsCredentialsDialogOpen(false); setCredentials(null); }}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quiz Answers Dialog */}
      <Dialog open={!!selectedAttempt} onOpenChange={() => setSelectedAttempt(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Quiz Answers - {selectedAttempt?.quiz_title}</DialogTitle>
            <DialogDescription>
              Completed on {selectedAttempt && format(new Date(selectedAttempt.completed_at), "MMMM d, yyyy 'at' h:mm a")}
              {" • "}Score: {selectedAttempt?.score}/{selectedAttempt?.total_questions}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedAttempt?.answers && selectedAttempt.answers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50%]">Question</TableHead>
                    <TableHead>Employee Answer</TableHead>
                    <TableHead>Correct Answer</TableHead>
                    <TableHead className="text-center">Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedAttempt.answers.map((answer, idx) => {
                    // Support both new and legacy field names
                    const selectedAnswer = answer.selected_answer || answer.selectedOption || '-';
                    const correctAnswer = answer.correct_answer || '-';
                    const isCorrect = answer.is_correct ?? answer.isCorrect ?? false;
                    
                    return (
                      <TableRow key={idx}>
                        <TableCell className="text-sm">
                          {answer.question_text || `Question ${idx + 1}`}
                        </TableCell>
                        <TableCell className={cn(
                          "text-sm font-medium",
                          !isCorrect && "text-destructive"
                        )}>
                          {selectedAnswer}
                        </TableCell>
                        <TableCell className="text-sm text-success font-medium">
                          {correctAnswer}
                        </TableCell>
                        <TableCell className="text-center">
                          {isCorrect ? (
                            <CheckCircle2 className="h-5 w-5 text-success mx-auto" />
                          ) : (
                            <XCircle className="h-5 w-5 text-destructive mx-auto" />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Detailed answer data is not available for this quiz attempt.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setSelectedAttempt(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
