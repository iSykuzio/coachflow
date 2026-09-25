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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assigned_workouts: {
        Row: {
          assigned_date: string
          client_id: string
          created_at: string
          due_date: string | null
          id: string
          status: string
          trainer_id: string
          workout_id: string
        }
        Insert: {
          assigned_date?: string
          client_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          status?: string
          trainer_id: string
          workout_id: string
        }
        Update: {
          assigned_date?: string
          client_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          status?: string
          trainer_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assigned_workouts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assigned_workouts_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assigned_workouts_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      client_invitations: {
        Row: {
          accepted_at: string | null
          accepted_client_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          status: string
          trainer_id: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_client_id?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          status?: string
          trainer_id: string
        }
        Update: {
          accepted_at?: string | null
          accepted_client_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          status?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_invitations_accepted_client_id_fkey"
            columns: ["accepted_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invitations_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          id: string
          notes: string | null
        }
        Insert: {
          created_at?: string
          id: string
          notes?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          category: string | null
          created_at: string
          equipment: string | null
          id: string
          instructions: string | null
          is_custom: boolean
          muscle_group: string | null
          name: string
          trainer_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          equipment?: string | null
          id?: string
          instructions?: string | null
          is_custom?: boolean
          muscle_group?: string | null
          name: string
          trainer_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          equipment?: string | null
          id?: string
          instructions?: string | null
          is_custom?: boolean
          muscle_group?: string | null
          name?: string
          trainer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          client_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
          trainer_id: string
        }
        Insert: {
          body: string
          client_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
          trainer_id: string
        }
        Update: {
          body?: string
          client_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          role: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      set_logs: {
        Row: {
          completed_at: string | null
          id: string
          notes: string | null
          reps: number | null
          set_number: number
          weight: number | null
          workout_exercise_id: string
          workout_session_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          notes?: string | null
          reps?: number | null
          set_number: number
          weight?: number | null
          workout_exercise_id: string
          workout_session_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          notes?: string | null
          reps?: number | null
          set_number?: number
          weight?: number | null
          workout_exercise_id?: string
          workout_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "set_logs_workout_exercise_id_fkey"
            columns: ["workout_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_logs_workout_session_id_fkey"
            columns: ["workout_session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_clients: {
        Row: {
          client_id: string
          created_at: string
          id: string
          status: string
          trainer_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          status?: string
          trainer_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          status?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainer_clients_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
        ]
      }
      trainers: {
        Row: {
          bio: string | null
          business_name: string | null
          created_at: string
          id: string
        }
        Insert: {
          bio?: string | null
          business_name?: string | null
          created_at?: string
          id: string
        }
        Update: {
          bio?: string | null
          business_name?: string | null
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainers_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_exercises: {
        Row: {
          exercise_id: string
          id: string
          notes: string | null
          order_index: number
          reps: string
          rest_seconds: number | null
          sets: number
          weight: string | null
          workout_id: string
        }
        Insert: {
          exercise_id: string
          id?: string
          notes?: string | null
          order_index?: number
          reps: string
          rest_seconds?: number | null
          sets: number
          weight?: string | null
          workout_id: string
        }
        Update: {
          exercise_id?: string
          id?: string
          notes?: string | null
          order_index?: number
          reps?: string
          rest_seconds?: number | null
          sets?: number
          weight?: string | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          assigned_workout_id: string
          client_id: string
          completed_at: string | null
          id: string
          started_at: string
          status: string
        }
        Insert: {
          assigned_workout_id: string
          client_id: string
          completed_at?: string | null
          id?: string
          started_at?: string
          status?: string
        }
        Update: {
          assigned_workout_id?: string
          client_id?: string
          completed_at?: string | null
          id?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_assigned_workout_id_fkey"
            columns: ["assigned_workout_id"]
            isOneToOne: false
            referencedRelation: "assigned_workouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workouts_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_client_invitation: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      accept_pending_invitations: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      invite_client: {
        Args: { p_email: string; p_full_name: string }
        Returns: {
          accepted_at: string | null
          accepted_client_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          status: string
          trainer_id: string
        }
      }
      is_client_of: {
        Args: { p_trainer_id: string }
        Returns: boolean
      }
      is_trainer_of: {
        Args: { p_client_id: string }
        Returns: boolean
      }
      list_my_pending_invitations: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          id: string
          trainer_id: string
          trainer_name: string
        }[]
      }
      assign_workout: {
        Args: {
          p_client_id: string
          p_due_date?: string | null
          p_workout_id: string
        }
        Returns: {
          assigned_date: string
          client_id: string
          created_at: string
          due_date: string | null
          id: string
          status: string
          trainer_id: string
          workout_id: string
        }
      }
      complete_workout_session: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      start_or_get_workout_session: {
        Args: { p_assigned_workout_id: string }
        Returns: {
          assigned_workout_id: string
          client_id: string
          completed_at: string | null
          id: string
          started_at: string
          status: string
        }
      }
      save_workout_set: {
        Args: {
          p_assigned_workout_id: string
          p_notes?: string | null
          p_reps?: number | null
          p_set_number: number
          p_weight?: number | null
          p_workout_exercise_id: string
        }
        Returns: {
          id: string
          notes: string | null
          reps: number | null
          set_number: number
          weight: number | null
          workout_exercise_id: string
          workout_session_id: string
        }
      }
      get_my_assignment_progress: {
        Args: { p_assigned_workout_id: string }
        Returns: {
          logs: {
            notes: string | null
            reps: number | null
            set_number: number
            weight: number | null
            workout_exercise_id: string
          }[]
          session_id: string | null
          session_status: string | null
        }
      }
      list_my_completed_sessions: {
        Args: Record<PropertyKey, never>
        Returns: {
          assigned_workout_id: string
          completed_at: string | null
          session_id: string
          workout_name: string
        }[]
      }
      list_client_workout_results: {
        Args: { p_client_id: string }
        Returns: {
          assigned_date: string
          assignment_id: string
          assignment_status: string
          due_date: string | null
          sessions: {
            completed_at: string | null
            session_id: string
            sets: {
              exercise_name: string
              notes: string | null
              reps: number | null
              set_number: number
              weight: number | null
            }[]
            started_at: string
            status: string
          }[]
          workout_name: string
        }[]
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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    Enums: {},
  },
} as const
