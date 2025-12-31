import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

// Cornell Law CFR base URL for HIPAA
const CORNELL_LAW_BASE = "https://www.law.cornell.edu/cfr/text/45";

interface HipaaLinkProps {
  section: string;
  showIcon?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Parses a HIPAA citation and returns the Cornell Law URL
 * Examples:
 * - "45 CFR §164.502(b)" -> /164.502
 * - "45 CFR §160.103" -> /160.103
 * - "45 CFR §162.1002" -> /162.1002
 */
function getHipaaUrl(section: string): string {
  // Extract the part and section number
  // Pattern matches: 45 CFR §164.502(b)(1) or §164.502 or 164.502
  const match = section.match(/§?\s*(\d{3})\.(\d+)/);
  
  if (match) {
    const part = match[1]; // e.g., "164", "160", "162"
    const sectionNum = match[2]; // e.g., "502"
    return `${CORNELL_LAW_BASE}/${part}.${sectionNum}`;
  }
  
  // Fallback to the main HIPAA subchapter page
  return `${CORNELL_LAW_BASE}/chapter-A/subchapter-C`;
}

/**
 * Returns just the Cornell Law URL for a HIPAA section
 */
export function getHipaaSectionUrl(section: string): string {
  return getHipaaUrl(section);
}

/**
 * Component that renders a hyperlinked HIPAA citation
 */
export function HipaaLink({ 
  section, 
  showIcon = true, 
  className,
  children 
}: HipaaLinkProps) {
  const url = getHipaaUrl(section);
  const displayText = children || section;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 text-accent hover:text-accent/80 hover:underline transition-colors font-medium",
        className
      )}
    >
      {displayText}
      {showIcon && <ExternalLink className="h-3 w-3" />}
    </a>
  );
}

/**
 * Returns the main parts of HIPAA with their Cornell Law URLs
 */
export const HIPAA_PARTS = {
  part160: {
    title: "45 CFR Part 160",
    description: "General Administrative Requirements",
    url: `${CORNELL_LAW_BASE}/part-160`,
  },
  part162: {
    title: "45 CFR Part 162", 
    description: "Administrative Requirements",
    url: `${CORNELL_LAW_BASE}/part-162`,
  },
  part164: {
    title: "45 CFR Part 164",
    description: "Security and Privacy",
    url: `${CORNELL_LAW_BASE}/part-164`,
  },
} as const;
