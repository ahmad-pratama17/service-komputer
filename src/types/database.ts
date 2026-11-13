import type {
  AiRole,
  InvoicePaymentMethod,
  InvoicePaymentStatus,
  NotificationType,
  OrderPhotoType,
  OrderStatus,
  ServiceCategory,
  UserRole,
} from "@/types";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string;
          phone: string | null;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string;
          phone?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          name?: string;
          phone?: string | null;
          role?: UserRole;
          updated_at?: string;
        };
        Relationships: [];
      };
      services: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          category: ServiceCategory;
          starting_price: number;
          estimated_duration: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          category?: ServiceCategory;
          starting_price?: number;
          estimated_duration?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          category?: ServiceCategory;
          starting_price?: number;
          estimated_duration?: number;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      service_orders: {
        Row: {
          id: string;
          order_number: string;
          customer_id: string;
          service_id: string | null;
          device_type: string;
          device_brand: string | null;
          device_model: string | null;
          problem_description: string;
          address: string | null;
          preferred_schedule: string | null;
          additional_notes: string | null;
          status: OrderStatus;
          diagnosis: string | null;
          estimated_cost: number | null;
          final_cost: number | null;
          admin_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number: string;
          customer_id: string;
          service_id?: string | null;
          device_type: string;
          device_brand?: string | null;
          device_model?: string | null;
          problem_description: string;
          address?: string | null;
          preferred_schedule?: string | null;
          additional_notes?: string | null;
          status?: OrderStatus;
          diagnosis?: string | null;
          estimated_cost?: number | null;
          final_cost?: number | null;
          admin_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          service_id?: string | null;
          device_type?: string;
          device_brand?: string | null;
          device_model?: string | null;
          problem_description?: string;
          address?: string | null;
          preferred_schedule?: string | null;
          additional_notes?: string | null;
          status?: OrderStatus;
          diagnosis?: string | null;
          estimated_cost?: number | null;
          final_cost?: number | null;
          admin_notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      service_order_photos: {
        Row: {
          id: string;
          order_id: string;
          storage_path: string;
          file_name: string;
          content_type: string;
          size_bytes: number;
          photo_type: OrderPhotoType;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          storage_path: string;
          file_name: string;
          content_type: string;
          size_bytes: number;
          photo_type?: OrderPhotoType;
          created_at?: string;
        };
        Update: {
          storage_path?: string;
          file_name?: string;
          content_type?: string;
          size_bytes?: number;
          photo_type?: OrderPhotoType;
        };
        Relationships: [];
      };
      order_status_history: {
        Row: {
          id: string;
          order_id: string;
          old_status: OrderStatus | null;
          new_status: OrderStatus;
          note: string | null;
          changed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          old_status?: OrderStatus | null;
          new_status: OrderStatus;
          note?: string | null;
          changed_by?: string | null;
          created_at?: string;
        };
        Update: {
          note?: string | null;
        };
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          order_id: string;
          invoice_number: string;
          description: string;
          subtotal: number;
          total: number;
          payment_status: InvoicePaymentStatus;
          payment_method: InvoicePaymentMethod;
          payment_channel: string | null;
          payment_reference: string | null;
          issued_at: string;
          due_at: string | null;
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          invoice_number: string;
          description?: string;
          subtotal?: number;
          total?: number;
          payment_status?: InvoicePaymentStatus;
          payment_method?: InvoicePaymentMethod;
          payment_channel?: string | null;
          payment_reference?: string | null;
          issued_at?: string;
          due_at?: string | null;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          description?: string;
          subtotal?: number;
          total?: number;
          payment_status?: InvoicePaymentStatus;
          payment_method?: InvoicePaymentMethod;
          payment_channel?: string | null;
          payment_reference?: string | null;
          due_at?: string | null;
          paid_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: NotificationType;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type?: NotificationType;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          is_read?: boolean;
        };
        Relationships: [];
      };
      notification_outbox: {
        Row: {
          id: string;
          user_id: string;
          event: string;
          channel: string;
          title: string;
          message: string;
          type: NotificationType;
          status: string;
          attempts: number;
          last_error: string | null;
          created_at: string;
          delivered_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          event: string;
          channel?: string;
          title: string;
          message: string;
          type?: NotificationType;
          status?: string;
          attempts?: number;
          last_error?: string | null;
          created_at?: string;
          delivered_at?: string | null;
        };
        Update: {
          status?: string;
          attempts?: number;
          last_error?: string | null;
          delivered_at?: string | null;
        };
        Relationships: [];
      };
      ai_conversations: {
        Row: {
          id: string;
          user_id: string;
          order_id: string | null;
          role: AiRole;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          order_id?: string | null;
          role: AiRole;
          message: string;
          created_at?: string;
        };
        Update: {
          order_id?: string | null;
          message?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      order_status_label: {
        Args: { p_status: OrderStatus };
        Returns: string;
      };
      payment_status_label: {
        Args: { p_status: InvoicePaymentStatus };
        Returns: string;
      };
      admin_update_order_status: {
        Args: {
          p_order_id: string;
          p_status: OrderStatus;
          p_note?: string | null;
        };
        Returns: Database["public"]["Tables"]["service_orders"]["Row"];
      };
      admin_update_order_details: {
        Args: {
          p_order_id: string;
          p_diagnosis?: string | null;
          p_estimated_cost?: number | null;
          p_final_cost?: number | null;
          p_admin_notes?: string | null;
        };
        Returns: Database["public"]["Tables"]["service_orders"]["Row"];
      };
      approve_my_order: {
        Args: { p_order_id: string };
        Returns: Database["public"]["Tables"]["service_orders"]["Row"];
      };
    };
    Enums: {
      user_role: UserRole;
      service_category: ServiceCategory;
      order_status: OrderStatus;
      payment_status: InvoicePaymentStatus;
      notification_type: NotificationType;
      order_photo_type: OrderPhotoType;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};