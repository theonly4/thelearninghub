import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format, addDays } from "date-fns";
import { CalendarIcon, Clock, BookOpen, FileText, Users, Package, AlertTriangle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WORKFORCE_GROUP_LABELS, type WorkforceGroup } from "@/types/hipaa";

interface TrainingAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId?: string;
  onSuccess?: () => void;
}

interface TrainingMaterial {
  id: string;
  title: string;
  estimated_minutes: number;
  workforce_groups: WorkforceGroup[];
}

interface Employee {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  workforce_groups: WorkforceGroup[];
}

interface ReleasedPackage {
  package_id: string;
  workforce_group: WorkforceGroup;
  training_year: number;
  package_name: string;
}

export function TrainingAssignmentDialog({
  open,
  onOpenChange,
  organizationId,
  onSuccess,
}: TrainingAssignmentDialogProps) {
  const [workforceGroup, setWorkforceGroup] = useState<WorkforceGroup | "">("");
  const [dueDate, setDueDate] = useState<Date | undefined>(addDays(new Date(), 30));
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [releasedPackages, setReleasedPackages] = useState<ReleasedPackage[]>([]);
  const [releasedMaterialIds, setReleasedMaterialIds] = useState<string[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [adminOrgId, setAdminOrgId] = useState<string | null>(null);
  const [excludeCompleted, setExcludeCompleted] = useState(true);
  const [completedUserIds, setCompletedUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  async function fetchData() {
    setLoadingData(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get admin's organization
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;
      setAdminOrgId(profile.organization_id);

      // Fetch released training material IDs for this org
      const { data: releasedContent, error: releasedError } = await supabase
        .from("content_releases")
        .select("content_id")
        .eq("organization_id", profile.organization_id)
        .eq("content_type", "training_material");

      if (releasedError) throw releasedError;
      
      const releasedIds = releasedContent?.map(r => r.content_id) || [];
      setReleasedMaterialIds(releasedIds);

      // Fetch only released training materials
      if (releasedIds.length > 0) {
        const { data: materialsData, error: materialsError } = await supabase
          .from("training_materials")
          .select("id, title, estimated_minutes, workforce_groups")
          .in("id", releasedIds)
          .order("sequence_number");

        if (materialsError) throw materialsError;
        setMaterials(
          (materialsData || []).map((m) => ({
            ...m,
            workforce_groups: m.workforce_groups as WorkforceGroup[],
          }))
        );
      } else {
        setMaterials([]);
      }

      // Fetch released packages for this org
      const { data: packagesData, error: packagesError } = await supabase
        .from("package_releases")
        .select(`
          package_id,
          workforce_group,
          training_year,
          question_packages (name)
        `)
        .eq("organization_id", profile.organization_id);

      if (packagesError) throw packagesError;
      
      setReleasedPackages(
        (packagesData || []).map((p: any) => ({
          package_id: p.package_id,
          workforce_group: p.workforce_group as WorkforceGroup,
          training_year: p.training_year,
          package_name: p.question_packages?.name || "Question Package",
        }))
      );

      // Fetch employees in organization
      const { data: employeesData, error: employeesError } = await supabase
        .from("profiles")
        .select("id, user_id, first_name, last_name, email, workforce_groups")
        .eq("organization_id", profile.organization_id);

      if (employeesError) throw employeesError;
      setEmployees(
        (employeesData || []).map((e) => ({
          ...e,
          workforce_groups: (e.workforce_groups || []) as WorkforceGroup[],
        }))
      );

      // Fetch users who already have completed assignments
      const { data: completedAssignments } = await supabase
        .from("training_assignments")
        .select("assigned_to")
        .eq("organization_id", profile.organization_id)
        .eq("status", "completed");

      const completedIds = [...new Set(completedAssignments?.map(a => a.assigned_to) || [])];
      setCompletedUserIds(completedIds);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load assignment data");
    } finally {
      setLoadingData(false);
    }
  }

  // Filter materials for selected workforce group
  const filteredMaterials = workforceGroup
    ? materials.filter((m) => m.workforce_groups.includes(workforceGroup))
    : [];

  // Filter employees in selected workforce group
  const filteredEmployees = workforceGroup
    ? employees.filter((e) => e.workforce_groups.includes(workforceGroup))
    : [];

  // Apply exclusion filter for completed employees
  const employeesToAssign = excludeCompleted
    ? filteredEmployees.filter(emp => !completedUserIds.includes(emp.user_id))
    : filteredEmployees;
  const excludedCount = filteredEmployees.length - employeesToAssign.length;

  // Get released package for this workforce group
  const packageForGroup = workforceGroup
    ? releasedPackages.find((p) => p.workforce_group === workforceGroup)
    : null;

  // Calculate total training time
  const totalMinutes = filteredMaterials.reduce(
    (sum, m) => sum + m.estimated_minutes,
    0
  );

  // Check if content is available
  const hasReleasedContent = filteredMaterials.length > 0 || packageForGroup;

  async function handleAssign() {
    if (!workforceGroup || !dueDate) {
      toast.error("Please select a workforce group and due date");
      return;
    }

    if (employeesToAssign.length === 0) {
      toast.error("No employees to assign (all may have already completed)");
      return;
    }

    if (!hasReleasedContent) {
      toast.error("No content has been released for this workforce group");
      return;
    }

    setLoading(true);
    try {
      // Get current user for assigned_by
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (!adminOrgId) throw new Error("Organization not found");

      // Create assignment for each employee (excluding completed)
      const assignments = employeesToAssign.map((emp) => ({
        organization_id: adminOrgId,
        assigned_to: emp.user_id,
        assigned_by: user.id,
        workforce_group: workforceGroup,
        due_date: dueDate.toISOString(),
        notes: notes || null,
        status: "assigned",
      }));

      const { error } = await supabase
        .from("training_assignments")
        .insert(assignments);

      if (error) throw error;

      toast.success(
        `Training assigned to ${employeesToAssign.length} employee${employeesToAssign.length > 1 ? "s" : ""}`
      );

      // Send email notifications to all assigned employees (in background) - requires authentication
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.access_token) return;
        
        employeesToAssign.forEach((emp) => {
          fetch(`${supabaseUrl}/functions/v1/send-assignment-email`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              employeeName: `${emp.first_name} ${emp.last_name}`,
              employeeEmail: emp.email,
              dueDate: dueDate.toISOString(),
              assignedMaterials: filteredMaterials.map(m => m.title),
              assignedPackages: packageForGroup ? [packageForGroup.package_name] : [],
              totalMinutes,
              loginUrl: window.location.origin + '/login',
            }),
          }).catch((emailError) => {
            console.error('Failed to send email to', emp.email, emailError);
          });
        });
      });
      
      // Reset form
      setWorkforceGroup("");
      setDueDate(addDays(new Date(), 30));
      setNotes("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error creating assignments:", error);
      toast.error("Failed to create training assignments");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Assign Learning
          </DialogTitle>
          <DialogDescription>
            Assign released learning materials and quizzes to a workforce group.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Workforce Group Selection */}
          <div className="space-y-2">
            <Label htmlFor="workforce_group">Workforce Group</Label>
            <Select
              value={workforceGroup}
              onValueChange={(value) => setWorkforceGroup(value as WorkforceGroup)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select workforce group" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(WORKFORCE_GROUP_LABELS) as WorkforceGroup[]).map(
                  (group) => (
                    <SelectItem key={group} value={group}>
                      {WORKFORCE_GROUP_LABELS[group]}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          {/* No Content Warning */}
          {workforceGroup && !hasReleasedContent && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-sm font-medium">No Content Released</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                No learning materials or quiz packages have been released for this workforce group. Contact your platform administrator.
              </p>
            </div>
          )}

          {/* Due Date Selection */}
          <div className="space-y-2">
            <Label>Completion Deadline</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Select deadline"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Employees must complete all materials and quizzes by this date.
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any instructions or context for employees..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Smart Exclusion Toggle */}
          {workforceGroup && filteredEmployees.length > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="excludeCompleted"
                  checked={excludeCompleted}
                  onCheckedChange={(checked) => setExcludeCompleted(!!checked)}
                />
                <Label htmlFor="excludeCompleted" className="text-sm cursor-pointer">
                  Exclude employees who already completed
                </Label>
              </div>
              {excludedCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {excludedCount} excluded
                </Badge>
              )}
            </div>
          )}

          {/* Assignment Preview */}
          {workforceGroup && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <h4 className="text-sm font-medium">Assignment Preview</h4>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    <strong>{employeesToAssign.length}</strong> of {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? "s" : ""}
                    {excludedCount > 0 && <span className="text-muted-foreground"> ({excludedCount} completed)</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>
                    <strong>{filteredMaterials.length}</strong> material
                    {filteredMaterials.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    <strong>{totalMinutes}</strong> min estimated
                  </span>
                </div>
                {packageForGroup && (
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs">1 quiz package</span>
                  </div>
                )}
              </div>

              {filteredMaterials.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">
                    Learning Materials:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {filteredMaterials.map((m) => (
                      <Badge key={m.id} variant="secondary" className="text-xs">
                        {m.title}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {packageForGroup && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">
                    Quiz Package:
                  </p>
                  <Badge variant="outline" className="text-xs">
                    <Package className="h-3 w-3 mr-1" />
                    {packageForGroup.package_name} ({packageForGroup.training_year})
                  </Badge>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={
              loading || 
              !workforceGroup || 
              !dueDate || 
              employeesToAssign.length === 0 ||
              !hasReleasedContent
            }
          >
            {loading ? "Assigning..." : "Assign Learning"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
