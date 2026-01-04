import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { HipaaLink } from "@/components/HipaaLink";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Shield,
  Users,
  Target,
  Sliders,
  Building,
  ClipboardCheck,
  Handshake,
  Lock,
  AlertTriangle,
  Bell,
  Scale,
  FileWarning,
  Lightbulb,
} from "lucide-react";

interface ContentSection {
  title: string;
  content: string;
  hipaa_citations?: string[];
  key_points?: string[];
  icon?: string;
}

interface TrainingMaterialReaderProps {
  title: string;
  sections: ContentSection[];
  currentSectionIndex: number;
  onSectionChange: (index: number) => void;
  onComplete: () => void;
  isComplete?: boolean;
}

const iconMap: Record<string, React.ElementType> = {
  shield: Shield,
  users: Users,
  target: Target,
  sliders: Sliders,
  building: Building,
  "clipboard-check": ClipboardCheck,
  handshake: Handshake,
  lock: Lock,
  "alert-triangle": AlertTriangle,
  bell: Bell,
  scale: Scale,
  "file-warning": FileWarning,
};

export function TrainingMaterialReader({
  title,
  sections,
  currentSectionIndex,
  onSectionChange,
  onComplete,
  isComplete,
}: TrainingMaterialReaderProps) {
  const currentSection = sections[currentSectionIndex];
  const progress = ((currentSectionIndex + 1) / sections.length) * 100;
  const isLastSection = currentSectionIndex === sections.length - 1;
  const IconComponent = currentSection?.icon
    ? iconMap[currentSection.icon] || Shield
    : Shield;

  function handleNext() {
    if (isLastSection) {
      onComplete();
    } else {
      onSectionChange(currentSectionIndex + 1);
    }
  }

  function handlePrevious() {
    if (currentSectionIndex > 0) {
      onSectionChange(currentSectionIndex - 1);
    }
  }

  if (!currentSection) {
    return <div className="text-muted-foreground">No content available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Section {currentSectionIndex + 1} of {sections.length}
          </span>
          <span className="font-medium">{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Section Navigation Pills */}
      <div className="flex gap-1 overflow-x-auto pb-2">
        {sections.map((section, index) => (
          <button
            key={index}
            onClick={() => onSectionChange(index)}
            className={cn(
              "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              index === currentSectionIndex
                ? "bg-accent text-accent-foreground"
                : index < currentSectionIndex
                ? "bg-success/20 text-success"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {index < currentSectionIndex ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              index + 1
            )}
          </button>
        ))}
      </div>

      {/* Section Content */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-6">
        {/* Section Header */}
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <IconComponent className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{currentSection.title}</h2>
            {currentSection.hipaa_citations &&
              currentSection.hipaa_citations.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {currentSection.hipaa_citations.map((citation, idx) => (
                    <HipaaLink key={idx} section={citation} className="text-xs" />
                  ))}
                </div>
              )}
          </div>
        </div>

        {/* Main Content */}
        <div className="prose prose-sm max-w-none dark:prose-invert">
          {currentSection.content.split("\n\n").map((paragraph, idx) => (
            <p key={idx} className="text-foreground leading-relaxed">
              {paragraph.split("\n").map((line, lineIdx) => (
                <span key={lineIdx}>
                  {line}
                  {lineIdx < paragraph.split("\n").length - 1 && <br />}
                </span>
              ))}
            </p>
          ))}
        </div>

        {/* Key Points Callout */}
        {currentSection.key_points && currentSection.key_points.length > 0 && (
          <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-accent" />
              <h4 className="font-medium text-accent">Key Points</h4>
            </div>
            <ul className="space-y-2">
              {currentSection.key_points.map((point, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentSectionIndex === 0}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        <Button onClick={handleNext} className="gap-2">
          {isLastSection ? (
            isComplete ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Completed
              </>
            ) : (
              <>
                Mark Complete
                <CheckCircle2 className="h-4 w-4" />
              </>
            )
          ) : (
            <>
              Next
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
