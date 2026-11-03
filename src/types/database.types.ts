export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type SavedSearchFilters = {
  q?: string;
  location?: string;
  category?: string;
  work_type?: string;
  salary_min?: number;
  sort?: string;
};

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      applications: {
        Row: {
          applied_at: string
          consent_at: string | null
          cover_letter: string | null
          first_responded_at: string | null
          id: string
          job_id: string
          resume_url: string
          seeker_id: string
          status: string
        }
        Insert: {
          applied_at?: string
          consent_at?: string | null
          cover_letter?: string | null
          first_responded_at?: string | null
          id?: string
          job_id: string
          resume_url: string
          seeker_id: string
          status?: string
        }
        Update: {
          applied_at?: string
          consent_at?: string | null
          cover_letter?: string | null
          first_responded_at?: string | null
          id?: string
          job_id?: string
          resume_url?: string
          seeker_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_seeker_id_fkey"
            columns: ["seeker_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          company_name: string
          created_at: string
          description: string | null
          employer_id: string
          id: string
          is_verified: boolean
          is_system: boolean
          logo_url: string | null
          total_applications_90d: number
          responded_applications_90d: number
          avg_response_hours: number | null
          response_rate_cached_at: string | null
        }
        Insert: {
          company_name: string
          created_at?: string
          description?: string | null
          employer_id: string
          id?: string
          is_verified?: boolean
          is_system?: boolean
          logo_url?: string | null
          total_applications_90d?: number
          responded_applications_90d?: number
          avg_response_hours?: number | null
          response_rate_cached_at?: string | null
        }
        Update: {
          company_name?: string
          created_at?: string
          description?: string | null
          employer_id?: string
          id?: string
          is_verified?: boolean
          is_system?: boolean
          logo_url?: string | null
          total_applications_90d?: number
          responded_applications_90d?: number
          avg_response_hours?: number | null
          response_rate_cached_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          category: string | null
          claimed_at: string | null
          company_id: string
          created_at: string
          description: string
          duration_days: number
          external_company_name: string | null
          expires_at: string
          id: string
          job_image_url: string | null
          last_verified_at: string | null
          location: string
          notified_10_applicants_at: string | null
          notified_expiring_at: string | null
          notified_stale_at: string | null
          published_at: string | null
          price_lkr: number
          source: string
          source_url: string | null
          salary_max: number | null
          salary_min: number | null
          status: string
          title: string
          verification_sent_at: string | null
          verification_token: string | null
          work_type: string
        }
        Insert: {
          category?: string | null
          claimed_at?: string | null
          company_id: string
          created_at?: string
          description: string
          duration_days?: number
          external_company_name?: string | null
          expires_at: string
          id?: string
          job_image_url?: string | null
          last_verified_at?: string | null
          location: string
          notified_10_applicants_at?: string | null
          notified_expiring_at?: string | null
          notified_stale_at?: string | null
          published_at?: string | null
          price_lkr: number
          source?: string
          source_url?: string | null
          salary_max?: number | null
          salary_min?: number | null
          status?: string
          title: string
          verification_sent_at?: string | null
          verification_token?: string | null
          work_type: string
        }
        Update: {
          category?: string | null
          claimed_at?: string | null
          company_id?: string
          created_at?: string
          description?: string
          duration_days?: number
          external_company_name?: string | null
          expires_at?: string
          id?: string
          job_image_url?: string | null
          last_verified_at?: string | null
          location?: string
          notified_10_applicants_at?: string | null
          notified_expiring_at?: string | null
          notified_stale_at?: string | null
          published_at?: string | null
          price_lkr?: number
          source?: string
          source_url?: string | null
          salary_max?: number | null
          salary_min?: number | null
          status?: string
          title?: string
          verification_sent_at?: string | null
          verification_token?: string | null
          work_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          gateway_reference: string | null
          id: string
          job_id: string | null
          order_id: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          gateway_reference?: string | null
          id?: string
          job_id?: string | null
          order_id: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          gateway_reference?: string | null
          id?: string
          job_id?: string | null
          order_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      job_external_contacts: {
        Row: {
          claim_token_expires_at: string | null
          claim_token_hash: string | null
          contact_email: string
          job_id: string
          last_notified_at: string | null
          notify_count: number
        }
        Insert: {
          claim_token_expires_at?: string | null
          claim_token_hash?: string | null
          contact_email: string
          job_id: string
          last_notified_at?: string | null
          notify_count?: number
        }
        Update: {
          claim_token_expires_at?: string | null
          claim_token_hash?: string | null
          contact_email?: string
          job_id?: string
          last_notified_at?: string | null
          notify_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_external_contacts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      email_suppressions: {
        Row: {
          created_at: string
          email: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          email: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          reason?: string | null
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          email: string
          expires_at: string
          token_hash: string
        }
        Insert: {
          email: string
          expires_at: string
          token_hash: string
        }
        Update: {
          email?: string
          expires_at?: string
          token_hash?: string
        }
        Relationships: []
      }
      saved_searches: {
        Row: {
          alert_frequency: string
          created_at: string
          filters: SavedSearchFilters
          id: string
          last_alerted_at: string
          unsubscribe_token: string
          user_id: string
        }
        Insert: {
          alert_frequency?: string
          created_at?: string
          filters: SavedSearchFilters
          id?: string
          last_alerted_at?: string
          unsubscribe_token?: string
          user_id: string
        }
        Update: {
          alert_frequency?: string
          created_at?: string
          filters?: SavedSearchFilters
          id?: string
          last_alerted_at?: string
          unsubscribe_token?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          resume_uploaded_at: string | null
          resume_url: string | null
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          resume_uploaded_at?: string | null
          resume_url?: string | null
          role: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          resume_uploaded_at?: string | null
          resume_url?: string | null
          role?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_employer_response_rates: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      claim_external_job: {
        Args: {
          p_employer_id: string
          p_token_hash: string
        }
        Returns: string
      }
      create_sourced_job: {
        Args: {
          p_admin_id: string
          p_category: string | null
          p_claim_token_hash: string
          p_contact_email: string
          p_description: string
          p_external_company_name: string
          p_location: string
          p_salary_max: number | null
          p_salary_min: number | null
          p_source_url: string
          p_title: string
          p_work_type: string
        }
        Returns: string
      }
      get_external_jobs_to_notify: {
        Args: {
          p_limit: number
        }
        Returns: {
          applicant_count: number
          contact_email: string
          external_company_name: string | null
          job_id: string
          notify_count: number
          title: string
        }[]
      }
      get_application_notification_details: {
        Args: {
          p_application_id: string
        }
        Returns: {
          company_name: string
          employer_email: string
          job_title: string
          seeker_email: string | null
        }[]
      }
      save_saved_search: {
        Args: {
          p_alert_frequency: string
          p_filters: Json
        }
        Returns: string
      }
      submit_application: {
        Args: {
          p_consent: boolean
          p_cover_letter: string | null
          p_job_id: string
          p_seeker_id: string
        }
        Returns: string
      }
      set_saved_search_alert: {
        Args: {
          p_alert_frequency: string
          p_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
