import { DashboardLayout } from "@/components/DashboardLayout";
import { Clock, Mail, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PendingSetupPage() {
  return (
    <DashboardLayout userRole="workforce_user" userName="New User">
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="mx-auto max-w-md text-center space-y-6">
          {/* Icon */}
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-warning/10">
            <Clock className="h-10 w-10 text-warning" />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Account Setup Pending</h1>
            <p className="text-muted-foreground">
              Your administrator needs to assign your workforce group before you can begin compliance learning.
            </p>
          </div>

          {/* Info card */}
          <div className="rounded-xl border border-border bg-card p-6 text-left space-y-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-accent mt-0.5" />
              <div>
                <p className="font-medium">Why is this required?</p>
                <p className="text-sm text-muted-foreground">
                  HIPAA regulations require role-appropriate training. Your workforce group determines which training materials and quizzes are relevant to your job responsibilities.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-accent mt-0.5" />
              <div>
                <p className="font-medium">What should I do?</p>
                <p className="text-sm text-muted-foreground">
                  Contact your organization administrator to complete your account setup. They will assign you to the appropriate workforce group.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button variant="outline" className="gap-2">
              <Mail className="h-4 w-4" />
              Contact Administrator
            </Button>
            <Button variant="ghost" onClick={() => window.location.reload()}>
              Refresh Status
            </Button>
          </div>

          {/* Compliance Reference */}
          <p className="text-xs text-muted-foreground">
            Workforce members must receive learning appropriate to their job functions.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
