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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      assets: {
        Row: {
          asset_type: string
          category: string
          code: string
          created_at: string
          created_by: string | null
          health_score: number
          id: string
          last_inspection: string | null
          make: string
          model: string
          name: string
          next_inspection: string | null
          odometer: number | null
          organization_id: string
          plate_number: string
          serial: string
          site: string
          status: string
          vin: string
          year: number | null
        }
        Insert: {
          asset_type?: string
          category?: string
          code?: string
          created_at?: string
          created_by?: string | null
          health_score?: number
          id?: string
          last_inspection?: string | null
          make?: string
          model?: string
          name: string
          next_inspection?: string | null
          odometer?: number | null
          organization_id: string
          plate_number?: string
          serial?: string
          site?: string
          status?: string
          vin?: string
          year?: number | null
        }
        Update: {
          asset_type?: string
          category?: string
          code?: string
          created_at?: string
          created_by?: string | null
          health_score?: number
          id?: string
          last_inspection?: string | null
          make?: string
          model?: string
          name?: string
          next_inspection?: string | null
          odometer?: number | null
          organization_id?: string
          plate_number?: string
          serial?: string
          site?: string
          status?: string
          vin?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_users: {
        Row: {
          blocked_at: string
          reason: string
          user_id: string
        }
        Insert: {
          blocked_at?: string
          reason?: string
          user_id: string
        }
        Update: {
          blocked_at?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      company_join_codes: {
        Row: {
          code: string
          organization_id: string
        }
        Insert: {
          code?: string
          organization_id: string
        }
        Update: {
          code?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_join_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          asset_id: string | null
          asset_name: string
          checklist: Json | null
          code: string
          created_at: string
          created_by: string | null
          findings: string
          findings_count: number
          health_score: number | null
          id: string
          inspected_on: string
          inspector_name: string
          odometer: number | null
          organization_id: string
          photos: string[]
          report: Json | null
          result: string
          source: string
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          asset_id?: string | null
          asset_name: string
          checklist?: Json | null
          code?: string
          created_at?: string
          created_by?: string | null
          findings?: string
          findings_count?: number
          health_score?: number | null
          id?: string
          inspected_on?: string
          inspector_name?: string
          odometer?: number | null
          organization_id: string
          photos?: string[]
          report?: Json | null
          result: string
          source?: string
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          asset_id?: string | null
          asset_name?: string
          checklist?: Json | null
          code?: string
          created_at?: string
          created_by?: string | null
          findings?: string
          findings_count?: number
          health_score?: number | null
          id?: string
          inspected_on?: string
          inspector_name?: string
          odometer?: number | null
          organization_id?: string
          photos?: string[]
          report?: Json | null
          result?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspections_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
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
          notes: string
          plan: string
          status: string
          subscription_ends_at: string | null
          subscription_status: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string
          plan?: string
          status?: string
          subscription_ends_at?: string | null
          subscription_status?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string
          plan?: string
          status?: string
          subscription_ends_at?: string | null
          subscription_status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          job_title: string
        }
        Insert: {
          created_at?: string
          email?: string
          full_name?: string
          id: string
          job_title?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          job_title?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_orgs: {
        Args: never
        Returns: {
          assets: number
          created_at: string
          id: string
          inspections: number
          members: number
          name: string
          notes: string
          owner_email: string
          plan: string
          status: string
          subscription_ends_at: string
          subscription_status: string
        }[]
      }
      admin_list_users: {
        Args: never
        Returns: {
          blocked: boolean
          created_at: string
          email: string
          full_name: string
          is_super_admin: boolean
          job_title: string
          last_sign_in_at: string
          organization_id: string
          organization_name: string
          role: string
          user_id: string
        }[]
      }
      admin_set_user_blocked: {
        Args: { _blocked: boolean; _user: string }
        Returns: undefined
      }
      admin_update_org: {
        Args: {
          _ends: string
          _notes: string
          _org: string
          _plan: string
          _status: string
          _subscription_status: string
        }
        Returns: undefined
      }
      approve_company_inspection: {
        Args: { _inspection: string }
        Returns: undefined
      }
      create_company_account: { Args: { _name: string }; Returns: string }
      ensure_account: { Args: never; Returns: string }
      ensure_platform_admin: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_admin: { Args: never; Returns: boolean }
      is_org_owner: { Args: never; Returns: boolean }
      join_company: { Args: { _code: string }; Returns: string }
      my_access_state: { Args: never; Returns: string }
      rotate_company_code: { Args: never; Returns: string }
      set_company_member_role: {
        Args: { _role: Database["public"]["Enums"]["org_role"]; _user: string }
        Returns: undefined
      }
      user_org_id: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "super_admin"
      org_role: "owner" | "admin" | "member"
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
  public: {
    Enums: {
      app_role: ["super_admin"],
      org_role: ["owner", "admin", "member"],
    },
  },
} as const
