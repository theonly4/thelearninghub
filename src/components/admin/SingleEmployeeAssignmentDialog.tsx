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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format, addDays } from "date-fns";
import { CalendarIcon, Clock, BookOpen, FileText, Package, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WORKFORCE_GROUP_LABELS, type WorkforceGroup } from "@/types/hipaa";

interface SingleEmployeeAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: {
    user_id: string;
    first_name: string;
    last_name: string;
    workforce_groups: WorkforceGroup[];
  } | null;
  onSuccess?: () => void;
}

interface TrainingMaterial {
  id: string;
  title: string;
  estimated_minutes: number;
  workforce_groups: WorkforceGroup[];
}

interface ReleasedPackage {
  package_id: string;
  workforce_group: WorkforceGroup;
  training_year: number;
  package_name: string;
}

export function SingleEmployeeAssignmentDialog({
  open,
  onOpenChange,
  employee,
  onSuccess,
}: SingleEmployeeAssignmentDialogProps) {
  const [dueDate, setDueDate] = useState<Date | undefined>(addDays(new Date(), 30));
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
  const [releasedPackages, setReleasedPackages] = useState<ReleasedPackage[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [adminOrgId, setAdminOrgId] = useState<string | null>(null);

  useEffect(() => {
    if (open && employee) {
      fetchData();
    }
  }, [open, employee]);

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
      const { data: releasedContent } = await supabase
        .from("content_releases")
        .select("content_id")
        .eq("organization_id", profile.organization_id)
        .eq("content_type", "training_material");

      const releasedIds = releasedContent?.map(r => r.content_id) || [];

      // Fetch only released training materials
      if (releasedIds.length > 0) {
        const { data: materialsData } = await supabase
          .from("training_materials")
          .select("id, title, estimated_minutes, workforce_groups")
          .in("id", releasedIds)
          .order("sequence_number");

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
      const { data: packagesData } = await supabase
        .from("package_releases")
        .select(`
          package_id,
          workforce_group,
          training_year,
          question_packages (name)
        `)
        .eq("organization_id", profile.organization_id);

      setReleasedPackages(
        (packagesData || []).map((p: any) => ({
          package_id: p.package_id,
          workforce_group: p.workforce_group as WorkforceGroup,
          training_year: p.training_year,
          package_name: p.question_packages?.name || "Question Package",
        }))
      );
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load assignment data");
    } finally {
      setLoadingData(false);
    }
  }

  // Get materials for employee's workforce groups
  const employeeGroups = employee?.workforce_groups || [];
  const filteredMaterials = materials.filter((m) =>
    m.workforce_groups.some((g) => employeeGroups.includes(g))
  );

  // Get packages for employee's workforce groups
  const packagesForEmployee = releasedPackages.filter((p) =>
    employeeGroups.includes(p.workforce_group)
  );

  // Calculate total training time
  const totalMinutes = filteredMaterials.reduce(
    (sum, m) => sum + m.estimated_minutes,
    0
  );

  // Check if content is available
  const hasReleasedContent = filteredMaterials.length > 0 || packagesForEmployee.length > 0;

  async function handleAssign() {
    if (!dueDate || !employee) {
      toast.error("Please select a due date");
      return;
    }

    if (!hasReleasedContent) {
      toast.error("No content has been released for this employee's workforce groups");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (!adminOrgId) throw new Error("Organization not found");

      // Create assignment for each of the employee's workforce groups that has content
      const groupsWithContent = employeeGroups.filter((group) => {
        const hasMaterials = materials.some((m) => m.workforce_groups.includes(group));
        const hasPackage = releasedPackages.some((p) => p.workforce_group === group);
        return hasMaterials || hasPackage;
      });

      const assignments = groupsWithContent.map((group) => ({
        organization_id: adminOrgId,
        assigned_to: employee.user_id,
        assigned_by: user.id,
        workforce_group: group,
        due_date: dueDate.toISOString(),
        notes: notes || null,
        status: "assigned",
      }));

      if (assignments.length === 0) {
        toast.error("No assignments to create");
        return;
      }

      const { error } = await supabase
        .from("training_assignments")
        .insert(assignments);

      if (error) throw error;

      toast.success(
        `Training assigned to ${employee.first_name} ${employee.last_name}`
      );

      // Reset form
      setDueDate(addDays(new Date(), 30));
      setNotes("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error creating assignments:", error);
      toast.error("Failed to create training assignment");
    } finally {
      setLoading(false);
    }
  }

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Assign Training
          </DialogTitle>
          <DialogDescription>
            Assign training to {employee.first_name} {employee.last_name}
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5 py-4">
            {/* Employee Info */}
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="font-medium">{employee.first_name} {employee.last_name}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {employeeGroups.map((g) => (
                  <Badge key={g} variant="secondary" className="text-xs">
                    {WORKFORCE_GROUP_LABELS[g]}
                  </Badge>
                ))}
              </div>
            </div>

            {/* No Content Warning */}
            {!hasReleasedContent && (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                <div className="flex items-center gap-2 text-warning">
                  <AlertTriangle className="h-4 w-4" />
                  <p className="text-sm font-medium">No Content Released</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  No training materials or quiz packages have been released for this employee's workforce groups. Contact your platform administrator.
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
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Content Preview */}
            {hasReleasedContent && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                <h4 className="text-sm font-medium">Content to Assign</h4>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span><strong>{filteredMaterials.length}</strong> materials</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span><strong>{totalMinutes}</strong> min</span>
                  </div>
                  {packagesForEmployee.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span><strong>{packagesForEmployee.length}</strong> quiz{packagesForEmployee.length !== 1 ? "zes" : ""}</span>
                    </div>
                  )}
                </div>

                {filteredMaterials.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <div className="flex flex-wrap gap-1">
                      {filteredMaterials.slice(0, 5).map((m) => (
                        <Badge key={m.id} variant="secondary" className="text-xs">
                          {m.title}
                        </Badge>
                      ))}
                      {filteredMaterials.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{filteredMaterials.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={loading || !dueDate || !hasReleasedContent || loadingData}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign Training"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
