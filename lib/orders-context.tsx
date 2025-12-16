"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

export type OrderStatus = "pending" | "arrived" | "delivered"
export type DeliveryType = "on-site" | "delivery"

export interface Order {
  id: string
  customerName: string
  items: { name: string; quantity: number }[]
  status: OrderStatus
  estimatedArrival?: string
  arrivedAt?: number
  waitTime?: number
  deliveryType: DeliveryType
  address?: string
}

interface OrdersContextType {
  orders: Order[]
  addOrder: (order: Omit<Order, "id">) => void
  markArrived: (orderId: string) => void
  markDelivered: (orderId: string) => void
  updateOrder: (orderId: string, updates: Partial<Order>) => void
  deleteOrder: (orderId: string) => void
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined)

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([
    {
      id: "#1234",
      customerName: "John Smith",
      items: [
        { name: "Burgers", quantity: 2 },
        { name: "Coke", quantity: 1 },
      ],
      status: "pending",
      estimatedArrival: "12:30 PM",
      deliveryType: "on-site",
    },
    {
      id: "#1235",
      customerName: "Sarah Johnson",
      items: [
        { name: "Caesar Salad", quantity: 1 },
        { name: "Iced Tea", quantity: 2 },
      ],
      status: "arrived",
      estimatedArrival: "12:15 PM",
      arrivedAt: Date.now() - 125000,
      deliveryType: "on-site",
    },
    {
      id: "#1236",
      customerName: "Mike Davis",
      items: [
        { name: "Pizzas", quantity: 3 },
        { name: "Wings", quantity: 1 },
      ],
      status: "arrived",
      estimatedArrival: "12:20 PM",
      arrivedAt: Date.now() - 67000,
      deliveryType: "delivery",
      address: "123 Main St, Apt 4B",
    },
    {
      id: "#1237",
      customerName: "Emily Brown",
      items: [
        { name: "Pasta", quantity: 2 },
        { name: "Tiramisu", quantity: 1 },
      ],
      status: "delivered",
      estimatedArrival: "12:00 PM",
      waitTime: 185,
      deliveryType: "on-site",
    },
  ])

  const addOrder = (order: Omit<Order, "id">) => {
    const newOrder: Order = {
      ...order,
      id: `#${Math.floor(1000 + Math.random() * 9000)}`,
    }
    setOrders((prev) => [newOrder, ...prev])
  }

  const markArrived = (orderId: string) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.id === orderId ? { ...order, status: "arrived", arrivedAt: Date.now() } : order,
      ),
    )
  }

  const markDelivered = (orderId: string) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) => {
        if (order.id === orderId && order.arrivedAt) {
          const waitTime = Math.floor((Date.now() - order.arrivedAt) / 1000)
          return {
            ...order,
            status: "delivered",
            waitTime,
          }
        }
        return order
      }),
    )
  }

  const updateOrder = (orderId: string, updates: Partial<Order>) => {
    setOrders((prevOrders) => prevOrders.map((order) => (order.id === orderId ? { ...order, ...updates } : order)))
  }

  const deleteOrder = (orderId: string) => {
    setOrders((prevOrders) => prevOrders.filter((order) => order.id !== orderId))
  }

  return (
    <OrdersContext.Provider value={{ orders, addOrder, markArrived, markDelivered, updateOrder, deleteOrder }}>
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
