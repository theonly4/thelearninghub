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
  ArrowRight,
  ArrowDown,
  Info,
  Zap,
  BookOpen,
  FileText,
  Eye,
  ShieldCheck,
  UserCheck,
  Database,
  Network,
  Workflow,
  Heart,
  Check,
  Clock,
  User,
  AlertCircle,
  Wifi,
  CheckCircle,
  Download,
  Folder,
  DollarSign,
  List,
  MinusCircle,
  Volume1,
  Home,
  Monitor,
  Clipboard,
  RefreshCw,
  BarChart,
  Archive,
  Edit,
  Search,
} from "lucide-react";

interface DiagramNode {
  label: string;
  description?: string;
}

interface ProcessStep {
  step: number;
  title: string;
  description: string;
}

interface InfoCard {
  title: string;
  items: string[];
  variant?: "default" | "warning" | "success" | "info";
}

// Visual element types for new content format
interface VisualInfoCard {
  title: string;
  description: string;
  icon?: string;
}

interface VisualHierarchyNode {
  id: string;
  label: string;
  description?: string;
  children?: string[];
}

interface VisualComparison {
  header: string;
  items: string[];
}

interface VisualProcessStep {
  title: string;
  description: string;
}

interface VisualElement {
  type: "info_cards" | "hierarchy" | "comparison" | "process" | "flow";
  title?: string;
  items?: VisualInfoCard[];
  nodes?: VisualHierarchyNode[];
  columns?: VisualComparison[];
  steps?: VisualProcessStep[];
}

interface ContentSection {
  title: string;
  // Support both old format (content string) and new format (paragraphs array)
  content?: string;
  paragraphs?: string[];
  hipaa_citations?: string[];
  key_points?: string[];
  icon?: string;
  // Old format diagram
  diagram?: {
    type: "flow" | "hierarchy" | "comparison" | "process";
    title: string;
    nodes?: DiagramNode[];
    left?: { title: string; items: string[] };
    right?: { title: string; items: string[] };
    steps?: ProcessStep[];
  };
  // New format visual
  visual?: VisualElement;
  info_cards?: InfoCard[];
  callout?: {
    type: "warning" | "tip" | "example" | "remember" | "info" | "alert";
    title: string;
    content: string;
  };
  stats?: {
    value: string;
    label: string;
    description?: string;
  }[];
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
  workflow: Workflow,
  database: Database,
  network: Network,
  "shield-check": ShieldCheck,
  "user-check": UserCheck,
  eye: Eye,
  "file-text": FileText,
  "book-open": BookOpen,
  heart: Heart,
  check: Check,
  clock: Clock,
  user: User,
  "alert-circle": AlertCircle,
  wifi: Wifi,
  "check-circle": CheckCircle,
  download: Download,
  folder: Folder,
  "dollar-sign": DollarSign,
  list: List,
  "minus-circle": MinusCircle,
  "volume-1": Volume1,
  home: Home,
  monitor: Monitor,
  clipboard: Clipboard,
  "refresh-cw": RefreshCw,
  zap: Zap,
  "bar-chart": BarChart,
  archive: Archive,
  edit: Edit,
  search: Search,
  info: Info,
  lightbulb: Lightbulb,
};

