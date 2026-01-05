// HIPAA Learning Hub Type Definitions
// Multi-tenant HIPAA Training Platform

export type WorkforceGroup = 
  | 'all_staff'
  | 'clinical'
  | 'administrative'
  | 'management'
  | 'it';

export type UserRole = 'org_admin' | 'workforce_user' | 'platform_owner';

export type UserStatus = 'pending_assignment' | 'active' | 'suspended';

export type QuizStatus = 'locked' | 'unlocked' | 'in_progress' | 'passed' | 'failed';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  organization_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  workforce_groups: WorkforceGroup[];
  status: UserStatus;
  mfa_enabled: boolean;
  is_contractor: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingMaterial {
  id: string;
  workforce_groups: WorkforceGroup[];
  sequence_number: number;
  title: string;
  description: string;
  content: TrainingSection[];
  hipaa_citations: string[];
  estimated_minutes: number;
  version: number;
}

export interface TrainingSection {
  title: string;
  content: string;
  hipaa_citations: string[];
}

export interface UserTrainingProgress {
  user_id: string;
  material_id: string;
  completed_at: string;
  version_at_completion: number;
}

export interface Quiz {
  id: string;
  workforce_groups: WorkforceGroup[];
  sequence_number: number;
  version: number;
  title: string;
  description: string;
  questions: QuizQuestion[];
  hipaa_citations: string[];
  passing_score: number;
  effective_date: string;
}

export interface QuizProgress {
  user_id: string;
  quiz_id: string;
  sequence_number: number;
  status: QuizStatus;
  best_score?: number;
  attempts: number;
  last_attempt_at?: string;
  passed_at?: string;
}

export interface KnowledgeVersion {
  id: string;
  workforce_group: WorkforceGroup;
  version: number;
  title: string;
  content: string;
  hipaa_citations: string[];
  effective_date: string;
  created_at: string;
}

export interface QuizVersion {
  id: string;
  workforce_groups: WorkforceGroup[];
  version: number;
  title: string;
  description: string;
  questions: QuizQuestion[];
  hipaa_citations: string[];
  effective_date: string;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  question_number: number;
  question_text: string;
  scenario?: string;
  options: QuizOption[];
  correct_answer: string;
  rationale: string;
  hipaa_section: string;
}

export interface QuizOption {
  id: string;
  label: string;
  text: string;
}

export interface QuizAssignment {
  id: string;
  organization_id: string;
  quiz_version_id: string;
  assigned_by_user_id: string;
  assigned_to_user_id?: string;
  assigned_to_workforce_group?: WorkforceGroup;
  due_date?: string;
  created_at: string;
}

export interface QuizAttempt {
  id: string;
  organization_id: string;
  user_id: string;
  quiz_version_id: string;
  assignment_id?: string;
  workforce_group_at_time: WorkforceGroup;
  started_at: string;
  completed_at?: string;
  score: number;
  total_questions: number;
  answers: QuizAnswer[];
  status: 'in_progress' | 'completed' | 'expired';
}

export interface QuizAnswer {
  question_id: string;
  selected_option: string;
  is_correct: boolean;
  time_spent_seconds: number;
}

export interface AIFeedback {
  id: string;
  organization_id: string;
  user_id: string;
  quiz_attempt_id: string;
  knowledge_version_id: string;
  feedback_content: string;
  risk_areas: RiskArea[];
  hipaa_citations: string[];
  generated_at: string;
}

export interface RiskArea {
  category: string;
  description: string;
  hipaa_section: string;
  severity: 'low' | 'medium' | 'high';
}

export interface Certificate {
  id: string;
  organization_id: string;
  user_id: string;
  quiz_attempt_id: string;
  quiz_version_id: string;
  workforce_group: WorkforceGroup;
  score: number;
  hipaa_citations: string[];
  issued_at: string;
  valid_until: string;
  certificate_number: string;
}

export interface AuditLog {
  id: string;
  organization_id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  metadata: Record<string, unknown>;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

// Control Matrix Types
export interface ControlMapping {
  control_id: string;
  control_name: string;
  hipaa_section: string;
  description: string;
  implementation_notes: string;
}

// UI Helper Types
export const WORKFORCE_GROUP_LABELS: Record<WorkforceGroup, string> = {
  all_staff: 'All Staff',
  clinical: 'Clinical Staff',
  administrative: 'Administrative Staff',
  management: 'Management & Leadership',
  it: 'IT / Security Personnel',
};

export const WORKFORCE_GROUP_DESCRIPTIONS: Record<WorkforceGroup, string> = {
  all_staff: 'Core HIPAA training applicable to all workforce members',
  clinical: 'Healthcare providers including physicians, nurses, and clinical support',
  administrative: 'Administrative and billing personnel handling PHI',
  management: 'Leadership responsible for organizational compliance',
  it: 'Information technology and security professionals',
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  pending_assignment: 'Pending Assignment',
  active: 'Active',
  suspended: 'Suspended',
};

export const QUIZ_STATUS_LABELS: Record<QuizStatus, string> = {
  locked: 'Locked',
  unlocked: 'Available',
  in_progress: 'In Progress',
  passed: 'Passed',
  failed: 'Needs Review',
};
