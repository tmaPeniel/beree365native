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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      badges: {
        Row: {
          color: string
          created_at: string
          criteria: Json
          description: string
          icon: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          criteria: Json
          description: string
          icon: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          criteria?: Json
          description?: string
          icon?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      daily_verses: {
        Row: {
          day_number: number
          id: string
          reference: string
          text: string
          wisdomType: string | null
        }
        Insert: {
          day_number: number
          id?: string
          reference: string
          text: string
          wisdomType?: string | null
        }
        Update: {
          day_number?: number
          id?: string
          reference?: string
          text?: string
          wisdomType?: string | null
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          body: string
          error_message: string | null
          id: string
          is_deleted: boolean | null
          is_read: boolean | null
          notification_type: string
          onesignal_notification_id: string | null
          onesignal_player_id: string | null
          read_at: string | null
          sent_at: string
          success: boolean
          title: string
          user_id: string
        }
        Insert: {
          body: string
          error_message?: string | null
          id?: string
          is_deleted?: boolean | null
          is_read?: boolean | null
          notification_type: string
          onesignal_notification_id?: string | null
          onesignal_player_id?: string | null
          read_at?: string | null
          sent_at?: string
          success?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
          error_message?: string | null
          id?: string
          is_deleted?: boolean | null
          is_read?: boolean | null
          notification_type?: string
          onesignal_notification_id?: string | null
          onesignal_player_id?: string | null
          read_at?: string | null
          sent_at?: string
          success?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          badge_encouragement_enabled: boolean
          created_at: string
          daily_verse_enabled: boolean
          daily_verse_time: string
          id: string
          reading_reminder_enabled: boolean
          reading_reminder_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          badge_encouragement_enabled?: boolean
          created_at?: string
          daily_verse_enabled?: boolean
          daily_verse_time?: string
          id?: string
          reading_reminder_enabled?: boolean
          reading_reminder_time?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          badge_encouragement_enabled?: boolean
          created_at?: string
          daily_verse_enabled?: boolean
          daily_verse_time?: string
          id?: string
          reading_reminder_enabled?: boolean
          reading_reminder_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          current_day_number: number
          device_platform: string | null
          device_token: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          last_login_at: string | null
          onesignal_player_id: string | null
          selected_plan_id: string
          start_date: string | null
        }
        Insert: {
          created_at?: string | null
          current_day_number?: number
          device_platform?: string | null
          device_token?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          last_login_at?: string | null
          onesignal_player_id?: string | null
          selected_plan_id: string
          start_date?: string | null
        }
        Update: {
          created_at?: string | null
          current_day_number?: number
          device_platform?: string | null
          device_token?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login_at?: string | null
          onesignal_player_id?: string | null
          selected_plan_id?: string
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_selected_plan"
            columns: ["selected_plan_id"]
            isOneToOne: false
            referencedRelation: "reading_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_plan_chapters: {
        Row: {
          day_number: number
          description: string | null
          id: string
          plan_id: string
          reference: string
        }
        Insert: {
          day_number: number
          description?: string | null
          id?: string
          plan_id: string
          reference: string
        }
        Update: {
          day_number?: number
          description?: string | null
          id?: string
          plan_id?: string
          reference?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_reading_plan_chapters_plan"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "reading_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_plans: {
        Row: {
          created_at: string
          description: string | null
          duration_days: number
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          created_at: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          badge_id: string
          created_at?: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          created_at?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_devices: {
        Row: {
          created_at: string | null
          device_platform: string | null
          device_token: string | null
          id: string
          is_active: boolean | null
          last_seen_at: string | null
          onesignal_player_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_platform?: string | null
          device_token?: string | null
          id?: string
          is_active?: boolean | null
          last_seen_at?: string | null
          onesignal_player_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_platform?: string | null
          device_token?: string | null
          id?: string
          is_active?: boolean | null
          last_seen_at?: string | null
          onesignal_player_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          chapter_id: string | null
          completed_at: string | null
          id: string
          status: Database["public"]["Enums"]["chapter_status"] | null
          user_id: string | null
        }
        Insert: {
          chapter_id?: string | null
          completed_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["chapter_status"] | null
          user_id?: string | null
        }
        Update: {
          chapter_id?: string | null
          completed_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["chapter_status"] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "reading_plan_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      calculate_user_badges: { Args: { _user_id: string }; Returns: undefined }
      change_user_plan: { Args: { new_plan_id: string }; Returns: undefined }
      get_completed_days_count: { Args: { p_user_id: string }; Returns: number }
      get_user_notification_history: {
        Args: never
        Returns: {
          id: string
          notification_type: string
          sent_at: string
          status_message: string
          success: boolean
        }[]
      }
      get_user_push_subscription_status: {
        Args: never
        Returns: {
          created_at: string
          endpoint_preview: string
          id: string
          is_active: boolean
        }[]
      }
      get_user_stats: {
        Args: never
        Returns: {
          completed_chapters_count: number
          email: string
          full_name: string
          is_active: boolean
          last_login_at: string
          start_date: string
          total_days_completed: number
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_user_active: {
        Args: { days_threshold?: number; p_user_id: string }
        Returns: boolean
      }
      sync_current_day_numbers: { Args: never; Returns: undefined }
      update_user_activity: { Args: { p_user_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
      chapter_status: "pending" | "completed"
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
      app_role: ["admin", "user"],
      chapter_status: ["pending", "completed"],
    },
  },
} as const
