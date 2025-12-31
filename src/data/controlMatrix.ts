import { ControlMapping } from "@/types/hipaa";

export const controlMappings: ControlMapping[] = [
  // Administrative Safeguards
  {
    control_id: "AS-1",
    control_name: "Workforce Security",
    hipaa_section: "45 CFR §164.308(a)(3)(i)",
    description: "Implement policies and procedures to ensure workforce members have appropriate access to ePHI based on clearance and supervision.",
    implementation_notes: "Admin must assign workforce group before user can access training. Users cannot self-select their training path.",
  },
  {
    control_id: "AS-2",
    control_name: "Authorization and Supervision",
    hipaa_section: "45 CFR §164.308(a)(3)(ii)(A)",
    description: "Implement procedures for authorization and supervision of workforce members who work with ePHI.",
    implementation_notes: "Role-based access control with org_admin and workforce_user roles. Admins supervise workforce compliance.",
  },
  {
    control_id: "AS-3",
    control_name: "Workforce Clearance Procedure",
    hipaa_section: "45 CFR §164.308(a)(3)(ii)(B)",
    description: "Implement procedures to determine that access to ePHI is appropriate.",
    implementation_notes: "Workforce group assignment determines appropriate training content access.",
  },
  {
    control_id: "AS-4",
    control_name: "Access Establishment and Modification",
    hipaa_section: "45 CFR §164.308(a)(4)(ii)(C)",
    description: "Implement procedures to establish and modify workforce member access to ePHI.",
    implementation_notes: "Admins control workforce group assignments. Users get locked/unlocked access to quizzes based on progress.",
  },
  {
    control_id: "AS-5",
    control_name: "Security Awareness and Training",
    hipaa_section: "45 CFR §164.308(a)(5)(ii)(A)",
    description: "Implement security reminders and training program for workforce members.",
    implementation_notes: "Progressive training materials must be completed before quiz access. Sequential quiz completion enforced.",
  },
  {
    control_id: "AS-6",
    control_name: "Risk Analysis",
    hipaa_section: "45 CFR §164.308(a)(1)(ii)(A)",
    description: "Conduct accurate and thorough assessment of potential risks to ePHI.",
    implementation_notes: "AI feedback identifies risk areas based on quiz performance with HIPAA citations.",
  },
  {
    control_id: "AS-7",
    control_name: "Security Incident Procedures",
    hipaa_section: "45 CFR §164.308(a)(6)(i)",
    description: "Implement policies and procedures to address security incidents.",
    implementation_notes: "Audit logging captures all access and actions for incident investigation.",
  },

  // Technical Safeguards
  {
    control_id: "TS-1",
    control_name: "Unique User Identification",
    hipaa_section: "45 CFR §164.312(a)(2)(i)",
    description: "Assign a unique name and/or number for identifying and tracking user identity.",
    implementation_notes: "Each user has unique ID within organization. organization_id ensures tenant isolation.",
  },
  {
    control_id: "TS-2",
    control_name: "Audit Controls",
    hipaa_section: "45 CFR §164.312(b)",
    description: "Implement hardware, software, and procedural mechanisms to record and examine system activity.",
    implementation_notes: "AuditLog table captures all user actions with timestamps, IP addresses, and metadata.",
  },
  {
    control_id: "TS-3",
    control_name: "Data Integrity Controls",
    hipaa_section: "45 CFR §164.312(c)(1)",
    description: "Implement policies and procedures to protect ePHI from improper alteration or destruction.",
    implementation_notes: "Versioned knowledge documents and quizzes. Certificates are immutable once generated.",
  },
  {
    control_id: "TS-4",
    control_name: "Access Control",
    hipaa_section: "45 CFR §164.312(a)(1)",
    description: "Implement technical policies to allow access only to authorized persons or programs.",
    implementation_notes: "RLS policies on all tables using organization_id. Progressive access based on training completion.",
  },

  // Organizational Requirements
  {
    control_id: "OR-1",
    control_name: "Documentation Requirements",
    hipaa_section: "45 CFR §164.316(a)",
    description: "Implement reasonable and appropriate policies and procedures in written form.",
    implementation_notes: "All HIPAA citations hyperlinked to Cornell Law. Versioned training content.",
  },
  {
    control_id: "OR-2",
    control_name: "Six-Year Retention",
    hipaa_section: "45 CFR §164.316(b)(2)(i)",
    description: "Retain documentation for 6 years from creation or last effective date.",
    implementation_notes: "All training records, quiz attempts, and certificates retained with timestamps.",
  },

  // Privacy Rule
  {
    control_id: "PR-1",
    control_name: "Workforce Training Records",
    hipaa_section: "45 CFR §164.530(b)",
    description: "Train workforce members on policies and procedures and document training completion.",
    implementation_notes: "Training progress tracked. Quiz completion with scores documented. Certificate generation.",
  },
  {
    control_id: "PR-2",
    control_name: "Minimum Necessary",
    hipaa_section: "45 CFR §164.502(b)",
    description: "Limit PHI use, disclosure, and requests to minimum necessary.",
    implementation_notes: "Users only see training content for their assigned workforce group.",
  },
  {
    control_id: "PR-3",
    control_name: "Training Adequacy Verification",
    hipaa_section: "45 CFR §164.530(b)(2)",
    description: "Document that workforce training has been provided.",
    implementation_notes: "80% passing threshold enforced. Sequential quiz progression ensures mastery.",
  },

  // AI-Specific Compliance
  {
    control_id: "AI-1",
    control_name: "AI Explainability",
    hipaa_section: "45 CFR §164.308(a)(1), §164.312(b)",
    description: "AI outputs must be explainable and cite specific HIPAA provisions.",
    implementation_notes: "RAG-based AI feedback cites specific HIPAA sections. Deterministic outputs for auditability.",
  },
  {
    control_id: "AI-2",
    control_name: "AI Audit Trail",
    hipaa_section: "45 CFR §164.312(b)",
    description: "AI-generated feedback must be logged and auditable.",
    implementation_notes: "AIFeedback records stored with quiz_attempt_id, knowledge_version_id, and citations.",
  },
];

// Helper function to get control by ID
export function getControlById(controlId: string): ControlMapping | undefined {
  return controlMappings.find(c => c.control_id === controlId);
}

// Helper function to get controls by HIPAA section
export function getControlsBySection(section: string): ControlMapping[] {
  return controlMappings.filter(c => c.hipaa_section.includes(section));
}

// Helper function to get all controls grouped by category
export function getControlsByCategory(): Record<string, ControlMapping[]> {
  return {
    "Administrative Safeguards": controlMappings.filter(c => c.control_id.startsWith("AS")),
    "Technical Safeguards": controlMappings.filter(c => c.control_id.startsWith("TS")),
    "Organizational Requirements": controlMappings.filter(c => c.control_id.startsWith("OR")),
    "Privacy Rule": controlMappings.filter(c => c.control_id.startsWith("PR")),
    "AI Compliance": controlMappings.filter(c => c.control_id.startsWith("AI")),
  };
}
