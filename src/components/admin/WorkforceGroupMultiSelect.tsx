import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { WorkforceGroupBadge } from "@/components/WorkforceGroupBadge";
import { WorkforceGroup, WORKFORCE_GROUP_LABELS, WORKFORCE_GROUP_DESCRIPTIONS } from "@/types/hipaa";
import { cn } from "@/lib/utils";

interface WorkforceGroupMultiSelectProps {
  selectedGroups: WorkforceGroup[];
  onSelectionChange: (groups: WorkforceGroup[]) => void;
  className?: string;
}

const WORKFORCE_GROUPS: WorkforceGroup[] = [
  'all_staff',
  'clinical',
  'administrative',
  'management',
  'it'
];

export function WorkforceGroupMultiSelect({
  selectedGroups,
  onSelectionChange,
  className
}: WorkforceGroupMultiSelectProps) {
  const handleToggle = (group: WorkforceGroup) => {
    if (selectedGroups.includes(group)) {
      onSelectionChange(selectedGroups.filter(g => g !== group));
    } else {
      onSelectionChange([...selectedGroups, group]);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {WORKFORCE_GROUPS.map((group) => (
        <label
          key={group}
          className={cn(
            "flex items-start gap-3 rounded-lg border border-border p-4 cursor-pointer transition-colors",
            selectedGroups.includes(group) 
              ? "border-accent/50 bg-accent/5" 
              : "hover:border-muted-foreground/30 hover:bg-muted/50"
          )}
        >
          <Checkbox
            checked={selectedGroups.includes(group)}
            onCheckedChange={() => handleToggle(group)}
            className="mt-0.5"
          />
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <WorkforceGroupBadge group={group} size="sm" />
            </div>
            <p className="text-sm text-muted-foreground">
              {WORKFORCE_GROUP_DESCRIPTIONS[group]}
            </p>
          </div>
        </label>
      ))}
    </div>
  );
}
