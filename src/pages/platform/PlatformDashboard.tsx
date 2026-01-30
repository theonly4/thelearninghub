import { PlatformOwnerLayout } from "@/components/PlatformOwnerLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
import { 
  FileQuestion, 
  BookOpen, 
  Building2, 
  Users,
  TrendingUp,
  Clock,
  ArrowRight,
  CheckCircle2,
  Eye
} from "lucide-react";
import { Link } from "react-router-dom";

// Mock data for dashboard
const platformStats = {
  totalQuestions: 375,
  totalMaterials: 25,
  totalOrganizations: 12,
  totalUsers: 847,
  pendingReleases: 3,
  averageCompliance: 78,
};

const recentActivity = [
  { action: "Quiz updated", target: "Clinical Staff - Quiz 2", time: "2 hours ago", type: "update" },
  { action: "Content released", target: "Admin Training v2.1", time: "5 hours ago", type: "release" },
  { action: "Organization added", target: "Riverside Health", time: "1 day ago", type: "add" },
  { action: "Questions added", target: "15 new IT security questions", time: "2 days ago", type: "add" },
];

export default function PlatformDashboard() {
  return (
    <PlatformOwnerLayout userName="Admin">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Platform Overview</h2>
          <p className="text-muted-foreground">
            Manage your compliance learning content and organization deployments.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Questions"
            value={platformStats.totalQuestions}
            icon={FileQuestion}
            trend={{ value: 15, isPositive: true }}
          />
          <StatCard
            title="Learning Materials"
            value={platformStats.totalMaterials}
            icon={BookOpen}
          />
          <StatCard
            title="Organizations"
            value={platformStats.totalOrganizations}
            icon={Building2}
            trend={{ value: 2, isPositive: true }}
          />
          <StatCard
            title="Total Users"
            value={platformStats.totalUsers}
            icon={Users}
            trend={{ value: 8, isPositive: true }}
          />
        </div>

        {/* Quick Actions & Activity */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Quick Actions */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription>Common platform management tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full justify-between" variant="outline">
                <Link to="/platform/questions">
                  <span className="flex items-center gap-2">
                    <FileQuestion className="h-4 w-4" />
                    Manage Questions
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild className="w-full justify-between" variant="outline">
                <Link to="/platform/materials">
                  <span className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Edit Materials
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild className="w-full justify-between" variant="outline">
                <Link to="/platform/releases">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Release Content
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild className="w-full justify-between" variant="outline">
                <Link to="/platform/organizations">
                  <span className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    View Organizations
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild className="w-full justify-between bg-accent/10 border-accent/20 hover:bg-accent/20" variant="outline">
                <Link to="/employee/training">
                  <span className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-accent" />
                    Preview as Employee
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <CardDescription>Latest platform changes and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {activity.type === "update" ? (
                        <Clock className="h-4 w-4 text-info" />
                      ) : activity.type === "release" ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-accent" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-sm text-muted-foreground">{activity.target}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Distribution Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Content Distribution Summary</CardTitle>
            <CardDescription>
              Overview of content allocated across organizations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              {["All Staff", "Clinical", "Administrative", "Management", "IT"].map((group, index) => (
                <div key={group} className="rounded-lg border p-4 text-center">
                  <p className="text-sm font-medium text-muted-foreground">{group}</p>
                  <p className="text-2xl font-bold mt-1">{3}</p>
                  <p className="text-xs text-muted-foreground">quizzes</p>
                  <p className="text-lg font-semibold mt-2">{5}</p>
                  <p className="text-xs text-muted-foreground">materials</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PlatformOwnerLayout>
  );
}
