import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "default" | "light" | "dark";
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

const textSizeClasses = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
};

export function Logo({ 
  variant = "default", 
  size = "md", 
  showText = true,
  className 
}: LogoProps) {
  const iconColor = variant === "light" 
    ? "text-white" 
    : variant === "dark" 
      ? "text-primary" 
      : "text-accent";

  const textColor = variant === "light" 
    ? "text-white" 
    : "text-foreground";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        "relative flex items-center justify-center rounded-lg p-1.5",
        variant === "light" ? "bg-white/10" : "bg-accent/10"
      )}>
        <Shield className={cn(sizeClasses[size], iconColor, "fill-current opacity-20")} />
        <Shield className={cn(sizeClasses[size], iconColor, "absolute")} />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className={cn(
            "font-semibold tracking-tight leading-none",
            textSizeClasses[size],
            textColor
          )}>
            HIPAA Sentinel
          </span>
          {size !== "sm" && (
            <span className={cn(
              "text-xs tracking-wide",
              variant === "light" ? "text-white/70" : "text-muted-foreground"
            )}>
              Compliance Training Platform
            </span>
          )}
        </div>
      )}
    </div>
  );
}