function FlowDiagram({ title, nodes }: { title: string; nodes: DiagramNode[] }) {
  return (
    <div className="my-6 p-4 rounded-xl border border-border bg-gradient-to-br from-accent/5 to-accent/10">
      <h4 className="text-sm font-semibold text-accent mb-4 flex items-center gap-2">
        <Workflow className="h-4 w-4" />
        {title}
      </h4>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {nodes.map((node, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className="bg-card border border-border rounded-lg px-4 py-3 text-center shadow-sm min-w-[120px]">
              <p className="font-medium text-sm">{node.label}</p>
              {node.description && (
                <p className="text-xs text-muted-foreground mt-1">{node.description}</p>
              )}
            </div>
            {idx < nodes.length - 1 && (
              <ArrowRight className="h-5 w-5 text-accent shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function HierarchyDiagram({ title, nodes }: { title: string; nodes: DiagramNode[] }) {
  return (
    <div className="my-6 p-4 rounded-xl border border-border bg-gradient-to-br from-primary/5 to-primary/10">
      <h4 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
        <Network className="h-4 w-4" />
        {title}
      </h4>
      <div className="flex flex-col items-center gap-3">
        {nodes.map((node, idx) => (
          <div key={idx} className="flex flex-col items-center">
            <div className={cn(
              "bg-card border rounded-lg px-4 py-3 text-center shadow-sm",
              idx === 0 ? "border-primary bg-primary/10 min-w-[200px]" : "border-border min-w-[160px]"
            )}>
              <p className={cn("font-medium text-sm", idx === 0 && "text-primary")}>{node.label}</p>
              {node.description && (
                <p className="text-xs text-muted-foreground mt-1">{node.description}</p>
              )}
            </div>
            {idx < nodes.length - 1 && (
              <ArrowDown className="h-5 w-5 text-muted-foreground my-1" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparisonDiagram({ 
  title, 
  left, 
  right 
}: { 
  title: string; 
  left: { title: string; items: string[] }; 
  right: { title: string; items: string[] };
}) {
  return (
    <div className="my-6 p-4 rounded-xl border border-border bg-muted/30">
      <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
        <Scale className="h-4 w-4 text-accent" />
        {title}
      </h4>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h5 className="font-medium text-sm text-primary mb-3">{left.title}</h5>
          <ul className="space-y-2">
            {left.items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <h5 className="font-medium text-sm text-accent mb-3">{right.title}</h5>
          <ul className="space-y-2">
            {right.items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ProcessDiagram({ title, steps }: { title: string; steps: ProcessStep[] }) {
  return (
    <div className="my-6 p-4 rounded-xl border border-border bg-gradient-to-br from-success/5 to-success/10">
      <h4 className="text-sm font-semibold text-success mb-4 flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4" />
        {title}
      </h4>
      <div className="space-y-3">
        {steps.map((step, idx) => (
          <div key={idx} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success text-success-foreground font-bold text-sm">
                {step.step}
              </div>
              {idx < steps.length - 1 && (
                <div className="w-0.5 h-full bg-success/30 my-1" />
              )}
            </div>
            <div className="flex-1 pb-4">
              <h5 className="font-medium text-sm">{step.title}</h5>
              <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoCards({ cards }: { cards: InfoCard[] }) {
  const variantStyles = {
    default: "border-border bg-card",
    warning: "border-warning/30 bg-warning/5",
    success: "border-success/30 bg-success/5",
    info: "border-info/30 bg-info/5",
  };

  const iconStyles = {
    default: "text-foreground",
    warning: "text-warning",
    success: "text-success",
    info: "text-info",
  };

  return (
    <div className="my-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card, idx) => (
        <div 
          key={idx} 
          className={cn(
            "rounded-lg border p-4",
            variantStyles[card.variant || "default"]
          )}
        >
          <h5 className={cn(
            "font-medium text-sm mb-3 flex items-center gap-2",
            iconStyles[card.variant || "default"]
          )}>
            <FileText className="h-4 w-4" />
            {card.title}
          </h5>
          <ul className="space-y-1.5">
            {card.items.map((item, itemIdx) => (
              <li key={itemIdx} className="flex items-start gap-2 text-xs">
                <span className="text-muted-foreground">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Callout({ type, title, content }: { type: string; title: string; content: string }) {
  const styles = {
    warning: {
      bg: "bg-warning/10 border-warning/30",
      icon: AlertTriangle,
      iconColor: "text-warning",
    },
    tip: {
      bg: "bg-success/10 border-success/30",
      icon: Lightbulb,
      iconColor: "text-success",
    },
    example: {
      bg: "bg-info/10 border-info/30",
      icon: BookOpen,
      iconColor: "text-info",
    },
    remember: {
      bg: "bg-accent/10 border-accent/30",
      icon: Zap,
      iconColor: "text-accent",
    },
    info: {
      bg: "bg-info/10 border-info/30",
      icon: Info,
      iconColor: "text-info",
    },
    alert: {
      bg: "bg-destructive/10 border-destructive/30",
      icon: AlertTriangle,
      iconColor: "text-destructive",
    },
  };

  const style = styles[type as keyof typeof styles] || styles.tip;
  const IconComp = style.icon;

  return (
    <div className={cn("my-6 rounded-lg border p-4", style.bg)}>
      <div className={cn("flex items-center gap-2 mb-2 font-medium", style.iconColor)}>
        <IconComp className="h-4 w-4" />
        {title}
      </div>
      <p className="text-sm text-foreground/90">{content}</p>
    </div>
  );
}

function StatsDisplay({ stats }: { stats: { value: string; label: string; description?: string }[] }) {
  return (
    <div className="my-6 grid gap-4 grid-cols-2 md:grid-cols-4">
      {stats.map((stat, idx) => (
        <div key={idx} className="bg-card border border-border rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-accent">{stat.value}</p>
          <p className="text-sm font-medium">{stat.label}</p>
          {stat.description && (
            <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// New format visual renderers
function VisualInfoCardsRenderer({ items }: { items: VisualInfoCard[] }) {
  return (
    <div className="my-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item, idx) => {
        const IconComp = item.icon ? (iconMap[item.icon] || Shield) : Shield;
        return (
          <div key={idx} className="rounded-lg border border-border bg-card p-4">
            <h5 className="font-medium text-sm mb-2 flex items-center gap-2 text-accent">
              <IconComp className="h-4 w-4" />
              {item.title}
            </h5>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>
        );
      })}
    </div>
  );
}

function VisualHierarchyRenderer({ title, nodes }: { title?: string; nodes: VisualHierarchyNode[] }) {
  // Find root nodes (those that are children of others or the first one)
  const rootNode = nodes.find(n => n.children && n.children.length > 0) || nodes[0];
  const childNodes = rootNode?.children?.map(childId => nodes.find(n => n.id === childId)).filter(Boolean) || [];

  return (
    <div className="my-6 p-4 rounded-xl border border-border bg-gradient-to-br from-primary/5 to-primary/10">
      {title && (
        <h4 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
          <Network className="h-4 w-4" />
          {title}
        </h4>
      )}
      <div className="flex flex-col items-center gap-3">
        {rootNode && (
          <div className="bg-card border border-primary bg-primary/10 rounded-lg px-4 py-3 text-center shadow-sm min-w-[200px]">
            <p className="font-medium text-sm text-primary">{rootNode.label}</p>
            {rootNode.description && (
              <p className="text-xs text-muted-foreground mt-1">{rootNode.description}</p>
            )}
          </div>
        )}
        {childNodes.length > 0 && (
          <>
            <ArrowDown className="h-5 w-5 text-muted-foreground" />
            <div className="flex flex-wrap justify-center gap-3">
              {childNodes.map((node, idx) => node && (
                <div key={idx} className="bg-card border border-border rounded-lg px-4 py-3 text-center shadow-sm min-w-[140px]">
                  <p className="font-medium text-sm">{node.label}</p>
                  {node.description && (
                    <p className="text-xs text-muted-foreground mt-1">{node.description}</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function VisualComparisonRenderer({ title, columns }: { title?: string; columns: VisualComparison[] }) {
  return (
    <div className="my-6 p-4 rounded-xl border border-border bg-muted/30">
      {title && (
        <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Scale className="h-4 w-4 text-accent" />
          {title}
        </h4>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        {columns.map((column, idx) => (
          <div key={idx} className="bg-card border border-border rounded-lg p-4">
            <h5 className={cn("font-medium text-sm mb-3", idx === 0 ? "text-primary" : "text-accent")}>
              {column.header}
            </h5>
            <ul className="space-y-2">
              {column.items.map((item, itemIdx) => (
                <li key={itemIdx} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className={cn("h-4 w-4 shrink-0 mt-0.5", idx === 0 ? "text-primary" : "text-accent")} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function VisualProcessRenderer({ title, steps }: { title?: string; steps: VisualProcessStep[] }) {
  return (
    <div className="my-6 p-4 rounded-xl border border-border bg-gradient-to-br from-success/5 to-success/10">
      {title && (
        <h4 className="text-sm font-semibold text-success mb-4 flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4" />
          {title}
        </h4>
      )}
      <div className="space-y-3">
        {steps.map((step, idx) => (
          <div key={idx} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success text-success-foreground font-bold text-sm">
                {idx + 1}
              </div>
              {idx < steps.length - 1 && (
                <div className="w-0.5 h-full bg-success/30 my-1" />
              )}
            </div>
            <div className="flex-1 pb-4">
              <h5 className="font-medium text-sm">{step.title}</h5>
              <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderVisual(visual: VisualElement) {
  if (visual.type === "info_cards" && visual.items) {
    return <VisualInfoCardsRenderer items={visual.items} />;
  }
  if (visual.type === "hierarchy" && visual.nodes) {
    return <VisualHierarchyRenderer title={visual.title} nodes={visual.nodes} />;
  }
  if (visual.type === "comparison" && visual.columns) {
    return <VisualComparisonRenderer title={visual.title} columns={visual.columns} />;
  }
  if ((visual.type === "process" || visual.type === "flow") && visual.steps) {
    return <VisualProcessRenderer title={visual.title} steps={visual.steps} />;
  }
  return null;
}

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

        {/* Stats Display */}
        {currentSection.stats && currentSection.stats.length > 0 && (
          <StatsDisplay stats={currentSection.stats} />
        )}

        {/* Main Content - Handle both old format (content string) and new format (paragraphs array) */}
        <div className="prose prose-sm max-w-none dark:prose-invert">
          {currentSection.paragraphs ? (
            // New format: paragraphs array
            currentSection.paragraphs.map((paragraph, idx) => (
              <p key={idx} className="text-foreground leading-relaxed">
                {paragraph}
              </p>
            ))
          ) : currentSection.content ? (
            // Old format: content string
            currentSection.content.split("\n\n").map((paragraph, idx) => (
              <p key={idx} className="text-foreground leading-relaxed">
                {paragraph.split("\n").map((line, lineIdx) => (
                  <span key={lineIdx}>
                    {line}
                    {lineIdx < paragraph.split("\n").length - 1 && <br />}
                  </span>
                ))}
              </p>
            ))
          ) : null}
        </div>

        {/* New format visual element */}
        {currentSection.visual && renderVisual(currentSection.visual)}

        {/* Old format Diagram */}
        {currentSection.diagram && (
          <>
            {currentSection.diagram.type === "flow" && currentSection.diagram.nodes && (
              <FlowDiagram title={currentSection.diagram.title} nodes={currentSection.diagram.nodes} />
            )}
            {currentSection.diagram.type === "hierarchy" && currentSection.diagram.nodes && (
              <HierarchyDiagram title={currentSection.diagram.title} nodes={currentSection.diagram.nodes} />
            )}
            {currentSection.diagram.type === "comparison" && currentSection.diagram.left && currentSection.diagram.right && (
              <ComparisonDiagram 
                title={currentSection.diagram.title} 
                left={currentSection.diagram.left} 
                right={currentSection.diagram.right} 
              />
            )}
            {currentSection.diagram.type === "process" && currentSection.diagram.steps && (
              <ProcessDiagram title={currentSection.diagram.title} steps={currentSection.diagram.steps} />
            )}
          </>
        )}

        {/* Old format Info Cards */}
        {currentSection.info_cards && currentSection.info_cards.length > 0 && (
          <InfoCards cards={currentSection.info_cards} />
        )}

        {/* Callout */}
        {currentSection.callout && (
          <Callout 
            type={currentSection.callout.type} 
            title={currentSection.callout.title} 
            content={currentSection.callout.content} 
          />
        )}

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