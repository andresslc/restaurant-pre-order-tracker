"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Search, UserPlus, X, Loader2, AlertCircle } from "lucide-react"
import { useOrders, type Order } from "@/lib/orders-context"
import { OrderCard } from "@/components/order-card"
import { OrderDetailDialog } from "@/components/order-detail-dialog"

export default function ManageOrders() {
  const { orders, markArrived, markDelivered, addPayment, updateItemDelivery, isLoading, error } = useOrders()
  const [searchQuery, setSearchQuery] = useState("")
  const [deliveryFilter, setDeliveryFilter] = useState<"all" | "on-site" | "delivery">("all")
  const [showPendingDialog, setShowPendingDialog] = useState(false)
  const [pendingSearchQuery, setPendingSearchQuery] = useState("")
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderDetail, setShowOrderDetail] = useState(false)

  const filteredOrders = useMemo(() => {
    // Filter out pending and delivered orders - only show arrived orders
    let activeOrders = orders.filter((order) => order.status === "arrived")

    if (deliveryFilter !== "all") {
      activeOrders = activeOrders.filter((order) => order.deliveryType === deliveryFilter)
    }

    if (!searchQuery.trim()) {
      return activeOrders
    }

    return activeOrders.filter((order) => order.customerName.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [orders, searchQuery, deliveryFilter])

  const filteredPendingOrders = useMemo(() => {
    const pending = orders.filter((order) => order.status === "pending")

    if (!pendingSearchQuery.trim()) {
      return pending
    }

    return pending.filter((order) => order.customerName.toLowerCase().includes(pendingSearchQuery.toLowerCase()))
  }, [orders, pendingSearchQuery])

  const pendingOrdersCount = useMemo(() => {
    return orders.filter((order) => order.status === "pending").length
  }, [orders])

  const handleMarkArrived = async (orderId: string) => {
    setProcessingOrderId(orderId)
    try {
      await markArrived(orderId)
      setShowPendingDialog(false)
      setPendingSearchQuery("")
    } catch (error) {
      console.error("Failed to mark order as arrived:", error)
    } finally {
      setProcessingOrderId(null)
    }
  }

  const handleMarkDelivered = async (orderId: string) => {
    setProcessingOrderId(orderId)
    try {
      await markDelivered(orderId)
    } catch (error) {
      console.error("Failed to mark order as delivered:", error)
    } finally {
      setProcessingOrderId(null)
    }
  }

  const handleAddPayment = async (orderId: string, amount: number) => {
    try {
      await addPayment(orderId, amount)
      // Update selected order if it's the one being modified
      if (selectedOrder?.id === orderId) {
        const updatedOrder = orders.find(o => o.id === orderId)
        if (updatedOrder) setSelectedOrder(updatedOrder)
      }
    } catch (error) {
      console.error("Failed to add payment:", error)
    }
  }

  const handleUpdateItemDelivery = async (orderId: string, itemId: string, isDelivered: boolean) => {
    try {
      await updateItemDelivery(orderId, itemId, isDelivered)
    } catch (error) {
      console.error("Failed to update item:", error)
    }
  }

  const handleCardClick = (order: Order) => {
    setSelectedOrder(order)
    setShowOrderDetail(true)
  }

  // Keep selected order in sync with orders state
  const currentSelectedOrder = selectedOrder 
    ? orders.find(o => o.id === selectedOrder.id) || selectedOrder
    : null

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-amber-500 mx-auto mb-4" />
          <p className="text-xl text-neutral-400">Loading orders...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-xl text-red-400 mb-2">Failed to load orders</p>
          <p className="text-neutral-500">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-6 space-y-4">
          <h2 className="text-3xl font-bold text-white">Active Orders</h2>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
              <Input
                type="text"
                placeholder="Search by customer name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 border-neutral-700 bg-neutral-900 pl-10 text-lg text-white placeholder:text-neutral-500"
              />
            </div>

            <Select value={deliveryFilter} onValueChange={(value: "all" | "on-site" | "delivery") => setDeliveryFilter(value)}>
              <SelectTrigger className="h-12 w-[200px] border-neutral-700 bg-neutral-900 text-white">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent className="border-neutral-700 bg-neutral-900 text-white">
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="on-site">On-site Pickup</SelectItem>
                <SelectItem value="delivery">Delivery</SelectItem>
              </SelectContent>
            </Select>

            <Dialog open={showPendingDialog} onOpenChange={setShowPendingDialog}>
              <DialogTrigger asChild>
                <Button size="lg" className="h-12 bg-amber-600 text-white hover:bg-amber-700">
                  <UserPlus className="mr-2 h-5 w-5" />
                  Mark Arrived ({pendingOrdersCount})
                </Button>
              </DialogTrigger>
              <DialogContent className="border-neutral-800 bg-neutral-900 text-white sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl">Mark Customer as Arrived</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-400" />
                    <Input
                      type="text"
                      placeholder="Search by customer name..."
                      value={pendingSearchQuery}
                      onChange={(e) => setPendingSearchQuery(e.target.value)}
                      className="h-12 border-neutral-700 bg-neutral-800 pl-10 text-white placeholder:text-neutral-500"
                    />
                    {pendingSearchQuery && (
                      <button
                        onClick={() => setPendingSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-300"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  {filteredPendingOrders.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-950 p-12 text-center">
                      <p className="text-lg text-neutral-400">
                        {pendingSearchQuery ? "No pending orders found" : "No pending orders"}
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-[500px] space-y-2 overflow-y-auto pr-2">
                      {filteredPendingOrders.map((order) => (
                        <button
                          key={order.id}
                          onClick={() => handleMarkArrived(order.id)}
                          disabled={processingOrderId === order.id}
                          className="w-full rounded-lg border-2 border-neutral-800 bg-neutral-800 p-4 text-left transition-all hover:border-amber-600 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-lg font-semibold text-white">{order.customerName}</p>
                              <p className="text-sm text-neutral-400">{order.id}</p>
                              {order.estimatedArrival && (
                                <p className="mt-1 text-sm text-neutral-500">ETA: {order.estimatedArrival}</p>
                              )}
                              <div className="mt-2 flex items-center gap-2">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                    order.deliveryType === "delivery"
                                      ? "bg-blue-600/20 text-blue-400"
                                      : "bg-green-600/20 text-green-400"
                                  }`}
                                >
                                  {order.deliveryType === "delivery" ? "Delivery" : "On-site"}
                                </span>
                                {order.deliveryType === "delivery" && order.address && (
                                  <span className="text-xs text-neutral-500">• {order.address}</span>
                                )}
                              </div>
                              {order.items.length > 0 && (
                                <div className="mt-2 text-xs text-neutral-400">
                                  {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                                </div>
                              )}
                            </div>
                            {processingOrderId === order.id ? (
                              <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                            ) : (
                              <UserPlus className="h-6 w-6 text-amber-500" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-neutral-800 bg-neutral-900 p-12 text-center">
            <p className="text-xl text-neutral-400">
              {searchQuery || deliveryFilter !== "all"
                ? "No orders found matching your filters"
                : "No active orders at the moment"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredOrders.map((order) => (
              <OrderCard 
                key={order.id} 
                order={order} 
                onMarkArrived={handleMarkArrived} 
                onMarkDelivered={handleMarkDelivered}
                onCardClick={handleCardClick}
                isProcessing={processingOrderId === order.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Order Detail Dialog */}
      <OrderDetailDialog
        order={currentSelectedOrder}
        open={showOrderDetail}
        onOpenChange={setShowOrderDetail}
        onAddPayment={handleAddPayment}
        onUpdateItemDelivery={handleUpdateItemDelivery}
        onMarkDelivered={handleMarkDelivered}
      />
    </div>
  )
}
