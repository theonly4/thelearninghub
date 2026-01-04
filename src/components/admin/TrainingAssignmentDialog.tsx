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
import { CalendarIcon, Clock, BookOpen, FileText, Users } from "lucide-react";
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
  workforce_group: WorkforceGroup | null;
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
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  async function fetchData() {
    setLoadingData(true);
    try {
      // Fetch training materials
      const { data: materialsData, error: materialsError } = await supabase
        .from("training_materials")
        .select("id, title, estimated_minutes, workforce_groups")
        .order("sequence_number");

      if (materialsError) throw materialsError;
      setMaterials(
        (materialsData || []).map((m) => ({
          ...m,
          workforce_groups: m.workforce_groups as WorkforceGroup[],
        }))
      );

      // Fetch employees in organization
      const { data: employeesData, error: employeesError } = await supabase
        .from("profiles")
        .select("id, user_id, first_name, last_name, email, workforce_group");

      if (employeesError) throw employeesError;
      setEmployees(
        (employeesData || []).map((e) => ({
          ...e,
          workforce_group: e.workforce_group as WorkforceGroup | null,
        }))
      );
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
    ? employees.filter((e) => e.workforce_group === workforceGroup)
    : [];

  // Calculate total training time
  const totalMinutes = filteredMaterials.reduce(
    (sum, m) => sum + m.estimated_minutes,
    0
  );

  async function handleAssign() {
    if (!workforceGroup || !dueDate) {
      toast.error("Please select a workforce group and due date");
      return;
    }

    if (filteredEmployees.length === 0) {
      toast.error("No employees found in the selected workforce group");
      return;
    }

    setLoading(true);
    try {
      // Get current user for assigned_by
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get organization ID from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      // Create assignment for each employee
      const assignments = filteredEmployees.map((emp) => ({
        organization_id: profile.organization_id,
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
        `Training assigned to ${filteredEmployees.length} employee${filteredEmployees.length > 1 ? "s" : ""}`
      );
      
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
            Assign Training
          </DialogTitle>
          <DialogDescription>
            Assign training materials and quizzes to a workforce group with a
            completion deadline.
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

          {/* Assignment Preview */}
          {workforceGroup && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <h4 className="text-sm font-medium">Assignment Preview</h4>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    <strong>{filteredEmployees.length}</strong> employee
                    {filteredEmployees.length !== 1 ? "s" : ""}
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
              </div>

              {filteredMaterials.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">
                    Training Materials:
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
              loading || !workforceGroup || !dueDate || filteredEmployees.length === 0
            }
          >
            {loading ? "Assigning..." : "Assign Training"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
