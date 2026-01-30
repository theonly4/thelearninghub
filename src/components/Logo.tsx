import { cn } from "@/lib/utils";
import logoImage from "@/assets/logo-the-learning-hub.png";

interface LogoProps {
  variant?: "default" | "light" | "dark";
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const imageSizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
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
  const textColor = variant === "light" 
    ? "text-white" 
    : "text-foreground";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <img 
        src={logoImage} 
        alt="The Learning Hub Logo" 
        className={cn(imageSizeClasses[size], "object-contain")}
      />
      {showText && (
        <div className="flex flex-col">
          <span className={cn(
            "font-semibold tracking-tight leading-none",
            textSizeClasses[size],
            textColor
          )}>
            The Learning Hub
          </span>
          {size !== "sm" && (
            <span className={cn(
              "text-xs tracking-wide",
              variant === "light" ? "text-white/70" : "text-muted-foreground"
            )}>
              Compliance Learning Platform
            </span>
          )}
        </div>
      )}
    </div>
  );
}
