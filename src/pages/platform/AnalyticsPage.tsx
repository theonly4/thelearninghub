import { useState, useEffect } from "react";
import { PlatformOwnerLayout } from "@/components/PlatformOwnerLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import jsPDF from "jspdf";
import Papa from "papaparse";
import {
  Building2,
  Users,
  BookOpen,
  ClipboardCheck,
  TrendingUp,
  Download,
  ChevronDown,
  Calendar,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";

interface OrgStats {
  id: string;
  name: string;
  slug: string;
  employeeCount: number;
  trainingCompletions: number;
  quizAttempts: number;
  passedQuizzes: number;
  complianceRate: number;
}

interface GlobalStats {
  totalOrgs: number;
  totalEmployees: number;
  totalTrainingCompletions: number;
  totalQuizAttempts: number;
  overallComplianceRate: number;
}

export default function AnalyticsPage() {
  const [orgStats, setOrgStats] = useState<OrgStats[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats>({
    totalOrgs: 0,
    totalEmployees: 0,
    totalTrainingCompletions: 0,
    totalQuizAttempts: 0,
    overallComplianceRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30");

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange, selectedOrg]);

  async function fetchAnalytics() {
    setLoading(true);
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = dateRange === "all" 
        ? new Date(2020, 0, 1) 
        : subDays(endDate, parseInt(dateRange));

      // Fetch all organizations (excluding platform-owner)
      const { data: orgs, error: orgsError } = await supabase
        .from("organizations")
        .select("id, name, slug")
        .neq("slug", "platform-owner");

      if (orgsError) throw orgsError;

      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, organization_id");

      if (profilesError) throw profilesError;

      // Fetch training progress within date range
      const { data: trainingProgress, error: trainingError } = await supabase
        .from("user_training_progress")
        .select("id, user_id, organization_id, completed_at")
        .gte("completed_at", startDate.toISOString())
        .lte("completed_at", endDate.toISOString());

      if (trainingError) throw trainingError;

      // Fetch quiz attempts within date range
      const { data: quizAttempts, error: quizError } = await supabase
        .from("quiz_attempts")
        .select("id, user_id, organization_id, passed, completed_at")
        .gte("started_at", startDate.toISOString())
        .lte("started_at", endDate.toISOString());

      if (quizError) throw quizError;

      // Calculate stats per organization
      const stats: OrgStats[] = (orgs || []).map(org => {
        const orgProfiles = profiles?.filter(p => p.organization_id === org.id) || [];
        const orgTraining = trainingProgress?.filter(t => t.organization_id === org.id) || [];
        const orgQuizzes = quizAttempts?.filter(q => q.organization_id === org.id) || [];
        const passedQuizzes = orgQuizzes.filter(q => q.passed).length;

        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          employeeCount: orgProfiles.length,
          trainingCompletions: orgTraining.length,
          quizAttempts: orgQuizzes.length,
          passedQuizzes,
          complianceRate: orgQuizzes.length > 0 
            ? Math.round((passedQuizzes / orgQuizzes.length) * 100) 
            : 0,
        };
      });

      // Apply org filter
      const filteredStats = selectedOrg === "all" 
        ? stats 
        : stats.filter(s => s.id === selectedOrg);

      setOrgStats(filteredStats);

      // Calculate global stats
      const totalEmployees = filteredStats.reduce((sum, s) => sum + s.employeeCount, 0);
      const totalTraining = filteredStats.reduce((sum, s) => sum + s.trainingCompletions, 0);
      const totalQuizzes = filteredStats.reduce((sum, s) => sum + s.quizAttempts, 0);
      const totalPassed = filteredStats.reduce((sum, s) => sum + s.passedQuizzes, 0);

      setGlobalStats({
        totalOrgs: filteredStats.length,
        totalEmployees,
        totalTrainingCompletions: totalTraining,
        totalQuizAttempts: totalQuizzes,
        overallComplianceRate: totalQuizzes > 0 
          ? Math.round((totalPassed / totalQuizzes) * 100) 
          : 0,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  function handleExportCSV() {
    const data = orgStats.map(org => ({
      "Organization": org.name,
      "Employees": org.employeeCount,
      "Training Completions": org.trainingCompletions,
      "Quiz Attempts": org.quizAttempts,
      "Quizzes Passed": org.passedQuizzes,
      "Compliance Rate": `${org.complianceRate}%`,
    }));

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `platform_analytics_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    toast.success("CSV exported successfully");
  }

  function handleExportPDF() {
    const doc = new jsPDF();
    const dateGenerated = format(new Date(), "MMMM d, yyyy");

    // Header
    doc.setFontSize(20);
    doc.setTextColor(0, 102, 204);
    doc.text("Platform Analytics Report", 20, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${dateGenerated}`, 20, 28);
    doc.text(`Date Range: Last ${dateRange} days`, 20, 34);

    // Global stats
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Summary", 20, 48);
    doc.setFontSize(10);
    doc.text(`Total Organizations: ${globalStats.totalOrgs}`, 25, 56);
    doc.text(`Total Employees: ${globalStats.totalEmployees}`, 25, 62);
    doc.text(`Training Completions: ${globalStats.totalTrainingCompletions}`, 25, 68);
    doc.text(`Quiz Attempts: ${globalStats.totalQuizAttempts}`, 25, 74);
    doc.text(`Overall Compliance Rate: ${globalStats.overallComplianceRate}%`, 25, 80);

    // Table
    let yPos = 95;
    doc.setFontSize(11);
    doc.text("Organization Breakdown", 20, yPos);
    yPos += 10;

    // Table header
    doc.setFillColor(245, 245, 245);
    doc.rect(15, yPos - 5, 180, 8, "F");
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.text("Organization", 17, yPos);
    doc.text("Employees", 80, yPos);
    doc.text("Training", 110, yPos);
    doc.text("Quizzes", 140, yPos);
    doc.text("Compliance", 170, yPos);
    doc.setFont(undefined, "normal");
    yPos += 8;

    orgStats.slice(0, 30).forEach(org => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(org.name.substring(0, 30), 17, yPos);
      doc.text(org.employeeCount.toString(), 80, yPos);
      doc.text(org.trainingCompletions.toString(), 110, yPos);
      doc.text(org.quizAttempts.toString(), 140, yPos);
      doc.text(`${org.complianceRate}%`, 170, yPos);
      yPos += 6;
    });

    doc.save(`platform_analytics_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("PDF exported successfully");
  }

  return (
    <PlatformOwnerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Platform Analytics</h1>
            <p className="text-muted-foreground">
              Global view of training and compliance across all organizations
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF}>
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedOrg} onValueChange={setSelectedOrg}>
            <SelectTrigger className="w-[220px]">
              <Building2 className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All organizations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Organizations</SelectItem>
              {orgStats.map(org => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Global Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Organizations</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{globalStats.totalOrgs}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{globalStats.totalEmployees}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Training Done</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{globalStats.totalTrainingCompletions}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quiz Attempts</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{globalStats.totalQuizAttempts}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-accent">{globalStats.overallComplianceRate}%</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Organizations Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Organization Breakdown
            </CardTitle>
            <CardDescription>
              Detailed statistics per organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead className="text-right">Employees</TableHead>
                    <TableHead className="text-right">Training Completions</TableHead>
                    <TableHead className="text-right">Quiz Attempts</TableHead>
                    <TableHead className="text-right">Passed</TableHead>
                    <TableHead className="text-right">Compliance Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgStats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No organizations found
                      </TableCell>
                    </TableRow>
                  ) : (
                    orgStats.map(org => (
                      <TableRow key={org.id}>
                        <TableCell className="font-medium">{org.name}</TableCell>
                        <TableCell className="text-right">{org.employeeCount}</TableCell>
                        <TableCell className="text-right">{org.trainingCompletions}</TableCell>
                        <TableCell className="text-right">{org.quizAttempts}</TableCell>
                        <TableCell className="text-right">{org.passedQuizzes}</TableCell>
                        <TableCell className="text-right">
                          <span className={
                            org.complianceRate >= 80 
                              ? "text-green-600 font-medium" 
                              : org.complianceRate >= 50 
                                ? "text-yellow-600 font-medium" 
                                : "text-red-600 font-medium"
                          }>
                            {org.complianceRate}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </PlatformOwnerLayout>
  );
}