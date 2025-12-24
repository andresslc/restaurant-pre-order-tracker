"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"

export type OrderStatus = "pending" | "arrived" | "delivered"
export type DeliveryType = "on-site" | "delivery"

export interface Order {
  id: string
  dbId?: string // Database UUID
  customerName: string
  items: { name: string; quantity: number }[]
  status: OrderStatus
  estimatedArrival?: string
  arrivedAt?: number
  waitTime?: number
  deliveryType: DeliveryType
  address?: string
  totalAmount: number
  amountPaid: number
}

interface OrdersContextType {
  orders: Order[]
  isLoading: boolean
  error: string | null
  addOrder: (order: Omit<Order, "id">) => Promise<void>
  markArrived: (orderId: string) => Promise<void>
  markDelivered: (orderId: string) => Promise<void>
  addPayment: (orderId: string, amount: number) => Promise<void>
  updateOrder: (orderId: string, updates: Partial<Order>) => Promise<void>
  deleteOrder: (orderId: string) => Promise<void>
  refreshOrders: () => Promise<void>
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined)

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all orders from the API
  const refreshOrders = useCallback(async () => {
    try {
      setError(null)
      const response = await fetch('/api/orders')
      
      if (!response.ok) {
        throw new Error('Failed to fetch orders')
      }
      
      const data = await response.json()
      setOrders(data)
    } catch (err) {
      console.error('Error fetching orders:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch orders')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    refreshOrders()
  }, [refreshOrders])

  // Add a new order
  const addOrder = async (order: Omit<Order, "id">) => {
    try {
      setError(null)
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(order),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create order')
      }

      const newOrder = await response.json()
      setOrders((prev) => [newOrder, ...prev])
    } catch (err) {
      console.error('Error adding order:', err)
      setError(err instanceof Error ? err.message : 'Failed to add order')
      throw err
    }
  }

  // Mark order as arrived
  const markArrived = async (orderId: string) => {
    try {
      setError(null)
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/arrived`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to mark order as arrived')
      }

      const updatedOrder = await response.json()
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId ? updatedOrder : order
        )
      )
    } catch (err) {
      console.error('Error marking order as arrived:', err)
      setError(err instanceof Error ? err.message : 'Failed to mark order as arrived')
      throw err
    }
  }

  // Mark order as delivered
  const markDelivered = async (orderId: string) => {
    try {
      setError(null)
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/delivered`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to mark order as delivered')
      }

      const updatedOrder = await response.json()
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId ? updatedOrder : order
        )
      )
    } catch (err) {
      console.error('Error marking order as delivered:', err)
      setError(err instanceof Error ? err.message : 'Failed to mark order as delivered')
      throw err
    }
  }

  // Add payment to order
  const addPayment = async (orderId: string, amount: number) => {
    try {
      setError(null)
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add payment')
      }

      const updatedOrder = await response.json()
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId ? updatedOrder : order
        )
      )
    } catch (err) {
      console.error('Error adding payment:', err)
      setError(err instanceof Error ? err.message : 'Failed to add payment')
      throw err
    }
  }

  // Update an order
  const updateOrder = async (orderId: string, updates: Partial<Order>) => {
    try {
      setError(null)
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update order')
      }

      const updatedOrder = await response.json()
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId ? updatedOrder : order
        )
      )
    } catch (err) {
      console.error('Error updating order:', err)
      setError(err instanceof Error ? err.message : 'Failed to update order')
      throw err
    }
  }

  // Delete an order
  const deleteOrder = async (orderId: string) => {
    try {
      setError(null)
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete order')
      }

      setOrders((prevOrders) => prevOrders.filter((order) => order.id !== orderId))
    } catch (err) {
      console.error('Error deleting order:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete order')
      throw err
    }
  }

  return (
    <OrdersContext.Provider
      value={{
        orders,
        isLoading,
        error,
        addOrder,
        markArrived,
        markDelivered,
        addPayment,
        updateOrder,
        deleteOrder,
        refreshOrders,
      }}
    >
      {children}
    </OrdersContext.Provider>
  )
}

export function useOrders() {
  const context = useContext(OrdersContext)
  if (context === undefined) {
    throw new Error("useOrders must be used within an OrdersProvider")
  }
  return context
}
