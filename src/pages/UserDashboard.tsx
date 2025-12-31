import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { WorkforceGroupBadge } from "@/components/WorkforceGroupBadge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  FileText, 
  Award, 
  Clock,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Play
} from "lucide-react";

// Mock data for demo
const userStats = {
  completedQuizzes: 3,
  pendingQuizzes: 2,
  certificates: 3,
  avgScore: 87,
};

const pendingQuizzes = [
  {
    id: "1",
    title: "All Staff HIPAA Fundamentals",
    workforceGroup: "all_staff" as const,
    dueDate: "Jan 15, 2025",
    estimatedTime: "45 min",
    questions: 25,
  },
  {
    id: "2",
    title: "Administrative Staff: Billing & Records",
    workforceGroup: "administrative" as const,
    dueDate: "Jan 20, 2025",
    estimatedTime: "30 min",
    questions: 20,
  },
];

const completedQuizzes = [
  {
    id: "3",
    title: "HIPAA Privacy Basics",
    workforceGroup: "all_staff" as const,
    completedDate: "Dec 15, 2024",
    score: 92,
  },
  {
    id: "4",
    title: "Data Security Essentials",
    workforceGroup: "all_staff" as const,
    completedDate: "Dec 10, 2024",
    score: 88,
  },
  {
    id: "5",
    title: "Patient Rights Overview",
    workforceGroup: "all_staff" as const,
    completedDate: "Nov 28, 2024",
    score: 84,
  },
];

const trainingModules = [
  {
    title: "PHI and the Minimum Necessary Rule",
    duration: "15 min",
    type: "Video",
  },
  {
    title: "Patient Rights: Access and Amendment",
    duration: "20 min",
    type: "Reading",
  },
  {
    title: "Breach Notification Requirements",
    duration: "25 min",
    type: "Interactive",
  },
];

export default function UserDashboard() {
  return (
    <DashboardLayout userRole="workforce_user" userName="Jane Smith">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, Jane
          </h1>
          <p className="text-muted-foreground">
            Continue your HIPAA compliance training
          </p>
        </div>

        {/* User Info Card */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Workforce Group:
              </span>
              <WorkforceGroupBadge group="administrative" />
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Organization:
              </span>
              <span className="text-sm font-medium">Demo Healthcare Inc.</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Completed Quizzes"
            value={userStats.completedQuizzes}
            icon={CheckCircle2}
            variant="success"
          />
          <StatCard
            title="Pending Quizzes"
            value={userStats.pendingQuizzes}
            icon={Clock}
            variant="warning"
          />
          <StatCard
            title="Certificates Earned"
            value={userStats.certificates}
            icon={Award}
            variant="info"
          />
          <StatCard
            title="Average Score"
            value={`${userStats.avgScore}%`}
            icon={FileText}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Pending Quizzes */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border p-5">
                <h2 className="font-semibold">Pending Quizzes</h2>
                <span className="rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning">
                  {userStats.pendingQuizzes} pending
                </span>
              </div>
              <div className="divide-y divide-border">
                {pendingQuizzes.map((quiz) => (
                  <div key={quiz.id} className="p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-2">
                        <h3 className="font-medium">{quiz.title}</h3>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <WorkforceGroupBadge
                            group={quiz.workforceGroup}
                            size="sm"
                          />
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {quiz.estimatedTime}
                          </span>
                          <span>{quiz.questions} questions</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Due: <span className="font-medium text-warning">{quiz.dueDate}</span>
                        </p>
                      </div>
                      <Link to={`/dashboard/quiz/${quiz.id}`}>
                        <Button className="gap-2">
                          <Play className="h-4 w-4" />
                          Start Quiz
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Completed Quizzes */}
            <div className="mt-6 rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border p-5">
                <h2 className="font-semibold">Completed Quizzes</h2>
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  View All
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
              <div className="divide-y divide-border">
                {completedQuizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    className="flex items-center justify-between p-5"
                  >
                    <div className="space-y-1">
                      <h3 className="font-medium">{quiz.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Completed {quiz.completedDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-bold text-success">
                          {quiz.score}%
                        </p>
                        <p className="text-xs text-muted-foreground">Score</p>
                      </div>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Training Materials */}
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border p-5">
              <h2 className="font-semibold">Training Materials</h2>
            </div>
            <div className="divide-y divide-border">
              {trainingModules.map((module, index) => (
                <div key={index} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-accent/10 p-2 text-accent">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <h3 className="text-sm font-medium">{module.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{module.duration}</span>
                        <span>•</span>
                        <span>{module.type}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border p-4">
              <Button variant="outline" className="w-full gap-2">
                <BookOpen className="h-4 w-4" />
                Browse All Materials
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
