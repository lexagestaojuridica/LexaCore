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
      clients: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          birth_date: string | null
          client_type: string | null
          company_name: string | null
          company_position: string | null
          created_at: string
          document: string | null
          email: string | null
          gender: string | null
          id: string
          marital_status: string | null
          name: string
          nationality: string | null
          notes: string | null
          organization_id: string
          phone: string | null
          profession: string | null
          rg: string | null
          secondary_email: string | null
          secondary_phone: string | null
          updated_at: string
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          birth_date?: string | null
          client_type?: string | null
          company_name?: string | null
          company_position?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          marital_status?: string | null
          name: string
          nationality?: string | null
          notes?: string | null
          organization_id: string
          phone?: string | null
          profession?: string | null
          rg?: string | null
          secondary_email?: string | null
          secondary_phone?: string | null
          updated_at?: string
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          birth_date?: string | null
          client_type?: string | null
          company_name?: string | null
          company_position?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          gender?: string | null
          id?: string
          marital_status?: string | null
          name?: string
          nationality?: string | null
          notes?: string | null
          organization_id?: string
          phone?: string | null
          profession?: string | null
          rg?: string | null
          secondary_email?: string | null
          secondary_phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_pagar: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          description: string
          due_date: string
          id: string
          organization_id: string
          status: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          description: string
          due_date: string
          id?: string
          organization_id: string
          status?: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          organization_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_pagar_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_receber: {
        Row: {
          amount: number
          category: string | null
          client_id: string | null
          created_at: string
          description: string
          due_date: string
          id: string
          organization_id: string
          process_id: string | null
          status: string
        }
        Insert: {
          amount: number
          category?: string | null
          client_id?: string | null
          created_at?: string
          description: string
          due_date: string
          id?: string
          organization_id: string
          process_id?: string | null
          status?: string
        }
        Update: {
          amount?: number
          category?: string | null
          client_id?: string | null
          created_at?: string
          description?: string
          due_date?: string
          id?: string
          organization_id?: string
          process_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "contas_receber_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processos_juridicos"
            referencedColumns: ["id"]
          },
        ]
      }
      conversas_ia: {
        Row: {
          content: string
          created_at: string
          id: string
          organization_id: string
          process_id: string | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          organization_id: string
          process_id?: string | null
          role?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          organization_id?: string
          process_id?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversas_ia_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversas_ia_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processos_juridicos"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          client_id: string | null
          created_at: string
          file_name: string
          file_path: string
          file_type: string | null
          id: string
          organization_id: string
          process_id: string | null
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          file_name: string
          file_path: string
          file_type?: string | null
          id?: string
          organization_id: string
          process_id?: string | null
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          file_type?: string | null
          id?: string
          organization_id?: string
          process_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processos_juridicos"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_agenda: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          end_time: string
          id: string
          organization_id: string
          process_id: string | null
          start_time: string
          title: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          end_time: string
          id?: string
          organization_id: string
          process_id?: string | null
          start_time: string
          title: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          end_time?: string
          id?: string
          organization_id?: string
          process_id?: string | null
          start_time?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_agenda_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_agenda_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processos_juridicos"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_tokens: {
        Row: {
          access_token: string
          calendar_id: string | null
          created_at: string
          id: string
          last_sync_at: string | null
          organization_id: string
          refresh_token: string
          sync_enabled: boolean | null
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          calendar_id?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          organization_id: string
          refresh_token: string
          sync_enabled?: boolean | null
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          calendar_id?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          organization_id?: string
          refresh_token?: string
          sync_enabled?: boolean | null
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_auditoria: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          organization_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          organization_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          organization_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_auditoria_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          features: Json | null
          id: string
          max_processes: number | null
          max_users: number
          name: string
          price_cents: number
        }
        Insert: {
          created_at?: string
          features?: Json | null
          id?: string
          max_processes?: number | null
          max_users?: number
          name: string
          price_cents?: number
        }
        Update: {
          created_at?: string
          features?: Json | null
          id?: string
          max_processes?: number | null
          max_users?: number
          name?: string
          price_cents?: number
        }
        Relationships: []
      }
      processos_juridicos: {
        Row: {
          client_id: string | null
          court: string | null
          created_at: string
          estimated_value: number | null
          id: string
          notes: string | null
          number: string | null
          organization_id: string
          responsible_user_id: string | null
          status: string
          subject: string | null
          title: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          court?: string | null
          created_at?: string
          estimated_value?: number | null
          id?: string
          notes?: string | null
          number?: string | null
          organization_id: string
          responsible_user_id?: string | null
          status?: string
          subject?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          court?: string | null
          created_at?: string
          estimated_value?: number | null
          id?: string
          notes?: string | null
          number?: string | null
          organization_id?: string
          responsible_user_id?: string | null
          status?: string
          subject?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "processos_juridicos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_juridicos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          organization_id: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
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
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          organization_id: string
          plan_id: string
          status: string
          trial_ends_at: string | null
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id: string
          plan_id: string
          status?: string
          trial_ends_at?: string | null
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id?: string
          plan_id?: string
          status?: string
          trial_ends_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_org_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _org_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_member_of_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "advogado" | "estagiario" | "financeiro"
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
      app_role: ["admin", "advogado", "estagiario", "financeiro"],
    },
  },
} as const
