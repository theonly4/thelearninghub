export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json
          organization_id: string
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          organization_id: string
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          organization_id?: string
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_number: string
          hipaa_citations: string[]
          id: string
          issued_at: string
          organization_id: string
          quiz_attempt_id: string
          score: number
          user_id: string
          valid_until: string
          workforce_group: Database["public"]["Enums"]["workforce_group"]
        }
        Insert: {
          certificate_number: string
          hipaa_citations?: string[]
          id?: string
          issued_at?: string
          organization_id: string
          quiz_attempt_id: string
          score: number
          user_id: string
          valid_until: string
          workforce_group: Database["public"]["Enums"]["workforce_group"]
        }
        Update: {
          certificate_number?: string
          hipaa_citations?: string[]
          id?: string
          issued_at?: string
          organization_id?: string
          quiz_attempt_id?: string
          score?: number
          user_id?: string
          valid_until?: string
          workforce_group?: Database["public"]["Enums"]["workforce_group"]
        }
        Relationships: [
          {
            foreignKeyName: "certificates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_quiz_attempt_id_fkey"
            columns: ["quiz_attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          is_contractor: boolean
          last_name: string
          mfa_enabled: boolean
          organization_id: string
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
          user_id: string
          workforce_group: Database["public"]["Enums"]["workforce_group"] | null
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          is_contractor?: boolean
          last_name: string
          mfa_enabled?: boolean
          organization_id: string
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          user_id: string
          workforce_group?:
            | Database["public"]["Enums"]["workforce_group"]
            | null
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          is_contractor?: boolean
          last_name?: string
          mfa_enabled?: boolean
          organization_id?: string
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          user_id?: string
          workforce_group?:
            | Database["public"]["Enums"]["workforce_group"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          answers: Json
          completed_at: string | null
          created_at: string
          id: string
          organization_id: string
          passed: boolean
          quiz_id: string
          score: number
          started_at: string
          total_questions: number
          user_id: string
          workforce_group_at_time: Database["public"]["Enums"]["workforce_group"]
        }
        Insert: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          id?: string
          organization_id: string
          passed?: boolean
          quiz_id: string
          score?: number
          started_at?: string
          total_questions: number
          user_id: string
          workforce_group_at_time: Database["public"]["Enums"]["workforce_group"]
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          passed?: boolean
          quiz_id?: string
          score?: number
          started_at?: string
          total_questions?: number
          user_id?: string
          workforce_group_at_time?: Database["public"]["Enums"]["workforce_group"]
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer: string
          created_at: string
          hipaa_section: string
          id: string
          options: Json
          question_number: number
          question_text: string
          quiz_id: string
          rationale: string
          scenario: string | null
          updated_at: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          hipaa_section: string
          id?: string
          options: Json
          question_number: number
          question_text: string
          quiz_id: string
          rationale: string
          scenario?: string | null
          updated_at?: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          hipaa_section?: string
          id?: string
          options?: Json
          question_number?: number
          question_text?: string
          quiz_id?: string
          rationale?: string
          scenario?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          description: string
          effective_date: string
          hipaa_citations: string[]
          id: string
          passing_score: number
          sequence_number: number
          title: string
          updated_at: string
          version: number
          workforce_groups: Database["public"]["Enums"]["workforce_group"][]
        }
        Insert: {
          created_at?: string
          description: string
          effective_date?: string
          hipaa_citations?: string[]
          id?: string
          passing_score?: number
          sequence_number: number
          title: string
          updated_at?: string
          version?: number
          workforce_groups: Database["public"]["Enums"]["workforce_group"][]
        }
        Update: {
          created_at?: string
          description?: string
          effective_date?: string
          hipaa_citations?: string[]
          id?: string
          passing_score?: number
          sequence_number?: number
          title?: string
          updated_at?: string
          version?: number
          workforce_groups?: Database["public"]["Enums"]["workforce_group"][]
        }
        Relationships: []
      }
      training_materials: {
        Row: {
          content: Json
          created_at: string
          description: string
          estimated_minutes: number
          hipaa_citations: string[]
          id: string
          sequence_number: number
          title: string
          updated_at: string
          version: number
          workforce_groups: Database["public"]["Enums"]["workforce_group"][]
        }
        Insert: {
          content?: Json
          created_at?: string
          description: string
          estimated_minutes?: number
          hipaa_citations?: string[]
          id?: string
          sequence_number: number
          title: string
          updated_at?: string
          version?: number
          workforce_groups: Database["public"]["Enums"]["workforce_group"][]
        }
        Update: {
          content?: Json
          created_at?: string
          description?: string
          estimated_minutes?: number
          hipaa_citations?: string[]
          id?: string
          sequence_number?: number
          title?: string
          updated_at?: string
          version?: number
          workforce_groups?: Database["public"]["Enums"]["workforce_group"][]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_training_progress: {
        Row: {
          completed_at: string
          id: string
          material_id: string
          organization_id: string
          user_id: string
          version_at_completion: number
        }
        Insert: {
          completed_at?: string
          id?: string
          material_id: string
          organization_id: string
          user_id: string
          version_at_completion: number
        }
        Update: {
          completed_at?: string
          id?: string
          material_id?: string
          organization_id?: string
          user_id?: string
          version_at_completion?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_training_progress_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "training_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_training_progress_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_organization: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "org_admin" | "workforce_user"
      user_status: "pending_assignment" | "active" | "suspended"
      workforce_group:
        | "all_staff"
        | "clinical"
        | "administrative"
        | "management"
        | "it"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["org_admin", "workforce_user"],
      user_status: ["pending_assignment", "active", "suspended"],
      workforce_group: [
        "all_staff",
        "clinical",
        "administrative",
        "management",
        "it",
      ],
    },
  },
} as const
