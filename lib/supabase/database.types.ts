// Database types for Supabase
// These types match the SQL schema defined in the migrations

export type OrderStatus = 'pending' | 'arrived' | 'delivered'
export type DeliveryType = 'on-site' | 'delivery'

export interface OrderItem {
  id: string
  order_id: string
  name: string
  quantity: number
  is_delivered: boolean
  created_at: string
}

export interface Order {
  id: string
  order_number: string
  customer_name: string
  status: OrderStatus
  estimated_arrival: string | null
  arrived_at: string | null
  wait_time: number | null
  delivery_type: DeliveryType
  address: string | null
  total_amount: number
  amount_paid: number
  created_at: string
  updated_at: string
}

export interface OrderWithItems extends Order {
  items: Pick<OrderItem, 'id' | 'name' | 'quantity'>[]
}

// Supabase Database type definition
export interface Database {
  public: {
    Tables: {
      orders: {
        Row: Order
        Insert: Omit<Order, 'id' | 'order_number' | 'created_at' | 'updated_at'> & {
          id?: string
          order_number?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Order, 'id' | 'order_number' | 'created_at'>>
      }
      order_items: {
        Row: OrderItem
        Insert: Omit<OrderItem, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<OrderItem, 'id' | 'order_id' | 'created_at'>>
      }
    }
    Views: {
      orders_with_items: {
        Row: OrderWithItems
      }
    }
    Functions: {
      create_order_with_items: {
        Args: {
          p_customer_name: string
          p_delivery_type: DeliveryType
          p_estimated_arrival?: string | null
          p_address?: string | null
          p_items?: { name: string; quantity: number }[]
        }
        Returns: OrderWithItems
      }
      mark_order_arrived: {
        Args: { p_order_id: string }
        Returns: OrderWithItems
      }
      mark_order_delivered: {
        Args: { p_order_id: string }
        Returns: OrderWithItems
      }
      get_order_with_items: {
        Args: { p_order_id: string }
        Returns: OrderWithItems
      }
      get_products_aggregate: {
        Args: Record<string, never>
        Returns: { name: string; quantity: number }[]
      }
      get_orders_stats: {
        Args: Record<string, never>
        Returns: {
          total_orders: number
          pending_orders: number
          arrived_orders: number
          delivered_orders: number
          delivery_orders: number
          onsite_orders: number
          avg_wait_time: number | null
        }
      }
    }
  }
}

