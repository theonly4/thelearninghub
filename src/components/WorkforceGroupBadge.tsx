import { 
  Users, 
  Stethoscope, 
  FileText, 
  Briefcase, 
  Shield 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkforceGroup, WORKFORCE_GROUP_LABELS } from "@/types/hipaa";

interface WorkforceGroupBadgeProps {
  group: WorkforceGroup;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

const groupIcons: Record<WorkforceGroup, React.ComponentType<{ className?: string }>> = {
  all_staff: Users,
  clinical: Stethoscope,
  administrative: FileText,
  management: Briefcase,
  it: Shield,
};

const sizeClasses = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
  lg: "px-3 py-1.5 text-sm",
};

const iconSizeClasses = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
  lg: "h-4 w-4",
};

export function WorkforceGroupBadge({ 
  group, 
  size = "md", 
  showIcon = true,
  className 
}: WorkforceGroupBadgeProps) {
  const Icon = groupIcons[group];
  const badgeClass = `badge-wg-${group.replace('_', '-')}`;

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full font-medium",
      sizeClasses[size],
      badgeClass,
      className
    )}>
      {showIcon && <Icon className={iconSizeClasses[size]} />}
      {WORKFORCE_GROUP_LABELS[group]}
    </span>
  );
}
