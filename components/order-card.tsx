"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, CheckCircle, User, MapPin } from "lucide-react"
import type { Order } from "@/lib/orders-context"

interface OrderCardProps {
  order: Order
  onMarkArrived?: (id: string) => void
  onMarkDelivered?: (id: string) => void
  showActions?: boolean
}

export function OrderCard({ order, onMarkArrived, onMarkDelivered, showActions = true }: OrderCardProps) {
  const [currentTime, setCurrentTime] = useState(Date.now())

  useEffect(() => {
    if (order.status === "arrived" && order.deliveryType === "on-site") {
      const interval = setInterval(() => {
        setCurrentTime(Date.now())
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [order.status, order.deliveryType])

  const getElapsedTime = () => {
    if (order.status === "pending") return "00:00"
    if (order.status === "delivered" && order.waitTime !== undefined) {
      const minutes = Math.floor(order.waitTime / 60)
      const seconds = order.waitTime % 60
      return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    }
    if (order.status === "arrived" && order.arrivedAt) {
      const elapsed = Math.floor((currentTime - order.arrivedAt) / 1000)
      const minutes = Math.floor(elapsed / 60)
      const seconds = elapsed % 60
      return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    }
    return "00:00"
  }

  const getStatusBadge = () => {
    switch (order.status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-neutral-700 text-neutral-300 hover:bg-neutral-700">
            Pending
          </Badge>
        )
      case "arrived":
        return <Badge className="bg-amber-600 text-white hover:bg-amber-600">Arrived</Badge>
      case "delivered":
        return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Delivered</Badge>
    }
  }

  const cardClassName =
    order.status === "arrived" ? "border-amber-500 bg-amber-950/30" : "border-neutral-800 bg-neutral-900"

  const itemsText = order.items.map((item) => `${item.quantity}x ${item.name}`).join(", ")

  return (
    <Card className={`${cardClassName} border-2 transition-colors`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-800">
              <User className="h-8 w-8 text-neutral-400" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-bold text-white">{order.id}</h3>
                {getStatusBadge()}
                {order.deliveryType === "delivery" && (
                  <Badge variant="outline" className="border-blue-600 text-blue-400">
                    <MapPin className="mr-1 h-3 w-3" />
                    Delivery
                  </Badge>
                )}
              </div>
              <p className="text-xl font-semibold text-neutral-300">{order.customerName}</p>
              <p className="text-lg text-neutral-400">{itemsText}</p>
              {order.estimatedArrival && (
                <p className="text-sm text-neutral-500">Est. Arrival: {order.estimatedArrival}</p>
              )}
              {order.address && (
                <p className="text-sm text-neutral-500 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {order.address}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6">
            {order.deliveryType === "on-site" && (
              <div className="text-center">
                <div className="mb-1 flex items-center justify-center gap-2">
                  <Clock className="h-5 w-5 text-neutral-400" />
                  <span className="text-sm font-medium uppercase text-neutral-400">Wait Time</span>
                </div>
                <div
                  className={`text-5xl font-bold tabular-nums ${
                    order.status === "arrived" ? "text-amber-500" : "text-neutral-300"
                  }`}
                >
                  {getElapsedTime()}
                </div>
              </div>
            )}

            {showActions && (
              <div className="flex flex-col gap-2">
                {order.status === "pending" && onMarkArrived && (
                  <Button
                    size="lg"
                    onClick={() => onMarkArrived(order.id)}
                    className="h-14 min-w-[180px] bg-amber-600 text-lg font-semibold text-white hover:bg-amber-700"
                  >
                    <User className="mr-2 h-5 w-5" />
                    Mark Arrived
                  </Button>
                )}
                {order.status === "arrived" && onMarkDelivered && (
                  <Button
                    size="lg"
                    onClick={() => onMarkDelivered(order.id)}
                    className="h-14 min-w-[180px] bg-emerald-600 text-lg font-semibold text-white hover:bg-emerald-700"
                  >
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Mark Delivered
                  </Button>
                )}
                {order.status === "delivered" && (
                  <div className="flex h-14 min-w-[180px] items-center justify-center rounded-lg border-2 border-emerald-600 bg-emerald-950/30">
                    <CheckCircle className="mr-2 h-5 w-5 text-emerald-500" />
                    <span className="text-lg font-semibold text-emerald-500">Completed</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
