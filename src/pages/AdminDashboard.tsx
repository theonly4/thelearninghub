import { useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { WorkforceGroupBadge } from "@/components/WorkforceGroupBadge";
import { WorkforceAnalysisPanel } from "@/components/admin/WorkforceAnalysisPanel";
import { TrainingAssignmentDialog } from "@/components/admin/TrainingAssignmentDialog";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  BookOpen, 
  Award, 
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowRight,
  UserPlus,
  FileText
} from "lucide-react";
import { WorkforceGroup, WORKFORCE_GROUP_LABELS } from "@/types/hipaa";

// Mock data for demo
const stats = {
  totalUsers: 127,
  completedTraining: 89,
  pendingQuizzes: 38,
  complianceRate: 70,
  certificatesIssued: 156,
  riskAreasIdentified: 12,
  pendingAssignment: 5,
};

const recentActivity = [
  { user: "Sarah Johnson", action: "Completed Clinical Staff Quiz", time: "2 hours ago", status: "success" },
  { user: "Michael Chen", action: "Started IT Security Quiz", time: "3 hours ago", status: "pending" },
  { user: "Emily Davis", action: "Certificate Generated", time: "5 hours ago", status: "success" },
  { user: "James Wilson", action: "Quiz Expired", time: "1 day ago", status: "warning" },
  { user: "New User", action: "Awaiting Workforce Assignment", time: "Just now", status: "warning" },
];

const workforceBreakdown: { group: WorkforceGroup; count: number; compliance: number }[] = [
  { group: "all_staff", count: 127, compliance: 70 },
  { group: "clinical", count: 45, compliance: 82 },
  { group: "administrative", count: 32, compliance: 68 },
  { group: "management", count: 18, compliance: 78 },
  { group: "it", count: 12, compliance: 92 },
];

export default function AdminDashboard() {
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);

  return (
    <DashboardLayout userRole="org_admin" userName="Admin User">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Compliance Overview
            </h1>
            <p className="text-muted-foreground">
              Monitor workforce training status and compliance metrics
            </p>
          </div>
          <Button className="gap-2">
            <FileText className="h-4 w-4" />
            Generate Report
          </Button>
        </div>

        {/* Pending Assignments Alert */}
        {stats.pendingAssignment > 0 && (
          <Link to="/admin/users" className="block">
            <div className="rounded-xl border-2 border-warning/50 bg-warning/5 p-4 hover:bg-warning/10 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-warning/20 p-2">
                    <UserPlus className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="font-medium text-warning">
                      {stats.pendingAssignment} users awaiting workforce assignment
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Users cannot access training until assigned a workforce group
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  Assign Now
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Link>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Workforce"
            value={stats.totalUsers}
            subtitle="Active users"
            icon={Users}
          />
          <StatCard
            title="Compliance Rate"
            value={`${stats.complianceRate}%`}
            subtitle="Training completed"
            icon={TrendingUp}
            variant="success"
            trend={{ value: 5, isPositive: true }}
          />
          <StatCard
            title="Pending Quizzes"
            value={stats.pendingQuizzes}
            subtitle="Awaiting completion"
            icon={Clock}
            variant="warning"
          />
          <StatCard
            title="Risk Areas"
            value={stats.riskAreasIdentified}
            subtitle="Identified by AI"
            icon={AlertTriangle}
            variant="destructive"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Workforce Compliance */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border p-5">
                <h2 className="font-semibold">Compliance by Workforce Group</h2>
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  View Details
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
              <div className="p-5">
                <div className="space-y-4">
                  {workforceBreakdown.map((item) => (
                    <div key={item.group} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <WorkforceGroupBadge group={item.group} size="sm" />
                          <span className="text-sm text-muted-foreground">
                            {item.count} users
                          </span>
                        </div>
                        <span className="text-sm font-medium">
                          {item.compliance}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-accent transition-all duration-500"
                          style={{ width: `${item.compliance}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border p-5">
              <h2 className="font-semibold">Recent Activity</h2>
            </div>
            <div className="divide-y divide-border">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-4">
                  <div
                    className={`mt-0.5 rounded-full p-1.5 ${
                      activity.status === "success"
                        ? "bg-success/10 text-success"
                        : activity.status === "warning"
                        ? "bg-warning/10 text-warning"
                        : "bg-info/10 text-info"
                    }`}
                  >
                    {activity.status === "success" ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : activity.status === "warning" ? (
                      <AlertTriangle className="h-3 w-3" />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{activity.user}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.action}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Workforce Analysis */}
        <WorkforceAnalysisPanel />

        {/* Quick Actions */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 font-semibold">Quick Actions</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link to="/admin/users">
              <Button variant="outline" className="h-auto w-full flex-col gap-2 py-4">
                <Users className="h-5 w-5" />
                <span>Manage Users</span>
              </Button>
            </Link>
            <Button 
              variant="outline" 
              className="h-auto flex-col gap-2 py-4"
              onClick={() => setAssignmentDialogOpen(true)}
            >
              <BookOpen className="h-5 w-5" />
              <span>Assign Training</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4">
              <Award className="h-5 w-5" />
              <span>View Certificates</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4">
              <TrendingUp className="h-5 w-5" />
              <span>Export Report</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Training Assignment Dialog */}
      <TrainingAssignmentDialog
        open={assignmentDialogOpen}
        onOpenChange={setAssignmentDialogOpen}
        organizationId="demo-org"
        onSuccess={() => setAssignmentDialogOpen(false)}
      />
    </DashboardLayout>
  );
}
