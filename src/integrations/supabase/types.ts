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
      appointments: {
        Row: {
          chair_id: string | null
          created_at: string
          created_by: string
          doctor_id: string | null
          ends_at: string
          id: string
          notes: string | null
          patient_id: string
          reason: string | null
          starts_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          chair_id?: string | null
          created_at?: string
          created_by: string
          doctor_id?: string | null
          ends_at: string
          id?: string
          notes?: string | null
          patient_id: string
          reason?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          chair_id?: string | null
          created_at?: string
          created_by?: string
          doctor_id?: string | null
          ends_at?: string
          id?: string
          notes?: string | null
          patient_id?: string
          reason?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_chair_id_fkey"
            columns: ["chair_id"]
            isOneToOne: false
            referencedRelation: "chairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          at: string
          id: string
          record_id: string | null
          summary: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          at?: string
          id?: string
          record_id?: string | null
          summary?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          at?: string
          id?: string
          record_id?: string | null
          summary?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      booking_requests: {
        Row: {
          created_at: string
          full_name: string
          handled_by: string | null
          id: string
          notes: string | null
          phone: string
          preferred_date: string | null
          preferred_time: string | null
          reason: string | null
          status: string
        }
        Insert: {
          created_at?: string
          full_name: string
          handled_by?: string | null
          id?: string
          notes?: string | null
          phone: string
          preferred_date?: string | null
          preferred_time?: string | null
          reason?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          handled_by?: string | null
          id?: string
          notes?: string | null
          phone?: string
          preferred_date?: string | null
          preferred_time?: string | null
          reason?: string | null
          status?: string
        }
        Relationships: []
      }
      branches: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      chairs: {
        Row: {
          branch_id: string | null
          color: string
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          branch_id?: string | null
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          branch_id?: string | null
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "chairs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_cases: {
        Row: {
          after_path: string
          after_url: string
          before_path: string
          before_url: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          sort_order: number
          title: string
        }
        Insert: {
          after_path: string
          after_url: string
          before_path: string
          before_url: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          sort_order?: number
          title: string
        }
        Update: {
          after_path?: string
          after_url?: string
          before_path?: string
          before_url?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      clinic_gallery: {
        Row: {
          caption: string | null
          created_at: string
          created_by: string | null
          id: string
          image_url: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: []
      }
      clinic_settings: {
        Row: {
          accent_color: string
          address: string | null
          card_style: string
          clinic_name: string
          email: string | null
          font_family: string
          hero_image_url: string | null
          id: string
          interface_density: string
          logo_url: string | null
          opening_hours: string | null
          phone: string | null
          primary_color: string
          public_description: string | null
          public_services: string | null
          public_style: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          accent_color?: string
          address?: string | null
          card_style?: string
          clinic_name?: string
          email?: string | null
          font_family?: string
          hero_image_url?: string | null
          id?: string
          interface_density?: string
          logo_url?: string | null
          opening_hours?: string | null
          phone?: string | null
          primary_color?: string
          public_description?: string | null
          public_services?: string | null
          public_style?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          accent_color?: string
          address?: string | null
          card_style?: string
          clinic_name?: string
          email?: string | null
          font_family?: string
          hero_image_url?: string | null
          id?: string
          interface_density?: string
          logo_url?: string | null
          opening_hours?: string | null
          phone?: string | null
          primary_color?: string
          public_description?: string | null
          public_services?: string | null
          public_style?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      dental_chart_entries: {
        Row: {
          color: string
          condition: string
          created_at: string
          id: string
          patient_id: string
          recorded_by: string
          tooth_number: number
          treatment: string | null
        }
        Insert: {
          color?: string
          condition: string
          created_at?: string
          id?: string
          patient_id: string
          recorded_by: string
          tooth_number: number
          treatment?: string | null
        }
        Update: {
          color?: string
          condition?: string
          created_at?: string
          id?: string
          patient_id?: string
          recorded_by?: string
          tooth_number?: number
          treatment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dental_chart_entries_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_shares: {
        Row: {
          doctor_id: string
          percent: number
          updated_at: string
        }
        Insert: {
          doctor_id: string
          percent?: number
          updated_at?: string
        }
        Update: {
          doctor_id?: string
          percent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_shares_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_settings: {
        Row: {
          clinic_share_percent: number
          id: boolean
          materials_share_percent: number
          updated_at: string
        }
        Insert: {
          clinic_share_percent?: number
          id?: boolean
          materials_share_percent?: number
          updated_at?: string
        }
        Update: {
          clinic_share_percent?: number
          id?: boolean
          materials_share_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          min_quantity: number
          name: string
          quantity: number
          unit: string
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          min_quantity?: number
          name: string
          quantity?: number
          unit?: string
          unit_cost?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          min_quantity?: number
          name?: string
          quantity?: number
          unit?: string
          unit_cost?: number
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string
          id: string
          item_id: string
          kind: string
          note: string | null
          quantity: number
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          item_id: string
          kind: string
          note?: string | null
          quantity: number
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          item_id?: string
          kind?: string
          note?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          description: string
          id: string
          invoice_id: string
          quantity: number
          total: number
          unit_price: number
        }
        Insert: {
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          total?: number
          unit_price?: number
        }
        Update: {
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          created_by: string
          discount: number
          doctor_id: string | null
          id: string
          invoice_number: string
          issued_at: string
          notes: string | null
          paid: number
          patient_id: string
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          total: number
        }
        Insert: {
          created_at?: string
          created_by: string
          discount?: number
          doctor_id?: string | null
          id?: string
          invoice_number: string
          issued_at?: string
          notes?: string | null
          paid?: number
          patient_id: string
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          total?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          discount?: number
          doctor_id?: string | null
          id?: string
          invoice_number?: string
          issued_at?: string
          notes?: string | null
          paid?: number
          patient_id?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_files: {
        Row: {
          created_at: string
          file_name: string
          id: string
          kind: string
          note: string | null
          patient_id: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          kind?: string
          note?: string | null
          patient_id: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          kind?: string
          note?: string | null
          patient_id?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_files_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          allergies: string | null
          branch_id: string | null
          chronic_diseases: string | null
          created_at: string
          created_by: string
          date_of_birth: string | null
          file_number: string | null
          full_name: string
          gender: string | null
          id: string
          is_active: boolean
          medical_notes: string | null
          phone: string | null
          surgeries: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          allergies?: string | null
          branch_id?: string | null
          chronic_diseases?: string | null
          created_at?: string
          created_by: string
          date_of_birth?: string | null
          file_number?: string | null
          full_name: string
          gender?: string | null
          id?: string
          is_active?: boolean
          medical_notes?: string | null
          phone?: string | null
          surgeries?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          allergies?: string | null
          branch_id?: string | null
          chronic_diseases?: string | null
          created_at?: string
          created_by?: string
          date_of_birth?: string | null
          file_number?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          is_active?: boolean
          medical_notes?: string | null
          phone?: string | null
          surgeries?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          id: string
          invoice_id: string
          method: string
          paid_at: string
          received_by: string
        }
        Insert: {
          amount: number
          id?: string
          invoice_id: string
          method?: string
          paid_at?: string
          received_by: string
        }
        Update: {
          amount?: number
          id?: string
          invoice_id?: string
          method?: string
          paid_at?: string
          received_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          created_at: string
          doctor_id: string
          dosage: string | null
          id: string
          instructions: string | null
          medication: string
          patient_id: string
          prescribed_at: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          dosage?: string | null
          id?: string
          instructions?: string | null
          medication: string
          patient_id: string
          prescribed_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          dosage?: string | null
          id?: string
          instructions?: string | null
          medication?: string
          patient_id?: string
          prescribed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          branch_id: string | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          specialty: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string
          full_name: string
          id: string
          is_active?: boolean
          phone?: string | null
          specialty?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          specialty?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_prices: {
        Row: {
          created_at: string
          default_price: number
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          default_price?: number
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          default_price?: number
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      treatments: {
        Row: {
          cost: number
          created_at: string
          diagnosis: string | null
          doctor_id: string
          id: string
          notes: string | null
          patient_id: string
          title: string
          tooth_numbers: string | null
          treated_at: string
        }
        Insert: {
          cost?: number
          created_at?: string
          diagnosis?: string | null
          doctor_id: string
          id?: string
          notes?: string | null
          patient_id: string
          title: string
          tooth_numbers?: string | null
          treated_at?: string
        }
        Update: {
          cost?: number
          created_at?: string
          diagnosis?: string | null
          doctor_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
          title?: string
          tooth_numbers?: string | null
          treated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
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
      can_access_patient_clinical: { Args: { _pid: string }; Returns: boolean }
      can_access_patient_file_path: {
        Args: { _path: string }
        Returns: boolean
      }
      can_manage_billing: { Args: { _uid: string }; Returns: boolean }
      cancel_invoice: { Args: { _invoice_id: string }; Returns: undefined }
      claim_initial_super_admin: {
        Args: { _full_name: string }
        Returns: boolean
      }
      create_invoice: {
        Args: {
          _discount_kind: string
          _discount_value: number
          _doctor_id: string
          _notes?: string
          _patient_id: string
          _subtotal: number
        }
        Returns: string
      }
      get_chair_occupancy: {
        Args: { _from: string; _to: string }
        Returns: {
          chair_id: string
          doctor_id: string
          ends_at: string
          starts_at: string
        }[]
      }
      get_finance_report: {
        Args: { _from: string; _to: string }
        Returns: {
          clinic_share: number
          doctor_id: string
          doctor_name: string
          doctor_share: number
          materials_share: number
          revenue: number
        }[]
      }
      get_public_clinic_cases: {
        Args: never
        Returns: {
          after_url: string
          before_url: string
          description: string
          id: string
          title: string
        }[]
      }
      get_public_clinic_settings: {
        Args: never
        Returns: {
          accent_color: string
          address: string
          clinic_name: string
          email: string
          hero_image_url: string
          logo_url: string
          opening_hours: string
          phone: string
          primary_color: string
          public_description: string
          public_services: string
          public_style: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_doctor_patient: {
        Args: { _patient_id: string; _user_id: string }
        Returns: boolean
      }
      is_non_doctor_staff: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      record_payment: {
        Args: { _amount: number; _invoice_id: string; _method?: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "doctor" | "nurse" | "receptionist"
      appointment_status:
        | "scheduled"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
      invoice_status: "draft" | "unpaid" | "partial" | "paid" | "cancelled"
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
      app_role: ["super_admin", "admin", "doctor", "nurse", "receptionist"],
      appointment_status: [
        "scheduled",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
      ],
      invoice_status: ["draft", "unpaid", "partial", "paid", "cancelled"],
    },
  },
} as const
