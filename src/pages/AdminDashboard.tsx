import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { WorkforceGroupBadge } from "@/components/WorkforceGroupBadge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  UserPlus,
  FileText
} from "lucide-react";
import { WorkforceGroup, WORKFORCE_GROUP_LABELS } from "@/types/hipaa";

interface WorkforceBreakdown {
  group: WorkforceGroup;
  count: number;
  compliance: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    completedTraining: 0,
    pendingQuizzes: 0,
    complianceRate: 0,
    pendingAssignment: 0,
  });
  const [workforceBreakdown, setWorkforceBreakdown] = useState<WorkforceBreakdown[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      // Fetch employees in org
      const { data: employees } = await supabase
        .from('profiles')
        .select('id, user_id, workforce_groups, status')
        .eq('organization_id', profile.organization_id);

      const employeeList = employees || [];
      const totalUsers = employeeList.length;
      const pendingAssignment = employeeList.filter(e => e.status === 'pending_assignment').length;

      // Fetch training progress
      const { data: trainingProgress } = await supabase
        .from('user_training_progress')
        .select('user_id, material_id')
        .eq('organization_id', profile.organization_id);

      // Fetch quiz attempts
      const { data: quizAttempts } = await supabase
        .from('quiz_attempts')
        .select('user_id, passed, completed_at')
        .eq('organization_id', profile.organization_id);

      const completedQuizzes = quizAttempts?.filter(q => q.passed).length || 0;
      const pendingQuizzes = totalUsers - (new Set(quizAttempts?.filter(q => q.passed).map(q => q.user_id)).size);

      // Calculate compliance rate
      const usersWithProgress = new Set(trainingProgress?.map(p => p.user_id) || []);
      const usersWithPassedQuiz = new Set(quizAttempts?.filter(q => q.passed).map(q => q.user_id) || []);
      const complianceRate = totalUsers > 0 
        ? Math.round((usersWithPassedQuiz.size / totalUsers) * 100) 
        : 0;

      // Calculate workforce breakdown
      const groupCounts: Record<WorkforceGroup, { count: number; completed: number }> = {
        all_staff: { count: 0, completed: 0 },
        clinical: { count: 0, completed: 0 },
        administrative: { count: 0, completed: 0 },
        management: { count: 0, completed: 0 },
        it: { count: 0, completed: 0 },
      };

      employeeList.forEach(emp => {
        const groups = (emp.workforce_groups || []) as WorkforceGroup[];
        groups.forEach(g => {
          if (groupCounts[g]) {
            groupCounts[g].count++;
            if (usersWithPassedQuiz.has(emp.user_id)) {
              groupCounts[g].completed++;
            }
          }
        });
      });

      const breakdown: WorkforceBreakdown[] = Object.entries(groupCounts)
        .filter(([_, data]) => data.count > 0)
        .map(([group, data]) => ({
          group: group as WorkforceGroup,
          count: data.count,
          compliance: data.count > 0 ? Math.round((data.completed / data.count) * 100) : 0,
        }));

      setStats({
        totalUsers,
        completedTraining: usersWithProgress.size,
        pendingQuizzes,
        complianceRate,
        pendingAssignment,
      });

      setWorkforceBreakdown(breakdown.length > 0 ? breakdown : [
        { group: 'all_staff', count: totalUsers, compliance: complianceRate }
      ]);

      // Fetch recent audit logs for activity
      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (auditLogs && auditLogs.length > 0) {
        setRecentActivity(auditLogs.map(log => ({
          user: (log.metadata as any)?.employee_email || 'System',
          action: `${log.action} ${log.resource_type}`,
          time: new Date(log.created_at).toLocaleDateString(),
          status: log.action === 'delete' ? 'warning' : 'success',
        })));
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <DashboardLayout userRole="org_admin" userName="Admin User">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Dashboard
            </h1>
            <p className="text-muted-foreground">
              Monitor workforce training status and compliance metrics
            </p>
          </div>
          <Button className="gap-2" onClick={() => navigate('/admin/reports')}>
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

        {/* Stats Grid - 3 cards only */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          />
          <StatCard
            title="Pending Quizzes"
            value={stats.pendingQuizzes}
            subtitle="Awaiting completion"
            icon={Clock}
            variant="warning"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Workforce Compliance */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border p-5">
                <h2 className="font-semibold">Compliance by Workforce Group</h2>
                <Link to="/admin/reports">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs">
                    View Details
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
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
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
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
                ))
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No recent activity
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
