import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkforceGroupBadge } from "@/components/WorkforceGroupBadge";
import { WORKFORCE_GROUP_LABELS, type WorkforceGroup } from "@/types/hipaa";
import { format } from "date-fns";
import jsPDF from "jspdf";
import Papa from "papaparse";
import {
  FileText,
  Printer,
  Search,
  BookOpen,
  ClipboardCheck,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Download,
  FileDown,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

interface TrainingCompletion {
  id: string;
  userName: string;
  email: string;
  workforceGroups: WorkforceGroup[];
  materialTitle: string;
  completedAt: string;
  version: number;
}

interface QuizCompletion {
  id: string;
  userName: string;
  email: string;
  workforceGroups: WorkforceGroup[];
  quizTitle: string;
  score: number;
  totalQuestions: number;
  passed: boolean;
  startedAt: string;
  completedAt: string | null;
}

export default function ReportsPage() {
  const { fullName } = useUserProfile();
  const [trainingCompletions, setTrainingCompletions] = useState<TrainingCompletion[]>([]);
  const [quizCompletions, setQuizCompletions] = useState<QuizCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("training");
  const [organizationName, setOrganizationName] = useState<string>("");
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchReportData();
  }, []);

  async function fetchReportData() {
    setLoading(true);
    try {
      // Fetch current user's organization name
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("user_id", user.id)
          .single();
        
        if (profile) {
          const { data: org } = await supabase
            .from("organizations")
            .select("name")
            .eq("id", profile.organization_id)
            .single();
          
          if (org) {
            setOrganizationName(org.name);
          }
        }
      }

      // Fetch training progress with profiles and materials
      const { data: trainingData, error: trainingError } = await supabase
        .from("user_training_progress")
        .select(`
          id,
          completed_at,
          version_at_completion,
          user_id,
          material_id
        `)
        .order("completed_at", { ascending: false });

      if (trainingError) throw trainingError;

      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, email, workforce_groups");

      if (profilesError) throw profilesError;

      // Fetch materials
      const { data: materials, error: materialsError } = await supabase
        .from("training_materials")
        .select("id, title");

      if (materialsError) throw materialsError;

      // Create lookup maps
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const materialMap = new Map(materials?.map(m => [m.id, m]) || []);

      // Map training completions
      const mappedTraining: TrainingCompletion[] = (trainingData || []).map(t => {
        const profile = profileMap.get(t.user_id);
        const material = materialMap.get(t.material_id);
        return {
          id: t.id,
          userName: profile ? `${profile.first_name} ${profile.last_name}` : "Unknown",
          email: profile?.email || "",
          workforceGroups: (profile?.workforce_groups || []) as WorkforceGroup[],
          materialTitle: material?.title || "Unknown Material",
          completedAt: t.completed_at,
          version: t.version_at_completion,
        };
      });

      setTrainingCompletions(mappedTraining);

      // Fetch quiz attempts
      const { data: quizData, error: quizError } = await supabase
        .from("quiz_attempts")
        .select(`
          id,
          user_id,
          quiz_id,
          score,
          total_questions,
          passed,
          started_at,
          completed_at
        `)
        .order("started_at", { ascending: false });

      if (quizError) throw quizError;

      // Fetch quizzes
      const { data: quizzes, error: quizzesError } = await supabase
        .from("quizzes")
        .select("id, title");

      if (quizzesError) throw quizzesError;

      const quizMap = new Map(quizzes?.map(q => [q.id, q]) || []);

      // Map quiz completions
      const mappedQuiz: QuizCompletion[] = (quizData || []).map(q => {
        const profile = profileMap.get(q.user_id);
        const quiz = quizMap.get(q.quiz_id);
        return {
          id: q.id,
          userName: profile ? `${profile.first_name} ${profile.last_name}` : "Unknown",
          email: profile?.email || "",
          workforceGroups: (profile?.workforce_groups || []) as WorkforceGroup[],
          quizTitle: quiz?.title || "Unknown Quiz",
          score: q.score,
          totalQuestions: q.total_questions,
          passed: q.passed,
          startedAt: q.started_at,
          completedAt: q.completed_at,
        };
      });

      setQuizCompletions(mappedQuiz);
    } catch (error) {
      console.error("Error fetching report data:", error);
      toast.error("Failed to load report data");
    } finally {
      setLoading(false);
    }
  }

  // Filter functions
  const filteredTraining = trainingCompletions.filter(t => {
    const matchesSearch = 
      t.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.materialTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = filterGroup === "all" || t.workforceGroups.includes(filterGroup as WorkforceGroup);
    return matchesSearch && matchesGroup;
  });

  const filteredQuiz = quizCompletions.filter(q => {
    const matchesSearch = 
      q.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.quizTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = filterGroup === "all" || q.workforceGroups.includes(filterGroup as WorkforceGroup);
    return matchesSearch && matchesGroup;
  });

  // HTML escape function to prevent XSS attacks
  function escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Print functionality
  function handlePrint() {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to print the report");
      return;
    }

    const title = activeTab === "training" ? "Training Materials Completion Report" : "Quiz Completion Report";
    const dateGenerated = format(new Date(), "MMMM d, yyyy 'at' h:mm a");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - HIPAA Training</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 40px;
              color: #1a1a1a;
            }
            .header { margin-bottom: 30px; border-bottom: 2px solid #0066cc; padding-bottom: 20px; }
            .header .org-name { font-size: 16px; font-weight: 600; color: #333; margin-bottom: 5px; }
            .header h1 { font-size: 24px; color: #0066cc; margin-bottom: 5px; }
            .header p { color: #666; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { 
              background: #f5f5f5; 
              padding: 12px 8px; 
              text-align: left; 
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border-bottom: 2px solid #ddd;
            }
            td { 
              padding: 10px 8px; 
              border-bottom: 1px solid #eee; 
              font-size: 12px;
            }
            tr:nth-child(even) { background: #fafafa; }
            .badge { 
              display: inline-block; 
              padding: 2px 8px; 
              border-radius: 4px; 
              font-size: 10px;
              font-weight: 500;
            }
            .badge-pass { background: #dcfce7; color: #166534; }
            .badge-fail { background: #fee2e2; color: #991b1b; }
            .badge-group { background: #e0e7ff; color: #3730a3; }
            .badge-complete { background: #dcfce7; color: #166534; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 10px; color: #666; }
            @media print {
              body { padding: 20px; }
              .header { page-break-after: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${organizationName ? `<div class="org-name">${escapeHtml(organizationName)}</div>` : ""}
            <h1>${title}</h1>
            <p>Generated on ${dateGenerated}</p>
            ${filterGroup !== "all" ? `<p>Filtered by: ${WORKFORCE_GROUP_LABELS[filterGroup as WorkforceGroup]}</p>` : ""}
          </div>
          ${activeTab === "training" ? generateTrainingTable() : generateQuizTable()}
          <div class="footer">
            <p>This report is generated for HIPAA compliance record-keeping purposes.</p>
            <p>Total Records: ${activeTab === "training" ? filteredTraining.length : filteredQuiz.length}</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }

  function generateTrainingTable() {
    const rows = filteredTraining.map(t => `
      <tr>
        <td>${escapeHtml(t.userName)}</td>
        <td>${escapeHtml(t.email)}</td>
        <td><span class="badge badge-group">${escapeHtml(t.workforceGroups.map(g => WORKFORCE_GROUP_LABELS[g]).join(", ") || "Unassigned")}</span></td>
        <td>${escapeHtml(t.materialTitle)}</td>
        <td><span class="badge badge-complete">Complete</span></td>
        <td>${escapeHtml(format(new Date(t.completedAt), "MMM d, yyyy 'at' h:mm a"))}</td>
      </tr>
    `).join("");

    return `
      <table>
        <thead>
          <tr>
            <th>Employee Name</th>
            <th>Email</th>
            <th>Workforce Group</th>
            <th>Training Material</th>
            <th>Status</th>
            <th>Completed Date/Time</th>
          </tr>
        </thead>
        <tbody>
          ${rows || "<tr><td colspan='6' style='text-align: center; padding: 20px;'>No training completions found</td></tr>"}
        </tbody>
      </table>
    `;
  }

  // Helper to format quiz score correctly (score is stored as percentage in DB)
  function formatQuizScore(score: number, totalQuestions: number): string {
    // Score is stored as percentage (0-100), not raw count
    return `${score}%`;
  }

  function generateQuizTable() {
    const rows = filteredQuiz.map(q => `
      <tr>
        <td>${escapeHtml(q.userName)}</td>
        <td>${escapeHtml(q.email)}</td>
        <td><span class="badge badge-group">${escapeHtml(q.workforceGroups.map(g => WORKFORCE_GROUP_LABELS[g]).join(", ") || "Unassigned")}</span></td>
        <td>${escapeHtml(q.quizTitle)}</td>
        <td>${formatQuizScore(q.score, q.totalQuestions)}</td>
        <td><span class="badge ${q.passed ? "badge-pass" : "badge-fail"}">${q.passed ? "PASSED" : "FAILED"}</span></td>
        <td>${escapeHtml(q.completedAt ? format(new Date(q.completedAt), "MMM d, yyyy 'at' h:mm a") : "In Progress")}</td>
      </tr>
    `).join("");

    return `
      <table>
        <thead>
          <tr>
            <th>Employee Name</th>
            <th>Email</th>
            <th>Workforce Group</th>
            <th>Quiz</th>
            <th>Score</th>
            <th>Status</th>
            <th>Completed Date/Time</th>
          </tr>
        </thead>
        <tbody>
          ${rows || "<tr><td colspan='7' style='text-align: center; padding: 20px;'>No quiz attempts found</td></tr>"}
        </tbody>
      </table>
    `;
  }

  // Export to CSV
  function handleExportCSV() {
    let csv: string;
    let fileName: string;
    
    if (activeTab === "training") {
      const data = filteredTraining.map(t => ({
        "Employee Name": t.userName,
        "Email": t.email,
        "Workforce Group": t.workforceGroups.map(g => WORKFORCE_GROUP_LABELS[g]).join(", "),
        "Training Material": t.materialTitle,
        "Completed At": format(new Date(t.completedAt), "yyyy-MM-dd HH:mm:ss"),
        "Version": t.version,
      }));
      csv = Papa.unparse(data);
      fileName = `training_report_${format(new Date(), "yyyy-MM-dd")}.csv`;
    } else {
      const data = filteredQuiz.map(q => ({
        "Employee Name": q.userName,
        "Email": q.email,
        "Workforce Group": q.workforceGroups.map(g => WORKFORCE_GROUP_LABELS[g]).join(", "),
        "Quiz Title": q.quizTitle,
        "Score": `${q.score}%`,
        "Result": q.passed ? "PASSED" : "FAILED",
        "Completed At": q.completedAt ? format(new Date(q.completedAt), "yyyy-MM-dd HH:mm:ss") : "In Progress",
      }));
      csv = Papa.unparse(data);
      fileName = `quiz_report_${format(new Date(), "yyyy-MM-dd")}.csv`;
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    toast.success("CSV exported successfully");
  }

  // Export to PDF
  function handleExportPDF() {
    const doc = new jsPDF();
    const title = activeTab === "training" ? "Training Completion Report" : "Quiz Completion Report";
    const dateGenerated = format(new Date(), "MMMM d, yyyy");

    // Header
    doc.setFontSize(20);
    doc.setTextColor(0, 102, 204);
    doc.text(title, 20, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${dateGenerated}`, 20, 28);
    if (filterGroup !== "all") {
      doc.text(`Filtered by: ${WORKFORCE_GROUP_LABELS[filterGroup as WorkforceGroup]}`, 20, 34);
    }

    let yPos = 45;
    doc.setFontSize(9);
    doc.setTextColor(0);

    if (activeTab === "training") {
      // Table header
      doc.setFillColor(245, 245, 245);
      doc.rect(15, yPos - 5, 180, 8, "F");
      doc.setFont(undefined, "bold");
      doc.text("Employee", 17, yPos);
      doc.text("Material", 70, yPos);
      doc.text("Completed", 150, yPos);
      doc.setFont(undefined, "normal");
      yPos += 8;

      filteredTraining.slice(0, 40).forEach(t => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(t.userName.substring(0, 25), 17, yPos);
        doc.text(t.materialTitle.substring(0, 40), 70, yPos);
        doc.text(format(new Date(t.completedAt), "MMM d, yyyy"), 150, yPos);
        yPos += 6;
      });
    } else {
      // Quiz table header
      doc.setFillColor(245, 245, 245);
      doc.rect(15, yPos - 5, 180, 8, "F");
      doc.setFont(undefined, "bold");
      doc.text("Employee", 17, yPos);
      doc.text("Quiz", 55, yPos);
      doc.text("Score", 110, yPos);
      doc.text("Result", 135, yPos);
      doc.text("Date", 160, yPos);
      doc.setFont(undefined, "normal");
      yPos += 8;

      filteredQuiz.slice(0, 40).forEach(q => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(q.userName.substring(0, 18), 17, yPos);
        doc.text(q.quizTitle.substring(0, 25), 55, yPos);
        doc.text(`${q.score}%`, 110, yPos);
        doc.setTextColor(q.passed ? 0 : 150, q.passed ? 128 : 0, 0);
        doc.text(q.passed ? "PASS" : "FAIL", 135, yPos);
        doc.setTextColor(0);
        doc.text(q.completedAt ? format(new Date(q.completedAt), "MMM d") : "-", 160, yPos);
        yPos += 6;
      });
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Total Records: ${activeTab === "training" ? filteredTraining.length : filteredQuiz.length}`, 20, 285);

    const fileName = `${activeTab === "training" ? "training" : "quiz"}_report_${format(new Date(), "yyyy-MM-dd")}.pdf`;
    doc.save(fileName);
    toast.success("PDF exported successfully");
  }

  return (
    <DashboardLayout userRole="org_admin" userName={fullName || "Admin"}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Training Reports</h1>
            <p className="text-muted-foreground">
              View employee training and quiz completion records
            </p>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <FileDown className="h-4 w-4" />
                  Export
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Training Completions</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{trainingCompletions.length}</div>
              <p className="text-xs text-muted-foreground">Total completions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Quiz Attempts</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{quizCompletions.length}</div>
              <p className="text-xs text-muted-foreground">Total attempts</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Passed Quizzes</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {quizCompletions.filter(q => q.passed).length}
              </div>
              <p className="text-xs text-muted-foreground">
                {quizCompletions.length > 0 
                  ? `${Math.round((quizCompletions.filter(q => q.passed).length / quizCompletions.length) * 100)}% pass rate`
                  : "No data"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Failed Quizzes</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {quizCompletions.filter(q => !q.passed).length}
              </div>
              <p className="text-xs text-muted-foreground">Require retake</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterGroup} onValueChange={setFilterGroup}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filter by group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Workforce Groups</SelectItem>
                  {(Object.keys(WORKFORCE_GROUP_LABELS) as WorkforceGroup[]).map(group => (
                    <SelectItem key={group} value={group}>
                      {WORKFORCE_GROUP_LABELS[group]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Data Tables */}
        <div ref={printRef}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="training" className="gap-2">
                <BookOpen className="h-4 w-4" />
                Training Materials
              </TabsTrigger>
              <TabsTrigger value="quizzes" className="gap-2">
                <ClipboardCheck className="h-4 w-4" />
                Quiz Results
              </TabsTrigger>
            </TabsList>

            <TabsContent value="training" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Training Material Completions
                  </CardTitle>
                  <CardDescription>
                    Record of all training materials completed by employees
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Workforce Group</TableHead>
                            <TableHead>Training Material</TableHead>
                            <TableHead>Completed</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredTraining.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                No training completions found
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredTraining.map((t) => (
                              <TableRow key={t.id}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{t.userName}</p>
                                    <p className="text-sm text-muted-foreground">{t.email}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {t.workforceGroups.length > 0 ? (
                                      t.workforceGroups.map(g => (
                                        <WorkforceGroupBadge key={g} group={g} size="sm" />
                                      ))
                                    ) : (
                                      <Badge variant="secondary">Unassigned</Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    {t.materialTitle}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2 text-sm">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    {format(new Date(t.completedAt), "MMM d, yyyy")}
                                    <span className="text-muted-foreground">
                                      {format(new Date(t.completedAt), "h:mm a")}
                                    </span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quizzes" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5" />
                    Quiz Completion Results
                  </CardTitle>
                  <CardDescription>
                    Record of all quiz attempts and scores
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Employee</TableHead>
                            <TableHead>Workforce Group</TableHead>
                            <TableHead>Quiz</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Completed</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredQuiz.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                No quiz attempts found
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredQuiz.map((q) => (
                              <TableRow key={q.id}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{q.userName}</p>
                                    <p className="text-sm text-muted-foreground">{q.email}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {q.workforceGroups.length > 0 ? (
                                      q.workforceGroups.map(g => (
                                        <WorkforceGroupBadge key={g} group={g} size="sm" />
                                      ))
                                    ) : (
                                      <Badge variant="secondary">Unassigned</Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                                    {q.quizTitle}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="font-medium">
                                    {q.score}%
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {q.passed ? (
                                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
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
                                  {q.completedAt ? (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Calendar className="h-4 w-4 text-muted-foreground" />
                                      {format(new Date(q.completedAt), "MMM d, yyyy")}
                                      <span className="text-muted-foreground">
                                        {format(new Date(q.completedAt), "h:mm a")}
                                      </span>
                                    </div>
                                  ) : (
                                    <Badge variant="secondary">In Progress</Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}
