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
          amount: number
          balance_after: number | null
          cari_id: string
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
          amount: number
          balance_after?: number | null
          cari_id: string
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
          amount?: number
          balance_after?: number | null
          cari_id?: string
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
          tax_office: string | null
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
          tax_office?: string | null
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
          tax_office?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      funnel_events: {
        Row: {
          code: string | null
          created_at: string
          id: string
          name: string
          props: Json | null
          ref: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          name: string
          props?: Json | null
          ref?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          props?: Json | null
          ref?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
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
          delivery_address: string
          delivery_date: string
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_method: string
          delivery_time_window: string | null
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
          delivery_address: string
          delivery_date: string
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_method?: string
          delivery_time_window?: string | null
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
          delivery_address?: string
          delivery_date?: string
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_method?: string
          delivery_time_window?: string | null
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
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role_type"]
          updated_at?: string | null
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
