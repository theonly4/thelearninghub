

# Smart Exclusion Implementation - Ready to Execute

## Files to Modify

| File | Lines Changed | Purpose |
|------|---------------|---------|
| `TrainingAssignmentDialog.tsx` | ~40 lines | Add exclusion checkbox + filter logic |
| `SingleEmployeeAssignmentDialog.tsx` | ~20 lines | Add completion check for individual |

---

## Change 1: TrainingAssignmentDialog.tsx

### Add State (after line 79)
```typescript
const [excludeCompleted, setExcludeCompleted] = useState(true);
const [completedUserIds, setCompletedUserIds] = useState<string[]>([]);
```

### Add Import: Checkbox
```typescript
import { Checkbox } from "@/components/ui/checkbox";
```

### Fetch Completed Users (in fetchData, after employees fetch ~line 168)
```typescript
// Fetch users who already have completed assignments
const { data: completedAssignments } = await supabase
  .from("training_assignments")
  .select("assigned_to")
  .eq("organization_id", profile.organization_id)
  .eq("status", "completed");

const completedIds = [...new Set(completedAssignments?.map(a => a.assigned_to) || [])];
setCompletedUserIds(completedIds);
```

### Filter Logic (after filteredEmployees ~line 185)
```typescript
// Apply exclusion filter for completed employees
const employeesToAssign = excludeCompleted
  ? filteredEmployees.filter(emp => !completedUserIds.includes(emp.user_id))
  : filteredEmployees;
const excludedCount = filteredEmployees.length - employeesToAssign.length;
```

### Add UI Checkbox (after Notes section ~line 377)
```tsx
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
```

### Update Preview Count (line 388)
```tsx
<strong>{employeesToAssign.length}</strong> of {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? "s" : ""}
{excludedCount > 0 && <span className="text-muted-foreground"> ({excludedCount} completed)</span>}
```

### Update handleAssign to use employeesToAssign (line 226)
```typescript
const assignments = employeesToAssign.map((emp) => ({
```

### Update validation and toast (lines 207 & 242-243)
```typescript
if (employeesToAssign.length === 0) // instead of filteredEmployees
toast.success(`Training assigned to ${employeesToAssign.length} employee${...}`)
```

### Update email loop (line 251)
```typescript
employeesToAssign.forEach((emp) => { // instead of filteredEmployees
```

---

## Change 2: SingleEmployeeAssignmentDialog.tsx

### Add State (after line 65)
```typescript
const [hasExistingCompleted, setHasExistingCompleted] = useState(false);
```

### Check for existing completion (in fetchData, before setLoadingData(false))
```typescript
// Check if employee already has completed assignments
const { data: existingCompleted } = await supabase
  .from("training_assignments")
  .select("id")
  .eq("assigned_to", employee.user_id)
  .eq("organization_id", profile.organization_id)
  .eq("status", "completed")
  .limit(1);

setHasExistingCompleted((existingCompleted?.length || 0) > 0);
```

### Add UI Warning (after Employee Info section ~line 291)
```tsx
{/* Completion Notice */}
{hasExistingCompleted && (
  <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3">
    <div className="flex items-center gap-2 text-green-600">
      <CheckCircle2 className="h-4 w-4" />
      <p className="text-sm font-medium">Has Prior Completions</p>
    </div>
    <p className="text-xs text-muted-foreground mt-1">
      This employee has completed previous training. New assignments will be added.
    </p>
  </div>
)}
```

### Add import for CheckCircle2 icon

---

## Summary

| What | Where | Impact |
|------|-------|--------|
| Exclusion checkbox | TrainingAssignmentDialog | Prevents group re-spam |
| Preview with counts | TrainingAssignmentDialog | Shows excluded users |
| Completion status | SingleEmployeeAssignmentDialog | Informational warning |

**Total: ~55 lines across 2 files. No database changes. No edge functions.**

