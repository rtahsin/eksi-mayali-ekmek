export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
      account_transactions: {
        Row: {
          account_id: string
          amount: number
          balance_after: number | null
          cari_id?: string | null
          created_at: string
          date: string
          delta: number
          description: string | null
          id: string
          items: Json | null
          order_id: string | null
          payment_method: string | null
          related_order_id: string | null
          reversed_by_id: string | null
          reverses_id: string | null
          slip_number: string | null
          type: string
        }
        Insert: {
          account_id: string
          amount: number
          balance_after?: number | null
          cari_id?: string | null
          created_at?: string
          date?: string
          delta: number
          description?: string | null
          id?: string
          items?: Json | null
          order_id?: string | null
          payment_method?: string | null
          related_order_id?: string | null
          reversed_by_id?: string | null
          reverses_id?: string | null
          slip_number?: string | null
          type: string
        }
        Update: {
          account_id?: string
          amount?: number
          balance_after?: number | null
          cari_id?: string | null
          created_at?: string
          date?: string
          delta?: number
          description?: string | null
          id?: string
          items?: Json | null
          order_id?: string | null
          payment_method?: string | null
          related_order_id?: string | null
          reversed_by_id?: string | null
          reverses_id?: string | null
          slip_number?: string | null
          type?: string
        }
        Relationships: []
      }
      app_migrations: {
        Row: {
          applied_at: string
          id: string
        }
        Insert: {
          applied_at?: string
          id: string
        }
        Update: {
          applied_at?: string
          id?: string
        }
        Relationships: []
      }
      bakery_settings: {
        Row: {
          created_at: string
          description: string | null
          key: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          key: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          created_at?: string
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: []
      }
      capacity_days: {
        Row: {
          bread_capacity: number
          day: string
          note: string | null
          updated_at: string
        }
        Insert: {
          bread_capacity: number
          day: string
          note?: string | null
          updated_at?: string
        }
        Update: {
          bread_capacity?: number
          day?: string
          note?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_visible: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id: string
          is_visible?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_visible?: boolean
          name?: string
        }
        Relationships: []
      }
      couriers: {
        Row: {
          created_at: string
          current_lat: number | null
          current_lng: number | null
          display_name: string
          id: string
          is_active: boolean | null
          is_on_shift: boolean | null
          location_updated_at: string | null
          phone: string
          profile_id: string | null
          updated_at: string
          vehicle_type: string | null
        }
        Insert: {
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          display_name: string
          id?: string
          is_active?: boolean | null
          is_on_shift?: boolean | null
          location_updated_at?: string | null
          phone: string
          profile_id?: string | null
          updated_at?: string
          vehicle_type?: string | null
        }
        Update: {
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          is_on_shift?: boolean | null
          location_updated_at?: string | null
          phone?: string
          profile_id?: string | null
          updated_at?: string
          vehicle_type?: string | null
        }
        Relationships: []
      }
      current_accounts: {
        Row: {
          account_type: string | null
          address: string | null
          archived_at: string | null
          balance: number
          business_name: string
          contact_person: string | null
          created_at: string
          custom_prices: Json | null
          id: string
          neighborhood: string | null
          notes: string | null
          phone: string | null
          tax_number: string | null
          updated_at: string | null
        }
        Insert: {
          account_type?: string | null
          address?: string | null
          archived_at?: string | null
          balance?: number
          business_name: string
          contact_person?: string | null
          created_at?: string
          custom_prices?: Json | null
          id?: string
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          tax_number?: string | null
          updated_at?: string | null
        }
        Update: {
          account_type?: string | null
          address?: string | null
          archived_at?: string | null
          balance?: number
          business_name?: string
          contact_person?: string | null
          created_at?: string
          custom_prices?: Json | null
          id?: string
          neighborhood?: string | null
          notes?: string | null
          phone?: string | null
          tax_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      customer_locations: {
        Row: {
          accuracy: number | null
          created_at: string
          id: string
          lat: number
          lng: number
          order_id: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          id?: string
          lat: number
          lng: number
          order_id: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          order_id?: string
        }
        Relationships: []
      }
      funnel_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          name: string
          props: Json | null
          ref: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          name?: string
          props?: Json | null
          ref?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          name?: string
          props?: Json | null
          ref?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          address_detail: string | null
          assigned_at: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cari_id: string | null
          courier_id: string | null
          courier_notes: string | null
          created_at: string
          customer_lat: number | null
          customer_lng: number | null
          customer_name: string
          delivered_at: string | null
          delivery_address: string
          delivery_date: string
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_method: string
          delivery_time_window: string | null
          district: string | null
          estimated_delivery: string | null
          id: string
          idempotency_key: string | null
          location_consent_at: string | null
          location_shared: boolean | null
          neighborhood: string | null
          order_notes: string | null
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method_type"]
          payment_status: string
          phone: string
          shipping_fee: number
          source: string
          status: Database["public"]["Enums"]["order_status_type"]
          subtotal: number
          total_amount: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address_detail?: string | null
          assigned_at?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cari_id?: string | null
          courier_id?: string | null
          courier_notes?: string | null
          created_at?: string
          customer_lat?: number | null
          customer_lng?: number | null
          customer_name: string
          delivered_at?: string | null
          delivery_address: string
          delivery_date: string
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_method?: string
          delivery_time_window?: string | null
          district?: string | null
          estimated_delivery?: string | null
          id?: string
          idempotency_key?: string | null
          location_consent_at?: string | null
          location_shared?: boolean | null
          neighborhood?: string | null
          order_notes?: string | null
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method_type"]
          payment_status?: string
          phone: string
          shipping_fee?: number
          source?: string
          status?: Database["public"]["Enums"]["order_status_type"]
          subtotal?: number
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address_detail?: string | null
          assigned_at?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cari_id?: string | null
          courier_id?: string | null
          courier_notes?: string | null
          created_at?: string
          customer_lat?: number | null
          customer_lng?: number | null
          customer_name?: string
          delivered_at?: string | null
          delivery_address?: string
          delivery_date?: string
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_method?: string
          delivery_time_window?: string | null
          district?: string | null
          estimated_delivery?: string | null
          id?: string
          idempotency_key?: string | null
          location_consent_at?: string | null
          location_shared?: boolean | null
          neighborhood?: string | null
          order_notes?: string | null
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method_type"]
          payment_status?: string
          phone?: string
          shipping_fee?: number
          source?: string
          status?: Database["public"]["Enums"]["order_status_type"]
          subtotal?: number
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: []
      }
      order_status_history: {
        Row: {
          changed_by_id: string | null
          changed_by_role: string
          created_at: string
          from_status: string | null
          id: string
          note: string | null
          order_id: string
          to_status: string
        }
        Insert: {
          changed_by_id?: string | null
          changed_by_role: string
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          order_id: string
          to_status: string
        }
        Update: {
          changed_by_id?: string | null
          changed_by_role?: string
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          order_id?: string
          to_status?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          cari_transaction_id: string | null
          collected_by: string | null
          courier_id: string | null
          created_at: string
          id: string
          method: string
          note: string | null
          order_id: string
          paid_at: string | null
          status: string
          transaction_ref: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          cari_transaction_id?: string | null
          collected_by?: string | null
          courier_id?: string | null
          created_at?: string
          id?: string
          method: string
          note?: string | null
          order_id: string
          paid_at?: string | null
          status?: string
          transaction_ref?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          cari_transaction_id?: string | null
          collected_by?: string | null
          courier_id?: string | null
          created_at?: string
          id?: string
          method?: string
          note?: string | null
          order_id?: string
          paid_at?: string | null
          status?: string
          transaction_ref?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      product_sale_dates: {
        Row: {
          created_at: string
          product_id: string
          quantity_limit: number | null
          sale_date: string
        }
        Insert: {
          created_at?: string
          product_id: string
          quantity_limit?: number | null
          sale_date: string
        }
        Update: {
          created_at?: string
          product_id?: string
          quantity_limit?: number | null
          sale_date?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          slug: string
          stock: number
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price: number
          slug: string
          stock?: number
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          slug?: string
          stock?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          last_order_at: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role_type"]
          total_orders: number | null
          total_spent: number | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          last_order_at?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role_type"]
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          last_order_at?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role_type"]
          total_orders?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rate_limit_buckets: {
        Row: {
          key: string
          timestamps: number[]
          updated_at: string
        }
        Insert: {
          key: string
          timestamps?: number[]
          updated_at?: string
        }
        Update: {
          key?: string
          timestamps?: number[]
          updated_at?: string
        }
        Relationships: []
      }
      saved_addresses: {
        Row: {
          address_detail: string
          created_at: string
          directions: string | null
          district: string
          id: string
          is_default: boolean
          neighborhood: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address_detail: string
          created_at?: string
          directions?: string | null
          district?: string
          id?: string
          is_default?: boolean
          neighborhood: string
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address_detail?: string
          created_at?: string
          directions?: string | null
          district?: string
          id?: string
          is_default?: boolean
          neighborhood?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      order_status_type:
        | "bekliyor"
        | "hazirlaniyor"
        | "firinda"
        | "kuryede"
        | "teslim_edildi"
        | "iptal"
      payment_method_type:
        | "cash_on_delivery"
        | "pos_at_door"
        | "whatsapp"
        | "online"
        | "transfer"
        | "cari"
      user_role_type:
        | "customer"
        | "staff"
        | "admin"
        | "superadmin"
        | "courier"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
